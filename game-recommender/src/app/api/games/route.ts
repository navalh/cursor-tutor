import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recommendationEngine } from '@/lib/recommendation-engine'
import { rawgAPI } from '@/lib/api'

const recommendationSchema = z.object({
  genres: z.array(z.string()).optional(),
  minMetacritic: z.coerce.number().min(0).max(100).optional(),
  metacriticBand: z.enum(['any', '0-30', '31-60', '61-80', '81-100']).optional(),
  maxPlaytime: z.coerce.number().min(1).max(500).optional(),
  excludedTags: z.array(z.string()).optional(),
  limit: z.coerce.number().min(1).max(50).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryParams = {
      genres: searchParams.get('genres')?.split(',').filter(Boolean) || [],
      minMetacritic: searchParams.get('minMetacritic') ? parseInt(searchParams.get('minMetacritic')!) : undefined,
      metacriticBand: searchParams.get('metacriticBand') || undefined,
      maxPlaytime: searchParams.get('maxPlaytime') ? parseInt(searchParams.get('maxPlaytime')!) : 100,
      excludedTags: searchParams.get('excludedTags')?.split(',').filter(Boolean) || [],
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    }

    // Filter out undefined values before validation
    const filteredParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== undefined)
    )

    const validatedParams = recommendationSchema.parse(filteredParams)

    // Mock user preferences (in a real app, this would come from user authentication)
    const mockUserPreferences = {
      favoriteGenres: validatedParams.genres || [],
      favoritePlatforms: ['PS5'], // Hardcoded for PS5 focus
      preferredRating: validatedParams.minMetacritic,
      metacriticBand: validatedParams.metacriticBand || 'any',
      maxPlaytime: validatedParams.maxPlaytime || 100,
      excludedTags: validatedParams.excludedTags || []
    }

    // Fetch games from RAWG API
    const gamesResponse = await rawgAPI.getGames({
      genres: validatedParams.genres,
      minMetacritic: validatedParams.minMetacritic,
      excludedTags: validatedParams.excludedTags,
      limit: Math.min(validatedParams.limit || 20, 50) // RAWG API limit
    })

    console.log('RAWG games response:', {
      count: gamesResponse.count,
      resultsCount: gamesResponse.results?.length || 0,
      firstGame: gamesResponse.results?.[0]?.name || 'No games'
    })

    const recommendations = await recommendationEngine.generateRecommendations(
      gamesResponse.results || [],
      mockUserPreferences,
      validatedParams.limit || 20
    )

    console.log('Recommendation engine output:', {
      inputGames: gamesResponse.results?.length || 0,
      outputRecommendations: recommendations.length,
      userPreferences: mockUserPreferences
    })

    return NextResponse.json({
      success: true,
      data: {
        games: recommendations,
        total: recommendations.length,
        filters: validatedParams
      }
    })

  } catch (error) {
    console.error('Games API Error:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
