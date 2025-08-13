# Security Policy

## 🔒 Security First Approach

Moon Chrome Extension follows a comprehensive security-first development approach to protect user data and maintain system integrity.

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please DO NOT create a public GitHub issue. Instead:

1. Email: security@moonreply.com
2. Include: Description, steps to reproduce, potential impact
3. We'll respond within 48 hours
4. We'll work with you to understand and address the issue

## Security Architecture

### 1. API Key Protection

**Implementation:**
- API keys stored only on backend server
- Never exposed to client-side code
- Environment variables for key storage
- Keys rotated regularly

**Code Example:**
```javascript
// ❌ NEVER DO THIS
const apiKey = 'sk-abc123' // Exposed in client code

// ✅ CORRECT APPROACH
// Backend proxy handles all API calls
fetch('https://api.moonreply.com/generate', {
  headers: { 'X-User-Id': userId }
})
```

### 2. Input Validation & Sanitization

**All User Inputs Validated:**
```javascript
// Zod schema validation
const replySchema = z.object({
  text: z.string().min(1).max(5000),
  tone: z.enum(['optimistic', 'sarcastic', 'direct', 'sassy']),
  userId: z.string().regex(/^user_[a-z0-9]{9}$/)
})

// SQL injection prevention
const query = sql`
  SELECT * FROM users 
  WHERE user_id = ${userId}
` // Parameterized query
```

### 3. Rate Limiting

**Multi-Layer Rate Limiting:**
- Global: 100 requests/15min per IP
- Reply Generation: 10 requests/min (free tier)
- Redis-backed distributed rate limiting

```javascript
const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  store: new RedisStore({ client: redis })
})
```

### 4. Content Security Policy

**Strict CSP Headers:**
```javascript
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}

// Backend CSP
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"]
  }
})
```

### 5. Authentication & Authorization

**User Authentication Flow:**
1. Anonymous user ID generation
2. Secure storage in chrome.storage.sync
3. JWT tokens for Pro users
4. Session validation on each request

### 6. Data Encryption

**Encryption Practices:**
- TLS 1.3 for all API communications
- Sensitive data encrypted at rest
- User IDs hashed for analytics
- No password storage (OAuth only for Pro)

### 7. XSS Prevention

**Protection Measures:**
- No dangerouslySetInnerHTML usage
- All dynamic content escaped
- Strict Content Security Policy
- Input sanitization on all fields

```javascript
// Sanitize user input
function sanitizeInput(text) {
  return text
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .trim()
}
```

### 8. CORS Configuration

**Strict Origin Validation:**
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Only allow Chrome extensions and trusted domains
    if (origin?.startsWith('chrome-extension://') || 
        trustedDomains.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS policy violation'))
    }
  }
}
```

## Security Headers

All responses include:
- `Strict-Transport-Security`: HSTS enforcement
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `X-XSS-Protection`: 1; mode=block
- `Referrer-Policy`: strict-origin-when-cross-origin

## Data Privacy

### What We Store
- Anonymous user ID
- Usage count (for rate limiting)
- Hashed analytics events
- Generated replies (first 500 chars, 30-day retention)

### What We DON'T Store
- Full selected text after 30 days
- Personal information
- Browsing history
- Cookies or tracking pixels
- Third-party analytics

## Dependency Security

- Weekly dependency audits with `npm audit`
- Automated security updates via Dependabot
- Only trusted, well-maintained packages
- Regular security scanning with Snyk

## Secure Development Practices

### Code Review Requirements
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting applied
- [ ] Security headers configured
- [ ] XSS prevention measures
- [ ] SQL injection prevention

### Pre-Deployment Checklist
- [ ] Environment variables configured
- [ ] HTTPS/TLS enabled
- [ ] Rate limiting active
- [ ] Security headers set
- [ ] Input validation working
- [ ] Error handling sanitized
- [ ] Logs don't contain sensitive data
- [ ] Dependencies updated
- [ ] Security scan passed

## Incident Response Plan

1. **Detection**: Monitoring via logs and alerts
2. **Assessment**: Evaluate scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and patch vulnerability
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Post-incident review and improvements

## Security Tools

- **Static Analysis**: ESLint security plugin
- **Dependency Scanning**: npm audit, Snyk
- **Runtime Protection**: Helmet.js
- **Monitoring**: Winston logging, Sentry
- **Rate Limiting**: express-rate-limit with Redis
- **Validation**: Zod, express-validator

## Compliance

- GDPR compliant data handling
- CCPA privacy requirements
- Chrome Web Store policies
- OWASP Top 10 protection

## Security Updates

Security patches are released:
- **Critical**: Within 24 hours
- **High**: Within 3 days
- **Medium**: Within 1 week
- **Low**: Next regular release

## Contact

**Security Team Email**: security@moonreply.com
**PGP Key**: Available on request
**Bug Bounty**: Coming soon

## Version History

| Version | Security Updates |
|---------|-----------------|
| 1.0.0   | Initial security implementation |
| 1.0.1   | Added rate limiting |
| 1.0.2   | Enhanced CSP headers |
| 1.0.3   | Improved input validation |

---

Last Updated: 2024
Security Policy Version: 1.0
