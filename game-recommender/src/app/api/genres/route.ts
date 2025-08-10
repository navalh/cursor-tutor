import { NextResponse } from 'next/server'
import { rawgAPI } from '@/lib/api'

export async function GET() {
  try {
    const genresResponse = await rawgAPI.getGenres()

    return NextResponse.json({
      success: true,
      data: genresResponse
    })

  } catch (error) {
    console.error('Genres API Error:', error)
    
    if (error instanceof Error) {
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
