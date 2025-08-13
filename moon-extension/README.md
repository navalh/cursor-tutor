# 🌙 Moon - AI Reply Generator Chrome Extension

<div align="center">
  <img src="public/icons/icon-128.png" alt="Moon Logo" width="128" height="128">
  
  **Generate AI-powered replies in different tones with one click**
  
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome)](https://chrome.google.com/webstore)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Security](https://img.shields.io/badge/Security-First-green.svg)](SECURITY.md)
</div>

## 🎯 Overview

Moon is a Chrome extension that uses AI to generate contextual replies in four distinct tones:
- **😊 Optimistic** - Positive and encouraging responses
- **😏 Sarcastic** - Witty and ironic replies
- **💼 Direct** - Professional and to-the-point
- **💅 Sassy** - Bold and confident responses

## ✨ Features

- **Text Selection Detection** - Automatically detects selected text on any webpage
- **4 Tone Styles** - Choose from Optimistic, Sarcastic, Direct, or Sassy replies
- **One-Click Copy** - Instantly copy generated replies to clipboard
- **Secure API Proxy** - Your API keys never leave the backend server
- **Rate Limiting** - Free tier with 10 replies/day, upgradeable to Pro
- **Privacy-First** - No personal data collection, anonymous usage analytics
- **Fast Response** - Sub-200ms UI response time
- **Beautiful UI** - Modern, dark-themed interface with smooth animations

## 📁 Project Structure

```
moon-extension/
├── manifest.json           # Chrome Extension manifest (Manifest V3)
├── src/
│   ├── content/           # Content scripts
│   │   ├── content-script.js
│   │   └── selection-highlight.css
│   ├── background/         # Service worker
│   │   └── service-worker.js
│   ├── popup/             # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── lib/               # Shared utilities
├── backend/               # Node.js backend server
│   ├── src/
│   │   ├── server.js      # Express server
│   │   ├── lib/
│   │   │   ├── ai-handler.js    # AI API integration
│   │   │   └── database.js      # Database manager
│   │   └── middleware/
│   │       ├── auth.js          # Authentication
│   │       └── security.js      # Security middleware
│   ├── package.json
│   └── env.example        # Environment variables template
├── public/
│   └── icons/            # Extension icons
└── setup.sh              # Development setup script
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Chrome/Chromium browser
- OpenAI API key (required)
- Anthropic API key (optional, for fallback)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/moon-extension.git
cd moon-extension
```

2. **Run the setup script:**
```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure environment variables:**
```bash
cd backend
cp env.example .env
# Edit .env with your API keys and database credentials
```

4. **Start the development environment:**
```bash
./start-dev.sh
```

5. **Load the extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `moon-extension` directory

## 🔧 Configuration

### Backend Environment Variables

```env
# AI API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moon_db
DB_USER=moon_user
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your_32_char_secret
ENCRYPTION_KEY=your_32_char_key
```

## 🔒 Security Features

### Client-Side Security
- **Content Security Policy** - Strict CSP headers prevent XSS attacks
- **Secure Communication** - All API calls use HTTPS in production
- **Input Sanitization** - All user inputs sanitized before processing
- **No API Keys** - API keys never exposed to client code

### Server-Side Security
- **API Key Proxy** - Backend handles all AI API communications
- **Rate Limiting** - Redis-backed rate limiting per user/IP
- **Input Validation** - Zod schema validation on all endpoints
- **SQL Injection Prevention** - Parameterized queries only
- **CORS Protection** - Strict origin validation
- **Security Headers** - Helmet.js for comprehensive headers
- **Authentication** - JWT-based user authentication
- **Encryption** - Sensitive data encrypted at rest

### Security Checklist
- [x] HTTPS enforced with HSTS
- [x] Input validation on all endpoints
- [x] XSS protection via CSP
- [x] CSRF protection via SameSite cookies
- [x] SQL injection prevention
- [x] Rate limiting implemented
- [x] API keys secured server-side
- [x] Error messages sanitized
- [x] Dependencies regularly updated
- [x] Security headers configured

## 💻 Development

### Local Development

```bash
# Start backend server
cd backend
npm run dev

# Backend runs on http://localhost:3001
```

### Testing the Extension

1. Select any text on a webpage
2. Look for the Moon indicator (🌙)
3. Click the extension icon in toolbar
4. Choose a tone to generate a reply
5. Click copy to clipboard

### Building for Production

```bash
# Build backend
cd backend
npm run build

# Package extension
cd ..
zip -r moon-extension.zip . -x "*.git*" -x "backend/node_modules/*" -x "*.env"
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255),
  is_pro BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Usage History Table
```sql
CREATE TABLE usage_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  text_preview TEXT,
  tone VARCHAR(20),
  reply_preview TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 💰 Monetization

### Free Tier
- 10 replies per day
- All 4 tone styles
- Basic support

### Pro Tier ($4.99/month)
- Unlimited replies
- Priority API access
- Premium support
- Advanced tone customization (coming soon)

## 🚢 Deployment

### Chrome Web Store

1. Create a developer account
2. Package the extension (exclude backend)
3. Upload to Chrome Web Store
4. Configure privacy policy and screenshots

### Backend Deployment (Railway/Render)

```bash
# Deploy to Railway
railway up

# Or deploy to Render
# Follow render.yaml configuration
```

### Environment Setup
- Set all environment variables in hosting platform
- Configure PostgreSQL and Redis instances
- Set up SSL certificates
- Configure domain and CORS origins

## 🧪 API Endpoints

### Generate Reply
```http
POST /api/generate-reply
Content-Type: application/json
X-User-Id: user_xyz123

{
  "text": "Selected text from webpage",
  "tone": "optimistic|sarcastic|direct|sassy",
  "userId": "user_xyz123"
}
```

### Response
```json
{
  "reply": "Generated AI reply text",
  "tone": "optimistic",
  "usageCount": 3,
  "remaining": 7,
  "requestId": "req_abc123"
}
```

## 📈 Performance Optimization

- **Caching** - Redis caching for repeated queries
- **Lazy Loading** - Dynamic imports for non-critical components
- **Debouncing** - Text selection debounced to reduce processing
- **Connection Pooling** - PostgreSQL connection pooling
- **CDN** - Static assets served via CDN in production
- **Compression** - Gzip compression for API responses

## 🐛 Troubleshooting

### Extension Not Working
1. Check if backend server is running
2. Verify API keys in `.env`
3. Check Chrome console for errors
4. Ensure extension has required permissions

### Rate Limit Issues
- Free users limited to 10 replies/day
- Check usage count in popup
- Upgrade to Pro for unlimited

### Database Connection Errors
- Verify PostgreSQL is running
- Check database credentials
- Ensure database exists

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🔮 Roadmap

- [ ] Firefox extension support
- [ ] Custom tone creation
- [ ] Reply history
- [ ] Team accounts
- [ ] Webhook integrations
- [ ] Mobile app
- [ ] Multi-language support

## 📧 Support

- Email: support@moonreply.com
- Discord: [Join our server](https://discord.gg/moonreply)
- Issues: [GitHub Issues](https://github.com/yourusername/moon-extension/issues)

## 🙏 Acknowledgments

- OpenAI for GPT API
- Anthropic for Claude API
- Chrome Extensions team
- Open source community

---

<div align="center">
  Made with 🌙 by the Moon Team
</div>
