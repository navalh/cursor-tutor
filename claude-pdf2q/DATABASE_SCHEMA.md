# Database Schema

The PDF to Question Bank application uses SQLite as the default database with the following schema:

## Tables

### textbooks
Stores metadata about uploaded PDF textbooks.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Unique identifier |
| filename | VARCHAR | Unique filename on disk |
| original_name | VARCHAR | Original filename from upload |
| title | VARCHAR | Display title (derived from filename) |
| upload_date | DATETIME | When the file was uploaded |
| processing_status | VARCHAR | pending, processing, completed, failed |
| total_pages | INTEGER | Number of pages in the PDF |
| file_size | INTEGER | File size in bytes |

### chapters
Stores the chapter/section structure extracted from textbooks.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Unique identifier |
| textbook_id | INTEGER | Foreign key to textbooks table |
| title | VARCHAR | Chapter title |
| chapter_number | INTEGER | Chapter number |
| parent_id | INTEGER | Foreign key to chapters table (for subchapters) |
| page_start | INTEGER | Starting page number |
| page_end | INTEGER | Ending page number |
| level | INTEGER | Hierarchy level (1=chapter, 2=subchapter, etc.) |

### questions
Stores extracted practice questions from the textbooks.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Unique identifier |
| textbook_id | INTEGER | Foreign key to textbooks table |
| chapter_id | INTEGER | Foreign key to chapters table |
| question_text | TEXT | The actual question content |
| question_type | VARCHAR | multiple_choice, short_answer, essay, true_false |
| page_number | INTEGER | Page where question was found |
| context | TEXT | Surrounding text for context |
| answer | TEXT | Answer if provided in the PDF |
| difficulty | VARCHAR | easy, medium, hard (default: medium) |
| created_date | DATETIME | When the question was extracted |

## Relationships

- **textbooks** → **chapters** (1:many)
- **textbooks** → **questions** (1:many)  
- **chapters** → **questions** (1:many)
- **chapters** → **chapters** (1:many, self-referencing for subchapters)

## Indexes

The following indexes are automatically created:

- `textbooks.filename` (unique)
- `textbooks.id` (primary key)
- `chapters.textbook_id`
- `chapters.id` (primary key)
- `questions.textbook_id`
- `questions.chapter_id`
- `questions.id` (primary key)

## Database File

By default, the database is stored as `textbook_questions.db` in the backend directory.

## Upgrading to PostgreSQL

To upgrade to PostgreSQL for production:

1. Install PostgreSQL and psycopg2:
   ```bash
   pip install psycopg2-binary
   ```

2. Update the database URL in `app/database.py`:
   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/textbook_questions"
   ```

3. The same schema will be created automatically using SQLAlchemy migrations.

## Sample Queries

### Get all questions for a specific chapter:
```sql
SELECT q.*, c.title as chapter_title 
FROM questions q 
JOIN chapters c ON q.chapter_id = c.id 
WHERE c.id = ?;
```

### Get question count by textbook:
```sql
SELECT t.title, COUNT(q.id) as question_count
FROM textbooks t
LEFT JOIN questions q ON t.id = q.textbook_id
GROUP BY t.id, t.title;
```

### Get random question from a specific textbook:
```sql
SELECT q.*, c.title as chapter_title
FROM questions q
LEFT JOIN chapters c ON q.chapter_id = c.id
WHERE q.textbook_id = ?
ORDER BY RANDOM()
LIMIT 1;
```