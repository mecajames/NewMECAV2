# NewMECA V2 - Complete Business Logic & System Architecture

**Document Version:** 2.0
**Last Updated:** December 10, 2025
**Purpose:** In-depth technical documentation of all business logic, function connections, and data flows

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Profiles Module - User Management](#2-profiles-module---user-management)
3. [Membership System](#3-membership-system)
4. [Team System](#4-team-system)
5. [Events System](#5-events-system)
6. [Event Hosting Requests Workflow](#6-event-hosting-requests-workflow)
7. [Competition Results & Points System](#7-competition-results--points-system)
8. [Payment Processing (Stripe)](#8-payment-processing-stripe)
9. [QuickBooks Integration](#9-quickbooks-integration)
10. [Notifications System](#10-notifications-system)
11. [Audit System](#11-audit-system)
12. [Cross-Module Dependencies](#12-cross-module-dependencies)
13. [API Endpoint Reference](#13-api-endpoint-reference)

---

## 1. System Architecture Overview

### Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                        │
│                     apps/frontend/src/                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Pages (MyMecaDashboardPage, EventsPage, LeaderboardPage, etc.) │  │
│  │                              ↓                                   │  │
│  │  API Clients (profiles.api-client.ts, teams.api-client.ts, etc.)│  │
│  └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP/REST (port 5173 → 3001)
                                    ↓
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                                │
│                     apps/backend/src/                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Controllers (profiles.controller.ts, teams.controller.ts, etc.)│  │
│  │                              ↓                                   │  │
│  │  Services (profiles.service.ts, teams.service.ts, etc.)         │  │
│  │                              ↓                                   │  │
│  │  Entities (profiles.entity.ts, team.entity.ts, etc.)            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                          MikroORM (EntityManager)
                                    ↓
┌────────────────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL/Supabase)                     │
│  Tables: profiles, memberships, teams, team_members, events,           │
│          competition_results, event_hosting_requests, notifications,   │
│          membership_type_configs, quickbooks_connections, etc.         │
└────────────────────────────────────────────────────────────────────────┘
```

### Shared Package Structure

**Location:** `packages/shared/src/`

```
packages/shared/src/
├── index.ts                    # Barrel export
├── types.ts                    # Legacy types
└── schemas/
    ├── index.ts                # Schema barrel export
    ├── enums.schema.ts         # ALL TypeScript enums + Zod schemas
    ├── profiles.schema.ts      # Profile DTOs
    ├── events.schema.ts        # Event DTOs
    ├── memberships.schema.ts   # Membership DTOs
    ├── payments.schema.ts      # Payment DTOs
    └── [feature].schema.ts     # Other feature schemas
```

### Enums (Single Source of Truth)

**File:** `packages/shared/src/schemas/enums.schema.ts`

| Enum | Values | Used By |
|------|--------|---------|
| `UserRole` | `user`, `event_director`, `retailer`, `admin` | Profiles, Authorization |
| `MembershipStatus` | `none`, `active`, `expired` | Profiles |
| `MembershipType` | `domestic`, `international`, `team`, `retailer`, `annual`, `lifetime` | Memberships |
| `MembershipCategory` | `competitor`, `team`, `retail`, `manufacturer` | MembershipTypeConfig |
| `ManufacturerTier` | `bronze`, `silver`, `gold` | MembershipTypeConfig |
| `PaymentStatus` | `pending`, `paid`, `refunded`, `failed`, `cancelled` | Memberships, Payments |
| `EventStatus` | `pending`, `upcoming`, `ongoing`, `completed`, `cancelled`, `not_public` | Events |
| `EventHostingRequestStatus` | `pending`, `assigned_to_ed`, `ed_reviewing`, `ed_accepted`, `ed_rejected`, `under_review`, `approved`, `approved_pending_info`, `pending_info`, `rejected`, `cancelled` | EventHostingRequests |
| `EDAssignmentStatus` | `pending_review`, `accepted`, `rejected_to_admin` | EventHostingRequests |
| `FinalApprovalStatus` | `approved`, `approved_pending_info`, `rejected`, `pending_info` | EventHostingRequests |
| `EventTypeOption` | `1x Event`, `2x Event`, `3x Event`, `4x Event`, `Branded Event`, `Sponsored Event`, `Other` | Events, EventHostingRequests |
| `EntryMethod` | `manual`, `excel`, `termlab` | Audit |
| `AuditAction` | `create`, `update`, `delete` | Audit |
| `SenderRole` | `requestor`, `event_director`, `admin` | EventHostingRequestMessages |
| `RecipientType` | `requestor`, `event_director`, `admin`, `all` | EventHostingRequestMessages |

---

## 2. Profiles Module - User Management

### Entity Structure

**File:** `apps/backend/src/profiles/profiles.entity.ts`

```typescript
@Entity({ tableName: 'profiles' })
export class Profile {
  @PrimaryKey() id: string;
  @Property() email: string;
  @Property() first_name?: string;
  @Property() last_name?: string;
  @Property() phone?: string;
  @Property() address?: string;
  @Property() city?: string;
  @Property() state?: string;
  @Property() postal_code?: string;
  @Property() country?: string;

  // Role & Membership
  @Enum(() => UserRole) role: UserRole = UserRole.USER;
  @Enum(() => MembershipStatus) membership_status: MembershipStatus;
  @Property() membership_expiry?: Date;
  @Property() meca_id?: string;  // Unique MECA member ID

  // Public Profile
  @Property() is_public?: boolean;
  @Property() vehicle_info?: string;
  @Property() car_audio_system?: string;
  @Property() profile_images?: string[];

  // Billing/Shipping
  @Property() billing_street?, billing_city?, billing_state?, billing_zip?, billing_country?;
  @Property() shipping_street?, shipping_city?, shipping_state?, shipping_zip?, shipping_country?;
  @Property() use_billing_for_shipping?: boolean;

  @Property() created_at: Date;
  @Property() updated_at: Date;
}
```

### Service Functions

**File:** `apps/backend/src/profiles/profiles.service.ts`

| Function | Description | Business Logic |
|----------|-------------|----------------|
| `findAll(page, limit)` | Get paginated profiles | Returns all profiles with pagination |
| `findById(id)` | Get profile by ID | Throws 404 if not found |
| `findByEmail(email)` | Find profile by email | Used for account lookup |
| `findByMecaId(mecaId)` | Find profile by MECA ID | Used for competition results matching |
| `create(data)` | Create new profile | Generates MECA ID, sets defaults |
| `update(id, data)` | Update profile | Preserves role unless admin |
| `delete(id)` | Delete profile | Cascades to related records |
| `getStats()` | Get user statistics | Returns total users, total members |
| `getPublicProfiles()` | Get public profiles | Filters by `is_public = true` |

### API Endpoints

**File:** `apps/backend/src/profiles/profiles.controller.ts`

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/profiles` | `getAll()` | List all profiles (paginated) |
| GET | `/api/profiles/stats` | `getStats()` | Get profile statistics |
| GET | `/api/profiles/public` | `getPublicProfiles()` | Get public member directory |
| GET | `/api/profiles/public/:id` | `getPublicProfileById()` | Get single public profile |
| GET | `/api/profiles/:id` | `getById()` | Get profile by ID |
| POST | `/api/profiles` | `create()` | Create new profile |
| PUT | `/api/profiles/:id` | `update()` | Update profile |
| DELETE | `/api/profiles/:id` | `delete()` | Delete profile |

### Frontend Connection

**File:** `apps/frontend/src/api-client/profiles.api-client.ts`

```typescript
export const profilesApi = {
  getAll: (page, limit) => fetch(`/api/profiles?page=${page}&limit=${limit}`),
  getById: (id) => fetch(`/api/profiles/${id}`),
  create: (data) => fetch('/api/profiles', { method: 'POST', body: data }),
  update: (id, data) => fetch(`/api/profiles/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetch(`/api/profiles/${id}`, { method: 'DELETE' }),
  getStats: () => fetch('/api/profiles/stats'),
  getPublicProfiles: () => fetch('/api/profiles/public'),
  getPublicProfileById: (id) => fetch(`/api/profiles/public/${id}`),
};
```

---

## 3. Membership System

### Entity: MembershipTypeConfig (Product Definition)

**File:** `apps/backend/src/membership-type-configs/membership-type-configs.entity.ts`

```typescript
@Entity({ tableName: 'membership_type_configs' })
export class MembershipTypeConfig {
  @PrimaryKey() id: string;
  @Property() name: string;                    // "Competitor Membership"
  @Property() description?: string;
  @Enum() category: MembershipCategory;        // competitor, team, retail, manufacturer
  @Enum() tier?: ManufacturerTier;            // bronze, silver, gold (manufacturers only)
  @Property() price: number;                   // 50.00
  @Property() currency?: string;               // "usd"
  @Property() benefits?: string[];             // ["Benefit 1", "Benefit 2"]
  @Property() requiredFields?: string[];       // Fields required during checkout
  @Property() optionalFields?: string[];       // Optional fields during checkout
  @Property() isActive: boolean;               // Can be purchased
  @Property() isFeatured: boolean;             // Show prominently
  @Property() showOnPublicSite: boolean;       // Visible on public site
  @Property() isUpgradeOnly: boolean;          // Requires existing membership
  @Property() displayOrder: number;            // Sort order
  @Property() stripePriceId?: string;          // Stripe price ID
  @Property() stripeProductId?: string;        // Stripe product ID
  @Property() quickbooksItemId?: string;       // QuickBooks item mapping
  @Property() quickbooksAccountId?: string;    // QuickBooks deposit account
}
```

### Entity: Membership (User's Purchased Membership)

**File:** `apps/backend/src/memberships/memberships.entity.ts`

```typescript
@Entity({ tableName: 'memberships' })
export class Membership {
  @PrimaryKey() id: string;

  // User reference (optional for guest purchases)
  @ManyToOne(() => Profile, { nullable: true }) user?: Profile;
  @Property() email?: string;                  // For guest purchases

  // Membership type
  @ManyToOne(() => MembershipTypeConfig) membershipTypeConfig: MembershipTypeConfig;
  @Enum() membershipType: MembershipType;      // Legacy field

  // Duration
  @Property() startDate: Date;
  @Property() endDate?: Date;

  // Payment
  @Property() amountPaid: number;
  @Enum() paymentStatus: PaymentStatus;
  @Property() stripePaymentIntentId?: string;
  @Property() transactionId?: string;

  // Guest billing info
  @Property() billingFirstName?, billingLastName?, billingPhone?;
  @Property() billingAddress?, billingCity?, billingState?, billingPostalCode?, billingCountry?;

  // Team/Business info
  @Property() teamName?, teamDescription?;
  @Property() businessName?, businessWebsite?;

  @Property() createdAt, updatedAt: Date;
}
```

### Service Functions

**File:** `apps/backend/src/memberships/memberships.service.ts`

| Function | Description | Business Logic |
|----------|-------------|----------------|
| `createGuestMembership(data)` | Create membership without account | Sets email, billing info, status=PAID, endDate=startDate+1year |
| `createUserMembership(data)` | Create membership for logged-in user | Links to user, status=PAID, endDate=startDate+1year |
| `linkMembershipsToUser(email, userId)` | Link orphan memberships | Finds memberships by email, sets user reference |
| `getUserActiveMembership(userId)` | Get active membership | Filters: endDate >= now AND paymentStatus = PAID |
| `getAllByUserId(userId)` | Get all user memberships | Includes expired |
| `adminAssign(userId, configId)` | Admin assigns membership | No payment required, transactionId = "ADMIN-{timestamp}" |
| `getAll()` | Get all memberships | Admin only |
| `renewMembership(userId, configId)` | Renew expired membership | Creates new membership record |

### Business Rules

1. **Membership Duration:** Default 1 year from purchase date
   ```typescript
   membership.endDate = new Date(membership.startDate);
   membership.endDate.setFullYear(membership.endDate.getFullYear() + 1);
   ```

2. **Active Membership Check:**
   ```typescript
   const isActive = membership.endDate >= new Date() &&
                    membership.paymentStatus === PaymentStatus.PAID;
   ```

3. **Guest-to-User Linking:** When user creates account:
   ```typescript
   // Find orphan memberships by email
   const orphanMemberships = await em.find(Membership, {
     email: userEmail,
     user: null
   });
   // Link to user
   orphanMemberships.forEach(m => m.user = user);
   ```

4. **Admin Assignment:** Creates membership without payment
   ```typescript
   membership.paymentStatus = PaymentStatus.PAID;
   membership.transactionId = `ADMIN-${Date.now()}`;
   ```

### API Endpoints

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/memberships/:id` | `getById()` | Get membership by ID |
| GET | `/api/memberships/email/:email` | `getByEmail()` | Get memberships by email |
| GET | `/api/memberships/user/:userId/active` | `getUserActiveMembership()` | Get user's active membership |
| GET | `/api/memberships/user/:userId/all` | `getAllByUserId()` | Get all user memberships |
| GET | `/api/memberships/admin/all` | `getAll()` | Admin: Get all memberships |
| POST | `/api/memberships/guest` | `createGuestMembership()` | Create guest membership |
| POST | `/api/memberships/user` | `createUserMembership()` | Create user membership |
| POST | `/api/memberships/link-to-user` | `linkMembershipsToUser()` | Link orphan memberships |
| POST | `/api/memberships/admin/assign` | `adminAssign()` | Admin: Assign membership |
| POST | `/api/memberships/user/:userId/renew` | `renewMembership()` | Renew membership |
| PUT | `/api/memberships/:id` | `update()` | Update membership |
| DELETE | `/api/memberships/:id` | `delete()` | Delete membership |

---

## 4. Team System

### Entity: Team

**File:** `apps/backend/src/teams/team.entity.ts`

```typescript
@Entity({ tableName: 'teams' })
export class Team {
  @PrimaryKey() id: string;
  @Property() name: string;                    // Team name (sanitized)
  @Property() description?: string;
  @Property() bio?: string;                    // Detailed about section
  @Property() logoUrl?: string;
  @ManyToOne(() => Profile) captain: Profile;  // Owner (legacy name)
  @ManyToOne(() => Season) season?: Season;
  @Property() teamType: 'competitive' | 'casual' | 'shop' | 'club';
  @Property() location?: string;
  @Property() maxMembers: number = 50;
  @Property() website?: string;
  @Property() isPublic: boolean = true;
  @Property() requiresApproval: boolean = false;
  @Property() galleryImages?: string[];
  @Property() isActive: boolean = true;

  @OneToMany(() => TeamMember, member => member.team) members: TeamMember[];
}
```

### Entity: TeamMember

**File:** `apps/backend/src/teams/team-member.entity.ts`

```typescript
@Entity({ tableName: 'team_members' })
export class TeamMember {
  @PrimaryKey() id: string;
  @ManyToOne(() => Team) team: Team;
  @ManyToOne(() => Profile) user: Profile;
  @Property() role: 'owner' | 'co_owner' | 'moderator' | 'member';
  @Property() status: 'active' | 'pending_approval' | 'pending_invite' | 'pending_renewal' | 'inactive';
  @Property() joinedAt?: Date;
  @Property() requestedAt?: Date;
  @Property() requestMessage?: string;
}
```

### Service Functions

**File:** `apps/backend/src/teams/teams.service.ts`

| Function | Description | Business Logic |
|----------|-------------|----------------|
| `canCreateTeam(userId)` | Check team creation eligibility | Must have TEAM membership AND not on another team |
| `canUpgradeToTeam(userId)` | Check upgrade eligibility | Has COMPETITOR membership but NOT TEAM membership |
| `create(data, userId)` | Create team | Validates eligibility, sanitizes name, creates owner member |
| `getMyTeam(userId)` | Get user's team | Returns team where user is active member |
| `requestToJoin(teamId, userId, message)` | Request to join team | Creates pending_approval member if team.requiresApproval, else direct join |
| `inviteMember(teamId, targetUserId, inviterId)` | Invite user to team | Creates pending_invite member |
| `acceptInvite(teamId, userId)` | Accept pending invite | Changes status to active |
| `approveJoinRequest(teamId, targetUserId, approverId)` | Approve join request | Only owner/co_owner can approve |
| `updateMemberRole(teamId, targetUserId, newRole, actorId)` | Change member role | Role hierarchy enforced |
| `removeMember(teamId, targetUserId, actorId)` | Remove member | Can only remove lower roles |
| `transferOwnership(teamId, newOwnerId, currentOwnerId)` | Transfer ownership | Demotes old owner to co_owner |
| `leaveTeam(userId)` | Leave current team | Owner cannot leave, must transfer first |

### Team Name Sanitization

**File:** `apps/backend/src/teams/teams.service.ts:sanitizeTeamName()`

```typescript
// Removes variants of "team" from name including leetspeak
const teamVariants = [
  'team', 't3am', 'te4m', 't34m', 'teαm', // and more variants
];
// Also trims whitespace and normalizes spaces
```

### Role Hierarchy & Permissions

```typescript
const TEAM_MANAGEMENT_ROLES = ['owner', 'co_owner'];      // Can edit team info
const MEMBER_MANAGEMENT_ROLES = ['owner', 'co_owner', 'moderator']; // Can add/remove members
const ROLE_MANAGEMENT_ROLES = ['owner', 'co_owner'];      // Can change roles

// Role hierarchy for removals
const roleHierarchy = { owner: 4, co_owner: 3, moderator: 2, member: 1 };
// Can only remove members with LOWER role value
```

### Join/Invite Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              JOIN REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User requests to join team                                                 │
│           │                                                                 │
│           ▼                                                                 │
│  ┌────────────────────┐     YES    ┌──────────────────────────┐            │
│  │ User has pending   │──────────▶ │ Auto-approve join request│            │
│  │ invite from team?  │            │ (status → active)        │            │
│  └────────────────────┘            └──────────────────────────┘            │
│           │ NO                                                              │
│           ▼                                                                 │
│  ┌────────────────────┐     NO     ┌──────────────────────────┐            │
│  │ team.requires      │──────────▶ │ Direct join              │            │
│  │ Approval?          │            │ (status → active)        │            │
│  └────────────────────┘            └──────────────────────────┘            │
│           │ YES                                                             │
│           ▼                                                                 │
│  ┌────────────────────────────────────────────┐                            │
│  │ Create pending_approval member             │                            │
│  │ Notify owner/co-owners                     │                            │
│  │ Wait for approval                          │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               INVITE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Owner/Co-owner invites by MECA ID                                         │
│           │                                                                 │
│           ▼                                                                 │
│  ┌────────────────────┐     NO     ┌──────────────────────────┐            │
│  │ Target has active  │──────────▶ │ Return error:            │            │
│  │ MECA membership?   │            │ "User not eligible"      │            │
│  └────────────────────┘            └──────────────────────────┘            │
│           │ YES                                                             │
│           ▼                                                                 │
│  ┌────────────────────┐     YES    ┌──────────────────────────┐            │
│  │ Target has pending │──────────▶ │ Auto-approve their       │            │
│  │ join request?      │            │ request (status → active)│            │
│  └────────────────────┘            └──────────────────────────┘            │
│           │ NO                                                              │
│           ▼                                                                 │
│  ┌────────────────────────────────────────────┐                            │
│  │ Create pending_invite member               │                            │
│  │ Notify target user                         │                            │
│  │ Wait for acceptance                        │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/teams` | `getAllTeams()` | List all active teams |
| GET | `/api/teams/can-create` | `canCreateTeam()` | Check if user can create team |
| GET | `/api/teams/can-upgrade` | `canUpgradeToTeam()` | Check team upgrade eligibility |
| GET | `/api/teams/my-team` | `getMyTeam()` | Get current user's team |
| GET | `/api/teams/my-invites` | `getMyPendingInvites()` | Get user's pending invites |
| GET | `/api/teams/my-requests` | `getMyPendingRequests()` | Get user's pending requests |
| GET | `/api/teams/:id` | `getTeam()` | Get team by ID |
| GET | `/api/teams/user/:userId` | `getTeamByUserId()` | Get team by user ID |
| POST | `/api/teams` | `createTeam()` | Create new team |
| POST | `/api/teams/lookup-member` | `lookupMemberByMecaId()` | Lookup member for invite |
| POST | `/api/teams/:id/members` | `addMember()` | Direct add member |
| POST | `/api/teams/:id/invite` | `inviteMember()` | Invite member |
| POST | `/api/teams/:id/request-join` | `requestToJoin()` | Request to join |
| POST | `/api/teams/:id/accept-invite` | `acceptInvite()` | Accept invite |
| POST | `/api/teams/:id/decline-invite` | `declineInvite()` | Decline invite |
| POST | `/api/teams/:id/approve-request/:userId` | `approveJoinRequest()` | Approve request |
| POST | `/api/teams/leave` | `leaveTeam()` | Leave current team |
| PUT | `/api/teams/:id` | `updateTeam()` | Update team info |
| PUT | `/api/teams/:id/transfer-ownership` | `transferOwnership()` | Transfer ownership |
| PATCH | `/api/teams/:id/members/:userId/role` | `updateMemberRole()` | Change member role |
| DELETE | `/api/teams/:id` | `deleteTeam()` | Delete team |
| DELETE | `/api/teams/:id/members/:userId` | `removeMember()` | Remove member |
| DELETE | `/api/teams/:id/invite/:userId` | `cancelInvite()` | Cancel sent invite |
| DELETE | `/api/teams/:id/request-join` | `cancelJoinRequest()` | Cancel own request |
| DELETE | `/api/teams/:id/reject-request/:userId` | `rejectJoinRequest()` | Reject request |

---

## 5. Events System

### Entity: Event

**File:** `apps/backend/src/events/events.entity.ts`

```typescript
@Entity({ tableName: 'events' })
export class Event {
  @PrimaryKey() id: string;
  @Property() title: string;
  @Property() description?: string;
  @Property() event_date: Date;
  @Property() registration_deadline?: Date;

  // Venue
  @Property() venue_name: string;
  @Property() venue_address: string;
  @Property() venue_city?, venue_state?, venue_postal_code?, venue_country?: string;
  @Property() latitude?, longitude?: number;
  @Property() flyer_url?: string;

  // Configuration
  @ManyToOne(() => Profile) event_director?: Profile;
  @Enum() status: EventStatus;
  @Property() max_participants?: number;
  @Property() registration_fee: number;
  @ManyToOne(() => Season) season?: Season;
  @Property() points_multiplier?: number;      // 1, 2, 3, or 4
  @Property() format?: string;
  @Property() formats?: string[];              // Multiple formats
  @Property() event_type?: string;

  // Multi-day support
  @Property() multi_day_group_id?: string;     // Groups related days
  @Property() day_number?: number;             // 1, 2, 3, etc.

  @Property() created_at, updated_at: Date;
}
```

### Service Functions

**File:** `apps/backend/src/events/events.service.ts`

| Function | Description | Business Logic |
|----------|-------------|----------------|
| `findAll(page, limit, seasonId)` | Get events | Optional season filter |
| `findById(id)` | Get event by ID | Includes director, season |
| `create(data)` | Create event | Sets defaults for status, fee |
| `update(id, data)` | Update event | Validates status transitions |
| `delete(id)` | Delete event | Cascades to results, registrations |
| `createMultiDay(data, days, dates)` | Create multi-day event | Creates linked events with shared group ID |
| `getByMultiDayGroup(groupId)` | Get multi-day events | Returns all days in group |
| `getStats()` | Get event statistics | Total events count |

### Points Multiplier Logic

| EventTypeOption | Multiplier | Description |
|-----------------|------------|-------------|
| `1x Event` | 1 | Standard local event |
| `2x Event` | 2 | Regional event (default) |
| `3x Event` | 3 | SOUNDFEST major events |
| `4x Event` | 4 | Special (SQ, Install, RTA, SQ2/SQ2+) |

### API Endpoints

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/events` | `getAll()` | List events (paginated, filterable) |
| GET | `/api/events/stats` | `getStats()` | Get event statistics |
| GET | `/api/events/multi-day-group/:groupId` | `getByMultiDayGroup()` | Get multi-day events |
| GET | `/api/events/:id` | `getById()` | Get event by ID |
| POST | `/api/events` | `create()` | Create event |
| POST | `/api/events/multi-day` | `createMultiDay()` | Create multi-day event |
| PUT | `/api/events/:id` | `update()` | Update event |
| DELETE | `/api/events/:id` | `delete()` | Delete event |

---

## 6. Event Hosting Requests Workflow

### Entity: EventHostingRequest

**File:** `apps/backend/src/event-hosting-requests/event-hosting-requests.entity.ts`

```typescript
@Entity({ tableName: 'event_hosting_requests' })
export class EventHostingRequest {
  @PrimaryKey() id: string;

  // Requester Info
  @Property() firstName, lastName, email, phone?, businessName?: string;
  @Property() hostType?: string;               // business, individual, etc.
  @ManyToOne(() => Profile) user?: Profile;    // If logged in

  // Venue Info
  @Property() venueName?, venueType?, indoorOutdoor?: string;
  @Property() powerAvailable?: boolean;

  // Event Info
  @Property() eventName, eventDescription: string;
  @Enum() eventType: EventTypeOption;
  @Property() eventTypeOther?: string;

  // Event Dates
  @Property() eventStartDate?, eventEndDate?: Date;
  @Property() eventStartTime?, eventEndTime?: string;
  @Property() competitionFormats?: string[];

  // Multi-Day
  @Property() isMultiDay?: boolean;
  @Property() day2Date?, day3Date?: Date;
  @Property() day2StartTime?, day2EndTime?, day3StartTime?, day3EndTime?: string;

  // Location
  @Property() addressLine1?, addressLine2?, city?, state?, postalCode?, country?: string;

  // Additional
  @Property() expectedParticipants?: number;
  @Property() hasHostedBefore?: boolean;
  @Property() estimatedBudget?, additionalServices?, additionalInfo?: string;

  // Registration/Fees
  @Property() hasRegistrationFee?, preRegistrationAvailable?, hasGateFee?: boolean;
  @Property() memberEntryFee?, nonMemberEntryFee?, gateFee?: string;

  // Status
  @Enum() status: EventHostingRequestStatus = PENDING;

  // Admin Response
  @Property() adminResponse?: string;
  @Property() adminResponseDate?: Date;
  @ManyToOne(() => Profile) adminResponder?: Profile;

  // Event Director Assignment
  @ManyToOne(() => Profile) assignedEventDirector?: Profile;
  @Property() assignedAt?: Date;
  @Property() assignmentNotes?: string;
  @Property() edStatus?: EDAssignmentStatus;
  @Property() edResponseDate?: Date;
  @Property() edRejectionReason?: string;

  // Final Status
  @Property() finalStatus?: FinalApprovalStatus;
  @Property() finalStatusReason?: string;
  @Property() awaitingRequestorResponse: boolean = false;

  // Created Event Link
  @ManyToOne(() => Event) createdEvent?: Event;

  @Property() createdAt, updatedAt: Date;
}
```

### Complete Workflow State Machine

**File:** `apps/backend/src/event-hosting-requests/event-hosting-requests.service.ts`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVENT HOSTING REQUEST WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Submits Request                                                      │
│           │                                                                 │
│           ▼                                                                 │
│   ┌───────────────┐                                                         │
│   │    PENDING    │                                                         │
│   └───────────────┘                                                         │
│           │                                                                 │
│     ┌─────┴─────┐                                                           │
│     ▼           ▼                                                           │
│   Admin       Admin assigns                                                 │
│   reviews     to ED                                                         │
│   directly         │                                                        │
│     │              ▼                                                        │
│     │    ┌─────────────────┐                                                │
│     │    │ ASSIGNED_TO_ED  │                                                │
│     │    └─────────────────┘                                                │
│     │              │                                                        │
│     │              ▼                                                        │
│     │    ┌─────────────────┐                                                │
│     │    │  ED_REVIEWING   │ (ED views request)                             │
│     │    └─────────────────┘                                                │
│     │              │                                                        │
│     │        ┌─────┴─────┐                                                  │
│     │        ▼           ▼                                                  │
│     │   ED accepts   ED rejects                                             │
│     │        │           │                                                  │
│     │        ▼           ▼                                                  │
│     │  ┌────────────┐  ┌────────────┐                                       │
│     │  │ ED_ACCEPTED│  │ ED_REJECTED│───────────┐                           │
│     │  └────────────┘  └────────────┘           │                           │
│     │        │                                  │                           │
│     │        │◀─────────────────────────────────┘                           │
│     │        │        (Admin can reassign)                                  │
│     ▼        ▼                                                              │
│   ┌─────────────────┐                                                       │
│   │  UNDER_REVIEW   │ (Admin final review)                                  │
│   └─────────────────┘                                                       │
│           │                                                                 │
│     ┌─────┼─────┬───────────┬──────────────┐                                │
│     ▼     ▼     ▼           ▼              ▼                                │
│  APPROVED  REJECTED  PENDING_INFO  APPROVED_PENDING_INFO                    │
│     │                     │              │                                  │
│     │                     ▼              │                                  │
│     │        (Requestor responds)        │                                  │
│     │                     │              │                                  │
│     │                     ▼              │                                  │
│     │              Back to UNDER_REVIEW  │                                  │
│     │                                    │                                  │
│     └────────────────┬───────────────────┘                                  │
│                      │                                                      │
│                      ▼                                                      │
│              ┌───────────────┐                                              │
│              │ AUTO-CREATE   │                                              │
│              │    EVENT      │                                              │
│              └───────────────┘                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Service Functions

| Function | Description | Triggers |
|----------|-------------|----------|
| `create(data)` | Create new request | Status → PENDING |
| `assignToEventDirector(requestId, edId, adminId)` | Assign to ED | Status → ASSIGNED_TO_ED, Notifies ED |
| `reassignEventDirector(requestId, newEdId, adminId)` | Reassign to different ED | Status → ASSIGNED_TO_ED, Notifies new ED |
| `revokeEDAssignment(requestId, adminId, reason)` | Remove ED | Status → UNDER_REVIEW, Notifies ED |
| `edAcceptAssignment(requestId, edId)` | ED accepts | Status → ED_ACCEPTED, Notifies admins |
| `edRejectAssignment(requestId, edId, reason)` | ED rejects | Status → ED_REJECTED, Notifies admins |
| `setFinalApproval(requestId, adminId, status, reason)` | Final decision | Status → APPROVED/REJECTED/etc., Auto-creates event if approved |
| `requestFurtherInfo(requestId, senderId, role, message)` | Request info | awaitingRequestorResponse → true |
| `requestorRespond(requestId, requestorId, message)` | Requestor responds | awaitingRequestorResponse → false |
| `createEventFromRequest(requestId)` | Auto-create event | Called when APPROVED |
| `addMessage(requestId, senderId, role, message, isPrivate)` | Add message | Notifies appropriate parties |
| `getMessages(requestId, viewerRole)` | Get messages | Filters private messages based on role |

### Auto-Create Event Logic

**File:** `apps/backend/src/event-hosting-requests/event-hosting-requests.service.ts:createEventFromRequest()`

```typescript
async createEventFromRequest(requestId: string): Promise<Event> {
  const request = await em.findOne(EventHostingRequest, { id: requestId });

  const eventData = {
    title: request.eventName,
    description: request.eventDescription,
    event_date: request.eventStartDate,
    venue_name: request.businessName || 'TBD',
    venue_address: [request.addressLine1, request.addressLine2].filter(Boolean).join(', '),
    venue_city: request.city,
    venue_state: request.state,
    venue_postal_code: request.postalCode,
    venue_country: request.country || 'United States',
    max_participants: request.expectedParticipants,
    status: EventStatus.PENDING,  // Event starts in pending
    event_director_id: request.assignedEventDirectorId,  // If ED was assigned
  };

  const event = await this.eventsService.create(eventData);

  // Link event back to request
  request.createdEvent = Reference.createFromPK(Event, event.id);

  // Notify admins
  // ...

  return event;
}
```

### Messaging System

**Entity:** `EventHostingRequestMessage`

```typescript
@Entity({ tableName: 'event_hosting_request_messages' })
export class EventHostingRequestMessage {
  @PrimaryKey() id: string;
  @ManyToOne(() => EventHostingRequest) request: EventHostingRequest;
  @ManyToOne(() => Profile) sender: Profile;
  @Enum() senderRole: SenderRole;              // requestor, event_director, admin
  @Property() message: string;
  @Property() isPrivate: boolean = false;      // ED/Admin only
  @Enum() recipientType?: RecipientType;       // requestor, event_director, admin, all
  @Property() createdAt: Date;
}
```

**Visibility Rules:**
- `isPrivate = true`: Only visible to EVENT_DIRECTOR and ADMIN
- `isPrivate = false`: Visible to REQUESTOR too (based on recipientType)

### API Endpoints

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/event-hosting-requests` | `getAll()` | List requests (paginated, filterable) |
| GET | `/api/event-hosting-requests/stats` | `getStats()` | Get request statistics |
| GET | `/api/event-hosting-requests/available-event-directors` | `getAvailableEventDirectors()` | List EDs for assignment |
| GET | `/api/event-hosting-requests/user/:userId` | `getByUserId()` | Get user's requests |
| GET | `/api/event-hosting-requests/event-director/:edId` | `getByEventDirector()` | Get ED's assigned requests |
| GET | `/api/event-hosting-requests/event-director/:edId/stats` | `getEventDirectorStats()` | Get ED's stats |
| GET | `/api/event-hosting-requests/:id` | `getById()` | Get request by ID |
| GET | `/api/event-hosting-requests/:id/messages` | `getMessages()` | Get request messages |
| POST | `/api/event-hosting-requests` | `create()` | Create new request |
| POST | `/api/event-hosting-requests/:id/assign` | `assignToEventDirector()` | Assign to ED |
| POST | `/api/event-hosting-requests/:id/reassign` | `reassignEventDirector()` | Reassign ED |
| POST | `/api/event-hosting-requests/:id/revoke-assignment` | `revokeEDAssignment()` | Revoke ED |
| POST | `/api/event-hosting-requests/:id/ed-accept` | `edAcceptAssignment()` | ED accepts |
| POST | `/api/event-hosting-requests/:id/ed-reject` | `edRejectAssignment()` | ED rejects |
| POST | `/api/event-hosting-requests/:id/final-approval` | `setFinalApproval()` | Set final status |
| POST | `/api/event-hosting-requests/:id/request-info` | `requestFurtherInfo()` | Request more info |
| POST | `/api/event-hosting-requests/:id/requestor-respond` | `requestorRespond()` | Requestor responds |
| POST | `/api/event-hosting-requests/:id/messages` | `addMessage()` | Add message |
| PUT | `/api/event-hosting-requests/:id` | `update()` | Update request |
| DELETE | `/api/event-hosting-requests/:id` | `delete()` | Delete request |

---

## 7. Competition Results & Points System

### Entity: CompetitionResult

**File:** `apps/backend/src/competition-results/competition-results.entity.ts`

```typescript
@Entity({ tableName: 'competition_results' })
export class CompetitionResult {
  @PrimaryKey() id: string;

  @ManyToOne(() => Event) event: Event;
  @ManyToOne(() => Profile) competitor?: Profile;  // Null for guests

  @Property() competitorName: string;
  @Property() mecaId?: string;                      // '999999' for guests
  @Property() competitionClass: string;            // "Street 1", "Extreme", etc.
  @Property() format?: string;                     // "SPL", "SQL", "SSI", "MK"
  @Property() score: number;
  @Property() placement: number;                   // 1, 2, 3, etc.
  @Property() pointsEarned: number = 0;           // Calculated based on placement & multiplier

  @Property() vehicleInfo?: string;
  @Property() wattage?: number;
  @Property() frequency?: number;
  @Property() notes?: string;

  @ManyToOne(() => Season) season?: Season;
  @ManyToOne(() => CompetitionClass) competitionClassEntity?: CompetitionClass;

  // Audit fields
  @ManyToOne(() => Profile) creator: Profile;
  @ManyToOne(() => Profile) updater?: Profile;
  @Property() createdAt: Date;
  @Property() updatedAt?: Date;
  @Property() revisionCount: number = 0;
  @Property() modificationReason?: string;
}
```

### Points Calculation Logic

**File:** `apps/backend/src/competition-results/competition-results.service.ts`

```typescript
// Eligible formats for points
const eligibleFormats = ['SPL', 'SQL', 'SSI', 'MK'];

// Base points by placement (only top 5)
const BASE_POINTS = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };

// Points table by multiplier
const POINTS_TABLE = {
  1: { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 },   // 1x Event
  2: { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 },  // 2x Event
  3: { 1: 15, 2: 12, 3: 9, 4: 6, 5: 3 }, // 3x Event (SOUNDFEST)
  4: { 1: 20, 2: 19, 3: 18, 4: 17, 5: 16 }, // 4x Event (SQ/Install/RTA)
};

function calculatePoints(placement: number, multiplier: number): number {
  if (placement > 5) return 0;
  return POINTS_TABLE[multiplier]?.[placement] || 0;
}
```

### Point Eligibility Rules

```typescript
function isEligibleForPoints(mecaId: string, profile?: Profile): boolean {
  // Guest competitor (no MECA ID)
  if (mecaId === '999999') return false;

  // Unassigned
  if (mecaId === '0' || !mecaId) return false;

  // Test/special entries
  if (mecaId.startsWith('99')) return false;

  // Must have profile linked
  if (!profile) return false;

  // Membership must be active
  if (profile.membership_status !== 'active') return false;

  // Membership must not be expired
  if (profile.membership_expiry && profile.membership_expiry < new Date()) return false;

  return true;
}
```

### Import Logic

**File:** `apps/backend/src/competition-results/results-import.service.ts`

```typescript
// Import decision matrix
async function determineImportData(importRow, eventId): ImportDecision {
  if (importRow.mecaId && importRow.mecaId !== '999999') {
    // Has MECA ID - try to find profile
    const profile = await findByMecaId(importRow.mecaId);
    if (profile && profile.membership_status === 'active') {
      // Use system data, eligible for points
      return {
        competitorId: profile.id,
        competitorName: `${profile.first_name} ${profile.last_name}`,
        mecaId: profile.meca_id,
        eligibleForPoints: true,
      };
    } else {
      // Keep file data, no points
      return {
        competitorName: importRow.name,
        mecaId: importRow.mecaId,
        eligibleForPoints: false,
      };
    }
  } else {
    // No MECA ID - try name match
    const profile = await findByName(importRow.name);
    if (profile && profile.membership_status === 'active') {
      // Use system data, eligible for points
      return {
        competitorId: profile.id,
        competitorName: `${profile.first_name} ${profile.last_name}`,
        mecaId: profile.meca_id,
        eligibleForPoints: true,
      };
    } else {
      // Guest competitor
      return {
        competitorName: importRow.name,
        mecaId: '999999',
        eligibleForPoints: false,
      };
    }
  }
}
```

### Duplicate Detection

```typescript
// Check for duplicates by:
// 1. For members: format + class + MECA ID
// 2. For non-members: format + class + name (when MECA ID is 999999)

async function checkForDuplicates(eventId, parsedResults): DuplicateCheck {
  const existingResults = await findByEvent(eventId);
  const duplicates = [];
  const nonDuplicates = [];

  parsedResults.forEach((result, index) => {
    const existing = existingResults.find(e => {
      if (result.mecaId && result.mecaId !== '999999') {
        // Match by MECA ID
        return e.format === result.format &&
               e.competitionClass === result.class &&
               e.mecaId === result.mecaId;
      } else {
        // Match by name for guests
        return e.format === result.format &&
               e.competitionClass === result.class &&
               e.competitorName === result.name &&
               e.mecaId === '999999';
      }
    });

    if (existing) {
      duplicates.push({ index, importData: result, existingData: existing });
    } else {
      nonDuplicates.push(index);
    }
  });

  return { duplicates, nonDuplicates };
}
```

### Service Functions

| Function | Description | Business Logic |
|----------|-------------|----------------|
| `findAll()` | Get all results | Returns all competition results |
| `findByEvent(eventId)` | Get results for event | Filtered by event |
| `findByMecaId(mecaId)` | Get results for competitor | Filtered by MECA ID |
| `getLeaderboard(seasonId)` | Get season leaderboard | Aggregates points by competitor |
| `create(data, userId)` | Create single result | Calculates points, logs audit |
| `update(id, data, userId)` | Update result | Recalculates points, increments revision, logs audit |
| `delete(id, userId, reason)` | Delete result | Logs audit with reason |
| `importResults(eventId, parsedResults, createdBy)` | Bulk import | Creates session, processes all results |
| `checkForDuplicates(eventId, parsedResults)` | Check duplicates | Returns duplicate/non-duplicate lists |
| `importResultsWithResolution(eventId, results, resolutions)` | Import with resolution | Handles skip/replace for duplicates |
| `updateEventPoints(eventId)` | Recalculate all points | Recalculates all results for event |
| `startManualSession(eventId, userId)` | Start manual entry session | Creates audit session |
| `endManualSession()` | End manual session | Closes audit session |

### API Endpoints

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/competition-results` | `getAllResults()` | List all results |
| GET | `/api/competition-results/leaderboard` | `getLeaderboard()` | Get season leaderboard |
| GET | `/api/competition-results/by-event/:eventId` | `getResultsByEvent()` | Get results for event |
| GET | `/api/competition-results/by-meca-id/:mecaId` | `getResultsByMecaId()` | Get competitor's results |
| GET | `/api/competition-results/:id` | `getResult()` | Get result by ID |
| POST | `/api/competition-results` | `createResult()` | Create single result |
| POST | `/api/competition-results/session/start` | `startManualSession()` | Start manual entry session |
| POST | `/api/competition-results/session/end` | `endManualSession()` | End manual session |
| POST | `/api/competition-results/recalculate-points/:eventId` | `recalculateEventPoints()` | Recalculate event points |
| POST | `/api/competition-results/import/:eventId` | `importResults()` | Import from file |
| POST | `/api/competition-results/check-duplicates/:eventId` | `checkDuplicates()` | Check for duplicates |
| POST | `/api/competition-results/import-with-resolution/:eventId` | `importWithResolution()` | Import with duplicate resolution |
| PUT | `/api/competition-results/:id` | `updateResult()` | Update result |
| DELETE | `/api/competition-results/:id` | `deleteResult()` | Delete result |

---

## 8. Payment Processing (Stripe)

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRIPE PAYMENT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. User selects membership type on frontend                               │
│           │                                                                 │
│           ▼                                                                 │
│   2. Frontend calls POST /api/stripe/create-payment-intent                  │
│      Body: { membershipTypeConfigId, email, billingInfo, ... }              │
│           │                                                                 │
│           ▼                                                                 │
│   3. Backend StripeController.createPaymentIntent()                         │
│      - Validates membershipTypeConfigId exists and isActive                 │
│      - Converts price to cents (price * 100)                                │
│      - Stores metadata: email, category, billing info, team/business info   │
│      - Calls stripeService.createPaymentIntent()                            │
│           │                                                                 │
│           ▼                                                                 │
│   4. Stripe creates PaymentIntent                                           │
│      Returns: { clientSecret, paymentIntentId }                             │
│           │                                                                 │
│           ▼                                                                 │
│   5. Frontend displays Stripe Elements checkout                             │
│      User enters card details                                               │
│           │                                                                 │
│           ▼                                                                 │
│   6. User submits payment                                                   │
│      Stripe processes card                                                  │
│           │                                                                 │
│       ┌───┴───┐                                                             │
│       ▼       ▼                                                             │
│   SUCCESS   FAILURE                                                         │
│       │       │                                                             │
│       │       ▼                                                             │
│       │   Stripe sends webhook: payment_intent.payment_failed               │
│       │   → StripeController.handlePaymentIntentFailed()                    │
│       │   → Log failure (could notify admin)                                │
│       │                                                                     │
│       ▼                                                                     │
│   7. Stripe sends webhook: payment_intent.succeeded                         │
│      POST /api/stripe/webhook                                               │
│           │                                                                 │
│           ▼                                                                 │
│   8. StripeController.handlePaymentIntentSucceeded()                        │
│      - Extracts metadata from PaymentIntent                                 │
│      - Determines membershipType from category                              │
│           │                                                                 │
│       ┌───┴───┐                                                             │
│       ▼       ▼                                                             │
│   Has userId?  No userId (guest)                                            │
│       │            │                                                        │
│       ▼            ▼                                                        │
│   membershipsService.createUserMembership()                                 │
│   membershipsService.createGuestMembership()                                │
│           │                                                                 │
│           ▼                                                                 │
│   9. Async: Create QuickBooks sales receipt                                 │
│      - Runs in background (non-blocking)                                    │
│      - Errors logged but don't fail payment                                 │
│           │                                                                 │
│           ▼                                                                 │
│   10. User redirected to success page                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stripe Service Functions

**File:** `apps/backend/src/stripe/stripe.service.ts`

| Function | Description |
|----------|-------------|
| `createPaymentIntent(data)` | Create Stripe PaymentIntent with metadata |
| `getPaymentIntent(id)` | Retrieve PaymentIntent by ID |
| `constructWebhookEvent(payload, signature)` | Verify and parse webhook |
| `findOrCreateCustomer(email, name)` | Find or create Stripe customer |
| `createRefund(paymentIntentId, reason)` | Create refund for payment |

### Stripe Controller

**File:** `apps/backend/src/stripe/stripe.controller.ts`

| Endpoint | Handler | Description |
|----------|---------|-------------|
| POST `/api/stripe/create-payment-intent` | `createPaymentIntent()` | Create payment intent |
| POST `/api/stripe/webhook` | `handleWebhook()` | Process Stripe webhooks |

### Category to MembershipType Mapping

```typescript
function getMembershipTypeFromCategory(category: string): MembershipType {
  switch (category) {
    case 'competitor': return MembershipType.DOMESTIC;
    case 'team': return MembershipType.TEAM;
    case 'retail': return MembershipType.RETAILER;
    default: return MembershipType.ANNUAL;
  }
}
```

---

## 9. QuickBooks Integration

### Entity: QuickBooksConnection

**File:** `apps/backend/src/quickbooks/quickbooks-connection.entity.ts`

```typescript
@Entity({ tableName: 'quickbooks_connections' })
export class QuickBooksConnection {
  @PrimaryKey() id: string;
  @Property() realmId: string;           // QuickBooks company ID
  @Property() accessToken: string;
  @Property() refreshToken: string;
  @Property() accessTokenExpiresAt: Date;
  @Property() refreshTokenExpiresAt: Date;
  @Property() companyName?: string;
  @Property() isActive: boolean = true;
  @Property() lastSyncAt?: Date;
  @Property() createdAt, updatedAt: Date;
}
```

### OAuth Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       QUICKBOOKS OAUTH FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Admin clicks "Connect QuickBooks" in admin panel                       │
│           │                                                                 │
│           ▼                                                                 │
│   2. GET /api/quickbooks/auth-url                                           │
│      Returns: { url: "https://appcenter.intuit.com/connect/oauth2..." }     │
│           │                                                                 │
│           ▼                                                                 │
│   3. User redirected to QuickBooks login                                    │
│      User authorizes app                                                    │
│           │                                                                 │
│           ▼                                                                 │
│   4. QuickBooks redirects to callback URL with auth code                    │
│      GET /api/quickbooks/callback?code=...&realmId=...                      │
│           │                                                                 │
│           ▼                                                                 │
│   5. quickBooksService.handleOAuthCallback()                                │
│      - Exchanges code for tokens                                            │
│      - Gets company info                                                    │
│      - Stores/updates QuickBooksConnection                                  │
│           │                                                                 │
│           ▼                                                                 │
│   6. Admin redirected back to dashboard                                     │
│      Connection status shown                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Refresh Logic

**File:** `apps/backend/src/quickbooks/quickbooks.service.ts:refreshTokenIfNeeded()`

```typescript
async refreshTokenIfNeeded(connection: QuickBooksConnection): Promise<string> {
  // Check if access token is still valid (with 5 minute buffer)
  if (connection.accessTokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return connection.accessToken;
  }

  // Check if refresh token is expired
  if (connection.refreshTokenExpiresAt < new Date()) {
    throw new BadRequestException('QuickBooks refresh token has expired. Please reconnect.');
  }

  // Refresh the token
  const authResponse = await this.oauthClient.refresh();
  const tokens = authResponse.getJson();

  // Update stored tokens
  connection.accessToken = tokens.access_token;
  connection.refreshToken = tokens.refresh_token;
  connection.accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  connection.refreshTokenExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);

  return tokens.access_token;
}
```

### Sales Receipt Creation

**File:** `apps/backend/src/quickbooks/quickbooks.service.ts:createSalesReceipt()`

```typescript
async createSalesReceipt(data: CreateSalesReceiptDto): Promise<any> {
  // 1. Get membership type config for QuickBooks mapping
  const membershipConfig = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });

  // 2. Get QuickBooks client (auto-refreshes token if needed)
  const qbo = await this.getQuickBooksClient();

  // 3. Find or create customer by email
  const customer = await this.findOrCreateCustomer(qbo, data.customerEmail, data.customerName);

  // 4. Build sales receipt
  const salesReceipt = {
    CustomerRef: { value: customer.Id, name: customer.DisplayName },
    TxnDate: data.paymentDate.toISOString().split('T')[0],
    PrivateNote: `Stripe Payment: ${data.stripePaymentIntentId}`,
    Line: [{
      Amount: data.amount,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: membershipConfig.quickbooksItemId
          ? { value: membershipConfig.quickbooksItemId }
          : { value: '1', name: 'Services' },  // Default
        Qty: 1,
        UnitPrice: data.amount,
      },
      Description: `${membershipConfig.name} Membership`,
    }],
    BillAddr: data.billingAddress ? { ... } : undefined,
    DepositToAccountRef: membershipConfig.quickbooksAccountId
      ? { value: membershipConfig.quickbooksAccountId }
      : undefined,
  };

  // 5. Create in QuickBooks
  return new Promise((resolve, reject) => {
    qbo.createSalesReceipt(salesReceipt, (err, receipt) => {
      if (err) reject(err);
      else {
        this.updateLastSyncTime();
        resolve(receipt);
      }
    });
  });
}
```

### Service Functions

| Function | Description |
|----------|-------------|
| `getAuthorizationUrl()` | Get OAuth URL for connecting |
| `handleOAuthCallback(url)` | Process OAuth callback |
| `getActiveConnection()` | Get current active connection |
| `getConnectionStatus()` | Get connection status for UI |
| `disconnect()` | Disconnect QuickBooks |
| `createSalesReceipt(data)` | Create sales receipt |
| `getItems()` | Get QuickBooks items list |
| `getAccounts()` | Get QuickBooks bank accounts |

---

## 10. Notifications System

### Entity: Notification

**File:** `apps/backend/src/notifications/notifications.entity.ts`

```typescript
@Entity({ tableName: 'notifications' })
export class Notification {
  @PrimaryKey() id: string;
  @ManyToOne(() => Profile) user: Profile;      // Recipient
  @ManyToOne(() => Profile) fromUser?: Profile; // Sender (optional)
  @Property() title: string;
  @Property() message: string;
  @Property() type: 'info' | 'alert' | 'message';
  @Property() link?: string;                    // Deep link path
  @Property() read: boolean = false;
  @Property() readAt?: Date;
  @Property() createdAt: Date;
}
```

### Service Functions

**File:** `apps/backend/src/notifications/notifications.service.ts`

| Function | Description |
|----------|-------------|
| `findByUserId(userId, limit)` | Get user's notifications (most recent first) |
| `findById(id)` | Get notification by ID |
| `getUnreadCount(userId)` | Count unread notifications |
| `create(data)` | Create notification |
| `markAsRead(id, userId)` | Mark single notification as read |
| `markAllAsRead(userId)` | Mark all user's notifications as read |
| `delete(id, userId)` | Delete notification |

### Notification Triggers (Cross-Module)

| Module | Event | Notification |
|--------|-------|--------------|
| EventHostingRequests | ED assigned | Notify ED: "You have been assigned to review: {eventName}" |
| EventHostingRequests | ED accepts | Notify admins: "ED has accepted to manage: {eventName}" |
| EventHostingRequests | ED rejects | Notify admins: "ED has declined: {eventName}" |
| EventHostingRequests | Assignment revoked | Notify ED: "Your assignment has been revoked" |
| EventHostingRequests | Final approval | Notify requestor: "Your request has been approved/rejected" |
| EventHostingRequests | Message added | Notify relevant parties based on recipientType |
| EventHostingRequests | Event created | Notify admins: "Event created from hosting request" |
| Teams | Invite sent | Notify target user |
| Teams | Join request | Notify team owner/co-owners |
| Teams | Request approved/rejected | Notify requester |

---

## 11. Audit System

### Entities

**File:** `apps/backend/src/audit/results-entry-session.entity.ts`

```typescript
@Entity({ tableName: 'results_entry_sessions' })
export class ResultsEntrySession {
  @PrimaryKey() id: string;
  @ManyToOne(() => Event) event: Event;
  @ManyToOne(() => Profile) user: Profile;
  @Enum() entryMethod: 'manual' | 'excel' | 'termlab';
  @Property() format?: string;
  @Property() filePath?: string;              // Saved file location
  @Property() originalFilename?: string;
  @Property() resultCount: number = 0;
  @Property() sessionStart: Date;
  @Property() sessionEnd?: Date;
  @Property() createdAt: Date;
}
```

**File:** `apps/backend/src/audit/results-audit-log.entity.ts`

```typescript
@Entity({ tableName: 'results_audit_logs' })
export class ResultsAuditLog {
  @PrimaryKey() id: string;
  @ManyToOne(() => ResultsEntrySession) session?: ResultsEntrySession;
  @ManyToOne(() => CompetitionResult) result?: CompetitionResult;
  @Enum() action: 'create' | 'update' | 'delete';
  @Property({ type: 'json' }) oldData?: any;
  @Property({ type: 'json' }) newData?: any;
  @ManyToOne(() => Profile) user: Profile;
  @Property() timestamp: Date;
}
```

### Service Functions

**File:** `apps/backend/src/audit/audit.service.ts`

| Function | Description |
|----------|-------------|
| `createSession(data)` | Create entry session |
| `endSession(sessionId, resultCount)` | End session with count |
| `updateSessionFilePath(sessionId, filePath)` | Update file path |
| `logAction(data)` | Log audit entry |
| `saveUploadedFile(file, eventId, sessionId)` | Save file to audit directory |
| `generateManualEntriesExcel(eventId, sessionId, results)` | Export manual entries |
| `getEventSessions(eventId)` | Get sessions for event |
| `getSessionAuditLogs(sessionId)` | Get logs for session |
| `getEventModifications(eventId)` | Get update logs for event |
| `getEventDeletions(eventId)` | Get delete logs for event |
| `getEventAllLogs(eventId)` | Get all logs for event |
| `getAuditLogById(logId)` | Get single log |

### File Storage

```
audit-logs/
├── uploads/
│   └── {eventId}/
│       └── {sessionId}_{timestamp}.xlsx
└── sessions/
    └── {eventId}/
        └── manual_{sessionId}_{timestamp}.xlsx
```

---

## 12. Cross-Module Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODULE DEPENDENCIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   StripeController                                                          │
│       ├── StripeService (payment processing)                                │
│       ├── MembershipsService (create membership on payment success)         │
│       └── QuickBooksService (create sales receipt async)                    │
│                                                                             │
│   EventHostingRequestsService                                               │
│       ├── NotificationsService (send notifications on status changes)       │
│       └── EventsService (auto-create event on approval)                     │
│                                                                             │
│   TeamsService                                                              │
│       ├── MembershipsService (check team membership for creation)           │
│       ├── ProfilesService (lookup members by MECA ID)                       │
│       └── NotificationsService (invite/request notifications)               │
│                                                                             │
│   CompetitionResultsService                                                 │
│       ├── ProfilesService (lookup competitors, validate membership)         │
│       ├── EventsService (get event for points multiplier)                   │
│       ├── AuditService (log all changes)                                    │
│       └── ResultsImportService (parse import files)                         │
│                                                                             │
│   MembershipsService                                                        │
│       ├── ProfilesService (link memberships to users)                       │
│       └── MembershipTypeConfigsService (get pricing/config)                 │
│                                                                             │
│   QuickBooksService                                                         │
│       └── MembershipTypeConfigsService (get QB item/account mapping)        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. API Endpoint Reference

### Complete Endpoint List

#### Profiles (`/api/profiles`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List profiles |
| GET | `/api/profiles/stats` | Get statistics |
| GET | `/api/profiles/public` | Get public profiles |
| GET | `/api/profiles/public/:id` | Get public profile |
| GET | `/api/profiles/:id` | Get profile by ID |
| POST | `/api/profiles` | Create profile |
| PUT | `/api/profiles/:id` | Update profile |
| DELETE | `/api/profiles/:id` | Delete profile |

#### Memberships (`/api/memberships`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memberships/:id` | Get by ID |
| GET | `/api/memberships/email/:email` | Get by email |
| GET | `/api/memberships/user/:userId/active` | Get user's active |
| GET | `/api/memberships/user/:userId/all` | Get user's all |
| GET | `/api/memberships/admin/all` | Admin: Get all |
| POST | `/api/memberships/guest` | Create guest |
| POST | `/api/memberships/user` | Create user |
| POST | `/api/memberships/link-to-user` | Link orphans |
| POST | `/api/memberships/admin/assign` | Admin assign |
| POST | `/api/memberships/user/:userId/renew` | Renew |
| PUT | `/api/memberships/:id` | Update |
| DELETE | `/api/memberships/:id` | Delete |

#### Teams (`/api/teams`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List teams |
| GET | `/api/teams/can-create` | Check create eligibility |
| GET | `/api/teams/can-upgrade` | Check upgrade eligibility |
| GET | `/api/teams/my-team` | Get user's team |
| GET | `/api/teams/my-invites` | Get pending invites |
| GET | `/api/teams/my-requests` | Get pending requests |
| GET | `/api/teams/:id` | Get team |
| GET | `/api/teams/user/:userId` | Get by user |
| POST | `/api/teams` | Create team |
| POST | `/api/teams/lookup-member` | Lookup by MECA ID |
| POST | `/api/teams/:id/members` | Add member |
| POST | `/api/teams/:id/invite` | Invite member |
| POST | `/api/teams/:id/request-join` | Request join |
| POST | `/api/teams/:id/accept-invite` | Accept invite |
| POST | `/api/teams/:id/decline-invite` | Decline invite |
| POST | `/api/teams/:id/approve-request/:userId` | Approve request |
| POST | `/api/teams/leave` | Leave team |
| PUT | `/api/teams/:id` | Update team |
| PUT | `/api/teams/:id/transfer-ownership` | Transfer ownership |
| PATCH | `/api/teams/:id/members/:userId/role` | Change role |
| DELETE | `/api/teams/:id` | Delete team |
| DELETE | `/api/teams/:id/members/:userId` | Remove member |
| DELETE | `/api/teams/:id/invite/:userId` | Cancel invite |
| DELETE | `/api/teams/:id/request-join` | Cancel request |
| DELETE | `/api/teams/:id/reject-request/:userId` | Reject request |

#### Events (`/api/events`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events |
| GET | `/api/events/stats` | Get statistics |
| GET | `/api/events/multi-day-group/:groupId` | Get multi-day |
| GET | `/api/events/:id` | Get event |
| POST | `/api/events` | Create event |
| POST | `/api/events/multi-day` | Create multi-day |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |

#### Event Hosting Requests (`/api/event-hosting-requests`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/event-hosting-requests` | List requests |
| GET | `/api/event-hosting-requests/stats` | Get statistics |
| GET | `/api/event-hosting-requests/available-event-directors` | List available EDs |
| GET | `/api/event-hosting-requests/user/:userId` | Get user's requests |
| GET | `/api/event-hosting-requests/event-director/:edId` | Get ED's requests |
| GET | `/api/event-hosting-requests/event-director/:edId/stats` | Get ED's stats |
| GET | `/api/event-hosting-requests/:id` | Get request |
| GET | `/api/event-hosting-requests/:id/messages` | Get messages |
| POST | `/api/event-hosting-requests` | Create request |
| POST | `/api/event-hosting-requests/:id/assign` | Assign to ED |
| POST | `/api/event-hosting-requests/:id/reassign` | Reassign ED |
| POST | `/api/event-hosting-requests/:id/revoke-assignment` | Revoke ED |
| POST | `/api/event-hosting-requests/:id/ed-accept` | ED accepts |
| POST | `/api/event-hosting-requests/:id/ed-reject` | ED rejects |
| POST | `/api/event-hosting-requests/:id/final-approval` | Final approval |
| POST | `/api/event-hosting-requests/:id/request-info` | Request info |
| POST | `/api/event-hosting-requests/:id/requestor-respond` | Requestor responds |
| POST | `/api/event-hosting-requests/:id/messages` | Add message |
| PUT | `/api/event-hosting-requests/:id` | Update request |
| DELETE | `/api/event-hosting-requests/:id` | Delete request |

#### Competition Results (`/api/competition-results`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/competition-results` | List all |
| GET | `/api/competition-results/leaderboard` | Get leaderboard |
| GET | `/api/competition-results/by-event/:eventId` | Get by event |
| GET | `/api/competition-results/by-meca-id/:mecaId` | Get by competitor |
| GET | `/api/competition-results/:id` | Get result |
| POST | `/api/competition-results` | Create result |
| POST | `/api/competition-results/session/start` | Start session |
| POST | `/api/competition-results/session/end` | End session |
| POST | `/api/competition-results/recalculate-points/:eventId` | Recalculate |
| POST | `/api/competition-results/import/:eventId` | Import file |
| POST | `/api/competition-results/check-duplicates/:eventId` | Check duplicates |
| POST | `/api/competition-results/import-with-resolution/:eventId` | Import with resolution |
| PUT | `/api/competition-results/:id` | Update result |
| DELETE | `/api/competition-results/:id` | Delete result |

#### Stripe (`/api/stripe`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/create-payment-intent` | Create payment intent |
| POST | `/api/stripe/webhook` | Handle webhooks |

#### QuickBooks (`/api/quickbooks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quickbooks/auth-url` | Get OAuth URL |
| GET | `/api/quickbooks/callback` | OAuth callback |
| GET | `/api/quickbooks/status` | Connection status |
| GET | `/api/quickbooks/items` | Get items |
| GET | `/api/quickbooks/accounts` | Get accounts |
| POST | `/api/quickbooks/disconnect` | Disconnect |

#### Notifications (`/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/user/:userId` | Get user's notifications |
| GET | `/api/notifications/user/:userId/unread-count` | Get unread count |
| GET | `/api/notifications/:id` | Get notification |
| POST | `/api/notifications` | Create notification |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/user/:userId/read-all` | Mark all read |
| DELETE | `/api/notifications/:id` | Delete notification |

---

## Questions for Review

Please review this document and confirm or correct:

1. **Membership Logic:**
   - Is 1 year the correct default duration?
   - Are all membership categories represented?
   - Is the guest-to-user linking correct?

2. **Team System:**
   - Is the role hierarchy (owner > co_owner > moderator > member) correct?
   - Is the join/invite flow accurate?
   - Are the permissions for each role correct?

3. **Event Hosting Workflow:**
   - Is the status flow diagram accurate?
   - Should events auto-create only for APPROVED or also for APPROVED_PENDING_INFO?
   - Are all notification triggers documented correctly?

4. **Points System:**
   - Are the points values correct for each multiplier?
   - Are the eligibility rules complete?
   - Are special MECA IDs (999999, starting with 99) handled correctly?

5. **Payment Flow:**
   - Is the Stripe flow accurate?
   - Is the QuickBooks integration optional (non-blocking)?

6. **Missing Features:**
   - Are there any features not documented here?
   - Are there any planned features that need business logic defined?

---

*End of Document*
