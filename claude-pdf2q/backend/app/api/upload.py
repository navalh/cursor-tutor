from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import asyncio
from datetime import datetime

from ..database import get_db
from ..models import Textbook
from ..pdf_processor import PDFProcessor

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF file for processing
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Create textbook record
        textbook = Textbook(
            filename=filename,
            original_name=file.filename,
            title=file.filename.replace('.pdf', ''),
            file_size=file_size,
            processing_status="pending"
        )
        
        db.add(textbook)
        db.commit()
        db.refresh(textbook)
        
        # Start background processing
        background_tasks.add_task(process_pdf_background, file_path, textbook.id, db)
        
        return {
            "message": "File uploaded successfully",
            "textbook_id": textbook.id,
            "filename": filename,
            "status": "pending"
        }
        
    except Exception as e:
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/processing-status/{textbook_id}")
async def get_processing_status(textbook_id: int, db: Session = Depends(get_db)):
    """
    Get the processing status of a textbook
    """
    textbook = db.query(Textbook).filter(Textbook.id == textbook_id).first()
    
    if not textbook:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    return {
        "textbook_id": textbook.id,
        "filename": textbook.original_name,
        "status": textbook.processing_status,
        "total_pages": textbook.total_pages,
        "upload_date": textbook.upload_date
    }

@router.get("/textbooks")
async def list_textbooks(db: Session = Depends(get_db)):
    """
    List all uploaded textbooks
    """
    textbooks = db.query(Textbook).order_by(Textbook.upload_date.desc()).all()
    
    return [{
        "id": book.id,
        "filename": book.original_name,
        "title": book.title,
        "status": book.processing_status,
        "upload_date": book.upload_date,
        "total_pages": book.total_pages,
        "chapters_count": len(book.chapters) if book.chapters else 0
    } for book in textbooks]

def process_pdf_background(file_path: str, textbook_id: int, db: Session):
    """
    Background task to process PDF file
    """
    processor = PDFProcessor(db)
    success = processor.process_pdf(file_path, textbook_id)
    
    if not success:
        # Clean up file if processing failed
        if os.path.exists(file_path):
            os.remove(file_path)