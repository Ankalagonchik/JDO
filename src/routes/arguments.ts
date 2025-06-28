import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, arguments as argumentsTable, users, topics, replies, votes } from '../db/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const app = new Hono();

const createArgumentSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['pro', 'con']),
  topicId: z.string().uuid(),
});

const createReplySchema = z.object({
  content: z.string().min(1).max(1000),
});

const voteSchema = z.object({
  voteType: z.enum(['up', 'down']),
});

// Get arguments for a topic
app.get('/topic/:topicId', optionalAuthMiddleware, async (c) => {
  try {
    const topicId = c.req.param('topicId');
    
    const topicArguments = await db.select({
      id: argumentsTable.id,
      content: argumentsTable.content,
      type: argumentsTable.type,
      upvotes: argumentsTable.upvotes,
      downvotes: argumentsTable.downvotes,
      createdAt: argumentsTable.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(argumentsTable)
    .leftJoin(users, eq(argumentsTable.authorId, users.id))
    .where(eq(argumentsTable.topicId, topicId))
    .orderBy(desc(argumentsTable.createdAt));

    return c.json(topicArguments);
  } catch (error) {
    console.error('Get arguments error:', error);
    return c.json({ error: 'Failed to fetch arguments' }, 500);
  }
});

// Create new argument
app.post('/', authMiddleware, zValidator('json', createArgumentSchema), async (c) => {
  try {
    const currentUser = c.get('user');
    const argumentData = c.req.valid('json');

    // Check if topic exists
    const topic = await db.select().from(topics).where(eq(topics.id, argumentData.topicId)).limit(1);
    if (topic.length === 0) {
      return c.json({ error: 'Topic not found' }, 404);
    }

    // Check if topic is active
    if (topic[0].status !== 'active') {
      return c.json({ error: 'Topic is not active' }, 400);
    }

    const newArgument = await db.insert(argumentsTable).values({
      content: argumentData.content,
      type: argumentData.type,
      topicId: argumentData.topicId,
      authorId: currentUser.id,
    }).returning();

    // Update topic participants count
    await db.update(topics)
      .set({ participants: topic[0].participants + 1 })
      .where(eq(topics.id, argumentData.topicId));

    // Get argument with author info
    const argumentWithAuthor = await db.select({
      id: argumentsTable.id,
      content: argumentsTable.content,
      type: argumentsTable.type,
      upvotes: argumentsTable.upvotes,
      downvotes: argumentsTable.downvotes,
      createdAt: argumentsTable.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(argumentsTable)
    .leftJoin(users, eq(argumentsTable.authorId, users.id))
    .where(eq(argumentsTable.id, newArgument[0].id))
    .limit(1);

    return c.json(argumentWithAuthor[0], 201);
  } catch (error) {
    console.error('Create argument error:', error);
    return c.json({ error: 'Failed to create argument' }, 500);
  }
});

// Vote on argument
app.post('/:id/vote', authMiddleware, zValidator('json', voteSchema), async (c) => {
  try {
    const argumentId = c.req.param('id');
    const currentUser = c.get('user');
    const { voteType } = c.req.valid('json');

    // Check if argument exists
    const argument = await db.select().from(argumentsTable).where(eq(argumentsTable.id, argumentId)).limit(1);
    if (argument.length === 0) {
      return c.json({ error: 'Argument not found' }, 404);
    }

    // Check if user already voted
    const existingVote = await db.select().from(votes)
      .where(and(
        eq(votes.userId, currentUser.id),
        eq(votes.targetId, argumentId),
        eq(votes.targetType, 'argument')
      ))
      .limit(1);

    if (existingVote.length > 0) {
      // Update existing vote
      await db.update(votes)
        .set({ voteType })
        .where(eq(votes.id, existingVote[0].id));
    } else {
      // Create new vote
      await db.insert(votes).values({
        userId: currentUser.id,
        targetId: argumentId,
        targetType: 'argument',
        voteType,
      });
    }

    // Recalculate vote counts
    const upvoteCount = await db.select().from(votes)
      .where(and(
        eq(votes.targetId, argumentId),
        eq(votes.targetType, 'argument'),
        eq(votes.voteType, 'up')
      ));

    const downvoteCount = await db.select().from(votes)
      .where(and(
        eq(votes.targetId, argumentId),
        eq(votes.targetType, 'argument'),
        eq(votes.voteType, 'down')
      ));

    // Update argument vote counts
    await db.update(argumentsTable)
      .set({
        upvotes: upvoteCount.length,
        downvotes: downvoteCount.length,
      })
      .where(eq(argumentsTable.id, argumentId));

    return c.json({ 
      upvotes: upvoteCount.length, 
      downvotes: downvoteCount.length 
    });
  } catch (error) {
    console.error('Vote argument error:', error);
    return c.json({ error: 'Failed to vote on argument' }, 500);
  }
});

// Get replies for an argument
app.get('/:id/replies', optionalAuthMiddleware, async (c) => {
  try {
    const argumentId = c.req.param('id');
    
    const argumentReplies = await db.select({
      id: replies.id,
      content: replies.content,
      upvotes: replies.upvotes,
      downvotes: replies.downvotes,
      createdAt: replies.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(replies)
    .leftJoin(users, eq(replies.authorId, users.id))
    .where(eq(replies.argumentId, argumentId))
    .orderBy(desc(replies.createdAt));

    return c.json(argumentReplies);
  } catch (error) {
    console.error('Get replies error:', error);
    return c.json({ error: 'Failed to fetch replies' }, 500);
  }
});

// Create reply to argument
app.post('/:id/replies', authMiddleware, zValidator('json', createReplySchema), async (c) => {
  try {
    const argumentId = c.req.param('id');
    const currentUser = c.get('user');
    const { content } = c.req.valid('json');

    // Check if argument exists
    const argument = await db.select().from(argumentsTable).where(eq(argumentsTable.id, argumentId)).limit(1);
    if (argument.length === 0) {
      return c.json({ error: 'Argument not found' }, 404);
    }

    const newReply = await db.insert(replies).values({
      content,
      argumentId,
      authorId: currentUser.id,
    }).returning();

    // Get reply with author info
    const replyWithAuthor = await db.select({
      id: replies.id,
      content: replies.content,
      upvotes: replies.upvotes,
      downvotes: replies.downvotes,
      createdAt: replies.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(replies)
    .leftJoin(users, eq(replies.authorId, users.id))
    .where(eq(replies.id, newReply[0].id))
    .limit(1);

    return c.json(replyWithAuthor[0], 201);
  } catch (error) {
    console.error('Create reply error:', error);
    return c.json({ error: 'Failed to create reply' }, 500);
  }
});

export default app;