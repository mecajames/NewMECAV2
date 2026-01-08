# MECA Judge & Event Director Management System
## Complete Development Specification for AI Developer Agent

---

## Executive Summary

Build a comprehensive Judge and Event Director management system for the MECA Car Audio competition platform. This system will manage the full lifecycle of judges and event directors from application through seasonal certification, event assignment, and public recognition. The system must integrate seamlessly with the existing application infrastructure, utilizing current database connections, APIs, user/member systems, events, and seasons.

**Critical Requirement**: Before creating any new tables, models, or API endpoints, thoroughly analyze the existing codebase to understand current patterns, naming conventions, and available resources. Reuse existing infrastructure wherever possible.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prerequisites & Dependencies](#2-prerequisites--dependencies)
3. [Judge Application System](#3-judge-application-system)
4. [Admin Dashboard - Judge Management](#4-admin-dashboard---judge-management)
5. [Approved Judges Management](#5-approved-judges-management)
6. [Judge Levels & Progression](#6-judge-levels--progression)
7. [Event Director System](#7-event-director-system)
8. [Event Assignment Workflow](#8-event-assignment-workflow)
9. [Public Directory](#9-public-directory)
10. [Rating System](#10-rating-system)
11. [Data Models](#11-data-models)
12. [API Endpoints](#12-api-endpoints)
13. [UI/UX Requirements](#13-uiux-requirements)
14. [Integration Points](#14-integration-points)
15. [Business Rules & Validation](#15-business-rules--validation)

---

## 1. System Overview

### 1.1 Purpose

Create an official, tracked system for managing MECA's pool of certified judges and event directors. Judges and event directors are independent contractors, not employees. This system establishes certification standards, tracks performance, and provides transparency to the MECA community.

### 1.2 Core User Roles

| Role | Description |
|------|-------------|
| **Public/Guest** | Can view public directory, informational pages |
| **MECA Member** | Can apply to become a judge or event director |
| **Judge (Approved)** | Can manage availability, request to work events, view assignments |
| **Event Director (Approved)** | Can view judge assignments, view their event assignments (uses existing `event_director` role) |
| **Admin** | Full system access: review applications, manage qualifications, assign events, create applications on behalf of members |

**Note:** The system already has an `event_director` role - use the existing role rather than creating a new one.

### 1.3 System Scope

**In Scope:**
- Judge recruitment and application pipeline
- Event Director recruitment and application pipeline
- Application review and approval workflow
- Admin ability to create applications on behalf of members
- Seasonal qualification management
- Judge level progression tracking
- Event assignment and tracking
- Performance statistics and history
- Public-facing directory with ratings
- Availability management
- Event volunteer/request system

**Out of Scope:**
- Payment/compensation tracking (handled externally)
- Background check integration (manual process)
- Event Director event management functionality (future development)

---

## 2. Prerequisites & Dependencies

### 2.1 Membership Requirement

**Critical Business Rule**: Only active MECA members can apply to become judges or event directors. The application process must verify membership status before allowing form submission.

**Implementation:**
- When user clicks "Apply to Become a Judge" or "Apply to Become an Event Director"
- System checks if user is logged in
- If not logged in → redirect to login with return URL
- If logged in → verify active membership status
- If no active membership → display message explaining requirement with link to membership signup
- If active membership AND already logged in → **proceed directly to application form** (skip email verification)
- If active membership AND coming from guest/public page → proceed with email verification step

### 2.2 Existing System Dependencies

The following existing system components must be utilized:

| Component | Usage |
|-----------|-------|
| **Users/Members** | Link judge/ED profiles to existing user accounts |
| **Events** | Attach judges and event directors to events |
| **Seasons** | Seasonal qualification tracking |
| **Authentication** | Use existing auth system for login/verification |
| **File Upload / Photo Gallery** | Use existing upload infrastructure; headshot is a separate image type in user's gallery |
| **Email System** | Use existing email infrastructure for verification |
| **Event Director Role** | Use existing `event_director` role - do not create a new role |

---

## 3. Judge Application System

### 3.1 Public Information Page

Create a compelling, informational page that explains the judge program.

**Route:** `/judges/become-a-judge` or `/become-a-judge`

**Content Sections:**

1. **Hero Section**
   - Headline: "Become a MECA Certified Judge"
   - Subheadline: "Join the elite group of professionals who shape the future of car audio competition"
   - Hero image/banner of judges in action

2. **Why Become a Judge**
   - Be part of the car audio community at the highest level
   - Share your expertise and passion
   - Travel to events across your region
   - Build your reputation in the industry
   - Network with industry professionals and enthusiasts

3. **What We Look For**
   - Car audio industry experience
   - Technical knowledge in SQL (Sound Quality) and/or SPL (Sound Pressure Level)
   - Professional demeanor and integrity
   - Availability for weekend events
   - Willingness to travel within your designated region

4. **The Application Process**
   - Step 1: Submit your application
   - Step 2: Application review by MECA staff
   - Step 3: Training and certification (if approved)
   - Step 4: Begin judging at local events

5. **Judge Levels**
   - In-Training: New judges learning under supervision
   - Certified: Fully qualified to judge independently
   - Head Judge: Lead judge at events, mentors others
   - Master Judge: Elite status, national-level events

6. **Call to Action**
   - "Ready to Apply?" button
   - Note: "Active MECA membership required"

### 3.2 Application Access Flow

**Purpose:** Ensure only qualified members can apply, with streamlined access for logged-in users.

**Flow:**

1. User clicks "Apply Now" on information page
2. System checks login status and membership (see 2.1)
3. **If user is already logged in with active membership:**
   - Skip email verification entirely
   - Take user directly to the application form
4. **If user is NOT logged in:**
   - Redirect to login with return URL to application
   - After login, check membership
   - If active membership → display email verification screen:
     - "Before we begin, let's verify your email address"
     - Display user's email from their account
     - "Send Verification Email" button
   - User clicks button → system sends verification email
   - Email contains:
     - Subject: "MECA Judge Application - Verify Your Email"
     - Body: Brief message + verification link
     - Link expires in 24 hours
   - User clicks link → taken directly to application form
   - If link expired → show message with option to resend

**Verification Token (for non-logged-in flow only):**
- Generate unique token stored in database
- Associate with user ID and timestamp
- Mark as used after successful verification
- Token format: UUID or secure random string

### 3.3 Judge Application Form

**Route:** `/judges/apply` (accessible via verification link OR directly if logged in)

**Form Sections:**

#### Section 1: Personal Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full Legal Name | Text | Yes | Pre-filled from account if available |
| Preferred Name/Nickname | Text | No | Name to display on badge/directory |
| Date of Birth | Date | Yes | Must be 18+ to apply |
| Phone Number | Phone | Yes | Primary contact |
| Secondary Phone | Phone | No | Backup contact |

#### Section 1b: Profile Headshot
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Judge/ED Headshot | Image Upload | Yes | Professional headshot photo |

**Headshot Image Requirements:**
- This is a **separate image type** from regular profile photos
- Stored within the user's photo gallery but flagged as `headshot` type
- Minimum dimensions: 400x400px
- Maximum file size: 5MB
- **Only displays publicly if user is an approved Judge or Event Director**
- Can be managed/updated from user's photo gallery settings
- Should be a professional head and shoulders shot

#### Section 2: Location & Availability
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Country | Dropdown | Yes | Pre-populated list |
| State/Province | Dropdown | Yes | Dynamic based on country |
| City | Text | Yes | |
| ZIP/Postal Code | Text | Yes | |
| Travel Radius | Dropdown | Yes | Options: 25mi, 50mi, 100mi, 150mi, 200mi, 250mi+ |
| Additional States/Regions | Multi-select | No | Other areas willing to travel to |
| Weekend Availability | Checkboxes | Yes | Saturday, Sunday, Both |
| Typical Availability | Text Area | No | "Most weekends except holidays" etc. |

#### Section 3: Experience & Qualifications
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Years in Car Audio Industry | Number | Yes | |
| Current/Past Industry Positions | Text Area | Yes | Installer, retailer, manufacturer, etc. |
| Company/Shop Names | Text Area | No | Where they've worked |
| Relevant Education/Training | Text Area | No | Technical schools, certifications |
| Competition History | Text Area | No | As competitor or other involvement |
| Judging Experience | Text Area | No | Other organizations, informal judging |

#### Section 4: Specialties
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Primary Specialty | Radio buttons | Yes | SQL (Sound Quality), SPL (Sound Pressure Level), Both |
| SQL Sub-specialties | Checkboxes | Conditional | If SQL selected: Install Quality, Sound Quality, RTA, etc. |
| SPL Sub-specialties | Checkboxes | Conditional | If SPL selected: dB Drag, Bass Race, etc. |
| Additional Skills | Text Area | No | Other relevant expertise |

#### Section 5: References (Highly Encouraged)

**Note:** References are **not required but highly encouraged**. Display message: "While not required, providing professional references significantly strengthens your application and may expedite the review process."

Collect up to 5 non-family professional references.

For each reference (1-5):
| Field | Type | Required |
|-------|------|----------|
| Full Name | Text | No |
| Relationship | Text | No |
| Company/Organization | Text | No |
| Phone Number | Phone | No |
| Email Address | Email | No |
| Years Known | Number | No |

**Display:** Show counter: "References provided: X of 5 (recommended)"

**Validation:** If any field in a reference row is filled, require at minimum: Name, Phone or Email

#### Section 6: Additional Information
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Why do you want to become a MECA Judge? | Text Area | Yes | Min 100 characters |
| What makes you qualified? | Text Area | Yes | Min 100 characters |
| Anything else we should know? | Text Area | No | |

#### Section 7: Acknowledgment
| Field | Type | Required |
|-------|------|----------|
| Independent Contractor Acknowledgment | Checkbox | Yes |
| Code of Conduct Agreement | Checkbox | Yes |
| Background Check Consent | Checkbox | Yes |
| Terms and Conditions | Checkbox | Yes |

**Acknowledgment Text Examples:**
- "I understand that MECA Judges are independent contractors, not employees of MECA."
- "I agree to conduct myself professionally and uphold MECA's Code of Conduct."
- "I consent to a background check if required for certification."

### 3.4 Application Submission

**On Submit:**
1. Validate all required fields
2. Save application to database with status "Pending"
3. Save timestamp of submission (Application Date)
4. Upload and store headshot image (flagged as headshot type in user gallery)
5. Display confirmation page:
   - "Thank you for your application!"
   - "A MECA representative will reach out when an opening becomes available."
   - "Application Reference Number: [JAPP-XXXX]"
   - "You can check your application status in your member dashboard."
6. Send confirmation email to applicant
7. Send notification email to admin(s) about new application

---

## 4. Admin Dashboard - Judge Management

### 4.1 Pending Applications Section

**Route:** `/admin/judges/applications` or within existing admin structure

**List View Features:**

**Columns:**
| Column | Sortable | Notes |
|--------|----------|-------|
| Application Date | Yes | The date the application was submitted; Default sort: newest first |
| Applicant Name | Yes | Click to view full application |
| Location | Yes | City, State format |
| Specialty | Yes | SQL, SPL, or Both |
| Age | Yes | Calculated from DOB |
| References | Yes | Count of references provided (0-5) |
| Status | Yes | Pending, Under Review, Approved, Rejected |
| Actions | No | View, Quick Actions |

**Filters Panel:**
| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | Pending, Under Review, Approved, Rejected |
| Country | Dropdown | All countries in applications |
| State | Dropdown | Dynamic based on country |
| City | Text search | Autocomplete from applications |
| Specialty | Multi-select | SQL, SPL, Both |
| Age Range | Range slider | 18-70+ |
| Application Date | Date picker | Filter by specific date or date range |
| Availability | Multi-select | Saturday, Sunday, Both |
| Has References | Toggle | Yes/No filter for applications with references |

**Bulk Actions:**
- Mark selected as "Under Review"
- Export selected to CSV

### 4.2 Admin Create Application / Judge Entry

**Purpose:** Allow admins to enter an application on behalf of a member, or directly create a judge/event director entry.

**Route:** `/admin/judges/applications/create` or modal from applications list

**Two Options:**

#### Option A: Create Application on Behalf of Member
1. Admin clicks "Create Application" button
2. Search/select existing member from user database
3. Fill in application form with same fields as public form
4. Application is saved with status "Pending"
5. Appears in pending applications list like any other application
6. Can be approved/rejected through normal workflow
7. Record shows "Entered by: [Admin Name]" in audit trail

#### Option B: Direct Judge/ED Creation (Expedited)
1. Admin clicks "Add Judge Directly" or "Add Event Director Directly"
2. Search/select existing member from user database
3. Fill in abbreviated form (key fields only):
   - Headshot
   - Location
   - Specialty
   - Level (for judges)
   - Admin notes
4. Judge/ED is created with status "Pending" in the approved list
5. Admin can then go to detail page and change status to "Approved"
6. This bypasses the application process for known qualified individuals

**Audit Trail:** All admin-created entries must record:
- Created by (admin user ID)
- Created date
- Method (application on behalf / direct creation)

### 4.3 Application Detail View

**Route:** `/admin/judges/applications/[id]`

**Layout:** Full page or modal showing all submitted information

**Sections:**
1. **Header**
   - Headshot photo (large)
   - Name and location
   - Application date
   - Current status badge
   - Status action buttons
   - If admin-entered: "Entered by [Admin Name] on [Date]"

2. **Personal Information** - All fields from Section 1

3. **Location & Availability** - All fields from Section 2 with map visualization if possible

4. **Experience & Qualifications** - All fields from Section 3

5. **Specialties** - Visual display of SQL/SPL with sub-specialties

6. **References** - Table of provided references (0-5) with:
   - Contact information
   - "Reference Checked" checkbox for admin to mark
   - Notes field for reference check results
   - If no references: Display "No references provided"

7. **Additional Information** - Essay responses

8. **Admin Notes Section**
   - Text area for internal notes
   - Notes history with timestamp and admin name
   - Only visible to admins

9. **Status Actions**
   - **Keep Pending** - No action taken yet
   - **Mark Under Review** - Admin is actively reviewing
   - **Approve Application** - Move to approved judges pool
   - **Reject Application** - Mark as rejected (no notification sent)

### 4.4 Application Status Workflow

```
[New Application] → PENDING
       ↓
  Admin reviews → UNDER REVIEW (optional intermediate status)
       ↓
   Decision made
      ↙    ↘
APPROVED    REJECTED
    ↓
[Moves to Approved Judges Pool]
```

**On Approval:**
1. Update application status to "Approved"
2. Create Judge Profile record linked to user account
3. Set initial judge level to "In-Training"
4. Send approval email to applicant (optional - configurable)
5. Add to current season as "Qualification Pending" or auto-qualify based on admin setting

**On Rejection:**
1. Update application status to "Rejected"
2. Record rejection date
3. No notification sent to applicant
4. Application retained in database for records

---

## 5. Approved Judges Management

### 5.1 Judges List

**Route:** `/admin/judges` or `/admin/judges/list`

**List View Features:**

**Columns:**
| Column | Sortable | Notes |
|--------|----------|-------|
| Judge Name | Yes | With headshot thumbnail |
| Level | Yes | In-Training, Certified, Head Judge, Master Judge |
| Location | Yes | City, State |
| Specialty | Yes | SQL, SPL, Both |
| Season Status | Yes | Qualified, Pending, Inactive for current season |
| Events Judged | Yes | Total count |
| Rating | Yes | Average star rating |
| Actions | No | View, Edit, Manage |

**Filters:**
| Filter | Type |
|--------|------|
| Judge Level | Multi-select |
| Season Status | Multi-select |
| Country/State/City | Cascading dropdowns |
| Specialty | Multi-select |
| Rating Range | Range slider |
| Active/Inactive | Toggle |

**Bulk Actions:**
- Qualify selected for season (dropdown to select season)
- Change level for selected
- Export to CSV

### 5.2 Seasonal Qualification

**Purpose:** Each season, judges must be re-qualified to judge events.

**Individual Qualification:**
- On judge detail page, section showing season qualification history
- Button: "Qualify for Season" with season dropdown
- Table showing: Season | Qualified Date | Qualified By | Status

**Bulk Qualification:**
1. On judges list, select multiple judges via checkbox
2. Click "Qualify for Season" bulk action
3. Select season from dropdown (pulled from existing seasons in system)
4. Confirm action
5. All selected judges marked as qualified for that season

**Season Qualification Statuses:**
- **Qualified**: Approved to judge events this season
- **Pending**: Not yet qualified for season
- **Inactive**: Chose not to participate or not approved
- **Suspended**: Temporarily unable to judge

### 5.3 Judge Profile/Detail View (Admin)

**Route:** `/admin/judges/[id]`

**Sections:**

1. **Profile Header**
   - Large headshot photo
   - Name, level badge, rating stars
   - Location
   - Quick stats: Events judged, years as judge, specialty
   - Edit Profile button

2. **Contact Information**
   - Phone, email
   - Full address
   - Emergency contact (if collected)

3. **Qualifications**
   - Current level with progression history
   - Specialty areas
   - Training completed
   - Original application date

4. **Availability**
   - Travel radius
   - Preferred regions
   - Availability schedule/calendar

5. **Season Qualifications**
   - Table of all seasons with qualification status
   - Ability to qualify/disqualify for any season

6. **Event History**
   - Table: Event Name | Date | Location | Event Director | Format | Role
   - Filterable by season, format, location
   - Link to event details

7. **Performance Statistics**
   - Events judged by format (SQL, SPL)
   - Events by region
   - Event Directors worked with (list)
   - Average rating
   - Rating breakdown (star distribution)

8. **Feedback & Reviews**
   - List of ratings received (date, event, rating - no comments as per spec)
   - Peer feedback (if implemented)

9. **Admin Notes**
   - Private notes only visible to admins
   - Notes history with timestamps
   - Add new note functionality

10. **Documents** (Optional/Future)
    - W-9
    - Contracts
    - Certifications

11. **Account Actions**
    - Change Level
    - Suspend Judge
    - Deactivate Judge
    - View Original Application

---

## 6. Judge Levels & Progression

### 6.1 Level Definitions

| Level | Description | Typical Requirements |
|-------|-------------|---------------------|
| **In-Training** | New judges learning under supervision | Initial approval, no events yet |
| **Certified** | Fully qualified to judge independently | Completed training, X events supervised |
| **Head Judge** | Lead judge at events, can mentor others | X years, X events, recommendation |
| **Master Judge** | Elite status, national-level events | Extensive experience, exemplary record |

### 6.2 Level Management

**Admin can manually change levels:**
- On judge detail page
- Via bulk action on judges list

**Level Change Tracking:**
- Record level changes with: date, previous level, new level, changed by, reason/notes

**Future Enhancement:** Automatic promotion suggestions based on criteria:
- Events judged count
- Ratings threshold
- Time at current level
- Training completion

---

## 7. Event Director System

### 7.1 Overview

The Event Director system parallels the Judge system with some differences:
- Similar application process
- Can be attached to specific events
- Different information collected
- Same public directory presence
- **Event Directors can view judge assignments and view their event assignments**
- **Event Directors do NOT manage events within this system** (event management functionality to be developed in future phase)

**Important:** Use the existing `event_director` role - do not create a new role.

### 7.2 Event Director Application

**Public Page Route:** `/event-directors/become-an-event-director`

**Content:** Similar structure to judge page, focused on event coordination responsibilities.

**Application Access:** Same flow as judges - logged in users with active membership go directly to form; others go through email verification.

**Application Form Differences:**

Fields specific to Event Directors:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Event Management Experience | Text Area | Yes | Prior event organization experience |
| Team Management Experience | Text Area | Yes | Managing volunteers, coordinating teams |
| Equipment/Resources Available | Text Area | No | Sound equipment, venue connections, etc. |
| Specialized Event Formats | Multi-select | Yes | SQL, SPL, Combined |

**Removed Fields (not applicable to Event Directors):**
- ~~Insurance/Liability Coverage~~
- ~~Preferred Event Size~~

**References:** Same as judges - not required but highly encouraged (up to 5 non-family references).

### 7.3 Event Director Admin Management

**Routes:**
- `/admin/event-directors/applications` - Pending applications
- `/admin/event-directors` - Approved Event Directors list
- `/admin/event-directors/[id]` - Individual detail view

**Same features as Judge management:**
- Filtering
- Status workflow (Pending → Approved/Rejected)
- Seasonal qualification
- Profile management
- Event history
- Notes
- Admin ability to create application on behalf of member or add ED directly

### 7.4 Event Director Capabilities

**Current Phase - What Event Directors CAN do:**
- View judge assignments for their events
- View their own event assignments
- View their profile and statistics
- Manage their availability
- View public judge directory

**Future Phase - What will be added later:**
- Event management functionality
- Judge request workflows
- Additional ED-specific tools

### 7.5 Event Assignment

**Critical Change:** Update existing event management to use approved Event Directors.

**Current State:** Event Director field pulls from all users.

**New State:** Event Director field should:
- Pull from approved Event Directors list only
- Show Event Director name, location, and rating
- Allow search/filter within dropdown
- Display selected ED's availability status

**Event-to-Event Director Relationship:**
- One Event Director per event (primary)
- Optional: Co-Event Director field
- Track: Assignment date, assigned by

**On Event Director Assignment:**
- Update Event Director's event history
- Track under their profile statistics

---

## 8. Event Assignment Workflow

### 8.1 Judge-to-Event Assignment

**Methods of Assignment:**

1. **Event Director Request** (Future Phase)
   - ED views available qualified judges
   - Filters by location, specialty, availability
   - Sends request to specific judge(s)
   - Judge accepts/declines

2. **Judge Volunteer**
   - Judge views upcoming events needing judges
   - Filters by location, date, format
   - Submits volunteer request
   - Admin approves/declines (or Event Director in future phase)

3. **Admin Assignment**
   - Admin directly assigns judge to event
   - Judge is notified of assignment

### 8.2 Event Assignment Data

| Field | Description |
|-------|-------------|
| Event ID | Link to existing event |
| Judge ID | Link to approved judge |
| Role | Primary Judge, Supporting Judge, Trainee |
| Status | Requested, Accepted, Declined, Confirmed, Completed, No-Show |
| Requested By | User ID who initiated |
| Request Date | When request was made |
| Response Date | When judge responded |
| Notes | Any special instructions |

### 8.3 Judge Event Views

**Available Events View (for Judges):**

**Route:** `/judges/events/available` or in judge dashboard

Shows events:
- In judge's travel radius
- Matching judge's specialty
- Current or upcoming season
- Needing judges

**Columns:**
- Event Name
- Date
- Location (distance from judge)
- Format (SQL/SPL)
- Event Director
- Judges Needed count
- [Request to Work] button

**My Assignments View:**

**Route:** `/judges/events/my-assignments` or in judge dashboard

Shows:
- Upcoming assigned events
- Past events worked
- Pending requests (awaiting response)

### 8.4 Event Director Views

**Route:** `/event-directors/events` or in ED dashboard

For Event Directors (current phase - view only):
- View their assigned events
- View judges assigned to their events
- View judge profiles and ratings

**Note:** Full judge request/management functionality will be added in a future phase.

---

## 9. Public Directory

### 9.1 Judges Directory

**Route:** `/judges` or `/judges/directory`

**Features:**

**Search & Filter:**
| Filter | Type |
|--------|------|
| Name Search | Text |
| Location | State/Region dropdown |
| Specialty | SQL, SPL, Both |
| Level | All levels or specific |
| Sort By | Name, Rating, Events Judged, Location |

**Judge Cards Display:**
Each judge shown as a card with:
- Headshot photo (only displayed for approved judges)
- Name
- Level badge
- Location (City, State)
- Specialty badges (SQL/SPL)
- Star rating (average)
- Events judged count
- [View Profile] button

**Individual Judge Public Profile:**

**Route:** `/judges/[slug]` or `/judges/[id]`

**Visible Information:**
- Headshot photo (large)
- Name
- Level
- Location (City, State only - no full address)
- Bio/About (from "Why do you want to be a judge" or separate bio field)
- Specialty areas
- Years as MECA Judge
- Total events judged
- Star rating with count
- Recent events judged (last 5-10)
- [Rate This Judge] button (if user is logged in and eligible)

**NOT visible publicly:**
- Contact information
- Full address
- References
- Admin notes
- Application details

### 9.2 Event Directors Directory

**Route:** `/event-directors` or `/event-directors/directory`

**Same structure as Judges Directory** with appropriate field differences.

**Individual Event Director Public Profile:**

**Route:** `/event-directors/[slug]` or `/event-directors/[id]`

**Visible Information:**
- Headshot photo (only displayed for approved EDs)
- Name
- Location
- Bio
- Years as MECA Event Director
- Total events directed
- Specialized event formats
- Star rating
- Upcoming events (if any)
- Recent past events
- [Rate This Event Director] button

---

## 10. Rating System

### 10.1 Overview

- Ratings only, no written comments
- Star-based system (1-5 stars)
- Anonymous to the rated party
- Visible who can rate (logged in members)

### 10.2 Who Can Rate

| Rater | Can Rate Judges | Can Rate Event Directors |
|-------|----------------|-------------------------|
| Competitors | Yes (after competing at their event) | Yes (after competing at their event) |
| Other Judges | Yes (after working same event) | Yes (after working at their event) |
| Event Directors | Yes (after judge worked their event) | No (cannot rate themselves/peers) |
| Admins | Yes | Yes |
| General Members | Yes (after attending event as spectator - optional) | Yes |

### 10.3 Rating Eligibility Logic

**For Competitors:**
- Must have competed at an event where the judge/ED was assigned
- Can only rate within X days of event completion (e.g., 30 days)
- Can only rate once per event per person

**For Judges/EDs:**
- Must have worked the same event
- Same time and duplicate restrictions

### 10.4 Rating Data Model

| Field | Type | Description |
|-------|------|-------------|
| ID | Primary Key | |
| Rater User ID | Foreign Key | Who gave the rating |
| Rated Entity Type | Enum | Judge, Event Director |
| Rated Entity ID | Foreign Key | Judge or ED ID |
| Event ID | Foreign Key | Which event this relates to |
| Rating | Integer | 1-5 stars |
| Created At | Timestamp | When rating was submitted |

### 10.5 Rating Display

**On Public Profiles:**
- Average rating (to 1 decimal: 4.7)
- Total number of ratings
- Star visualization

**On Admin Views:**
- Same plus ability to see individual ratings
- Can remove fraudulent ratings if needed

### 10.6 Rating Submission UI

**Trigger:** "Rate This Judge" button on profile or post-event prompt

**Modal/Form:**
- Judge/ED photo and name
- Event selector (events eligible to rate for)
- 5-star selector (click to select)
- [Submit Rating] button
- Note: "Your rating is anonymous and helps maintain quality standards."

---

## 11. Data Models

### 11.1 Judge Application

```
judge_applications
├── id (PK)
├── user_id (FK → users)
├── status (enum: pending, under_review, approved, rejected)
├── application_date (timestamp - when application was submitted)
├── reviewed_date
├── reviewed_by (FK → users, admin)
├── entered_by (FK → users, admin) -- NULL if self-submitted, admin ID if entered on behalf
├── entry_method (enum: self, admin_application, admin_direct) -- how entry was created
├── personal_info (JSON or separate fields)
│   ├── full_name
│   ├── preferred_name
│   ├── date_of_birth
│   ├── phone
│   └── secondary_phone
├── headshot_image_id (FK → user_images or media table) -- separate headshot image
├── location_info (JSON or separate fields)
│   ├── country
│   ├── state
│   ├── city
│   ├── zip
│   ├── travel_radius
│   └── additional_regions
├── availability_info (JSON or separate fields)
│   ├── weekend_availability
│   └── notes
├── experience_info (JSON or separate fields)
│   ├── years_in_industry
│   ├── positions
│   ├── companies
│   ├── education
│   ├── competition_history
│   └── judging_experience
├── specialty (enum: sql, spl, both)
├── sub_specialties (JSON array)
├── essay_why_judge (text)
├── essay_qualifications (text)
├── essay_additional (text)
├── acknowledgments (JSON: contractor, conduct, background, terms)
├── admin_notes (text)
├── created_at
└── updated_at
```

### 11.2 Judge Application References

```
judge_application_references
├── id (PK)
├── application_id (FK → judge_applications)
├── full_name
├── relationship
├── company
├── phone
├── email
├── years_known
├── reference_checked (boolean)
├── reference_notes (text, admin only)
├── checked_by (FK → users)
├── checked_date
├── created_at
└── updated_at

-- Note: References are optional, so application_id may have 0-5 related records
```

### 11.3 Approved Judge Profile

```
judges
├── id (PK)
├── user_id (FK → users) - UNIQUE
├── application_id (FK → judge_applications) -- NULL if created directly by admin
├── level (enum: in_training, certified, head_judge, master_judge)
├── specialty (enum: sql, spl, both)
├── sub_specialties (JSON array)
├── headshot_image_id (FK → user_images or media table) -- separate headshot
├── bio (text, for public profile)
├── preferred_name
├── location_country
├── location_state
├── location_city
├── travel_radius
├── additional_regions (JSON array)
├── is_active (boolean)
├── approved_date
├── approved_by (FK → users)
├── created_by (FK → users) -- admin who created if direct creation
├── creation_method (enum: application, admin_direct)
├── admin_notes (text)
├── created_at
└── updated_at
```

### 11.4 Judge Level History

```
judge_level_history
├── id (PK)
├── judge_id (FK → judges)
├── previous_level
├── new_level
├── changed_by (FK → users)
├── reason (text)
├── created_at
```

### 11.5 Judge Season Qualification

```
judge_season_qualifications
├── id (PK)
├── judge_id (FK → judges)
├── season_id (FK → seasons) - existing seasons table
├── status (enum: qualified, pending, inactive, suspended)
├── qualified_date
├── qualified_by (FK → users)
├── notes (text)
├── created_at
└── updated_at

UNIQUE constraint on (judge_id, season_id)
```

### 11.6 Event Director Application

```
event_director_applications
├── id (PK)
├── user_id (FK → users)
├── status (enum: pending, under_review, approved, rejected)
├── application_date (timestamp)
├── reviewed_date
├── reviewed_by (FK → users)
├── entered_by (FK → users) -- NULL if self-submitted
├── entry_method (enum: self, admin_application, admin_direct)
├── ... (similar personal/location structure to judge_applications)
├── headshot_image_id (FK → user_images or media table)
├── event_management_experience (text)
├── team_management_experience (text)
├── equipment_resources (text)
├── specialized_formats (JSON array) -- SQL, SPL, Combined
├── admin_notes (text)
├── created_at
└── updated_at
```

### 11.7 Approved Event Director Profile

```
event_directors
├── id (PK)
├── user_id (FK → users) - UNIQUE
├── application_id (FK → event_director_applications) -- NULL if admin direct
├── headshot_image_id (FK → user_images or media table)
├── bio (text)
├── preferred_name
├── location_country
├── location_state
├── location_city
├── specialized_formats (JSON array) -- SQL, SPL, Combined
├── is_active (boolean)
├── approved_date
├── approved_by (FK → users)
├── created_by (FK → users)
├── creation_method (enum: application, admin_direct)
├── admin_notes (text)
├── created_at
└── updated_at
```

### 11.8 Event Director Season Qualification

```
event_director_season_qualifications
├── id (PK)
├── event_director_id (FK → event_directors)
├── season_id (FK → seasons)
├── status (enum: qualified, pending, inactive, suspended)
├── qualified_date
├── qualified_by (FK → users)
├── notes (text)
├── created_at
└── updated_at
```

### 11.9 Event Judge Assignment

```
event_judge_assignments
├── id (PK)
├── event_id (FK → events) - existing events table
├── judge_id (FK → judges)
├── role (enum: primary, supporting, trainee)
├── status (enum: requested, accepted, declined, confirmed, completed, no_show)
├── requested_by (FK → users)
├── request_type (enum: ed_request, judge_volunteer, admin_assign)
├── request_date
├── response_date
├── notes (text)
├── created_at
└── updated_at

UNIQUE constraint on (event_id, judge_id)
```

### 11.10 Event Director Assignment (Modify Existing Events)

Add to existing events table or create linking table:

```
-- Option A: Add column to existing events table
events.event_director_id (FK → event_directors) -- replaces current user reference

-- Option B: Separate linking table
event_director_assignments
├── id (PK)
├── event_id (FK → events)
├── event_director_id (FK → event_directors)
├── is_primary (boolean)
├── assigned_date
├── assigned_by (FK → users)
├── created_at
└── updated_at
```

### 11.11 Ratings

```
ratings
├── id (PK)
├── rater_user_id (FK → users)
├── entity_type (enum: judge, event_director)
├── entity_id (integer) -- judge_id or event_director_id
├── event_id (FK → events)
├── rating (integer, 1-5)
├── created_at

UNIQUE constraint on (rater_user_id, entity_type, entity_id, event_id)
```

### 11.12 Email Verification Tokens

```
email_verification_tokens
├── id (PK)
├── user_id (FK → users)
├── token (string, unique)
├── purpose (enum: judge_application, ed_application, other)
├── expires_at
├── used_at
├── created_at
```

### 11.13 User Headshot Image

**Note:** The headshot should be stored within the existing user image/media system but with a distinct type/flag.

```
-- If adding to existing user_images or media table, add:
├── image_type (enum: profile, gallery, headshot, other)

-- Headshot display rules:
-- Only display publicly if user has approved judge OR event_director record
-- Can be managed from user's photo gallery but treated as separate type
```

---

## 12. API Endpoints

### 12.1 Public Endpoints

```
GET  /api/judges/directory          - List approved judges (public info only)
GET  /api/judges/directory/:id      - Single judge public profile
GET  /api/event-directors/directory - List approved EDs (public info only)
GET  /api/event-directors/directory/:id - Single ED public profile
```

### 12.2 Member Endpoints (Authenticated)

```
-- Applications
POST /api/judges/apply/verify-email      - Request email verification (only if not logged in flow)
GET  /api/judges/apply/verify/:token     - Verify email token
POST /api/judges/apply                   - Submit judge application
GET  /api/judges/apply/status            - Check own application status
GET  /api/judges/apply/can-apply         - Check if user can apply (logged in + member check)

POST /api/event-directors/apply/verify-email
GET  /api/event-directors/apply/verify/:token
POST /api/event-directors/apply
GET  /api/event-directors/apply/status
GET  /api/event-directors/apply/can-apply

-- Ratings
POST /api/ratings                        - Submit a rating
GET  /api/ratings/eligible               - Get entities user can rate

-- Headshot Management
POST /api/users/me/headshot              - Upload headshot image
PUT  /api/users/me/headshot              - Update headshot image
DELETE /api/users/me/headshot            - Remove headshot image
```

### 12.3 Judge Endpoints (Authenticated + Judge Role)

```
GET  /api/judges/me                      - Own judge profile
PUT  /api/judges/me                      - Update own profile (limited fields)
GET  /api/judges/me/events               - My assigned events
GET  /api/judges/events/available        - Events available to work
POST /api/judges/events/:eventId/volunteer - Request to work event
PUT  /api/judges/events/:assignmentId/respond - Accept/decline assignment
PUT  /api/judges/me/availability         - Update availability
```

### 12.4 Event Director Endpoints (Authenticated + Existing ED Role)

```
GET  /api/event-directors/me             - Own ED profile
PUT  /api/event-directors/me             - Update own profile
GET  /api/event-directors/me/events      - My events (view only)
GET  /api/event-directors/events/:id/judges - View judges for my event (view only)
GET  /api/event-directors/judges/directory - View available judges directory
```

### 12.5 Admin Endpoints

```
-- Judge Applications
GET    /api/admin/judges/applications          - List all applications
GET    /api/admin/judges/applications/:id      - Single application detail
POST   /api/admin/judges/applications          - Create application on behalf of member
PUT    /api/admin/judges/applications/:id      - Update application status
PUT    /api/admin/judges/applications/:id/references/:refId - Update reference check

-- Approved Judges
GET    /api/admin/judges                       - List all approved judges
GET    /api/admin/judges/:id                   - Single judge full detail
POST   /api/admin/judges                       - Create judge directly (admin expedited)
PUT    /api/admin/judges/:id                   - Update judge profile
PUT    /api/admin/judges/:id/level             - Change judge level
POST   /api/admin/judges/:id/notes             - Add admin note
PUT    /api/admin/judges/:id/status            - Activate/deactivate
POST   /api/admin/judges/:id/qualify           - Qualify for season
POST   /api/admin/judges/bulk-qualify          - Bulk qualify for season

-- Event Director Applications
GET    /api/admin/event-directors/applications
GET    /api/admin/event-directors/applications/:id
POST   /api/admin/event-directors/applications  - Create application on behalf of member
PUT    /api/admin/event-directors/applications/:id

-- Approved Event Directors
GET    /api/admin/event-directors
GET    /api/admin/event-directors/:id
POST   /api/admin/event-directors              - Create ED directly (admin expedited)
PUT    /api/admin/event-directors/:id
POST   /api/admin/event-directors/:id/qualify
POST   /api/admin/event-directors/bulk-qualify

-- Event Assignments
GET    /api/admin/events/:id/assignments       - All assignments for event
POST   /api/admin/events/:id/assignments       - Assign judge/ED to event
PUT    /api/admin/assignments/:id              - Update assignment
DELETE /api/admin/assignments/:id              - Remove assignment

-- Ratings Admin
GET    /api/admin/ratings                      - View all ratings
DELETE /api/admin/ratings/:id                  - Remove fraudulent rating
```

---

## 13. UI/UX Requirements

### 13.1 Public Pages

**Become a Judge Page:**
- Clean, inspiring design
- Clear call-to-action
- Mobile responsive
- Fast loading
- SEO optimized

**Public Directory:**
- Card-based layout
- Easy filtering
- Infinite scroll or pagination
- Quick profile preview on hover
- Mobile: Stack cards vertically
- Headshot photos only display for approved judges/EDs

**Public Profiles:**
- Hero section with headshot photo
- Clear information hierarchy
- Rating prominently displayed
- Recent activity visible
- Social sharing options

### 13.2 Application Forms

- Multi-step wizard format (recommended for long form)
- Progress indicator
- Save draft functionality (optional but helpful)
- Clear validation messages
- Mobile-friendly inputs
- Headshot upload with preview and crop
- References section clearly marked as "optional but encouraged"

### 13.3 Admin Dashboard

- Consistent with existing admin UI patterns
- Data tables with sorting and filtering
- Bulk action support
- Quick actions accessible
- Detail views in modals or full pages (match existing pattern)
- Search functionality throughout
- "Create Application" and "Add Directly" buttons prominently placed
- Clear indication when entry was admin-created vs self-submitted

### 13.4 Judge/ED Dashboard

- Clean dashboard showing:
  - Upcoming events
  - Pending requests
  - Quick stats
  - Recent activity
- Calendar view for availability (optional)
- Notifications center
- Headshot management section

---

## 14. Integration Points

### 14.1 Existing User System

- Judge/ED profiles MUST link to existing user accounts
- Use existing authentication
- Respect existing role/permission system
- Use existing `event_director` role - do not create a new role
- Add `judge` role if not exists (or use existing equivalent)

### 14.2 Existing Events System

- Modify event director field to use new ED system
- Add judge assignment capability to events
- Ensure event display shows assigned judges/ED
- Event results should link to judge records

### 14.3 Existing Seasons System

- Use existing seasons for qualification tracking
- Dropdown selectors should pull from existing seasons
- Respect season date ranges for eligibility

### 14.4 Existing Membership System

- Verify active membership before applications
- Pull member data for pre-filling forms
- Check membership status in validation

### 14.5 Existing Email System

- Use existing email infrastructure
- Templates needed:
  - Email verification (for non-logged-in users only)
  - Application received confirmation
  - Application approved (optional)
  - Event assignment notification
  - Event request notification

### 14.6 Existing File Upload / Photo Gallery System

- Use existing upload infrastructure for headshot images
- Headshot is a **separate image type** within user's gallery
- Add `headshot` type to image type enum if needed
- Respect existing file size limits
- Use existing storage (S3, local, etc.)
- Headshot only displays publicly if user is approved judge/ED

---

## 15. Business Rules & Validation

### 15.1 Application Rules

| Rule | Implementation |
|------|----------------|
| Must be logged in to apply | Check auth before showing application |
| Must be active MECA member | Verify membership status from user record |
| Skip email verification if logged in | Logged-in users go directly to form |
| Email verification for non-logged-in flow | Token validation before form access |
| Must be 18+ years old | Calculate from DOB, block if under 18 |
| References optional but encouraged | Display encouragement message, allow 0-5 references |
| Must acknowledge all terms | All checkboxes required |
| One application per user | Check for existing pending/approved application |
| Admin can create on behalf of member | Track entered_by and entry_method |

### 15.2 Judge/ED Management Rules

| Rule | Implementation |
|------|----------------|
| Cannot self-rate | Exclude own profile from rating options |
| Can only rate after event | Check event completion and participation |
| One rating per person per event | Unique constraint in database |
| Rating window | 30 days after event completion |
| Season qualification required for assignment | Check qualification before allowing assignment |
| Headshot only public for approved judges/EDs | Check approved status before displaying headshot |

### 15.3 Event Assignment Rules

| Rule | Implementation |
|------|----------------|
| Judge must be qualified for season | Verify season qualification |
| Judge specialty should match event format | Warning if mismatch, not blocking |
| Cannot double-book judges | Check for existing assignments on same date |
| Event Director cannot assign self as judge | Block if IDs match |

### 15.4 Data Privacy Rules

| Data | Public | Judges/EDs | Admin |
|------|--------|-----------|-------|
| Full name | ✓ | ✓ | ✓ |
| Headshot photo | ✓ (if approved) | ✓ | ✓ |
| City, State | ✓ | ✓ | ✓ |
| Full address | ✗ | Own only | ✓ |
| Phone/Email | ✗ | Own only | ✓ |
| Ratings | ✓ | ✓ | ✓ |
| Event history | ✓ | ✓ | ✓ |
| Application details | ✗ | Own only | ✓ |
| Admin notes | ✗ | ✗ | ✓ |
| References | ✗ | ✗ | ✓ |

---

## Implementation Priority

### Phase 1: Core Judge System
1. Database models for applications and judges
2. Headshot image type in existing media system
3. Public information page
4. Application access flow (with skip for logged-in users)
5. Application form (with optional references)
6. Admin application review dashboard
7. Admin create application / add judge directly functionality
8. Basic approved judges list

### Phase 2: Event Integration
1. Judge-to-event assignment
2. Event Director system (application + management)
3. Modify events to use new ED system
4. Judge assignment workflow (volunteer + admin assign)

### Phase 3: Public & Ratings
1. Public judges directory
2. Public ED directory
3. Public profile pages with headshots
4. Rating system implementation

### Phase 4: Enhanced Features
1. Seasonal qualification management
2. Bulk operations
3. Judge levels and progression
4. Availability management
5. Event history and statistics
6. Dashboard views for judges/EDs

### Future Phase: Event Director Expanded Functionality
- Event Director event management features
- Judge request workflows for EDs
- Additional ED-specific tools

---

## Final Notes for Developer

1. **Analyze existing code first** - Understand patterns, naming conventions, folder structure before creating new code.

2. **Reuse existing infrastructure** - Do not duplicate users, events, seasons, file uploads, email, or auth systems.

3. **Use existing event_director role** - Do not create a new role for event directors.

4. **Headshot as separate image type** - Store in existing media/gallery system but flagged as headshot type.

5. **Match existing UI patterns** - Admin pages should look and feel like existing admin pages. Public pages should match site design.

6. **Database migrations** - Create proper migrations for all new tables. Consider foreign key relationships carefully.

7. **Testing** - Include appropriate tests for critical flows (application submission, status changes, rating submission).

8. **Error handling** - Proper error messages for users, logging for debugging.

9. **Performance** - Use pagination for lists, optimize queries, consider caching for public directory.

10. **Security** - Validate all inputs, authorize all actions, protect admin endpoints, sanitize outputs.

11. **Audit trail** - Track admin-created entries with entered_by, entry_method, and timestamps.

---

*End of Specification Document*