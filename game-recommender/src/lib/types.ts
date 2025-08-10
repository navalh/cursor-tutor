export interface Platform {
  id: number
  name: string
  slug: string
}

export interface Genre {
  id: number
  name: string
  slug: string
}

export interface Tag {
  id: number
  name: string
  slug: string
}

export type MetacriticRatingBand = 'any' | '0-30' | '31-60' | '61-80' | '81-100'

export interface Review {
  id: number
  text: string
  rating: number
  author: string
  source: string
  created_at: string
}

export interface Game {
  id: number
  name: string
  slug: string
  description: string
  metacritic?: number // RAWG API returns 'metacritic' not 'metacritic_score'
  rating: number
  rating_top: number
  ratings_count: number // Should be >= 10 for recommendations
  released: string
  platforms: Platform[]
  genres: Genre[]
  tags: Tag[]
  background_image: string
  screenshots: string[]
  reviews: Review[]
  esrb_rating?: string
  playtime: number
  website?: string
  developers: string[]
  publishers: string[]
}

export interface RAWGResponse<T> {
  count: number
  next?: string
  previous?: string
  results: T[]
}

export interface UserPreferences {
  favoriteGenres: string[]
  favoritePlatforms: string[] // Will be set to ['PS5'] for this implementation
  preferredRating?: number
  metacriticBand?: MetacriticRatingBand
  maxPlaytime: number
  excludedTags: string[]
}

export interface RecommendationRequest {
  genres?: string[]
  minMetacritic?: number
  metacriticBand?: MetacriticRatingBand
  maxPlaytime?: number
  excludedTags?: string[]
  limit?: number
}
