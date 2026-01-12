# Deployment Guide

## Pre-Deployment Checklist

### Environment Setup
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Stripe API keys configured (production)
- [ ] SMTP email settings configured
- [ ] Frontend URL set correctly
- [ ] SSL certificates obtained

### Security
- [ ] JWT_SECRET is strong and unique
- [ ] Database credentials are secure
- [ ] API keys are not committed to repository
- [ ] CORS is configured for production domain
- [ ] Rate limiting implemented (recommended)

### Testing
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Performance testing done
- [ ] Security audit completed

## Backend Deployment

### Option 1: Traditional Server (VPS/Cloud)

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt-get install postgresql postgresql-contrib
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Application Setup**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd myvision-invoicing-mvp/backend
   
   # Install dependencies
   npm install
   
   # Set up environment
   cp .env.example .env
   # Edit .env with production values
   
   # Run migrations
   npm run db:generate
   npm run db:migrate
   
   # Build application
   npm run build
   ```

3. **Start with PM2**
   ```bash
   pm2 start dist/index.js --name myvision-api
   pm2 save
   pm2 startup
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Platform as a Service (PaaS)

#### Heroku
```bash
# Install Heroku CLI
# Create app
heroku create myvision-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set STRIPE_SECRET_KEY=your-key
# ... other variables

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate
```

#### Railway
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Add PostgreSQL service
4. Deploy automatically on push

#### Render
1. Create new Web Service
2. Connect repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add PostgreSQL database
6. Configure environment variables

## Frontend Deployment

### Option 1: Static Hosting (Vercel/Netlify)

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard
VITE_API_URL=https://api.yourdomain.com
```

#### Netlify
1. Connect GitHub repository
2. Set build command: `cd frontend && npm run build`
3. Set publish directory: `frontend/dist`
4. Add environment variables in dashboard

### Option 2: Traditional Server

1. **Build Application**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/frontend/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:3001;
       }
   }
   ```

## Database Setup

### Production Database
```sql
-- Create database
CREATE DATABASE myvision_invoicing_prod;

-- Create user
CREATE USER myvision_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE myvision_invoicing_prod TO myvision_user;
```

### Run Migrations
```bash
cd backend
npm run db:migrate
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# JWT
JWT_SECRET="production-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=production

# Email
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_key

# Frontend
FRONTEND_URL=https://yourdomain.com

# App
APP_URL=https://api.yourdomain.com
```

### Frontend (.env.production)
```env
VITE_API_URL=https://api.yourdomain.com
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/subscriptions/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

## Monitoring & Logging

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Health Check Endpoint
- Backend: `GET /api/health`
- Monitor this endpoint for uptime

## Backup Strategy

### Database Backups
```bash
# Daily backup script
pg_dump -U user -d database > backup_$(date +%Y%m%d).sql

# Restore
psql -U user -d database < backup_20240101.sql
```

### Automated Backups
- Set up cron job for daily backups
- Store backups in cloud storage (S3, etc.)
- Test restore procedure regularly

## Post-Deployment

1. **Verify Deployment**
   - [ ] Health check endpoint responds
   - [ ] Frontend loads correctly
   - [ ] API endpoints work
   - [ ] Database connection works
   - [ ] Email sending works
   - [ ] Stripe webhooks work

2. **Performance**
   - [ ] Enable gzip compression
   - [ ] Set up CDN for static assets
   - [ ] Configure caching headers
   - [ ] Monitor response times

3. **Security**
   - [ ] Enable HTTPS
   - [ ] Set security headers
   - [ ] Configure rate limiting
   - [ ] Set up firewall rules

4. **Monitoring**
   - [ ] Set up error tracking (Sentry, etc.)
   - [ ] Configure uptime monitoring
   - [ ] Set up log aggregation
   - [ ] Create alerts for critical errors

## Rollback Procedure

1. **Backend Rollback**
   ```bash
   # Revert to previous version
   git checkout <previous-commit>
   npm run build
   pm2 restart myvision-api
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup
   psql -U user -d database < backup.sql
   ```

## Scaling Considerations

- **Horizontal Scaling**: Use load balancer with multiple instances
- **Database**: Consider read replicas for heavy read workloads
- **Caching**: Implement Redis for session storage and caching
- **CDN**: Use CDN for static assets and media files
- **Queue**: Implement job queue (Bull/BullMQ) for email sending

## Support & Maintenance

- Set up monitoring dashboards
- Create runbooks for common issues
- Document incident response procedures
- Schedule regular security updates
- Plan for database maintenance windows
