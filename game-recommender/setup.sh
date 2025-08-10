#!/bin/bash

echo "🎮 PS5 Game Recommender Setup"
echo "=============================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Skipping creation."
    echo ""
else
    echo "📝 Creating .env.local file..."
    echo ""
    echo "🔑 You need a RAWG API key to use this application."
    echo "   Get your free API key at: https://rawg.io/apidocs"
    echo ""
    
    read -p "Enter your RAWG API key: " api_key
    
    if [ -z "$api_key" ]; then
        echo "❌ No API key provided. Please run this script again with a valid key."
        exit 1
    fi
    
    # Create .env.local file
    echo "RAWG_API_KEY=$api_key" > .env.local
    echo "NEXT_PUBLIC_APP_NAME=\"PS5 Game Recommender\"" >> .env.local
    
    echo "✅ .env.local file created successfully!"
    echo ""
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🚀 Setup complete! You can now run:"
echo "   npm run dev"
echo ""
echo "🌐 Open http://localhost:3000 in your browser"
echo ""
echo "📚 For more information, see README.md"
