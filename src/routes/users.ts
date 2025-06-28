import { Hono } from 'hono';
import { zValidator } from 'hono/zod-validator';
import { z } from 'zod';
import { db, users, comments } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const app = new Hono();

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
});

// Get all users
app.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      bio: users.bio,
      rating: users.rating,
      debatesParticipated: users.debatesParticipated,
      tags: users.tags,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.rating));

    return c.json(allUsers);
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Get user by ID
app.get('/:id', optionalAuthMiddleware, async (c) => {
  try {
    const userId = c.req.param('id');
    
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user comments
    const userComments = await db.select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.targetUserId, userId))
    .orderBy(desc(comments.createdAt));

    return c.json({
      ...user[0],
      comments: userComments,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// Update user profile
app.put('/:id', authMiddleware, zValidator('json', updateUserSchema), async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUser = c.get('user');
    const updateData = c.req.valid('json');

    // Check if user can update this profile
    if (currentUser.id !== userId && !currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updatedUser = await db.update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(updatedUser[0]);
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Add comment to user profile
app.post('/:id/comments', authMiddleware, zValidator('json', commentSchema), async (c) => {
  try {
    const targetUserId = c.req.param('id');
    const currentUser = c.get('user');
    const { content } = c.req.valid('json');

    // Check if target user exists
    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (targetUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Can't comment on own profile
    if (currentUser.id === targetUserId) {
      return c.json({ error: 'Cannot comment on your own profile' }, 400);
    }

    const newComment = await db.insert(comments).values({
      content,
      targetUserId,
      authorId: currentUser.id,
    }).returning();

    // Get comment with author info
    const commentWithAuthor = await db.select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.id, newComment[0].id))
    .limit(1);

    return c.json(commentWithAuthor[0], 201);
  } catch (error) {
    console.error('Add comment error:', error);
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

export default app;