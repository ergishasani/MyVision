# Quick Start Guide

## Running the Application

### Prerequisites
- Node.js >= 18.0.0 installed
- npm >= 9.0.0 installed
- PostgreSQL database running (or use a cloud database)

### Step 1: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 2: Set Up Environment Variables

Create `backend/.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/myvision_invoicing?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:3001
```

### Step 3: Set Up Database

```bash
cd backend
npm run db:generate
npm run db:migrate
```

### Step 4: Start Backend Server

**Terminal 1:**
```bash
cd backend
npm run dev
```

The backend will start on http://localhost:3001

### Step 5: Start Frontend Server

**Terminal 2:**
```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:5173

### Step 6: Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api/health

## Troubleshooting

### Port Already in Use
If port 3001 or 5173 is already in use:
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.ts`

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env`
- Verify database exists: `CREATE DATABASE myvision_invoicing;`

### Module Not Found Errors
- Run `npm install` in both `backend` and `frontend` directories
- Delete `node_modules` and `package-lock.json`, then reinstall

### TypeScript Errors
- Run `npm run build` to check for compilation errors
- Ensure all dependencies are installed

## Development Tips

- Backend auto-reloads on file changes (using `tsx watch`)
- Frontend has hot module replacement (HMR)
- Check browser console for frontend errors
- Check terminal for backend errors
- Use `npm run db:studio` to view database in Prisma Studio
