# Design: Showcase Polish, New Features & Deployment
**Date:** 2026-03-28

## Overview

Four areas of change to the hockey analytics project showcase:
1. Backend: switch shot quality model from LightGBM to CatBoost, add three new features
2. Frontend: wire in new features, general UI polish
3. Deployment: Docker + docker-compose + GitHub Actions CI/CD on a self-hosted Proxmox runner

---

## 1. Backend

### Model Switch
- Replace `joblib.load('lgbm_model_updated.pkl')` with CatBoost native loader:
  `CatBoostClassifier().load_model('models/shot_quality_catboost.cbm')`
- Remove the label encoder loop from the `/predict` handler. CatBoost handles
  categorical features natively with raw strings; applying the old encoders would
  corrupt predictions.
- The `/valid-values` endpoint can be removed — the frontend already hardcodes
  all dropdown options.
- Add `catboost` to `requirements.txt`, remove `lightgbm`.

### New Features
Three new fields added to the incoming `/predict` JSON payload and passed
directly into the prediction DataFrame:

| Field | Type | Values |
|---|---|---|
| `shooterLeftRight` | string | `"L"` or `"R"` |
| `playerPositionThatDidEvent` | string | `"L"`, `"R"`, `"D"`, `"C"` |
| `shooterTimeOnIceSinceFaceoff` | float | seconds (non-negative) |

No derived calculations are needed for these fields.

---

## 2. Frontend: New Features

### Types & State
`ShotFormData` gains:
- `shooterLeftRight: string` (default `"R"`)
- `playerPositionThatDidEvent: string` (default `"C"`)
- `shooterTimeOnIceSinceFaceoff: number | ''` (default `''`)

`ShotData` interface in `shotCalculations.ts` gains the same three fields.

### Form Inputs
A new "Shooter Info" sub-group added to the Shot Parameters panel, between
existing fields and checkboxes:
- **Shooter Handedness** — `L / R` select
- **Position of Event Player** — `L (Left Wing) / R (Right Wing) / D (Defense) / C (Center)` select
- **Shooter Time on Ice Since Faceoff (seconds)** — number input, non-negative

### Payload & Validation
- `buildShotPayload` passes the three new fields through directly.
- `validateShotData` adds a check that `shooterTimeOnIceSinceFaceoff` is a
  non-negative number.

### API URL
Replace hardcoded `http://localhost:5000` with `process.env.NEXT_PUBLIC_API_URL`
(with `|| 'http://localhost:5000'` fallback) on both the shot prediction and
topic analysis pages.

---

## 3. Frontend: UI Polish

### Navigation
- Add `activePage?: string` prop to the shared `Navigation` component.
- Active link: `text-green-400 border-b-2 border-green-400`. Inactive: `text-white hover:text-green-400`, no underline.
- Replace inline nav blocks in `shot-prediction/page.tsx` and
  `topic-analysis/page.tsx` with `<Navigation activePage="..." />`.
- Home page passes `activePage="home"`.

### Shot Prediction Page
- Rink container: `aspect-video` → `aspect-[200/85]` for accurate hockey rink proportions (200ft × 85ft).
- Form panel: subtle `border-t border-white/10` dividers between "Shot Parameters", "Shooter Info", and checkboxes sections.
- Checkboxes: add `accent-green-400` for on-brand color.
- Metrics display: consistent `text-xs text-gray-400` labels + `text-green-400 font-mono` values, uniform `grid-cols-2 gap-3`.
- Remove the redundant pin count status line at the bottom (already shown in the rink empty state overlay).

### Topic Analysis Page
- Example texts: add `01 / 02 / 03` monospace index prefix so the list looks intentional.
- Results empty state: replace plain gray box with dashed border + centered placeholder, consistent with rink empty state style.

### Both Pages
- Standardize card borders to `border border-white/15` (currently inconsistent between `border-white/10`, `border-white/20`, `border-2`).
- Primary content cards: `rounded-2xl`. Inner/secondary cards: `rounded-xl`.
- Use the `frontend-design` skill during implementation for UI decisions.

---

## 4. Deployment

### Dockerfiles
**`ml_api/Dockerfile`:** Single-stage, `python:3.11-slim` base. Install requirements, copy source, expose 5000.

**`project-showcase-app/Dockerfile`:** Two-stage.
- Builder: `node:20-alpine`, runs `npm ci && npm run build`
- Runner: `node:20-alpine`, copies `.next/standalone` output, exposes 3000.

### docker-compose.yml (repo root)
- Two services: `ml-api` and `showcase-app`
- `showcase-app` sets `NEXT_PUBLIC_API_URL` from environment (default `http://localhost:5000`)
- Shared bridge network

### Environment
- `project-showcase-app/.env.example` documents `NEXT_PUBLIC_API_URL=http://localhost:5000`

### GitHub Actions
**`.github/workflows/deploy.yml`:** Triggers on push to `main`.
- Runner: `self-hosted` (Proxmox VM)
- Steps: checkout → `docker compose build` → `docker compose up -d`
- No container registry needed — runner is the deployment host.
- `DEPLOY_DIR` env var (set in repo secrets or runner environment) points to the repo location on the VM.

---

## Files Modified
- `ml_api/app.py`
- `ml_api/requirements.txt`
- `project-showcase-app/app/shot-prediction/page.tsx`
- `project-showcase-app/app/topic-analysis/page.tsx`
- `project-showcase-app/app/utils/shotCalculations.ts`
- `project-showcase-app/app/components/shared/Navigation.tsx`
- `project-showcase-app/app/home/page.tsx`

## Files Created
- `ml_api/Dockerfile`
- `project-showcase-app/Dockerfile`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`
- `project-showcase-app/.env.example`
- `docs/superpowers/specs/2026-03-28-showcase-polish-features-deployment-design.md`
