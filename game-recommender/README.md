# PS5 Game Recommender

A Next.js application that provides AI-powered game recommendations specifically for PlayStation 5 games.

## Features

- **PS5 Focused**: Only recommends PlayStation 5 games
- **Quality Filtering**: Only includes games with 10+ ratings for reliable recommendations
- **Metacritic Integration**: Displays Metacritic scores with color-coded ratings and filtering
- **Smart Recommendations**: AI-powered algorithm considering genres, Metacritic scores, and playtime
- **Modern UI**: Built with Next.js 15, TypeScript, and Tailwind CSS
- **Genre Dropdown**: Easy selection from all available game genres
- **Metacritic Filtering**: Filter games by minimum Metacritic score (10+, 20+, 30+, etc.)

## Requirements

- Games must have at least 10 ratings to be included in recommendations
- Metacritic scores are displayed when available
- All games are filtered to PS5 platform only
- Filtering by Metacritic score ranges (10+, 20+, 30+, 40+, 50+, 60+, 70+, 80+, 90+)

## API Integration

Uses the RAWG API to fetch game data and genres. Requires a `RAWG_API_KEY` environment variable.

## Getting Started

**Option 1: Quick Setup (Recommended)**
```bash
./setup.sh
```

**Option 2: Manual Setup**

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   
   **Important**: You need a RAWG API key to use this application.
   
   a. Get your free API key at [https://rawg.io/apidocs](https://rawg.io/apidocs)
   b. Create a `.env.local` file in the project root:
   ```bash
   echo "RAWG_API_KEY=your_actual_api_key_here" > .env.local
   ```
   
   **Note**: Replace `your_actual_api_key_here` with your real RAWG API key.

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Recommendation Algorithm

The system considers:
- Genre preferences (dropdown selection)
- Minimum Metacritic score requirements
- Maximum playtime preferences
- Metacritic scores (weighted heavily)
- Number of ratings (reliability indicator)
- User preferences and exclusions

## Filter Options

- **Genres**: Dropdown with all available genres from RAWG API
- **Metacritic Score**: 10+, 20+, 30+, 40+, 50+, 60+, 70+, 80+, 90+
- **Playtime**: Maximum hours filter
- **Results**: Number of recommendations to display (1-50)

## Security Features

- Input validation with Zod schemas
- Proper error handling and HTTP status codes
- Environment variable protection for API keys
- TypeScript for type safety

## Troubleshooting

### "Invalid API key" Error
- Make sure you have created a `.env.local` file with your RAWG API key
- Verify the API key is correct and active
- Check that the `.env.local` file is in the project root directory

### Validation Errors
- The form automatically filters out invalid values
- Metacritic Rating Band "Any" is handled correctly
- All inputs are validated before submission

### No Games Loading
- Ensure your API key is valid
- Check the browser console for error messages
- Verify the RAWG API service is available
