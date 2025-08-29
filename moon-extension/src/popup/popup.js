// Moon Extension - Popup JavaScript

class MoonPopup {
  constructor() {
    this.elements = this.initElements()
    this.selectedText = ''
    this.usageCount = 0
    this.maxFreeReplies = 10
    // Use localhost for development - check manifest name for Dev version
    const manifest = chrome.runtime.getManifest()
    this.apiEndpoint = manifest.name.includes('Dev') || manifest.name.includes('development')
      ? 'http://localhost:3001/api' 
      : 'https://api.moonreply.com/api'
    
    // For now, always use localhost during development
    this.apiEndpoint = 'http://localhost:3001/api'
    
    this.init()
  }

  initElements() {
    return {
      selectedTextEl: document.getElementById('selected-text'),
      textPreview: document.getElementById('text-preview'),
      noSelection: document.getElementById('no-selection'),
      replyContainer: document.getElementById('reply-container'),
      replyText: document.getElementById('reply-text'),
      loading: document.getElementById('loading'),
      error: document.getElementById('error'),
      errorMessage: document.getElementById('error-message'),
      copyBtn: document.getElementById('copy-btn'),
      copyText: document.getElementById('copy-text'),
      usageCount: document.getElementById('usage-count'),
      upgradePrompt: document.getElementById('upgrade-prompt'),
      toneBtns: document.querySelectorAll('.tone-btn'),
      replyToneLabel: document.querySelector('.reply-tone-label')
    }
  }

  async init() {
    // Load usage count
    await this.loadUsageCount()
    
    // Get selected text from content script
    await this.getSelectedText()
    
    // Setup event listeners
    this.setupEventListeners()
    
    // Check for stored selected text
    this.checkStoredSelection()
  }

  setupEventListeners() {
    // Tone button clicks
    this.elements.toneBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tone = btn.dataset.tone
        this.generateReply(tone)
      })
    })

    // Copy button click
    this.elements.copyBtn.addEventListener('click', () => {
      this.copyReply()
    })

    // Upgrade button click
    const upgradeBtn = document.querySelector('.upgrade-btn')
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        this.handleUpgrade()
      })
    }
  }

  async getSelectedText() {
    try {
      // Query active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'GET_SELECTED_TEXT' 
      })
      
      if (response && response.text) {
        this.selectedText = response.text
        this.showSelectedText()
      } else {
        this.showNoSelection()
      }
    } catch (error) {
      console.error('Error getting selected text:', error)
      this.checkStoredSelection()
    }
  }

  async checkStoredSelection() {
    // Check for recently stored selection
    const stored = await chrome.storage.local.get(['selectedText', 'timestamp'])
    
    if (stored.selectedText && stored.timestamp) {
      // Only use if selected within last 5 minutes
      const timeDiff = Date.now() - stored.timestamp
      if (timeDiff < 5 * 60 * 1000) {
        this.selectedText = stored.selectedText
        this.showSelectedText()
        return
      }
    }
    
    if (!this.selectedText) {
      this.showNoSelection()
    }
  }

  showSelectedText() {
    this.elements.selectedTextEl.textContent = this.truncateText(this.selectedText, 150)
    this.elements.textPreview.classList.remove('hidden')
    this.elements.noSelection.classList.add('hidden')
  }

  showNoSelection() {
    this.elements.textPreview.classList.add('hidden')
    this.elements.noSelection.classList.remove('hidden')
  }

  async generateReply(tone) {
    if (!this.selectedText) {
      this.showError('Please select some text first')
      return
    }

    // Check usage limit
    if (this.usageCount >= this.maxFreeReplies) {
      this.showUpgradePrompt()
      return
    }

    // Show loading state
    this.showLoading()

    try {
      // Get user ID from storage or generate new one
      const { userId } = await chrome.storage.sync.get('userId') || {}
      const userIdToUse = userId || await this.generateUserId()

      // Make API request to backend
      const response = await fetch(`${this.apiEndpoint}/generate-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Version': chrome.runtime.getManifest().version,
          'X-User-Id': userIdToUse
        },
        body: JSON.stringify({
          text: this.selectedText,
          tone: tone,
          userId: userIdToUse
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          this.showUpgradePrompt()
        } else {
          throw new Error(data.error || 'Failed to generate reply')
        }
        return
      }

      // Show generated reply
      this.showReply(data.reply, tone)
      
      // Update usage count
      this.usageCount = data.usageCount || this.usageCount + 1
      await this.updateUsageCount()
      
    } catch (error) {
      console.error('Error generating reply:', error)
      this.showError(error.message || 'Failed to generate reply. Please try again.')
    }
  }

  showLoading() {
    this.elements.loading.classList.remove('hidden')
    this.elements.replyContainer.classList.add('hidden')
    this.elements.error.classList.add('hidden')
  }

  showReply(replyText, tone) {
    this.elements.replyText.textContent = replyText
    this.elements.replyToneLabel.textContent = `${tone.toUpperCase()} REPLY`
    this.elements.replyContainer.classList.remove('hidden')
    this.elements.loading.classList.add('hidden')
    this.elements.error.classList.add('hidden')
    
    // Reset copy button state
    this.elements.copyBtn.classList.remove('copied')
    this.elements.copyText.textContent = 'Copy'
  }

  showError(message) {
    this.elements.errorMessage.textContent = message
    this.elements.error.classList.remove('hidden')
    this.elements.loading.classList.add('hidden')
    this.elements.replyContainer.classList.add('hidden')
  }

  async copyReply() {
    const replyText = this.elements.replyText.textContent
    
    if (!replyText) return

    try {
      // Send message to content script to copy text
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'COPY_TO_CLIPBOARD',
        text: replyText
      })

      if (response.success) {
        // Show success state
        this.elements.copyBtn.classList.add('copied')
        this.elements.copyText.textContent = 'Copied!'
        
        // Reset after 2 seconds
        setTimeout(() => {
          this.elements.copyBtn.classList.remove('copied')
          this.elements.copyText.textContent = 'Copy'
        }, 2000)
      } else {
        throw new Error('Failed to copy')
      }
    } catch (error) {
      console.error('Copy failed:', error)
      // Fallback: try direct clipboard write
      try {
        await navigator.clipboard.writeText(replyText)
        this.elements.copyBtn.classList.add('copied')
        this.elements.copyText.textContent = 'Copied!'
        
        setTimeout(() => {
          this.elements.copyBtn.classList.remove('copied')
          this.elements.copyText.textContent = 'Copy'
        }, 2000)
      } catch (fallbackError) {
        this.showError('Failed to copy text')
      }
    }
  }

  async loadUsageCount() {
    try {
      const { usageCount } = await chrome.storage.sync.get('usageCount')
      this.usageCount = usageCount || 0
      this.updateUsageDisplay()
    } catch (error) {
      console.error('Error loading usage count:', error)
    }
  }

  async updateUsageCount() {
    try {
      await chrome.storage.sync.set({ usageCount: this.usageCount })
      this.updateUsageDisplay()
    } catch (error) {
      console.error('Error updating usage count:', error)
    }
  }

  updateUsageDisplay() {
    this.elements.usageCount.textContent = `${this.usageCount}/${this.maxFreeReplies}`
    
    // Show warning color when approaching limit
    if (this.usageCount >= this.maxFreeReplies * 0.8) {
      this.elements.usageCount.style.color = '#f59e0b'
    }
    
    if (this.usageCount >= this.maxFreeReplies) {
      this.elements.usageCount.style.color = '#ef4444'
    }
  }

  showUpgradePrompt() {
    this.elements.upgradePrompt.classList.remove('hidden')
    this.elements.loading.classList.add('hidden')
    this.elements.error.classList.add('hidden')
  }

  async generateUserId() {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9)
    await chrome.storage.sync.set({ userId })
    return userId
  }

  handleUpgrade() {
    // Open upgrade page in new tab
    chrome.tabs.create({
      url: 'https://moonreply.com/upgrade?source=extension'
    })
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MoonPopup()
})
