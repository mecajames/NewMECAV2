# MECA Car Audio Platform

> Mobile Electronics Competition Association - Official Platform for Car Audio Competitions

A modern, full-stack web application for managing car audio competitions, memberships, events, and results across the United States.

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Start everything (Supabase + Backend + Frontend)
npm run start:all
```

Visit http://localhost:5173 to see the application running.

## 📚 Documentation

All documentation has been organized into the **[docs/](./docs/)** directory:

### Essential Reading

- **[Getting Started Guide](./docs/getting-started/README.md)** - Full project overview and setup
- **[Developer Onboarding](./docs/getting-started/ONBOARDING.md)** - Architecture and development workflow
- **[Quick Commands](./docs/getting-started/QUICK-COMMANDS.md)** - Common commands reference

### Additional Documentation

- **[Deployment](./docs/deployment/)** - Production deployment, Docker, backups
- **[Frontend](./docs/frontend/)** - React/Vite setup and configuration
- **[Backend](./docs/backend/)** - NestJS and MikroORM setup
- **[Features](./docs/features/)** - Feature-specific documentation (e.g., reCAPTCHA)
- **[Scripts](./docs/scripts/)** - Utility scripts documentation

👉 **See the full [Documentation Index](./docs/README.md)** for all available guides.

## 🏗️ Architecture

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** NestJS + MikroORM + PostgreSQL
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Docker + Docker Compose

### Project Structure

```
NewMECAV2/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # React + Vite
├── docs/                 # 📚 All documentation
├── scripts/              # Utility scripts
└── supabase/            # Database migrations
```

## ✨ Features

- 🏆 **Event Management** - Create and manage car audio competitions
- 👥 **Member Portal** - Member registration, profiles, and memberships
- 📊 **Results Tracking** - Competition results and leaderboards
- 📅 **Event Calendar** - Browse upcoming and past events
- 📖 **Digital Rulebooks** - Official competition rules and guidelines
- 🎯 **Class Calculator** - Determine competition class eligibility
- 🛡️ **reCAPTCHA v3** - Spam protection for forms
- 🔐 **Role-Based Access** - Admin, Event Director, and User roles

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and builds
- Tailwind CSS for styling
- React Router for navigation
- Lucide React for icons

### Backend
- NestJS 10+ (Progressive Node.js framework)
- MikroORM 6.5+ (TypeScript-first ORM)
- PostgreSQL 15 (via Supabase)
- Decorator-based routing and DI

### Infrastructure
- Supabase for PostgreSQL, Auth, and Storage
- Docker for containerization
- Docker Compose for orchestration

## 📋 Prerequisites

- Node.js >= 18.0.0
- Docker Desktop
- Supabase CLI (optional, for database management)

## 🔧 Development

### Start All Services

```bash
npm run start:all
```

This command starts:
- Supabase (PostgreSQL + Auth + Storage)
- Backend API (localhost:3001)
- Frontend dev server (localhost:5173)

### Individual Services

```bash
# Backend only (requires Supabase running)
npm run dev:backend

# Frontend only (requires backend running)
npm run dev

# Supabase only
npm run supabase:start
```

### Useful Commands

```bash
# Install all dependencies
npm run install:all

# Build all workspaces
npm run build

# Type check all workspaces
npm run typecheck

# Database management
npm run supabase:start     # Start Supabase
npm run supabase:stop      # Stop Supabase
npm run supabase:status    # Check status
```

## 🌐 Environment Variables

### Backend (`apps/backend/.env`)
```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```

### Frontend (`apps/frontend/.env.development`)
```bash
VITE_API_URL=http://localhost:3001
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

See `.env.example` files in each directory for complete configuration options.

## 🧪 Testing

Access the application:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Supabase Studio:** http://localhost:54323

## 📦 Deployment

See the [Deployment Guide](./docs/deployment/DEPLOYMENT-GUIDE.md) for production deployment instructions.

Quick deploy with Docker:
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Read the [Developer Onboarding Guide](./docs/getting-started/ONBOARDING.md)
2. Follow the architecture patterns described in the documentation
3. Create feature branches and submit pull requests
4. Ensure all tests pass and documentation is updated

## 📖 Code Architecture

This project follows a **3-tier architecture** with clear separation of concerns:

**Backend (NestJS):**
```
Entity → Service (@Injectable) → Controller (@Controller) → Module (@Module)
```

**Frontend (React):**
```
API Client → Hooks → Components → Pages
```

See [ONBOARDING.md](./docs/getting-started/ONBOARDING.md) for detailed architecture guidelines.

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ reCAPTCHA v3 for form protection
- ✅ Role-based access control
- ✅ Backend validation for all requests
- ✅ Secure password hashing

## 📄 License

Copyright © 2025 MECA (Mobile Electronics Competition Association)

## 🆘 Support

- **Documentation:** [docs/](./docs/)
- **Issues:** Create an issue in the repository
- **Questions:** Contact the development team

---

**For complete documentation, see the [docs/](./docs/) directory.**

**Quick Links:**
- [Getting Started](./docs/getting-started/README.md)
- [Developer Onboarding](./docs/getting-started/ONBOARDING.md)
- [Deployment Guide](./docs/deployment/DEPLOYMENT-GUIDE.md)
- [Feature Documentation](./docs/features/)
