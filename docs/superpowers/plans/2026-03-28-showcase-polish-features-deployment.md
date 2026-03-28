# Showcase Polish, Features & Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the shot quality backend to CatBoost with 3 new input features, polish the frontend UI across both ML demo pages, and ship the whole app in Docker with automated CI/CD deployment on a self-hosted GitHub Actions runner.

**Architecture:** Three independent work streams executed in order — (1) backend model migration, (2) frontend feature additions and UI polish, (3) Docker + CI/CD. Backend tasks are pure Python changes. Frontend uses the `frontend-design` skill for the two page files. Deployment config is new files only.

**Tech Stack:** Python 3.11 / Flask / CatBoost, Next.js 15 / Tailwind CSS, Docker + Docker Compose, GitHub Actions self-hosted runner on Proxmox VM.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `ml_api/requirements.txt` | Modify | Remove lightgbm, add catboost |
| `ml_api/app.py` | Modify | CatBoost loader, new /predict features + validation, remove label encoder loop |
| `ml_api/test_app.py` | Create | Pytest tests for /predict validation |
| `ml_api/Dockerfile` | Create | Python slim image for Flask API |
| `project-showcase-app/next.config.ts` | Modify | Add `output: 'standalone'` |
| `project-showcase-app/app/utils/shotCalculations.ts` | Modify | Add 3 new fields to ShotData, buildShotPayload, validateShotData |
| `project-showcase-app/app/components/shared/Navigation.tsx` | Modify | Add activePage prop for active link styling |
| `project-showcase-app/app/home/page.tsx` | Modify | Pass activePage="home" to Navigation |
| `project-showcase-app/app/shot-prediction/page.tsx` | Modify | 3 new inputs, shared nav, env var URL, UI polish |
| `project-showcase-app/app/topic-analysis/page.tsx` | Modify | Shared nav, env var URL, UI polish |
| `project-showcase-app/Dockerfile` | Create | Multi-stage Next.js standalone image |
| `project-showcase-app/.env.example` | Create | Document NEXT_PUBLIC_API_URL |
| `docker-compose.yml` | Create | Orchestrate ml-api + showcase-app services |
| `.github/workflows/deploy.yml` | Create | Auto-deploy on push to main via self-hosted runner |

---

## Task 1: Backend — Model Migration

**Files:**
- Modify: `ml_api/requirements.txt`
- Modify: `ml_api/app.py` (imports + model loading section, lines 1–32)

- [ ] **Step 1: Update requirements.txt**

Replace `lightgbm` with `catboost`. The file should contain at minimum:

```
flask
flask-cors
pandas
numpy
joblib
catboost
torch
nltk
scikit-learn
```

- [ ] **Step 2: Update model loading in app.py**

Replace the LightGBM import and load with CatBoost. Remove the `label_encoders` load entirely (no longer needed). Remove the `joblib` import if it is only used for those two loads.

Old section (lines ~1–32):
```python
import joblib
...
model = joblib.load(os.path.join(MODEL_DIR, 'lgbm_model_updated.pkl'))
label_encoders = joblib.load(os.path.join(MODEL_DIR, 'label_encoders.pkl'))
```

New section:
```python
from catboost import CatBoostClassifier
...
model = CatBoostClassifier()
model.load_model(os.path.join(MODEL_DIR, 'shot_quality_catboost.cbm'))
```

- [ ] **Step 3: Verify model loads and expose feature names**

Add a temporary `print(model.feature_names_)` immediately after `model.load_model(...)`, run `python app.py`, note the printed column names and order, then remove the print. This order is the **required column order** for prediction DataFrames.

```bash
cd ml_api
python app.py
# Expected: server starts, feature names printed to stdout, no errors
```

- [ ] **Step 4: Remove /valid-values endpoint**

Delete the entire `@app.route('/valid-values', ...)` function from `app.py`. The frontend hardcodes all dropdown values.

- [ ] **Step 5: Commit**

```bash
git add ml_api/requirements.txt ml_api/app.py
git commit -m "feat: switch shot quality model to CatBoost"
```

---

## Task 2: Backend — /predict Endpoint + Validation + Tests

**Files:**
- Modify: `ml_api/app.py` (`/predict` route, ~lines 162–188)
- Create: `ml_api/test_app.py`

- [ ] **Step 1: Write failing tests first**

Create `ml_api/test_app.py`:

```python
import pytest
import json
from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client


def test_health(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


def test_predict_invalid_shooter_left_right(client):
    payload = {'shooterLeftRight': 'X', 'playerPositionThatDidEvent': 'C',
               'shooterTimeOnIceSinceFaceoff': 5.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_predict_invalid_position(client):
    payload = {'shooterLeftRight': 'L', 'playerPositionThatDidEvent': 'G',
               'shooterTimeOnIceSinceFaceoff': 5.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_predict_negative_time_on_ice(client):
    payload = {'shooterLeftRight': 'L', 'playerPositionThatDidEvent': 'C',
               'shooterTimeOnIceSinceFaceoff': -1.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ml_api
pip install pytest
pytest test_app.py -v
# Expected: test_health PASSES, validation tests FAIL (400 not yet returned)
```

- [ ] **Step 3: Rewrite /predict to validate and use CatBoost**

Replace the entire `/predict` route in `app.py`:

```python
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        # Validate new enum fields
        if data.get('shooterLeftRight') not in ('L', 'R'):
            return jsonify({'error': "shooterLeftRight must be 'L' or 'R'", 'success': False}), 400
        if data.get('playerPositionThatDidEvent') not in ('L', 'R', 'D', 'C'):
            return jsonify({'error': "playerPositionThatDidEvent must be one of L, R, D, C", 'success': False}), 400
        toe = data.get('shooterTimeOnIceSinceFaceoff')
        if toe is None or not isinstance(toe, (int, float)) or toe < 0:
            return jsonify({'error': "shooterTimeOnIceSinceFaceoff must be a non-negative number", 'success': False}), 400

        # Build DataFrame with exact column order the model was trained on.
        # Cast categorical columns to object dtype as required by CatBoost.
        cat_indices = model.get_cat_feature_indices()
        cat_cols = [model.feature_names_[i] for i in cat_indices]
        input_df = pd.DataFrame([data])[model.feature_names_]
        input_df[cat_cols] = input_df[cat_cols].astype(object)

        prediction = model.predict(input_df)
        prediction_proba = model.predict_proba(input_df)

        label_mappings = {0: 'goal', 1: 'play stopped', 2: 'controlled rebound', 3: 'dangerous rebound'}

        return jsonify({
            'prediction': label_mappings[int(prediction[0])],
            'probability': {label_mappings[i]: prob for i, prob in enumerate(prediction_proba[0])},
            'success': True
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 400
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd ml_api
pytest test_app.py -v
# Expected: all 4 tests PASS
```

- [ ] **Step 5: Commit**

```bash
git add ml_api/app.py ml_api/test_app.py
git commit -m "feat: add 3 new features and input validation to /predict"
```

---

## Task 3: Frontend Utilities — ShotData + Calculations

**Files:**
- Modify: `project-showcase-app/app/utils/shotCalculations.ts`

- [ ] **Step 1: Add 3 new fields to ShotData interface**

In `shotCalculations.ts`, add to the `ShotData` interface after `shootingTeamPlayerDiff`:

```typescript
// New features
shooterLeftRight: string;       // 'L' or 'R'
playerPositionThatDidEvent: string; // 'L', 'R', 'D', or 'C'
shooterTimeOnIceSinceFaceoff: number; // seconds, non-negative
```

- [ ] **Step 2: Pass new fields through in buildShotPayload**

In `buildShotPayload`, add to the returned object:

```typescript
shooterLeftRight: data.shooterLeftRight,
playerPositionThatDidEvent: data.playerPositionThatDidEvent,
shooterTimeOnIceSinceFaceoff: data.shooterTimeOnIceSinceFaceoff,
```

- [ ] **Step 3: Add validation in validateShotData**

In `validateShotData`, add after existing checks:

```typescript
if (data.shooterLeftRight === undefined || !['L', 'R'].includes(data.shooterLeftRight))
  errors.push('Shooter handedness must be L or R');
if (data.playerPositionThatDidEvent === undefined ||
    !['L', 'R', 'D', 'C'].includes(data.playerPositionThatDidEvent))
  errors.push('Player position must be L, R, D, or C');
if (data.shooterTimeOnIceSinceFaceoff === undefined || data.shooterTimeOnIceSinceFaceoff < 0)
  errors.push('Shooter time on ice since faceoff must be a non-negative number');
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd project-showcase-app
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 5: Commit**

```bash
git add project-showcase-app/app/utils/shotCalculations.ts
git commit -m "feat: add shooterLeftRight, playerPosition, timeOnIce to shot payload"
```

---

## Task 4: Shared Navigation — activePage Prop

**Files:**
- Modify: `project-showcase-app/app/components/shared/Navigation.tsx`
- Modify: `project-showcase-app/app/home/page.tsx`

- [ ] **Step 1: Update Navigation.tsx to accept activePage prop**

Replace the entire file content:

```tsx
'use client';

import Link from 'next/link';
import { colors } from '../constants/colors';

interface NavigationProps {
  activePage?: string;
}

const links = [
  { href: '/home', label: 'Home', key: 'home' },
  { href: '/shot-prediction', label: 'Shot Prediction', key: 'shot-prediction' },
  { href: '/topic-analysis', label: 'Topic Analysis', key: 'topic-analysis' },
];

export default function Navigation({ activePage }: NavigationProps) {
  return (
    <nav
      className="sticky top-0 z-50 bg-opacity-95 backdrop-blur-md border-b"
      style={{ backgroundColor: colors.darkBg, borderColor: colors.green500_20 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold flex items-center gap-3 transition-all duration-300"
          style={{ color: colors.white }}
        >
          <span>Hockey Analytics</span>
        </Link>
        <div className="flex items-center gap-8">
          {links.map((link) => {
            const isActive = activePage === link.key;
            return (
              <Link
                key={link.key}
                href={link.href}
                className={`font-semibold transition-all duration-300 border-b-2 ${
                  isActive
                    ? 'text-green-400 border-green-400'
                    : 'text-white hover:text-green-400 border-transparent'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Pass activePage="home" in home/page.tsx**

In `app/home/page.tsx`, update the `<Navigation />` usage:

```tsx
<Navigation activePage="home" />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd project-showcase-app
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
git add project-showcase-app/app/components/shared/Navigation.tsx \
        project-showcase-app/app/home/page.tsx
git commit -m "feat: add activePage prop to Navigation for active link highlighting"
```

---

## Task 5: Shot Prediction Page — New Inputs + UI Polish

**Files:**
- Modify: `project-showcase-app/app/shot-prediction/page.tsx`

> **IMPORTANT:** Invoke the `frontend-design` skill before implementing this task. The skill guides visual decisions for the UI polish work.

- [ ] **Step 1: Invoke frontend-design skill**

Run: `Skill("frontend-design")`

- [ ] **Step 2: Update ShotFormData interface and state defaults**

Add to the `ShotFormData` interface:
```typescript
shooterLeftRight: string;
playerPositionThatDidEvent: string;
shooterTimeOnIceSinceFaceoff: number | '';
```

Add to `useState` initial value:
```typescript
shooterLeftRight: 'R',
playerPositionThatDidEvent: 'C',
shooterTimeOnIceSinceFaceoff: '',
```

- [ ] **Step 3: Update handlePrediction to include new fields in shotData**

```typescript
const shotData = {
  ...existing fields...,
  shooterLeftRight: formData.shooterLeftRight,
  playerPositionThatDidEvent: formData.playerPositionThatDidEvent,
  shooterTimeOnIceSinceFaceoff:
    typeof formData.shooterTimeOnIceSinceFaceoff === 'number'
      ? formData.shooterTimeOnIceSinceFaceoff
      : 0,
};
```

- [ ] **Step 4: Replace inline nav with shared Navigation**

Remove the entire `<nav>...</nav>` block at the top of the JSX. Replace with:
```tsx
import Navigation from '@/app/components/shared/Navigation';
...
<Navigation activePage="shot-prediction" />
```

- [ ] **Step 5: Replace hardcoded API URL with env var**

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/predict`,
  ...
);
```

- [ ] **Step 6: Add "Shooter Info" form section with 3 new inputs**

After the Team Player Differential input and before the checkboxes section, add a new section with a `border-t border-white/10` divider:

```tsx
{/* Shooter Info */}
<div className="pt-4 border-t border-white/10 space-y-4">
  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Shooter Info</p>

  {/* Shooter Handedness */}
  <div className="space-y-2">
    <label className="text-gray-300 text-sm font-semibold">Shooter Handedness</label>
    <select
      value={formData.shooterLeftRight}
      onChange={(e) => handleFormChange('shooterLeftRight', e.target.value)}
      className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-green-400"
      style={{ colorScheme: 'dark' }}
    >
      <option value="L">Left</option>
      <option value="R">Right</option>
    </select>
  </div>

  {/* Position of Event Player */}
  <div className="space-y-2">
    <label className="text-gray-300 text-sm font-semibold">Position of Event Player</label>
    <select
      value={formData.playerPositionThatDidEvent}
      onChange={(e) => handleFormChange('playerPositionThatDidEvent', e.target.value)}
      className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-green-400"
      style={{ colorScheme: 'dark' }}
    >
      <option value="C">Center</option>
      <option value="L">Left Wing</option>
      <option value="R">Right Wing</option>
      <option value="D">Defense</option>
    </select>
  </div>

  {/* Time on Ice Since Faceoff */}
  <div className="space-y-2">
    <label className="text-gray-300 text-sm font-semibold">
      Time on Ice Since Faceoff (seconds)
    </label>
    <input
      type="number"
      min="0"
      step="1"
      value={formData.shooterTimeOnIceSinceFaceoff}
      onChange={(e) =>
        handleFormChange(
          'shooterTimeOnIceSinceFaceoff',
          e.target.value === '' ? '' : parseFloat(e.target.value)
        )
      }
      className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
      placeholder="e.g., 45"
    />
  </div>
</div>
```

- [ ] **Step 7: Apply UI polish**

Make the following targeted changes (guided by frontend-design skill output):
- Rink container: change `aspect-video` → `aspect-[200/85]`
- All card borders: standardize to `border border-white/15`
- Primary cards: `rounded-2xl`, inner cards: `rounded-xl`
- Checkbox inputs: add `accent-green-400` class
- Metrics grid: `grid-cols-2 gap-3` with `text-xs text-gray-400` labels and `text-green-400 font-mono` values
- Remove the duplicate pin count status line at the bottom of the page (keep only the empty state overlay version)
- Add `border-t border-white/10` divider before the checkboxes section

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd project-showcase-app
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 9: Manual smoke test**

```bash
npm run dev
```
Open http://localhost:3000/shot-prediction. Verify:
- Navigation shows "Shot Prediction" as active (green underline)
- Rink aspect ratio looks like a hockey rink (wider than 16:9)
- Three new inputs appear in the "Shooter Info" section
- All card borders are consistent
- Checkboxes have green accent

- [ ] **Step 10: Commit**

```bash
git add project-showcase-app/app/shot-prediction/page.tsx
git commit -m "feat: add shooter inputs and polish shot prediction UI"
```

---

## Task 6: Topic Analysis Page — UI Polish

**Files:**
- Modify: `project-showcase-app/app/topic-analysis/page.tsx`

> **IMPORTANT:** Invoke the `frontend-design` skill before implementing this task.

- [ ] **Step 1: Replace inline nav with shared Navigation**

Remove the `<nav>...</nav>` block. Add import and replace with:
```tsx
import Navigation from '@/app/components/shared/Navigation';
...
<Navigation activePage="topic-analysis" />
```

- [ ] **Step 2: Replace hardcoded API URL with env var**

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/predict-topic`,
  ...
);
```

- [ ] **Step 3: Add index prefixes to example texts**

Update the example texts render to show `01`, `02`, `03` prefixes:

```tsx
{exampleTexts.map((example, index) => (
  <button
    key={index}
    onClick={() => handleLoadExample(example)}
    className="text-left p-4 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300 text-gray-300 hover:text-white text-sm flex gap-3 items-start"
  >
    <span className="font-mono text-xs text-white/30 shrink-0 pt-0.5">
      {String(index + 1).padStart(2, '0')}
    </span>
    <span>{example}</span>
  </button>
))}
```

- [ ] **Step 4: Polish results empty state**

Replace the plain gray empty state box with:
```tsx
<div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-6 h-64 flex items-center justify-center">
  <div className="text-center">
    <p className="text-2xl mb-2 text-white/20">💬</p>
    <p className="text-gray-400 text-sm">
      Enter text and analyze to see topic probabilities
    </p>
  </div>
</div>
```

- [ ] **Step 5: Standardize card borders**

Apply the same border/radius standards as Task 5:
- All card borders: `border border-white/15`
- Primary cards: `rounded-2xl`, inner cards: `rounded-xl`

- [ ] **Step 6: Manual smoke test**

Open http://localhost:3000/topic-analysis. Verify:
- Navigation shows "Topic Analysis" as active
- Example texts show `01 / 02 / 03` prefixes
- Empty results state has dashed border + icon
- Card borders are consistent with shot prediction page

- [ ] **Step 7: Commit**

```bash
git add project-showcase-app/app/topic-analysis/page.tsx
git commit -m "feat: polish topic analysis UI and use shared Navigation"
```

---

## Task 7: Next.js Config — Standalone Output

**Files:**
- Modify: `project-showcase-app/next.config.ts`

- [ ] **Step 1: Add standalone output to next.config.ts**

Read the current file first, then update to add `output: 'standalone'`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 2: Verify build produces standalone output**

```bash
cd project-showcase-app
npm run build
ls .next/standalone
# Expected: directory exists containing server.js
```

- [ ] **Step 3: Commit**

```bash
git add project-showcase-app/next.config.ts
git commit -m "chore: enable Next.js standalone output for Docker"
```

---

## Task 8: Docker Setup

**Files:**
- Create: `ml_api/Dockerfile`
- Create: `project-showcase-app/Dockerfile`
- Create: `docker-compose.yml`
- Create: `project-showcase-app/.env.example`

- [ ] **Step 1: Create ml_api/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('omw-1.4')"

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

Note: NLTK data is downloaded at image build time so the container starts cleanly. The existing `download_nltk_data.py` script can be used instead: `RUN python download_nltk_data.py`.

- [ ] **Step 2: Create project-showcase-app/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 3: Create docker-compose.yml at repo root**

```yaml
services:
  ml-api:
    build:
      context: ./ml_api
    ports:
      - "5000:5000"
    networks:
      - app-network
    restart: unless-stopped

  showcase-app:
    build:
      context: ./project-showcase-app
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:5000}
    ports:
      - "3000:3000"
    networks:
      - app-network
    depends_on:
      - ml-api
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
```

- [ ] **Step 4: Create project-showcase-app/.env.example**

```
# API URL for the Flask backend.
# Local dev (non-Docker): http://localhost:5000
# Docker Compose deployment: http://ml-api:5000
# Production (behind Cloudflare or other proxy): use your public URL
NEXT_PUBLIC_API_URL=http://localhost:5000
```

- [ ] **Step 5: Verify Docker builds locally**

```bash
# From repo root
docker compose build
# Expected: both images build successfully with no errors
```

- [ ] **Step 6: Smoke test with Docker Compose**

```bash
NEXT_PUBLIC_API_URL=http://ml-api:5000 docker compose up -d
# Wait ~10s for startup, then:
curl http://localhost:5000/
# Expected: {"status": "API is running", "success": true}
curl http://localhost:3000/
# Expected: HTML response (Next.js app)
docker compose down
```

- [ ] **Step 7: Commit**

```bash
git add ml_api/Dockerfile project-showcase-app/Dockerfile docker-compose.yml \
        project-showcase-app/.env.example
git commit -m "chore: add Docker setup for ml-api and showcase-app"
```

---

## Task 9: GitHub Actions — Auto-deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Prerequisites:** On the Proxmox VM, the GitHub Actions self-hosted runner must already be installed and registered to the repo. See GitHub docs: Settings → Actions → Runners → New self-hosted runner. The runner user must have Docker permissions (`sudo usermod -aG docker <runner-user>`).

- [ ] **Step 1: Create .github/workflows/deploy.yml**

```bash
mkdir -p .github/workflows
```

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker images
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
        run: docker compose build

      - name: Deploy containers
        run: docker compose up -d --force-recreate
```

- [ ] **Step 2: Add NEXT_PUBLIC_API_URL secret to GitHub**

In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret.
- Name: `NEXT_PUBLIC_API_URL`
- Value: `http://ml-api:5000` (for Docker bridge network) or your public URL if routing externally.

- [ ] **Step 3: Commit and push to trigger workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "chore: add GitHub Actions workflow for auto-deploy on push to main"
git push origin main
```

- [ ] **Step 4: Verify workflow runs successfully**

In GitHub: Actions tab → Deploy workflow → check the run log.
Expected: all 3 steps complete with green checkmarks.

---

## Testing Checklist (End-to-End)

After all tasks are complete, verify the full flow:

- [ ] POST to `http://localhost:5000/predict` with a valid payload including the 3 new fields returns a prediction
- [ ] POST with `shooterLeftRight: "X"` returns 400 with clear error message
- [ ] Shot prediction page: drag both pins onto the rink, fill all fields including shooter info, click Predict — result appears
- [ ] Topic analysis page: paste text, click Analyze — result appears
- [ ] Navigation active link is correct on all three pages (Home, Shot Prediction, Topic Analysis)
- [ ] `docker compose build && docker compose up -d` starts both services cleanly
- [ ] Push to `main` triggers the GitHub Actions deploy workflow and it succeeds
