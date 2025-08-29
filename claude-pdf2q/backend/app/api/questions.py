from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import random

from ..database import get_db
from ..models import Textbook, Chapter, Question

router = APIRouter()

@router.get("/chapters/{textbook_id}")
async def get_chapters(textbook_id: int, db: Session = Depends(get_db)):
    """
    Get all chapters for a specific textbook
    """
    textbook = db.query(Textbook).filter(Textbook.id == textbook_id).first()
    if not textbook:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    chapters = db.query(Chapter).filter(
        Chapter.textbook_id == textbook_id
    ).order_by(Chapter.chapter_number).all()
    
    return [{
        "id": chapter.id,
        "title": chapter.title,
        "chapter_number": chapter.chapter_number,
        "level": chapter.level,
        "page_start": chapter.page_start,
        "page_end": chapter.page_end,
        "question_count": len(chapter.questions) if chapter.questions else 0
    } for chapter in chapters]

@router.get("/questions/random")
async def get_random_question(
    textbook_id: Optional[int] = Query(None),
    chapter_id: Optional[int] = Query(None),
    question_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get a random question based on filters
    """
    query = db.query(Question)
    
    if textbook_id:
        query = query.filter(Question.textbook_id == textbook_id)
    
    if chapter_id:
        query = query.filter(Question.chapter_id == chapter_id)
    
    if question_type:
        query = query.filter(Question.question_type == question_type)
    
    # Get total count
    total_questions = query.count()
    
    if total_questions == 0:
        raise HTTPException(status_code=404, detail="No questions found with the specified criteria")
    
    # Get random question using OFFSET
    random_offset = random.randint(0, total_questions - 1)
    question = query.offset(random_offset).first()
    
    # Get chapter info
    chapter = db.query(Chapter).filter(Chapter.id == question.chapter_id).first()
    
    return {
        "id": question.id,
        "question_text": question.question_text,
        "question_type": question.question_type,
        "page_number": question.page_number,
        "context": question.context,
        "answer": question.answer,
        "chapter": {
            "id": chapter.id if chapter else None,
            "title": chapter.title if chapter else "Unknown",
            "chapter_number": chapter.chapter_number if chapter else None
        }
    }

@router.get("/questions/by-chapter/{chapter_id}")
async def get_questions_by_chapter(
    chapter_id: int,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get all questions for a specific chapter with pagination
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    questions = db.query(Question).filter(
        Question.chapter_id == chapter_id
    ).offset(offset).limit(limit).all()
    
    total_questions = db.query(Question).filter(Question.chapter_id == chapter_id).count()
    
    return {
        "chapter": {
            "id": chapter.id,
            "title": chapter.title,
            "chapter_number": chapter.chapter_number
        },
        "questions": [{
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "page_number": q.page_number,
            "context": q.context,
            "answer": q.answer
        } for q in questions],
        "total": total_questions,
        "offset": offset,
        "limit": limit
    }

@router.get("/questions/search")
async def search_questions(
    query: str = Query(..., min_length=3),
    textbook_id: Optional[int] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search questions by text content
    """
    search_query = db.query(Question).filter(
        Question.question_text.contains(query)
    )
    
    if textbook_id:
        search_query = search_query.filter(Question.textbook_id == textbook_id)
    
    questions = search_query.limit(limit).all()
    
    results = []
    for question in questions:
        chapter = db.query(Chapter).filter(Chapter.id == question.chapter_id).first()
        
        results.append({
            "id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type,
            "page_number": question.page_number,
            "chapter": {
                "id": chapter.id if chapter else None,
                "title": chapter.title if chapter else "Unknown",
                "chapter_number": chapter.chapter_number if chapter else None
            }
        })
    
    return {
        "query": query,
        "results": results,
        "count": len(results)
    }

@router.get("/statistics/{textbook_id}")
async def get_textbook_statistics(textbook_id: int, db: Session = Depends(get_db)):
    """
    Get statistics for a textbook
    """
    textbook = db.query(Textbook).filter(Textbook.id == textbook_id).first()
    if not textbook:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    # Get question counts by type
    question_types = db.query(
        Question.question_type,
        func.count(Question.id).label('count')
    ).filter(
        Question.textbook_id == textbook_id
    ).group_by(Question.question_type).all()
    
    # Get question counts by chapter
    chapter_stats = db.query(
        Chapter.id,
        Chapter.title,
        Chapter.chapter_number,
        func.count(Question.id).label('question_count')
    ).outerjoin(Question).filter(
        Chapter.textbook_id == textbook_id
    ).group_by(
        Chapter.id, Chapter.title, Chapter.chapter_number
    ).order_by(Chapter.chapter_number).all()
    
    total_questions = db.query(Question).filter(Question.textbook_id == textbook_id).count()
    total_chapters = db.query(Chapter).filter(Chapter.textbook_id == textbook_id).count()
    
    return {
        "textbook": {
            "id": textbook.id,
            "title": textbook.title,
            "filename": textbook.original_name,
            "total_pages": textbook.total_pages
        },
        "statistics": {
            "total_questions": total_questions,
            "total_chapters": total_chapters,
            "question_types": [
                {"type": qt.question_type, "count": qt.count}
                for qt in question_types
            ],
            "chapters": [
                {
                    "id": cs.id,
                    "title": cs.title,
                    "chapter_number": cs.chapter_number,
                    "question_count": cs.question_count or 0
                }
                for cs in chapter_stats
            ]
        }
    }