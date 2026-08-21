import app from './app.js';
import dotenv from 'dotenv';
import { checkAndNotifyAppRelease } from './services/appReleaseNotifier.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`
=====================================================
🚀 ZENEMOO Backend API Server Running on Port ${PORT}
🌐 API Base URL: http://localhost:${PORT}/api
⚡ Environment: ${process.env.NODE_ENV || 'development'}
=====================================================
  `);

  // Automatic App Release Notification Check
  try {
    await checkAndNotifyAppRelease();
  } catch (err) {
    console.warn('[App Release Check Error]:', err.message);
  }
});
