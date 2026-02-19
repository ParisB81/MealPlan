import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import 'express-async-errors';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import recipesRouter from './routes/recipes.js';
import ingredientsRouter from './routes/ingredients.js';
import mealPlansRouter from './routes/mealPlans.js';
import shoppingListsRouter from './routes/shoppingLists.js';
import scraperRouter from './routes/scraper.js';
import cookingPlansRouter from './routes/cookingPlans.js';

// Load environment variables
config();

// Startup logging
console.log('Starting MealPlan server...');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`PORT: ${process.env.PORT || '3000 (default)'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: isProduction ? false : undefined,
}));

// CORS configuration to allow multiple frontend ports
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://192.168.1.73:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/meal-plans', mealPlansRouter);
app.use('/api/shopping-lists', shoppingListsRouter);
app.use('/api/scraper', scraperRouter);
app.use('/api/cooking-plans', cookingPlansRouter);

// Serve frontend static files in production
if (isProduction) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const host = isProduction ? '0.0.0.0' : 'localhost';
const server = app.listen(Number(PORT), host, () => {
  console.log(`Server running on http://${host}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Increase server timeout to 10 minutes for long-running scraping requests
server.timeout = 600000; // 10 minutes
server.keepAliveTimeout = 620000; // slightly more than timeout
server.headersTimeout = 625000; // slightly more than keepAliveTimeout

// Catch unhandled errors to prevent server crash (e.g., Puppeteer failures)
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  // Don't exit - keep the server running
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason?.message || reason);
  // Don't exit - keep the server running
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
