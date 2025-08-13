// Database Manager - Handles PostgreSQL operations and caching

import crypto from 'crypto'

export class DatabaseManager {
  constructor(sql, redis) {
    this.sql = sql
    this.redis = redis
    this.initDatabase()
  }

  async initDatabase() {
    try {
      // Create tables if they don't exist
      await this.sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255),
          is_pro BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          stripe_customer_id VARCHAR(255),
          subscription_status VARCHAR(50),
          INDEX idx_user_id (user_id),
          INDEX idx_email (email)
        )
      `

      await this.sql`
        CREATE TABLE IF NOT EXISTS usage_history (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          text_preview TEXT,
          tone VARCHAR(20),
          reply_preview TEXT,
          request_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          INDEX idx_user_usage (user_id, created_at),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `

      await this.sql`
        CREATE TABLE IF NOT EXISTS analytics (
          id SERIAL PRIMARY KEY,
          event_name VARCHAR(100),
          user_hash VARCHAR(64),
          properties JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_event (event_name, created_at),
          INDEX idx_user_hash (user_hash)
        )
      `

      await this.sql`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          limit_type VARCHAR(50),
          count INTEGER DEFAULT 0,
          reset_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_rate_limit (user_id, limit_type),
          UNIQUE KEY unique_user_limit (user_id, limit_type)
        )
      `

      console.log('Database tables initialized successfully')
    } catch (error) {
      console.error('Error initializing database:', error)
      throw error
    }
  }

  async checkUsageLimit(userId) {
    try {
      if (!userId) {
        return { canGenerate: true, usageCount: 0, limit: 10 }
      }

      // Check if user exists and is pro
      const [user] = await this.sql`
        SELECT user_id, is_pro 
        FROM users 
        WHERE user_id = ${userId}
      `

      // Create user if doesn't exist
      if (!user) {
        await this.createUser(userId)
      }

      // Pro users have unlimited access
      if (user?.is_pro) {
        return { canGenerate: true, usageCount: 0, limit: -1, isPro: true }
      }

      // Check usage count for free users
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usage] = await this.sql`
        SELECT COUNT(*) as count
        FROM usage_history
        WHERE user_id = ${userId}
        AND created_at >= ${today}
      `

      const usageCount = parseInt(usage?.count || 0)
      const limit = 10 // Free tier limit

      return {
        canGenerate: usageCount < limit,
        usageCount,
        limit,
        remaining: Math.max(0, limit - usageCount)
      }
    } catch (error) {
      console.error('Error checking usage limit:', error)
      // On error, allow generation to not block users
      return { canGenerate: true, usageCount: 0, limit: 10 }
    }
  }

  async recordUsage({ userId, text, tone, reply, requestId, ipAddress }) {
    try {
      // Ensure user exists
      if (userId) {
        await this.ensureUserExists(userId)
      }

      // Record usage
      await this.sql`
        INSERT INTO usage_history (
          user_id, 
          text_preview, 
          tone, 
          reply_preview, 
          request_id,
          ip_address
        )
        VALUES (
          ${userId || 'anonymous'},
          ${text},
          ${tone},
          ${reply},
          ${requestId},
          ${ipAddress || null}
        )
      `

      // Get updated count
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usage] = await this.sql`
        SELECT COUNT(*) as count
        FROM usage_history
        WHERE user_id = ${userId || 'anonymous'}
        AND created_at >= ${today}
      `

      const newCount = parseInt(usage?.count || 0)

      // Update cache
      if (userId && this.redis) {
        const cacheKey = `usage:${userId}:${today.toISOString().split('T')[0]}`
        await this.redis.setex(cacheKey, 86400, newCount.toString())
      }

      return newCount
    } catch (error) {
      console.error('Error recording usage:', error)
      return 0
    }
  }

  async createUser(userId) {
    try {
      await this.sql`
        INSERT INTO users (user_id)
        VALUES (${userId})
        ON CONFLICT (user_id) DO NOTHING
      `
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  async ensureUserExists(userId) {
    try {
      const [existing] = await this.sql`
        SELECT user_id FROM users WHERE user_id = ${userId}
      `

      if (!existing) {
        await this.createUser(userId)
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error)
    }
  }

  async updateProStatus(userId, isPro) {
    try {
      await this.sql`
        UPDATE users
        SET 
          is_pro = ${isPro},
          subscription_status = ${isPro ? 'active' : 'cancelled'},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `

      // Clear usage cache for this user
      if (this.redis) {
        const pattern = `usage:${userId}:*`
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      }

      return true
    } catch (error) {
      console.error('Error updating pro status:', error)
      return false
    }
  }

  async getUserInfo(userId) {
    try {
      const [user] = await this.sql`
        SELECT 
          user_id,
          email,
          is_pro,
          created_at,
          subscription_status
        FROM users
        WHERE user_id = ${userId}
      `

      if (!user) {
        return {
          userId,
          exists: false,
          isPro: false,
          usageToday: 0
        }
      }

      // Get today's usage
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usage] = await this.sql`
        SELECT COUNT(*) as count
        FROM usage_history
        WHERE user_id = ${userId}
        AND created_at >= ${today}
      `

      // Get total usage
      const [totalUsage] = await this.sql`
        SELECT COUNT(*) as count
        FROM usage_history
        WHERE user_id = ${userId}
      `

      return {
        userId: user.user_id,
        email: user.email,
        isPro: user.is_pro,
        subscriptionStatus: user.subscription_status,
        createdAt: user.created_at,
        usageToday: parseInt(usage?.count || 0),
        totalUsage: parseInt(totalUsage?.count || 0),
        exists: true
      }
    } catch (error) {
      console.error('Error getting user info:', error)
      throw error
    }
  }

  async recordAnalytics({ event, userId, properties, timestamp }) {
    try {
      await this.sql`
        INSERT INTO analytics (
          event_name,
          user_hash,
          properties,
          created_at
        )
        VALUES (
          ${event},
          ${userId},
          ${JSON.stringify(properties)},
          ${timestamp}
        )
      `
    } catch (error) {
      console.error('Error recording analytics:', error)
    }
  }

  async checkProStatus(userId) {
    try {
      // Check cache first
      if (this.redis) {
        const cacheKey = `pro:${userId}`
        const cached = await this.redis.get(cacheKey)
        
        if (cached !== null) {
          return cached === 'true'
        }
      }

      // Check database
      const [user] = await this.sql`
        SELECT is_pro
        FROM users
        WHERE user_id = ${userId}
      `

      const isPro = user?.is_pro || false

      // Cache result for 5 minutes
      if (this.redis) {
        const cacheKey = `pro:${userId}`
        await this.redis.setex(cacheKey, 300, isPro.toString())
      }

      return isPro
    } catch (error) {
      console.error('Error checking pro status:', error)
      return false
    }
  }

  async cleanupOldData() {
    try {
      // Delete usage history older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      await this.sql`
        DELETE FROM usage_history
        WHERE created_at < ${thirtyDaysAgo}
      `

      // Delete analytics older than 90 days
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      await this.sql`
        DELETE FROM analytics
        WHERE created_at < ${ninetyDaysAgo}
      `

      console.log('Old data cleaned up successfully')
    } catch (error) {
      console.error('Error cleaning up old data:', error)
    }
  }

  async getUsageStats(startDate, endDate) {
    try {
      const stats = await this.sql`
        SELECT 
          DATE(created_at) as date,
          tone,
          COUNT(*) as count
        FROM usage_history
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY DATE(created_at), tone
        ORDER BY date DESC
      `

      return stats
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return []
    }
  }
}
