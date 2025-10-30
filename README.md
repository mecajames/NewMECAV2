# MECA V2 - Car Audio Competition Management Platform

A full-stack application for managing car audio competitions, built with React, Node.js, Express, MikroORM, and Supabase PostgreSQL.

## Project Structure

```
NewMECAV2/
├── apps/
│   ├── frontend/          # React + Vite + TypeScript frontend
│   └── backend/           # Node.js + Express + MikroORM backend
├── packages/
│   └── shared/            # Shared types and utilities
└── supabase/              # Supabase migrations and config
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Supabase Client** for authentication

### Backend
- **Node.js** with TypeScript
- **Express** web framework
- **MikroORM** for database ORM
- **Supabase PostgreSQL** as database
- **Stripe** for payments
- **Twilio** for SMS notifications
- **SendGrid/Resend** for email

### Database
- **PostgreSQL** via Supabase
- Local development with Supabase CLI
- Cloud hosting on Supabase

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker Desktop (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Set Up Environment Variables

#### Frontend (`apps/frontend/.env.development`)
```bash
cp apps/frontend/.env.example apps/frontend/.env.development
```

Edit `apps/frontend/.env.development`:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
VITE_ENV=development
```

#### Backend (`apps/backend/.env`)
```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 3. Start Development

**Easy Mode - Start Everything:**
```bash
npm run dev:all
```

This will:
- ✅ Start Supabase locally
- ✅ Start backend API server (http://localhost:3001)
- ✅ Start frontend dev server (http://localhost:5173)

**Or start services individually:**
```bash
npm run supabase:start        # Start Supabase only
npm run dev:backend           # Backend only
npm run dev                   # Frontend only
```

### 4. Access Local Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Supabase Studio**: http://localhost:54323 (Database UI)
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Development Workflow

### Frontend Development
```bash
cd apps/frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run typecheck        # Type checking
npm run lint             # Lint code
```

### Backend Development
```bash
cd apps/backend
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm run typecheck        # Type checking
npm run mikro-orm        # MikroORM CLI
```

### Shared Types
The `packages/shared` package contains TypeScript types used by both frontend and backend. Changes to shared types will be automatically picked up by both apps.

## Database Management

### Local Development
```bash
supabase start           # Start local Supabase
supabase stop            # Stop local Supabase
supabase status          # Check service status
supabase db reset        # Reset database to migrations
```

### Migrations
```bash
cd supabase
supabase migration new <name>    # Create new migration
supabase db push                 # Push to remote database
```

## API Endpoints

The backend exposes RESTful API endpoints:

- `GET /health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `POST /api/registrations` - Register for event
- `POST /api/payments` - Process payment (Stripe)
- More endpoints to be documented...

## Environment Variables

### Frontend (.env)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (server-side only)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `EMAIL_PROVIDER` - Email service (sendgrid/resend)
- `SENDGRID_API_KEY` - SendGrid API key
- `CORS_ORIGIN` - Allowed CORS origins

## Building for Production

```bash
# Build all packages
npm run build

# Build specific apps
npm run build:frontend
npm run build:backend
```

## Deployment

### Frontend
The frontend can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- Static hosting

### Backend
The backend can be deployed to:
- Railway
- Render
- Fly.io
- DigitalOcean App Platform

### Database
Production database is hosted on Supabase Cloud:
- Project: garsyqgdjpryqleufrev
- URL: https://garsyqgdjpryqleufrev.supabase.co

## Testing

```bash
# Run tests (to be implemented)
npm test
```

## Troubleshooting

### Frontend shows white screen
- Check that `.env` has correct `VITE_SUPABASE_URL` (should be URL, not email)
- Verify Supabase project is accessible
- Check browser console for errors

### Backend can't connect to database
- Verify `DATABASE_URL` is correct
- Check that Supabase is running (`supabase status`)
- Ensure PostgreSQL port 54322 is not blocked

### MikroORM errors
- Run `npm run build` in backend to compile TypeScript
- Check that entities are properly defined with decorators
- Verify database schema matches entity definitions

## Contributing

1. Create a feature branch
2. Make changes
3. Run `npm run typecheck` and `npm run lint`
4. Test locally
5. Submit pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
