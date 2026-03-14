from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Retrain model

class UserModel(Base):
    __tablename__ = "user_models"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, nullable=False)
    enrollment_model = Column(String, nullable=False)
    adaptive_model = Column(String, nullable=True)
    last_retrained = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# Keystroke logging for data training

class KeystrokeLog(Base):
    __tablename__ = "keystroke_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    dwell_time = Column(Float, nullable=False)
    flight_time = Column(Float, nullable=False)
    backspace_rate = Column(Float, nullable=False, default=0.0)
    typing_speed = Column(Float, nullable=False, default=0.0)
    dwell_variance = Column(Float, nullable=False, default=0.0)
    digraph_time = Column(Float, nullable=False, default=0.0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    title = Column(String, nullable=False, default="Untitled")
    content = Column(String, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())