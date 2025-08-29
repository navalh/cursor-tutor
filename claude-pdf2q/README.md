# PDF to Question Bank - Full Stack Application

A full-stack web application that analyzes PDF textbooks, extracts their structure, and builds a practice-question system for learners.

## Features

- **PDF Upload & Processing**: Iteratively processes large PDF files to avoid memory limitations
- **Structure Extraction**: Automatically detects table of contents, chapters, and subchapters
- **Question Detection**: Uses NLP to identify practice questions, exercises, and review questions
- **Smart Storage**: Stores questions in a structured database indexed by chapter/topic
- **Practice Interface**: Allows users to select chapters and get random practice questions
- **Scalable Architecture**: Handles very large PDFs through chunked processing

## Tech Stack

- **Backend**: Python with FastAPI
- **Frontend**: React with modern hooks
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **PDF Processing**: PyPDF2 + pdfplumber for text extraction
- **NLP**: spaCy for question detection and text analysis

## Project Structure

```
claude-pdf2q/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Database models
│   │   ├── database.py          # Database configuration
│   │   ├── pdf_processor.py     # PDF processing logic
│   │   ├── question_extractor.py # Question detection logic
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── upload.py        # Upload endpoints
│   │       └── questions.py     # Question endpoints
│   ├── requirements.txt
│   └── uploads/                 # Uploaded PDFs storage
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── package-lock.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd claude-pdf2q/backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd claude-pdf2q/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Usage

1. Open your browser to `http://localhost:3000`
2. Upload a PDF textbook using the upload interface
3. Wait for processing to complete
4. Select a chapter/subchapter from the dropdown
5. Click "Get Random Question" to practice

## API Endpoints

- `POST /api/upload` - Upload and process PDF files
- `GET /api/textbooks` - List all processed textbooks
- `GET /api/chapters/{textbook_id}` - Get chapters for a textbook
- `GET /api/questions/random` - Get random question from specified chapter
- `GET /api/processing-status/{textbook_id}` - Check processing status

## Database Schema

The application uses three main tables:

1. **textbooks** - Store textbook metadata
2. **chapters** - Store chapter/subchapter structure
3. **questions** - Store extracted questions with chapter references

## Development

### Running Tests

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License