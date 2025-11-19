# MECACARAUDIO.COM - Car Audio Competition Platform

A modern, full-featured car audio competition management system built with React, TypeScript, and Supabase.

## Features

- 🏠 **Public Homepage** with featured events
- 📅 **Event Calendar** with filtering and detailed event pages
- 🏆 **Competition Results** tracking and display
- 📊 **Standings** by competition class
- 🥇 **Top 10 Leaderboard** for overall rankings
- 📖 **Rulebooks Section** with PDF viewing
- 👤 **User Dashboards** (User, Admin, Event Director, Retailer)
- ✍️ **Event Pre-Registration** for members and guests
- 🔐 **Role-Based Access Control**
- 📱 **Responsive Design** for all devices

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Make sure your `.env` file contains your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Creating Test Accounts

### Step-by-Step Guide

#### 1. Create User Accounts via Sign Up

You need to create accounts through the application's Sign Up page first:

1. **Regular User Account**
   - Navigate to Sign Up
   - Email: `user@mecacaraudio.com`
   - Password: `user123456`
   - Full Name: `Test User`
   - Click "Create Account"

2. **Admin Account**
   - Sign out
   - Navigate to Sign Up
   - Email: `admin@mecacaraudio.com`
   - Password: `admin123456`
   - Full Name: `Admin User`
   - Click "Create Account"

3. **Event Director Account**
   - Sign out
   - Navigate to Sign Up
   - Email: `director@mecacaraudio.com`
   - Password: `director123`
   - Full Name: `Event Director`
   - Click "Create Account"

#### 2. Update User Roles in Supabase

After creating the accounts, you need to update their roles:

**Option A: Using Supabase Dashboard**
1. Open your Supabase project dashboard
2. Go to **Table Editor** → **profiles**
3. Find the user and click to edit
4. Change the `role` field:
   - For admin: change to `admin`
   - For event director: change to `event_director`
5. Save changes

**Option B: Using SQL Editor**
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste from `TEST_ACCOUNTS.sql`:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@mecacaraudio.com';
UPDATE profiles SET role = 'event_director' WHERE email = 'director@mecacaraudio.com';
```
4. Click "Run"

#### 3. Sign In and Test

Now you can sign in with different accounts to see different dashboards:

- **Regular User** (`user@mecacaraudio.com`) - See user dashboard with registrations and results
- **Admin** (`admin@mecacaraudio.com`) - Full access to event management, results entry, and system overview
- **Event Director** (`director@mecacaraudio.com`) - Manage own events and enter results

## Testing Different Features

### As Admin User

1. **Create an Event**
   - Sign in as admin
   - Go to Dashboard
   - Click "Manage Events"
   - Click "Create Event"
   - Fill in all required fields
   - Save

2. **Enter Competition Results**
   - Go to Dashboard
   - Click "Enter Results"
   - Select an event
   - Click "Add Result"
   - Fill in competitor details
   - Click "Save All Results"

### As Regular User

1. **Pre-Register for Event**
   - Sign in as regular user
   - Go to "Events"
   - Click on an event
   - Click "Pre-Register for This Event"
   - Fill in the form
   - Submit

2. **View Personal Dashboard**
   - Go to Dashboard
   - See your event registrations
   - View your competition results
   - Check your statistics

### As Guest (Not Logged In)

1. **Browse Events**
   - Navigate to "Events"
   - View event details
   - Pre-register as guest (without account)

2. **View Results and Standings**
   - Go to "Results" to see event results
   - Go to "Standings" to see class rankings
   - Go to "Top 10" to see overall leaderboard

## Database Structure

The application uses the following main tables:

- **profiles** - User accounts with role-based access
- **events** - Competition events
- **event_registrations** - Pre-registrations for events
- **competition_results** - Competition results and scores
- **memberships** - Membership purchase records
- **rulebooks** - Rulebook documents and PDFs

## User Roles

1. **user** (default) - Can register for events, view results, see personal dashboard
2. **event_director** - Can create/manage own events, enter results for own events
3. **admin** - Full system access, can manage all events and results
4. **retailer** - Special access for retailers/manufacturers (framework in place)

## Key Pages

- `/` - Homepage with featured events
- `/events` - Events calendar
- `/events/:id` - Event detail page
- `/results` - Competition results by event
- `/standings` - Point standings by class
- `/leaderboard` - Top 10 overall competitors
- `/rulebooks` - Rulebook documents
- `/dashboard` - Role-based dashboard
- `/login` - Sign in
- `/signup` - Create account

## Admin Dashboard Features

When signed in as admin, the dashboard provides:

1. **Event Management**
   - Create new events
   - Edit existing events
   - Delete events
   - Set event directors
   - Manage event status

2. **Results Entry**
   - Select event
   - Add multiple results at once
   - Search for registered competitors
   - Enter scores, placements, and points

3. **System Overview**
   - Total users count
   - Total events count
   - Registration statistics
   - Active members count

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint code
npm run lint
```

## Project Structure

```
src/
├── components/
│   ├── admin/              # Admin-specific components
│   │   ├── EventManagement.tsx
│   │   └── ResultsEntry.tsx
│   ├── dashboards/         # Dashboard components by role
│   │   ├── AdminDashboard.tsx
│   │   ├── UserDashboard.tsx
│   │   ├── EventDirectorDashboard.tsx
│   │   └── RetailerDashboard.tsx
│   └── Navbar.tsx          # Main navigation
├── contexts/
│   └── AuthContext.tsx     # Authentication state
├── lib/
│   └── supabase.ts         # Supabase client and types
├── pages/
│   ├── HomePage.tsx
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   ├── ResultsPage.tsx
│   ├── StandingsPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── RulebooksPage.tsx
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   └── SignUpPage.tsx
├── App.tsx                 # Main app component
└── main.tsx               # Entry point
```

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure authentication with Supabase Auth
- Protected admin and event director routes

## Support Files

- **SETUP_GUIDE.md** - Detailed setup instructions
- **TEST_ACCOUNTS.sql** - SQL scripts for creating test data

## Troubleshooting

### Can't see admin features
- Verify your role is set to `admin` in the profiles table
- Sign out and sign back in after changing roles

### Events not showing
- Make sure events exist in the database
- Check event status filters

### Results not displaying
- Ensure results are entered for completed events
- Verify event has results in the database

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Database, Auth, Storage)
- **Lucide React** - Icons

## License

Proprietary - MECACARAUDIO.COM

## Support

For support, please contact the MECA administrator.
