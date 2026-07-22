# MECA Production Security Remediation Plan

Status: **Draft — awaiting approval**

No implementation work, configuration changes, database operations, credential rotation, deployment, or Git-history rewrite is authorized by this document alone.

## Executive summary

Virtually all legitimate functionality can be preserved. The remediation changes who may perform sensitive actions and how payments and integrations are verified, rather than removing business features.

Controlled impacts that may be necessary:

- Users may need to restart PayPal checkouts that were already in progress during deployment.
- QuickBooks may require a one-time administrator reconnection if credentials are rotated.
- Security-key rotation could invalidate some sessions, depending on which keys require rotation.
- Content Security Policy hardening may initially expose third-party integrations that need allowlisting.
- Replacing the spreadsheet parser may reveal unusual legacy spreadsheet formats requiring compatibility work.
- Deployments will stop instead of starting against an incomplete database migration.
- Insecure behavior, such as ordinary members changing administrator fields, will intentionally disappear.

The safest approach is six phases, with tests and release gates between them. Critical authorization and payment issues should be resolved before dependency or infrastructure cleanup because they represent immediate compromise paths.

---

## Phase 0 — Preparation and temporary containment

Before changing application behavior:

1. Create a dedicated remediation branch.
2. Preserve the current production commit as a rollback reference.
3. Document the live environment:
   - Production URL and Cloudflare route
   - Lightsail origin accessibility
   - Supabase project and current RLS status
   - Stripe and PayPal webhook configuration
   - QuickBooks connection
   - Required environment variables
   - Current Node and image versions
4. Create sanitized test accounts representing:
   - Anonymous visitor
   - Expired member
   - Active competitor
   - Retailer/manufacturer
   - Judge
   - Event director
   - Staff user
   - Administrator
   - Protected super-administrator
5. Temporarily monitor or restrict the highest-risk routes at Cloudflare/Nginx if a production release cannot happen quickly.
6. Review administrator and staff accounts for unexpected privilege changes.
7. Review recent profile audit records, PayPal transactions, QuickBooks connection changes, and global configuration changes for evidence of abuse.

Expected impact: none to normal functionality. Temporary route restrictions could briefly limit administrator editing until the fix is deployed.

No database command will be run without separate explicit permission.

---

## Phase 1 — Authorization foundation

### 1. Centralize authorization

#### Current problem

Authentication is global, but administrator authorization is implemented inconsistently. The existing `PermissionGuard` is not applied consistently to controllers.

#### Planned solution

1. Register a centralized authorization guard after the authentication guard.
2. Use explicit decorators such as:
   - `@RequireRole(...)`
   - `@RequirePermissions(...)`
   - `@RequireAnyPermission(...)`
   - A dedicated self-or-admin rule where appropriate
3. Define a clear route policy:
   - Public routes: explicitly `@Public()`
   - Authenticated routes: no additional decorator required
   - Member-accessible routes: explicit member permission where needed
   - Staff/admin routes: mandatory permission decorator
   - Super-admin operations: explicit super-admin decorator
4. Make the authorization guard deny access if:
   - Required permission metadata is malformed
   - The profile is missing
   - Role/permission lookup fails
   - A supposedly privileged route has no valid profile
5. Remove duplicated token parsing from controllers over time. Controllers should use the user/profile already attached by the global guards.
6. Do not infer privilege from route names such as `/admin/...`.

#### Functionality retained

All existing administrator pages and actions remain available to authorized staff. Member, judge, and event-director functionality remains available according to assigned permissions.

#### Possible behavior changes

- Staff users who currently rely on an accidental authorization gap may receive `403`.
- Roles lacking a required permission may need their intended permissions explicitly seeded.
- Protected super-admin behavior can remain, but it should be explicit and audited.

#### Verification

Create an authorization matrix test suite for every controller:

| User type | Public reads | Own data | ED/Judge operations | Admin operations |
|---|---:|---:|---:|---:|
| Anonymous | Allowed where public | Denied | Denied | Denied |
| Active member | Allowed | Allowed | Denied | Denied |
| Judge/ED | Allowed | Allowed | Assigned scope only | Denied |
| Staff/admin | Allowed | Allowed | Allowed as configured | Allowed |
| Expired member | Public/renewal only | Renewal/billing only | Denied | Denied |

Every privileged endpoint must have at least one positive and one negative test.

### 2. Protect all global-data controllers

Apply explicit permissions to:

- Competition formats
- Seasons
- Membership type and pricing configuration
- Rulebooks
- Championship archives and awards
- Class-name mappings and result remapping
- Competition classes
- Points configuration
- Site settings
- Media files
- Banners and announcements
- Scheduled tasks
- Billing and reconciliation
- QuickBooks settings
- User/security administration
- Imports, exports, and batch jobs

Suggested permission structure:

- `competition.manage_formats`
- `competition.manage_classes`
- `competition.manage_results`
- `seasons.manage`
- `memberships.manage_types`
- `content.manage_rulebooks`
- `content.manage_archives`
- `billing.view`
- `billing.manage`
- `integrations.quickbooks.manage`
- `security.manage_users`
- `system.manage_settings`

#### Functionality retained

All current UI workflows remain. The frontend may hide controls based on permissions, but backend enforcement remains authoritative.

#### Possible loss

Only unauthorized access that currently works by accident.

---

## Phase 2 — Profile and account security

### 3. Remove public generic profile creation

#### Current problem

The public profile endpoint accepts `Partial<Profile>` and may mass-assign administrator/security fields.

#### Planned solution

1. Remove or permanently disable generic anonymous `POST /api/profiles`.
2. Use the authenticated `POST /api/profiles/ensure` flow for account provisioning.
3. Derive the profile ID and email from the validated Supabase user, never from a public request body.
4. Always set protected defaults server-side:
   - Non-privileged default role
   - `is_staff = false`
   - `login_banned = false`
   - `can_login = true`
   - No maintenance access
   - No judge/ED permissions
   - Normal membership status
5. Handle OAuth and password signup through the same idempotent provisioning service.
6. Add a uniqueness/race test for simultaneous signup callbacks.

#### Functionality retained

Email/password signup, OAuth signup, profile provisioning, and account claiming remain available.

#### Possible impact

Any old frontend code still calling generic profile creation must switch to `ensure`. The user experience should not change.

### 4. Separate member and administrator profile updates

#### Planned solution

Replace `Partial<Profile>` with explicit DTOs.

Member-editable DTO might allow:

- Profile picture and cover image
- Public biography
- Vehicle details
- Team-related public information
- Contact preferences
- Shipping/billing details where appropriate
- Public visibility settings

Administrator DTO may additionally allow:

- Roles
- Staff status
- Login controls
- Membership state
- Judge/ED permissions
- Maintenance access
- Account provisioning fields

Security-sensitive fields will never be accepted from a member endpoint.

Add:

- `PATCH /api/profiles/me` for member self-service
- An administrator endpoint for privileged updates
- Optional dedicated endpoints for role, staff, ban, and login changes

Every administrator change should produce an audit record containing:

- Acting administrator
- Target profile
- Changed fields
- Before and after values, excluding secrets
- Timestamp and request correlation ID

#### Functionality retained

Members continue editing their profiles. Administrators continue editing any profile.

#### Behavior changes

- Members can no longer update someone else's profile.
- Members cannot set `role`, `is_staff`, login controls, membership status, or certification fields.
- Administrator changes become auditable.

### 5. Harden administrator classification

#### Planned solution

1. Prefer role/permission records as the authorization source.
2. Treat `is_staff` as a staff classification, not an automatic unlimited bypass unless that is an explicit business requirement.
3. Give staff users defined permissions rather than all administrator powers.
4. Retain protected super-admin accounts, but require:
   - Explicit super-admin checks
   - Strong audit records
   - MFA through Supabase
   - No privilege determination from user-controlled values
5. Consider requiring recent authentication or MFA for:
   - Impersonation
   - Role changes
   - User deletion
   - QuickBooks connection
   - Refunds
   - Security enforcement changes

#### Functionality retained

Protected accounts and staff access remain. The permission model becomes more precise.

#### Possible behavior changes

Some staff users may need explicit permissions instead of receiving blanket access.

---

## Phase 3 — Payment integrity

### 6. Redesign PayPal checkout binding

#### Current problem

The capture endpoint trusts client-supplied payment type and metadata after a PayPal order has been paid.

#### Planned solution

Create a server-owned checkout-attempt record before sending the PayPal order to the browser. It should contain:

- Internal checkout ID
- PayPal order ID
- Payment type
- User ID or verified guest email
- Membership/config/order/registration/invoice ID
- Expected subtotal
- Discount
- Tax
- Shipping
- Expected total
- Currency
- Status
- Creation and expiration timestamps
- Server-generated nonce
- Fulfillment timestamp and transaction ID

Flow:

1. Client requests a checkout.
2. Backend validates products, membership eligibility, coupon, tax, and ownership.
3. Backend calculates the final amount.
4. Backend creates a local pending checkout.
5. Backend creates the PayPal order using the calculated amount.
6. Backend stores the returned PayPal order ID.
7. Browser completes PayPal approval.
8. Client sends only the PayPal order ID or internal checkout ID to capture.
9. Backend loads the trusted local checkout.
10. Backend captures and retrieves the PayPal order server-to-server.
11. Backend verifies:
    - PayPal order ID matches
    - Status is completed
    - Currency matches
    - Captured amount exactly matches
    - PayPal merchant/payee is MECA
    - Checkout is not expired
    - Checkout has not already been fulfilled
    - Target entity is still valid
12. Fulfillment uses only the stored server metadata.
13. Capture and fulfillment are protected by idempotency and a transaction where feasible.
14. Any mismatch moves the checkout to manual review and alerts administrators.

#### Functionality retained

Membership, event registration, invoice, shop, and World Finals PayPal payments remain.

#### Possible impact

- PayPal checkouts already open during deployment may need to restart.
- The frontend capture request becomes smaller.
- A database migration is needed for checkout-attempt records.
- PayPal orders with mismatched amounts will stop rather than being fulfilled.

### 7. Add fulfillment-level amount validation

Even trusted checkout records should be independently verified.

For each fulfillment service:

- Membership: captured amount must match membership price plus tax, discount, and add-ons.
- Event registration: amount must match registration classes and optional membership.
- Invoice: amount must match outstanding balance.
- Shop: amount must match server-calculated items, tax, discount, and shipping.
- World Finals: amount must match the selected package and add-ons.

The fulfillment service should reject client metadata entirely and receive a strongly typed trusted object from the payment orchestration layer.

#### Functionality retained

All payment types remain.

#### Behavior changes

Underpayments, stale totals, altered cart totals, and mismatched currencies are blocked.

### 8. Make PayPal webhook verification mandatory

#### Planned solution

1. Add `PAYPAL_WEBHOOK_ID` to:
   - Environment schema
   - Production deployment secrets
   - Deployment template
   - Operational documentation
2. In production, fail application startup if it is missing.
3. Never process an unsigned or unverifiable PayPal webhook.
4. Validate required PayPal transmission headers before calling PayPal verification.
5. Keep webhook-event idempotency.
6. Store verification status and processing result.
7. Monitor repeated verification failures.
8. Confirm the live PayPal webhook subscribes only to required event types.

#### Functionality retained

Webhook-based renewals, refunds, and payment reconciliation remain.

#### Deployment requirement

Production must have the correct webhook ID before the new version starts.

### 9. Preserve and verify Stripe protections

The Stripe implementation already has strong components:

- Raw-body handling
- Signature validation
- Event idempotency

Planned work is primarily regression testing:

- Missing signature returns `400`
- Invalid signature returns `400`
- Duplicate event does not duplicate fulfillment
- Amount/currency mismatch does not fulfill
- Failed fulfillment is visible and retryable
- Subscription and one-time payment events cannot cross-route

No functionality should be lost.

---

## Phase 4 — Integration, secret, and privacy protection

### 10. Secure QuickBooks OAuth

#### Planned solution

1. Require `integrations.quickbooks.manage` for connect, disconnect, status details, items, and accounts.
2. Generate a cryptographically random single-use OAuth state.
3. Store a hash of the state with:
   - Initiating administrator
   - Creation timestamp
   - Expiration
   - Intended redirect
4. On callback:
   - Require exact state match
   - Reject expired or already-used state
   - Mark state consumed atomically
   - Verify the expected QuickBooks realm/company if one is already configured
5. Do not build callback URLs through unvalidated interpolation.
6. Restrict frontend redirect destinations to a configured origin.
7. Encrypt QuickBooks access and refresh tokens at application level with a production key managed outside the database.
8. Never log tokens or full OAuth responses.
9. Audit connect and disconnect operations.
10. Consider limiting QuickBooks changes to super-admin plus recent MFA.

#### Functionality retained

QuickBooks synchronization, item/account selection, refunds, and sales receipts remain.

#### Possible impact

- A one-time QuickBooks reconnect is recommended if current tokens or credentials may have been exposed.
- An encryption migration is required.
- If existing plaintext tokens are encrypted in place, reconnect may be avoidable; rotation is safer.

### 11. Remove sensitive repository artifacts

#### Planned solution

1. Inventory tracked and historical:
   - Email exports
   - Test-account SQL
   - Database dumps
   - Audit uploads
   - Environment files
   - Storage backups
   - Logs
   - Temporary scripts containing credentials
   - Generated agent/tool data
2. Determine whether each artifact contains real production data.
3. Remove sensitive artifacts from the current tree.
4. Purge them from Git history using an approved history-rewrite process.
5. Coordinate with all developers because history rewriting requires fresh clones or careful rebasing.
6. Invalidate old CI caches and deployment artifacts.
7. Rotate any credential that was committed or included in a shared archive.
8. Replace examples with obvious placeholders.
9. Add ignore rules covering all backup/export patterns.
10. Store legitimate backups in encrypted, access-controlled backup storage with retention policies, not in the repository.
11. Add automated secret scanning and pre-commit protection.

#### Functionality retained

No application functionality depends on committed email exports or database backups.

#### Possible impact

- Git commit hashes will change if history is purged.
- Developers will need to resynchronize their clones.
- CI caches may be invalidated.
- Credential rotation may briefly interrupt integrations if not coordinated.

### 12. Protect invoice payment links

#### Planned solution

1. Stop treating an invoice UUID as sufficient authorization to view billing PII.
2. Generate a separate random, revocable payment token with an expiration.
3. Store only its hash.
4. Public payment responses should expose only what is required:
   - Invoice number, possibly partially masked
   - Total, currency, due date, and line descriptions
   - Masked customer name/email
   - No complete billing address
5. Require authentication for full invoice details.
6. Allow token revocation when an invoice is canceled, paid, or resent.
7. Rate-limit public token lookups.
8. Avoid differentiating “not found” from “invalid token” in ways that aid enumeration.

#### Functionality retained

Customers can still pay invoices without signing in.

#### Possible impact

Existing emailed invoice links may need backward compatibility for a defined transition window. A safe rollout can support old links briefly while new tokenized links are issued, then retire the old route.

---

## Phase 5 — Input, frontend, proxy, and runtime hardening

### 13. Add strict request validation

#### Planned solution

1. Define Zod schemas in `@newmeca/shared` for every write endpoint.
2. Replace `Partial<Entity>` request bodies.
3. Reject unknown keys with strict schemas.
4. Validate:
   - UUIDs
   - Enums
   - Numeric limits
   - Pagination boundaries
   - Dates
   - Email addresses
   - URLs
   - File metadata
   - Array sizes
   - Search lengths
5. Use a consistent global validation strategy or reusable Zod pipe.
6. Separate create, update, administrator update, and public response schemas.
7. Never serialize database entities directly where they contain private fields.

#### Functionality retained

Valid requests continue working.

#### Possible behavior changes

Malformed requests that were silently accepted will return `400`. Frontend forms may need minor normalization for dates, numbers, or empty strings.

### 14. Move frontend data operations behind the API

#### Planned solution

1. Remove frontend `.from()`, `.rpc()`, and storage-management calls.
2. Move MECA ID generation and profile insertion into the backend.
3. Keep Supabase Auth in a narrowly scoped authentication module if direct browser authentication remains the intended architecture.
4. All business data access should go through backend API clients.
5. Review Supabase RLS because service-role and historical direct access must remain protected.
6. Remove `VITE_SUPABASE_*` data access where no longer needed, or retain only public configuration required for authentication.
7. Verify that no service-role credential is ever included in the frontend bundle.

#### Functionality retained

Signup, login, OAuth, password recovery, and profile creation remain.

#### Possible impact

Signup implementation changes internally, but the visible flow should remain the same.

### 15. Fix proxy trust and rate limiting

#### Planned solution

1. Restrict the Lightsail origin so traffic can arrive only through the intended Cloudflare path where possible.
2. Configure Express/Nest trusted proxies explicitly.
3. At Nginx:
   - Overwrite forwarded headers
   - Do not preserve arbitrary client-supplied `CF-Connecting-IP`
   - Use the immediate trusted peer as the source
   - Normalize `X-Forwarded-For`
4. Rate-limit by a combination of:
   - Trusted client IP
   - Account/user ID when authenticated
   - Normalized email hash for password recovery
   - Endpoint-specific keys
5. Use tighter limits for:
   - Login recovery
   - Account existence
   - Account claiming
   - Guest tickets/contact forms
   - Payment creation/capture
   - Public invoice access
   - File uploads
6. Add Cloudflare-level rate limits for high-risk public endpoints.
7. Avoid returning account-enumeration information.

#### Functionality retained

Legitimate users continue accessing the site.

#### Possible impact

Shared corporate/mobile networks need reasonable limits to avoid false positives. Tune in monitoring mode before enforcement.

### 16. Replace or isolate `xlsx`

#### Preferred solution

Replace the unmaintained `xlsx` npm package with an actively maintained parser compatible with the required workbook features.

Migration process:

1. Assemble a sanitized corpus of real MECA spreadsheet and `.tlab` files.
2. Document:
   - Expected sheet names
   - Required columns
   - Formula handling
   - Date parsing
   - Merged cells
   - Numeric formatting
   - Legacy `.xls` requirements
3. Implement parsing behind an adapter interface.
4. Run both parsers against the corpus and compare normalized results.
5. Add limits:
   - Maximum upload size
   - Maximum sheets
   - Maximum rows and columns
   - Parsing timeout
   - Memory limits
   - Reject macros and unsupported workbook features
6. Prefer parsing in a restricted worker process/container.
7. Keep export generation separately tested.

#### Functionality retained

Results imports and spreadsheet exports remain.

#### Possible impact

- Very old `.xls` or malformed files may require conversion to `.xlsx`.
- Edge-case formatting could parse differently.
- The old parser should not be removed until compatibility tests pass.

### 17. Upgrade Node and container foundations

#### Planned solution

1. Upgrade production and build images from Node 18 to a supported LTS line, preferably Node 24 after compatibility testing.
2. Pin base images by digest for reproducibility.
3. Rebuild native dependencies such as `canvas`.
4. Run the container as a non-root user.
5. Make the filesystem read-only where practical, with explicit writable temporary locations.
6. Drop unnecessary Linux capabilities.
7. Add container health checks and graceful shutdown.
8. Scan build and runtime images for vulnerabilities.
9. Separate production dependencies from build-only dependencies where feasible.

#### Functionality retained

No intended feature loss.

#### Possible impact

Native packages may need version changes. PDF/image generation and canvas-based achievement generation require specific regression testing.

### 18. Add browser security headers and CSP

#### Planned solution

1. Configure headers on the Nginx frontend, since static files do not pass through backend Helmet:
   - Content-Security-Policy
   - Strict-Transport-Security
   - Referrer-Policy
   - X-Content-Type-Options
   - Permissions-Policy
   - Frame restrictions through CSP
   - Cross-origin policies where compatible
2. Start CSP in `Report-Only`.
3. Inventory required third-party origins:
   - Stripe
   - PayPal
   - Supabase
   - Google Maps
   - Google Analytics
   - reCAPTCHA
   - YouTube
   - Storage/CDN domains
4. Remove unsafe inline HTML where possible.
5. Sanitize every remaining HTML-rendering location.
6. Move to enforced CSP only after production reports are clean.

#### Functionality retained

All third-party services should remain.

#### Possible impact

A too-strict CSP could temporarily block analytics, maps, payments, embedded media, or images. Report-only rollout prevents that.

### 19. Harden administrator impersonation

#### Planned solution

The current approach stores the administrator refresh token in browser session storage.

Prefer a backend-mediated impersonation system:

1. Administrator requests impersonation.
2. Backend verifies permission, MFA/recent login, and target restrictions.
3. Backend creates a short-lived impersonation record.
4. Responses identify both actor and effective user.
5. Audit logs always record the real administrator.
6. The administrator's long-lived refresh token is never copied into application-managed storage.
7. Impersonation automatically expires.
8. Protected super-admin accounts cannot be impersonated.
9. Sensitive operations can be blocked while impersonating.

#### Functionality retained

Administrators can continue troubleshooting as users.

#### Possible impact

Impersonation sessions will be deliberately shorter and may prohibit refunds, role changes, password changes, or security operations.

---

## Phase 6 — Deployment and security operations

### 20. Validate production environment at startup

Create a production environment schema requiring:

- Database URL
- Supabase URL and service-role credential
- CORS/frontend origin
- Stripe secret and webhook secret
- PayPal credentials and webhook ID
- Email credentials
- QuickBooks credentials when enabled
- Encryption key
- Storage URL configuration
- reCAPTCHA secret
- Correct environment modes

Production must not start with:

- Missing webhook verification
- Sandbox payment configuration
- Test mode accidentally enabled
- Localhost CORS fallback
- Default database URL
- Placeholder secrets

#### Functionality retained

No feature loss.

#### Behavior change

Misconfigured production releases fail immediately instead of running insecurely.

### 21. Make migrations fail closed

#### Planned solution

1. Do not start the new application if its required migration fails.
2. Run migrations as an explicit deployment step using the approved migration mechanism.
3. Back up before schema changes.
4. Validate pending migration state before deployment.
5. Keep migrations transactional and backward-compatible.
6. Use expand-and-contract migrations for zero-downtime changes:
   - Add new fields/tables first
   - Deploy code compatible with old and new schema
   - Backfill
   - Switch reads/writes
   - Remove legacy schema only in a later release
7. Add post-migration health verification.
8. Roll back application images if migration or smoke tests fail.

#### Functionality retained

Application behavior remains, with safer releases.

#### Behavior change

A failed deployment remains on the prior healthy version rather than starting partially broken code.

### 22. Add CI/CD security gates

Before production deployment, require:

- Rush install with locked dependencies
- Shared/backend/frontend builds
- Type checking
- Linting
- Unit tests
- Authorization matrix tests
- Payment integrity tests
- Secret scanning
- Dependency audit
- CodeQL or equivalent static analysis
- Container vulnerability scanning
- Migration validation
- Deployment artifact signing or provenance
- Post-deploy smoke tests

Also:

- Pin GitHub Actions to immutable commit SHAs where practical.
- Verify downloaded deployment tools by checksum/signature.
- Define minimal GitHub Actions permissions.
- Prefer short-lived AWS OIDC credentials over long-lived AWS keys.
- Require branch protection and review for security/payment/auth changes.

No application functionality is lost.

---

## Testing and release plan

### Required regression suites

#### Authentication and profiles

- Signup with email/password
- OAuth signup
- Email verification
- Password recovery
- Account claim
- Profile ensure
- Member profile edit
- Admin profile edit
- Banned/disabled user
- Expired member renewal
- Staff and protected-admin access

#### Authorization

Test every privileged route as:

- Anonymous
- Ordinary member
- Expired member
- Judge
- Event director
- Staff without permission
- Staff with permission
- Administrator
- Super-administrator

#### Payments

For Stripe and PayPal:

- Membership
- Secondary membership
- Event registration
- Event registration plus membership
- Invoice
- Shop
- World Finals
- Coupon
- Tax
- Shipping
- Refund
- Duplicate webhook
- Failed payment
- Amount mismatch
- Currency mismatch
- Altered metadata
- Replayed capture
- Expired checkout

#### Integrations

- QuickBooks connect/callback/disconnect
- QuickBooks token refresh
- Sales receipt
- Refund receipt
- Email
- reCAPTCHA
- Stripe and PayPal webhooks

#### File handling

- Valid MECA workbook corpus
- Invalid workbook
- Oversized workbook
- Excessive rows/sheets
- Malicious/truncated workbook
- Images, PDFs, and ticket attachments
- Unauthorized team/entity upload attempts

### Rollout sequence

1. Deploy authorization/profile fixes first.
2. Confirm no legitimate roles receive unexpected `403`.
3. Deploy PayPal checkout binding and mandatory webhook verification.
4. Rotate/verify payment and integration credentials.
5. Deploy QuickBooks OAuth/token changes.
6. Purge repository data and rotate exposed credentials.
7. Upgrade spreadsheet parser and Node runtime.
8. Enable proxy/header hardening in report/monitor mode.
9. Enforce CSP and stricter rate limits after telemetry review.
10. Complete an external penetration test before declaring the system production-hardened.

---

## Estimated effort

For one experienced full-stack engineer with QA support:

- Authorization and profile security: 1–2 weeks
- PayPal/payment integrity: 1–2 weeks
- QuickBooks, secrets, and privacy: approximately 1 week
- Validation, proxy, frontend, Node, and spreadsheet migration: 1–2 weeks
- CI/CD, regression, deployment, and penetration-test remediation: 1–2 weeks

A realistic total is approximately 5–8 weeks for careful production-grade remediation. A team can parallelize some work, but profile authorization and payment changes should receive focused review rather than being rushed.

---

## Final functionality assessment

The system is expected to retain all legitimate business capabilities:

- Membership management
- Competition results
- Seasons and classes
- Event registration
- Stripe and PayPal payments
- Shop and invoicing
- QuickBooks
- Judge and event-director workflows
- Content management
- File imports and uploads
- Administrator impersonation
- Public directories and invoice payment

What will be removed is unauthorized or unsafe behavior. The most visible controlled changes may be a one-time QuickBooks reconnect, restarted in-flight PayPal checkouts, potentially expired sessions after credential rotation, stricter spreadsheet acceptance, and administrators receiving clearer permission errors.

Approval of this plan would authorize implementation planning and code changes only. Separate approval will still be requested before any database migration, backfill, direct SQL, credential rotation, production deployment, or Git-history rewrite.

