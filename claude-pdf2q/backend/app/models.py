from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Textbook(Base):
    __tablename__ = "textbooks"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    original_name = Column(String)
    title = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    total_pages = Column(Integer)
    file_size = Column(Integer)
    
    chapters = relationship("Chapter", back_populates="textbook", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"
    
    id = Column(Integer, primary_key=True, index=True)
    textbook_id = Column(Integer, ForeignKey("textbooks.id"))
    title = Column(String)
    chapter_number = Column(Integer)
    parent_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)  # For subchapters
    page_start = Column(Integer)
    page_end = Column(Integer)
    level = Column(Integer, default=1)  # 1 = main chapter, 2 = subchapter, etc.
    
    textbook = relationship("Textbook", back_populates="chapters")
    questions = relationship("Question", back_populates="chapter", cascade="all, delete-orphan")
    parent = relationship("Chapter", remote_side=[id])

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    textbook_id = Column(Integer, ForeignKey("textbooks.id"))
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    question_text = Column(Text)
    question_type = Column(String)  # multiple_choice, short_answer, essay, etc.
    page_number = Column(Integer)
    context = Column(Text)  # Surrounding text for context
    answer = Column(Text, nullable=True)  # If answer is provided in the PDF
    difficulty = Column(String, default="medium")  # easy, medium, hard
    created_date = Column(DateTime, default=datetime.utcnow)
    
    textbook = relationship("Textbook")
    chapter = relationship("Chapter", back_populates="questions")