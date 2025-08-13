#!/bin/bash

# Moon Chrome Extension Setup Script
# This script sets up the development environment for the Moon extension

set -e

echo "🌙 Moon Chrome Extension Setup"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
    fi
}

echo "Checking requirements..."
check_command node
check_command npm
check_command git

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Node.js version is compatible${NC}"
fi

echo ""
echo "Setting up Backend..."
echo "--------------------"
cd backend

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo -e "${YELLOW}⚠️  Please edit backend/.env with your API keys${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Check for PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
    
    read -p "Do you want to create the database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating PostgreSQL database..."
        psql -U postgres -c "CREATE DATABASE moon_db;" 2>/dev/null || echo "Database might already exist"
        psql -U postgres -c "CREATE USER moon_user WITH PASSWORD 'moon_dev_password';" 2>/dev/null || echo "User might already exist"
        psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE moon_db TO moon_user;" 2>/dev/null
        echo -e "${GREEN}✓ Database setup complete${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Please install it or use a cloud database${NC}"
fi

# Check for Redis
if command -v redis-cli &> /dev/null; then
    echo -e "${GREEN}✓ Redis is installed${NC}"
    
    # Check if Redis is running
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis is not running. Start it with: redis-server${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis not found. Please install it or use a cloud Redis service${NC}"
fi

cd ..

echo ""
echo "Setting up Chrome Extension..."
echo "------------------------------"

# Create a development manifest for easier testing
cat > manifest.dev.json << 'EOF'
{
  "manifest_version": 3,
  "name": "Moon - AI Reply Generator (Dev)",
  "version": "1.0.0",
  "description": "Generate AI-powered replies in different tones with one click",
  "permissions": [
    "activeTab",
    "storage",
    "clipboardWrite",
    "contextMenus"
  ],
  "host_permissions": [
    "http://localhost:3001/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html"
  }
}
EOF

echo -e "${GREEN}✓ Development manifest created${NC}"

# Create placeholder icons
mkdir -p public/icons
for size in 16 32 48 128; do
    if [ ! -f "public/icons/icon-${size}.png" ]; then
        # Create a simple placeholder icon using ImageMagick if available
        if command -v convert &> /dev/null; then
            convert -size ${size}x${size} xc:purple -fill white -gravity center -pointsize $((size/3)) -annotate +0+0 '🌙' "public/icons/icon-${size}.png" 2>/dev/null
        else
            touch "public/icons/icon-${size}.png"
        fi
    fi
done
echo -e "${GREEN}✓ Icon placeholders created${NC}"

echo ""
echo "Creating development scripts..."
echo "-------------------------------"

# Create start script
cat > start-dev.sh << 'EOF'
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
EOF

chmod +x start-dev.sh
echo -e "${GREEN}✓ Development scripts created${NC}"

echo ""
echo "=================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "-----------"
echo "1. Edit backend/.env with your API keys:"
echo "   - OpenAI API key"
echo "   - Anthropic API key (optional)"
echo "   - Database credentials"
echo ""
echo "2. Start the development environment:"
echo "   ./start-dev.sh"
echo ""
echo "3. Load the extension in Chrome:"
echo "   - Open chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'moon-extension' directory"
echo ""
echo "4. Test the extension:"
echo "   - Select any text on a webpage"
echo "   - Click the Moon icon in your toolbar"
echo "   - Choose a tone to generate a reply"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC} See README.md for detailed instructions"
echo -e "${YELLOW}🔒 Security:${NC} Never commit your .env file or API keys!"
echo ""
