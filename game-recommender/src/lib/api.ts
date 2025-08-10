import axios from 'axios'
import type { Game, RAWGResponse, RecommendationRequest } from './types'

const RAWG_BASE_URL = 'https://api.rawg.io/api'
const RAWG_API_KEY = process.env.RAWG_API_KEY || ''

class RAWGAPI {
  private client = axios.create({
    baseURL: RAWG_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  private async request<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    try {
      const response = await this.client.get(endpoint, {
        params: {
          key: RAWG_API_KEY,
          ...params,
        },
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your configuration.')
        }
        throw new Error(`API request failed: ${error.message}`)
      }
      throw new Error('An unexpected error occurred')
    }
  }

  async getGames(params: RecommendationRequest = {}): Promise<RAWGResponse<Game>> {
    const queryParams: Record<string, string | number | boolean> = {
      page_size: params.limit || 20,
      ordering: '-metacritic', // Order by Metacritic score instead of rating
      platforms: '187', // PS5 platform ID from RAWG
      metacritic: '0,100', // Get all Metacritic scores
    }

    if (params.genres?.length) {
      queryParams.genres = params.genres.join(',')
    }

    // Remove platforms from params since we're forcing PS5
    // if (params.platforms?.length) {
    //   queryParams.platforms = params.platforms.join(',')
    // }

    if (params.minMetacritic) {
      queryParams.metacritic = `${params.minMetacritic},100` // Use Metacritic score directly
    }

    if (params.excludedTags?.length) {
      queryParams.tags = params.excludedTags.map(tag => `-${tag}`).join(',')
    }

    return this.request<RAWGResponse<Game>>('/games', queryParams)
  }

  async getGameDetails(slug: string): Promise<Game> {
    return this.request<Game>(`/games/${slug}`)
  }

  async getGenres(): Promise<RAWGResponse<{ id: number; name: string; slug: string }>> {
    return this.request<RAWGResponse<{ id: number; name: string; slug: string }>>('/genres')
  }

  async getPlatforms(): Promise<RAWGResponse<{ id: number; name: string; slug: string }>> {
    return this.request<RAWGResponse<{ id: number; name: string; slug: string }>>('/platforms')
  }

  async searchGames(query: string, limit = 10): Promise<RAWGResponse<Game>> {
    return this.request<RAWGResponse<Game>>('/games', {
      search: query,
      page_size: limit,
    })
  }
}

export const rawgAPI = new RAWGAPI()
