import { Context, Next } from 'hono';
import { OAuth2Client } from 'google-auth-library';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    
    try {
      // Try JWT first
      const { verify } = await import('jsonwebtoken');
      const decoded = verify(token, JWT_SECRET) as any;
      const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      
      if (user.length === 0) {
        return c.json({ error: 'User not found' }, 401);
      }

      c.set('user', {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        isAdmin: user[0].isAdmin,
      });
      
      await next();
    } catch (jwtError) {
      // If JWT fails, try Google token
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        if (!payload) {
          return c.json({ error: 'Invalid Google token' }, 401);
        }

        const user = await db.select().from(users).where(eq(users.googleId, payload.sub)).limit(1);
        
        if (user.length === 0) {
          return c.json({ error: 'User not found' }, 401);
        }

        c.set('user', {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          isAdmin: user[0].isAdmin,
        });
        
        await next();
      } catch (googleError) {
        return c.json({ error: 'Invalid token' }, 401);
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
};

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await authMiddleware(c, next);
      return;
    } catch (error) {
      // Continue without auth if token is invalid
    }
  }
  
  await next();
};