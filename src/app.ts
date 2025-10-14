import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerOptions } from './config/swagger';
import { tokenCleanupJob } from './jobs/token_cleanup.job';
import { deviceInfoMiddleware } from './middleware/deviceInfo.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import mobileAuthRoutes from './routes/mobileAuth.routes';
import passwordRoutes from './routes/password.routes';
import sessionRoutes from './routes/session.routes';
import twoFactorRoutes from './routes/twoFactor.routes';
import webhookRoutes from './routes/webhook.routes';
import { ApiError } from './utils/ApiError';
import { apiLimiter, authLimiter, loginLimiter } from './utils/rateLimit';

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(cors());
// {
//   origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || 'http:// 10.150.164.18:8081',
//   credentials: true,
// }
app.use(cookieParser());
app.use(deviceInfoMiddleware);
app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, res, buf) => {
      if (req.originalUrl.startsWith('/api/v1/webhooks')) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(express.static('public'));

app.use('/api/', apiLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/mobile/auth', authLimiter);
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/mobile/auth/login', loginLimiter);

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', healthRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/v1/2fa', twoFactorRoutes);
app.use('/api/v1/mobile/auth', mobileAuthRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

app.get('/', (req, res) => {
  res.redirect('/api/v1/docs');
});

// Handle 404 errors
app.use((req, res, next) => {
  next(new ApiError(404, 'Route not found'));
});

// Error handling middleware
app.use(errorMiddleware);

// Start cron jobs
tokenCleanupJob.start();

export default app;
