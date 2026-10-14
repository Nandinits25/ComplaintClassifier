"""Flask website for ComplaintClassifier.

The endpoint deliberately refuses to make predictions when trained model
artifacts are missing. It never substitutes fake or keyword-based predictions.
"""
from pathlib import Path
import json
import pickle

import numpy as np
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "saved_models"
app = Flask(__name__)

_model = None
_tokenizer = None
_label_encoder = None


def load_artifacts():
    """Load trained LSTM and preprocessing artifacts once, when available."""
    global _model, _tokenizer, _label_encoder
    if _model is not None and _tokenizer is not None and _label_encoder is not None:
        return True
    model_path = MODEL_DIR / "lstm_model.keras"
    tokenizer_path = MODEL_DIR / "tokenizer.pkl"
    encoder_path = MODEL_DIR / "label_encoder.pkl"
    if not all(p.exists() for p in (model_path, tokenizer_path, encoder_path)):
        return False
    try:
        import tensorflow as tf
        _model = tf.keras.models.load_model(model_path)
        with tokenizer_path.open("rb") as f:
            _tokenizer = pickle.load(f)
        with encoder_path.open("rb") as f:
            _label_encoder = pickle.load(f)
        return True
    except Exception:
        app.logger.exception("Could not load trained model artifacts")
        _model = _tokenizer = _label_encoder = None
        return False


def get_sequence_length():
    config_path = MODEL_DIR / "model_config.json"
    if config_path.exists():
        try:
            return int(json.loads(config_path.read_text(encoding="utf-8")).get("max_len", 150))
        except (ValueError, OSError, TypeError):
            pass
    return 150


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    ready = load_artifacts()
    return jsonify({"status": "ready" if ready else "model_not_trained", "model_loaded": ready}), (200 if ready else 503)


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    complaint = payload.get("complaint", "")
    if not isinstance(complaint, str) or not complaint.strip():
        return jsonify({"error": "Please enter a non-empty complaint."}), 400
    complaint = complaint.strip()
    if len(complaint) > 5000:
        return jsonify({"error": "Complaint must be 5,000 characters or fewer."}), 400
    if not load_artifacts():
        return jsonify({
            "error": "The trained LSTM model is not available yet. Run the training script first."
        }), 503
    try:
        from tensorflow.keras.preprocessing.sequence import pad_sequences
        sequence = _tokenizer.texts_to_sequences([complaint])
        padded = pad_sequences(sequence, maxlen=get_sequence_length(), padding="post", truncating="post")
        probabilities = np.asarray(_model.predict(padded, verbose=0))[0]
        class_index = int(np.argmax(probabilities))
        category = str(_label_encoder.inverse_transform([class_index])[0])
        labels = [str(label) for label in _label_encoder.classes_]
        probability_map = {labels[i]: float(probabilities[i]) for i in range(min(len(labels), len(probabilities)))}
        return jsonify({
            "category": category,
            "confidence": float(probabilities[class_index]),
            "probabilities": probability_map
        })
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "Prediction failed. Check the trained model and preprocessing artifacts."}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
