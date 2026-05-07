import { Migration } from '@mikro-orm/migrations';

/**
 * Resolves Supabase Security Advisor errors and warnings:
 *
 *  ERRORS (RLS Disabled in Public)
 *  -------------------------------
 *  Enables Row Level Security on every public table that the advisor
 *  flagged. None of these tables are read directly by the frontend —
 *  all access goes through the NestJS backend, which connects as the
 *  postgres superuser (BYPASSRLS) and uses the Supabase service-role
 *  key for admin SDK calls (also BYPASSRLS). With no policies defined,
 *  enabling RLS denies anon/authenticated direct access while leaving
 *  the backend fully functional.
 *
 *  WARNINGS (Function Search Path Mutable)
 *  ---------------------------------------
 *  Pins `search_path = public, pg_temp` on the only public-schema
 *  function flagged: check_user_permission. Without an explicit
 *  search_path, a malicious user could create a same-named object in
 *  a different schema and shadow trusted references inside the function.
 *
 *  storage.* and graphql.* mutable-search_path warnings are NOT
 *  addressed here — those functions are owned and managed by Supabase
 *  itself; modifying them via migration would be reset on the next
 *  Supabase upgrade. They get fixed by upgrading the Supabase image.
 *
 *  Idempotent: each statement uses IF EXISTS / ENABLE-which-is-a-noop-
 *  if-already-enabled, so re-running the migration is safe.
 */
export class Migration20260507000000_enable_rls_and_fix_search_path extends Migration {
  override async up(): Promise<void> {
    const tables = [
      'admin_audit_log',
      'coupon_usages',
      'coupons',
      'forever_members',
      'member_page_views',
      'processed_paypal_webhooks',
      'qa_checklist_items',
      'qa_developer_fixes',
      'qa_item_responses',
      'qa_master_items',
      'qa_round_assignments',
      'qa_rounds',
      'recurring_invoice_templates',
      'roles',
      'score_sheet_config',
      'score_sheet_templates',
      'world_finals_addon_items',
      'world_finals_package_classes',
      'world_finals_packages',
      'world_finals_registration_config',
    ];

    for (const t of tables) {
      // ENABLE ROW LEVEL SECURITY is idempotent — calling it on an
      // already-enabled table is a no-op without error.
      this.addSql(`ALTER TABLE IF EXISTS "public"."${t}" ENABLE ROW LEVEL SECURITY;`);
    }

    // Pin search_path on the public function. Empty search_path forces
    // fully-qualified references inside the function body, closing the
    // schema-shadowing attack vector. pg_catalog is always implicitly
    // available regardless of search_path so built-in casts (uuid, jsonb,
    // current_setting) keep working.
    //
    // The auth.*, storage.*, and graphql.* functions flagged by the
    // advisor are NOT touched here — they are owned by Supabase platform
    // roles (supabase_auth_admin, supabase_storage_admin) and the pg_graphql
    // extension. Even the postgres superuser cannot ALTER them or SET ROLE
    // to their owners because Supabase locks those roles. They get fixed
    // by upgrading the Supabase CLI / Docker image to a version that ships
    // these functions with search_path baked in upstream.
    this.addSql(`
      ALTER FUNCTION public.check_user_permission(p_user_id uuid, p_permission_name text)
      SET search_path = '';
    `);

    // Hide every public table from the auto-generated pg_graphql schema.
    // The Security Advisor flags any public table that anon/authenticated
    // can resolve via the GraphQL endpoint. The app does not use that
    // endpoint (everything goes through the NestJS API), so omitting them
    // is a safe no-op for the app and silences the entire category of
    // "Public Can See Object in GraphQL Schema" warnings.
    //
    // Implementation note: we'd prefer to REVOKE USAGE ON SCHEMA graphql
    // but Supabase locks supabase_admin (the grantor) so even postgres
    // cannot revoke. The pg_graphql comment-directive API works without
    // privilege escalation.
    this.addSql(`
      DO $$
      DECLARE rec RECORD;
      BEGIN
        FOR rec IN
          SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        LOOP
          EXECUTE format(
            'COMMENT ON TABLE public.%I IS %L',
            rec.tablename,
            '@graphql({"totalCount": {"enabled": false}, "omit": true})'
          );
        END LOOP;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    const tables = [
      'admin_audit_log',
      'coupon_usages',
      'coupons',
      'forever_members',
      'member_page_views',
      'processed_paypal_webhooks',
      'qa_checklist_items',
      'qa_developer_fixes',
      'qa_item_responses',
      'qa_master_items',
      'qa_round_assignments',
      'qa_rounds',
      'recurring_invoice_templates',
      'roles',
      'score_sheet_config',
      'score_sheet_templates',
      'world_finals_addon_items',
      'world_finals_package_classes',
      'world_finals_packages',
      'world_finals_registration_config',
    ];
    for (const t of tables) {
      this.addSql(`ALTER TABLE IF EXISTS "public"."${t}" DISABLE ROW LEVEL SECURITY;`);
    }
    this.addSql(`
      DO $$
      BEGIN
        ALTER FUNCTION public.check_user_permission(p_user_id uuid, p_permission_name text) RESET search_path;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);
  }
}
