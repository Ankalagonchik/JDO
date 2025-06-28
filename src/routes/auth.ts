import { Hono } from 'hono';
import { zValidator } from 'hono/zod-validator';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { sign } from 'jsonwebtoken';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';

const app = new Hono();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const googleAuthSchema = z.object({
  credential: z.string(),
});

// Google OAuth login
app.post('/google', zValidator('json', googleAuthSchema), async (c) => {
  try {
    const { credential } = c.req.valid('json');

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return c.json({ error: 'Invalid Google token' }, 400);
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email || !name) {
      return c.json({ error: 'Missing required user data' }, 400);
    }

    // Check if user exists
    let user = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

    if (user.length === 0) {
      // Create new user
      const newUser = await db.insert(users).values({
        googleId,
        email,
        name,
        avatar: picture || '',
        bio: '',
        rating: 0,
        debatesParticipated: 0,
        isAdmin: email === 'dotaiiacademhy@gmail.com' || email === 'justdebate.online@gmail.com',
        tags: [],
      }).returning();

      user = newUser;
    } else {
      // Update existing user info
      const updatedUser = await db.update(users)
        .set({
          name,
          avatar: picture || user[0].avatar,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user[0].id))
        .returning();

      user = updatedUser;
    }

    // Generate JWT token
    const token = sign(
      { userId: user[0].id, email: user[0].email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return c.json({
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        avatar: user[0].avatar,
        bio: user[0].bio,
        rating: user[0].rating,
        debatesParticipated: user[0].debatesParticipated,
        isAdmin: user[0].isAdmin,
        tags: user[0].tags,
        joinedDate: user[0].createdAt,
        comments: [], // Will be loaded separately
      },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Logout
app.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

// Verify token
app.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const { verify } = await import('jsonwebtoken');
    const decoded = verify(token, JWT_SECRET) as any;
    const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    
    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 401);
    }

    return c.json({
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        avatar: user[0].avatar,
        bio: user[0].bio,
        rating: user[0].rating,
        debatesParticipated: user[0].debatesParticipated,
        isAdmin: user[0].isAdmin,
        tags: user[0].tags,
        joinedDate: user[0].createdAt,
        comments: [], // Will be loaded separately
      },
    });
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

export default app;