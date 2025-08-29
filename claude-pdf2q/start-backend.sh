#!/bin/bash
echo "🚀 Starting PDF to Question Bank Backend..."
echo "Backend will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""

cd backend
source venv/bin/activate
python run.py