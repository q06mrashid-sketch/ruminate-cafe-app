Here’s a clean, copy-pasteable AGENTS.md you can drop into the repo root. It’s tailored to your Ruminate Café app, with specific guidance for the loyalty stamps → vouchers logic and the QR carousel.

⸻

AGENTS.md — Ruminate Café App

Purpose: This document gives coding agents (and humans!) a compact, precise playbook for working on the Ruminate Café mobile app. It defines objectives, invariants, API contracts, data flows, and acceptance tests—especially for the loyalty stamps ↔ free drink vouchers logic and the QR carousel.

0) One-liner

Cross-platform membership + loyalty app (Expo/React Native) for Ruminate Café. Free tier (stamps → free drink on 8), paid tier (monthly drink credits). Shows hours, Instagram, community features.

⸻

1) Architecture quick map
	•	Client: Expo + React Native. Screens of interest:
	•	src/screens/HomeScreen.js (shows hours, IG, loyalty tile, free drinks tile)
	•	src/screens/MembershipScreen.js (QR carousel + counters)
	•	UI components:
	•	src/components/LoyaltyStampTile.js – 8 beans visual, shows count (stamps remainder 0..7).
	•	src/components/FreeDrinksCounter.js – circular counter for freebiesLeft.
	•	Data/Services:
	•	src/services/stats.js → getMyStats() returns { freebiesLeft, loyaltyStamps, dividendsPending, ... }
	•	src/services/homeData.js → hours + IG post helpers
	•	scripts/*.js admin utilities (grant/reset rewards)
	•	Backend: Supabase (Postgres, Auth, RLS, Edge Functions):
	•	Edge functions (TypeScript): supabase/functions/*
	•	me-stats → returns per-user counts for client
	•	vouchers-sync → server-side normalization (convert every 8 stamps → 1 voucher)
	•	voucher-redeem → mark voucher as redeemed (and decrease freebiesLeft)
	•	member-lookup, me-membership (membership metadata)
	•	State helpers: some screens stash counts to globalThis.freebiesLeft / globalThis.loyaltyStamps for quick reuse between screens.

Invariant: Server is the source of truth. Client may render optimistically but must refresh from me-stats after any mutation.

⸻

2) Environment & config (must-know)

See README.md for full list. Critical:
	•	Client:
	•	EXPO_PUBLIC_SUPABASE_URL
	•	EXPO_PUBLIC_SUPABASE_ANON_KEY
	•	EXPO_PUBLIC_FUNCTIONS_URL
	•	Scripts/functions:
	•	SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server role)
	•	FUNCTIONS_URL (Edge functions base URL)

Never ship SERVICE_ROLE_KEY to the client.

⸻

3) Data model (conceptual)

Table names may differ; use your actual schema. The contracts below must hold.

	•	users (auth)
	•	id, email, …
	•	loyalty_stamps
	•	id, user_id, created_at
	•	drink_vouchers
	•	id, user_id, code (uuid/short), redeemed (boolean), created_at, redeemed_at
	•	memberships
	•	user_id, tier (‘free’ | ‘paid’), next_billing_at, …

RLS policies (enforced):
	•	select/insert/update/delete only where auth.uid() = user_id (or service role keys).
	•	Edge functions that consolidate/adjust balances run with Service Role.

⸻

4) API contracts (must not break)

4.1 getMyStats() (client → me-stats)

Returns (for signed-in user):

{
  "freebiesLeft": number,       // count of unredeemed drink_vouchers
  "loyaltyStamps": number,      // current remainder stamps 0..7 (after any conversion)
  "dividendsPending": number,   // optional, for members
  "payItForwardContrib": number,
  "communityContrib": number
}

Behavior rules:
	•	Before computing counts, server must normalize:
vouchers += floor(total_stamps / 8) and remainder = total_stamps % 8.
Then persist: create vouchers (if any), and either record full total_stamps or store only remainder—but always return remainder in loyaltyStamps.
	•	freebiesLeft == number of vouchers with redeemed = false.
	•	The server should be idempotent if called repeatedly.

4.2 voucher-redeem (client → server)

Input: { code: string }
Effect: mark voucher as redeemed = true, set redeemed_at, return updated { freebiesLeft }.

On client: optimistically remove voucher from carousel, then refresh getMyStats().

4.3 vouchers-sync (server/internal)

Given a user_id, convert stamps to vouchers. Create one voucher per 8 stamps. Safe to call repeatedly.

⸻

5) UI/Logic: loyalty stamps & QR carousel

5.1 Stamps → Voucher algorithm (server canonical)

// Pseudocode executed inside me-stats or vouchers-sync
const totalStamps = await count(loyalty_stamps where user_id=:uid);
const vouchersOpen = await count(drink_vouchers where user_id=:uid and redeemed=false);

const toMint = Math.floor(totalStamps / 8);
const remainder = totalStamps % 8;

if (toMint > 0) {
  // create `toMint` vouchers (with secure random codes)
  await insert to drink_vouchers (user_id, code, redeemed=false) x toMint;
  // (Option A) keep all stamp rows (audit) and compute remainder logically
  // (Option B) move/mark 8*toMint stamps as "consumed". Either is fine if consistent.
}

return {
  freebiesLeft: vouchersOpen + toMint,
  loyaltyStamps: remainder,
  ...
}

Agent guardrail: Do not do this conversion on the client. Do not show loyaltyStamps >= 8—it should never happen after a successful me-stats.

5.2 LoyaltyStampTile (client visual)
	•	Props: count is remainder 0..7.
	•	Always render 8 beans: first count beans filled, the rest outline.
	•	If the remainder from getMyStats() equals 0 and freebiesLeft increased since last render, you may trigger a “free drink earned” toast (but do not attempt conversion here).

Acceptance:
	•	When stamps increment from 7 → (server converts) → remainder 0 and freebiesLeft +1. UI shows 0 filled beans and counter increments.

5.3 QR carousel (client)
	•	Uses react-native-pager-view.
	•	Page 0: Membership QR payload ruminate:<user.id> (fallback: ruminate:member signed-out).
	•	Pages 1..N: One page per unredeemed voucher code (drink_vouchers.redeemed=false), newest first.
	•	Key each page stably (code/ID). Avoid re-render flicker: keep codes state sorted descending by created_at.
	•	On “Redeemed” action (if present), call voucher-redeem, optimistically remove the page, then refresh getMyStats().

Acceptance:
	•	If freebiesLeft = 0 → only membership QR page.
	•	If freebiesLeft = 2 → membership QR + 2 voucher pages.
	•	Swiping dots must match page count.

⸻

6) Screen data flow (reference)

HomeScreen
	•	On focus: call getMyStats(), getToday(), getLatestInstagramPost().
	•	Set:
	•	loyalty.current = stats.loyaltyStamps
	•	freebiesLeft = stats.freebiesLeft
	•	(Optional) cache to globalThis as currently implemented
	•	Render:
	•	LoyaltyStampTile count={loyalty.current}
	•	If paid: FreeDrinksCounter count={freebiesLeft}

MembershipScreen
	•	On focus: call getMembershipSummary(), getMyStats(), supabase.auth.getUser().
	•	Build vouchers array from freebiesLeft via API call that returns codes (preferred: extend me-stats to include voucherCodes[]). If only counts are available, call a vouchers-list function. Avoid client-side random codes.
	•	Compose carousel pages as in §5.3.

⸻

7) Error handling & retries
	•	If Supabase auth/session is unavailable → treat as signed out (summary.signedIn=false), show join buttons.
	•	For network/API errors:
	•	Show non-blocking toast; keep last known values.
	•	Retry on focus or pull-to-refresh.
	•	IG tile: fall back to app icon + “Unable to load latest post.”

⸻

8) RLS & security checklist
	•	Ensure RLS ON for drink_vouchers, loyalty_stamps with policies:
	•	select: using (auth.uid() = user_id)
	•	insert: with check (auth.uid() = user_id)
	•	update/delete: using (auth.uid() = user_id)
	•	Edge Functions that convert stamps or redeem vouchers must use Service Role.
	•	Client never uses Service Role; only anon key + user JWT.

⸻

9) Dev scripts (admin)
	•	npm run grant-rewards <email> <freeDrinks> <loyaltyStamps>
	•	Requires SUPABASE_SERVICE_ROLE_KEY.
	•	Locates user by email, inserts stamps and/or vouchers accordingly. Prefer stamps insertion and then call vouchers-sync to stay consistent.
	•	npm run reset-rewards <email>
	•	Deletes (or marks) user stamps and unredeemed vouchers.

Guardrail: Scripts must tolerate:
	•	user not found
	•	RLS (must use service role client)
	•	idempotent runs

⸻

10) Definition of Done (DoD)

A change that touches loyalty or vouchers is done when:
	1.	getMyStats() returns remainder stamps (0..7) and correct freebiesLeft.
	2.	Earning the 8th stamp creates a voucher (server), remainder resets to 0, and freebiesLeft increments by 1.
	3.	QR carousel shows membership QR + one page per unredeemed voucher.
	4.	Redeeming a voucher removes it from the carousel and freebiesLeft decrements after refresh.
	5.	All code paths handle signed-out state and transient network errors.
	6.	No Service Role key in client bundle.

⸻

11) Test scenarios (manual)
	1.	Accrue 0→7 stamps:
	•	loyaltyStamps increments, freebiesLeft unchanged.
	2.	Grant 1 stamp when at 7:
	•	Server converts to voucher; loyaltyStamps=0, freebiesLeft+1.
	•	Carousel adds one voucher page.
	3.	Redeem a voucher:
	•	Call voucher-redeem → carousel removes that voucher page; freebiesLeft-1.
	4.	Multiple vouchers (2+):
	•	Carousel shows membership QR + N vouchers; dots = N+1.
	5.	Signed out:
	•	Only onboarding buttons; IG + hours still visible.
	6.	Network error during me-stats:
	•	UI shows last known values; error toast; recovers on refocus.

⸻

12) Common pitfalls & fixes
	•	Client-generated voucher codes: ❌ Don’t. Always from server/db.
	•	loyaltyStamps ever ≥ 8 on client: bug—server conversion missing. Fix in me-stats.
	•	PagerView flicker: missing stable keys or re-sorting; use code or id, keep array stable.
	•	RLS blocks reads: add select policy auth.uid() = user_id.
	•	Auth not ready: guard supabase.auth.getSession()/getUser() and render signed-out placeholders.

⸻

13) Coding style & commit guidance
	•	Keep network calls in src/services/*.
	•	Keep UI pure & declarative; props carry already-normalized values.
	•	Atomize commits: “feat(loyalty): server converts 8 stamps to voucher in me-stats”
	•	If touching both server and client, land server first (backward compatible), then client.

⸻

14) Open questions (leave TODOs, not hacks)
	•	Should me-stats also return voucherCodes[]? Recommended to stop guessing pages from counts.
	•	Do we persist “consumed” stamps or leave as audit trail? Decide and document; both are fine if consistent.

⸻

Contact / Maintainers:
Add names/emails/Slack channel here.

⸻

End of AGENTS.md.
