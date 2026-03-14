from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from database import engine, get_db, Base
from models import User, KeystrokeLog, Note, UserModel
from schemas import UserCreate, UserResponse, Token, KeystrokeBatch, NoteCreate, NoteUpdate, NoteResponse
from auth import hash_password, authenticate_user, create_access_token, get_current_user
from fastapi.security import OAuth2PasswordRequestForm
from ml import train_model, predict, retrain_adaptive, should_retrain
import os
from dotenv import load_dotenv

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins = [
    "http://localhost:3000",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running"}

# Register account
@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Log into account
@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")))
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Get current user
@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Log keystrokes
@app.post("/keystrokes/log")
def log_keystrokes(
    batch: KeystrokeBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = [
        KeystrokeLog(
            user_id=current_user.id,
            dwell_time=k.dwell_time,
            flight_time=k.flight_time,
            backspace_rate=k.backspace_rate,
            typing_speed=k.typing_speed,
            dwell_variance=k.dwell_variance,
            digraph_time=k.digraph_time
        )
        for k in batch.keystrokes
    ]
    db.add_all(logs)
    db.commit()

    record = db.query(UserModel).filter(UserModel.user_id == current_user.id).first()
    if record and should_retrain(record):
        all_logs = db.query(KeystrokeLog).filter(KeystrokeLog.user_id == current_user.id).all()
        keystrokes = [{
            "dwell_time": l.dwell_time,
            "flight_time": l.flight_time,
            "backspace_rate": l.backspace_rate,
            "typing_speed": l.typing_speed,
            "dwell_variance": l.dwell_variance,
            "digraph_time": l.digraph_time
        } for l in all_logs]
        retrain_adaptive(current_user.id, keystrokes, db)

    return {"saved": len(logs)}

# Get all notes
@app.get("/notes", response_model=list[NoteResponse])
def get_notes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Note).filter(Note.user_id == current_user.id).all()

# Create note
@app.post("/notes", response_model=NoteResponse)
def create_note(note: NoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_note = Note(
        user_id=current_user.id,
        title=note.title,
        content=note.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

# Update note
@app.patch("/notes/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, note: NoteUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.title is not None:
        db_note.title = note.title
    if note.content is not None:
        db_note.content = note.content
    db.commit()
    db.refresh(db_note)
    return db_note

# Delete note
@app.delete("/notes/{note_id}")
def delete_note(note_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()
    return {"success": True}

# ML section

# Train model for current user, always done in enrollment phase
@app.post("/ml/train")
def train(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(KeystrokeLog).filter(KeystrokeLog.user_id == current_user.id).all()

    # features
    keystrokes = [{
        "dwell_time": l.dwell_time,
        "flight_time": l.flight_time,
        "backspace_rate": l.backspace_rate,
        "typing_speed": l.typing_speed,
        "dwell_variance": l.dwell_variance,
        "digraph_time": l.digraph_time
    } for l in logs]

    success, message = train_model(current_user.id, keystrokes, db)

    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"message": message}

# Predict on a batch of keystrokes
@app.post("/ml/predict")
def predict_keystrokes(
    batch: KeystrokeBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # features
    keystrokes = [{
        "dwell_time": l.dwell_time,
        "flight_time": l.flight_time,
        "backspace_rate": l.backspace_rate,
        "typing_speed": l.typing_speed,
        "dwell_variance": l.dwell_variance,
        "digraph_time": l.digraph_time
    } for l in batch.keystrokes]

    result = predict(current_user.id, keystrokes, db)

    return result

@app.post("/ml/retrain")
def retrain(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(KeystrokeLog).filter(KeystrokeLog.user_id == current_user.id).all()
    keystrokes = [{
        "dwell_time": l.dwell_time,
        "flight_time": l.flight_time,
        "backspace_rate": l.backspace_rate,
        "typing_speed": l.typing_speed,
        "dwell_variance": l.dwell_variance,
        "digraph_time": l.digraph_time
    } for l in logs]
    retrain_adaptive(current_user.id, keystrokes, db)
    return {"message": "Adaptive model retrained"}