import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/** Helmet — sets all security-relevant HTTP headers per OWASP WSTG */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
});

/** General API rate limiter */
export const generalLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
});

/** Strict limiter for authentication endpoints — OWASP WSTG-ATHN-03 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed login attempts. Account temporarily locked.' },
});

/** Prevent parameter pollution */
export function noParamPollution(req: Request, _res: Response, next: NextFunction) {
  for (const key of Object.keys(req.query)) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = (req.query[key] as string[])[0] as unknown as string;
    }
  }
  next();
}

/** Strip null bytes — prevents null-byte injection attacks */
export function sanitizeNullBytes(req: Request, _res: Response, next: NextFunction) {
  const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = (obj[key] as string).replace(/\0/g, '');
      } else if (obj[key] && typeof obj[key] === 'object') {
        sanitize(obj[key] as Record<string, unknown>);
      }
    }
    return obj;
  };
  if (req.body) sanitize(req.body);
  next();
}
