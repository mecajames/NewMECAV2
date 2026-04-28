# Billing Overhaul — QA Playbook

**Target environment:** Stage — `https://stage.mecacaraudio.com`
**Target branch:** `test` (must be pushed by Mick before this QA can begin — workflow changes from this session need to deploy)
**Last updated:** 2026-04-27

---

## What's being tested

This session bundled four kinds of work. The QA below covers all of them.

| Area | Status before this session | Status after |
|---|---|---|
| Orders list page width | Table overflowed; 3-dots column hidden | Container widened to `max-w-screen-2xl`; full table visible |
| Admin Member detail — Reactivate / Pause / Resume / Card-on-file | Not in UI | Buttons + card-on-file line added (only render when membership has Stripe sub) |
| Admin Members list — bulk actions + dunning filter | Not in UI | Checkbox column, bulk toolbar, "Dunning" status filter, red-ringed dunning badge |
| Admin Audit log — new action badges | Action types existed in backend; UI showed raw strings | Six new color-coded badges + filter options |
| Billing Dashboard — Subscriptions KPI strip | Already shipped previous session | Re-validate no regression |
| Cancel/Refund modal — Partial refund | Already shipped previous session | Re-validate no regression |
| PayPal sandbox & live credentials | Backend reads `PAYPAL_CLIENT_ID/SECRET` env vars; vars not wired in either deploy | Wired in both `deploy.yml` (stage) and `deploy-production.yml` (prod); GitHub Secrets populated |

---

## Pre-flight

Before starting:

- [ ] Verify the `test` branch is deployed to stage. Latest commit on `test` should include the changes to `deploy.yml`, `OrdersPage.tsx`, `MembersPage.tsx`, `MemberDetailPage.tsx`, `AdminAuditPage.tsx`. Check stage deploy status via the GitHub Actions tab.
- [ ] Open `https://stage.mecacaraudio.com` in a Chromium-based browser (Chrome / Edge / Brave). DevTools should be open with the Network tab visible — useful for checking API calls during the dunning + bulk-action tests.
- [ ] Sign in with the test admin account:
  - Email: `mmakhool6@gmail.com`
  - Password: `Admin123!`
- [ ] If you don't have admin access, ask Mick — there are about a dozen admin accounts on stage.

### Test data on stage

| Purpose | Value |
|---|---|
| Test admin user | `mmakhool6@gmail.com` / `Admin123!` |
| Test buyer user_id | `040eb742-f0db-4915-b061-792beb7729df` |
| Stripe test card | `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any 5-digit ZIP |
| Stripe test card (3DS) | `4000 0027 6000 3184` (forces a 3-D Secure challenge) |
| PayPal sandbox buyer | Ask Mick — he has a sandbox account; not in this doc |

### What's NOT testable on stage today

| Limitation | Workaround |
|---|---|
| No membership in stage DB has `stripe_subscription_id` populated | The Reactivate / Pause / Resume / Card-on-file panel cannot render today. To exercise: complete a real recurring-subscription purchase via the membership checkout (Stripe test card), then proceed with section D. |
| `Failed 30d` KPI is 0 because no member is in dunning | The dunning filter and badge will show empty results until a real `invoice.payment_failed` webhook fires. To force one: use Stripe test card `4000 0000 0000 0341` (always declines on subsequent invoice). |

---

## A. Orders table no longer overflows

**Goal:** Verify the orders list shows all columns including the 3-dots actions menu without horizontal scrolling on a typical desktop viewport.

**Steps:**

1. From the admin dashboard, click into **Billing → Orders** (or navigate to `/admin/billing/orders`).
2. Maximize the browser window (or use ≥ 1500px viewport width).
3. Visually scan the table.

**Expected:**

- [ ] All columns are visible: `Order`, `Customer`, `Items`, `Type`, `Subscription`, `Status`, `Total`, `Date`, and the 3-dots actions column on the far right.
- [ ] No horizontal scrollbar appears at the bottom of the table.
- [ ] Order numbers (e.g. `ORD-2026-00001`, `PMPRO-9BE61853AC`) render in full — no left-side truncation.
- [ ] Click the 3-dots on any row — a dropdown menu opens with **View Details** (and **Cancel Order** if status is pending).

**Negative case:**

- [ ] Resize the browser narrower (~1200px). The table should still be functional — it'll either scroll horizontally inside its wrapper, or columns will compress, but no UI breakage.

---

## B. Billing Dashboard — Subscriptions KPI strip

**Goal:** Verify the new Subscriptions KPI strip renders above the existing revenue cards and reports sane numbers.

**Steps:**

1. Navigate to `/admin/billing`.
2. Locate the "Subscriptions" header below the page title.

**Expected:**

- [ ] A row of 5 cards: **Active**, **MRR**, **Renewing <14d**, **Churn 30d**, **Failed 30d**.
- [ ] Active count is non-zero (stage has ~260 active memberships).
- [ ] MRR is in `$X.XX` format. May be $0 on stage if no memberships have Stripe subs attached — note this is NOT a bug; it's a data state. Flag if it's non-zero on prod and you'd expect it to be.
- [ ] Renewing/Churn/Failed all render numeric values (likely 0 on stage).
- [ ] Each card has consistent height/width with the rest.

---

## C. Members page — bulk actions, dunning filter, dunning badge

**Goal:** Verify the new bulk-action toolbar and dunning status filter on the Members list.

### C.1 — Checkbox column + bulk toolbar

**Steps:**

1. Navigate to `/admin/members`.
2. Confirm a checkbox column has been added as the leftmost column of the members table.
3. Click 2–3 row checkboxes.

**Expected:**

- [ ] A bulk action toolbar slides in above the table reading **"X memberships selected"**.
- [ ] Three buttons in the toolbar: **Refund all** (red), **Cancel now** (orange), **Cancel at renewal** (blue).
- [ ] A **Clear selection** link on the right side of the toolbar.
- [ ] Click the header checkbox — all rows on the current page select; counter updates.
- [ ] Click **Clear selection** — all checkboxes clear and the toolbar disappears.

### C.2 — Bulk action: Cancel at renewal (safe to actually run)

**Steps:**

1. Filter the list to find 2 members you can safely test on (ask Mick — ideally test users that are NOT real customers).
2. Select them via checkboxes.
3. Click **Cancel at renewal**.
4. Confirm any modal that appears.
5. Open each member's detail page after — verify their auto-renewal status flipped.

**Expected:**

- [ ] Both memberships show "Cancellation pending" or equivalent on their detail pages.
- [ ] Audit log on `/admin/admin-audit` shows two new `membership_cancel_at_renewal` entries.

**DO NOT** run **Refund all** as a bulk test on real members — that triggers real Stripe refunds. Skip it unless Mick has provided refund-safe test rows.

### C.3 — Dunning status filter

**Steps:**

1. On `/admin/members`, click the **Status** filter dropdown.
2. Select **Dunning (payment failed)**.

**Expected:**

- [ ] Option is present in the dropdown between "Pending" and "Expired".
- [ ] Result list updates. May be 0 results on stage if nothing is in dunning state.
- [ ] If any results exist, each row's status badge has a **red ring** around it visually distinguishing it from the regular "active" badge.

### C.4 — Dunning badge in the table (only if data exists)

This needs a real dunning member. If `Failed 30d` on the billing dashboard is non-zero, set the dunning filter and check those rows.

- [ ] Dunning members render with a red-ringed status badge in the row.

---

## D. Member detail page — Reactivate, Pause, Resume, Card on file

**Gating:** these UI elements only render when the member's membership has `stripeSubscriptionId !== null` AND `paymentStatus === 'paid'` AND not expired. To exercise this on stage, you must first complete a real recurring purchase.

### D.0 — Setup: complete a recurring membership purchase

**Steps:**

1. Sign out (or open an incognito window).
2. Go to `https://stage.mecacaraudio.com/membership`.
3. Pick **MECA Membership: Annual** ($40 Competitor) and click through to checkout.
4. Use the Stripe test card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any 5-digit ZIP.
5. Make sure the **"Auto-renew annually"** toggle is **ON**. This is what creates a Stripe subscription (not just a one-time payment).
6. Complete the purchase. You'll get a confirmation page.

**Expected:**

- [ ] Purchase completes without errors.
- [ ] A new membership row exists for that user with `stripe_subscription_id` populated. (Confirm via the member's detail page — the **Subscription ID** field should show `sub_...`.)

### D.1 — Card on file, Pause, Cancel buttons

Switch back to your admin session.

**Steps:**

1. Navigate to `/admin/members/<the-user-uuid-from-D0>`.
2. Click the **Membership** tab.
3. Find the new membership card in the Memberships list.

**Expected:**

- [ ] An inline section labeled **"Subscription Details"** appears with: **Status**, **Next Billing**, **Card on file** (e.g., `Visa ····4242 exp 12/30`).
- [ ] Next to the Auto-Renewal field, three small buttons: **Cancel** (red), **Pause** (amber).

### D.2 — Pause / Resume

**Steps:**

1. Click **Pause**.
2. Confirm the action if prompted.
3. Wait for the page to reload.

**Expected:**

- [ ] The Pause button is replaced by a **Resume** (blue) button.
- [ ] The Subscription Details "Status" line reads `paused`.
- [ ] In Stripe Dashboard (test mode), the subscription's `pause_collection` field is set.
- [ ] Audit log has a new `membership_pause` entry.

**Steps (continued):**

4. Click **Resume**.

**Expected:**

- [ ] Status returns to `active`.
- [ ] Audit log has a new `membership_resume` entry.

### D.3 — Cancel at renewal → Reactivate

**Steps:**

1. From the same membership, click the **Cancel** button next to Auto-Renewal.
2. In the modal that appears, fill in a reason and confirm.

**Expected:**

- [ ] Subscription Details now shows `⚠ Scheduled to cancel at end of period`.
- [ ] The Cancel/Pause buttons are replaced by a single **Reactivate** (green) button.
- [ ] Audit log has a `membership_cancel_at_renewal` entry.

**Steps (continued):**

3. Click **Reactivate**.

**Expected:**

- [ ] The amber warning message disappears.
- [ ] The Cancel/Pause buttons return.
- [ ] In Stripe Dashboard, the subscription's `cancel_at_period_end` is now `false`.
- [ ] Audit log has a `membership_reactivate` entry.

---

## E. Cancel / Refund modal — Full and Partial

**Goal:** Verify the refund modal renders the new "Refund Type" radio and that both Full and Partial refund flows work.

### E.1 — Full refund (verify flow renders, do NOT actually submit on a real customer order)

**Steps:**

1. Navigate to `/admin/billing/orders`.
2. Click any completed membership order to open its detail page.
3. Click the **Refund** button.

**Expected:**

- [ ] Modal opens titled **"Refund Membership"**.
- [ ] Top card shows the membership name + amount paid.
- [ ] **Refund Type** section with two radio options:
  - **Full refund — $X.XX** — selected by default; subtitle "Cancels the membership and refunds the entire amount."
  - **Partial refund** — subtitle "Membership stays active. Only the entered amount is refunded."
- [ ] Yellow "This action will:" panel lists three bullets matching the selected mode.
- [ ] Reason for Refund textarea.

### E.2 — Partial refund radio behavior

**Steps:**

1. Click the **Partial refund** radio.

**Expected:**

- [ ] A `$ 0.00` numeric input slides in below the radio label.
- [ ] The yellow warning panel updates to:
  - "Keep the membership active"
  - "Refund the partial amount entered above via Stripe"
  - "Send a cancellation/refund notification email to the member"
- [ ] Type `5.00` in the input — the bottom **Refund $XX.XX** button updates accordingly.
- [ ] Type `999.00` — button shows validation/disable behavior because the amount exceeds the original payment.

### E.3 — End-to-end partial refund (only on a designated test order)

Ask Mick which order is safe to refund. Then:

**Steps:**

1. Open that order, click Refund, choose Partial, enter `1.00`, fill in a reason, click submit.

**Expected:**

- [ ] Modal closes; success toast.
- [ ] In Stripe Dashboard, the payment_intent has a $1.00 refund attached.
- [ ] The membership remains active (NOT cancelled).
- [ ] Audit log has a new `membership_refund_partial` entry with the amount in the description.

---

## F. Admin Audit page — new badges and filter options

**Goal:** Verify the new color-coded badges render and the action filter dropdown lists all six new types.

**Steps:**

1. Navigate to `/admin/admin-audit`.
2. Open the **Action** filter dropdown.

**Expected:**

- [ ] Dropdown contains these six options (in addition to pre-existing ones):
  - Membership Cancel at Renewal
  - Membership Reactivate
  - Membership Refund
  - Membership Partial Refund
  - Membership Pause
  - Membership Resume
- [ ] Each option, when selected, filters the table.

**Steps (continued):**

3. Filter by **Membership Partial Refund**.

**Expected:**

- [ ] Rows render with a pink/magenta `membership refund partial` badge.
- [ ] Description includes the dollar amount and reason.
- [ ] Click **View** in the Diff column — a modal/popover shows the change diff.

**Steps (continued):**

4. Filter by each of the other 5 action types in turn.

**Expected:**

- [ ] Each renders a distinct color-coded badge.
- [ ] No "raw" strings appear (e.g., you should never see plain text `membership_pause` — always the badge form).

---

## G. PayPal credentials wiring

**Goal:** Verify the PayPal `CLIENT_ID` and `CLIENT_SECRET` env vars made it into the running stage backend container, and that PayPal flows actually work.

### G.1 — Confirm env vars are present in the container

**Steps:**

1. Ask Mick or check the GitHub Actions output of the most recent stage deploy. The "Build deployment config from template and deploy" step prints `jq '.containers.backend.environment | keys'` — verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` appear in that list.

**Expected:**

- [ ] Both keys are present in the deployment config keys array.

### G.2 — Confirm backend reports PayPal as configured

**Steps:**

1. From a logged-in browser session on stage, hit:
   ```
   GET https://stage.mecacaraudio.com/api/paypal/client-config
   ```
   (or use the network tab while opening the membership checkout — the page calls this endpoint).

**Expected:**

- [ ] Response is `{ "clientId": "AZmXY1fRpvIdPnheRZD5AVWdXzYhl3a56ih1hOHYFrq8xEeCKJ-zQFCQlVZsQDze1F-KvKjv6J1O3_b7", "sandbox": true/false }`.
- [ ] Response is NOT `{ "enabled": false }`.
- [ ] If `sandbox` is `false` on stage, flag it — stage should be in sandbox mode. Mick can flip the `paypal_sandbox_mode` flag in the `site_settings` table.

### G.3 — End-to-end PayPal purchase on stage

**Setup:** ask Mick for a PayPal sandbox buyer email + password — the credentials he gave Claude are merchant credentials, not buyer credentials. You need a sandbox buyer to actually click through.

**Steps:**

1. Open an incognito window; go to `https://stage.mecacaraudio.com/membership`.
2. Pick a membership, proceed to checkout.
3. Choose **PayPal** as the payment method (the PayPal button should render).
4. Click the PayPal button — a popup should open.
5. Sign in with the sandbox buyer credentials.
6. Approve the payment.

**Expected:**

- [ ] Popup closes; success page renders.
- [ ] Network tab shows a successful `POST /api/paypal/capture-order` returning `{ success: true, captureId: "..." }`.
- [ ] On the admin side, a new order + invoice + membership row appear in the database.
- [ ] In the PayPal sandbox dashboard (developer.paypal.com → Sandbox → Accounts), the buyer balance reflects the payment.

### G.4 — PayPal webhook delivery (for the recurring events)

This depends on the PayPal Developer Dashboard being configured to point webhooks at `https://stage.mecacaraudio.com/api/paypal/webhook`. Ask Mick whether this is configured before testing.

If it is configured:

**Steps:**

1. From PayPal Developer Dashboard → Webhooks → your webhook endpoint, send a test `PAYMENT.CAPTURE.COMPLETED` event.

**Expected:**

- [ ] Backend log shows `PayPal capture completed webhook: <event-id>`.
- [ ] No error in response.
- [ ] Resending the same event ID is a no-op (idempotency check returns "Already processed").

---

## What to do if something breaks

1. **Note exactly which step number** failed in this doc. Don't paraphrase.
2. **Capture the network request + response** from DevTools (right-click → Copy as cURL) for any failed API call.
3. **Capture a screenshot** of the broken state.
4. **Capture browser console errors** (F12 → Console tab).
5. Drop all of the above into a Slack DM to Mick along with:
   - Step number
   - What you expected
   - What you saw
   - Time of test (so backend logs can be correlated)

For backend log access, Mick can pull container logs via:
```
"C:/Program Files/Amazon/AWSCLIV2/aws.exe" lightsail get-container-log \
  --service-name v2-container-service-1 \
  --container-name backend \
  --region us-east-1 --profile lightsail
```

---

## Sign-off

- [ ] Tester name: ___________________
- [ ] Date completed: ___________________
- [ ] All sections passed (mark exceptions in the comments below)
- [ ] Comments / failures:
