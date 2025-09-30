# MECACARAUDIO.COM Setup Guide

## Creating User Accounts

### Step 1: Sign Up a Regular User
1. Navigate to the Sign Up page
2. Enter:
   - Full Name: `Test User`
   - Email: `user@test.com`
   - Password: `password123`
3. Click "Create Account"

### Step 2: Sign Up an Admin User
1. Sign out (if logged in)
2. Navigate to the Sign Up page
3. Enter:
   - Full Name: `Admin User`
   - Email: `admin@test.com`
   - Password: `password123`
4. Click "Create Account"

### Step 3: Promote User to Admin

After creating the admin account, you need to update their role in the Supabase database:

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the Table Editor
3. Select the `profiles` table
4. Find the user with email `admin@test.com`
5. Edit the row and change the `role` field from `user` to `admin`
6. Save the changes

#### Option B: Using SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run this query (replace the email with your admin email):

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@test.com';
```

### Step 4: Creating Event Directors
To create an event director account:
1. Create a user account as normal
2. Update their role in the database to `event_director` using the same method as above

### Step 5: Creating Retailer Accounts
To create a retailer account:
1. Create a user account as normal
2. Update their role in the database to `retailer` using the same method as above

## Accessing Different Dashboards

### User Dashboard
- Sign in with a regular user account (role: `user`)
- Click "Dashboard" in the navigation menu
- You'll see:
  - Event registrations
  - Competition results
  - Personal statistics
  - Membership status

### Admin Dashboard
- Sign in with an admin account (role: `admin`)
- Click "Dashboard" in the navigation menu
- You'll see:
  - System statistics
  - Event management tools
  - Results entry interface
  - User management (coming soon)
  - Membership management (coming soon)

### Admin Features
As an admin, you can:
1. **Manage Events**: Create, edit, and delete events
2. **Enter Results**: Add competition results for any event
3. **View All Data**: Access all registrations and results

### Event Director Dashboard
- Sign in with an event director account (role: `event_director`)
- Click "Dashboard" in the navigation menu
- You'll see:
  - Your managed events
  - Event statistics
  - Quick actions for event management

### Retailer Dashboard
- Sign in with a retailer account (role: `retailer`)
- Click "Dashboard" in the navigation menu
- You'll see:
  - Retailer/manufacturer portal
  - Product listing framework (to be implemented)
  - Sponsorship opportunities

## Testing the Application

### Test Event Creation (Admin Only)
1. Sign in as admin
2. Go to Dashboard
3. Click "Manage Events"
4. Click "Create Event"
5. Fill in event details:
   - Title: "Test Car Audio Competition"
   - Event Date: Pick a future date
   - Venue Name: "Test Venue"
   - Venue Address: "123 Main St, City, State"
   - Status: "upcoming"
6. Save the event

### Test Event Registration
1. Sign in as a regular user (or as guest)
2. Navigate to "Events"
3. Click on an event
4. Click "Pre-Register for This Event"
5. Fill in the registration form
6. Submit

### Test Results Entry (Admin/Event Director)
1. Sign in as admin or event director
2. Go to Dashboard
3. Click "Enter Results"
4. Select an event
5. Click "Add Result"
6. Fill in competitor information:
   - Competitor Name: "John Doe"
   - Class: "Pro"
   - Score: "150.5"
   - Placement: "1"
   - Points Earned: "100"
7. Click "Save All Results"

### Test Standings and Leaderboard
1. After entering some results, navigate to "Standings"
2. Filter by competition class
3. Check the "Top 10" page for overall rankings

## Adding Rulebooks (Admin Only)

To add rulebooks to the system, you'll need to insert data directly into the database:

```sql
INSERT INTO rulebooks (title, description, year, category, pdf_url, summary_points, is_active, display_order)
VALUES (
  '2025 MECA SPL Rule Book',
  'Official rules and regulations for Sound Pressure League competitions',
  2025,
  'SPL',
  'https://example.com/path-to-rulebook.pdf',
  '["Points are accumulated throughout the season", "Teams must consist of 2-5 members", "All vehicles must pass safety inspection"]'::jsonb,
  true,
  1
);
```

## Troubleshooting

### Can't see Dashboard
- Make sure you're signed in
- Check that your user profile was created (check the `profiles` table)

### Admin features not showing
- Verify your user role is set to `admin` in the `profiles` table
- Sign out and sign back in after changing the role

### Results not showing
- Make sure you've entered results for completed events
- Check that the event status is set correctly

## Environment Variables

Make sure your `.env` file contains:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Quick Test Accounts

Create these accounts for testing:

1. **Admin Account**
   - Email: `admin@mecacaraudio.com`
   - Password: `admin123456`
   - Role: `admin` (update in database)

2. **Event Director Account**
   - Email: `director@mecacaraudio.com`
   - Password: `director123`
   - Role: `event_director` (update in database)

3. **Regular User Account**
   - Email: `user@mecacaraudio.com`
   - Password: `user123456`
   - Role: `user` (default)

4. **Retailer Account**
   - Email: `retailer@mecacaraudio.com`
   - Password: `retailer123`
   - Role: `retailer` (update in database)
