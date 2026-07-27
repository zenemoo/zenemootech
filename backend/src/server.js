import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
=====================================================
🚀 ZENEMOO Backend API Server Running on Port ${PORT}
🌐 API Base URL: http://localhost:${PORT}/api
⚡ Environment: ${process.env.NODE_ENV || 'development'}
=====================================================
  `);
});
