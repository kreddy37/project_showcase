"""One-time script to convert the PyTorch HockeyNN model to ONNX format."""

import torch
import torch.nn as nn
import numpy as np
import os

class HockeyNN(nn.Module):
    def __init__(self, input_size=5000, hidden_size1=8, num_classes=4):
        super(HockeyNN, self).__init__()
        self.relu = nn.ReLU()
        self.fc1 = nn.Linear(input_size, hidden_size1)
        self.fc2 = nn.Linear(hidden_size1, hidden_size1)
        self.dropout = nn.Dropout(p=0.3)
        self.fc3 = nn.Linear(hidden_size1, num_classes)
        self.loss_function = nn.CrossEntropyLoss()

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc3(out)
        return out

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Load PyTorch model
device = torch.device('cpu')
model = HockeyNN(input_size=5000, hidden_size1=8, num_classes=4)
model.load_state_dict(torch.load(os.path.join(MODEL_DIR, 'hockey_nlp_model.pth'), map_location=device))
model.eval()

# Export to ONNX
dummy_input = torch.randn(1, 5000)
onnx_path = os.path.join(MODEL_DIR, 'hockey_nlp_model.onnx')

torch.onnx.export(
    model,
    dummy_input,
    onnx_path,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
)

# Verify outputs match
import onnxruntime as ort

test_input = torch.randn(1, 5000)
with torch.no_grad():
    torch_output = model(test_input).numpy()

session = ort.InferenceSession(onnx_path)
onnx_output = session.run(None, {'input': test_input.numpy()})[0]

if np.allclose(torch_output, onnx_output, atol=1e-6):
    print(f"ONNX model saved to {onnx_path}")
    print(f"Verification passed: outputs match (max diff: {np.max(np.abs(torch_output - onnx_output)):.2e})")
else:
    print("WARNING: Output mismatch!")
    print(f"Max difference: {np.max(np.abs(torch_output - onnx_output)):.2e}")
