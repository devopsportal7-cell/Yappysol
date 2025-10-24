import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const usernameCheckLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Use user ID if authenticated, otherwise use IP
  const key = (req as any).user?.id || req.ip || 'unknown';
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = (req as any).user?.id ? 100 : 30; // Higher limit for authenticated users
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }
  
  if (entry.count >= maxRequests) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many username check requests, please try again later'
    });
  }
  
  entry.count++;
  next();
};

export const profileUpdateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = (req as any).user?.id || req.ip || 'unknown';
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }
  
  if (entry.count >= maxRequests) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many profile update requests, please try again later'
    });
  }
  
  entry.count++;
  next();
};
