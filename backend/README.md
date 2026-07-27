# ZENEMOO Backend API Server

Express.js REST API server for ZENEMOO Data Solutions platform powered by Supabase PostgreSQL and Cloudinary CDN.

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Run Locally
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints Summary

- **Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/profile`
- **Team**: `GET /api/team`, `POST /api/team`, `PUT /api/team/:id`, `DELETE /api/team/:id`
- **Services**: `GET /api/services`, `POST /api/services`, `PUT /api/services/:id`, `DELETE /api/services/:id`
- **Portfolio**: `GET /api/portfolio`, `POST /api/portfolio`
- **Blog**: `GET /api/blog`, `POST /api/blog`
- **Contact**: `POST /api/contact`
- **Settings**: `GET /api/settings`, `PUT /api/settings`
- **Upload**: `POST /api/upload`, `DELETE /api/upload/:id`
