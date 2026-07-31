import express from 'express';
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
import emailRoutes from './routes/emailRoutes.js';
import userManagementRoutes from './routes/userManagementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Global Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true, exposedHeaders: ['X-New-Token'] }));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

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

// Mounting API Routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/opportunity-applications', opportunityApplicationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/subscribe', subscriberRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/email', emailRoutes);

// Root Fallback Aliases
app.use('/auth', authRoutes);
app.use('/team', teamRoutes);
app.use('/users', userManagementRoutes);
app.use('/notifications', notificationRoutes);
app.use('/services', serviceRoutes);
app.use('/partners', partnerRoutes);
app.use('/opportunities', opportunityRoutes);
app.use('/opportunity-applications', opportunityApplicationRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/blog', blogRoutes);
app.use('/contact', contactRoutes);
app.use('/contacts', contactRoutes);
app.use('/subscribers', subscriberRoutes);
app.use('/subscribe', subscriberRoutes);
app.use('/settings', settingsRoutes);
app.use('/upload', uploadRoutes);
app.use('/media', uploadRoutes);
app.use('/ai', aiRoutes);
app.use('/email', emailRoutes);

// Global 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
