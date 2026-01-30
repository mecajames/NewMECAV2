 MECA Judge & Event Director System - Implementation Plan

  Phase 1: Database Foundation & Core Infrastructure

  Goal: Create all database tables, migrations, and shared utilities

  Backend Tasks

  1. Add judge role to UserRole enum (packages/shared/src/schemas/enums.schema.ts)
  2. Create database migrations for:
    - judge_applications table
    - judge_application_references table
    - judges table (approved judges)
    - judge_level_history table
    - judge_season_qualifications table
    - event_director_applications table
    - event_director_application_references table
    - event_directors table (approved EDs)
    - event_director_season_qualifications table
    - event_judge_assignments table
    - ratings table
    - email_verification_tokens table (for non-logged-in application flow)
  3. Create MikroORM entities for all new tables
  4. Create shared Zod schemas for DTOs (packages/shared/src/schemas/)
    - Judge application schemas
    - Event Director application schemas
    - Rating schemas
    - Assignment schemas

  Frontend Tasks

  - None in this phase

  Deliverable

  - All database tables created and entities defined
  - Can verify via database inspection

  ---
  Phase 2: Judge Application System (Public-Facing)

  Goal: Allow members to apply to become judges

  Backend Tasks

  1. Create judge-applications module:
    - judge-applications.entity.ts
    - judge-application-references.entity.ts
    - judge-applications.service.ts
    - judge-applications.controller.ts
    - judge-applications.module.ts
  2. API Endpoints:
    - GET /api/judges/apply/can-apply - Check if user can apply (logged in + active membership)
    - POST /api/judges/apply/verify-email - Send verification email (non-logged-in flow)
    - GET /api/judges/apply/verify/:token - Verify email token
    - POST /api/judges/apply - Submit application
    - GET /api/judges/apply/status - Check own application status
  3. Email templates:
    - Judge application email verification
    - Judge application received confirmation

  Frontend Tasks

  1. Create public information page: /judges/become-a-judge
    - Hero section
    - Why become a judge
    - What we look for
    - Application process
    - Judge levels explanation
    - CTA button
  2. Create email verification page: /judges/apply/verify
    - Display for non-logged-in users only
    - Send verification email button
  3. Create application form: /judges/apply
    - Multi-step wizard with sections:
        - Personal Information
      - Headshot Upload
      - Location & Availability
      - Experience & Qualifications
      - Specialties
      - References (0-5, optional but encouraged)
      - Additional Information (essays)
      - Acknowledgments
    - Progress indicator
    - Form validation
    - Submit and confirmation
  4. Create application status page: /judges/apply/status
    - Show current application status
    - Application reference number

  Deliverable

  - Members can visit info page and apply to become judges
  - Applications stored in database with "Pending" status
  - Confirmation email sent on submission

  ---
  Phase 3: Admin - Judge Application Management

  Goal: Admins can review, approve, and reject judge applications

  Backend Tasks

  1. Create judges module (approved judges):
    - judges.entity.ts
    - judges.service.ts
    - judges.controller.ts
    - judges.module.ts
  2. Admin API Endpoints:
    - GET /api/admin/judges/applications - List all applications (with filters)
    - GET /api/admin/judges/applications/:id - Single application detail
    - POST /api/admin/judges/applications - Create application on behalf of member
    - PUT /api/admin/judges/applications/:id - Update status (approve/reject)
    - PUT /api/admin/judges/applications/:id/references/:refId - Update reference check
    - POST /api/admin/judges - Create judge directly (expedited)
    - GET /api/admin/judges - List approved judges
    - GET /api/admin/judges/:id - Single judge detail
  3. Email templates:
    - Application approved notification (optional, checkbox controlled)

  Frontend Tasks

  1. Create admin applications list page: /admin/judges/applications
    - Table with columns: Application Date, Name, Location, Specialty, Age, References count, Status
    - Filters: Status, Location, Specialty, Age Range, Date Range, Has References
    - Bulk actions: Mark Under Review, Export CSV
  2. Create admin application detail page: /admin/judges/applications/:id
    - Full application display
    - Reference check tracking
    - Admin notes section
    - Status action buttons (Pending → Under Review → Approve/Reject)
    - "Entered by Admin" indicator if applicable
  3. Create admin "Create Application" modal/page
    - Member search/select
    - Same form fields as public application
    - "Notify Applicant" checkbox
  4. Create admin judges list page: /admin/judges
    - Table with columns: Name, Level, Location, Specialty, Season Status, Events Judged, Rating
    - Filters: Level, Status, Location, Specialty, Rating Range
  5. Create admin judge detail page: /admin/judges/:id
    - Profile header with headshot
    - Contact information
    - Qualifications & Level
    - Admin notes
    - View original application link
    - Actions: Change Level, Activate/Deactivate
  6. Add navigation items to admin sidebar:
    - Judges section with Applications and Judges List

  Deliverable

  - Admins can view, review, approve/reject applications
  - Admins can create applications on behalf of members
  - Admins can directly add judges (expedited)
  - Approved judges appear in judges list

  ---
  Phase 4: Event Director Application & Management

  Goal: Parallel system for Event Directors

  Backend Tasks

  1. Create event-director-applications module:
    - Similar structure to judge applications
    - ED-specific fields (event management experience, team experience, equipment)
  2. Create event-directors module (approved EDs):
    - event-directors.entity.ts
    - event-directors.service.ts
    - event-directors.controller.ts
  3. API Endpoints (mirror judge endpoints):
    - GET/POST /api/event-directors/apply/*
    - GET/POST/PUT /api/admin/event-directors/applications/*
    - GET/POST/PUT /api/admin/event-directors/*

  Frontend Tasks

  1. Create ED public pages:
    - /event-directors/become-an-event-director - Info page
    - /event-directors/apply - Application form (ED-specific fields)
    - /event-directors/apply/status - Status check
  2. Create admin ED pages:
    - /admin/event-directors/applications - Applications list
    - /admin/event-directors/applications/:id - Application detail
    - /admin/event-directors - Approved EDs list
    - /admin/event-directors/:id - ED detail page
  3. Add navigation items to admin sidebar:
    - Event Directors section

  Deliverable

  - Full ED application and admin management system
  - Mirrors judge system with ED-specific fields

  ---
  Phase 5: Judge & ED Dashboard Integration

  Goal: Approved Judges/EDs can manage their profiles from their member dashboard

  Backend Tasks

  1. API Endpoints for self-management:
    - GET /api/judges/me - Get own judge profile
    - PUT /api/judges/me - Update own profile (bio, headshot, availability)
    - GET /api/event-directors/me - Get own ED profile
    - PUT /api/event-directors/me - Update own profile
  2. API to check if user is Judge/ED:
    - GET /api/users/me/roles - Returns { isJudge: boolean, isEventDirector: boolean }

  Frontend Tasks

  1. Update member dashboard navigation:
    - Conditionally show "Judge Profile" tab if user is approved judge
    - Conditionally show "Event Director Profile" tab if user is approved ED
  2. Create Judge Profile tab content:
    - Headshot management (upload, preview, crop)
    - Bio editor
    - Public profile preview
    - Availability settings
    - Travel radius & regions
    - View statistics (events judged, rating)
  3. Create Event Director Profile tab content:
    - Similar to Judge Profile
    - ED-specific fields

  Deliverable

  - Approved Judges see "Judge Profile" tab in their dashboard
  - Approved EDs see "Event Director Profile" tab
  - Users can manage their Judge/ED profiles

  ---
  Phase 6: Seasonal Qualification Management

  Goal: Track and manage seasonal qualifications for Judges/EDs

  Backend Tasks

  1. Create season qualification services:
    - judge-season-qualifications.service.ts
    - event-director-season-qualifications.service.ts
  2. API Endpoints:
    - POST /api/admin/judges/:id/qualify - Qualify judge for season
    - POST /api/admin/judges/bulk-qualify - Bulk qualify judges
    - GET /api/admin/judges/:id/seasons - Get qualification history
    - Same for Event Directors

  Frontend Tasks

  1. Update admin judge detail page:
    - Season qualifications section
    - Qualify for season action
    - Qualification history table
  2. Update admin judges list:
    - Season Status column
    - Bulk qualify action
    - Filter by season status
  3. Same updates for Event Directors

  Deliverable

  - Admins can qualify Judges/EDs for seasons
  - Bulk qualification support
  - Season status visible in lists

  ---
  Phase 7: Event Integration & Judge Assignments

  Goal: Assign judges to events, update ED assignment to use approved EDs

  Backend Tasks

  1. Create event assignments service:
    - event-judge-assignments.service.ts
  2. API Endpoints:
    - GET /api/admin/events/:id/judges - Get judges assigned to event
    - POST /api/admin/events/:id/judges - Assign judge to event
    - PUT /api/admin/assignments/:id - Update assignment status
    - DELETE /api/admin/assignments/:id - Remove assignment
    - GET /api/judges/events/available - Events available to work (for judges)
    - POST /api/judges/events/:eventId/volunteer - Request to work event
    - PUT /api/judges/events/:assignmentId/respond - Accept/decline
  3. Update event service:
    - Modify event director field to validate against approved EDs

  Frontend Tasks

  1. Update admin event detail/edit page:
    - Event Director dropdown shows only approved EDs
    - Judge assignments section
    - Add/remove judges modal
    - Judge role selection (Primary, Supporting, Trainee)
  2. Create judge "Available Events" view:
    - In judge dashboard tab
    - List events in travel radius
    - Filter by date, format, location
    - "Request to Work" button
  3. Create judge "My Assignments" view:
    - In judge dashboard tab
    - Upcoming events
    - Past events
    - Pending requests
  4. Create ED "My Events" view (view only):
    - Events assigned as ED
    - View judges assigned to their events

  Deliverable

  - Admins can assign judges to events
  - ED dropdown on events only shows approved EDs
  - Judges can view available events and volunteer
  - Judges can see their assignments
  - EDs can view their events and assigned judges

  ---
  Phase 8: Public Directories

  Goal: Public-facing directories for Judges and Event Directors

  Backend Tasks

  1. API Endpoints (public):
    - GET /api/judges/directory - List approved judges (public info only)
    - GET /api/judges/directory/:id - Single judge public profile
    - GET /api/event-directors/directory - List approved EDs
    - GET /api/event-directors/directory/:id - Single ED public profile

  Frontend Tasks

  1. Create public judges directory: /judges or /judges/directory
    - Search by name
    - Filter by location, specialty, level
    - Sort by name, rating, events judged
    - Card-based layout with headshot, name, level, location, rating
    - Pagination or infinite scroll
  2. Create public judge profile: /judges/:id
    - Large headshot
    - Name, level, location
    - Bio
    - Specialty badges
    - Statistics (years as judge, events judged)
    - Rating display
    - Recent events judged
    - "Rate This Judge" button (if eligible)
  3. Create public ED directory: /event-directors
    - Same structure as judges directory
  4. Create public ED profile: /event-directors/:id
    - Same structure as judge profile
  5. Add navigation links:
    - Main site navigation to directories

  Deliverable

  - Public can browse judge and ED directories
  - Public can view individual profiles
  - Headshots only shown for approved Judges/EDs

  ---
  Phase 9: Rating System

  Goal: Allow eligible users to rate Judges and Event Directors

  Backend Tasks

  1. Create ratings module:
    - ratings.entity.ts
    - ratings.service.ts
    - ratings.controller.ts
  2. API Endpoints:
    - POST /api/ratings - Submit rating
    - GET /api/ratings/eligible - Get entities user can rate
    - GET /api/admin/ratings - Admin view all ratings
    - DELETE /api/admin/ratings/:id - Admin remove fraudulent rating
  3. Eligibility logic:
    - Check event_registrations for competitor participation
    - Check competition_results for completed competitions
    - Check event_judge_assignments for judge/ED working same event
    - Enforce 30-day rating window
    - One rating per person per event

  Frontend Tasks

  1. Create rating submission modal:
    - Triggered from "Rate This Judge/ED" button
    - Show judge/ED photo and name
    - Event selector (events eligible to rate for)
    - 5-star selector
    - Submit button
    - Anonymous notice
  2. Add rating displays:
    - Public profiles: Average rating, star visualization, count
    - Admin views: Individual ratings list, ability to remove
  3. Add "Rate" buttons:
    - On public judge/ED profiles (if eligible)
    - Post-event prompt (optional enhancement)

  Deliverable

  - Users can rate judges/EDs they've interacted with
  - Ratings displayed on public profiles
  - Admins can manage ratings

  ---
  Phase 10: Enhanced Features & Polish

  Goal: Level progression, availability management, statistics, bulk operations

  Backend Tasks

  1. Judge level management:
    - Level change tracking
    - PUT /api/admin/judges/:id/level - Change level with reason
  2. Availability management:
    - PUT /api/judges/me/availability - Update availability calendar/preferences
  3. Statistics aggregation:
    - Events judged by format
    - Events by region
    - Event Directors worked with

  Frontend Tasks

  1. Admin judge level management:
    - Level change modal with reason
    - Level history display
  2. Bulk operations:
    - Bulk level change
    - Export to CSV
    - Bulk status change
  3. Availability calendar:
    - In judge dashboard
    - Mark available/unavailable dates
    - Set recurring availability
  4. Enhanced statistics:
    - Admin dashboard widgets for judge/ED counts
    - Judge performance statistics
    - Event coverage reports
  5. Email notification preferences:
    - Judges/EDs can set notification preferences

  Deliverable

  - Complete level progression tracking
  - Availability management
  - Comprehensive statistics
  - Full bulk operation support

  ---
  Summary by Phase

  | Phase | Description                | Est. Complexity            |
  |-------|----------------------------|----------------------------|
  | 1     | Database Foundation        | Medium                     |
  | 2     | Judge Application (Public) | Medium                     |
  | 3     | Admin Judge Management     | High                       |
  | 4     | Event Director System      | Medium (mirrors Phase 2-3) |
  | 5     | Dashboard Integration      | Medium                     |
  | 6     | Seasonal Qualification     | Low-Medium                 |
  | 7     | Event Integration          | High                       |
  | 8     | Public Directories         | Medium                     |
  | 9     | Rating System              | Medium                     |
  | 10    | Enhanced Features          | Medium                     |
