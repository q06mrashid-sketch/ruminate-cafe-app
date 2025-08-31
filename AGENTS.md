updates-agents.md

Guidelines for anyone updating the Ruminate project (SQL, React Native app, and the HTML CMS editor). The goals: keep migrations safe, keep the app stable, and ensure the CMS contract stays consistent.

⸻

1) Project scope & context
	•	App: React Native (RN 0.7x+), react-native-gesture-handler, react-native-safe-area-context.
	•	Backend: Supabase Postgres. Migrations live in supabase/migrations/*.sql.
	•	Currency: GBP. Store prices as integer cents; display with “£”.
	•	CMS-driven menu & modifiers: keys such as:
	•	menu.<category>.<suffix>, price.<category>.<suffix>, desc.<category>.<suffix>
	•	image.<category>.<suffix>, image.<category>.<suffix>.name
	•	Categories: coffee, not-coffee, pif, specials.

⸻

2) Golden rules (apply to all work)
	1.	Never break supabase db push. Migrations must be idempotent, re-runnable, and tolerant of empty datasets (e.g. no users in auth.users).
	2.	Guard everything in SQL:
	•	Constraints/indexes/policies: check existence via pg_constraint, pg_indexes, pg_policies before drop/create.
	•	Functions: if signature changes, DROP FUNCTION IF EXISTS ... with the exact signature first, then CREATE FUNCTION.
	3.	Acceptance blocks: If auth.users is empty, RAISE NOTICE and RETURN (skip the test). Use time/random order IDs like:

oid text := 'o' || floor(extract(epoch from now()))::text;


	4.	OUT params (critical): When selecting from functions that RETURN TABLE(...) (or use OUT params), capture into a record to avoid 42702 ambiguous column.

DECLARE r record;
SELECT * INTO r FROM public.the_function(...);
-- use r.col1, r.col2


	5.	Orders invariants:
	•	source ∈ {'app','pos','portal'} (lowercase). If client sends other, normalize to allowed value and stash original in nullable source_meta.
	•	Always persist pickup_code.
	•	RLS: users can insert/select their own rows.
	6.	Loyalty logic:
	•	+1 stamp per base drink item only (exclude addons: syrups, extra shots, alt milks).
	•	8 stamps → +1 free drink. Redeemed vouchers reduce resulting stamp awards appropriately for an order.
	•	On purchase, console log:
[LOYALTY] awarding: +<n> stamp(s); new free drinks: <m>
	7.	UI safety:
	•	App root wrapped once with GestureHandlerRootView.
	•	Screens in SafeAreaView with edges={['top','bottom','left','right']} and enough bottom padding to avoid overlapping the tab bar.

⸻

3) SQL migration playbook

3.1 Safe function replacement (example: award_stamps)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='award_stamps'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, integer'
  ) THEN
    EXECUTE 'DROP FUNCTION public.award_stamps(uuid, text, integer)';
  END IF;
END $$;

CREATE FUNCTION public.award_stamps(p_user uuid, p_order_id text, p_add int)
RETURNS TABLE(loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
AS $$
-- Body: ignore addons for stamp calc, log into public.loyalty_awards,
-- update profiles.{loyalty_stamps, free_drinks}, return new totals.
$$;

GRANT EXECUTE ON FUNCTION public.award_stamps(uuid, text, integer)
  TO anon, authenticated, service_role;

3.2 Acceptance block pattern (tolerant & non-ambiguous)

DO $$
DECLARE
  u uuid;
  r record;
  ls int; fd int; cnt int;
  pk text;
  oid text := 'o' || floor(extract(epoch from now()))::text;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping loyalty acceptance test: no rows in auth.users.';
    RETURN;
  END IF;

  -- Detect profiles PK column (user_id vs id)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
    pk := 'user_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='profiles' AND column_name='id') THEN
    pk := 'id';
  ELSE
    RAISE EXCEPTION 'profiles identifier column not found';
  END IF;

  -- Baseline profile
  IF pk = 'user_id' THEN
    INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
    VALUES (u, 5, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET loyalty_stamps = EXCLUDED.loyalty_stamps,
          free_drinks    = EXCLUDED.free_drinks;
  ELSE
    INSERT INTO public.profiles(id, loyalty_stamps, free_drinks)
    VALUES (u, 5, 1)
    ON CONFLICT (id) DO UPDATE
      SET loyalty_stamps = EXCLUDED.loyalty_stamps,
          free_drinks    = EXCLUDED.free_drinks;
  END IF;

  -- ✅ Capture OUT params into a record
  SELECT * INTO r FROM public.award_stamps(u, oid, 3);
  ls := r.loyalty_stamps; fd := r.free_drinks;

  -- Expect: 5 + 3 = 8 → +1 free drink → totals: stamps=0, free_drinks=2
  IF ls <> 0 OR fd <> 2 THEN
    RAISE EXCEPTION 'unexpected totals %, %', ls, fd;
  END IF;

  SELECT count(*) INTO cnt FROM public.loyalty_awards WHERE order_id = oid;
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'loyalty_awards count %', cnt;
  END IF;

  -- Cleanup
  DELETE FROM public.loyalty_awards WHERE order_id = oid;
  IF pk = 'user_id' THEN DELETE FROM public.profiles WHERE user_id = u;
  ELSE DELETE FROM public.profiles WHERE id = u;
  END IF;
END $$;

3.3 Orders constraints & RLS (safe re-apply)

-- Recreate source check safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_source_check') THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_source_check;
  END IF;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_source_check
    CHECK (lower(source) IN ('app','pos','portal'));
END $$;

-- Unique index on order_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orders' AND indexname='orders_order_id_key'
  ) THEN
    CREATE UNIQUE INDEX orders_order_id_key ON public.orders(order_id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='orders' AND policyname='orders_select_own'
  ) THEN
    CREATE POLICY orders_select_own ON public.orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='orders' AND policyname='orders_insert_own'
  ) THEN
    CREATE POLICY orders_insert_own ON public.orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


⸻

4) App code requirements

4.1 Normalize order source (TypeScript)

type AllowedSource = 'app'|'pos'|'portal';
const ALLOWED: AllowedSource[] = ['app','pos','portal'];

export function normalizeSource(input?: string) {
  const raw = (input ?? '').trim();
  const s = raw.toLowerCase();
  if (ALLOWED.includes(s as AllowedSource)) {
    return { source: s as AllowedSource, source_meta: null as string | null };
  }
  return { source: 'app' as AllowedSource, source_meta: raw || null };
}

4.2 Insert order (persist pickup code + normalized source)

const { source, source_meta } = normalizeSource(receipt?.source);

await supabase.from('orders').insert({
  user_id,
  order_id: receipt.id,
  pickup_code: receipt.pickupCode,
  status: 'pending',
  totals_cents: receipt.totalCents,
  currency: 'GBP',
  channel: 'click_and_collect',
  source,
  source_meta,
  items: receipt.items,   // JSON
  receipt: receipt,       // JSON
});

4.3 UI invariants (RN)
	•	Root:

import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function App(){
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Navigation />
    </GestureHandlerRootView>
  );
}


	•	Screen wrapper:

<SafeAreaView style={{ flex:1, backgroundColor: palette.cream }}
              edges={['top','bottom','left','right']}>
  <ScrollView contentContainerStyle={{ padding:16, paddingBottom:120 }}>
    {/* content */}
  </ScrollView>
</SafeAreaView>


	•	Cart specifics: rounded item tiles; qty +/-; remove; prices in £. “Pick time slot” button; Apple Pay disabled={!selectedTimeSlot}. Voucher selector capped by min(drinkCount, availableVouchers).

⸻

5) HTML CMS editor playbook

5.1 Categories

Ensure editor supports: coffee, not-coffee, pif, specials.

5.2 Keys written on save
	•	menu.<category>.<suffix> → item name
	•	price.<category>.<suffix> → price string (e.g. 2.99)
	•	desc.<category>.<suffix> → description
	•	image.<category>.<suffix> → base64
	•	image.<category>.<suffix>.name → original filename

5.3 Item eligibility flags (checkboxes on each row)

Ticking should append tokens in the UI and persist flags:
	•	Syrups → add syrups (UI token) and persist menu.<category>.<suffix>.syrups-on = "true"
	•	Coffee blend → add coffee (UI token) and persist menu.<category>.<suffix>.coffee-on = "true"
	•	Extra shot → add extra (UI token)
	•	Alt milks → add alt (UI token)

App reads *-on flags to decide visibility of selectors; global lists provide options.

5.4 Global lists (tables)
	•	Coffee blends: keys coffee.<label> (value = display name). Add/remove/persist.
	•	Syrups: keys syrups.<label> (value = display name). Add/remove/persist.
	•	Alt milks: continue to use .alt. (free) as in current app logic.

5.5 Robustness
	•	Use existing apiGetAll / apiUpsert; show errors via showError.
	•	Removing an item clears menu/price/desc/image/image.name keys; then loadAll().
	•	All operations idempotent; safe on repeat.

⸻

6) Validation checklist (before you finish)
	•	supabase db push succeeds on a clean database with zero users.
	•	No 42702 ambiguous column, no “cannot change return type of existing function”, no FK violations in acceptance blocks.
	•	Orders insert without violating orders_source_check; pickup_code is persisted.
	•	Acceptance test skips if auth.users is empty.
	•	Loyalty acceptance: captures OUT params into a record; assertions pass; cleanup runs.
	•	App: Orders tab appears after first order; receipts load from Supabase.
	•	Cart: voucher selector caps correctly; Apple Pay disabled until time slot; prices show “£”.
	•	CMS: can add/edit/remove across coffee/not-coffee/pif/specials; can toggle syrups/coffee/extra/alt; Coffee & Syrups lists persist and are removable.

⸻

7) What to output in PRs
	•	SQL: one new migration per logical change. Do not write to supabase_migrations.schema_migrations.
	•	TS/RN/HTML: full file replacements or tight diffs, with file paths.
	•	A short “Why” note for each change and how it respects these rules.
