import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from '@hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import topicRoutes from './routes/topics.js';
import argumentRoutes from './routes/arguments.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://justdebate.online',
    'https://www.justdebate.online'
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'JustDebate.online API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/topics', topicRoutes);
app.route('/api/arguments', argumentRoutes);

// Protected routes example
app.get('/api/protected', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ message: 'This is protected', user });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});