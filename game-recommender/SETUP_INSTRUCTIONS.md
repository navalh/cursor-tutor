# 🎮 Quick Setup Instructions

## Step 1: Get Your API Key
1. Go to [https://rawg.io/apidocs](https://rawg.io/apidocs)
2. Sign up for a free account
3. Copy your API key

## Step 2: Run the Setup Script
```bash
./setup.sh
```
When prompted, paste your API key.

## Step 3: Start the App
```bash
npm run dev
```

## Step 4: Open in Browser
Go to [http://localhost:3000](http://localhost:3000)

---

## Manual Setup (Alternative)

If you prefer to set up manually:

1. Create `.env.local` file:
```bash
echo "RAWG_API_KEY=your_api_key_here" > .env.local
```

2. Install dependencies:
```bash
npm install
```

3. Start the app:
```bash
npm run dev
```

---

## Need Help?

- Check the main README.md for detailed information
- Look at the troubleshooting section
- Ensure your `.env.local` file is in the project root
- Verify your API key is correct
