# ONNX Migration: Replace PyTorch with ONNX Runtime

## Problem

The ML API Docker image includes PyTorch (~600MB installed) to serve a small 2-layer neural network (160KB weights). This bloats the image and contributes to disk exhaustion on the 15GB self-hosted runner.

## Solution

Export the PyTorch model to ONNX format and replace PyTorch with ONNX Runtime (~15MB) for inference. Net savings: ~585MB.

## Architecture

No architectural changes. The Flask API continues to serve the same endpoints with the same inputs/outputs. Only the inference backend changes.

### Current Flow

```
Text -> preprocess -> TF-IDF vectorize -> PyTorch forward pass -> softmax -> prediction
```

### New Flow

```
Text -> preprocess -> TF-IDF vectorize -> ONNX Runtime inference -> softmax -> prediction
```

## Components

### 1. Conversion Script (`ml_api/convert_to_onnx.py`)

One-time script to export the PyTorch model to ONNX:
- Load `HockeyNN` class and weights from `hockey_nlp_model.pth`
- Create dummy input tensor (1, 5000)
- Export via `torch.onnx.export()` with dynamic batch axis
- Save as `ml_api/models/hockey_nlp_model.onnx`
- Verify output matches PyTorch output

### 2. Updated Inference in `ml_api/app.py`

- Remove `torch` imports and `HockeyNN` class definition
- Import `onnxruntime` and create `InferenceSession` at startup
- Update `/predict-topic` handler:
  - Convert TF-IDF vector to numpy array (float32)
  - Run `session.run()` instead of `model(tensor)`
  - Apply softmax via numpy (scipy or manual) instead of `torch.nn.functional.softmax`
  - Rest of the logic (preprocessing, label mapping) stays identical

### 3. Updated Dependencies

- Remove `torch` from Dockerfile (the separate pip install step)
- Add `onnxruntime` to `requirements.txt`
- No other dependency changes

### 4. Updated Dockerfile

- Remove the `RUN pip install --no-cache-dir torch --index-url ...` line
- `onnxruntime` installs via `requirements.txt` like everything else

## Files Changed

| File | Change |
|------|--------|
| `ml_api/convert_to_onnx.py` | New — one-time conversion script |
| `ml_api/models/hockey_nlp_model.onnx` | New — exported ONNX model |
| `ml_api/app.py` | Replace torch inference with onnxruntime |
| `ml_api/requirements.txt` | Add onnxruntime, keep everything else |
| `ml_api/Dockerfile` | Remove torch install line |

## Testing

- Run conversion script, verify ONNX output matches PyTorch output
- Hit `/predict-topic` endpoint with example texts, verify predictions match
- Build Docker image, verify size reduction
- Deploy and verify end-to-end

## Risks

- **None significant.** The model is finalized and the conversion is deterministic. ONNX faithfully preserves the computation graph.
- If the model is ever retrained, the conversion script must be re-run.
