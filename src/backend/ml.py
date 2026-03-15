import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
import base64
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

def model_to_string(model_data: dict) -> str:
    return base64.b64encode(pickle.dumps(model_data)).decode("utf-8")

def string_to_model(model_str: str) -> dict:
    return pickle.loads(base64.b64decode(model_str.encode("utf-8")))

def build_model(X_scaled):
    model = IsolationForest(
        n_estimators=100,
        contamination=0.025, # very sensitive model, default: 0.05
        random_state=42
    )
    model.fit(X_scaled)
    return model

def train_model(user_id: int, keystrokes: list[dict], db: Session):
    if len(keystrokes) < 10:
        return False, "Not enough data to train model (minimum 10 keystrokes)"
    
    # features

    X = np.array([[
        k["dwell_time"],
        k["flight_time"],
        k["backspace_rate"],
        k["typing_speed"],
        k["dwell_variance"],
        k["digraph_time"]
    ] for k in keystrokes])

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = build_model(X_scaled)

    model_data = {"model": model, "scaler": scaler}
    model_str = model_to_string(model_data)

    from models import UserModel
    existing = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if existing:
        existing.enrollment_model = model_str
        existing.adaptive_model = None
        existing.last_retrained = datetime.now(timezone.utc)
    else:
        db.add(UserModel(
            user_id=user_id,
            enrollment_model=model_str,
            adaptive_model=None
        ))
    db.commit()

    return True, f"Model trained on {len(keystrokes)} keystrokes"

def retrain_adaptive(user_id: int, keystrokes: list[dict], db: Session):
    if len(keystrokes) < 10:
        return

    from models import UserModel
    record = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if not record:
        return

    enrollment_data = string_to_model(record.enrollment_model)
    enrollment_model = enrollment_data["model"]
    scaler = enrollment_data["scaler"]

    # features
    X = np.array([[
        k["dwell_time"],
        k["flight_time"],
        k["backspace_rate"],
        k["typing_speed"],
        k["dwell_variance"],
        k["digraph_time"]
    ] for k in keystrokes])

    X_scaled = scaler.transform(X)

    # anomaly gating to prevent anomalies from poisoning model 
    predictions = enrollment_model.predict(X_scaled)
    X_normal = X_scaled[predictions == 1]

    # if inadequate keystrokes
    if len(X_normal) < 10:
        return

    adaptive_model = build_model(X_normal)

    record.adaptive_model = model_to_string({"model": adaptive_model, "scaler": scaler})
    record.last_retrained = datetime.now(timezone.utc)
    db.commit()

def should_retrain(record) -> bool:
    if record.last_retrained is None:
        return True
    now = datetime.now(timezone.utc)
    last = record.last_retrained
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return (now - last) > timedelta(hours=24)

def predict(user_id: int, keystrokes: list[dict], db: Session) -> dict:
    from models import UserModel
    record = db.query(UserModel).filter(UserModel.user_id == user_id).first()

    if not record:
        return {"status": "no_model", "message": "No model trained yet"}
    
    # enrollment data for z-scores
    enrollment_data = string_to_model(record.enrollment_model)
    enrollment_model = enrollment_data["model"]
    scaler = enrollment_data["scaler"]

    # features
    X = np.array([[
        k["dwell_time"],
        k["flight_time"],
        k["backspace_rate"],
        k["typing_speed"],
        k["dwell_variance"],
        k["digraph_time"]
    ] for k in keystrokes])

    X_scaled = scaler.transform(X)

    enrollment_scores = enrollment_model.decision_function(X_scaled)

    # model weighting 50/50
    if record.adaptive_model:
        adaptive_data = string_to_model(record.adaptive_model)
        adaptive_model = adaptive_data["model"]
        adaptive_scores = adaptive_model.decision_function(X_scaled)
        combined_scores = (enrollment_scores * 0.7) + (adaptive_scores * 0.3)
    else:
        combined_scores = enrollment_scores

    avg_score = combined_scores.mean()

    anomaly_rate = (combined_scores < 0).mean()

    if anomaly_rate > 0.3:
        status = "anomaly"
    elif anomaly_rate > 0.15:
        status = "suspicious"
    else:
        status = "normal"

    print(f"Anomaly rate: {anomaly_rate}, Avg score: {avg_score}, Status: {status}")
    print(f"Individual scores: {combined_scores}")

    return {
        "status": status,
        "anomaly_rate": float(anomaly_rate),
        "avg_score": float(avg_score),
        "message": f"{int(anomaly_rate * 100)}% of keystrokes flagged as anomalous"
    }