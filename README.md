# ComplaintClassifier — Website Starter

A responsive Flask website interface for a customer complaint classification project. The `/predict` endpoint is designed to use a **real trained TensorFlow/Keras LSTM** and its preprocessing artifacts. It intentionally does not fabricate predictions if those artifacts are missing.

## Included
- Responsive complaint analysis dashboard
- Complaint input, example chips, character count, loading/error states
- Result category, confidence meter, and class probability bars
- Flask API with input validation
- Explicit “model not ready” response until trained artifacts exist

## Required trained artifacts
After training your LSTM, place these files in `saved_models/`:
- `lstm_model.keras`
- `tokenizer.pkl`
- `label_encoder.pkl`
- `model_config.json` (optional; can contain `{"max_len": 150}`)

The tokenizer and label encoder must be the exact artifacts used during training, and model output order must match `label_encoder.classes_`.

## Windows setup (PowerShell)
Use Python 3.11 if available:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`.

If PowerShell blocks activation, run the venv's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

## API
`POST /predict` JSON body:

```json
{"complaint": "I was charged twice for the same transaction."}
```

Successful response:

```json
{
  "category": "example trained category",
  "confidence": 0.83,
  "probabilities": {
    "example trained category": 0.83,
    "another trained category": 0.17
  }
}
```

The example response above illustrates the response shape only; it is not a real model result.

`GET /health` reports whether the trained artifacts can be loaded.

## Important
This package contains the website and Flask integration, not a trained model or complaint dataset. Download real complaint data, train and evaluate the LSTM, then add the required artifacts before live predictions will work. The interface will clearly indicate when the model is not ready rather than showing fake results.
