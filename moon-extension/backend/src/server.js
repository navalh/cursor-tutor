// Moon Backend Server - Secure API Proxy

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import { rateLimit } from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import winston from 'winston'
import { Redis } from 'ioredis'
import postgres from 'postgres'
import crypto from 'crypto'

// Import handlers
import { AIHandler } from './lib/ai-handler.js'
import { DatabaseManager } from './lib/database.js'
import { AuthMiddleware } from './middleware/auth.js'
import { SecurityMiddleware } from './middleware/security.js'

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 3001

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'moon-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

// Initialize Redis for caching and rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
})

// Initialize PostgreSQL
const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'moon_db',
  username: process.env.DB_USER || 'moon_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10
})

// Initialize handlers
const aiHandler = new AIHandler({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  redis: redis
})

const dbManager = new DatabaseManager(sql, redis)

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'chrome-extension://*',
      'http://localhost:3000',
      'https://moonreply.com'
    ]
    
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true)
    
    // Check if origin matches Chrome extension pattern
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true)
    }
    
    // Check against allowed origins
    if (allowedOrigins.some(allowed => origin.match(allowed))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Extension-Version', 'X-User-Id']
}

app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Request ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
})

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  })
})

app.use('/api', globalLimiter)

// Strict rate limiter for reply generation
const replyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 replies per minute
  message: 'Rate limit exceeded. Please wait before generating more replies.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => {
    // Skip rate limiting for pro users
    const userId = req.headers['x-user-id']
    if (userId) {
      const isPro = await dbManager.checkProStatus(userId)
      return isPro
    }
    return false
  },
  store: new RedisStore({
    client: redis,
    prefix: 'rl:reply:'
  })
})

// Input validation schemas
const generateReplyValidation = [
  body('text')
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Text must be between 1 and 5000 characters'),
  body('tone')
    .isIn(['optimistic', 'sarcastic', 'direct', 'sassy'])
    .withMessage('Invalid tone selected'),
  body('userId')
    .optional()
    .isString()
    .matches(/^user_[a-z0-9]{9}$/)
    .withMessage('Invalid user ID format')
]

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  })
})

// Main reply generation endpoint
app.post('/api/generate-reply', 
  replyLimiter,
  generateReplyValidation,
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid input',
          details: errors.array()
        })
      }

      const { text, tone, userId } = req.body
      const requestId = req.id

      // Log request
      logger.info('Generate reply request', {
        requestId,
        userId,
        tone,
        textLength: text.length
      })

      // Check user's usage limit
      const usageCheck = await dbManager.checkUsageLimit(userId)
      
      if (!usageCheck.canGenerate) {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          usageCount: usageCheck.usageCount,
          limit: usageCheck.limit,
          upgradeUrl: 'https://moonreply.com/upgrade'
        })
      }

      // Generate reply using AI
      const reply = await aiHandler.generateReply({
        text,
        tone,
        userId,
        requestId
      })

      // Record usage
      const newUsageCount = await dbManager.recordUsage({
        userId,
        text: text.substring(0, 500), // Store first 500 chars
        tone,
        reply: reply.substring(0, 500),
        requestId
      })

      // Return response
      res.json({
        reply,
        tone,
        usageCount: newUsageCount,
        remaining: Math.max(0, 10 - newUsageCount),
        requestId
      })

    } catch (error) {
      logger.error('Error generating reply', {
        error: error.message,
        stack: error.stack,
        requestId: req.id
      })

      res.status(500).json({
        error: 'Failed to generate reply',
        requestId: req.id
      })
    }
  }
)

// Analytics endpoint
app.post('/api/analytics', async (req, res) => {
  try {
    const { event, userId, properties } = req.body
    
    // Store analytics event (privacy-friendly)
    await dbManager.recordAnalytics({
      event,
      userId: crypto.createHash('sha256').update(userId).digest('hex'),
      properties,
      timestamp: new Date()
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Analytics error', { error: error.message })
    res.status(200).json({ success: true }) // Always return success for analytics
  }
})

// User info endpoint
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    // Validate userId format
    if (!userId.match(/^user_[a-z0-9]{9}$/)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    const userInfo = await dbManager.getUserInfo(userId)
    
    res.json(userInfo)
  } catch (error) {
    logger.error('Error fetching user info', { error: error.message })
    res.status(500).json({ error: 'Failed to fetch user information' })
  }
})

// Stripe webhook for handling subscriptions
app.post('/api/webhook/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      // Handle subscription events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await dbManager.updateProStatus(
            event.data.object.metadata.userId,
            true
          )
          break
          
        case 'customer.subscription.deleted':
          await dbManager.updateProStatus(
            event.data.object.metadata.userId,
            false
          )
          break
      }

      res.json({ received: true })
    } catch (error) {
      logger.error('Stripe webhook error', { error: error.message })
      res.status(400).send(`Webhook Error: ${error.message}`)
    }
  }
)

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id
  })

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message

  res.status(err.status || 500).json({
    error: message,
    requestId: req.id
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  
  server.close(() => {
    logger.info('HTTP server closed')
  })
  
  await redis.quit()
  await sql.end()
  
  process.exit(0)
})

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Moon Backend Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// RedisStore implementation for rate limiting
class RedisStore {
  constructor(options) {
    this.client = options.client
    this.prefix = options.prefix || 'rl:'
  }

  async increment(key) {
    const prefixedKey = this.prefix + key
    const multi = this.client.multi()
    
    multi.incr(prefixedKey)
    multi.expire(prefixedKey, 60) // 1 minute expiry
    
    const results = await multi.exec()
    return {
      totalHits: results[0][1],
      resetTime: new Date(Date.now() + 60000)
    }
  }

  async decrement(key) {
    const prefixedKey = this.prefix + key
    return await this.client.decr(prefixedKey)
  }

  async resetKey(key) {
    const prefixedKey = this.prefix + key
    return await this.client.del(prefixedKey)
  }
}

export default app
