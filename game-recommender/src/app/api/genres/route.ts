import { NextResponse } from 'next/server'
import { rawgAPI } from '@/lib/api'

export async function GET() {
  try {
    const genresResponse = await rawgAPI.getGenres()
    console.log('RAWG genres response:', genresResponse) // Debug log

    return NextResponse.json({
      success: true,
      data: genresResponse.results || []
    })

  } catch (error) {
    console.error('Genres API Error:', error)
    
    if (error instanceof Error) {
      // Check if it's an API key error
      if (error.message.includes('Invalid API key')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'API key not configured. Please set RAWG_API_KEY in .env.local',
            code: 'MISSING_API_KEY'
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred' 
      },
      { status: 500 }
    )
  }
}
