#!/bin/bash
# Start Moon development environment

echo "Starting Moon development environment..."

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

cd ..

echo ""
echo "Development environment ready!"
echo "=============================="
echo "Backend API: http://localhost:3001"
echo ""
echo "To load the extension in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'moon-extension' directory"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and handle shutdown
trap "kill $BACKEND_PID 2>/dev/null; exit" INT
wait
