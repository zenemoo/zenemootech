import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import subscriberRoutes from './routes/subscriberRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import opportunityApplicationRoutes from './routes/opportunityApplicationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminHrAiRoutes from './routes/adminHrAiRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import userManagementRoutes from './routes/userManagementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import teamDirectoryRoutes from './routes/teamDirectoryRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import brandingRoutes from './routes/brandingRoutes.js';
import talentRegistrationRoutes from './routes/talentRegistrationRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import emailInboxRoutes from './routes/emailInboxRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Robust CORS configuration supporting localhost dev and production domains
const allowedOrigins = [
  'https://www.zenemoo.in',
  'https://zenemoo.in',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    exposedHeaders: ['X-New-Token'],
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Health Check API Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'ZENEMOO Data Solutions API Server',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'ZENEMOO Data Solutions API Server',
    timestamp: new Date().toISOString(),
  });
});

// Explicit Android APK Download Handlers
app.get(['/downloads/zenemoo-latest.apk', '/downloads/:filename', '/api/downloads/zenemoo-latest.apk'], (req, res, next) => {
  const candidatePaths = [
    path.resolve(process.cwd(), '../frontend/public/downloads/zenemoo-latest.apk'),
    path.resolve(process.cwd(), 'frontend/public/downloads/zenemoo-latest.apk'),
    path.resolve(process.cwd(), '../frontend/dist/downloads/zenemoo-latest.apk'),
    path.resolve(process.cwd(), 'frontend/dist/downloads/zenemoo-latest.apk'),
    path.resolve(process.cwd(), 'public/downloads/zenemoo-latest.apk'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="zenemoo-latest.apk"');
      return res.sendFile(p);
    }
  }
  next();
});

// Mounting API Routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/opportunity-applications', opportunityApplicationRoutes);
app.use('/api/talent-registration', talentRegistrationRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/subscribe', subscriberRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin-hr-ai', adminHrAiRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/directory', teamDirectoryRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/bookings', bookingRoutes);
app.use('/api/emails', emailInboxRoutes);
app.use('/api/admin', exportRoutes);
app.use('/api/export', exportRoutes);

// Root Fallback Aliases
app.use('/datasets', datasetRoutes);
app.use('/bookings', bookingRoutes);
app.use('/30min', bookingRoutes);

// Root Fallback Aliases
app.use('/auth', authRoutes);
app.use('/team', teamRoutes);
app.use('/users', userManagementRoutes);
app.use('/notifications', notificationRoutes);
app.use('/directory', teamDirectoryRoutes);
app.use('/services', serviceRoutes);
app.use('/partners', partnerRoutes);
app.use('/opportunities', opportunityRoutes);
app.use('/opportunity-applications', opportunityApplicationRoutes);
app.use('/talent-registration', talentRegistrationRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/blog', blogRoutes);
app.use('/contact', contactRoutes);
app.use('/contacts', contactRoutes);
app.use('/subscribers', subscriberRoutes);
app.use('/subscribe', subscriberRoutes);
app.use('/settings', settingsRoutes);
app.use('/branding', brandingRoutes);
app.use('/upload', uploadRoutes);
app.use('/media', uploadRoutes);
app.use('/ai', aiRoutes);
app.use('/email', emailRoutes);
app.use('/support', supportRoutes);

// Global 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
