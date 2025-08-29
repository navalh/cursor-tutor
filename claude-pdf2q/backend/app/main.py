from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import create_tables
from .api import upload, questions

app = FastAPI(
    title="PDF to Question Bank API",
    description="API for processing PDF textbooks and extracting practice questions",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
create_tables()

# Include API routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(questions.router, prefix="/api", tags=["questions"])

# Serve uploaded files (for development only)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {
        "message": "PDF to Question Bank API",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/upload",
            "textbooks": "/api/textbooks",
            "chapters": "/api/chapters/{textbook_id}",
            "random_question": "/api/questions/random",
            "search": "/api/questions/search",
            "statistics": "/api/statistics/{textbook_id}"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}