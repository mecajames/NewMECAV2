


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."achievement_format" AS ENUM (
    'SPL',
    'SQL'
);


ALTER TYPE "public"."achievement_format" OWNER TO "postgres";


CREATE TYPE "public"."achievement_metric_type" AS ENUM (
    'score',
    'points'
);


ALTER TYPE "public"."achievement_metric_type" OWNER TO "postgres";


CREATE TYPE "public"."achievement_type" AS ENUM (
    'dynamic',
    'static'
);


ALTER TYPE "public"."achievement_type" OWNER TO "postgres";


CREATE TYPE "public"."application_entry_method" AS ENUM (
    'self',
    'admin_application',
    'admin_direct'
);


ALTER TYPE "public"."application_entry_method" OWNER TO "postgres";


CREATE TYPE "public"."application_status" AS ENUM (
    'pending',
    'under_review',
    'approved',
    'rejected'
);


ALTER TYPE "public"."application_status" OWNER TO "postgres";


CREATE TYPE "public"."assignment_request_type" AS ENUM (
    'ed_request',
    'judge_volunteer',
    'admin_assign'
);


ALTER TYPE "public"."assignment_request_type" OWNER TO "postgres";


CREATE TYPE "public"."award_section" AS ENUM (
    'special_awards',
    'club_awards'
);


ALTER TYPE "public"."award_section" OWNER TO "postgres";


CREATE TYPE "public"."banner_position" AS ENUM (
    'events_page_top'
);


ALTER TYPE "public"."banner_position" OWNER TO "postgres";


CREATE TYPE "public"."banner_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'archived'
);


ALTER TYPE "public"."banner_status" OWNER TO "postgres";


CREATE TYPE "public"."contact_status" AS ENUM (
    'pending',
    'read',
    'replied',
    'archived'
);


ALTER TYPE "public"."contact_status" OWNER TO "postgres";


CREATE TYPE "public"."event_assignment_role" AS ENUM (
    'primary',
    'supporting',
    'trainee'
);


ALTER TYPE "public"."event_assignment_role" OWNER TO "postgres";


CREATE TYPE "public"."event_assignment_status" AS ENUM (
    'requested',
    'accepted',
    'declined',
    'confirmed',
    'completed',
    'no_show'
);


ALTER TYPE "public"."event_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."event_status" AS ENUM (
    'upcoming',
    'ongoing',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."event_status" OWNER TO "postgres";


CREATE TYPE "public"."event_type" AS ENUM (
    'standard',
    'state_finals',
    'world_finals',
    'judges_point'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."judge_level" AS ENUM (
    'in_training',
    'certified',
    'head_judge',
    'master_judge'
);


ALTER TYPE "public"."judge_level" OWNER TO "postgres";


CREATE TYPE "public"."judge_specialty" AS ENUM (
    'sql',
    'spl',
    'both'
);


ALTER TYPE "public"."judge_specialty" OWNER TO "postgres";


CREATE TYPE "public"."manufacturer_tier" AS ENUM (
    'bronze',
    'silver',
    'gold'
);


ALTER TYPE "public"."manufacturer_tier" OWNER TO "postgres";


CREATE TYPE "public"."membership_account_type" AS ENUM (
    'independent',
    'master',
    'secondary'
);


ALTER TYPE "public"."membership_account_type" OWNER TO "postgres";


CREATE TYPE "public"."membership_category" AS ENUM (
    'competitor',
    'team',
    'retail',
    'manufacturer'
);


ALTER TYPE "public"."membership_category" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'none',
    'active',
    'expired'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_type" AS ENUM (
    'annual',
    'lifetime'
);


ALTER TYPE "public"."membership_type" OWNER TO "postgres";


CREATE TYPE "public"."membership_type_enum" AS ENUM (
    'domestic',
    'international',
    'team',
    'retailer',
    'annual',
    'lifetime'
);


ALTER TYPE "public"."membership_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."multi_day_results_mode_enum" AS ENUM (
    'separate',
    'combined_score',
    'combined_points'
);


ALTER TYPE "public"."multi_day_results_mode_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'stripe',
    'paypal',
    'credit_card',
    'manual',
    'wordpress_pmpro'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'membership',
    'event_registration',
    'other'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."rating_entity_type" AS ENUM (
    'judge',
    'event_director'
);


ALTER TYPE "public"."rating_entity_type" OWNER TO "postgres";


CREATE TYPE "public"."registration_status" AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


ALTER TYPE "public"."registration_status" OWNER TO "postgres";


CREATE TYPE "public"."season_qualification_status" AS ENUM (
    'qualified',
    'pending',
    'inactive',
    'suspended'
);


ALTER TYPE "public"."season_qualification_status" OWNER TO "postgres";


CREATE TYPE "public"."shop_order_status" AS ENUM (
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."shop_order_status" OWNER TO "postgres";


CREATE TYPE "public"."shop_product_category" AS ENUM (
    'measuring_tools',
    'cds',
    'apparel',
    'accessories',
    'other'
);


ALTER TYPE "public"."shop_product_category" OWNER TO "postgres";


CREATE TYPE "public"."threshold_operator" AS ENUM (
    '>',
    '>=',
    '=',
    '<',
    '<='
);


ALTER TYPE "public"."threshold_operator" OWNER TO "postgres";


CREATE TYPE "public"."trainee_type" AS ENUM (
    'judge',
    'event_director'
);


ALTER TYPE "public"."trainee_type" OWNER TO "postgres";


CREATE TYPE "public"."training_result" AS ENUM (
    'pass',
    'fail'
);


ALTER TYPE "public"."training_result" OWNER TO "postgres";


CREATE TYPE "public"."training_type" AS ENUM (
    'spl',
    'sql',
    'both'
);


ALTER TYPE "public"."training_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'event_director',
    'retailer',
    'admin',
    'judge'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."verification_purpose" AS ENUM (
    'judge_application',
    'ed_application',
    'other'
);


ALTER TYPE "public"."verification_purpose" OWNER TO "postgres";


CREATE TYPE "public"."weekend_availability" AS ENUM (
    'saturday',
    'sunday',
    'both'
);


ALTER TYPE "public"."weekend_availability" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_update_event_statuses"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  updated_count INTEGER := 0;
  row_count INTEGER;
BEGIN
  -- Update upcoming events that are now in the past to completed
  UPDATE events
  SET status = 'completed'
  WHERE event_date::date < CURRENT_DATE
    AND status = 'upcoming';

  GET DIAGNOSTICS row_count = ROW_COUNT;
  updated_count := updated_count + row_count;

  -- Update upcoming events that are today to ongoing
  UPDATE events
  SET status = 'ongoing'
  WHERE event_date::date = CURRENT_DATE
    AND status = 'upcoming';

  GET DIAGNOSTICS row_count = ROW_COUNT;
  updated_count := updated_count + row_count;

  -- Update ongoing events that are now in the past to completed
  UPDATE events
  SET status = 'completed'
  WHERE event_date::date < CURRENT_DATE
    AND status = 'ongoing';

  GET DIAGNOSTICS row_count = ROW_COUNT;
  updated_count := updated_count + row_count;

  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."batch_update_event_statuses"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."batch_update_event_statuses"() IS 'Batch updates all event statuses based on their event_date.
Can be run manually or scheduled via cron job.
Returns the number of events updated.';



CREATE OR REPLACE FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role user_role;
  has_permission BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM profiles WHERE id = p_user_id;

  -- If user is admin, always return true
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if permission is explicitly denied via override
  IF EXISTS (
    SELECT 1 FROM user_permission_overrides upo
    JOIN permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = p_user_id
    AND p.name = p_permission_name
    AND upo.granted = false
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if permission is explicitly granted via override
  IF EXISTS (
    SELECT 1 FROM user_permission_overrides upo
    JOIN permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = p_user_id
    AND p.name = p_permission_name
    AND upo.granted = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check role permissions
  IF EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = user_role
    AND p.name = p_permission_name
  ) THEN
    RETURN TRUE;
  END IF;

  -- Default: no permission
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_points_configuration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
      BEGIN
        INSERT INTO points_configuration (
          season_id,
          standard_1st_place, standard_2nd_place, standard_3rd_place, standard_4th_place, standard_5th_place,
          four_x_1st_place, four_x_2nd_place, four_x_3rd_place, four_x_4th_place, four_x_5th_place,
          four_x_extended_enabled, four_x_extended_points, four_x_extended_max_place,
          is_active, description
        ) VALUES (
          NEW.id,
          5, 4, 3, 2, 1,
          30, 27, 24, 21, 18,
          false, 15, 50,
          true, 'Default configuration for ' || NEW.name
        );
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION "public"."create_default_points_configuration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('invoice_number_seq');
  -- Format: MECA-INV-0001
  RETURN 'MECA-INV-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;


ALTER FUNCTION "public"."generate_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_meca_id"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the next value from sequence
  next_id := nextval('meca_id_seq');

  -- Check if this ID already exists (for safety)
  WHILE EXISTS (SELECT 1 FROM profiles WHERE meca_id = next_id) LOOP
    next_id := nextval('meca_id_seq');
  END LOOP;

  RETURN next_id;
END;
$$;


ALTER FUNCTION "public"."generate_meca_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
      DECLARE
        seq_val INT;
        year_str VARCHAR;
      BEGIN
        SELECT nextval('order_number_seq') INTO seq_val;
        SELECT TO_CHAR(NOW(), 'YYYY') INTO year_str;
        RETURN 'ORD-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
      END;
      $$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"("p_member_meca_id" integer, "p_order_type" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  -- Determine prefix based on order type
  prefix := CASE
    WHEN p_order_type = 'subscription' THEN 'MECA-SUB-'
    ELSE 'MECA-ORD-'
  END;

  -- Get next number
  next_num := nextval('order_number_seq');

  -- Format: MECA-ORD-700800-001 or MECA-SUB-700800-001
  RETURN prefix || p_member_meca_id || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION "public"."generate_order_number"("p_member_meca_id" integer, "p_order_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leaderboard"() RETURNS TABLE("competitor_id" "uuid", "competitor_name" "text", "total_points" integer, "events_participated" bigint, "first_place" bigint, "second_place" bigint, "third_place" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cr.competitor_id, gen_random_uuid()) as competitor_id,
    cr.competitor_name,
    SUM(cr.points_earned)::INTEGER as total_points,
    COUNT(DISTINCT cr.event_id) as events_participated,
    COUNT(CASE WHEN cr.placement = 1 THEN 1 END) as first_place,
    COUNT(CASE WHEN cr.placement = 2 THEN 1 END) as second_place,
    COUNT(CASE WHEN cr.placement = 3 THEN 1 END) as third_place
  FROM competition_results cr
  WHERE cr.competitor_name IS NOT NULL
  GROUP BY
    cr.competitor_id,
    cr.competitor_name
  ORDER BY total_points DESC
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."get_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_meca_id"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
      DECLARE
        next_id INTEGER;
      BEGIN
        -- Only consider MECA IDs >= 700500 (ignore legacy IDs below this threshold)
        SELECT COALESCE(MAX(meca_id), 700499) + 1 INTO next_id FROM memberships WHERE meca_id >= 700500;
        RETURN next_id;
      END;
      $$;


ALTER FUNCTION "public"."get_next_meca_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count
  FROM notifications
  WHERE user_id = p_user_id AND read = false;

  RETURN count;
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE user_id = p_user_id AND user_id = auth.uid() AND read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Determine the appropriate status based on event_date
  IF NEW.event_date::date > CURRENT_DATE THEN
    NEW.status := 'upcoming';
  ELSIF NEW.event_date::date = CURRENT_DATE THEN
    NEW.status := 'ongoing';
  ELSE
    -- Only auto-update to completed if not manually set to cancelled
    IF NEW.status != 'cancelled' THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_event_status"() IS 'Automatically updates event status based on event_date:
- upcoming: event_date is in the future
- ongoing: event_date is today
- completed: event_date is in the past (unless manually set to cancelled)
- cancelled: manually set, will not be auto-updated';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievement_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "template_key" character varying(100) NOT NULL,
    "format" "public"."achievement_format",
    "competition_type" character varying(100) NOT NULL,
    "metric_type" "public"."achievement_metric_type" NOT NULL,
    "threshold_value" numeric(10,2) NOT NULL,
    "threshold_operator" "public"."threshold_operator" DEFAULT '>='::"public"."threshold_operator" NOT NULL,
    "class_filter" "text"[],
    "division_filter" "text"[],
    "points_multiplier" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_name" character varying(100),
    "achievement_type" "public"."achievement_type" DEFAULT 'dynamic'::"public"."achievement_type" NOT NULL,
    "render_value" numeric(10,2)
);


ALTER TABLE "public"."achievement_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievement_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "meca_id" character varying(50),
    "achieved_value" numeric(10,2) NOT NULL,
    "achieved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "competition_result_id" "uuid",
    "event_id" "uuid",
    "season_id" "uuid",
    "image_url" character varying(500),
    "image_generated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."achievement_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievement_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "base_image_path" character varying(500) NOT NULL,
    "font_size" integer DEFAULT 500 NOT NULL,
    "text_x" integer NOT NULL,
    "text_y" integer NOT NULL,
    "text_color" character varying(20) DEFAULT '#CC0F00'::character varying NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."achievement_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "contact_phone" "text",
    "website" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."advertisers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banner_engagements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "banner_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "impressions" integer DEFAULT 0 NOT NULL,
    "clicks" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."banner_engagements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "click_url" "text",
    "position" "public"."banner_position" NOT NULL,
    "status" "public"."banner_status" DEFAULT 'draft'::"public"."banner_status" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "advertiser_id" "uuid" NOT NULL,
    "alt_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_impressions_per_user" integer DEFAULT 0 NOT NULL,
    "max_total_impressions" integer DEFAULT 0 NOT NULL,
    "rotation_weight" integer DEFAULT 100 NOT NULL
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


COMMENT ON COLUMN "public"."banners"."max_impressions_per_user" IS 'Maximum times to show this banner to the same user. 0 = unlimited.';



COMMENT ON COLUMN "public"."banners"."max_total_impressions" IS 'Maximum total impressions across all users. 0 = unlimited.';



COMMENT ON COLUMN "public"."banners"."rotation_weight" IS 'Weight for rotation when multiple banners compete. Higher = more likely to be shown.';



CREATE TABLE IF NOT EXISTS "public"."championship_archives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "title" "text" NOT NULL,
    "hero_image_url" "text",
    "world_finals_event_id" "uuid",
    "published" boolean DEFAULT false NOT NULL,
    "special_awards_content" "jsonb",
    "club_awards_content" "jsonb",
    "additional_content" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."championship_archives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."championship_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "archive_id" "uuid" NOT NULL,
    "section" "public"."award_section" NOT NULL,
    "award_name" "text" NOT NULL,
    "recipient_name" "text" NOT NULL,
    "recipient_team" "text",
    "recipient_state" "text",
    "description" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."championship_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_name_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_name" "text" NOT NULL,
    "target_class_id" "uuid",
    "source_system" "text" DEFAULT 'termlab'::"text",
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_name_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "communication_type" "text" NOT NULL,
    "subject" "text",
    "body" "text",
    "status" "text" DEFAULT 'sent'::"text",
    "recipient" "text",
    "sent_by" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."communication_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "abbreviation" "text" NOT NULL,
    "format" "text" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."competition_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_formats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "abbreviation" "text"
);


ALTER TABLE "public"."competition_formats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "competitor_id" "uuid",
    "competitor_name" "text" NOT NULL,
    "competition_class" "text" NOT NULL,
    "score" numeric(10,2) NOT NULL,
    "placement" integer NOT NULL,
    "points_earned" integer DEFAULT 0 NOT NULL,
    "vehicle_info" "text",
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "meca_id" "text",
    "season_id" "uuid",
    "class_id" "uuid",
    "format" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "revision_count" integer DEFAULT 0,
    "modification_reason" "text",
    "wattage" integer,
    "frequency" integer,
    "state_code" "text"
);


ALTER TABLE "public"."competition_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "subject" character varying(200) NOT NULL,
    "message" "text" NOT NULL,
    "status" "public"."contact_status" DEFAULT 'pending'::"public"."contact_status" NOT NULL,
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "replied_at" timestamp with time zone,
    "replied_by" "uuid",
    "admin_notes" "text"
);


ALTER TABLE "public"."contact_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_verification_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "token" "text" NOT NULL,
    "purpose" "public"."verification_purpose" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "related_entity_id" "uuid",
    "is_used" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."email_verification_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_director_application_references" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "relationship" "text",
    "company" "text",
    "phone" "text",
    "email" "text",
    "years_known" integer,
    "reference_checked" boolean DEFAULT false NOT NULL,
    "reference_notes" "text",
    "checked_by" "uuid",
    "checked_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_director_application_references" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_director_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."application_status" DEFAULT 'pending'::"public"."application_status" NOT NULL,
    "application_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_date" timestamp with time zone,
    "reviewed_by" "uuid",
    "entered_by" "uuid",
    "entry_method" "public"."application_entry_method" DEFAULT 'self'::"public"."application_entry_method" NOT NULL,
    "full_name" "text" NOT NULL,
    "preferred_name" "text",
    "date_of_birth" "date" NOT NULL,
    "phone" "text" NOT NULL,
    "secondary_phone" "text",
    "headshot_url" "text",
    "country" "text" NOT NULL,
    "state" "text" NOT NULL,
    "city" "text" NOT NULL,
    "zip" "text" NOT NULL,
    "travel_radius" "text" NOT NULL,
    "additional_regions" "jsonb" DEFAULT '[]'::"jsonb",
    "weekend_availability" "public"."weekend_availability" NOT NULL,
    "availability_notes" "text",
    "years_in_industry" integer NOT NULL,
    "event_management_experience" "text" NOT NULL,
    "team_management_experience" "text" NOT NULL,
    "equipment_resources" "text",
    "specialized_formats" "jsonb" DEFAULT '[]'::"jsonb",
    "essay_why_ed" "text" NOT NULL,
    "essay_qualifications" "text" NOT NULL,
    "essay_additional" "text",
    "ack_independent_contractor" boolean DEFAULT false NOT NULL,
    "ack_code_of_conduct" boolean DEFAULT false NOT NULL,
    "ack_background_check" boolean DEFAULT false NOT NULL,
    "ack_terms_conditions" boolean DEFAULT false NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_director_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_director_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "event_director_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'requested'::character varying NOT NULL,
    "request_type" character varying(50) NOT NULL,
    "requested_by" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "decline_reason" "text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_director_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_director_season_qualifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_director_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "status" "public"."season_qualification_status" DEFAULT 'pending'::"public"."season_qualification_status" NOT NULL,
    "qualified_date" timestamp with time zone,
    "qualified_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_director_season_qualifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_directors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "application_id" "uuid",
    "headshot_url" "text",
    "bio" "text",
    "preferred_name" "text",
    "location_country" "text" NOT NULL,
    "location_state" "text" NOT NULL,
    "location_city" "text" NOT NULL,
    "specialized_formats" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "approved_date" timestamp with time zone,
    "approved_by" "uuid",
    "created_by" "uuid",
    "creation_method" "public"."application_entry_method" DEFAULT 'self'::"public"."application_entry_method" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "average_rating" numeric(3,2),
    "total_ratings" integer DEFAULT 0 NOT NULL,
    "total_events_directed" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."event_directors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_hosting_request_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_role" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "recipient_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_hosting_request_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_hosting_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "business_name" "text",
    "user_id" "uuid",
    "event_name" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_type_other" "text",
    "event_description" "text" NOT NULL,
    "event_start_date" timestamp with time zone,
    "event_start_time" "text",
    "event_end_date" timestamp with time zone,
    "event_end_time" "text",
    "address_line_1" "text",
    "address_line_2" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'United States'::"text",
    "venue_type" "text",
    "expected_participants" integer,
    "has_hosted_before" boolean,
    "additional_services" "jsonb",
    "other_services_details" "text",
    "other_requests" "text",
    "additional_info" "text",
    "estimated_budget" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_response" "text",
    "admin_response_date" timestamp with time zone,
    "admin_responder_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_event_director_id" "uuid",
    "assigned_at" timestamp with time zone,
    "assignment_notes" "text",
    "ed_status" "text",
    "ed_response_date" timestamp with time zone,
    "ed_rejection_reason" "text",
    "final_status" "text",
    "final_status_reason" "text",
    "awaiting_requestor_response" boolean DEFAULT false,
    "created_event_id" "uuid",
    "host_type" "text",
    "venue_name" "text",
    "indoor_outdoor" "text",
    "power_available" boolean,
    "competition_formats" "jsonb",
    "is_multi_day" boolean DEFAULT false,
    "day_2_date" timestamp with time zone,
    "day_2_start_time" "text",
    "day_2_end_time" "text",
    "day_3_date" timestamp with time zone,
    "day_3_start_time" "text",
    "day_3_end_time" "text",
    "has_registration_fee" boolean,
    "estimated_entry_fee" "text",
    "pre_registration_available" boolean,
    "member_entry_fee" "text",
    "non_member_entry_fee" "text",
    "has_gate_fee" boolean,
    "gate_fee" "text"
);


ALTER TABLE "public"."event_hosting_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_judge_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "role" "public"."event_assignment_role" DEFAULT 'supporting'::"public"."event_assignment_role" NOT NULL,
    "status" "public"."event_assignment_status" DEFAULT 'requested'::"public"."event_assignment_status" NOT NULL,
    "requested_by" "uuid",
    "request_type" "public"."assignment_request_type" DEFAULT 'admin_assign'::"public"."assignment_request_type" NOT NULL,
    "request_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "response_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_judge_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registration_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_registration_id" "uuid" NOT NULL,
    "competition_class_id" "uuid" NOT NULL,
    "format" "text" NOT NULL,
    "class_name" "text" NOT NULL,
    "fee_charged" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_registration_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "full_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "vehicle_info" "text",
    "competition_class" "text",
    "registration_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "status" "public"."registration_status" DEFAULT 'pending'::"public"."registration_status" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'US'::"text",
    "vehicle_year" "text",
    "vehicle_make" "text",
    "vehicle_model" "text",
    "stripe_payment_intent_id" "text",
    "stripe_customer_id" "text",
    "membership_purchased_during_registration" boolean DEFAULT false,
    "membership_id" "uuid",
    "notes" "text",
    "check_in_code" "text",
    "qr_code_data" "text",
    "checked_in" boolean DEFAULT false,
    "checked_in_at" timestamp with time zone,
    "checked_in_by" "uuid",
    "registration_status" "text" DEFAULT 'pending'::"text",
    "amount_paid" numeric(10,2),
    "transaction_id" "text",
    "registered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meca_id" integer
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" timestamp with time zone NOT NULL,
    "registration_deadline" timestamp with time zone,
    "venue_name" "text" NOT NULL,
    "venue_address" "text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "flyer_url" "text",
    "event_director_id" "uuid",
    "status" "public"."event_status" DEFAULT 'upcoming'::"public"."event_status" NOT NULL,
    "max_participants" integer,
    "registration_fee" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "season_id" "uuid",
    "format" "text",
    "venue_city" "text",
    "venue_state" "text",
    "venue_postal_code" "text",
    "venue_country" "text",
    "points_multiplier" numeric DEFAULT 1.0,
    "event_type" "text",
    "multi_day_group_id" "uuid",
    "day_number" integer,
    "member_entry_fee" numeric(10,2),
    "non_member_entry_fee" numeric(10,2),
    "has_gate_fee" boolean DEFAULT false,
    "gate_fee" numeric(10,2),
    "flyer_image_position" "text",
    "formats" "jsonb",
    "multi_day_results_mode" "public"."multi_day_results_mode_enum",
    CONSTRAINT "events_format_check" CHECK (("format" = ANY (ARRAY['SPL'::"text", 'SQL'::"text", 'Show and Shine'::"text", 'Ride the Light'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."multi_day_results_mode" IS 'For multi-day events: separate (default) = each day calculated independently, combined_score = sum scores then calculate points, combined_points = calculate each day''s points then sum';



CREATE TABLE IF NOT EXISTS "public"."finals_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "season_id" "uuid",
    "division" character varying(50),
    "competition_class" character varying(100),
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finals_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finals_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voter_id" "uuid",
    "category" character varying(50) NOT NULL,
    "vote_value" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."finals_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "item_type" character varying(30) NOT NULL,
    "reference_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "secondary_membership_id" "uuid"
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoice_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid",
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "tax" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "discount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "due_date" "date",
    "paid_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "pdf_url" "text",
    "notes" "text",
    "billing_address" "jsonb",
    "company_info" "jsonb",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_master_invoice" boolean DEFAULT false NOT NULL,
    "master_membership_id" "uuid",
    "guest_email" character varying(255)
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_application_references" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "relationship" "text",
    "company" "text",
    "phone" "text",
    "email" "text",
    "years_known" integer,
    "reference_checked" boolean DEFAULT false NOT NULL,
    "reference_notes" "text",
    "checked_by" "uuid",
    "checked_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."judge_application_references" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."application_status" DEFAULT 'pending'::"public"."application_status" NOT NULL,
    "application_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_date" timestamp with time zone,
    "reviewed_by" "uuid",
    "entered_by" "uuid",
    "entry_method" "public"."application_entry_method" DEFAULT 'self'::"public"."application_entry_method" NOT NULL,
    "full_name" "text" NOT NULL,
    "preferred_name" "text",
    "date_of_birth" "date" NOT NULL,
    "phone" "text" NOT NULL,
    "secondary_phone" "text",
    "headshot_url" "text",
    "country" "text" NOT NULL,
    "state" "text" NOT NULL,
    "city" "text" NOT NULL,
    "zip" "text" NOT NULL,
    "travel_radius" "text" NOT NULL,
    "additional_regions" "jsonb" DEFAULT '[]'::"jsonb",
    "weekend_availability" "public"."weekend_availability" NOT NULL,
    "availability_notes" "text",
    "years_in_industry" integer NOT NULL,
    "industry_positions" "text" NOT NULL,
    "company_names" "text",
    "education_training" "text",
    "competition_history" "text",
    "judging_experience" "text",
    "specialty" "public"."judge_specialty" NOT NULL,
    "sub_specialties" "jsonb" DEFAULT '[]'::"jsonb",
    "additional_skills" "text",
    "essay_why_judge" "text" NOT NULL,
    "essay_qualifications" "text" NOT NULL,
    "essay_additional" "text",
    "ack_independent_contractor" boolean DEFAULT false NOT NULL,
    "ack_code_of_conduct" boolean DEFAULT false NOT NULL,
    "ack_background_check" boolean DEFAULT false NOT NULL,
    "ack_terms_conditions" boolean DEFAULT false NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."judge_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_level_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "previous_level" "public"."judge_level",
    "new_level" "public"."judge_level" NOT NULL,
    "changed_by" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."judge_level_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_season_qualifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "status" "public"."season_qualification_status" DEFAULT 'pending'::"public"."season_qualification_status" NOT NULL,
    "qualified_date" timestamp with time zone,
    "qualified_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."judge_season_qualifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "application_id" "uuid",
    "level" "public"."judge_level" DEFAULT 'in_training'::"public"."judge_level" NOT NULL,
    "specialty" "public"."judge_specialty" NOT NULL,
    "sub_specialties" "jsonb" DEFAULT '[]'::"jsonb",
    "headshot_url" "text",
    "bio" "text",
    "preferred_name" "text",
    "location_country" "text" NOT NULL,
    "location_state" "text" NOT NULL,
    "location_city" "text" NOT NULL,
    "travel_radius" "text",
    "additional_regions" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "approved_date" timestamp with time zone,
    "approved_by" "uuid",
    "created_by" "uuid",
    "creation_method" "public"."application_entry_method" DEFAULT 'self'::"public"."application_entry_method" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "average_rating" numeric(3,2),
    "total_ratings" integer DEFAULT 0 NOT NULL,
    "total_events_judged" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."judges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manufacturer_listings" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "business_name" "text" NOT NULL,
    "description" "text",
    "business_email" "text",
    "business_phone" character varying(50),
    "website" "text",
    "product_categories" "jsonb",
    "street_address" "text",
    "city" character varying(100),
    "state" character varying(50),
    "postal_code" character varying(20),
    "country" character varying(100) DEFAULT 'USA'::character varying,
    "profile_image_url" "text",
    "gallery_images" "jsonb",
    "cover_image_position" "jsonb",
    "is_sponsor" boolean DEFAULT false NOT NULL,
    "sponsor_order" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "start_date" "date",
    "end_date" "date"
);


ALTER TABLE "public"."manufacturer_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meca_id_counter" (
    "id" integer DEFAULT 1 NOT NULL,
    "last_meca_id" integer DEFAULT 700499 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meca_id_counter_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."meca_id_counter" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meca_id_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meca_id" integer NOT NULL,
    "membership_id" "uuid",
    "profile_id" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expired_at" timestamp with time zone,
    "reactivated_at" timestamp with time zone,
    "previous_end_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_meca_id_owner" CHECK (((("membership_id" IS NOT NULL) AND ("profile_id" IS NULL)) OR (("membership_id" IS NULL) AND ("profile_id" IS NOT NULL))))
);


ALTER TABLE "public"."meca_id_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."meca_id_seq"
    START WITH 700800
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."meca_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint DEFAULT 0 NOT NULL,
    "mime_type" "text" NOT NULL,
    "dimensions" "text",
    "is_external" boolean DEFAULT false,
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "media_files_file_type_check" CHECK (("file_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'pdf'::"text", 'document'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."media_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_gallery_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "sort_order" integer DEFAULT 0,
    "is_public" boolean DEFAULT true,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."member_gallery_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_type_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "public"."membership_category" NOT NULL,
    "tier" "public"."manufacturer_tier",
    "price" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "benefits" "jsonb",
    "required_fields" "jsonb",
    "optional_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "show_on_public_site" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "stripe_price_id" "text",
    "stripe_product_id" "text",
    "quickbooks_item_id" "text",
    "quickbooks_account_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_upgrade_only" boolean DEFAULT false,
    "team_addon_price" numeric(10,2) DEFAULT 25.00,
    "includes_team" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."membership_type_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "duration_months" integer DEFAULT 12 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "purchase_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_paid" numeric(10,2) NOT NULL,
    "payment_method" "text",
    "status" "public"."membership_status" DEFAULT 'active'::"public"."membership_status" NOT NULL,
    "email" "text",
    "membership_type_config_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text",
    "billing_first_name" "text",
    "billing_last_name" "text",
    "billing_phone" "text",
    "billing_address" "text",
    "billing_city" "text",
    "billing_state" "text",
    "billing_postal_code" "text",
    "billing_country" "text",
    "team_name" "text",
    "team_description" "text",
    "business_name" "text",
    "business_website" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "transaction_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meca_id" integer,
    "competitor_name" "text",
    "vehicle_license_plate" "text",
    "vehicle_color" "text",
    "vehicle_make" "text",
    "vehicle_model" "text",
    "has_team_addon" boolean DEFAULT false,
    "team_name_last_edited" timestamp with time zone,
    "account_type" "public"."membership_account_type" DEFAULT 'independent'::"public"."membership_account_type" NOT NULL,
    "master_membership_id" "uuid",
    "has_own_login" boolean DEFAULT false NOT NULL,
    "master_billing_profile_id" "uuid",
    "linked_at" timestamp with time zone
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "subject" "text",
    "body" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "parent_message_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mikro_orm_migrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mikro_orm_migrations_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mikro_orm_migrations" (
    "id" integer DEFAULT "nextval"('"public"."mikro_orm_migrations_id_seq"'::"regclass") NOT NULL,
    "name" character varying(255),
    "executed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."mikro_orm_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moderated_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "image_type" character varying(20) DEFAULT 'profile'::character varying NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "moderated_by" "uuid",
    "moderated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."moderated_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moderation_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "moderator_id" "uuid",
    "action" character varying(50) NOT NULL,
    "reason" character varying(100),
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."moderation_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "from_user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "link" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "item_type" character varying(30) NOT NULL,
    "reference_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "order_type" "text" NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "payment_status" "text" DEFAULT 'unpaid'::"text",
    "payment_intent_id" "text",
    "paid_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_items" "jsonb",
    "subtotal" numeric(10,2),
    "tax" numeric(10,2) DEFAULT 0.00,
    "discount" numeric(10,2) DEFAULT 0.00,
    "total" numeric(10,2),
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "billing_address" "jsonb",
    "metadata" "jsonb",
    "payment_id" "uuid",
    "invoice_id" "uuid",
    "guest_email" character varying(255),
    "guest_name" character varying(255),
    "shop_order_reference" "jsonb"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "membership_id" "uuid",
    "payment_type" "public"."payment_type" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "transaction_id" "text",
    "external_payment_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_customer_id" "text",
    "wordpress_order_id" "text",
    "wordpress_subscription_id" "text",
    "payment_metadata" "jsonb",
    "description" "text",
    "paid_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "refund_reason" "text",
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_configuration" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "standard_1st_place" integer DEFAULT 5 NOT NULL,
    "standard_2nd_place" integer DEFAULT 4 NOT NULL,
    "standard_3rd_place" integer DEFAULT 3 NOT NULL,
    "standard_4th_place" integer DEFAULT 2 NOT NULL,
    "standard_5th_place" integer DEFAULT 1 NOT NULL,
    "four_x_1st_place" integer DEFAULT 30 NOT NULL,
    "four_x_2nd_place" integer DEFAULT 27 NOT NULL,
    "four_x_3rd_place" integer DEFAULT 24 NOT NULL,
    "four_x_4th_place" integer DEFAULT 21 NOT NULL,
    "four_x_5th_place" integer DEFAULT 18 NOT NULL,
    "four_x_extended_enabled" boolean DEFAULT false NOT NULL,
    "four_x_extended_points" integer DEFAULT 15 NOT NULL,
    "four_x_extended_max_place" integer DEFAULT 50 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "points_configuration_4x_order" CHECK ((("four_x_1st_place" >= "four_x_2nd_place") AND ("four_x_2nd_place" >= "four_x_3rd_place") AND ("four_x_3rd_place" >= "four_x_4th_place") AND ("four_x_4th_place" >= "four_x_5th_place"))),
    CONSTRAINT "points_configuration_extended_range" CHECK ((("four_x_extended_max_place" >= 6) AND ("four_x_extended_max_place" <= 100))),
    CONSTRAINT "points_configuration_positive_values" CHECK ((("standard_1st_place" >= 0) AND ("standard_2nd_place" >= 0) AND ("standard_3rd_place" >= 0) AND ("standard_4th_place" >= 0) AND ("standard_5th_place" >= 0) AND ("four_x_1st_place" >= 0) AND ("four_x_2nd_place" >= 0) AND ("four_x_3rd_place" >= 0) AND ("four_x_4th_place" >= 0) AND ("four_x_5th_place" >= 0) AND ("four_x_extended_points" >= 0))),
    CONSTRAINT "points_configuration_standard_order" CHECK ((("standard_1st_place" >= "standard_2nd_place") AND ("standard_2nd_place" >= "standard_3rd_place") AND ("standard_3rd_place" >= "standard_4th_place") AND ("standard_4th_place" >= "standard_5th_place")))
);


ALTER TABLE "public"."points_configuration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL,
    "membership_status" "public"."membership_status" DEFAULT 'none'::"public"."membership_status" NOT NULL,
    "membership_expiry" timestamp with time zone,
    "avatar_url" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "meca_id" integer,
    "profile_picture_url" "text",
    "billing_street" "text",
    "billing_city" "text",
    "billing_state" "text",
    "billing_zip" "text",
    "billing_country" "text" DEFAULT 'USA'::"text",
    "shipping_street" "text",
    "shipping_city" "text",
    "shipping_state" "text",
    "shipping_zip" "text",
    "shipping_country" "text" DEFAULT 'USA'::"text",
    "use_billing_for_shipping" boolean DEFAULT true,
    "membership_expires_at" timestamp with time zone,
    "address" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text",
    "is_public" boolean DEFAULT true,
    "vehicle_info" "text",
    "car_audio_system" "text",
    "profile_images" "jsonb",
    "force_password_change" boolean DEFAULT false,
    "account_type" character varying(30) DEFAULT 'standard'::character varying,
    "cover_image_position" "text" DEFAULT 'center'::character varying,
    "is_secondary_account" boolean DEFAULT false NOT NULL,
    "master_profile_id" "uuid",
    "can_login" boolean DEFAULT true NOT NULL,
    "is_trainer" boolean DEFAULT false,
    "can_apply_judge" boolean DEFAULT false NOT NULL,
    "can_apply_event_director" boolean DEFAULT false NOT NULL,
    "judge_permission_granted_at" timestamp with time zone,
    "judge_permission_granted_by" "uuid",
    "ed_permission_granted_at" timestamp with time zone,
    "ed_permission_granted_by" "uuid",
    "judge_certification_expires" timestamp with time zone,
    "ed_certification_expires" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."phone" IS 'Phone number (E.164 format recommended: +1234567890)';



CREATE TABLE IF NOT EXISTS "public"."quickbooks_connections" (
    "id" "uuid" NOT NULL,
    "realm_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "access_token_expires_at" timestamp with time zone NOT NULL,
    "refresh_token_expires_at" timestamp with time zone NOT NULL,
    "company_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "last_sync_at" timestamp with time zone
);


ALTER TABLE "public"."quickbooks_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rater_user_id" "uuid" NOT NULL,
    "entity_type" "public"."rating_entity_type" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comment" "text",
    "is_anonymous" boolean DEFAULT true NOT NULL,
    CONSTRAINT "ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."result_file_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "uploaded_by_id" "uuid",
    "filename" "text" NOT NULL,
    "records_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "errors" "jsonb",
    "file_size" integer,
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."result_file_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."result_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "result_id" "uuid",
    "team_id" "uuid",
    "member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."result_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."results_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "result_id" "uuid",
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ip_address" "text",
    CONSTRAINT "results_audit_log_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text"])))
);


ALTER TABLE "public"."results_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."results_entry_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entry_method" "text" NOT NULL,
    "format" "text",
    "file_path" "text",
    "original_filename" "text",
    "result_count" integer DEFAULT 0 NOT NULL,
    "session_start" timestamp with time zone NOT NULL,
    "session_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "results_entry_sessions_entry_method_check" CHECK (("entry_method" = ANY (ARRAY['manual'::"text", 'excel'::"text", 'termlab'::"text"])))
);


ALTER TABLE "public"."results_entry_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."retailer_listings" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "business_name" "text" NOT NULL,
    "description" "text",
    "business_email" "text",
    "business_phone" character varying(50),
    "website" "text",
    "store_type" character varying(50) DEFAULT 'both'::character varying NOT NULL,
    "street_address" "text",
    "city" character varying(100),
    "state" character varying(50),
    "postal_code" character varying(20),
    "country" character varying(100) DEFAULT 'USA'::character varying,
    "profile_image_url" "text",
    "gallery_images" "jsonb",
    "cover_image_position" "jsonb",
    "is_sponsor" boolean DEFAULT false NOT NULL,
    "sponsor_order" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "offer_text" "text"
);


ALTER TABLE "public"."retailer_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rulebooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "year" integer NOT NULL,
    "category" "text" NOT NULL,
    "pdf_url" "text" NOT NULL,
    "summary_points" "jsonb",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "season" "text",
    "status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."rulebooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_current" boolean DEFAULT false,
    "is_next" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "unique_current" CHECK (((("is_current" = true) AND ("is_next" = false)) OR (("is_current" = false) AND ("is_next" = true)) OR (("is_current" = false) AND ("is_next" = false)))),
    CONSTRAINT "valid_dates" CHECK (("end_date" > "start_date"))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_sku" "text",
    "unit_price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "total_price" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."shop_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid",
    "guest_email" "text",
    "guest_name" "text",
    "status" "public"."shop_order_status" DEFAULT 'pending'::"public"."shop_order_status" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "shipping_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "stripe_payment_intent_id" "text",
    "stripe_charge_id" "text",
    "shipping_address" "jsonb",
    "billing_address" "jsonb",
    "notes" "text",
    "admin_notes" "text",
    "tracking_number" "text",
    "shipped_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billing_order_id" "uuid",
    "shipping_method" character varying(50)
);


ALTER TABLE "public"."shop_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "short_description" "text",
    "category" "public"."shop_product_category" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "compare_at_price" numeric(10,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "additional_images" "jsonb",
    "sku" "text",
    "stock_quantity" integer DEFAULT '-1'::integer NOT NULL,
    "track_inventory" boolean DEFAULT false NOT NULL,
    "stripe_product_id" "text",
    "stripe_price_id" "text",
    "quickbooks_item_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight_oz" numeric(8,2),
    "length_in" numeric(8,2),
    "width_in" numeric(8,2),
    "height_in" numeric(8,2)
);


ALTER TABLE "public"."shop_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "text" NOT NULL,
    "setting_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."state_finals_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "state_code" character varying(10) NOT NULL,
    "season_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."state_finals_dates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "v1_id" integer,
    "name" character varying(100) NOT NULL,
    "abbreviation" character varying(10) NOT NULL,
    "is_international" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "subscription_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "billing_cycle" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "next_billing_date" "date",
    "auto_renew" boolean DEFAULT true,
    "stripe_subscription_id" "text",
    "paypal_subscription_id" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "requested_at" timestamp with time zone,
    "request_message" "text",
    "membership_id" "uuid"
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "captain_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_type" character varying(50) DEFAULT 'competitive'::character varying,
    "location" character varying(255),
    "max_members" integer DEFAULT 50,
    "website" character varying(500),
    "is_public" boolean DEFAULT true,
    "requires_approval" boolean DEFAULT true,
    "gallery_images" "jsonb" DEFAULT '[]'::"jsonb",
    "bio" "text",
    "cover_image_position" "jsonb",
    "membership_id" "uuid"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "comment_id" "uuid",
    "uploader_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "content" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "guest_author_name" "text",
    "is_guest_comment" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(50) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_guest_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "purpose" "text" DEFAULT 'create_ticket'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_guest_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_routing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "assign_to_department_id" "uuid",
    "assign_to_staff_id" "uuid",
    "set_priority" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_routing_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" character varying(100) NOT NULL,
    "setting_value" "text" NOT NULL,
    "setting_type" character varying(20) DEFAULT 'string'::character varying NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "permission_level" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "can_be_assigned_tickets" boolean DEFAULT true NOT NULL,
    "receive_email_notifications" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_staff_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "is_department_head" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_staff_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_number" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "department" "text" DEFAULT 'general_support'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "reporter_id" "uuid",
    "assigned_to_id" "uuid",
    "event_id" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "department_id" "uuid",
    "guest_email" "text",
    "guest_name" "text",
    "access_token" "text",
    "is_guest_ticket" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trainee_type" "public"."trainee_type" NOT NULL,
    "trainee_id" "uuid" NOT NULL,
    "training_type" "public"."training_type" NOT NULL,
    "training_date" "date" NOT NULL,
    "result" "public"."training_result" NOT NULL,
    "trainer_id" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."training_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_permission_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."v1_migration_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "v1_id" integer NOT NULL,
    "v2_id" "uuid" NOT NULL,
    "migrated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."v1_migration_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."world_finals_qualifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "meca_id" integer NOT NULL,
    "competitor_name" "text" NOT NULL,
    "user_id" "uuid",
    "total_points" integer DEFAULT 0 NOT NULL,
    "qualified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notification_sent" boolean DEFAULT false NOT NULL,
    "notification_sent_at" timestamp with time zone,
    "email_sent" boolean DEFAULT false NOT NULL,
    "email_sent_at" timestamp with time zone,
    "invitation_sent" boolean DEFAULT false NOT NULL,
    "invitation_sent_at" timestamp with time zone,
    "invitation_token" "text",
    "invitation_redeemed" boolean DEFAULT false NOT NULL,
    "invitation_redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "competition_class" "text" NOT NULL
);


ALTER TABLE "public"."world_finals_qualifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."world_finals_qualifications" IS 'Tracks competitors who have qualified for World Finals based on meeting the season qualification points threshold';



ALTER TABLE ONLY "public"."achievement_definitions"
    ADD CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_recipients"
    ADD CONSTRAINT "achievement_recipients_achievement_id_profile_id_key" UNIQUE ("achievement_id", "profile_id");



ALTER TABLE ONLY "public"."achievement_recipients"
    ADD CONSTRAINT "achievement_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_templates"
    ADD CONSTRAINT "achievement_templates_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."achievement_templates"
    ADD CONSTRAINT "achievement_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisers"
    ADD CONSTRAINT "advertisers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banner_engagements"
    ADD CONSTRAINT "banner_engagements_banner_id_date_key" UNIQUE ("banner_id", "date");



ALTER TABLE ONLY "public"."banner_engagements"
    ADD CONSTRAINT "banner_engagements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_log"
    ADD CONSTRAINT "communication_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_classes"
    ADD CONSTRAINT "competition_classes_name_format_season_unique" UNIQUE ("name", "format", "season_id");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_submissions"
    ADD CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."event_director_application_references"
    ADD CONSTRAINT "event_director_application_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_director_applications"
    ADD CONSTRAINT "event_director_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_director_assignments"
    ADD CONSTRAINT "event_director_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_director_assignments"
    ADD CONSTRAINT "event_director_assignments_unique" UNIQUE ("event_id", "event_director_id");



ALTER TABLE ONLY "public"."event_director_season_qualifications"
    ADD CONSTRAINT "event_director_season_qualifica_event_director_id_season_id_key" UNIQUE ("event_director_id", "season_id");



ALTER TABLE ONLY "public"."event_director_season_qualifications"
    ADD CONSTRAINT "event_director_season_qualifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_directors"
    ADD CONSTRAINT "event_directors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_directors"
    ADD CONSTRAINT "event_directors_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."event_hosting_request_messages"
    ADD CONSTRAINT "event_hosting_request_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_hosting_requests"
    ADD CONSTRAINT "event_hosting_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_judge_assignments"
    ADD CONSTRAINT "event_judge_assignments_event_id_judge_id_key" UNIQUE ("event_id", "judge_id");



ALTER TABLE ONLY "public"."event_judge_assignments"
    ADD CONSTRAINT "event_judge_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registration_classes"
    ADD CONSTRAINT "event_registration_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finals_registrations"
    ADD CONSTRAINT "finals_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finals_votes"
    ADD CONSTRAINT "finals_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_application_references"
    ADD CONSTRAINT "judge_application_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_applications"
    ADD CONSTRAINT "judge_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_level_history"
    ADD CONSTRAINT "judge_level_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_season_qualifications"
    ADD CONSTRAINT "judge_season_qualifications_judge_id_season_id_key" UNIQUE ("judge_id", "season_id");



ALTER TABLE ONLY "public"."judge_season_qualifications"
    ADD CONSTRAINT "judge_season_qualifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."manufacturer_listings"
    ADD CONSTRAINT "manufacturer_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meca_id_counter"
    ADD CONSTRAINT "meca_id_counter_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meca_id_history"
    ADD CONSTRAINT "meca_id_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_files"
    ADD CONSTRAINT "media_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_gallery_images"
    ADD CONSTRAINT "member_gallery_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_type_configs"
    ADD CONSTRAINT "membership_type_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_types"
    ADD CONSTRAINT "membership_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."membership_types"
    ADD CONSTRAINT "membership_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_meca_id_key" UNIQUE ("meca_id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mikro_orm_migrations"
    ADD CONSTRAINT "mikro_orm_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_configuration"
    ADD CONSTRAINT "points_configuration_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_meca_id_key" UNIQUE ("meca_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_meca_id_unique" UNIQUE ("meca_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_rater_user_id_entity_type_entity_id_event_id_key" UNIQUE ("rater_user_id", "entity_type", "entity_id", "event_id");



ALTER TABLE ONLY "public"."result_file_uploads"
    ADD CONSTRAINT "result_file_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."result_teams"
    ADD CONSTRAINT "result_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."result_teams"
    ADD CONSTRAINT "result_teams_result_id_team_id_key" UNIQUE ("result_id", "team_id");



ALTER TABLE ONLY "public"."results_audit_log"
    ADD CONSTRAINT "results_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."results_entry_sessions"
    ADD CONSTRAINT "results_entry_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."retailer_listings"
    ADD CONSTRAINT "retailer_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_id_key" UNIQUE ("role", "permission_id");



ALTER TABLE ONLY "public"."rulebooks"
    ADD CONSTRAINT "rulebooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_year_key" UNIQUE ("year");



ALTER TABLE ONLY "public"."shop_order_items"
    ADD CONSTRAINT "shop_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_orders"
    ADD CONSTRAINT "shop_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."shop_orders"
    ADD CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."state_finals_dates"
    ADD CONSTRAINT "state_finals_dates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."states"
    ADD CONSTRAINT "states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."states"
    ADD CONSTRAINT "states_v1_id_key" UNIQUE ("v1_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_departments"
    ADD CONSTRAINT "ticket_departments_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."ticket_departments"
    ADD CONSTRAINT "ticket_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_departments"
    ADD CONSTRAINT "ticket_departments_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ticket_settings"
    ADD CONSTRAINT "ticket_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_staff_departments"
    ADD CONSTRAINT "ticket_staff_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_staff"
    ADD CONSTRAINT "ticket_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."training_records"
    ADD CONSTRAINT "training_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_permission_id_key" UNIQUE ("user_id", "permission_id");



ALTER TABLE ONLY "public"."v1_migration_mappings"
    ADD CONSTRAINT "v1_migration_mappings_entity_type_v1_id_key" UNIQUE ("entity_type", "v1_id");



ALTER TABLE ONLY "public"."v1_migration_mappings"
    ADD CONSTRAINT "v1_migration_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."world_finals_qualifications"
    ADD CONSTRAINT "world_finals_qualifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."world_finals_qualifications"
    ADD CONSTRAINT "world_finals_qualifications_season_meca_class_unique" UNIQUE ("season_id", "meca_id", "competition_class");



CREATE INDEX "competition_results_created_by_idx" ON "public"."competition_results" USING "btree" ("created_by");



CREATE INDEX "events_date_idx" ON "public"."events" USING "btree" ("event_date");



CREATE INDEX "events_event_director_id_idx" ON "public"."events" USING "btree" ("event_director_id");



CREATE INDEX "events_status_idx" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_achievement_definitions_competition_type" ON "public"."achievement_definitions" USING "btree" ("competition_type");



CREATE INDEX "idx_achievement_definitions_format" ON "public"."achievement_definitions" USING "btree" ("format");



CREATE INDEX "idx_achievement_definitions_is_active" ON "public"."achievement_definitions" USING "btree" ("is_active");



CREATE INDEX "idx_achievement_definitions_threshold" ON "public"."achievement_definitions" USING "btree" ("threshold_value" DESC);



CREATE INDEX "idx_achievement_recipients_achieved_at" ON "public"."achievement_recipients" USING "btree" ("achieved_at" DESC);



CREATE INDEX "idx_achievement_recipients_achievement_id" ON "public"."achievement_recipients" USING "btree" ("achievement_id");



CREATE INDEX "idx_achievement_recipients_meca_id" ON "public"."achievement_recipients" USING "btree" ("meca_id");



CREATE INDEX "idx_achievement_recipients_profile_id" ON "public"."achievement_recipients" USING "btree" ("profile_id");



CREATE INDEX "idx_advertisers_company_name" ON "public"."advertisers" USING "btree" ("company_name");



CREATE INDEX "idx_advertisers_is_active" ON "public"."advertisers" USING "btree" ("is_active");



CREATE INDEX "idx_banner_engagements_banner_date" ON "public"."banner_engagements" USING "btree" ("banner_id", "date");



CREATE INDEX "idx_banners_advertiser" ON "public"."banners" USING "btree" ("advertiser_id");



CREATE INDEX "idx_banners_position_status_dates" ON "public"."banners" USING "btree" ("position", "status", "start_date", "end_date");



CREATE INDEX "idx_banners_status" ON "public"."banners" USING "btree" ("status");



CREATE INDEX "idx_championship_archives_season" ON "public"."championship_archives" USING "btree" ("season_id");



CREATE INDEX "idx_championship_archives_year" ON "public"."championship_archives" USING "btree" ("year");



CREATE INDEX "idx_championship_awards_archive" ON "public"."championship_awards" USING "btree" ("archive_id");



CREATE INDEX "idx_championship_awards_section" ON "public"."championship_awards" USING "btree" ("section");



CREATE INDEX "idx_class_name_mappings_source_name" ON "public"."class_name_mappings" USING "btree" ("source_name");



CREATE INDEX "idx_class_name_mappings_source_system" ON "public"."class_name_mappings" USING "btree" ("source_system");



CREATE INDEX "idx_classes_active" ON "public"."competition_classes" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_classes_format" ON "public"."competition_classes" USING "btree" ("format");



CREATE INDEX "idx_classes_season" ON "public"."competition_classes" USING "btree" ("season_id");



CREATE INDEX "idx_communication_log_member" ON "public"."communication_log" USING "btree" ("member_id");



CREATE INDEX "idx_communication_log_type" ON "public"."communication_log" USING "btree" ("communication_type");



CREATE INDEX "idx_contact_submissions_created_at" ON "public"."contact_submissions" USING "btree" ("created_at");



CREATE INDEX "idx_contact_submissions_email" ON "public"."contact_submissions" USING "btree" ("email");



CREATE INDEX "idx_contact_submissions_status" ON "public"."contact_submissions" USING "btree" ("status");



CREATE INDEX "idx_ed_app_refs_application_id" ON "public"."event_director_application_references" USING "btree" ("application_id");



CREATE INDEX "idx_ed_applications_application_date" ON "public"."event_director_applications" USING "btree" ("application_date" DESC);



CREATE INDEX "idx_ed_applications_status" ON "public"."event_director_applications" USING "btree" ("status");



CREATE INDEX "idx_ed_applications_user_id" ON "public"."event_director_applications" USING "btree" ("user_id");



CREATE INDEX "idx_ed_assignments_director" ON "public"."event_director_assignments" USING "btree" ("event_director_id");



CREATE INDEX "idx_ed_assignments_event" ON "public"."event_director_assignments" USING "btree" ("event_id");



CREATE INDEX "idx_ed_assignments_status" ON "public"."event_director_assignments" USING "btree" ("status");



CREATE INDEX "idx_ed_season_quals_ed_id" ON "public"."event_director_season_qualifications" USING "btree" ("event_director_id");



CREATE INDEX "idx_ed_season_quals_season_id" ON "public"."event_director_season_qualifications" USING "btree" ("season_id");



CREATE INDEX "idx_ehr_assigned_ed" ON "public"."event_hosting_requests" USING "btree" ("assigned_event_director_id");



CREATE INDEX "idx_ehr_created_event" ON "public"."event_hosting_requests" USING "btree" ("created_event_id");



CREATE INDEX "idx_ehr_ed_status" ON "public"."event_hosting_requests" USING "btree" ("ed_status");



CREATE INDEX "idx_ehr_final_status" ON "public"."event_hosting_requests" USING "btree" ("final_status");



CREATE INDEX "idx_ehr_messages_created_at" ON "public"."event_hosting_request_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ehr_messages_request_id" ON "public"."event_hosting_request_messages" USING "btree" ("request_id");



CREATE INDEX "idx_ehr_messages_sender_id" ON "public"."event_hosting_request_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_event_directors_is_active" ON "public"."event_directors" USING "btree" ("is_active");



CREATE INDEX "idx_event_directors_location" ON "public"."event_directors" USING "btree" ("location_state", "location_city");



CREATE INDEX "idx_event_directors_user_id" ON "public"."event_directors" USING "btree" ("user_id");



CREATE INDEX "idx_event_hosting_requests_created_at" ON "public"."event_hosting_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_event_hosting_requests_email" ON "public"."event_hosting_requests" USING "btree" ("email");



CREATE INDEX "idx_event_hosting_requests_status" ON "public"."event_hosting_requests" USING "btree" ("status");



CREATE INDEX "idx_event_hosting_requests_user_id" ON "public"."event_hosting_requests" USING "btree" ("user_id");



CREATE INDEX "idx_event_judge_assignments_event_id" ON "public"."event_judge_assignments" USING "btree" ("event_id");



CREATE INDEX "idx_event_judge_assignments_judge_id" ON "public"."event_judge_assignments" USING "btree" ("judge_id");



CREATE INDEX "idx_event_judge_assignments_status" ON "public"."event_judge_assignments" USING "btree" ("status");



CREATE INDEX "idx_event_reg_check_in_code" ON "public"."event_registrations" USING "btree" ("check_in_code") WHERE ("check_in_code" IS NOT NULL);



CREATE INDEX "idx_event_reg_checked_in" ON "public"."event_registrations" USING "btree" ("event_id", "checked_in") WHERE ("checked_in" = true);



CREATE INDEX "idx_event_reg_classes_class" ON "public"."event_registration_classes" USING "btree" ("competition_class_id");



CREATE INDEX "idx_event_reg_classes_format" ON "public"."event_registration_classes" USING "btree" ("format");



CREATE INDEX "idx_event_reg_classes_registration" ON "public"."event_registration_classes" USING "btree" ("event_registration_id");



CREATE INDEX "idx_event_registrations_email" ON "public"."event_registrations" USING "btree" ("email");



CREATE INDEX "idx_event_registrations_stripe_payment_intent" ON "public"."event_registrations" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_events_format" ON "public"."events" USING "btree" ("format");



CREATE INDEX "idx_events_multi_day_group" ON "public"."events" USING "btree" ("multi_day_group_id");



CREATE INDEX "idx_events_season" ON "public"."events" USING "btree" ("season_id");



CREATE INDEX "idx_gallery_images_member" ON "public"."member_gallery_images" USING "btree" ("member_id");



CREATE INDEX "idx_invoice_items_invoice" ON "public"."invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_items_reference" ON "public"."invoice_items" USING "btree" ("reference_id");



CREATE INDEX "idx_invoice_items_secondary_membership_id" ON "public"."invoice_items" USING "btree" ("secondary_membership_id") WHERE ("secondary_membership_id" IS NOT NULL);



CREATE INDEX "idx_invoices_created_at" ON "public"."invoices" USING "btree" ("created_at");



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date");



CREATE INDEX "idx_invoices_guest_email" ON "public"."invoices" USING "btree" ("guest_email") WHERE ("guest_email" IS NOT NULL);



CREATE INDEX "idx_invoices_invoice_number" ON "public"."invoices" USING "btree" ("invoice_number");



CREATE INDEX "idx_invoices_master_membership_id" ON "public"."invoices" USING "btree" ("master_membership_id") WHERE ("master_membership_id" IS NOT NULL);



CREATE INDEX "idx_invoices_order" ON "public"."invoices" USING "btree" ("order_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_user" ON "public"."invoices" USING "btree" ("user_id");



CREATE INDEX "idx_judge_app_refs_application_id" ON "public"."judge_application_references" USING "btree" ("application_id");



CREATE INDEX "idx_judge_applications_application_date" ON "public"."judge_applications" USING "btree" ("application_date" DESC);



CREATE INDEX "idx_judge_applications_status" ON "public"."judge_applications" USING "btree" ("status");



CREATE INDEX "idx_judge_applications_user_id" ON "public"."judge_applications" USING "btree" ("user_id");



CREATE INDEX "idx_judge_level_history_judge_id" ON "public"."judge_level_history" USING "btree" ("judge_id");



CREATE INDEX "idx_judge_season_quals_judge_id" ON "public"."judge_season_qualifications" USING "btree" ("judge_id");



CREATE INDEX "idx_judge_season_quals_season_id" ON "public"."judge_season_qualifications" USING "btree" ("season_id");



CREATE INDEX "idx_judges_is_active" ON "public"."judges" USING "btree" ("is_active");



CREATE INDEX "idx_judges_level" ON "public"."judges" USING "btree" ("level");



CREATE INDEX "idx_judges_location" ON "public"."judges" USING "btree" ("location_state", "location_city");



CREATE INDEX "idx_judges_user_id" ON "public"."judges" USING "btree" ("user_id");



CREATE INDEX "idx_manufacturer_listings_is_active_approved" ON "public"."manufacturer_listings" USING "btree" ("is_active", "is_approved") WHERE (("is_active" = true) AND ("is_approved" = true));



CREATE INDEX "idx_manufacturer_listings_is_sponsor" ON "public"."manufacturer_listings" USING "btree" ("is_sponsor") WHERE ("is_sponsor" = true);



CREATE INDEX "idx_manufacturer_listings_user_id" ON "public"."manufacturer_listings" USING "btree" ("user_id");



CREATE INDEX "idx_meca_id_history_meca_id" ON "public"."meca_id_history" USING "btree" ("meca_id");



CREATE INDEX "idx_meca_id_history_membership_id" ON "public"."meca_id_history" USING "btree" ("membership_id");



CREATE INDEX "idx_meca_id_history_profile_id" ON "public"."meca_id_history" USING "btree" ("profile_id");



CREATE INDEX "idx_membership_configs_active" ON "public"."membership_type_configs" USING "btree" ("is_active");



CREATE INDEX "idx_membership_configs_category" ON "public"."membership_type_configs" USING "btree" ("category");



CREATE INDEX "idx_membership_configs_display_order" ON "public"."membership_type_configs" USING "btree" ("display_order");



CREATE INDEX "idx_membership_configs_featured" ON "public"."membership_type_configs" USING "btree" ("is_featured");



CREATE INDEX "idx_membership_configs_public" ON "public"."membership_type_configs" USING "btree" ("show_on_public_site");



CREATE INDEX "idx_membership_configs_tier" ON "public"."membership_type_configs" USING "btree" ("tier");



CREATE INDEX "idx_memberships_email" ON "public"."memberships" USING "btree" ("email");



CREATE INDEX "idx_memberships_master_billing_profile_id" ON "public"."memberships" USING "btree" ("master_billing_profile_id") WHERE ("master_billing_profile_id" IS NOT NULL);



CREATE INDEX "idx_memberships_master_membership_id" ON "public"."memberships" USING "btree" ("master_membership_id") WHERE ("master_membership_id" IS NOT NULL);



CREATE INDEX "idx_memberships_stripe_pi" ON "public"."memberships" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_memberships_type_config" ON "public"."memberships" USING "btree" ("membership_type_config_id");



CREATE INDEX "idx_messages_from" ON "public"."messages" USING "btree" ("from_user_id");



CREATE INDEX "idx_messages_read" ON "public"."messages" USING "btree" ("is_read");



CREATE INDEX "idx_messages_to" ON "public"."messages" USING "btree" ("to_user_id");



CREATE INDEX "idx_moderated_images_is_hidden" ON "public"."moderated_images" USING "btree" ("is_hidden");



CREATE INDEX "idx_moderated_images_user_id" ON "public"."moderated_images" USING "btree" ("user_id");



CREATE INDEX "idx_moderation_log_action" ON "public"."moderation_log" USING "btree" ("action");



CREATE INDEX "idx_moderation_log_created_at" ON "public"."moderation_log" USING "btree" ("created_at");



CREATE INDEX "idx_moderation_log_moderator_id" ON "public"."moderation_log" USING "btree" ("moderator_id");



CREATE INDEX "idx_moderation_log_user_id" ON "public"."moderation_log" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_from_user_id" ON "public"."notifications" USING "btree" ("from_user_id");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_reference" ON "public"."order_items" USING "btree" ("reference_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_guest_email" ON "public"."orders" USING "btree" ("guest_email") WHERE ("guest_email" IS NOT NULL);



CREATE INDEX "idx_orders_member" ON "public"."orders" USING "btree" ("member_id");



CREATE INDEX "idx_orders_order_type" ON "public"."orders" USING "btree" ("order_type");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user" ON "public"."orders" USING "btree" ("member_id");



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "idx_payments_membership" ON "public"."payments" USING "btree" ("membership_id");



CREATE INDEX "idx_payments_method" ON "public"."payments" USING "btree" ("payment_method");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("payment_status");



CREATE INDEX "idx_payments_stripe_intent" ON "public"."payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_payments_transaction_id" ON "public"."payments" USING "btree" ("transaction_id");



CREATE INDEX "idx_payments_type" ON "public"."payments" USING "btree" ("payment_type");



CREATE INDEX "idx_payments_user" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_payments_wordpress_order" ON "public"."payments" USING "btree" ("wordpress_order_id");



CREATE INDEX "idx_points_configuration_active" ON "public"."points_configuration" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_points_configuration_season" ON "public"."points_configuration" USING "btree" ("season_id");



CREATE INDEX "idx_profiles_account_type" ON "public"."profiles" USING "btree" ("account_type");



CREATE INDEX "idx_profiles_billing_city" ON "public"."profiles" USING "btree" ("billing_city");



CREATE INDEX "idx_profiles_billing_zip" ON "public"."profiles" USING "btree" ("billing_zip");



CREATE INDEX "idx_profiles_can_apply_event_director" ON "public"."profiles" USING "btree" ("can_apply_event_director") WHERE ("can_apply_event_director" = true);



CREATE INDEX "idx_profiles_can_apply_judge" ON "public"."profiles" USING "btree" ("can_apply_judge") WHERE ("can_apply_judge" = true);



CREATE INDEX "idx_profiles_force_password_change" ON "public"."profiles" USING "btree" ("force_password_change") WHERE ("force_password_change" = true);



CREATE INDEX "idx_profiles_is_trainer" ON "public"."profiles" USING "btree" ("is_trainer") WHERE ("is_trainer" = true);



CREATE INDEX "idx_profiles_meca_id" ON "public"."profiles" USING "btree" ("meca_id");



CREATE INDEX "idx_ratings_entity" ON "public"."ratings" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_ratings_event_id" ON "public"."ratings" USING "btree" ("event_id");



CREATE INDEX "idx_ratings_rater_user_id" ON "public"."ratings" USING "btree" ("rater_user_id");



CREATE INDEX "idx_retailer_listings_is_active_approved" ON "public"."retailer_listings" USING "btree" ("is_active", "is_approved") WHERE (("is_active" = true) AND ("is_approved" = true));



CREATE INDEX "idx_retailer_listings_is_sponsor" ON "public"."retailer_listings" USING "btree" ("is_sponsor") WHERE ("is_sponsor" = true);



CREATE INDEX "idx_retailer_listings_user_id" ON "public"."retailer_listings" USING "btree" ("user_id");



CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role");



CREATE INDEX "idx_rulebooks_season" ON "public"."rulebooks" USING "btree" ("season" DESC);



CREATE INDEX "idx_rulebooks_status" ON "public"."rulebooks" USING "btree" ("status");



CREATE INDEX "idx_seasons_current" ON "public"."seasons" USING "btree" ("is_current") WHERE ("is_current" = true);



CREATE INDEX "idx_seasons_dates" ON "public"."seasons" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_seasons_next" ON "public"."seasons" USING "btree" ("is_next") WHERE ("is_next" = true);



CREATE INDEX "idx_seasons_year" ON "public"."seasons" USING "btree" ("year" DESC);



CREATE INDEX "idx_shop_order_items_order" ON "public"."shop_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_shop_order_items_product" ON "public"."shop_order_items" USING "btree" ("product_id");



CREATE INDEX "idx_shop_orders_billing_order" ON "public"."shop_orders" USING "btree" ("billing_order_id") WHERE ("billing_order_id" IS NOT NULL);



CREATE INDEX "idx_shop_orders_created_at" ON "public"."shop_orders" USING "btree" ("created_at");



CREATE INDEX "idx_shop_orders_payment_intent" ON "public"."shop_orders" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_shop_orders_status" ON "public"."shop_orders" USING "btree" ("status");



CREATE INDEX "idx_shop_orders_user" ON "public"."shop_orders" USING "btree" ("user_id");



CREATE INDEX "idx_shop_products_active" ON "public"."shop_products" USING "btree" ("is_active");



CREATE INDEX "idx_shop_products_category" ON "public"."shop_products" USING "btree" ("category");



CREATE INDEX "idx_shop_products_display_order" ON "public"."shop_products" USING "btree" ("display_order");



CREATE INDEX "idx_shop_products_featured" ON "public"."shop_products" USING "btree" ("is_featured");



CREATE INDEX "idx_shop_products_sku" ON "public"."shop_products" USING "btree" ("sku");



CREATE INDEX "idx_site_settings_key" ON "public"."site_settings" USING "btree" ("setting_key");



CREATE INDEX "idx_subscriptions_member" ON "public"."subscriptions" USING "btree" ("member_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_team_members_membership_id" ON "public"."team_members" USING "btree" ("membership_id");



CREATE INDEX "idx_team_members_status" ON "public"."team_members" USING "btree" ("status");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_captain_id" ON "public"."teams" USING "btree" ("captain_id");



CREATE INDEX "idx_teams_is_active" ON "public"."teams" USING "btree" ("is_active");



CREATE INDEX "idx_teams_is_public" ON "public"."teams" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_teams_membership_id" ON "public"."teams" USING "btree" ("membership_id");



CREATE INDEX "idx_teams_season_id" ON "public"."teams" USING "btree" ("season_id");



CREATE INDEX "idx_ticket_attachments_comment_id" ON "public"."ticket_attachments" USING "btree" ("comment_id");



CREATE INDEX "idx_ticket_attachments_ticket_id" ON "public"."ticket_attachments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_attachments_uploader_id" ON "public"."ticket_attachments" USING "btree" ("uploader_id");



CREATE INDEX "idx_ticket_comments_author_id" ON "public"."ticket_comments" USING "btree" ("author_id");



CREATE INDEX "idx_ticket_comments_created_at" ON "public"."ticket_comments" USING "btree" ("created_at");



CREATE INDEX "idx_ticket_comments_ticket_id" ON "public"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_guest_tokens_email" ON "public"."ticket_guest_tokens" USING "btree" ("email");



CREATE INDEX "idx_ticket_guest_tokens_expires_at" ON "public"."ticket_guest_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_ticket_guest_tokens_token" ON "public"."ticket_guest_tokens" USING "btree" ("token");



CREATE INDEX "idx_tickets_access_token" ON "public"."tickets" USING "btree" ("access_token") WHERE ("access_token" IS NOT NULL);



CREATE INDEX "idx_tickets_assigned_to_id" ON "public"."tickets" USING "btree" ("assigned_to_id");



CREATE INDEX "idx_tickets_category" ON "public"."tickets" USING "btree" ("category");



CREATE INDEX "idx_tickets_created_at" ON "public"."tickets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tickets_department" ON "public"."tickets" USING "btree" ("department");



CREATE INDEX "idx_tickets_event_id" ON "public"."tickets" USING "btree" ("event_id");



CREATE INDEX "idx_tickets_guest_email" ON "public"."tickets" USING "btree" ("guest_email") WHERE ("guest_email" IS NOT NULL);



CREATE INDEX "idx_tickets_is_guest" ON "public"."tickets" USING "btree" ("is_guest_ticket") WHERE ("is_guest_ticket" = true);



CREATE INDEX "idx_tickets_priority" ON "public"."tickets" USING "btree" ("priority");



CREATE INDEX "idx_tickets_reporter_id" ON "public"."tickets" USING "btree" ("reporter_id");



CREATE INDEX "idx_tickets_status" ON "public"."tickets" USING "btree" ("status");



CREATE INDEX "idx_tickets_ticket_number" ON "public"."tickets" USING "btree" ("ticket_number");



CREATE INDEX "idx_training_records_date" ON "public"."training_records" USING "btree" ("training_date");



CREATE INDEX "idx_training_records_trainee" ON "public"."training_records" USING "btree" ("trainee_type", "trainee_id");



CREATE INDEX "idx_training_records_trainer" ON "public"."training_records" USING "btree" ("trainer_id");



CREATE INDEX "idx_user_permission_overrides_user" ON "public"."user_permission_overrides" USING "btree" ("user_id");



CREATE INDEX "idx_verification_tokens_related_entity" ON "public"."email_verification_tokens" USING "btree" ("related_entity_id");



CREATE INDEX "idx_verification_tokens_token" ON "public"."email_verification_tokens" USING "btree" ("token");



CREATE INDEX "idx_verification_tokens_user_id" ON "public"."email_verification_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_world_finals_qualifications_meca_id" ON "public"."world_finals_qualifications" USING "btree" ("meca_id");



CREATE INDEX "idx_world_finals_qualifications_season" ON "public"."world_finals_qualifications" USING "btree" ("season_id");



CREATE INDEX "idx_world_finals_qualifications_token" ON "public"."world_finals_qualifications" USING "btree" ("invitation_token");



CREATE INDEX "idx_world_finals_qualifications_user" ON "public"."world_finals_qualifications" USING "btree" ("user_id");



CREATE INDEX "memberships_user_id_idx" ON "public"."memberships" USING "btree" ("user_id");



CREATE INDEX "registrations_event_idx" ON "public"."event_registrations" USING "btree" ("event_id");



CREATE INDEX "registrations_user_idx" ON "public"."event_registrations" USING "btree" ("user_id");



CREATE INDEX "results_audit_log_result_id_index" ON "public"."results_audit_log" USING "btree" ("result_id");



CREATE INDEX "results_audit_log_session_id_index" ON "public"."results_audit_log" USING "btree" ("session_id");



CREATE INDEX "results_audit_log_timestamp_index" ON "public"."results_audit_log" USING "btree" ("timestamp" DESC);



CREATE INDEX "results_competitor_idx" ON "public"."competition_results" USING "btree" ("competitor_id");



CREATE INDEX "results_entry_sessions_event_id_index" ON "public"."results_entry_sessions" USING "btree" ("event_id");



CREATE INDEX "results_entry_sessions_user_id_index" ON "public"."results_entry_sessions" USING "btree" ("user_id");



CREATE INDEX "results_event_idx" ON "public"."competition_results" USING "btree" ("event_id");



CREATE INDEX "rulebooks_active_idx" ON "public"."rulebooks" USING "btree" ("is_active");



CREATE INDEX "ticket_routing_rules_active_idx" ON "public"."ticket_routing_rules" USING "btree" ("is_active");



CREATE INDEX "ticket_routing_rules_priority_idx" ON "public"."ticket_routing_rules" USING "btree" ("priority" DESC);



CREATE INDEX "ticket_staff_departments_department_id_idx" ON "public"."ticket_staff_departments" USING "btree" ("department_id");



CREATE INDEX "ticket_staff_departments_staff_id_idx" ON "public"."ticket_staff_departments" USING "btree" ("staff_id");



CREATE INDEX "ticket_staff_profile_id_idx" ON "public"."ticket_staff" USING "btree" ("profile_id");



CREATE INDEX "tickets_department_id_idx" ON "public"."tickets" USING "btree" ("department_id");



CREATE OR REPLACE TRIGGER "trg_create_points_config_for_season" AFTER INSERT ON "public"."seasons" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_points_configuration"();



CREATE OR REPLACE TRIGGER "trigger_update_event_status" BEFORE INSERT OR UPDATE OF "event_date" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_status"();



CREATE OR REPLACE TRIGGER "update_ed_assignments_updated_at" BEFORE UPDATE ON "public"."event_director_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_membership_types_updated_at" BEFORE UPDATE ON "public"."membership_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_seasons_updated_at" BEFORE UPDATE ON "public"."seasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."achievement_recipients"
    ADD CONSTRAINT "achievement_recipients_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievement_recipients"
    ADD CONSTRAINT "achievement_recipients_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."achievement_recipients"
    ADD CONSTRAINT "achievement_recipients_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievement_recipients"
    ADD CONSTRAINT "achievement_recipients_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."banner_engagements"
    ADD CONSTRAINT "banner_engagements_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "public"."banners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_log"
    ADD CONSTRAINT "communication_log_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_log"
    ADD CONSTRAINT "communication_log_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."contact_submissions"
    ADD CONSTRAINT "contact_submissions_replied_by_fkey" FOREIGN KEY ("replied_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_director_application_references"
    ADD CONSTRAINT "event_director_application_references_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."event_director_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_director_application_references"
    ADD CONSTRAINT "event_director_application_references_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_director_applications"
    ADD CONSTRAINT "event_director_applications_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_director_applications"
    ADD CONSTRAINT "event_director_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_director_applications"
    ADD CONSTRAINT "event_director_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_director_assignments"
    ADD CONSTRAINT "event_director_assignments_event_director_id_fkey" FOREIGN KEY ("event_director_id") REFERENCES "public"."event_directors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_director_assignments"
    ADD CONSTRAINT "event_director_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_director_assignments"
    ADD CONSTRAINT "event_director_assignments_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_director_season_qualifications"
    ADD CONSTRAINT "event_director_season_qualifications_event_director_id_fkey" FOREIGN KEY ("event_director_id") REFERENCES "public"."event_directors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_director_season_qualifications"
    ADD CONSTRAINT "event_director_season_qualifications_qualified_by_fkey" FOREIGN KEY ("qualified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_director_season_qualifications"
    ADD CONSTRAINT "event_director_season_qualifications_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_directors"
    ADD CONSTRAINT "event_directors_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."event_director_applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_directors"
    ADD CONSTRAINT "event_directors_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_directors"
    ADD CONSTRAINT "event_directors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_directors"
    ADD CONSTRAINT "event_directors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_judge_assignments"
    ADD CONSTRAINT "event_judge_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_judge_assignments"
    ADD CONSTRAINT "event_judge_assignments_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_judge_assignments"
    ADD CONSTRAINT "event_judge_assignments_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_event_director_id_fkey" FOREIGN KEY ("event_director_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finals_registrations"
    ADD CONSTRAINT "finals_registrations_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."finals_registrations"
    ADD CONSTRAINT "finals_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."finals_votes"
    ADD CONSTRAINT "finals_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shop_orders"
    ADD CONSTRAINT "fk_shop_orders_billing_order" FOREIGN KEY ("billing_order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_secondary_membership_id_fkey" FOREIGN KEY ("secondary_membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_master_membership_id_fkey" FOREIGN KEY ("master_membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_application_references"
    ADD CONSTRAINT "judge_application_references_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."judge_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_application_references"
    ADD CONSTRAINT "judge_application_references_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_applications"
    ADD CONSTRAINT "judge_applications_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_applications"
    ADD CONSTRAINT "judge_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_applications"
    ADD CONSTRAINT "judge_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_level_history"
    ADD CONSTRAINT "judge_level_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_level_history"
    ADD CONSTRAINT "judge_level_history_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_season_qualifications"
    ADD CONSTRAINT "judge_season_qualifications_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_season_qualifications"
    ADD CONSTRAINT "judge_season_qualifications_qualified_by_fkey" FOREIGN KEY ("qualified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_season_qualifications"
    ADD CONSTRAINT "judge_season_qualifications_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."judge_applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meca_id_history"
    ADD CONSTRAINT "meca_id_history_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meca_id_history"
    ADD CONSTRAINT "meca_id_history_membership_id_foreign" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meca_id_history"
    ADD CONSTRAINT "meca_id_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meca_id_history"
    ADD CONSTRAINT "meca_id_history_profile_id_foreign" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."member_gallery_images"
    ADD CONSTRAINT "member_gallery_images_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_master_billing_profile_id_fkey" FOREIGN KEY ("master_billing_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_master_membership_id_fkey" FOREIGN KEY ("master_membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_membership_type_config_id_fkey" FOREIGN KEY ("membership_type_config_id") REFERENCES "public"."membership_type_configs"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_configuration"
    ADD CONSTRAINT "points_configuration_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_configuration"
    ADD CONSTRAINT "points_configuration_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_ed_permission_granted_by_fkey" FOREIGN KEY ("ed_permission_granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_judge_permission_granted_by_fkey" FOREIGN KEY ("judge_permission_granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_master_profile_id_fkey" FOREIGN KEY ("master_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_rater_user_id_fkey" FOREIGN KEY ("rater_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."result_file_uploads"
    ADD CONSTRAINT "result_file_uploads_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."result_file_uploads"
    ADD CONSTRAINT "result_file_uploads_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."result_teams"
    ADD CONSTRAINT "result_teams_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."result_teams"
    ADD CONSTRAINT "result_teams_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "public"."competition_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."result_teams"
    ADD CONSTRAINT "result_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results_entry_sessions"
    ADD CONSTRAINT "results_entry_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_order_items"
    ADD CONSTRAINT "shop_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_order_items"
    ADD CONSTRAINT "shop_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shop_orders"
    ADD CONSTRAINT "shop_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."state_finals_dates"
    ADD CONSTRAINT "state_finals_dates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."state_finals_dates"
    ADD CONSTRAINT "state_finals_dates_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_membership_id_foreign" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_membership_id_foreign" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."ticket_departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."training_records"
    ADD CONSTRAINT "training_records_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."world_finals_qualifications"
    ADD CONSTRAINT "world_finals_qualifications_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."world_finals_qualifications"
    ADD CONSTRAINT "world_finals_qualifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Admin can view all orders" ON "public"."orders" FOR SELECT USING (true);



CREATE POLICY "Admins can create seasons" ON "public"."seasons" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete events" ON "public"."events" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete profiles" ON "public"."profiles" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can delete seasons" ON "public"."seasons" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can manage membership types" ON "public"."membership_types" USING ("public"."check_user_permission"("auth"."uid"(), 'manage_site_settings'::"text"));



CREATE POLICY "Admins can manage orders" ON "public"."orders" USING ("public"."check_user_permission"("auth"."uid"(), 'create_order'::"text"));



CREATE POLICY "Admins can manage permission overrides" ON "public"."user_permission_overrides" USING ("public"."check_user_permission"("auth"."uid"(), 'manage_permissions'::"text"));



CREATE POLICY "Admins can manage permissions" ON "public"."permissions" USING ("public"."check_user_permission"("auth"."uid"(), 'manage_permissions'::"text"));



CREATE POLICY "Admins can manage role permissions" ON "public"."role_permissions" USING ("public"."check_user_permission"("auth"."uid"(), 'manage_permissions'::"text"));



CREATE POLICY "Admins can manage subscriptions" ON "public"."subscriptions" USING ("public"."check_user_permission"("auth"."uid"(), 'manage_subscriptions'::"text"));



CREATE POLICY "Admins can update seasons" ON "public"."seasons" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view communication log" ON "public"."communication_log" FOR SELECT USING (("public"."check_user_permission"("auth"."uid"(), 'send_emails'::"text") OR "public"."check_user_permission"("auth"."uid"(), 'send_sms'::"text")));



CREATE POLICY "Allow admins to manage seasons" ON "public"."seasons" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow public read access to seasons" ON "public"."seasons" FOR SELECT USING (true);



CREATE POLICY "Anyone can view events" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Anyone can view membership types" ON "public"."membership_types" FOR SELECT USING (true);



CREATE POLICY "Anyone can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Anyone can view public gallery images" ON "public"."member_gallery_images" FOR SELECT USING ((("is_public" = true) OR ("member_id" = "auth"."uid"()) OR "public"."check_user_permission"("auth"."uid"(), 'view_users'::"text")));



CREATE POLICY "Anyone can view seasons" ON "public"."seasons" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create tickets" ON "public"."tickets" FOR INSERT WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("reporter_id" = "auth"."uid"())) OR (("is_guest_ticket" = true) AND ("guest_email" IS NOT NULL))));



CREATE POLICY "Authenticated users can view all teams" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Competition formats are viewable" ON "public"."competition_formats" FOR SELECT USING (true);



CREATE POLICY "Competition results are viewable" ON "public"."competition_results" FOR SELECT USING (true);



CREATE POLICY "Competition results delete" ON "public"."competition_results" FOR DELETE USING (true);



CREATE POLICY "Competition results insert" ON "public"."competition_results" FOR INSERT WITH CHECK (true);



CREATE POLICY "Competition results update" ON "public"."competition_results" FOR UPDATE USING (true);



CREATE POLICY "Event directors can create events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['event_director'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Event directors can update own events" ON "public"."events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("profiles"."role" = 'admin'::"public"."user_role") OR (("profiles"."role" = 'event_director'::"public"."user_role") AND ("events"."event_director_id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("profiles"."role" = 'admin'::"public"."user_role") OR (("profiles"."role" = 'event_director'::"public"."user_role") AND ("events"."event_director_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Event directors can update their events" ON "public"."events" FOR UPDATE USING ((("event_director_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Event hosting request messages viewable" ON "public"."event_hosting_request_messages" FOR SELECT USING (true);



CREATE POLICY "Event hosting requests viewable" ON "public"."event_hosting_requests" FOR SELECT USING (true);



CREATE POLICY "Event registrations delete" ON "public"."event_registrations" FOR DELETE USING (true);



CREATE POLICY "Event registrations insert" ON "public"."event_registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Event registrations update" ON "public"."event_registrations" FOR UPDATE USING (true);



CREATE POLICY "Event registrations viewable" ON "public"."event_registrations" FOR SELECT USING (true);



CREATE POLICY "Events are viewable by everyone" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Events delete" ON "public"."events" FOR DELETE USING (true);



CREATE POLICY "Events insert" ON "public"."events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Events update" ON "public"."events" FOR UPDATE USING (true);



CREATE POLICY "Media files are viewable" ON "public"."media_files" FOR SELECT USING (true);



CREATE POLICY "Memberships are viewable by authenticated users" ON "public"."memberships" FOR SELECT USING (true);



CREATE POLICY "Memberships delete" ON "public"."memberships" FOR DELETE USING (true);



CREATE POLICY "Memberships insert" ON "public"."memberships" FOR INSERT WITH CHECK (true);



CREATE POLICY "Memberships update all" ON "public"."memberships" FOR UPDATE USING (true);



CREATE POLICY "Moderated images viewable" ON "public"."moderated_images" FOR SELECT USING (true);



CREATE POLICY "Moderation log viewable" ON "public"."moderation_log" FOR SELECT USING (true);



CREATE POLICY "Notifications delete" ON "public"."notifications" FOR DELETE USING (true);



CREATE POLICY "Notifications update" ON "public"."notifications" FOR UPDATE USING (true);



CREATE POLICY "Notifications viewable" ON "public"."notifications" FOR SELECT USING (true);



CREATE POLICY "Only admins can delete tickets" ON "public"."tickets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Orders insert" ON "public"."orders" FOR INSERT WITH CHECK (true);



CREATE POLICY "Orders update" ON "public"."orders" FOR UPDATE USING (true);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Rulebooks are viewable" ON "public"."rulebooks" FOR SELECT USING (true);



CREATE POLICY "Seasons are viewable by everyone" ON "public"."seasons" FOR SELECT USING (true);



CREATE POLICY "Site settings are viewable" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "System can insert communication log" ON "public"."communication_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Team members are viewable" ON "public"."team_members" FOR SELECT USING (true);



CREATE POLICY "Team members delete" ON "public"."team_members" FOR DELETE USING (true);



CREATE POLICY "Team members insert" ON "public"."team_members" FOR INSERT WITH CHECK (true);



CREATE POLICY "Team members update" ON "public"."team_members" FOR UPDATE USING (true);



CREATE POLICY "Teams delete" ON "public"."teams" FOR DELETE USING (true);



CREATE POLICY "Teams insert" ON "public"."teams" FOR INSERT WITH CHECK (true);



CREATE POLICY "Teams update" ON "public"."teams" FOR UPDATE USING (true);



CREATE POLICY "Ticket attachments viewable" ON "public"."ticket_attachments" FOR SELECT USING (true);



CREATE POLICY "Ticket comments viewable" ON "public"."ticket_comments" FOR SELECT USING (true);



CREATE POLICY "Ticket departments viewable" ON "public"."ticket_departments" FOR SELECT USING (true);



CREATE POLICY "Ticket guest tokens viewable" ON "public"."ticket_guest_tokens" FOR SELECT USING (true);



CREATE POLICY "Ticket owners and staff can update tickets" ON "public"."tickets" FOR UPDATE USING ((("reporter_id" = "auth"."uid"()) OR ("assigned_to_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'event_director'::"public"."user_role"])))))));



CREATE POLICY "Ticket routing rules viewable" ON "public"."ticket_routing_rules" FOR SELECT USING (true);



CREATE POLICY "Ticket settings viewable" ON "public"."ticket_settings" FOR SELECT USING (true);



CREATE POLICY "Ticket staff departments viewable" ON "public"."ticket_staff_departments" FOR SELECT USING (true);



CREATE POLICY "Ticket staff viewable" ON "public"."ticket_staff" FOR SELECT USING (true);



CREATE POLICY "Tickets viewable" ON "public"."tickets" FOR SELECT USING (true);



CREATE POLICY "Users can create tickets" ON "public"."tickets" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage own gallery" ON "public"."member_gallery_images" USING ((("member_id" = "auth"."uid"()) OR "public"."check_user_permission"("auth"."uid"(), 'manage_media'::"text")));



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT WITH CHECK ((("from_user_id" = "auth"."uid"()) OR "public"."check_user_permission"("auth"."uid"(), 'send_system_messages'::"text")));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own received messages" ON "public"."messages" FOR UPDATE USING (("to_user_id" = "auth"."uid"())) WITH CHECK (("to_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own messages" ON "public"."messages" FOR SELECT USING ((("from_user_id" = "auth"."uid"()) OR ("to_user_id" = "auth"."uid"()) OR "public"."check_user_permission"("auth"."uid"(), 'send_system_messages'::"text")));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT USING ((("member_id" = "auth"."uid"()) OR "public"."check_user_permission"("auth"."uid"(), 'view_orders'::"text")));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT USING ((("member_id" = "auth"."uid"()) OR "public"."check_user_permission"("auth"."uid"(), 'view_users'::"text")));



CREATE POLICY "Users can view their own tickets" ON "public"."tickets" FOR SELECT USING ((("reporter_id" = "auth"."uid"()) OR ("assigned_to_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'event_director'::"public"."user_role"]))))) OR (("is_guest_ticket" = true) AND ("access_token" IS NOT NULL))));



ALTER TABLE "public"."achievement_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "achievement_definitions_admin_delete" ON "public"."achievement_definitions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_definitions_admin_insert" ON "public"."achievement_definitions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_definitions_admin_update" ON "public"."achievement_definitions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_definitions_select_all" ON "public"."achievement_definitions" FOR SELECT USING (true);



ALTER TABLE "public"."achievement_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "achievement_recipients_admin_delete" ON "public"."achievement_recipients" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_recipients_admin_insert" ON "public"."achievement_recipients" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_recipients_admin_update" ON "public"."achievement_recipients" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_recipients_select_all" ON "public"."achievement_recipients" FOR SELECT USING (true);



ALTER TABLE "public"."achievement_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "achievement_templates_admin_delete" ON "public"."achievement_templates" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_templates_admin_insert" ON "public"."achievement_templates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_templates_admin_update" ON "public"."achievement_templates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "achievement_templates_select_all" ON "public"."achievement_templates" FOR SELECT USING (true);



ALTER TABLE "public"."advertisers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "advertisers_delete_policy" ON "public"."advertisers" FOR DELETE USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "advertisers_insert_policy" ON "public"."advertisers" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "advertisers_select_policy" ON "public"."advertisers" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "advertisers_update_policy" ON "public"."advertisers" FOR UPDATE USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."banner_engagements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "banner_engagements_insert_policy" ON "public"."banner_engagements" FOR INSERT WITH CHECK (true);



CREATE POLICY "banner_engagements_select_policy" ON "public"."banner_engagements" FOR SELECT USING (true);



CREATE POLICY "banner_engagements_update_policy" ON "public"."banner_engagements" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "banners_delete_policy" ON "public"."banners" FOR DELETE USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "banners_insert_policy" ON "public"."banners" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "banners_select_policy" ON "public"."banners" FOR SELECT USING (((("status" = 'active'::"public"."banner_status") AND ("start_date" <= CURRENT_DATE) AND ("end_date" >= CURRENT_DATE)) OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "banners_update_policy" ON "public"."banners" FOR UPDATE USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."championship_archives" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "championship_archives_select" ON "public"."championship_archives" FOR SELECT USING (true);



ALTER TABLE "public"."championship_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "championship_awards_select" ON "public"."championship_awards" FOR SELECT USING (true);



ALTER TABLE "public"."class_name_mappings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_name_mappings_select" ON "public"."class_name_mappings" FOR SELECT USING (true);



ALTER TABLE "public"."communication_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competition_classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "competition_classes_select" ON "public"."competition_classes" FOR SELECT USING (true);



ALTER TABLE "public"."competition_formats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "competition_formats_insert" ON "public"."competition_formats" FOR INSERT WITH CHECK (true);



CREATE POLICY "competition_formats_update" ON "public"."competition_formats" FOR UPDATE USING (true);



ALTER TABLE "public"."competition_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_submissions_insert" ON "public"."contact_submissions" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "contact_submissions_service_delete" ON "public"."contact_submissions" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "contact_submissions_service_select" ON "public"."contact_submissions" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "contact_submissions_service_update" ON "public"."contact_submissions" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."email_verification_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_verification_tokens_select" ON "public"."email_verification_tokens" FOR SELECT USING (true);



ALTER TABLE "public"."event_director_application_references" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_director_application_references_select" ON "public"."event_director_application_references" FOR SELECT USING (true);



ALTER TABLE "public"."event_director_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_director_applications_select" ON "public"."event_director_applications" FOR SELECT USING (true);



ALTER TABLE "public"."event_director_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_director_assignments_select" ON "public"."event_director_assignments" FOR SELECT USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR ("event_director_id" IN ( SELECT "event_directors"."id"
   FROM "public"."event_directors"
  WHERE ("event_directors"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "event_director_assignments_service_delete" ON "public"."event_director_assignments" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "event_director_assignments_service_insert" ON "public"."event_director_assignments" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "event_director_assignments_service_update" ON "public"."event_director_assignments" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."event_director_season_qualifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_director_season_qualifications_select" ON "public"."event_director_season_qualifications" FOR SELECT USING (true);



ALTER TABLE "public"."event_directors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_directors_select" ON "public"."event_directors" FOR SELECT USING (true);



ALTER TABLE "public"."event_hosting_request_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_hosting_request_messages_insert" ON "public"."event_hosting_request_messages" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."event_hosting_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_hosting_requests_insert" ON "public"."event_hosting_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "event_hosting_requests_update" ON "public"."event_hosting_requests" FOR UPDATE USING (true);



ALTER TABLE "public"."event_judge_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_judge_assignments_delete" ON "public"."event_judge_assignments" FOR DELETE USING (true);



CREATE POLICY "event_judge_assignments_insert" ON "public"."event_judge_assignments" FOR INSERT WITH CHECK (true);



CREATE POLICY "event_judge_assignments_select" ON "public"."event_judge_assignments" FOR SELECT USING (true);



CREATE POLICY "event_judge_assignments_update" ON "public"."event_judge_assignments" FOR UPDATE USING (true);



ALTER TABLE "public"."event_registration_classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_registration_classes_select" ON "public"."event_registration_classes" FOR SELECT USING (true);



ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_items_select" ON "public"."invoice_items" FOR SELECT USING (true);



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_select" ON "public"."invoices" FOR SELECT USING (true);



ALTER TABLE "public"."judge_application_references" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "judge_application_references_select" ON "public"."judge_application_references" FOR SELECT USING (true);



ALTER TABLE "public"."judge_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "judge_applications_select" ON "public"."judge_applications" FOR SELECT USING (true);



ALTER TABLE "public"."judge_level_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "judge_level_history_select" ON "public"."judge_level_history" FOR SELECT USING (true);



ALTER TABLE "public"."judge_season_qualifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "judge_season_qualifications_select" ON "public"."judge_season_qualifications" FOR SELECT USING (true);



ALTER TABLE "public"."judges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "judges_select" ON "public"."judges" FOR SELECT USING (true);



ALTER TABLE "public"."manufacturer_listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manufacturer_listings_select" ON "public"."manufacturer_listings" FOR SELECT USING (true);



ALTER TABLE "public"."meca_id_counter" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meca_id_counter_select" ON "public"."meca_id_counter" FOR SELECT USING (true);



ALTER TABLE "public"."meca_id_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meca_id_history_select" ON "public"."meca_id_history" FOR SELECT USING (true);



ALTER TABLE "public"."media_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_files_delete" ON "public"."media_files" FOR DELETE USING (true);



CREATE POLICY "media_files_insert" ON "public"."media_files" FOR INSERT WITH CHECK (true);



CREATE POLICY "media_files_update" ON "public"."media_files" FOR UPDATE USING (true);



ALTER TABLE "public"."member_gallery_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_type_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membership_type_configs_insert" ON "public"."membership_type_configs" FOR INSERT WITH CHECK (true);



CREATE POLICY "membership_type_configs_select" ON "public"."membership_type_configs" FOR SELECT USING (true);



CREATE POLICY "membership_type_configs_update" ON "public"."membership_type_configs" FOR UPDATE USING (true);



ALTER TABLE "public"."membership_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mikro_orm_migrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mikro_orm_migrations_select" ON "public"."mikro_orm_migrations" FOR SELECT USING (true);



ALTER TABLE "public"."moderated_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "moderated_images_insert" ON "public"."moderated_images" FOR INSERT WITH CHECK (true);



CREATE POLICY "moderated_images_update" ON "public"."moderated_images" FOR UPDATE USING (true);



ALTER TABLE "public"."moderation_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "moderation_log_insert" ON "public"."moderation_log" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT USING (true);



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT USING (true);



ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."points_configuration" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "points_configuration_delete_policy" ON "public"."points_configuration" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "points_configuration_insert_policy" ON "public"."points_configuration" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "points_configuration_select_policy" ON "public"."points_configuration" FOR SELECT USING (true);



CREATE POLICY "points_configuration_update_policy" ON "public"."points_configuration" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quickbooks_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quickbooks_connections_select" ON "public"."quickbooks_connections" FOR SELECT USING (true);



ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ratings_select" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "ratings_update" ON "public"."ratings" FOR UPDATE USING (true);



ALTER TABLE "public"."results_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results_audit_log_select" ON "public"."results_audit_log" FOR SELECT USING (true);



ALTER TABLE "public"."results_entry_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results_entry_sessions_insert" ON "public"."results_entry_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "results_entry_sessions_select" ON "public"."results_entry_sessions" FOR SELECT USING (true);



CREATE POLICY "results_entry_sessions_update" ON "public"."results_entry_sessions" FOR UPDATE USING (true);



ALTER TABLE "public"."retailer_listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "retailer_listings_select" ON "public"."retailer_listings" FOR SELECT USING (true);



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rulebooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rulebooks_insert" ON "public"."rulebooks" FOR INSERT WITH CHECK (true);



CREATE POLICY "rulebooks_update" ON "public"."rulebooks" FOR UPDATE USING (true);



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_insert" ON "public"."seasons" FOR INSERT WITH CHECK (true);



CREATE POLICY "seasons_update" ON "public"."seasons" FOR UPDATE USING (true);



ALTER TABLE "public"."shop_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shop_order_items_insert_policy" ON "public"."shop_order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."shop_orders"
  WHERE (("shop_orders"."id" = "shop_order_items"."order_id") AND (("shop_orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("shop_orders"."user_id" IS NULL) OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"))))));



CREATE POLICY "shop_order_items_select_policy" ON "public"."shop_order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."shop_orders"
  WHERE (("shop_orders"."id" = "shop_order_items"."order_id") AND (("shop_orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"))))));



ALTER TABLE "public"."shop_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shop_orders_insert_policy" ON "public"."shop_orders" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IS NULL) OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "shop_orders_select_policy" ON "public"."shop_orders" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "shop_orders_update_policy" ON "public"."shop_orders" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."shop_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shop_products_delete_policy" ON "public"."shop_products" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "shop_products_insert_policy" ON "public"."shop_products" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "shop_products_select_policy" ON "public"."shop_products" FOR SELECT USING ((("is_active" = true) OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "shop_products_update_policy" ON "public"."shop_products" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_update" ON "public"."site_settings" FOR UPDATE USING (true);



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_attachments_insert" ON "public"."ticket_attachments" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."ticket_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_comments_insert" ON "public"."ticket_comments" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."ticket_departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_departments_insert" ON "public"."ticket_departments" FOR INSERT WITH CHECK (true);



CREATE POLICY "ticket_departments_select_policy" ON "public"."ticket_departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ticket_departments_service_policy" ON "public"."ticket_departments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "ticket_departments_update" ON "public"."ticket_departments" FOR UPDATE USING (true);



ALTER TABLE "public"."ticket_guest_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_guest_tokens_insert" ON "public"."ticket_guest_tokens" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."ticket_routing_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_routing_rules_insert" ON "public"."ticket_routing_rules" FOR INSERT WITH CHECK (true);



CREATE POLICY "ticket_routing_rules_update" ON "public"."ticket_routing_rules" FOR UPDATE USING (true);



ALTER TABLE "public"."ticket_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_settings_update" ON "public"."ticket_settings" FOR UPDATE USING (true);



ALTER TABLE "public"."ticket_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_staff_departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_staff_departments_insert" ON "public"."ticket_staff_departments" FOR INSERT WITH CHECK (true);



CREATE POLICY "ticket_staff_insert" ON "public"."ticket_staff" FOR INSERT WITH CHECK (true);



CREATE POLICY "ticket_staff_update" ON "public"."ticket_staff" FOR UPDATE USING (true);



ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_update" ON "public"."tickets" FOR UPDATE USING (true);



ALTER TABLE "public"."training_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_records_delete_policy" ON "public"."training_records" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "training_records_insert_policy" ON "public"."training_records" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "training_records_select_policy" ON "public"."training_records" FOR SELECT USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "training_records_update_policy" ON "public"."training_records" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."user_permission_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."world_finals_qualifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "world_finals_qualifications_public_select" ON "public"."world_finals_qualifications" FOR SELECT TO "anon" USING (true);



CREATE POLICY "world_finals_qualifications_select" ON "public"."world_finals_qualifications" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'event_director'::"public"."user_role"])))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON SCHEMA "public" TO PUBLIC;




























































































































































GRANT ALL ON FUNCTION "public"."batch_update_event_statuses"() TO "anon";
GRANT ALL ON FUNCTION "public"."batch_update_event_statuses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_update_event_statuses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_user_id" "uuid", "p_permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_points_configuration"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_points_configuration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_points_configuration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_meca_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_meca_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_meca_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"("p_member_meca_id" integer, "p_order_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"("p_member_meca_id" integer, "p_order_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"("p_member_meca_id" integer, "p_order_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_meca_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_meca_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_meca_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";












GRANT ALL ON TABLE "public"."achievement_definitions" TO "anon";
GRANT ALL ON TABLE "public"."achievement_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."achievement_recipients" TO "anon";
GRANT ALL ON TABLE "public"."achievement_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."achievement_templates" TO "anon";
GRANT ALL ON TABLE "public"."achievement_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_templates" TO "service_role";



GRANT ALL ON TABLE "public"."advertisers" TO "anon";
GRANT ALL ON TABLE "public"."advertisers" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisers" TO "service_role";



GRANT ALL ON TABLE "public"."banner_engagements" TO "anon";
GRANT ALL ON TABLE "public"."banner_engagements" TO "authenticated";
GRANT ALL ON TABLE "public"."banner_engagements" TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON TABLE "public"."championship_archives" TO "anon";
GRANT ALL ON TABLE "public"."championship_archives" TO "authenticated";
GRANT ALL ON TABLE "public"."championship_archives" TO "service_role";



GRANT ALL ON TABLE "public"."championship_awards" TO "anon";
GRANT ALL ON TABLE "public"."championship_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."championship_awards" TO "service_role";



GRANT ALL ON TABLE "public"."class_name_mappings" TO "anon";
GRANT ALL ON TABLE "public"."class_name_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."class_name_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."communication_log" TO "anon";
GRANT ALL ON TABLE "public"."communication_log" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_log" TO "service_role";



GRANT ALL ON TABLE "public"."competition_classes" TO "anon";
GRANT ALL ON TABLE "public"."competition_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_classes" TO "service_role";



GRANT ALL ON TABLE "public"."competition_formats" TO "anon";
GRANT ALL ON TABLE "public"."competition_formats" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_formats" TO "service_role";



GRANT ALL ON TABLE "public"."competition_results" TO "anon";
GRANT ALL ON TABLE "public"."competition_results" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_results" TO "service_role";



GRANT ALL ON TABLE "public"."contact_submissions" TO "anon";
GRANT ALL ON TABLE "public"."contact_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."email_verification_tokens" TO "anon";
GRANT ALL ON TABLE "public"."email_verification_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."email_verification_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."event_director_application_references" TO "anon";
GRANT ALL ON TABLE "public"."event_director_application_references" TO "authenticated";
GRANT ALL ON TABLE "public"."event_director_application_references" TO "service_role";



GRANT ALL ON TABLE "public"."event_director_applications" TO "anon";
GRANT ALL ON TABLE "public"."event_director_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."event_director_applications" TO "service_role";



GRANT ALL ON TABLE "public"."event_director_assignments" TO "anon";
GRANT ALL ON TABLE "public"."event_director_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_director_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."event_director_season_qualifications" TO "anon";
GRANT ALL ON TABLE "public"."event_director_season_qualifications" TO "authenticated";
GRANT ALL ON TABLE "public"."event_director_season_qualifications" TO "service_role";



GRANT ALL ON TABLE "public"."event_directors" TO "anon";
GRANT ALL ON TABLE "public"."event_directors" TO "authenticated";
GRANT ALL ON TABLE "public"."event_directors" TO "service_role";



GRANT ALL ON TABLE "public"."event_hosting_request_messages" TO "anon";
GRANT ALL ON TABLE "public"."event_hosting_request_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."event_hosting_request_messages" TO "service_role";



GRANT ALL ON TABLE "public"."event_hosting_requests" TO "anon";
GRANT ALL ON TABLE "public"."event_hosting_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."event_hosting_requests" TO "service_role";



GRANT ALL ON TABLE "public"."event_judge_assignments" TO "anon";
GRANT ALL ON TABLE "public"."event_judge_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_judge_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."event_registration_classes" TO "anon";
GRANT ALL ON TABLE "public"."event_registration_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registration_classes" TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."finals_registrations" TO "anon";
GRANT ALL ON TABLE "public"."finals_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."finals_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."finals_votes" TO "anon";
GRANT ALL ON TABLE "public"."finals_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."finals_votes" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoice_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoice_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."judge_application_references" TO "anon";
GRANT ALL ON TABLE "public"."judge_application_references" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_application_references" TO "service_role";



GRANT ALL ON TABLE "public"."judge_applications" TO "anon";
GRANT ALL ON TABLE "public"."judge_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_applications" TO "service_role";



GRANT ALL ON TABLE "public"."judge_level_history" TO "anon";
GRANT ALL ON TABLE "public"."judge_level_history" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_level_history" TO "service_role";



GRANT ALL ON TABLE "public"."judge_season_qualifications" TO "anon";
GRANT ALL ON TABLE "public"."judge_season_qualifications" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_season_qualifications" TO "service_role";



GRANT ALL ON TABLE "public"."judges" TO "anon";
GRANT ALL ON TABLE "public"."judges" TO "authenticated";
GRANT ALL ON TABLE "public"."judges" TO "service_role";



GRANT ALL ON TABLE "public"."manufacturer_listings" TO "anon";
GRANT ALL ON TABLE "public"."manufacturer_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."manufacturer_listings" TO "service_role";



GRANT ALL ON TABLE "public"."meca_id_counter" TO "anon";
GRANT ALL ON TABLE "public"."meca_id_counter" TO "authenticated";
GRANT ALL ON TABLE "public"."meca_id_counter" TO "service_role";



GRANT ALL ON TABLE "public"."meca_id_history" TO "anon";
GRANT ALL ON TABLE "public"."meca_id_history" TO "authenticated";
GRANT ALL ON TABLE "public"."meca_id_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."meca_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."meca_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."meca_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."media_files" TO "anon";
GRANT ALL ON TABLE "public"."media_files" TO "authenticated";
GRANT ALL ON TABLE "public"."media_files" TO "service_role";



GRANT ALL ON TABLE "public"."member_gallery_images" TO "anon";
GRANT ALL ON TABLE "public"."member_gallery_images" TO "authenticated";
GRANT ALL ON TABLE "public"."member_gallery_images" TO "service_role";



GRANT ALL ON TABLE "public"."membership_type_configs" TO "anon";
GRANT ALL ON TABLE "public"."membership_type_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_type_configs" TO "service_role";



GRANT ALL ON TABLE "public"."membership_types" TO "anon";
GRANT ALL ON TABLE "public"."membership_types" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_types" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mikro_orm_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mikro_orm_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mikro_orm_migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mikro_orm_migrations" TO "anon";
GRANT ALL ON TABLE "public"."mikro_orm_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."mikro_orm_migrations" TO "service_role";



GRANT ALL ON TABLE "public"."moderated_images" TO "anon";
GRANT ALL ON TABLE "public"."moderated_images" TO "authenticated";
GRANT ALL ON TABLE "public"."moderated_images" TO "service_role";



GRANT ALL ON TABLE "public"."moderation_log" TO "anon";
GRANT ALL ON TABLE "public"."moderation_log" TO "authenticated";
GRANT ALL ON TABLE "public"."moderation_log" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."points_configuration" TO "anon";
GRANT ALL ON TABLE "public"."points_configuration" TO "authenticated";
GRANT ALL ON TABLE "public"."points_configuration" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_connections" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_connections" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON TABLE "public"."result_file_uploads" TO "anon";
GRANT ALL ON TABLE "public"."result_file_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."result_file_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."result_teams" TO "anon";
GRANT ALL ON TABLE "public"."result_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."result_teams" TO "service_role";



GRANT ALL ON TABLE "public"."results_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."results_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."results_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."results_entry_sessions" TO "anon";
GRANT ALL ON TABLE "public"."results_entry_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."results_entry_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."retailer_listings" TO "anon";
GRANT ALL ON TABLE "public"."retailer_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."retailer_listings" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rulebooks" TO "anon";
GRANT ALL ON TABLE "public"."rulebooks" TO "authenticated";
GRANT ALL ON TABLE "public"."rulebooks" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."shop_order_items" TO "anon";
GRANT ALL ON TABLE "public"."shop_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."shop_orders" TO "anon";
GRANT ALL ON TABLE "public"."shop_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_orders" TO "service_role";



GRANT ALL ON TABLE "public"."shop_products" TO "anon";
GRANT ALL ON TABLE "public"."shop_products" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_products" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."state_finals_dates" TO "anon";
GRANT ALL ON TABLE "public"."state_finals_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."state_finals_dates" TO "service_role";



GRANT ALL ON TABLE "public"."states" TO "anon";
GRANT ALL ON TABLE "public"."states" TO "authenticated";
GRANT ALL ON TABLE "public"."states" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_departments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_departments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_guest_tokens" TO "anon";
GRANT ALL ON TABLE "public"."ticket_guest_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_guest_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_routing_rules" TO "anon";
GRANT ALL ON TABLE "public"."ticket_routing_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_routing_rules" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_settings" TO "anon";
GRANT ALL ON TABLE "public"."ticket_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_staff" TO "anon";
GRANT ALL ON TABLE "public"."ticket_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_staff" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_staff_departments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_staff_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_staff_departments" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."training_records" TO "anon";
GRANT ALL ON TABLE "public"."training_records" TO "authenticated";
GRANT ALL ON TABLE "public"."training_records" TO "service_role";



GRANT ALL ON TABLE "public"."user_permission_overrides" TO "anon";
GRANT ALL ON TABLE "public"."user_permission_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permission_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."v1_migration_mappings" TO "anon";
GRANT ALL ON TABLE "public"."v1_migration_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."v1_migration_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."world_finals_qualifications" TO "anon";
GRANT ALL ON TABLE "public"."world_finals_qualifications" TO "authenticated";
GRANT ALL ON TABLE "public"."world_finals_qualifications" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































