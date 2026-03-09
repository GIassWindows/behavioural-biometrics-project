from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Keystroke schemas
class KeystrokeCreate(BaseModel):
    dwell_time: float
    flight_time: float
    backspace_rate: float = 0.0

class KeystrokeResponse(BaseModel):
    id: int
    user_id: int
    dwell_time: float
    flight_time: float
    timestamp: datetime

    class Config:
        from_attributes = True

class KeystrokeBatch(BaseModel):
    keystrokes: list[KeystrokeCreate]

# Note schemas
class NoteCreate(BaseModel):
    title: str
    content: str

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

