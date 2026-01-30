# NewMECA V2 - Business Logic Overview

**Document Version:** 1.0
**Last Updated:** December 10, 2025
**Purpose:** Comprehensive overview of business logic for stakeholder review

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Membership System](#3-membership-system)
4. [Team System](#4-team-system)
5. [Events System](#5-events-system)
6. [Event Hosting Request Workflow](#6-event-hosting-request-workflow)
7. [Competition Results & Points](#7-competition-results--points)
8. [Payment Processing (Stripe)](#8-payment-processing-stripe)
9. [Accounting Integration (QuickBooks)](#9-accounting-integration-quickbooks)
10. [Seasons & Championships](#10-seasons--championships)
11. [Data Relationships](#11-data-relationships)
12. [Key Business Constants](#12-key-business-constants)

---

## 1. System Overview

NewMECA V2 is a full-stack web application for the **Mobile Electronics Competition Association (MECA)** - an organization that manages car audio competitions across the United States.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Member Management** | User registration, profiles, membership purchases |
| **Team Management** | Team creation, membership, roles, and collaboration |
| **Event Management** | Event hosting requests, approval workflows, event listings |
| **Competition Results** | Result entry, points calculation, leaderboards |
| **Financial Integration** | Stripe payments, QuickBooks accounting sync |
| **Public Content** | Event calendars, leaderboards, member directories |

---

## 2. User Roles & Permissions

### Role Definitions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **USER** | Standard member | View events, register for competitions, manage profile, join/create teams |
| **EVENT_DIRECTOR** | Assigned to review hosting requests | Review assigned hosting requests, manage competition results at their events |
| **RETAILER** | Business/retail member | Retailer-specific features, business profile |
| **ADMIN** | System administrator | Full access: manage users, events, memberships, approve hosting requests, system configuration |

### Permission Matrix

| Action | USER | EVENT_DIRECTOR | RETAILER | ADMIN |
|--------|------|----------------|----------|-------|
| View public events | ✅ | ✅ | ✅ | ✅ |
| Register for events | ✅ | ✅ | ✅ | ✅ |
| Create team (with team membership) | ✅ | ✅ | ✅ | ✅ |
| Submit hosting request | ✅ | ✅ | ✅ | ✅ |
| Review assigned hosting requests | ❌ | ✅ | ❌ | ✅ |
| Enter competition results | ❌ | ✅ (own events) | ❌ | ✅ |
| Manage all events | ❌ | ❌ | ❌ | ✅ |
| Manage all memberships | ❌ | ❌ | ❌ | ✅ |
| Admin dashboard access | ❌ | ❌ | ❌ | ✅ |

---

## 3. Membership System

### Membership Categories

| Category | Description | Typical Use |
|----------|-------------|-------------|
| **COMPETITOR** | Individual competitor membership | Car audio competitors |
| **TEAM** | Team membership add-on | Teams wanting official MECA team status |
| **RETAIL** | Retail business membership | Car audio shops/retailers |
| **MANUFACTURER** | Equipment manufacturer | Audio equipment manufacturers |

### Manufacturer Tiers

Manufacturer memberships have three tiers with escalating benefits:

| Tier | Benefits Level |
|------|----------------|
| **BRONZE** | Basic manufacturer benefits |
| **SILVER** | Enhanced manufacturer benefits |
| **GOLD** | Premium manufacturer benefits |

### Membership Type Configuration

Each membership product is configured with:

- **Basic Info:** Name, description, category, tier (if manufacturer)
- **Pricing:** Price, currency, Stripe price ID/product ID
- **Benefits:** List of included benefits
- **Required/Optional Fields:** What info is collected during purchase
- **Display Settings:** Active, featured, show on public site, display order
- **Upgrade Rules:** `isUpgradeOnly` flag for add-ons (e.g., team membership requires active competitor membership)
- **Accounting:** QuickBooks item ID and account ID for sync

### Payment Status Flow

```
PENDING → PAID → (optional) REFUNDED
       ↘ FAILED
       ↘ CANCELLED
```

| Status | Description |
|--------|-------------|
| **PENDING** | Payment initiated but not completed |
| **PAID** | Payment successful, membership active |
| **REFUNDED** | Payment was refunded |
| **FAILED** | Payment attempt failed |
| **CANCELLED** | Payment/membership cancelled |

### Membership Business Rules

1. **Guest Checkout:** Memberships can be purchased without an account (guest checkout with email)

2. **Account Linking:** When a user creates an account, any orphan memberships matching their email are automatically linked to their account

3. **Membership Duration:** Default is 1 year from purchase date

4. **Active Membership Definition:**
   - `endDate >= current date` AND
   - `paymentStatus = PAID`

5. **Admin Assignment:** Admins can assign memberships without payment (marked as PAID with transaction ID `ADMIN-{timestamp}`)

6. **Upgrade Memberships:** Some membership types (e.g., team add-on) require an existing active competitor membership

---

## 4. Team System

### Team Membership Requirements

**To CREATE a team, user must:**
1. Have an active TEAM category membership with `paymentStatus = PAID`
2. NOT already be a member of another team

**To JOIN a team:**
1. Have an active MECA membership
2. NOT already be a member of another team

### Team Member Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full control - edit team, manage all members, change roles, transfer ownership, delete team |
| **CO_OWNER** | Edit team info, manage members (add/remove below their role), cannot delete team |
| **MODERATOR** | Add/remove regular members only |
| **MEMBER** | Basic membership, can view team info and leave |

### Team Member Status

| Status | Description |
|--------|-------------|
| **ACTIVE** | Full team member |
| **PENDING_INVITE** | Invited by team, awaiting user acceptance |
| **PENDING_APPROVAL** | User requested to join, awaiting team approval |

### Team Business Rules

1. **One Team Per User:** Users can only be a member of one team at a time

2. **Team Name Sanitization:** System automatically removes variants of "team" from team names (including leetspeak variations like "t34m", "te4m", etc.)

3. **Join Flow:**
   - If team `requiresApproval = false`: User joins immediately
   - If team `requiresApproval = true`: Creates pending request, owner/co-owner must approve
   - Special case: If user has a pending invite when they request to join → auto-approved

4. **Invite Flow:**
   - Owner/co-owner invites by MECA ID
   - Target user must have active MECA membership
   - Special case: If target has pending join request → auto-approved

5. **Owner Restrictions:** Team owner cannot leave the team. They must either:
   - Transfer ownership to another member first, OR
   - Delete the team entirely

6. **Role Hierarchy Enforcement:**
   - Members can only remove users with roles BELOW their own
   - Co-owners cannot promote anyone to co-owner (only owner can)

7. **Default Team Capacity:** 50 members maximum (configurable per team)

---

## 5. Events System

### Event Status Flow

```
PENDING → UPCOMING → ONGOING → COMPLETED
                  ↘ CANCELLED
NOT_PUBLIC (hidden from public view)
```

| Status | Description |
|--------|-------------|
| **PENDING** | Event created but not yet confirmed |
| **UPCOMING** | Confirmed event, visible to public |
| **ONGOING** | Event currently in progress |
| **COMPLETED** | Event finished |
| **CANCELLED** | Event was cancelled |
| **NOT_PUBLIC** | Event hidden from public listings |

### Event Types & Point Multipliers

| Event Type | Multiplier | Description |
|------------|------------|-------------|
| **1x Event** | 1x | Standard local event |
| **2x Event** | 2x | Regional event (default) |
| **3x Event (SOUNDFEST)** | 3x | Major SOUNDFEST events |
| **4x Event** | 4x | Special competitions (SQ, Install, RTA, SQ2/SQ2+) |
| **Branded Event** | Variable | Manufacturer-branded event |
| **Sponsored Event** | Variable | Sponsored event |
| **Other** | Variable | Other event types |

---

## 6. Event Hosting Request Workflow

### Status Definitions

| Status | Description |
|--------|-------------|
| **PENDING** | New request submitted, awaiting admin review |
| **ASSIGNED_TO_ED** | Admin assigned to an Event Director |
| **ED_REVIEWING** | Event Director is reviewing the request |
| **ED_ACCEPTED** | Event Director accepted the assignment |
| **ED_REJECTED** | Event Director rejected (returns to admin) |
| **UNDER_REVIEW** | Admin is directly reviewing |
| **APPROVED** | Request approved, event created |
| **APPROVED_PENDING_INFO** | Approved but needs additional information |
| **PENDING_INFO** | Waiting for additional info from requestor |
| **REJECTED** | Request rejected |
| **CANCELLED** | Request cancelled by requestor |

### Workflow Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
┌─────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│ PENDING │───▶│ ASSIGNED_TO_ED  │───▶│ ED_REVIEWING │───▶│ ED_ACCEPTED  │
└─────────┘    └─────────────────┘    └──────────────┘    └──────────────┘
     │                                       │                    │
     │                                       ▼                    │
     │                               ┌──────────────┐             │
     │                               │ ED_REJECTED  │─────────────┤
     │                               └──────────────┘             │
     │                                                            │
     ▼                                                            ▼
┌──────────────┐                                          ┌────────────┐
│ UNDER_REVIEW │─────────────────────────────────────────▶│  APPROVED  │
└──────────────┘                                          └────────────┘
     │                                                            │
     │         ┌─────────────────────┐                           │
     ├────────▶│ APPROVED_PENDING_INFO│◀──────────────────────────┤
     │         └─────────────────────┘                           │
     │         ┌─────────────────┐                               │
     ├────────▶│  PENDING_INFO   │◀──────────────────────────────┤
     │         └─────────────────┘                               │
     │         ┌─────────────────┐                               │
     └────────▶│    REJECTED     │                               │
               └─────────────────┘                               │
                                                                  │
                                               ▼ (On APPROVED)
                                      ┌─────────────────┐
                                      │ EVENT CREATED   │
                                      │ (auto-generated)│
                                      └─────────────────┘
```

### Messaging System

- **Private Messages:** Visible only to Event Directors and Admins
- **Public Messages:** Visible to the requestor (and ED/Admin)
- Notifications are sent based on recipient type and message privacy settings

---

## 7. Competition Results & Points

### Eligible Competition Formats

Only these formats earn points toward standings:

| Format | Description |
|--------|-------------|
| **SPL** | Sound Pressure Level (loudness) |
| **SQL** | Sound Quality League |
| **SSI** | Show and Shine Install |
| **MK** | MECA Kids |

### Points by Placement

Points are awarded only to TOP 5 placements:

| Placement | 1x Event | 2x Event | 3x Event (SOUNDFEST) | 4x Event (SQ/Install/RTA) |
|-----------|----------|----------|----------------------|---------------------------|
| 1st | 5 | 10 | 15 | 20 |
| 2nd | 4 | 8 | 12 | 19 |
| 3rd | 3 | 6 | 9 | 18 |
| 4th | 2 | 4 | 6 | 17 |
| 5th | 1 | 2 | 3 | 16 |
| 6th+ | 0 | 0 | 0 | 0 |

### Point Eligibility Rules

A competitor earns points only if ALL of the following are true:

1. MECA ID is NOT `999999` (guest competitor)
2. MECA ID is NOT `0` or `null` (unassigned)
3. MECA ID does NOT start with `99` (test/special entries)
4. Membership status is `active`
5. Membership is NOT expired

### Results Import Methods

| Method | Description |
|--------|-------------|
| **Manual Entry** | Single result entered via form |
| **Excel Import** | Bulk import from spreadsheet |
| **Termlab Import** | Import from Termlab competition software |

### Import Logic

1. **MECA ID provided + matches active member:** Use system profile data, eligible for points
2. **MECA ID provided + no match:** Keep file MECA ID, NOT eligible for points
3. **No MECA ID + name matches active member:** Use system profile data, eligible for points
4. **No MECA ID + no match:** Assign MECA ID `999999` (guest), NOT eligible for points

### Duplicate Handling During Import

System checks for duplicates by:
- **For members:** Format + Class + MECA ID
- **For non-members:** Format + Class + Name (when MECA ID is 999999)

Options when duplicate found:
- **Skip:** Keep existing result
- **Replace:** Use imported result

### Audit Trail

All result changes are logged with:
- Entry method (manual, excel, termlab)
- Action type (create, update, delete)
- Session tracking for batch imports
- Old and new data captured
- Revision count incremented on updates
- Uploaded files saved to `audit-logs/uploads/{eventId}/`
- Manual entries exported to `audit-logs/sessions/{eventId}/`

---

## 8. Payment Processing (Stripe)

### Payment Flow

```
1. User selects membership type
              ↓
2. Frontend creates PaymentIntent via API
              ↓
3. Backend validates membership config is active
              ↓
4. Backend creates Stripe PaymentIntent with metadata:
   - email
   - membershipCategory
   - billing info
   - team/business info (if applicable)
              ↓
5. Frontend displays Stripe checkout
              ↓
6. User completes payment
              ↓
7. Stripe sends webhook: payment_intent.succeeded
              ↓
8. Backend webhook handler:
   a. Creates membership record
   b. Links to user account (or stores as guest)
   c. Triggers QuickBooks sync (async)
              ↓
9. User sees confirmation
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Create membership, sync to QuickBooks |
| `payment_intent.payment_failed` | Log failure |

---

## 9. Accounting Integration (QuickBooks)

### OAuth Connection

- Supports both sandbox and production environments
- Stores OAuth tokens with expiration tracking
- Auto-refreshes access tokens (with 5-minute buffer before expiry)

### Sales Receipt Creation

On successful payment:

1. Find or create QuickBooks customer by email
2. Map membership type to QuickBooks item (via `quickbooksItemId` in membership config)
3. Create sales receipt with:
   - Customer info
   - Line items (membership product)
   - Billing address
   - Deposit account (via `quickbooksAccountId` in membership config)

### Sync Behavior

- Sync happens asynchronously (non-blocking)
- Errors are logged but don't fail the payment
- Last sync timestamp tracked for monitoring

---

## 10. Seasons & Championships

### Season Definition

Each season has:
- **Name:** Season name (e.g., "2025 Season")
- **Year:** Competition year
- **Start Date / End Date:** Season boundaries
- **isActive:** Flag indicating current season

### Championship Archives

Historical data preserved:
- Championship awards by year
- Winner information
- Competition results archive
- Legacy standings data

---

## 11. Data Relationships

```
┌─────────────┐
│   Profile   │
│  (User)     │
└─────────────┘
       │
       ├──────────────────┬───────────────────┬──────────────────┬──────────────────┐
       │                  │                   │                  │                  │
       ▼                  ▼                   ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Memberships │    │ TeamMember  │    │   Events    │    │ Competition │    │   Event     │
│    (N)      │    │    (N)      │    │(as director)│    │   Results   │    │  Hosting    │
└─────────────┘    └─────────────┘    └─────────────┘    │    (N)      │    │  Requests   │
       │                  │                   │          └─────────────┘    └─────────────┘
       ▼                  ▼                   │                                    │
┌─────────────┐    ┌─────────────┐           │                                    │
│ Membership  │    │    Team     │           │                                    │
│ TypeConfig  │    │             │           │                                    │
└─────────────┘    └─────────────┘           │                                    │
                                              │                                    │
                                              ▼                                    │
                                       ┌─────────────┐                            │
                                       │   Season    │                            │
                                       └─────────────┘                            │
                                                                                   │
                                              ┌────────────────────────────────────┘
                                              │ (On approval, creates)
                                              ▼
                                       ┌─────────────┐
                                       │    Event    │
                                       └─────────────┘
```

---

## 12. Key Business Constants

### Special MECA IDs

| MECA ID | Meaning |
|---------|---------|
| `999999` | Guest competitor (no membership) |
| `0` or `null` | Unassigned |
| Starting with `99` | Test/special entries |

### Defaults

| Setting | Default Value |
|---------|---------------|
| Membership duration | 1 year |
| Team max members | 50 |
| Event point multiplier | 2x |

### External Service Integrations

| Service | Purpose |
|---------|---------|
| **Stripe** | Payment processing |
| **QuickBooks** | Accounting sync |
| **Twilio** | SMS notifications |
| **reCAPTCHA v3** | Form spam protection |
| **Supabase** | Database + Authentication |

---

## Questions for Review

Please review this document and let me know if any of the following need revision:

1. **User Roles:** Are the permissions correct for each role?
2. **Membership Categories:** Are all membership types represented?
3. **Team Rules:** Are the team join/invite rules accurate?
4. **Event Workflow:** Is the hosting request workflow correct?
5. **Points System:** Are the point values and eligibility rules correct?
6. **Any Missing Features:** Are there features not documented here?

---

*End of Document*
