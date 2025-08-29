#!/usr/bin/env python3
"""
Convenience script to run the PDF to Question Bank backend server
"""

import uvicorn
import os

if __name__ == "__main__":
    # Set environment variables for development
    os.environ.setdefault("PYTHONPATH", ".")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        access_log=True
    )