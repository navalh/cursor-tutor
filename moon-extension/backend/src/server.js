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
// Removed middleware imports - files don't exist yet

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

// Initialize dependencies (optional for development)
let redis = null
let sql = null  
let aiHandler = null
let dbManager = null

// Try to connect to Redis (optional)
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: () => null, // Don't retry in development
    lazyConnect: true
  })
  
  redis.on('error', (err) => {
    logger.warn('Redis connection error (continuing without Redis):', err.message)
    redis = null
  })
  
  redis.on('connect', () => {
    logger.info('Redis connected successfully')
  })
  
  // Try to connect
  redis.connect().catch(() => {
    logger.warn('Redis not available - using memory-based rate limiting')
    redis = null
  })
} catch (error) {
  logger.warn('Redis initialization failed - continuing without caching')
  redis = null
}

// Try to connect to PostgreSQL (optional)
try {
  if (process.env.DB_PASSWORD) {
    sql = postgres({
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
    dbManager = new DatabaseManager(sql, redis)
    logger.info('PostgreSQL connected')
  } else {
    logger.info('PostgreSQL not configured - using mock database')
  }
} catch (error) {
  logger.warn('PostgreSQL initialization failed - using mock database')
  sql = null
}

// Initialize AI handler (will use mock if no API key)
try {
  aiHandler = new AIHandler({
    openaiKey: process.env.OPENAI_API_KEY || 'mock-key',
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    redis: redis
  })
  
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('⚠️ No OpenAI API key found - using MOCK REPLIES for testing')
    logger.warn('To use real AI, add OPENAI_API_KEY to your .env file')
  } else {
    logger.info('✅ OpenAI API key found - using real AI replies')
  }
} catch (error) {
  logger.error('AI Handler initialization failed:', error)
}

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

// Global rate limiter (uses Redis if available, memory otherwise)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
  // Uses memory store by default if Redis not available
})

app.use('/api', globalLimiter)

// Reply generation rate limiter (memory-based)
const replyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 replies per minute
  message: 'Rate limit exceeded. Please wait before generating more replies.',
  standardHeaders: true,
  legacyHeaders: false
  // Skip pro user check for now since dbManager might be null
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

      // Check user's usage limit (if database available)
      if (dbManager) {
        const usageCheck = await dbManager.checkUsageLimit(userId)
        
        if (!usageCheck.canGenerate) {
          return res.status(429).json({
            error: 'Usage limit exceeded',
            usageCount: usageCheck.usageCount,
            limit: usageCheck.limit,
            upgradeUrl: 'https://moonreply.com/upgrade'
          })
        }
      }

      // Generate reply using AI or mock
      let reply
      if (aiHandler && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock-key') {
        try {
          reply = await aiHandler.generateReply({
            text,
            tone,
            userId,
            requestId
          })
        } catch (error) {
          logger.error('AI generation failed, using mock:', error.message)
          reply = getMockReply(tone, text)
        }
      } else {
        // Use mock replies for testing
        reply = getMockReply(tone, text)
        logger.info('Using mock reply (no API key configured)')
      }

      // Record usage (if database available)
      let newUsageCount = 1
      if (dbManager) {
        try {
          newUsageCount = await dbManager.recordUsage({
            userId,
            text: text.substring(0, 500), // Store first 500 chars
            tone,
            reply: reply.substring(0, 500),
            requestId
          })
        } catch (error) {
          logger.warn('Could not record usage:', error.message)
        }
      }

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

// Mock reply function for testing without AI
function getMockReply(tone, text) {
  const mockReplies = {
    optimistic: [
      "That's a wonderful perspective! I'm excited to see where this leads! 😊",
      "What an amazing opportunity! Let's make the most of it! ✨",
      "I love your positive energy! This is going to be great! 🌟",
      "Every challenge is a chance to grow! You've got this! 💪"
    ],
    sarcastic: [
      "Oh wow, what a truly groundbreaking observation. Never heard that one before. 😏",
      "Well, that's certainly... one way to look at it. How refreshing. 🙄",
      "Absolutely revolutionary thinking there. I'm sure nobody has ever thought of that. 😐",
      "Brilliant. Simply brilliant. My mind is completely blown. 🤯"
    ],
    direct: [
      "Understood. I'll handle this accordingly.",
      "Got it. Moving forward with the plan.",
      "Acknowledged. Will proceed as discussed.",
      "Clear. Let's execute on this immediately."
    ],
    sassy: [
      "Well aren't you just full of surprises today! 💅",
      "Oh honey, that's cute. But let me show you how it's really done. ✨",
      "Bless your heart, but I think we can do better than that. 💁‍♀️",
      "Okay, but make it fashion. We're not doing basic today. 👠"
    ]
  }
  
  const replies = mockReplies[tone] || ["Thanks for sharing that!"]
  return replies[Math.floor(Math.random() * replies.length)]
}

// Analytics endpoint
app.post('/api/analytics', async (req, res) => {
  try {
    const { event, userId, properties } = req.body
    
    // Store analytics event if database available
    if (dbManager) {
      await dbManager.recordAnalytics({
        event,
        userId: crypto.createHash('sha256').update(userId).digest('hex'),
        properties,
        timestamp: new Date()
      })
    } else {
      logger.info('Analytics event (not stored):', { event, userId })
    }

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

    if (dbManager) {
      const userInfo = await dbManager.getUserInfo(userId)
      res.json(userInfo)
    } else {
      // Return mock user info
      res.json({
        userId,
        isPro: false,
        usageToday: 1,
        totalUsage: 1,
        exists: true
      })
    }
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

// Note: RedisStore removed - using memory-based rate limiting for development

export default app
