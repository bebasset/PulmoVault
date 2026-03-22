import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { helmetMiddleware, generalLimiter, noParamPollution, sanitizeNullBytes } from './middleware/security';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import routes from './routes/index';

const app = express();

// ── Security middleware (order matters) ─────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmetMiddleware);
app.use(cors({
  origin: env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
}));
app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(sanitizeNullBytes);
app.use(noParamPollution);
app.use(generalLimiter);

// ── Logging ─────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 & error handlers ────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { err });
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(env.PORT);

connectDatabase()
  .then(() => {
    app.listen(PORT, () => logger.info(`PulmoVault API running on port ${PORT}`));
  })
  .catch((err) => {
    logger.error('Failed to start server', { err });
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export default app;
