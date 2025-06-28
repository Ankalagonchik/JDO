import { Hono } from 'hono';
import { zValidator } from 'hono/zod-validator';
import { z } from 'zod';
import { db, topics, users, arguments as argumentsTable } from '../db/index.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const app = new Hono();

const createTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  tags: z.array(z.string()).max(10).default([]),
  endDate: z.string().optional(),
});

const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  status: z.enum(['active', 'closed', 'scheduled']).optional(),
  endDate: z.string().optional(),
});

// Get all topics
app.get('/', optionalAuthMiddleware, async (c) => {
  try {
    const allTopics = await db.select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      status: topics.status,
      tags: topics.tags,
      participants: topics.participants,
      upvotes: topics.upvotes,
      downvotes: topics.downvotes,
      endDate: topics.endDate,
      createdAt: topics.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(topics)
    .leftJoin(users, eq(topics.authorId, users.id))
    .orderBy(desc(topics.createdAt));

    return c.json(allTopics);
  } catch (error) {
    console.error('Get topics error:', error);
    return c.json({ error: 'Failed to fetch topics' }, 500);
  }
});

// Get topic by ID
app.get('/:id', optionalAuthMiddleware, async (c) => {
  try {
    const topicId = c.req.param('id');
    
    const topic = await db.select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      status: topics.status,
      tags: topics.tags,
      participants: topics.participants,
      upvotes: topics.upvotes,
      downvotes: topics.downvotes,
      endDate: topics.endDate,
      createdAt: topics.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(topics)
    .leftJoin(users, eq(topics.authorId, users.id))
    .where(eq(topics.id, topicId))
    .limit(1);

    if (topic.length === 0) {
      return c.json({ error: 'Topic not found' }, 404);
    }

    return c.json(topic[0]);
  } catch (error) {
    console.error('Get topic error:', error);
    return c.json({ error: 'Failed to fetch topic' }, 500);
  }
});

// Create new topic
app.post('/', authMiddleware, zValidator('json', createTopicSchema), async (c) => {
  try {
    const currentUser = c.get('user');
    const topicData = c.req.valid('json');

    const newTopic = await db.insert(topics).values({
      title: topicData.title,
      description: topicData.description,
      authorId: currentUser.id,
      tags: topicData.tags,
      endDate: topicData.endDate ? new Date(topicData.endDate) : null,
    }).returning();

    // Get topic with author info
    const topicWithAuthor = await db.select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      status: topics.status,
      tags: topics.tags,
      participants: topics.participants,
      upvotes: topics.upvotes,
      downvotes: topics.downvotes,
      endDate: topics.endDate,
      createdAt: topics.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(topics)
    .leftJoin(users, eq(topics.authorId, users.id))
    .where(eq(topics.id, newTopic[0].id))
    .limit(1);

    return c.json(topicWithAuthor[0], 201);
  } catch (error) {
    console.error('Create topic error:', error);
    return c.json({ error: 'Failed to create topic' }, 500);
  }
});

// Update topic
app.put('/:id', authMiddleware, zValidator('json', updateTopicSchema), async (c) => {
  try {
    const topicId = c.req.param('id');
    const currentUser = c.get('user');
    const updateData = c.req.valid('json');

    // Check if topic exists and user can update it
    const topic = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
    
    if (topic.length === 0) {
      return c.json({ error: 'Topic not found' }, 404);
    }

    if (topic[0].authorId !== currentUser.id && !currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const updatedTopic = await db.update(topics)
      .set({
        ...updateData,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(topics.id, topicId))
      .returning();

    return c.json(updatedTopic[0]);
  } catch (error) {
    console.error('Update topic error:', error);
    return c.json({ error: 'Failed to update topic' }, 500);
  }
});

// Delete topic
app.delete('/:id', authMiddleware, async (c) => {
  try {
    const topicId = c.req.param('id');
    const currentUser = c.get('user');

    // Check if topic exists and user can delete it
    const topic = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
    
    if (topic.length === 0) {
      return c.json({ error: 'Topic not found' }, 404);
    }

    if (topic[0].authorId !== currentUser.id && !currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await db.delete(topics).where(eq(topics.id, topicId));

    return c.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Delete topic error:', error);
    return c.json({ error: 'Failed to delete topic' }, 500);
  }
});

export default app;