#!/usr/bin/env python3
"""
Development setup script for PDF to Question Bank backend
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"\n{description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {description} completed successfully")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed:")
        print(f"Error: {e.stderr}")
        return None

def main():
    print("PDF to Question Bank - Backend Setup")
    print("=" * 40)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("✗ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    
    # Create virtual environment if it doesn't exist
    if not os.path.exists('venv'):
        run_command('python -m venv venv', 'Creating virtual environment')
    
    # Determine activation command based on OS
    if sys.platform == "win32":
        activate_cmd = 'venv\\Scripts\\activate'
        pip_cmd = 'venv\\Scripts\\pip'
        python_cmd = 'venv\\Scripts\\python'
    else:
        activate_cmd = 'source venv/bin/activate'
        pip_cmd = 'venv/bin/pip'
        python_cmd = 'venv/bin/python'
    
    # Upgrade pip
    run_command(f'{pip_cmd} install --upgrade pip', 'Upgrading pip')
    
    # Install requirements
    run_command(f'{pip_cmd} install -r requirements.txt', 'Installing Python dependencies')
    
    # Download spaCy model
    run_command(f'{python_cmd} -m spacy download en_core_web_sm', 'Downloading spaCy language model')
    
    # Create uploads directory
    os.makedirs('uploads', exist_ok=True)
    print("✓ Created uploads directory")
    
    # Test imports
    print("\nTesting imports...")
    try:
        sys.path.insert(0, '.')
        from app.database import create_tables
        from app.models import Textbook, Chapter, Question
        create_tables()
        print("✓ Database tables created successfully")
    except Exception as e:
        print(f"✗ Database setup failed: {e}")
        return False
    
    print("\n" + "=" * 40)
    print("Setup completed successfully!")
    print("\nTo start the development server:")
    if sys.platform == "win32":
        print("  venv\\Scripts\\activate")
    else:
        print("  source venv/bin/activate")
    print("  python run.py")
    print("\nOr use uvicorn directly:")
    print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    
    return True

if __name__ == "__main__":
    main()