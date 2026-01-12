# MyVision Invoicing MVP

Professional document builder with parametric SVG rendering for windows, doors, and shutters.

## Project Overview

This MVP enables users to create professional invoices and quotes with technical specifications and parametric SVG visualizations.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Authentication**: JWT-based
- **PDF Generation**: PDFKit
- **Payments**: Stripe
- **Email**: Nodemailer

## Project Structure

```
.
├── backend/          # Node.js/Express API
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/         # React application
│   ├── src/
│   └── package.json
└── package.json      # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. Set up database:
```bash
cd backend
npm run db:generate
npm run db:migrate
```

4. Start development servers:
```bash
# From root directory
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend app on http://localhost:5173

## Development Tasks

See the project plan for 15 tasks covering:
1. ✅ Setup Tech Stack
2. Define Document Schema
3. Build Authentication System
4. Document Builder UI
5. Parametric SVG Rendering Engine
6. PDF Generation
7. Online Document Viewer
8. Email Sending & Audit Trail
9. Dashboard Implementation
10. Client Management CRUD
11. Stripe Subscription Integration
12. Landing / Marketing Page
13. Account Settings Page
14. Testing & QA
15. Pilot Launch

## Critical Path

The critical path for MVP delivery:
1. Setup Tech Stack ✅
2. Define Document Schema
3. Document Builder UI
4. Parametric SVG Rendering Engine
5. PDF Generation
6. Testing & QA
7. Pilot Launch

## Notes

- Total estimated hours: 370
- Timeframe: 8 weeks
- Single developer focus
- Strict scope adherence required

## License

Private - All rights reserved
