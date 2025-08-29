import PyPDF2
import pdfplumber
import re
from typing import List, Dict, Tuple, Optional
import logging
from sqlalchemy.orm import Session
from .models import Textbook, Chapter
from .question_extractor import QuestionExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.question_extractor = QuestionExtractor(db)
        
    def process_pdf(self, file_path: str, textbook_id: int) -> bool:
        """
        Process a PDF file iteratively to extract structure and questions
        """
        try:
            # Update status to processing
            textbook = self.db.query(Textbook).filter(Textbook.id == textbook_id).first()
            textbook.processing_status = "processing"
            self.db.commit()
            
            # Get PDF metadata
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                
            textbook.total_pages = total_pages
            self.db.commit()
            
            # Extract table of contents
            toc = self._extract_table_of_contents(file_path)
            if toc:
                self._store_chapters(toc, textbook_id)
            
            # Process PDF in chunks to avoid memory issues
            chunk_size = 10  # Process 10 pages at a time
            
            for start_page in range(0, total_pages, chunk_size):
                end_page = min(start_page + chunk_size, total_pages)
                logger.info(f"Processing pages {start_page + 1} to {end_page}")
                
                chunk_text = self._extract_text_chunk(file_path, start_page, end_page)
                
                # Extract questions from this chunk
                self.question_extractor.extract_questions_from_text(
                    chunk_text, textbook_id, start_page + 1
                )
                
            # Update status to completed
            textbook.processing_status = "completed"
            self.db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            textbook = self.db.query(Textbook).filter(Textbook.id == textbook_id).first()
            if textbook:
                textbook.processing_status = "failed"
                self.db.commit()
            return False
    
    def _extract_text_chunk(self, file_path: str, start_page: int, end_page: int) -> List[Dict]:
        """
        Extract text from a specific range of pages
        """
        pages_text = []
        
        with pdfplumber.open(file_path) as pdf:
            for page_num in range(start_page, end_page):
                if page_num < len(pdf.pages):
                    page = pdf.pages[page_num]
                    text = page.extract_text()
                    if text:
                        pages_text.append({
                            'page_number': page_num + 1,
                            'text': text.strip(),
                            'bbox': page.bbox if hasattr(page, 'bbox') else None
                        })
        
        return pages_text
    
    def _extract_table_of_contents(self, file_path: str) -> List[Dict]:
        """
        Extract table of contents by looking for common TOC patterns
        """
        toc_entries = []
        toc_found = False
        
        try:
            with pdfplumber.open(file_path) as pdf:
                # Look for TOC in first 20 pages
                for page_num in range(min(20, len(pdf.pages))):
                    page = pdf.pages[page_num]
                    text = page.extract_text()
                    
                    if not text:
                        continue
                        
                    lines = text.split('\n')
                    
                    # Check if this looks like a TOC page
                    toc_indicators = [
                        'table of contents', 'contents', 'chapter', 'section'
                    ]
                    
                    page_text_lower = text.lower()
                    if any(indicator in page_text_lower for indicator in toc_indicators):
                        toc_found = True
                        
                        # Extract chapter entries
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                                
                            # Look for patterns like "Chapter 1: Introduction ... 5"
                            # or "1. Introduction ... 5"
                            chapter_match = re.match(
                                r'(?:chapter\s+)?(\d+)\.?\s*([^.]+?)\.{2,}(\d+)', 
                                line.lower()
                            )
                            
                            if chapter_match:
                                chapter_num = int(chapter_match.group(1))
                                title = chapter_match.group(2).strip().title()
                                page_start = int(chapter_match.group(3))
                                
                                toc_entries.append({
                                    'chapter_number': chapter_num,
                                    'title': title,
                                    'page_start': page_start,
                                    'level': 1
                                })
                            
                            # Look for subchapter patterns
                            subchapter_match = re.match(
                                r'\s+(\d+\.\d+)\s+([^.]+?)\.{2,}(\d+)', 
                                line
                            )
                            
                            if subchapter_match:
                                section_num = subchapter_match.group(1)
                                title = subchapter_match.group(2).strip().title()
                                page_start = int(subchapter_match.group(3))
                                
                                toc_entries.append({
                                    'chapter_number': section_num,
                                    'title': title,
                                    'page_start': page_start,
                                    'level': 2
                                })
                    
                    if toc_found and toc_entries:
                        break
            
            # If no formal TOC found, try to infer chapters from headings
            if not toc_entries:
                toc_entries = self._infer_chapters_from_headings(file_path)
                
        except Exception as e:
            logger.error(f"Error extracting TOC: {str(e)}")
            
        return toc_entries
    
    def _infer_chapters_from_headings(self, file_path: str) -> List[Dict]:
        """
        Infer chapter structure from document headings
        """
        chapters = []
        chapter_patterns = [
            r'^\s*chapter\s+(\d+)', 
            r'^\s*(\d+)\.\s+[A-Z][^.]*$',
            r'^\s*unit\s+(\d+)',
            r'^\s*section\s+(\d+)'
        ]
        
        try:
            with pdfplumber.open(file_path) as pdf:
                chapter_num = 0
                
                for page_num, page in enumerate(pdf.pages[:50]):  # Check first 50 pages
                    text = page.extract_text()
                    if not text:
                        continue
                        
                    lines = text.split('\n')
                    
                    for line in lines:
                        line = line.strip()
                        if len(line) < 5 or len(line) > 100:  # Skip very short/long lines
                            continue
                            
                        for pattern in chapter_patterns:
                            match = re.match(pattern, line.lower())
                            if match:
                                chapter_num += 1
                                title = line.title()
                                
                                chapters.append({
                                    'chapter_number': chapter_num,
                                    'title': title,
                                    'page_start': page_num + 1,
                                    'level': 1
                                })
                                break
                                
        except Exception as e:
            logger.error(f"Error inferring chapters: {str(e)}")
            
        return chapters
    
    def _store_chapters(self, toc_entries: List[Dict], textbook_id: int):
        """
        Store extracted chapters in database
        """
        try:
            for entry in toc_entries:
                chapter = Chapter(
                    textbook_id=textbook_id,
                    title=entry['title'],
                    chapter_number=entry['chapter_number'],
                    page_start=entry['page_start'],
                    level=entry['level']
                )
                
                self.db.add(chapter)
            
            self.db.commit()
            logger.info(f"Stored {len(toc_entries)} chapters for textbook {textbook_id}")
            
        except Exception as e:
            logger.error(f"Error storing chapters: {str(e)}")
            self.db.rollback()