import numpy as np
from sklearn.ensemble import IsolationForest
import pickle
import os

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

def get_model_path(user_id: int) -> str:
    return os.path.join(MODEL_DIR, f"user_{user_id}.pkl")

def train_model(user_id: int, keystrokes: list[dict]):
    if len(keystrokes) < 10:
        return False, "Not enough data to train model (minimum 10 keystrokes)"

    X = np.array([[k["dwell_time"], k["flight_time"], k["backspace_rate"]] for k in keystrokes])

    model = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42
    )
    model.fit(X)

    with open(get_model_path(user_id), "wb") as f:
        pickle.dump(model, f)

    return True, f"Model trained on {len(keystrokes)} keystrokes"

def predict(user_id: int, keystrokes: list[dict]) -> dict:
    model_path = get_model_path(user_id)

    if not os.path.exists(model_path):
        return {"status": "no_model", "message": "No model trained yet"}

    with open(model_path, "rb") as f:
        model = pickle.load(f)

    X = np.array([[k["dwell_time"], k["flight_time"], k["backspace_rate"]] for k in keystrokes])

    predictions = model.predict(X)
    scores = model.decision_function(X)

    anomaly_rate = (predictions == -1).mean()
    avg_score = scores.mean()

    if anomaly_rate > 0.5:
        status = "anomaly"
    elif anomaly_rate > 0.3:
        status = "suspicious"
    else:
        status = "normal"

    return {
        "status": status,
        "anomaly_rate": float(anomaly_rate),
        "avg_score": float(avg_score),
        "message": f"{int(anomaly_rate * 100)}% of keystrokes flagged as anomalous"
    }