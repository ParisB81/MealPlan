import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const APP_PASSWORD = process.env.APP_PASSWORD || '';

// Generate a token from the password (deterministic so we can verify)
function generateToken(password: string): string {
  return crypto.createHash('sha256').update(password + '_mealplan_auth').digest('hex');
}

// Login endpoint — verify password, return token
export function loginHandler(req: Request, res: Response) {
  const { password } = req.body;

  if (!APP_PASSWORD) {
    // No password set — allow access freely
    return res.json({ status: 'success', token: 'no-auth-required' });
  }

  if (password === APP_PASSWORD) {
    const token = generateToken(APP_PASSWORD);
    return res.json({ status: 'success', token });
  }

  return res.status(401).json({ status: 'error', message: 'Incorrect password' });
}

// Check auth status — verify token is valid
export function checkAuthHandler(req: Request, res: Response) {
  if (!APP_PASSWORD) {
    return res.json({ status: 'success', authenticated: true });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const validToken = generateToken(APP_PASSWORD);

  if (token === validToken) {
    return res.json({ status: 'success', authenticated: true });
  }

  return res.status(401).json({ status: 'error', authenticated: false });
}

// Middleware to protect API routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // No password configured — skip auth
  if (!APP_PASSWORD) return next();

  // Allow health check without auth
  if (req.path === '/api/health') return next();

  // Allow auth endpoints without auth
  if (req.path === '/api/auth/login' || req.path === '/api/auth/check') return next();

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const validToken = generateToken(APP_PASSWORD);

  if (token === validToken) {
    return next();
  }

  return res.status(401).json({ status: 'error', message: 'Authentication required' });
}
