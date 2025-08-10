import type { Game, UserPreferences } from './types'

export class RecommendationEngine {
  private calculateGenreSimilarity(game1: Game, game2: Game): number {
    const genres1 = new Set(game1.genres.map(g => g.slug))
    const genres2 = new Set(game2.genres.map(g => g.slug))
    
    const intersection = new Set([...genres1].filter(x => genres2.has(x)))
    const union = new Set([...genres1, ...genres2])
    
    return intersection.size / union.size
  }

  private calculatePlatformSimilarity(game1: Game, game2: Game): number {
    const platforms1 = new Set(game1.platforms.map(p => p.slug))
    const platforms2 = new Set(game2.platforms.map(p => p.slug))
    
    const intersection = new Set([...platforms1].filter(x => platforms2.has(x)))
    const union = new Set([...platforms1, ...platforms2])
    
    return intersection.size / union.size
  }

  private calculateRatingSimilarity(game1: Game, game2: Game): number {
    const ratingDiff = Math.abs(game1.rating - game2.rating)
    return Math.max(0, 1 - ratingDiff / 5) // Normalize to 0-1 range
  }

  private calculateOverallSimilarity(game1: Game, game2: Game): number {
    const genreWeight = 0.4
    const platformWeight = 0.3
    const ratingWeight = 0.3

    const genreSim = this.calculateGenreSimilarity(game1, game2)
    const platformSim = this.calculatePlatformSimilarity(game1, game2)
    const ratingSim = this.calculateRatingSimilarity(game1, game2)

    return genreSim * genreWeight + platformSim * platformWeight + ratingSim * ratingWeight
  }

  private filterGamesByPreferences(games: Game[], preferences: UserPreferences): Game[] {
    return games.filter(game => {
      // Filter by minimum ratings count (10+ ratings required)
      if (game.ratings_count < 10) return false

      // Filter by preferred genres
      if (preferences.favoriteGenres.length > 0) {
        const gameGenres = game.genres.map(g => g.slug)
        const hasPreferredGenre = preferences.favoriteGenres.some(genre => 
          gameGenres.includes(genre)
        )
        if (!hasPreferredGenre) return false
      }

      // Filter by preferred platforms (PS5 only now)
      // if (preferences.favoritePlatforms.length > 0) {
      //   const gamePlatforms = game.platforms.map(p => p.slug)
      //   const hasPreferredPlatform = preferences.favoritePlatforms.some(platform => 
      //     gamePlatforms.includes(platform)
      //   )
      //   if (!hasPreferredPlatform) return false
      // }

      // Filter by minimum Metacritic score
      if (preferences.preferredRating && game.metacritic && game.metacritic < preferences.preferredRating) return false

      // Filter by Metacritic rating band
      if (preferences.metacriticBand && preferences.metacriticBand !== 'any' && game.metacritic) {
        const score = game.metacritic
        switch (preferences.metacriticBand) {
          case '0-30':
            if (score > 30) return false
            break
          case '31-60':
            if (score < 31 || score > 60) return false
            break
          case '61-80':
            if (score < 61 || score > 80) return false
            break
          case '81-100':
            if (score < 81) return false
            break
        }
      }

      // Filter by max playtime
      if (game.playtime > preferences.maxPlaytime) return false

      // Filter out excluded tags
      if (preferences.excludedTags.length > 0) {
        const gameTags = game.tags.map(t => t.slug)
        const hasExcludedTag = preferences.excludedTags.some(tag => 
          gameTags.includes(tag)
        )
        if (hasExcludedTag) return false
      }

      return true
    })
  }

  private calculateRecommendationScore(game: Game, userPreferences: UserPreferences): number {
    let score = game.rating / 5 // Base score from rating

    // Boost score for preferred genres
    const gameGenres = game.genres.map(g => g.slug)
    const genreMatches = userPreferences.favoriteGenres.filter(genre => 
      gameGenres.includes(genre)
    ).length
    score += genreMatches * 0.2

    // Boost score for preferred platforms (PS5 only now)
    // const gamePlatforms = game.platforms.map(p => p.slug)
    // const platformMatches = userPreferences.favoritePlatforms.filter(platform => 
    //   gamePlatforms.includes(platform)
    // ).length
    // score += platformMatches * 0.15

    // Boost for high Metacritic scores
    if (game.metacritic && game.metacritic >= 80) {
      score += 0.4
    } else if (game.metacritic && game.metacritic >= 70) {
      score += 0.2
    } else if (game.metacritic && game.metacritic >= 60) {
      score += 0.1
    }

    // Boost for games with more ratings (more reliable scores)
    if (game.ratings_count >= 100) {
      score += 0.15
    } else if (game.ratings_count >= 50) {
      score += 0.1
    } else if (game.ratings_count >= 20) {
      score += 0.05
    }

    // Penalty for very long games if user prefers shorter ones
    if (game.playtime > userPreferences.maxPlaytime * 0.8) {
      score -= 0.1
    }

    return Math.min(score, 1.0) // Cap at 1.0
  }

  async generateRecommendations(
    allGames: Game[],
    userPreferences: UserPreferences,
    limit = 10
  ): Promise<Game[]> {
    // Filter games based on user preferences
    const filteredGames = this.filterGamesByPreferences(allGames, userPreferences)

    // Calculate recommendation scores
    const scoredGames = filteredGames.map(game => ({
      game,
      score: this.calculateRecommendationScore(game, userPreferences)
    }))

    // Sort by score and return top recommendations
    return scoredGames
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.game)
  }

  async findSimilarGames(targetGame: Game, allGames: Game[], limit = 5): Promise<Game[]> {
    const similarGames = allGames
      .filter(game => game.id !== targetGame.id)
      .map(game => ({
        game,
        similarity: this.calculateOverallSimilarity(targetGame, game)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.game)

    return similarGames
  }
}

export const recommendationEngine = new RecommendationEngine()
