# API Documentation

The PDF to Question Bank API provides endpoints for uploading textbooks, processing PDFs, and retrieving practice questions.

**Base URL:** `http://localhost:8000`

## Authentication

Currently, the API does not require authentication. This is suitable for development and personal use.

## Upload Endpoints

### Upload PDF
Upload a PDF textbook for processing.

**POST** `/api/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file`: PDF file (required)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "textbook_id": 1,
  "filename": "20241201_120000_calculus.pdf",
  "status": "pending"
}
```

### Get Processing Status
Check the processing status of an uploaded textbook.

**GET** `/api/processing-status/{textbook_id}`

**Response:**
```json
{
  "textbook_id": 1,
  "filename": "calculus.pdf",
  "status": "completed",
  "total_pages": 450,
  "upload_date": "2024-01-01T12:00:00"
}
```

**Status Values:**
- `pending`: Upload completed, processing not started
- `processing`: Currently extracting questions and structure
- `completed`: Processing finished successfully
- `failed`: Processing encountered an error

### List Textbooks
Get all uploaded textbooks.

**GET** `/api/textbooks`

**Response:**
```json
[
  {
    "id": 1,
    "filename": "calculus.pdf",
    "title": "Calculus",
    "status": "completed",
    "upload_date": "2024-01-01T12:00:00",
    "total_pages": 450,
    "chapters_count": 12
  }
]
```

## Question Endpoints

### Get Chapters
Get all chapters for a specific textbook.

**GET** `/api/chapters/{textbook_id}`

**Response:**
```json
[
  {
    "id": 1,
    "title": "Limits and Continuity",
    "chapter_number": 1,
    "level": 1,
    "page_start": 15,
    "page_end": 45,
    "question_count": 25
  }
]
```

### Get Random Question
Get a random practice question with optional filters.

**GET** `/api/questions/random`

**Query Parameters:**
- `textbook_id` (optional): Filter by textbook
- `chapter_id` (optional): Filter by chapter
- `question_type` (optional): Filter by question type

**Response:**
```json
{
  "id": 123,
  "question_text": "What is the derivative of x²?",
  "question_type": "short_answer",
  "page_number": 45,
  "context": "In this section we explore basic derivatives...",
  "answer": "2x",
  "chapter": {
    "id": 1,
    "title": "Basic Derivatives",
    "chapter_number": 3
  }
}
```

### Get Questions by Chapter
Get all questions for a specific chapter with pagination.

**GET** `/api/questions/by-chapter/{chapter_id}`

**Query Parameters:**
- `limit` (default: 10, max: 100): Number of questions to return
- `offset` (default: 0): Number of questions to skip

**Response:**
```json
{
  "chapter": {
    "id": 1,
    "title": "Basic Derivatives",
    "chapter_number": 3
  },
  "questions": [
    {
      "id": 123,
      "question_text": "What is the derivative of x²?",
      "question_type": "short_answer",
      "page_number": 45,
      "context": "...",
      "answer": "2x"
    }
  ],
  "total": 25,
  "offset": 0,
  "limit": 10
}
```

### Search Questions
Search questions by text content.

**GET** `/api/questions/search`

**Query Parameters:**
- `query` (required): Search text (minimum 3 characters)
- `textbook_id` (optional): Filter by textbook
- `limit` (default: 10, max: 100): Number of results

**Response:**
```json
{
  "query": "derivative",
  "results": [
    {
      "id": 123,
      "question_text": "What is the derivative of x²?",
      "question_type": "short_answer",
      "page_number": 45,
      "chapter": {
        "id": 1,
        "title": "Basic Derivatives",
        "chapter_number": 3
      }
    }
  ],
  "count": 1
}
```

## Statistics Endpoints

### Get Textbook Statistics
Get detailed statistics for a textbook.

**GET** `/api/statistics/{textbook_id}`

**Response:**
```json
{
  "textbook": {
    "id": 1,
    "title": "Calculus",
    "filename": "calculus.pdf",
    "total_pages": 450
  },
  "statistics": {
    "total_questions": 150,
    "total_chapters": 12,
    "question_types": [
      {
        "type": "short_answer",
        "count": 80
      },
      {
        "type": "multiple_choice",
        "count": 45
      },
      {
        "type": "essay",
        "count": 25
      }
    ],
    "chapters": [
      {
        "id": 1,
        "title": "Introduction",
        "chapter_number": 1,
        "question_count": 10
      }
    ]
  }
}
```

## Health Check

### Health Status
Check if the API is running.

**GET** `/health`

**Response:**
```json
{
  "status": "healthy"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Only PDF files are allowed"
}
```

### 404 Not Found
```json
{
  "detail": "Textbook not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Upload failed: Database connection error"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider adding rate limiting middleware.

## Interactive Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## Example Usage

### Python Example
```python
import requests

# Upload a PDF
with open('textbook.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/upload',
        files={'file': f}
    )
    textbook_id = response.json()['textbook_id']

# Get a random question
response = requests.get(
    'http://localhost:8000/api/questions/random',
    params={'textbook_id': textbook_id}
)
question = response.json()
print(question['question_text'])
```

### JavaScript Example
```javascript
// Upload a PDF
const formData = new FormData();
formData.append('file', pdfFile);

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const { textbook_id } = await uploadResponse.json();

// Get a random question
const questionResponse = await fetch(
  `/api/questions/random?textbook_id=${textbook_id}`
);
const question = await questionResponse.json();
console.log(question.question_text);
```