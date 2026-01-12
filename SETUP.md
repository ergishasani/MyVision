# Setup Guide

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myvision_invoicing?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@myvision.com

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# App
APP_URL=http://localhost:3001
```

## Database Setup

1. Install PostgreSQL if not already installed
2. Create a database:
   ```sql
   CREATE DATABASE myvision_invoicing;
   ```
3. Update the `DATABASE_URL` in your `.env` file
4. Run migrations:
   ```bash
   cd backend
   npm run db:generate
   npm run db:migrate
   ```

## Installation Steps

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Or install all at once:
   ```bash
   npm run install:all
   ```

## Running the Application

### Development Mode

From the root directory:
```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend app on http://localhost:5173

### Individual Services

Backend only:
```bash
npm run dev:backend
```

Frontend only:
```bash
npm run dev:frontend
```

## Database Management

### Prisma Studio (Database GUI)
```bash
cd backend
npm run db:studio
```

### Create Migration
```bash
cd backend
npm run db:migrate
```

### Generate Prisma Client
```bash
cd backend
npm run db:generate
```
