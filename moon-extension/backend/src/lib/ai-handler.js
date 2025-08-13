// AI Handler - Manages OpenAI and Anthropic API calls

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

export class AIHandler {
  constructor(config) {
    this.openai = new OpenAI({
      apiKey: config.openaiKey
    })
    
    this.anthropic = new Anthropic({
      apiKey: config.anthropicKey
    })
    
    this.redis = config.redis
    this.cacheEnabled = config.cacheEnabled !== false
    this.cacheTTL = config.cacheTTL || 3600 // 1 hour default
    
    // Model configuration
    this.models = {
      openai: 'gpt-4-turbo-preview',
      anthropic: 'claude-3-opus-20240229'
    }
    
    // Tone prompts
    this.tonePrompts = {
      optimistic: {
        system: "You are a helpful assistant that generates optimistic, positive, and encouraging replies. Always look for the bright side and provide uplifting responses while remaining relevant to the context.",
        examples: [
          { input: "This project is taking forever", output: "Every great achievement takes time! You're making progress with each step, and the result will be worth the effort. Keep going!" },
          { input: "I failed my exam", output: "This is just a learning opportunity! Now you know exactly what to focus on, and you'll come back stronger. You've got this!" }
        ]
      },
      sarcastic: {
        system: "You are a witty assistant that generates sarcastic, clever replies with a humorous edge. Use irony and wit while keeping responses appropriate and not mean-spirited.",
        examples: [
          { input: "I forgot my password again", output: "Oh wow, what a unique and unprecedented situation. Surely no one has ever experienced this technological marvel before." },
          { input: "Traffic is terrible today", output: "Really? Traffic being bad? I'm shocked. Absolutely stunned. Who could have predicted cars moving slowly during rush hour?" }
        ]
      },
      direct: {
        system: "You are a professional assistant that generates clear, concise, and straightforward replies. Get to the point without unnecessary elaboration. Be professional and factual.",
        examples: [
          { input: "Should we postpone the meeting?", output: "Yes, postpone it. Send a calendar update with the new time to all participants." },
          { input: "The report has errors", output: "Review sections 3 and 5 for data inconsistencies. Correct the calculations and resubmit by EOD." }
        ]
      },
      sassy: {
        system: "You are a confident assistant that generates sassy, bold replies with attitude and flair. Be playful and confident while maintaining respect.",
        examples: [
          { input: "You're always late", output: "And you're always early to point it out, hun. Some of us like to make an entrance. 💅" },
          { input: "That's not how it's done", output: "Well excuse me for adding a little sparkle to the mundane. Innovation isn't for everyone, I guess." }
        ]
      }
    }
  }

  async generateReply({ text, tone, userId, requestId }) {
    try {
      // If no real API key, return mock immediately
      if (!this.openai.apiKey || this.openai.apiKey === 'mock-key') {
        console.log('Using mock reply - no API key configured')
        return this.getMockReply(tone, text)
      }

      // Check cache first
      const cacheKey = this.getCacheKey(text, tone)
      
      if (this.cacheEnabled && this.redis) {
        try {
          const cached = await this.redis.get(cacheKey)
          if (cached) {
            console.log(`Cache hit for request ${requestId}`)
            return cached
          }
        } catch (error) {
          console.log('Cache check failed:', error.message)
        }
      }

      // Prepare the prompt
      const toneConfig = this.tonePrompts[tone]
      
      if (!toneConfig) {
        throw new Error(`Invalid tone: ${tone}`)
      }

      // Build the prompt with examples
      const messages = [
        {
          role: 'system',
          content: toneConfig.system
        }
      ]

      // Add examples for better tone consistency
      for (const example of toneConfig.examples) {
        messages.push(
          { role: 'user', content: example.input },
          { role: 'assistant', content: example.output }
        )
      }

      // Add the actual request
      messages.push({
        role: 'user',
        content: `Generate a ${tone} reply to the following text. Keep it concise (under 150 words) and natural:\n\n"${text}"`
      })

      // Try primary model (OpenAI)
      let reply = await this.callOpenAI(messages, requestId)
      
      // Fallback to Anthropic if OpenAI fails
      if (!reply && this.anthropic.apiKey) {
        console.log(`Falling back to Anthropic for request ${requestId}`)
        reply = await this.callAnthropic(messages, requestId)
      }

      // If both fail, use a fallback response
      if (!reply) {
        reply = this.getFallbackReply(tone)
      }

      // Cache the result
      if (this.cacheEnabled && this.redis && reply) {
        try {
          await this.redis.setex(cacheKey, this.cacheTTL, reply)
        } catch (error) {
          console.log('Cache write failed:', error.message)
        }
      }

      return reply

    } catch (error) {
      console.error('Error in generateReply:', error)
      // Return mock reply on error
      return this.getMockReply(tone, text)
    }
  }

  getMockReply(tone, text) {
    const mockReplies = {
      optimistic: [
        "That's absolutely wonderful! I'm excited to see where this journey takes us! ✨",
        "What an amazing perspective! The possibilities are endless! 🌟",
        "I love your enthusiasm! Together we can make incredible things happen! 🚀"
      ],
      sarcastic: [
        "Oh brilliant, absolutely groundbreaking stuff here. Never seen anything like it. 🙄",
        "Wow, revolutionary. I'm sure the Nobel committee is already preparing your award. 😏",
        "Fascinating. Truly. I'm on the edge of my seat with excitement. 😐"
      ],
      direct: [
        "Acknowledged. Proceeding with the implementation.",
        "Understood. I'll handle this accordingly.",
        "Clear. Moving forward with the next steps."
      ],
      sassy: [
        "Honey, we need to talk about your choices here... but okay, let's work with it. 💅",
        "Well well well, look who's coming in hot with the suggestions! Love the energy though. ✨",
        "Cute idea, but let me show you how we REALLY do things around here. 💁‍♀️"
      ]
    }
    
    const replies = mockReplies[tone] || ["Thank you for your message."]
    return replies[Math.floor(Math.random() * replies.length)]
  }

  async callOpenAI(messages, requestId) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.models.openai,
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
        user: requestId
      })

      return completion.choices[0]?.message?.content?.trim()
    } catch (error) {
      console.error('OpenAI API error:', error.message)
      return null
    }
  }

  async callAnthropic(messages, requestId) {
    try {
      // Convert messages to Anthropic format
      const systemPrompt = messages.find(m => m.role === 'system')?.content || ''
      const userMessages = messages.filter(m => m.role !== 'system')
      
      // Build conversation for Anthropic
      let prompt = systemPrompt + '\n\n'
      
      for (const msg of userMessages) {
        if (msg.role === 'user') {
          prompt += `Human: ${msg.content}\n\n`
        } else if (msg.role === 'assistant') {
          prompt += `Assistant: ${msg.content}\n\n`
        }
      }
      
      prompt += 'Assistant:'

      const response = await this.anthropic.completions.create({
        model: this.models.anthropic,
        prompt: prompt,
        max_tokens_to_sample: 200,
        temperature: 0.7,
        metadata: { request_id: requestId }
      })

      return response.completion?.trim()
    } catch (error) {
      console.error('Anthropic API error:', error.message)
      return null
    }
  }

  getCacheKey(text, tone) {
    // Create a hash of the text for the cache key
    const textHash = crypto
      .createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16)
    
    return `reply:${tone}:${textHash}`
  }

  getFallbackReply(tone) {
    const fallbacks = {
      optimistic: "That's an interesting perspective! There's always a positive way to look at things.",
      sarcastic: "Well, that's certainly one way to look at it.",
      direct: "Understood. Let's proceed accordingly.",
      sassy: "Okay, but make it fashion. 💅"
    }
    
    return fallbacks[tone] || "I understand what you're saying."
  }

  // Validate and sanitize input text
  sanitizeInput(text) {
    // Remove any potential injection attempts
    return text
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim()
      .substring(0, 5000) // Limit length
  }

  // Token counting for cost management
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  // Check if request is within token limits
  isWithinTokenLimit(text, maxTokens = 1000) {
    return this.estimateTokens(text) <= maxTokens
  }
}
