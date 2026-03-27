from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
import torch
import torch.nn as nn
import pickle
import re
import nltk

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')
    nltk.download('omw-1.4')

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

app = Flask(__name__)
CORS(app)

# Load the pre-trained model
MODEL_DIR = 'models'

model = joblib.load(os.path.join(MODEL_DIR, 'lgbm_model_updated.pkl'))
label_encoders = joblib.load(os.path.join(MODEL_DIR, 'label_encoders.pkl'))

class HockeyNN(nn.Module):
    def __init__(self, input_size=5000, hidden_size1=32, num_classes=4):
        super(HockeyNN, self).__init__()

        self.relu = nn.ReLU()  # activation function

        # Layer 1
        self.fc1 = nn.Linear(input_size, hidden_size1)

        # Layer 2
        self.fc2 = nn.Linear(hidden_size1, hidden_size1)

        # Dropout
        self.dropout = nn.Dropout(p=0.3)

        # Output Layer
        self.fc3 = nn.Linear(hidden_size1, num_classes)

        # Define the loss function
        self.loss_function = nn.CrossEntropyLoss()  # Suitable for multi-class classification with one-hot labels
    def forward(self, x):
        # Forward pass
        out = self.fc1(x)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc3(out)
        return out
    # Define the loss function
    def loss_fn(self, y_pred, y_true):
        return self.loss_function(y_pred, y_true)
    
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
topic_model = HockeyNN(input_size=5000, hidden_size1=8, num_classes=4)
topic_model.load_state_dict(torch.load(os.path.join(MODEL_DIR, 'hockey_nlp_model.pth'), map_location=device))
topic_model.eval()
topic_model.to(device)

with open(os.path.join(MODEL_DIR, 'vectorizer.pkl'), 'rb') as f:
    vectorizer = pickle.load(f)

def preprocess_text(text):
    """
    Preprocess tweet text for machine learning.

    Done by removing URLs and special characters, tokenizing, removing
    stop words, and lemmatizing the words.
    """

    teams = [
    "ducks", "coyotes", "bruins", "sabres", "flames", "hurricanes",
    "blackhawks", "avalanche", "blue jackets", "stars", "red wings",
    "oilers", "panthers", "kings", "wild", "canadiens", "predators",
    "devils", "islanders", "rangers", "senators", "flyers", "penguins",
    "sharks", "kraken", "blues", "lightning", "maple leafs", "canucks",
    "golden knights", "capitals", "jets", "leafs", "knights", "jackets", "wings"
    ]

    teams_with_boundaries = [r'\b' + team + r'\b' for team in teams]

    teams_with_boundaries = '|'.join(teams_with_boundaries)

    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

    # Remove "&amp;" an HTML entity
    text = re.sub(r'&amp;', '', text)

    # Remove hockey related words
    text = re.sub(r'\bhockey\b|\bnhl\b|\bv\b|\b'+teams_with_boundaries, '', text, flags=re.IGNORECASE)

    # Remove special characters and numbers
    text = re.sub(r'[^A-Za-z0-9\s]', '', text)

    # Tokenize the text
    tokens = nltk.word_tokenize(text)

    # Initialize the lemmatizer and stop words
    lemmatizer = WordNetLemmatizer()
    stop_words = set(stopwords.words('english'))

    # Remove stop words and lemmatize
    processed_tokens = [
        lemmatizer.lemmatize(token.lower())
        for token in tokens if token.lower() not in stop_words
    ]

    return ' '.join(processed_tokens)

@app.route('/predict-topic', methods=['POST'])
def predict_topic():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'error': 'No text provided',
                'success': False
            }), 400
            
        preprocessed_text = preprocess_text(text)
        
        text_vector = vectorizer.transform([preprocessed_text])
        
        input_tensor = torch.FloatTensor(text_vector.toarray()).to(device)
        
        with torch.no_grad():
            outputs = topic_model(input_tensor)
            probabilities = nn.functional.softmax(outputs, dim=1)
            predicted_class = torch.argmax(probabilities, dim=1)
            
        pred_class = int(predicted_class.item())
        pred_probs = probabilities[0].cpu().numpy().tolist()
        
        label_mapping = {0: 'standings/playoff news', 1: 'contract/trade', 2: 'franchise news', 3: 'individual/game news'}
        
        return jsonify({
            'prediction': label_mapping.get(pred_class, 'unknown'),
            'topic': label_mapping.get(pred_class, 'unknown'),
            'probability': {label_mapping[i]: prob for i, prob in enumerate(pred_probs)},
            'processed_text': preprocessed_text,
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 400

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        
        for column, encoder in label_encoders.items():
            if column in data:
                data[column] = encoder.transform([data[column]])[0]
                
        input_df = pd.DataFrame([data])
        
        prediction = model.predict(input_df)
        prediction_proba = model.predict_proba(input_df)
        
        label_mappings = {0: 'goal', 1: 'play stopped', 2: 'controlled rebound', 3: 'dangerous rebound'}
        
        return jsonify({
            'prediction': label_mappings[int(prediction[0])],
            'probability': {label_mappings[i]: prob for i, prob in enumerate(prediction_proba[0])},
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 400
        
@app.route('/', methods=['GET'])
def health():
    return jsonify({'status': 'API is running', 'success': True})

@app.route('/valid-values', methods=['GET'])
def valid_values():
    """Return valid values for each categorical feature"""
    valid_vals = {}
    for column, encoder in label_encoders.items():
        valid_vals[column] = encoder.classes_.tolist()
    return jsonify(valid_vals)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
