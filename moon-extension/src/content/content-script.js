// Moon Extension - Content Script
// Handles text selection detection and communication with popup

class TextSelectionHandler {
  constructor() {
    this.selectedText = ''
    this.selectionRect = null
    this.debounceTimer = null
    this.init()
  }

  init() {
    // Listen for text selection events
    document.addEventListener('mouseup', this.handleSelection.bind(this))
    document.addEventListener('keyup', this.handleSelection.bind(this))
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))
  }

  handleSelection() {
    // Debounce selection to avoid excessive processing
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      const selection = window.getSelection()
      const text = selection.toString().trim()
      
      if (text && text.length > 0 && text.length <= 5000) {
        this.selectedText = text
        this.selectionRect = this.getSelectionRect(selection)
        
        // Store selected text for popup access
        chrome.storage.local.set({ 
          selectedText: text,
          timestamp: Date.now()
        })
        
        // Show visual indicator
        this.showSelectionIndicator()
      }
    }, 200)
  }

  getSelectionRect(selection) {
    if (selection.rangeCount === 0) return null
    
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    }
  }

  showSelectionIndicator() {
    // Remove existing indicator
    this.removeIndicator()
    
    if (!this.selectionRect) return
    
    // Create subtle indicator element
    const indicator = document.createElement('div')
    indicator.className = 'moon-selection-indicator'
    indicator.style.cssText = `
      position: absolute;
      top: ${this.selectionRect.top - 30}px;
      left: ${this.selectionRect.left + this.selectionRect.width / 2 - 20}px;
      width: 40px;
      height: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: bold;
      z-index: 999999;
      animation: fadeIn 0.3s ease-in-out;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
    `
    indicator.innerHTML = '🌙'
    indicator.onclick = () => {
      chrome.runtime.sendMessage({ 
        type: 'OPEN_POPUP',
        text: this.selectedText 
      })
    }
    
    document.body.appendChild(indicator)
    
    // Auto-remove after 3 seconds
    setTimeout(() => this.removeIndicator(), 3000)
  }

  removeIndicator() {
    const existing = document.querySelector('.moon-selection-indicator')
    if (existing) {
      existing.remove()
    }
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'GET_SELECTED_TEXT':
        sendResponse({ 
          text: this.selectedText,
          hasSelection: !!this.selectedText 
        })
        break
        
      case 'CLEAR_SELECTION':
        this.selectedText = ''
        this.removeIndicator()
        window.getSelection().removeAllRanges()
        sendResponse({ success: true })
        break
        
      case 'COPY_TO_CLIPBOARD':
        this.copyToClipboard(request.text)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }))
        return true // Keep message channel open for async response
    }
  }

  async copyToClipboard(text) {
    try {
      // Try using the modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
    } catch (error) {
      console.error('Failed to copy text:', error)
      throw error
    }
  }
}

// Initialize handler when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TextSelectionHandler())
} else {
  new TextSelectionHandler()
}

// Add animation styles
const style = document.createElement('style')
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`
document.head.appendChild(style)
