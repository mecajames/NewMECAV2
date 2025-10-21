# Development Guide

## Project Structure

```
src/
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   └── dashboards/     # Dashboard components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Third-party integrations
├── pages/              # Page components
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Development Workflow

### 1. Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NewMECAV2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.development .env
   # Edit .env with your Supabase credentials
   ```

### 2. Available Commands

- `npm run dev` - Start development server
- `npm run dev:staging` - Start with staging environment
- `npm run build` - Build for production
- `npm run build:staging` - Build for staging
- `npm run build:production` - Build for production (explicit)
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run preview` - Preview production build

### 3. Environment Configuration

The project supports multiple environments:

- **Development** (`.env.development`) - Local development
- **Staging** (`.env.staging`) - Testing environment
- **Production** (`.env.production`) - Live environment

### 4. Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Get your credentials** from the API settings:
   - Project URL: `Settings → API → Project URL`
   - Anon Key: `Settings → API → Project API keys → anon/public`

3. **Run database migrations**:
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref <your-project-ref>
   
   # Push migrations
   supabase db push
   ```

### 5. Database Schema

The project includes the following tables:
- `profiles` - User profiles and roles
- `events` - Car audio competition events
- `event_registrations` - Event registrations
- `competition_results` - Competition results
- `rulebooks` - Competition rulebooks

See `supabase/migrations/` for the complete schema.

## Architecture Decisions

### Why Frontend-Only with Supabase?

This project uses a **Frontend + BaaS (Backend-as-a-Service)** architecture:

**Benefits:**
- ✅ Faster development cycle
- ✅ Real-time features out of the box
- ✅ Built-in authentication and authorization
- ✅ Automatic API generation
- ✅ Row Level Security (RLS)
- ✅ Simple deployment

**When to consider a separate backend:**
- Complex business logic
- Third-party integrations
- Background processing
- Multiple client applications

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **Deployment**: Vercel/Netlify (frontend) + Supabase (backend)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run typecheck && npm run lint`
4. Submit a pull request