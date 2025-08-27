// Moon Extension - Background Service Worker

// API Configuration
const API_CONFIG = {
  development: 'http://localhost:3001/api',
  production: 'https://api.moonreply.com/api'
}

const API_URL = API_CONFIG.development // Using development for local testing

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default values
    await chrome.storage.sync.set({
      usageCount: 0,
      installDate: Date.now(),
      version: chrome.runtime.getManifest().version
    })
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://moonreply.com/welcome'
    })
  } else if (details.reason === 'update') {
    // Handle extension update
    const previousVersion = details.previousVersion
    const currentVersion = chrome.runtime.getManifest().version
    
    console.log(`Moon updated from ${previousVersion} to ${currentVersion}`)
  }
})

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'OPEN_POPUP':
      // Store the selected text for popup to access
      chrome.storage.local.set({ 
        selectedText: request.text,
        timestamp: Date.now()
      })
      // Note: chrome.action.openPopup() is not allowed in service workers
      // User must click the extension icon to open popup
      sendResponse({ success: true })
      break
      
    case 'TRACK_EVENT':
      trackEvent(request.event, request.properties)
      break
      
    case 'CHECK_LIMIT':
      checkUsageLimit().then(sendResponse)
      return true // Keep message channel open for async response
  }
})

// Create context menu for text selection
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'moon-generate',
    title: 'Generate Reply with Moon',
    contexts: ['selection']
  })
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'moon-generate' && info.selectionText) {
    // Store selected text
    chrome.storage.local.set({ 
      selectedText: info.selectionText,
      timestamp: Date.now()
    })
    
    // User must click the extension icon to open popup
    // chrome.action.openPopup() is not allowed in service workers
  }
})

// Function to check usage limit
async function checkUsageLimit() {
  try {
    const { usageCount } = await chrome.storage.sync.get('usageCount')
    const currentUsage = usageCount || 0
    const maxFreeReplies = 10
    
    return {
      canGenerate: currentUsage < maxFreeReplies,
      usageCount: currentUsage,
      remaining: Math.max(0, maxFreeReplies - currentUsage)
    }
  } catch (error) {
    console.error('Error checking usage limit:', error)
    return {
      canGenerate: true,
      usageCount: 0,
      remaining: 10
    }
  }
}

// Analytics tracking (privacy-friendly)
async function trackEvent(eventName, properties = {}) {
  try {
    const { userId } = await chrome.storage.sync.get('userId')
    
    if (!userId) return
    
    // Send anonymous analytics
    fetch(`${API_URL}/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventName,
        userId: userId,
        properties: {
          ...properties,
          version: chrome.runtime.getManifest().version,
          timestamp: Date.now()
        }
      })
    }).catch(err => console.error('Analytics error:', err))
  } catch (error) {
    console.error('Error tracking event:', error)
  }
}

// Handle alarm for periodic tasks
chrome.alarms.create('daily-check', {
  periodInMinutes: 60 * 24 // Daily
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'daily-check') {
    // Reset daily free tier if applicable
    resetDailyLimit()
  }
})

// Reset daily limit for free users (optional feature)
async function resetDailyLimit() {
  try {
    const { lastReset, isPro } = await chrome.storage.sync.get(['lastReset', 'isPro'])
    
    // Only reset for free users
    if (isPro) return
    
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    
    if (!lastReset || lastReset < oneDayAgo) {
      await chrome.storage.sync.set({
        usageCount: 0,
        lastReset: now
      })
      
      console.log('Daily limit reset')
    }
  } catch (error) {
    console.error('Error resetting daily limit:', error)
  }
}

// Handle network errors and retry logic
class APIClient {
  constructor() {
    this.retryAttempts = 3
    this.retryDelay = 1000
  }

  async makeRequest(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options)
      
      if (!response.ok && attempt < this.retryAttempts) {
        // Retry on server errors
        if (response.status >= 500) {
          await this.delay(this.retryDelay * attempt)
          return this.makeRequest(url, options, attempt + 1)
        }
      }
      
      return response
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await this.delay(this.retryDelay * attempt)
        return this.makeRequest(url, options, attempt + 1)
      }
      throw error
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export for use in popup
const apiClient = new APIClient()

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if content script needs to be injected
    // This is a fallback for dynamic content
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
      if (chrome.runtime.lastError) {
        // Content script not injected, inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/content/content-script.js']
        }).catch(err => console.log('Script injection failed:', err))
      }
    })
  }
})

console.log('Moon Extension Service Worker initialized')
