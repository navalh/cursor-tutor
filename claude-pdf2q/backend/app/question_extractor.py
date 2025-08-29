import re
import logging
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from .models import Question, Chapter

logger = logging.getLogger(__name__)

class QuestionExtractor:
    def __init__(self, db: Session):
        self.db = db
        
        # Patterns to identify questions
        self.question_patterns = [
            r'\b\d+\.\s+(.+?\?)',  # "1. What is...?"
            r'\b\d+\)\s+(.+?\?)',  # "1) What is...?"
            r'^Q\d*[:\.]?\s+(.+?\?)',  # "Q1: What is...?" or "Q. What is...?"
            r'^Question\s+\d*[:\.]?\s+(.+?\?)',  # "Question 1: What is...?"
            r'^\d+\.\d+\s+(.+?\?)',  # "1.1 What is...?"
            r'^[A-Z][^.!?]*\?$',  # Standalone questions ending with ?
        ]
        
        # Patterns for exercise sections
        self.exercise_section_patterns = [
            r'(?i)exercises?',
            r'(?i)problems?',
            r'(?i)review\s+questions?',
            r'(?i)practice\s+problems?',
            r'(?i)homework',
            r'(?i)assignments?',
            r'(?i)study\s+questions?',
            r'(?i)discussion\s+questions?',
        ]
        
        # Context keywords that indicate educational content
        self.educational_keywords = [
            'chapter', 'section', 'exercise', 'problem', 'question',
            'review', 'practice', 'homework', 'assignment', 'study',
            'discuss', 'explain', 'describe', 'analyze', 'compare'
        ]
    
    def extract_questions_from_text(self, pages_text: List[Dict], textbook_id: int, start_page: int):
        """
        Extract questions from a chunk of text pages
        """
        questions_found = 0
        
        for page_data in pages_text:
            page_num = page_data['page_number']
            text = page_data['text']
            
            if not text:
                continue
                
            # Find the appropriate chapter for this page
            chapter = self._find_chapter_for_page(textbook_id, page_num)
            
            # Extract questions from this page
            page_questions = self._extract_questions_from_page(text, page_num)
            
            # Store questions in database
            for question_data in page_questions:
                try:
                    question = Question(
                        textbook_id=textbook_id,
                        chapter_id=chapter.id if chapter else None,
                        question_text=question_data['text'],
                        question_type=question_data['type'],
                        page_number=page_num,
                        context=question_data['context'],
                        answer=question_data.get('answer')
                    )
                    
                    self.db.add(question)
                    questions_found += 1
                    
                except Exception as e:
                    logger.error(f"Error storing question: {str(e)}")
                    
        if questions_found > 0:
            try:
                self.db.commit()
                logger.info(f"Extracted {questions_found} questions from pages {start_page}-{start_page + len(pages_text)}")
            except Exception as e:
                logger.error(f"Error committing questions: {str(e)}")
                self.db.rollback()
    
    def _extract_questions_from_page(self, text: str, page_num: int) -> List[Dict]:
        """
        Extract individual questions from a page of text
        """
        questions = []
        lines = text.split('\n')
        
        # Check if this page contains an exercise section
        is_exercise_section = self._is_exercise_section(text)
        
        # Extract questions using different strategies
        if is_exercise_section:
            questions.extend(self._extract_from_exercise_section(text, lines))
        else:
            questions.extend(self._extract_scattered_questions(text, lines))
            
        # Add context and metadata to questions
        for question in questions:
            question['context'] = self._get_question_context(question['text'], text)
            question['type'] = self._classify_question_type(question['text'])
            
        return questions
    
    def _is_exercise_section(self, text: str) -> bool:
        """
        Determine if this page contains an exercise or question section
        """
        text_lower = text.lower()
        
        # Check for exercise section headers
        for pattern in self.exercise_section_patterns:
            if re.search(pattern, text_lower):
                return True
                
        # Check for high density of question marks
        question_count = text.count('?')
        if question_count >= 3 and len(text) > 0:
            question_density = question_count / len(text.split())
            if question_density > 0.05:  # More than 5% of words end with questions
                return True
                
        return False
    
    def _extract_from_exercise_section(self, text: str, lines: List[str]) -> List[Dict]:
        """
        Extract questions from a dedicated exercise section
        """
        questions = []
        current_question = ""
        question_number = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # Check if this line starts a new question
            question_start_match = re.match(r'^(\d+)[\.\)]\s+(.*)', line)
            if question_start_match:
                # Save previous question if exists
                if current_question and '?' in current_question:
                    questions.append({
                        'text': current_question.strip(),
                        'number': question_number
                    })
                
                # Start new question
                question_number = question_start_match.group(1)
                current_question = question_start_match.group(2)
            else:
                # Continue current question
                if current_question:
                    current_question += " " + line
                    
        # Don't forget the last question
        if current_question and '?' in current_question:
            questions.append({
                'text': current_question.strip(),
                'number': question_number
            })
            
        return questions
    
    def _extract_scattered_questions(self, text: str, lines: List[str]) -> List[Dict]:
        """
        Extract questions scattered throughout regular text
        """
        questions = []
        
        # Use regex patterns to find questions
        for pattern in self.question_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                question_text = match.group(1) if match.groups() else match.group(0)
                question_text = question_text.strip()
                
                # Validate the question
                if self._is_valid_question(question_text):
                    questions.append({
                        'text': question_text,
                        'number': None
                    })
                    
        # Remove duplicates
        seen_questions = set()
        unique_questions = []
        
        for question in questions:
            # Use first 50 characters as key for duplicate detection
            key = question['text'][:50].lower()
            if key not in seen_questions:
                seen_questions.add(key)
                unique_questions.append(question)
                
        return unique_questions
    
    def _is_valid_question(self, text: str) -> bool:
        """
        Validate if the extracted text is actually a meaningful question
        """
        if not text or len(text) < 10:
            return False
            
        if not text.endswith('?'):
            return False
            
        # Check for educational keywords
        text_lower = text.lower()
        has_educational_keyword = any(
            keyword in text_lower for keyword in self.educational_keywords
        )
        
        # Check for common question words
        question_words = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'does', 'is', 'are', 'can', 'will', 'would', 'should']
        starts_with_question_word = any(
            text_lower.startswith(word) for word in question_words
        )
        
        return has_educational_keyword or starts_with_question_word
    
    def _classify_question_type(self, question_text: str) -> str:
        """
        Classify the type of question based on its content
        """
        text_lower = question_text.lower()
        
        # Multiple choice indicators
        if any(indicator in text_lower for indicator in ['a)', 'b)', 'c)', 'd)', 'choose', 'select']):
            return 'multiple_choice'
            
        # True/false indicators
        if any(indicator in text_lower for indicator in ['true or false', 't/f', 'true/false']):
            return 'true_false'
            
        # Essay/long answer indicators
        if any(indicator in text_lower for indicator in ['explain', 'describe', 'discuss', 'analyze', 'compare', 'contrast']):
            return 'essay'
            
        # Short answer (default)
        return 'short_answer'
    
    def _get_question_context(self, question_text: str, full_text: str) -> str:
        """
        Extract surrounding context for a question
        """
        # Find the question in the full text
        question_index = full_text.find(question_text)
        if question_index == -1:
            return ""
            
        # Get context before and after (up to 200 characters each)
        start_context = max(0, question_index - 200)
        end_context = min(len(full_text), question_index + len(question_text) + 200)
        
        context = full_text[start_context:end_context]
        return context.strip()
    
    def _find_chapter_for_page(self, textbook_id: int, page_num: int) -> Optional[Chapter]:
        """
        Find the chapter that contains the given page number
        """
        try:
            chapter = self.db.query(Chapter).filter(
                Chapter.textbook_id == textbook_id,
                Chapter.page_start <= page_num
            ).order_by(Chapter.page_start.desc()).first()
            
            return chapter
        except Exception as e:
            logger.error(f"Error finding chapter for page {page_num}: {str(e)}")
            return None