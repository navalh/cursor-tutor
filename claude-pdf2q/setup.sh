#!/bin/bash
# PDF to Question Bank - Complete Setup Script

set -e

echo "PDF to Question Bank - Complete Setup"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup Backend
echo ""
echo "Setting up Backend..."
echo "--------------------"

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip and install requirements
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Download spaCy model
echo "📦 Downloading spaCy language model..."
python -m spacy download en_core_web_sm

# Create uploads directory
mkdir -p uploads

# Initialize database
echo "🗄️ Initializing database..."
python -c "
import sys
sys.path.insert(0, '.')
from app.database import create_tables
create_tables()
print('Database tables created successfully')
"

cd ..

# Setup Frontend
echo ""
echo "Setting up Frontend..."
echo "---------------------"

cd frontend

# Install npm dependencies
echo "📦 Installing Node.js dependencies..."
npm install

cd ..

# Create startup scripts
echo ""
echo "Creating startup scripts..."
echo "---------------------------"

# Create start-backend.sh
cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "Starting PDF to Question Bank Backend..."
cd backend
source venv/bin/activate
python run.py
EOF

# Create start-frontend.sh
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "Starting PDF to Question Bank Frontend..."
cd frontend
npm start
EOF

# Make scripts executable
chmod +x start-backend.sh
chmod +x start-frontend.sh

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the application:"
echo "========================"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   ./start-backend.sh"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   ./start-frontend.sh"
echo ""
echo "3. Open your browser to: http://localhost:3000"
echo ""
echo "Manual startup commands:"
echo "- Backend:  cd backend && source venv/bin/activate && python run.py"
echo "- Frontend: cd frontend && npm start"
echo ""
echo "API Documentation: http://localhost:8000/docs"