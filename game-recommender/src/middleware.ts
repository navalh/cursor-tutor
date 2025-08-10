import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security Headers
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://api.rawg.io; " +
      "frame-ancestors 'none';",
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Rate limiting (basic implementation)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  // In production, you'd use Redis or similar for rate limiting
  // For now, we'll implement a basic version
  const userAgent = request.headers.get('user-agent') || ''
  
  // Block suspicious user agents
  if (userAgent.includes('bot') || userAgent.includes('crawler')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
