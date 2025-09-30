# Quick Start Guide - Testing Admin & User Dashboards

## 🚀 Fast Track: 3-Step Setup

### Step 1: Create Accounts (2 minutes)

Visit the Sign Up page and create these accounts:

| Account Type | Email | Password | Full Name |
|-------------|-------|----------|-----------|
| Regular User | `user@mecacaraudio.com` | `user123456` | Test User |
| Admin | `admin@mecacaraudio.com` | `admin123456` | Admin User |

### Step 2: Promote Admin (1 minute)

Go to your Supabase Dashboard → SQL Editor and run:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@mecacaraudio.com';
```

### Step 3: Test Both Dashboards

**User Dashboard:**
1. Sign in with `user@mecacaraudio.com` / `user123456`
2. Click "Dashboard" in the navigation
3. See: Event registrations, results, and personal stats

**Admin Dashboard:**
1. Sign out
2. Sign in with `admin@mecacaraudio.com` / `admin123456`
3. Click "Dashboard" in the navigation
4. See: System stats and management tools
5. Click "Manage Events" to create events
6. Click "Enter Results" to add competition results

## 📝 What You Can Test

### As Admin User:
- ✅ Create events with full details
- ✅ Edit and delete events
- ✅ Enter competition results for any event
- ✅ View system-wide statistics
- ✅ See all registrations and results

### As Regular User:
- ✅ Pre-register for events
- ✅ View personal event history
- ✅ See competition results and stats
- ✅ Track total points and best placements

### As Guest (Not Logged In):
- ✅ Browse events calendar
- ✅ View event details
- ✅ Pre-register as guest
- ✅ View results and standings
- ✅ Check Top 10 leaderboard
- ✅ Read rulebooks

## 🎯 Quick Test Workflow

1. **Sign in as Admin** → Create 2-3 test events
2. **Sign out** → Browse events as guest
3. **Sign in as User** → Pre-register for an event
4. **Sign out** → Sign in as Admin again
5. **Go to Dashboard** → Enter Results → Add competition results
6. **Check "Standings"** and **"Top 10"** pages to see results

## 🔑 Test Credentials

```
Regular User:
  Email: user@mecacaraudio.com
  Password: user123456

Admin:
  Email: admin@mecacaraudio.com
  Password: admin123456
```

## ⚡ Pro Tips

- **Sign out and sign back in** after changing user roles
- **Create events as Admin** before testing registrations
- **Enter results for completed events** to populate leaderboards
- **Use different competition classes** to test standings filtering

## 🐛 Troubleshooting

**Dashboard not showing?**
- Make sure you're signed in
- Check the URL has `/dashboard` or click "Dashboard" in the nav

**Admin features missing?**
- Verify role is `admin` in Supabase profiles table
- Sign out and sign back in

**No events showing?**
- Create events as admin first
- Check event status filter

## 📞 Need Help?

Check the full README.md or SETUP_GUIDE.md for detailed instructions.
