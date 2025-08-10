'use client'

import { useState, useEffect } from 'react'
import type { Game, Genre } from '@/lib/types'

interface SearchParams {
  genres?: string[]
  minMetacritic?: number
  metacriticBand?: 'any' | '0-30' | '31-60' | '61-80' | '81-100'
  maxPlaytime?: number
  excludedTags?: string[]
  limit?: number
}

function GameCard({ game }: { game: Game }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-gray-200">
        {game.background_image && (
          <img
            src={game.background_image}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {game.metacritic ? (
          <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded text-sm font-bold ${
            game.metacritic >= 80 ? 'bg-green-600' :
            game.metacritic >= 70 ? 'bg-yellow-600' :
            game.metacritic >= 60 ? 'bg-orange-600' : 'bg-red-600'
          }`}>
            {game.metacritic}
          </div>
        ) : (
          <div className="absolute top-2 right-2 bg-gray-600 text-white px-2 py-1 rounded text-sm">
            N/A
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm">
          {game.ratings_count}+ ratings
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{game.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {game.description}
        </p>
        <div className="flex flex-wrap gap-1 mb-3">
          {game.genres.slice(0, 3).map((genre) => (
            <span
              key={genre.id}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
            >
              {genre.name}
            </span>
          ))}
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Released: {new Date(game.released).getFullYear()}</span>
          <span>{game.playtime}h avg</span>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
            PS5
          </span>
          {game.metacritic && (
            <span className="inline-block bg-gray-100 px-2 py-1 rounded">
              Metacritic: {game.metacritic}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function RecommendationForm({ onSearch }: { onSearch: (params: SearchParams) => void }) {
  const [formData, setFormData] = useState({
    genres: '',
    minMetacritic: '0',
    metacriticBand: 'any' as 'any' | '0-30' | '31-60' | '61-80' | '81-100',
    maxPlaytime: '100',
    excludedTags: '',
    limit: '20'
  })
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([])
  const [isLoadingGenres, setIsLoadingGenres] = useState(false)

  useEffect(() => {
    const fetchGenres = async () => {
      setIsLoadingGenres(true)
      try {
        const response = await fetch('/api/genres')
        const data = await response.json()
        console.log('Genres API response:', data) // Debug log
        if (data.success) {
          // Ensure data.data is an array
          const genres = Array.isArray(data.data) ? data.data : []
          console.log('Setting genres:', genres) // Debug log
          setAvailableGenres(genres)
        } else if (data.code === 'MISSING_API_KEY') {
          console.warn('API key not configured:', data.error)
          // Don't show error to user, just use empty genres list
        } else {
          console.error('Failed to fetch genres:', data.error)
        }
      } catch (error) {
        console.error('Failed to fetch genres:', error)
      } finally {
        setIsLoadingGenres(false)
      }
    }

    fetchGenres()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params: SearchParams = {
      genres: formData.genres ? formData.genres.split(',').map(g => g.trim()) : undefined,
      minMetacritic: formData.minMetacritic !== '0' ? parseInt(formData.minMetacritic) : undefined,
      metacriticBand: formData.metacriticBand !== 'any' ? formData.metacriticBand : undefined,
      maxPlaytime: parseInt(formData.maxPlaytime),
      excludedTags: formData.excludedTags ? formData.excludedTags.split(',').map(t => t.trim()) : undefined,
      limit: parseInt(formData.limit)
    }
    
    // Only include metacriticBand if it's not 'any'
    if (params.metacriticBand === 'any') {
      delete params.metacriticBand
    }
    
    onSearch(params)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Genres */}
        <div>
          <label htmlFor="genres" className="block text-sm font-medium text-gray-700 mb-1">
            Genres
          </label>
                  {isLoadingGenres ? (
          <div className="text-sm text-gray-500">Loading genres...</div>
        ) : (
          <select
            id="genres"
            value={formData.genres}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genres</option>
            {Array.isArray(availableGenres) && availableGenres.length > 0 ? (
              availableGenres.map((genre) => (
                <option key={genre.id} value={genre.slug}>
                  {genre.name}
                </option>
              ))
            ) : (
              <option value="" disabled>No genres available</option>
            )}
          </select>
        )}
        </div>

        {/* Minimum Metacritic Score */}
        <div>
          <label htmlFor="minMetacritic" className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Metacritic Score
          </label>
          <select
            id="minMetacritic"
            value={formData.minMetacritic}
            onChange={(e) => setFormData({ ...formData, minMetacritic: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="0">Any Score</option>
            <option value="10">10+</option>
            <option value="20">20+</option>
            <option value="30">30+</option>
            <option value="40">40+</option>
            <option value="50">50+</option>
            <option value="60">60+</option>
            <option value="70">70+</option>
            <option value="80">80+</option>
            <option value="90">90+</option>
          </select>
        </div>

        {/* Metacritic Rating Band */}
        <div>
          <label htmlFor="metacriticBand" className="block text-sm font-medium text-gray-700 mb-1">
            Metacritic Rating Band
          </label>
          <select
            id="metacriticBand"
            value={formData.metacriticBand}
            onChange={(e) => setFormData({ ...formData, metacriticBand: e.target.value as 'any' | '0-30' | '31-60' | '61-80' | '81-100' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="any">Any</option>
            <option value="0-30">0 - 30</option>
            <option value="31-60">31 - 60</option>
            <option value="61-80">61 - 80</option>
            <option value="81-100">81 - 100</option>
          </select>
        </div>

        {/* Max Playtime */}
        <div>
          <label htmlFor="maxPlaytime" className="block text-sm font-medium text-gray-700 mb-1">
            Max Playtime (hours)
          </label>
          <input
            type="number"
            id="maxPlaytime"
            value={formData.maxPlaytime}
            onChange={(e) => setFormData({ ...formData, maxPlaytime: e.target.value })}
            min="1"
            max="500"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Excluded Tags */}
        <div>
          <label htmlFor="excludedTags" className="block text-sm font-medium text-gray-700 mb-1">
            Excluded Tags
          </label>
          <input
            type="text"
            id="excludedTags"
            value={formData.excludedTags}
            onChange={(e) => setFormData({ ...formData, excludedTags: e.target.value })}
            placeholder="Comma-separated tags"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Number of Results */}
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Results
          </label>
          <input
            type="number"
            id="limit"
            value={formData.limit}
            onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
            min="1"
            max="50"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Get Recommendations
      </button>
    </form>
  )
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchGames = async (params: SearchParams) => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      if (Array.isArray(params.genres)) queryParams.set('genres', params.genres.join(','))
      if (typeof params.minMetacritic === 'number') queryParams.set('minMetacritic', params.minMetacritic.toString())
      if (params.metacriticBand && params.metacriticBand !== 'any') queryParams.set('metacriticBand', params.metacriticBand)
      if (typeof params.maxPlaytime === 'number') queryParams.set('maxPlaytime', params.maxPlaytime.toString())
      if (typeof params.limit === 'number') queryParams.set('limit', params.limit.toString())

      const response = await fetch(`/api/games?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch games')
      }

      setGames(data.data.games)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Load initial recommendations on page load
  useEffect(() => {
    searchGames({ limit: 20 })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PS5 Game Recommender
          </h1>
          <p className="text-xl text-gray-600">
            Discover your next favorite PS5 game with AI-powered recommendations
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Only games with 10+ ratings and Metacritic scores included
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <RecommendationForm onSearch={searchGames} />
          
          {loading && (
            <div className="mt-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Finding the perfect games for you...</p>
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {games.length > 0 && !loading && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">
                Recommended Games ({games.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
