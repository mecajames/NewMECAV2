--
-- PostgreSQL database dump
--

\restrict KDJnnRj6lnBTZCk8GFZ6FpcdwWcz7AcbQAZjT3eRGJD15TzhppkJIgxXXwNhSAR

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA _realtime;


ALTER SCHEMA _realtime OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA supabase_functions;


ALTER SCHEMA supabase_functions OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: event_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_status AS ENUM (
    'upcoming',
    'ongoing',
    'completed',
    'cancelled'
);


ALTER TYPE public.event_status OWNER TO postgres;

--
-- Name: membership_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.membership_status AS ENUM (
    'none',
    'active',
    'expired'
);


ALTER TYPE public.membership_status OWNER TO postgres;

--
-- Name: membership_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.membership_type AS ENUM (
    'annual',
    'lifetime'
);


ALTER TYPE public.membership_type OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'refunded'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: registration_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.registration_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


ALTER TYPE public.registration_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'event_director',
    'retailer',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

    REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
    REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

    GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: get_leaderboard(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_leaderboard() RETURNS TABLE(competitor_id uuid, competitor_name text, total_points integer, events_participated bigint, first_place bigint, second_place bigint, third_place bigint)
    LANGUAGE plpgsql
    SET search_path TO ''
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


ALTER FUNCTION public.get_leaderboard() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.objects_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.objects_update_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_level_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.prefixes_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
  DECLARE
    request_id bigint;
    payload jsonb;
    url text := TG_ARGV[0]::text;
    method text := TG_ARGV[1]::text;
    headers jsonb DEFAULT '{}'::jsonb;
    params jsonb DEFAULT '{}'::jsonb;
    timeout_ms integer DEFAULT 1000;
  BEGIN
    IF url IS NULL OR url = 'null' THEN
      RAISE EXCEPTION 'url argument is missing';
    END IF;

    IF method IS NULL OR method = 'null' THEN
      RAISE EXCEPTION 'method argument is missing';
    END IF;

    IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
      headers = '{"Content-Type": "application/json"}'::jsonb;
    ELSE
      headers = TG_ARGV[2]::jsonb;
    END IF;

    IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
      params = '{}'::jsonb;
    ELSE
      params = TG_ARGV[3]::jsonb;
    END IF;

    IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
      timeout_ms = 1000;
    ELSE
      timeout_ms = TG_ARGV[4]::integer;
    END IF;

    CASE
      WHEN method = 'GET' THEN
        SELECT http_get INTO request_id FROM net.http_get(
          url,
          params,
          headers,
          timeout_ms
        );
      WHEN method = 'POST' THEN
        payload = jsonb_build_object(
          'old_record', OLD,
          'record', NEW,
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA
        );

        SELECT http_post INTO request_id FROM net.http_post(
          url,
          payload,
          params,
          headers,
          timeout_ms
        );
      ELSE
        RAISE EXCEPTION 'method argument % is invalid', method;
    END CASE;

    INSERT INTO supabase_functions.hooks
      (hook_table_id, hook_name, request_id)
    VALUES
      (TG_RELID, TG_NAME, request_id);

    RETURN NEW;
  END
$$;


ALTER FUNCTION supabase_functions.http_request() OWNER TO supabase_functions_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: competition_classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competition_classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    abbreviation text NOT NULL,
    format text NOT NULL,
    season_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.competition_classes OWNER TO postgres;

--
-- Name: competition_formats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competition_formats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    abbreviation text
);


ALTER TABLE public.competition_formats OWNER TO postgres;

--
-- Name: competition_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competition_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    competitor_id uuid,
    competitor_name text NOT NULL,
    competition_class text NOT NULL,
    score numeric(10,2) NOT NULL,
    placement integer NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL,
    vehicle_info text,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    meca_id text,
    season_id uuid,
    class_id uuid
);


ALTER TABLE public.competition_results OWNER TO postgres;

--
-- Name: event_hosting_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_hosting_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    business_name text,
    user_id uuid,
    event_name text NOT NULL,
    event_type text NOT NULL,
    event_type_other text,
    event_description text NOT NULL,
    event_start_date timestamp with time zone,
    event_start_time text,
    event_end_date timestamp with time zone,
    event_end_time text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'United States'::text,
    venue_type text,
    expected_participants integer,
    has_hosted_before boolean,
    additional_services jsonb,
    other_services_details text,
    other_requests text,
    additional_info text,
    estimated_budget text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_response text,
    admin_response_date timestamp with time zone,
    admin_responder_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_hosting_requests OWNER TO postgres;

--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    vehicle_info text,
    competition_class text,
    registration_date timestamp with time zone DEFAULT now() NOT NULL,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    status public.registration_status DEFAULT 'pending'::public.registration_status NOT NULL
);


ALTER TABLE public.event_registrations OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    event_date timestamp with time zone NOT NULL,
    registration_deadline timestamp with time zone,
    venue_name text NOT NULL,
    venue_address text NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    flyer_url text,
    event_director_id uuid,
    status public.event_status DEFAULT 'upcoming'::public.event_status NOT NULL,
    max_participants integer,
    registration_fee numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    venue_city text,
    venue_state text,
    venue_postal_code text,
    venue_country text DEFAULT 'US'::text,
    season_id uuid,
    points_multiplier integer DEFAULT 2,
    formats jsonb
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: COLUMN events.points_multiplier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.events.points_multiplier IS 'Points multiplier: 0=non-competitive, 1=local, 2=regional, 3=state/major, 4=championship';


--
-- Name: media_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    mime_type text NOT NULL,
    dimensions text,
    is_external boolean DEFAULT false,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT media_files_file_type_check CHECK ((file_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'document'::text, 'other'::text])))
);


ALTER TABLE public.media_files OWNER TO postgres;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    membership_type public.membership_type NOT NULL,
    purchase_date timestamp with time zone DEFAULT now() NOT NULL,
    expiry_date timestamp with time zone,
    amount_paid numeric(10,2) NOT NULL,
    payment_method text,
    status public.membership_status DEFAULT 'active'::public.membership_status NOT NULL
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: mikro_orm_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mikro_orm_migrations (
    id integer NOT NULL,
    name character varying(255),
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mikro_orm_migrations OWNER TO postgres;

--
-- Name: mikro_orm_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mikro_orm_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mikro_orm_migrations_id_seq OWNER TO postgres;

--
-- Name: mikro_orm_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mikro_orm_migrations_id_seq OWNED BY public.mikro_orm_migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    from_user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    order_number text,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    order_items jsonb,
    payment_method text,
    payment_status text DEFAULT 'unpaid'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    membership_status public.membership_status DEFAULT 'none'::public.membership_status NOT NULL,
    membership_expiry timestamp with time zone,
    avatar_url text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    billing_street text,
    billing_city text,
    billing_state text,
    billing_zip text,
    billing_country text DEFAULT 'USA'::text,
    shipping_street text,
    shipping_city text,
    shipping_state text,
    shipping_zip text,
    shipping_country text DEFAULT 'USA'::text,
    use_billing_for_shipping boolean DEFAULT false,
    first_name text,
    last_name text,
    meca_id text,
    profile_picture_url text,
    membership_expires_at timestamp with time zone,
    address text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'US'::text
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: rulebooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rulebooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    year integer NOT NULL,
    category text NOT NULL,
    pdf_url text NOT NULL,
    summary_points jsonb,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    season text,
    status text DEFAULT 'active'::text
);


ALTER TABLE public.rulebooks OWNER TO postgres;

--
-- Name: seasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year integer NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    is_next boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seasons OWNER TO postgres;

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    setting_type text DEFAULT 'text'::text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


ALTER TABLE public.site_settings OWNER TO postgres;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    member_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    team_leader_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: iceberg_namespaces; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.iceberg_namespaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.iceberg_namespaces OWNER TO supabase_storage_admin;

--
-- Name: iceberg_tables; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.iceberg_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    namespace_id uuid NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    location text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.iceberg_tables OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


ALTER TABLE supabase_functions.hooks OWNER TO supabase_functions_admin;

--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: supabase_functions_admin
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE supabase_functions.hooks_id_seq OWNER TO supabase_functions_admin;

--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE supabase_functions.migrations OWNER TO supabase_functions_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mikro_orm_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mikro_orm_migrations ALTER COLUMN id SET DEFAULT nextval('public.mikro_orm_migrations_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
00000000-0000-0000-0000-000000000000	8897bd0a-50e1-4eb6-9a67-3684d3255d33	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"james@mecacaraudio.com","user_id":"3ae12d0d-e446-470b-9683-0546a85bed93","user_phone":""}}	2025-10-23 13:20:47.193908+00	
00000000-0000-0000-0000-000000000000	546f572a-afac-4daf-9ef4-ff36fba0a068	{"action":"login","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 13:21:04.957305+00	
00000000-0000-0000-0000-000000000000	60188770-9af0-4668-9aa1-4fd253a4dfe6	{"action":"login","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 13:32:56.549962+00	
00000000-0000-0000-0000-000000000000	3d7dfb57-7e4f-4a26-b21f-3c3db30e05e6	{"action":"user_updated_password","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"user"}	2025-10-23 13:32:56.638947+00	
00000000-0000-0000-0000-000000000000	4dd20685-fc3f-4fcd-b372-e5331abdf1a2	{"action":"user_modified","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"user"}	2025-10-23 13:32:56.639634+00	
00000000-0000-0000-0000-000000000000	e8315034-de5a-4f2c-b4be-35a94389cdbf	{"action":"logout","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"account"}	2025-10-23 13:33:03.884578+00	
00000000-0000-0000-0000-000000000000	ee3de1a6-f198-400d-866d-985fd4e8dfbc	{"action":"login","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 13:33:18.295499+00	
00000000-0000-0000-0000-000000000000	ceb29773-ab1d-4cd2-9824-8976138526f7	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 14:31:24.838349+00	
00000000-0000-0000-0000-000000000000	40233ab0-6e78-4572-9303-3de187b0c18e	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 14:31:24.838717+00	
00000000-0000-0000-0000-000000000000	73e7edc5-b5d4-47a7-8aa1-5720546e50c8	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 15:29:51.063597+00	
00000000-0000-0000-0000-000000000000	2cb339e6-b03a-4289-9eb0-7d6adb58f36d	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 15:29:51.063973+00	
00000000-0000-0000-0000-000000000000	9ef2f63f-5087-4da3-b8cc-48a28bbbf76b	{"action":"login","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-11-06 02:53:51.289079+00	
00000000-0000-0000-0000-000000000000	c26e32eb-dbba-4538-ab6c-f4b2712fad78	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 14:14:44.959727+00	
00000000-0000-0000-0000-000000000000	40c7e073-bdc4-4296-b488-9408360d6be7	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 14:14:44.960181+00	
00000000-0000-0000-0000-000000000000	67dcade3-30dd-4452-867e-0c9d21ce86ff	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 15:12:46.53496+00	
00000000-0000-0000-0000-000000000000	f086222a-209e-4bb2-8abe-26439fd5fec8	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 15:12:46.535466+00	
00000000-0000-0000-0000-000000000000	b2e4fd12-5ead-4642-90c5-34c8855a5213	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 16:10:46.583245+00	
00000000-0000-0000-0000-000000000000	dcf98744-c65c-41fd-bb4d-7c580ee24047	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 16:10:46.583639+00	
00000000-0000-0000-0000-000000000000	c3240107-2f14-49a5-8414-084fffec65d3	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 21:41:29.435298+00	
00000000-0000-0000-0000-000000000000	23eaa86a-70f8-401d-bd36-83f977a9192d	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 21:41:29.436515+00	
00000000-0000-0000-0000-000000000000	cd0859cc-8471-495d-9184-e661bd254d75	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 22:39:57.050403+00	
00000000-0000-0000-0000-000000000000	8e4bb874-3b9c-45ce-b7a8-673ea00c5721	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 22:39:57.050902+00	
00000000-0000-0000-0000-000000000000	16917329-2f04-47fd-a63b-554ef1f02900	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 23:38:24.36735+00	
00000000-0000-0000-0000-000000000000	f46ebe45-973e-45e1-8a0a-14af115fd66b	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-06 23:38:24.367779+00	
00000000-0000-0000-0000-000000000000	d403233b-4c16-4fe2-b981-6000c92c383a	{"action":"login","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-11-07 00:13:48.924835+00	
00000000-0000-0000-0000-000000000000	26a8e32e-1cff-4cfe-a84a-6c230d0aab3f	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 01:11:53.794037+00	
00000000-0000-0000-0000-000000000000	d008ed39-de93-4909-848e-3d1abc19069e	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 01:11:53.795105+00	
00000000-0000-0000-0000-000000000000	32f72f96-ff02-4a60-b76d-edcaf194fbb3	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 14:03:08.492414+00	
00000000-0000-0000-0000-000000000000	92528440-e2bc-4d0f-a88a-ae88d79f12e9	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 14:03:08.493956+00	
00000000-0000-0000-0000-000000000000	5328b5f0-c8ae-4f74-b06e-8f801c098ad9	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 15:01:11.91155+00	
00000000-0000-0000-0000-000000000000	4d8cefe2-e4d8-4b43-bd9e-0b6d79e3bd23	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 15:01:11.912576+00	
00000000-0000-0000-0000-000000000000	ef7f5474-6b89-4240-9290-17672ad9466a	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 15:59:11.948313+00	
00000000-0000-0000-0000-000000000000	bf30a125-1729-4207-b89f-12dc005b2164	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 15:59:11.948819+00	
00000000-0000-0000-0000-000000000000	1cba3ba1-45a4-4876-b799-3adb101a74f7	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 16:57:33.290835+00	
00000000-0000-0000-0000-000000000000	5489c47d-b605-4f2d-9b17-15c1e82ad055	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 16:57:33.291862+00	
00000000-0000-0000-0000-000000000000	8087d16b-ecbf-476c-99f2-cf8a81fed54e	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 18:46:08.299312+00	
00000000-0000-0000-0000-000000000000	b4b417a2-775b-4126-879d-a860039fa2f1	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 18:46:08.301199+00	
00000000-0000-0000-0000-000000000000	877b7c11-4a84-4303-a16f-74475d32f969	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 19:44:18.218549+00	
00000000-0000-0000-0000-000000000000	503442f0-17c4-437a-83ef-9629046369d7	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 19:44:18.21999+00	
00000000-0000-0000-0000-000000000000	e73017d8-5952-4715-90e6-99c583b1b74f	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 20:42:18.252058+00	
00000000-0000-0000-0000-000000000000	59248c29-8365-46ec-9504-97283748b5f2	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 20:42:18.253291+00	
00000000-0000-0000-0000-000000000000	3d4567e4-70dd-4a40-bcf8-8d4a69556ded	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 21:40:18.311437+00	
00000000-0000-0000-0000-000000000000	a72ad4a4-24a6-4ce0-bec0-ba865fdd13fd	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 21:40:18.311954+00	
00000000-0000-0000-0000-000000000000	a84c4f25-9daf-4031-b812-12d77511c52c	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 23:44:04.860628+00	
00000000-0000-0000-0000-000000000000	b6d203e6-6224-4407-895d-2360b05921ad	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-07 23:44:04.861297+00	
00000000-0000-0000-0000-000000000000	9f247b3e-6fab-423a-8aa0-a07a41a13c5f	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 02:25:21.683698+00	
00000000-0000-0000-0000-000000000000	ba5e34ae-c482-4a42-a416-34ba05d2a6e0	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 02:25:21.684834+00	
00000000-0000-0000-0000-000000000000	23b54e14-772f-4a75-a27b-af6385242cc0	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 03:23:36.032868+00	
00000000-0000-0000-0000-000000000000	ce02dbc8-2329-48ec-af32-a870793581a3	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 03:23:36.033518+00	
00000000-0000-0000-0000-000000000000	403efb4c-a5e8-476b-9b03-8097b34c558b	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 04:21:36.081166+00	
00000000-0000-0000-0000-000000000000	cdbefca2-9efd-43ad-a695-2275fbf90225	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 04:21:36.081598+00	
00000000-0000-0000-0000-000000000000	1f80d687-0b77-4c2e-b9fd-24aa8d9aa5d3	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 05:19:36.122724+00	
00000000-0000-0000-0000-000000000000	3feca806-7710-458f-b3f5-bee95deea738	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 05:19:36.123089+00	
00000000-0000-0000-0000-000000000000	c5bfc025-9fba-407f-a320-411d8df21206	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 06:17:36.160913+00	
00000000-0000-0000-0000-000000000000	ef4bc1df-3a7e-46e2-95c7-706320733e8b	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 06:17:36.161294+00	
00000000-0000-0000-0000-000000000000	3c6868ac-9c10-460d-b47b-01b6a945e940	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 11:19:28.680904+00	
00000000-0000-0000-0000-000000000000	a83341e6-1dc6-4879-8b50-7be9c2acc3db	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 11:19:28.681563+00	
00000000-0000-0000-0000-000000000000	97814212-cc61-473e-8354-bbff0ccca97b	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 12:17:28.669123+00	
00000000-0000-0000-0000-000000000000	a6029891-0d11-49f0-9c24-a05ed821b354	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 12:17:28.669544+00	
00000000-0000-0000-0000-000000000000	ceaea234-2ce5-45a0-8c22-c0581e9f0fd0	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 13:15:28.710636+00	
00000000-0000-0000-0000-000000000000	8f65b3f8-3315-4bfc-ac90-406abe66e419	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 13:15:28.711185+00	
00000000-0000-0000-0000-000000000000	961cb479-5bbf-4e26-bae0-3eb5f9944e58	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 16:23:04.022991+00	
00000000-0000-0000-0000-000000000000	8c6b54a1-c5e7-4cf5-a95b-1d63110662af	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 16:23:04.023711+00	
00000000-0000-0000-0000-000000000000	83f3030a-27d7-469b-ab02-a66a5febfeaa	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 17:21:30.542948+00	
00000000-0000-0000-0000-000000000000	9484743e-a424-462e-9fdd-10ab9af622a7	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 17:21:30.544867+00	
00000000-0000-0000-0000-000000000000	62bbaa9d-0c49-4e79-bfb7-d45b0d8a6995	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 18:19:39.887663+00	
00000000-0000-0000-0000-000000000000	e7700041-4bf0-4ed1-8fce-24380162f119	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 18:19:39.888944+00	
00000000-0000-0000-0000-000000000000	39c08fd4-e737-4083-a91a-2a57b95fe5b4	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 19:17:39.919327+00	
00000000-0000-0000-0000-000000000000	9514ec06-cdec-460e-964d-d1244121c819	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 19:17:39.92065+00	
00000000-0000-0000-0000-000000000000	1c8c903a-da0e-427f-b2bb-b14da8749c00	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 20:16:05.06419+00	
00000000-0000-0000-0000-000000000000	b1342509-f2a1-4c0f-b5cf-1b5f15ac3885	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 20:16:05.065205+00	
00000000-0000-0000-0000-000000000000	fdfec0a9-1a1d-4c63-a4d9-7fd6f1b27fbb	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 21:14:16.417112+00	
00000000-0000-0000-0000-000000000000	337e206d-578d-4e77-b987-28b69b22c2a4	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 21:14:16.417809+00	
00000000-0000-0000-0000-000000000000	af316a19-8b20-4bbd-b11c-548b5850a942	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 23:57:56.464238+00	
00000000-0000-0000-0000-000000000000	ba943c8c-cced-4f7d-b352-c2f1cc4306b8	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-08 23:57:56.465008+00	
00000000-0000-0000-0000-000000000000	06972224-dabc-4bc5-bece-e4989ae31a3c	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 00:56:43.912364+00	
00000000-0000-0000-0000-000000000000	250e972d-be46-4f94-8939-61dc66a75c53	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 00:56:43.913003+00	
00000000-0000-0000-0000-000000000000	0031196a-5ce4-419e-bc5e-bc87d1b4d3bd	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 01:55:11.214923+00	
00000000-0000-0000-0000-000000000000	1697b37e-ba7c-48cc-8c18-ccee1cf8b1ef	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 01:55:11.215958+00	
00000000-0000-0000-0000-000000000000	126c355d-1ea4-47df-82b4-35d5d79042b4	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 02:53:37.877879+00	
00000000-0000-0000-0000-000000000000	4cb165af-2261-46e8-8b9f-8d7551bcad4e	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 02:53:37.879011+00	
00000000-0000-0000-0000-000000000000	b585a274-821b-4980-bd37-45b49d6fee65	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 03:51:51.235205+00	
00000000-0000-0000-0000-000000000000	c537cbed-5e92-4329-ae20-5f3060d35ae8	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 03:51:51.235649+00	
00000000-0000-0000-0000-000000000000	88dac335-6291-43c2-b273-cfc6667d9549	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 04:49:51.282175+00	
00000000-0000-0000-0000-000000000000	41ff2c2e-9f7c-4e50-80cb-dd6862c0e42e	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 04:49:51.282683+00	
00000000-0000-0000-0000-000000000000	39173d3f-a8cd-409f-a5e1-36bc75fec9b9	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 16:12:39.771852+00	
00000000-0000-0000-0000-000000000000	9f34a989-c7fd-4457-948f-3a077b4da97d	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 16:12:39.772483+00	
00000000-0000-0000-0000-000000000000	1127f969-e25a-47c8-b744-5861c0755bc2	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 17:10:40.70084+00	
00000000-0000-0000-0000-000000000000	f5d5ad1a-9fb9-41c2-a143-0fdcf5407596	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 17:10:40.701245+00	
00000000-0000-0000-0000-000000000000	ce68104e-c591-4a57-a1ba-e0fbc5f6d3a5	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 18:08:40.744903+00	
00000000-0000-0000-0000-000000000000	bb281756-584a-4091-af14-db5ecaedb794	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 18:08:40.74542+00	
00000000-0000-0000-0000-000000000000	fa14f2e1-d05d-4848-b84a-42c66f6e120a	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 19:06:40.795833+00	
00000000-0000-0000-0000-000000000000	db254197-9575-4a50-8853-cc57e00162b8	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 19:06:40.796297+00	
00000000-0000-0000-0000-000000000000	ee66f4e6-6fcf-48ef-a9f7-b1813ac5c940	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 20:04:40.882931+00	
00000000-0000-0000-0000-000000000000	08ecfc98-686f-4e1b-b929-42b8531ea046	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 20:04:40.883289+00	
00000000-0000-0000-0000-000000000000	fd6395a3-192a-4995-8589-1c79b9a27724	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 21:02:40.942722+00	
00000000-0000-0000-0000-000000000000	025e9775-f982-4dfb-b8c1-60bcf883eb63	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 21:02:40.943062+00	
00000000-0000-0000-0000-000000000000	515ce745-cb69-4fcf-9df9-523c005b44c6	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 22:00:40.984127+00	
00000000-0000-0000-0000-000000000000	593f3641-ed35-436b-8309-2d5ed2dad8b1	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 22:00:40.984635+00	
00000000-0000-0000-0000-000000000000	161053e7-4b80-432a-a633-dfb19c7c4f11	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 22:58:41.849356+00	
00000000-0000-0000-0000-000000000000	dd0b4d39-1b0b-4dea-b3c4-a6cb923a18d3	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 22:58:41.849758+00	
00000000-0000-0000-0000-000000000000	206e3a3a-7a0e-4145-bc14-81891a45afe2	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 23:56:41.907631+00	
00000000-0000-0000-0000-000000000000	1c9c0a21-8280-4771-a36a-6e3317703a25	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-09 23:56:41.908007+00	
00000000-0000-0000-0000-000000000000	110e459b-4529-46c4-8085-d0cdd90b2669	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 13:44:51.152896+00	
00000000-0000-0000-0000-000000000000	d7a93643-73dc-4506-8311-85f1d581b664	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 13:44:51.153437+00	
00000000-0000-0000-0000-000000000000	9ce90210-4dac-4b55-95d7-7559d3bb32ef	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 14:43:05.635046+00	
00000000-0000-0000-0000-000000000000	7f754704-ea85-4882-a3ec-652b9e363aca	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 14:43:05.635612+00	
00000000-0000-0000-0000-000000000000	1630bc93-738c-4c2d-b4b8-e594547bdc3b	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 15:41:05.688016+00	
00000000-0000-0000-0000-000000000000	88ba0ca8-b176-4fe1-8076-55c7f7985ace	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 15:41:05.688439+00	
00000000-0000-0000-0000-000000000000	ce884e11-b1b9-4ba1-89f1-be79b8883e65	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 16:39:05.747318+00	
00000000-0000-0000-0000-000000000000	c7eba513-8bc5-4e6a-af87-5c8e47de097c	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 16:39:05.747747+00	
00000000-0000-0000-0000-000000000000	786601af-a870-45d8-9cdc-3700e1e71bcb	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 17:37:05.798052+00	
00000000-0000-0000-0000-000000000000	36d00d5b-5dd5-48de-a2df-6d431e1a4a42	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 17:37:05.798432+00	
00000000-0000-0000-0000-000000000000	71ac63c4-ec29-4455-aa77-e28f52f39c37	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 18:35:05.852124+00	
00000000-0000-0000-0000-000000000000	e89e330c-fc33-4577-8b2e-c2b0b08a6287	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 18:35:05.852594+00	
00000000-0000-0000-0000-000000000000	22ba8b40-7c03-41ad-b2f6-e9df2733ed42	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 19:33:21.831107+00	
00000000-0000-0000-0000-000000000000	3506104d-768c-48d1-b4f4-8d1d68baad0c	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 19:33:21.831727+00	
00000000-0000-0000-0000-000000000000	535c46c7-55ea-4bd6-9df5-24256a513b60	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 20:31:21.875+00	
00000000-0000-0000-0000-000000000000	b5139e96-86bf-4a18-9ca4-4e39bf517c19	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 20:31:21.875403+00	
00000000-0000-0000-0000-000000000000	cd245f4e-183d-4da3-bd3e-97f74a1b064c	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 21:29:28.02134+00	
00000000-0000-0000-0000-000000000000	d7e36888-44f0-493f-a457-ec18c13e21b6	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 21:29:28.021781+00	
00000000-0000-0000-0000-000000000000	4de13303-8aa4-4039-8365-8942cc38d66a	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 22:27:28.079901+00	
00000000-0000-0000-0000-000000000000	02131e42-c1c8-41d8-9330-189c59a5c73e	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 22:27:28.080192+00	
00000000-0000-0000-0000-000000000000	6a40af24-e357-4d62-a664-959ff87c93b3	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 23:25:28.142691+00	
00000000-0000-0000-0000-000000000000	72c1411a-9d3f-4538-8783-1fa9828d0715	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-10 23:25:28.143123+00	
00000000-0000-0000-0000-000000000000	903c93ab-a968-4871-9f30-6c15bd8e60e6	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 00:23:28.209979+00	
00000000-0000-0000-0000-000000000000	e37156e2-ba9a-4a5c-84b2-f454c611de41	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 00:23:28.210456+00	
00000000-0000-0000-0000-000000000000	f73e3f50-8378-4bdb-8100-10029436e47e	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 01:21:28.262973+00	
00000000-0000-0000-0000-000000000000	0be61979-bf4a-44c7-8bdb-8d8a3b19a980	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 01:21:28.263415+00	
00000000-0000-0000-0000-000000000000	8b1307da-3bbc-48c2-9d15-9a710d41b9d6	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 17:40:30.243358+00	
00000000-0000-0000-0000-000000000000	530d1871-952c-4974-bf8e-1be9f3a7304b	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 17:40:30.245457+00	
00000000-0000-0000-0000-000000000000	0fae5500-aa8c-4a6f-90ce-86235c745eb5	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 18:38:30.306187+00	
00000000-0000-0000-0000-000000000000	ec01e223-84b5-4b4c-ba37-0004169cb9ba	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 18:38:30.306599+00	
00000000-0000-0000-0000-000000000000	b50b4983-fe54-41b8-b681-9a518ffeb519	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 19:37:53.759649+00	
00000000-0000-0000-0000-000000000000	a88e96eb-9920-4fb5-ad61-95fc8fb94c1a	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 19:37:53.760134+00	
00000000-0000-0000-0000-000000000000	7015e674-19cf-4124-81bc-cc78bbcb395c	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 20:36:11.141495+00	
00000000-0000-0000-0000-000000000000	cfe18955-acaa-4b3a-b659-351e6a837468	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 20:36:11.141925+00	
00000000-0000-0000-0000-000000000000	c5285709-f2c0-4f70-b673-7b9f22c04c2d	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 21:34:13.817221+00	
00000000-0000-0000-0000-000000000000	023bc153-9fa5-42aa-9bac-9f31758d6683	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-11 21:34:13.81783+00	
00000000-0000-0000-0000-000000000000	1d1a0784-dc18-4d49-8035-d0f6b97b8c83	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 00:55:05.208584+00	
00000000-0000-0000-0000-000000000000	91993390-9ab3-497a-abbe-3b3ce815f36b	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 00:55:05.209284+00	
00000000-0000-0000-0000-000000000000	484232ef-0e4c-4ac7-9ce7-f5d091c9c37d	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 13:35:39.422502+00	
00000000-0000-0000-0000-000000000000	22ace3a4-edca-4201-8354-6ad64d2c9c80	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 13:35:39.424138+00	
00000000-0000-0000-0000-000000000000	d20b9938-d68e-4a5e-a601-25d6e737cf6e	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 14:33:42.553203+00	
00000000-0000-0000-0000-000000000000	ffd6d516-d0b7-4162-b6ee-13e2b1eca446	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 14:33:42.55377+00	
00000000-0000-0000-0000-000000000000	d069ddd2-5244-4276-8570-346994f3cff5	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 18:03:42.207841+00	
00000000-0000-0000-0000-000000000000	db87f7c8-4c88-4a87-84d1-2c5373b5dbe9	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 18:03:42.209567+00	
00000000-0000-0000-0000-000000000000	558ce0d9-bb78-42f7-a18e-96b2d0df39cd	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 19:01:42.243895+00	
00000000-0000-0000-0000-000000000000	db43014d-6f09-4623-818c-96605234c7ee	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 19:01:42.244639+00	
00000000-0000-0000-0000-000000000000	cc8f9a36-b2bf-46aa-8278-c59b01078f08	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 19:59:54.962983+00	
00000000-0000-0000-0000-000000000000	860d16de-292f-48cf-8644-f728b934fac0	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 19:59:54.963926+00	
00000000-0000-0000-0000-000000000000	a87ea432-8cc6-4a31-aaed-728661dfec59	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 20:57:54.980999+00	
00000000-0000-0000-0000-000000000000	915a8ccb-9935-4502-b812-90d5cfb0b152	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 20:57:54.981677+00	
00000000-0000-0000-0000-000000000000	12fcd3b0-b162-43f3-8d28-8f25c0104e8e	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 21:55:55.034742+00	
00000000-0000-0000-0000-000000000000	164adadc-6c30-43cf-9f58-1facde480b01	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-12 21:55:55.03513+00	
00000000-0000-0000-0000-000000000000	a92db90e-0e74-4f5a-8785-e446a72adc64	{"action":"token_refreshed","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-13 01:32:12.669203+00	
00000000-0000-0000-0000-000000000000	93e8f94e-7770-4299-8413-54d507c10c4d	{"action":"token_revoked","actor_id":"3ae12d0d-e446-470b-9683-0546a85bed93","actor_name":"James Ryan","actor_username":"james@mecacaraudio.com","actor_via_sso":false,"log_type":"token"}	2025-11-13 01:32:12.66986+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
daef299b-9486-440b-9cb1-48306240e7bb	2025-11-06 02:53:51.293987+00	2025-11-06 02:53:51.293987+00	password	b7f45035-c24e-4ea4-992c-fdd1f0766713
a818a964-d0b1-4b24-8530-282705f9c4d6	2025-11-07 00:13:48.928972+00	2025-11-07 00:13:48.928972+00	password	1a6bc61b-0435-48a0-a47c-d355d2f45e75
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	61	xeeqfgna7eyc	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 16:57:33.292976+00	2025-11-07 18:46:08.301628+00	rd6o4uqpse4a	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	62	4fnl4fpzzy5d	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 18:46:08.302862+00	2025-11-07 19:44:18.220335+00	xeeqfgna7eyc	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	6	wylraisag7l3	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-06 02:53:51.292213+00	2025-11-06 14:14:44.960408+00	\N	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	7	cxuh2qan2he3	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-06 14:14:44.960914+00	2025-11-06 15:12:46.535761+00	wylraisag7l3	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	63	olgqfnejvemx	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 19:44:18.221252+00	2025-11-07 20:42:18.253571+00	4fnl4fpzzy5d	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	8	sxo6d6uzqjyz	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-06 15:12:46.535941+00	2025-11-06 16:10:46.583965+00	cxuh2qan2he3	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	9	bi3wdtm66sxh	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-06 16:10:46.584142+00	2025-11-06 21:41:29.436944+00	sxo6d6uzqjyz	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	64	blvm4gspaoeu	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 20:42:18.254091+00	2025-11-07 21:40:18.312192+00	olgqfnejvemx	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	65	2r6ed7bdydrv	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 21:40:18.312402+00	2025-11-07 23:44:04.861535+00	blvm4gspaoeu	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	66	innwpjygziq6	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 23:44:04.862077+00	2025-11-08 02:25:21.685435+00	2r6ed7bdydrv	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	67	uu5mdvqa36zr	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 02:25:21.685904+00	2025-11-08 03:23:36.033782+00	innwpjygziq6	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	68	jssekxjmsbre	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 03:23:36.033998+00	2025-11-08 04:21:36.08189+00	uu5mdvqa36zr	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	69	nq3e2nmch6uy	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 04:21:36.082075+00	2025-11-08 05:19:36.123373+00	jssekxjmsbre	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	70	6oysoaawz7qh	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 05:19:36.123558+00	2025-11-08 06:17:36.161573+00	nq3e2nmch6uy	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	71	biwapzfrzt3p	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 06:17:36.161739+00	2025-11-08 11:19:28.682076+00	6oysoaawz7qh	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	72	l27w2ojgxvva	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 11:19:28.682328+00	2025-11-08 12:17:28.669759+00	biwapzfrzt3p	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	73	lpasz5f7dy2i	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 12:17:28.669954+00	2025-11-08 13:15:28.711625+00	l27w2ojgxvva	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	74	qjbn2itzslgu	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 13:15:28.711923+00	2025-11-08 16:23:04.024167+00	lpasz5f7dy2i	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	75	arpqfdrczsnz	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 16:23:04.024426+00	2025-11-08 17:21:30.545408+00	qjbn2itzslgu	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	76	rxmnttceev2b	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 17:21:30.546393+00	2025-11-08 18:19:39.889333+00	arpqfdrczsnz	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	77	lfxbgj6x2mfm	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 18:19:39.890353+00	2025-11-08 19:17:39.920987+00	rxmnttceev2b	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	78	4tbfxknv322r	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 19:17:39.921905+00	2025-11-08 20:16:05.06574+00	lfxbgj6x2mfm	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	79	pouep4zdbuex	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 20:16:05.066432+00	2025-11-08 21:14:16.418174+00	4tbfxknv322r	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	80	l3uyk4gbwtm4	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 21:14:16.418709+00	2025-11-08 23:57:56.465347+00	pouep4zdbuex	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	108	rrmzcs5kselc	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 01:21:28.263962+00	2025-11-11 17:40:30.245908+00	zxprait3siky	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	109	wnnl7elxqi3s	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 17:40:30.247076+00	2025-11-11 18:38:30.307001+00	rrmzcs5kselc	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	110	o6h64tciclal	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 18:38:30.307255+00	2025-11-11 19:37:53.760435+00	wnnl7elxqi3s	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	111	2bb7paeu73l2	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 19:37:53.760674+00	2025-11-11 20:36:11.142194+00	o6h64tciclal	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	10	qchayfmavm7b	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-06 21:41:29.437858+00	2025-11-06 22:39:57.051207+00	bi3wdtm66sxh	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	112	l7526qp57tpp	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 20:36:11.142484+00	2025-11-11 21:34:13.819076+00	2bb7paeu73l2	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	113	dl4lihw4at7z	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 21:34:13.819409+00	2025-11-12 00:55:05.209736+00	l7526qp57tpp	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	114	tfztyka4vrhu	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 00:55:05.21018+00	2025-11-12 13:35:39.42459+00	dl4lihw4at7z	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	115	mm3wtgzf2rg4	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 13:35:39.425384+00	2025-11-12 14:33:42.554056+00	tfztyka4vrhu	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	116	eormo5uxr4wb	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 14:33:42.554284+00	2025-11-12 18:03:42.209964+00	mm3wtgzf2rg4	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	117	zaddvexdwwcy	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 18:03:42.211141+00	2025-11-12 19:01:42.245085+00	eormo5uxr4wb	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	118	4362pkxl535d	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 19:01:42.245586+00	2025-11-12 19:59:54.96424+00	zaddvexdwwcy	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	119	sa5lny254fdc	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 19:59:54.964592+00	2025-11-12 20:57:54.982116+00	4362pkxl535d	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	120	nvbdzpt3ovah	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 20:57:54.982399+00	2025-11-12 21:55:55.035502+00	sa5lny254fdc	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	121	gc4lj54vov6r	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-12 21:55:55.03629+00	2025-11-13 01:32:12.67037+00	nvbdzpt3ovah	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	122	5yt55xjet66b	3ae12d0d-e446-470b-9683-0546a85bed93	f	2025-11-13 01:32:12.670678+00	2025-11-13 01:32:12.670678+00	gc4lj54vov6r	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	60	rd6o4uqpse4a	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 15:59:11.949475+00	2025-11-07 16:57:33.292192+00	rya6mskd2prg	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	81	6myoil4h4uag	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-08 23:57:56.46577+00	2025-11-09 00:56:43.913269+00	l3uyk4gbwtm4	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	82	oxpzrsdb3j4g	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 00:56:43.913528+00	2025-11-09 01:55:11.216272+00	6myoil4h4uag	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	54	gjrtjvyvgj5a	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-06 22:39:57.051593+00	2025-11-06 23:38:24.368149+00	qchayfmavm7b	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	55	wirhpomkoxxv	3ae12d0d-e446-470b-9683-0546a85bed93	f	2025-11-06 23:38:24.368332+00	2025-11-06 23:38:24.368332+00	gjrtjvyvgj5a	daef299b-9486-440b-9cb1-48306240e7bb
00000000-0000-0000-0000-000000000000	83	6qhcp4s36yhx	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 01:55:11.217083+00	2025-11-09 02:53:37.879506+00	oxpzrsdb3j4g	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	56	gtixuahjkkgf	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 00:13:48.927843+00	2025-11-07 01:11:53.79571+00	\N	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	57	45e53zihfuo4	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 01:11:53.79646+00	2025-11-07 14:03:08.494344+00	gtixuahjkkgf	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	84	hrl6w44rptuw	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 02:53:37.880337+00	2025-11-09 03:51:51.236054+00	6qhcp4s36yhx	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	58	i2ykwp36b2p3	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 14:03:08.495217+00	2025-11-07 15:01:11.913036+00	45e53zihfuo4	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	59	rya6mskd2prg	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-07 15:01:11.913425+00	2025-11-07 15:59:11.949228+00	i2ykwp36b2p3	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	85	l3z22xokueor	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 03:51:51.236243+00	2025-11-09 04:49:51.283012+00	hrl6w44rptuw	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	86	xieblsv7a4y6	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 04:49:51.283193+00	2025-11-09 16:12:39.772971+00	l3z22xokueor	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	87	nz7dnkwkkqme	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 16:12:39.773254+00	2025-11-09 17:10:40.701476+00	xieblsv7a4y6	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	88	kyospwowscq6	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 17:10:40.701674+00	2025-11-09 18:08:40.745743+00	nz7dnkwkkqme	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	89	d7iezwt67wtg	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 18:08:40.745965+00	2025-11-09 19:06:40.796535+00	kyospwowscq6	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	90	zjtavju2zxrh	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 19:06:40.796766+00	2025-11-09 20:04:40.883818+00	d7iezwt67wtg	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	91	tsgoos33x6nj	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 20:04:40.884037+00	2025-11-09 21:02:40.943307+00	zjtavju2zxrh	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	92	yvy5nw5fyjz6	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 21:02:40.94352+00	2025-11-09 22:00:40.984876+00	tsgoos33x6nj	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	93	nboetdeqh2bg	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 22:00:40.985068+00	2025-11-09 22:58:41.850004+00	yvy5nw5fyjz6	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	94	uestx5dzed7t	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 22:58:41.850204+00	2025-11-09 23:56:41.908271+00	nboetdeqh2bg	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	95	474qb644yjs2	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-09 23:56:41.908469+00	2025-11-10 13:44:51.153953+00	uestx5dzed7t	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	96	4ubfxcysbth5	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 13:44:51.154223+00	2025-11-10 14:43:05.635959+00	474qb644yjs2	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	97	a7tkuiwdjbpl	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 14:43:05.636202+00	2025-11-10 15:41:05.688643+00	4ubfxcysbth5	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	98	mznsisps34jn	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 15:41:05.688853+00	2025-11-10 16:39:05.748025+00	a7tkuiwdjbpl	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	99	ymjsslh5ftno	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 16:39:05.748233+00	2025-11-10 17:37:05.798733+00	mznsisps34jn	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	100	by4wksv5c3pa	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 17:37:05.798936+00	2025-11-10 18:35:05.85294+00	ymjsslh5ftno	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	101	6rluqtoduwhb	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 18:35:05.853168+00	2025-11-10 19:33:21.833245+00	by4wksv5c3pa	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	102	zfvxwc6nnrg6	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 19:33:21.833532+00	2025-11-10 20:31:21.875842+00	6rluqtoduwhb	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	103	hox6jzjevvmh	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 20:31:21.87622+00	2025-11-10 21:29:28.022068+00	zfvxwc6nnrg6	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	104	wxfdqxmbyma2	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 21:29:28.022315+00	2025-11-10 22:27:28.080553+00	hox6jzjevvmh	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	105	savlib4a77ci	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 22:27:28.080778+00	2025-11-10 23:25:28.143344+00	wxfdqxmbyma2	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	106	7kl4epg33auh	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-10 23:25:28.143547+00	2025-11-11 00:23:28.210695+00	savlib4a77ci	a818a964-d0b1-4b24-8530-282705f9c4d6
00000000-0000-0000-0000-000000000000	107	zxprait3siky	3ae12d0d-e446-470b-9683-0546a85bed93	t	2025-11-11 00:23:28.210923+00	2025-11-11 01:21:28.263647+00	7kl4epg33auh	a818a964-d0b1-4b24-8530-282705f9c4d6
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id) FROM stdin;
daef299b-9486-440b-9cb1-48306240e7bb	3ae12d0d-e446-470b-9683-0546a85bed93	2025-11-06 02:53:51.29066+00	2025-11-06 23:38:24.369194+00	\N	aal1	\N	2025-11-06 23:38:24.369169	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0	172.18.0.1	\N	\N
a818a964-d0b1-4b24-8530-282705f9c4d6	3ae12d0d-e446-470b-9683-0546a85bed93	2025-11-07 00:13:48.925504+00	2025-11-13 01:32:12.67172+00	\N	aal1	\N	2025-11-13 01:32:12.671692	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0	172.18.0.1	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\N	87101f9a-3089-4c65-8801-03c867a0f283	\N	authenticated	mmakhool6@gmail.com	\\a\\0\\	2025-11-06 22:39:32.994889+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"lastName": "Makhool", "firstName": "Michael"}	\N	2025-10-01 00:27:21.752027+00	2025-11-06 22:39:32.994889+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	3ae12d0d-e446-470b-9683-0546a85bed93	authenticated	authenticated	james@mecacaraudio.com	$2a$10$h0/RkZtGl2pITL0Bd2RCl.quIYCd.ylTS0Umnxm5afGPy7JgYmeH.	2025-10-23 13:20:47.195996+00	\N		\N		\N			\N	2025-11-07 00:13:48.925462+00	{"provider": "email", "providers": ["email"]}	{"full_name": "James Ryan", "email_verified": true}	\N	2025-10-23 13:20:47.188682+00	2025-11-13 01:32:12.671224+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: competition_classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.competition_classes (id, name, abbreviation, format, season_id, is_active, display_order, created_at, updated_at) FROM stdin;
da39ab0b-66ad-4c1f-ab85-262e0f8b18d1	Street	STR	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	1	2025-11-06 22:41:07.863375	2025-11-06 22:41:07.863375
b979f6c1-a67e-45a1-a45e-a5a5f4faaf7f	Street Install	STRIN	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	2	2025-11-06 22:41:07.870743	2025-11-06 22:41:07.870743
39f7d496-f6c0-4495-832b-2eac653d82d5	Stock	STO	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	3	2025-11-06 22:41:07.875509	2025-11-06 22:41:07.875509
3fb5fd65-e987-4e59-9ee4-b21a187decd8	Stock Install	STOIN	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	4	2025-11-06 22:41:07.880092	2025-11-06 22:41:07.880092
79736c37-5b11-4777-aedc-916ac6576daa	Modified	MOD	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	5	2025-11-06 22:41:07.884596	2025-11-06 22:41:07.884596
ea4a2fe7-f67e-43d7-8d00-b6c05240cc29	Modified Install	MOINS	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	6	2025-11-06 22:41:07.889041	2025-11-06 22:41:07.889041
fd93e33e-fe60-4145-8849-7bb9687a2071	Modified Street	MS	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	7	2025-11-06 22:41:07.893306	2025-11-06 22:41:07.893306
934aa19f-1a50-437b-ad05-745e6bc9d03e	SQ2	SQ2	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	8	2025-11-06 22:41:07.898067	2025-11-06 22:41:07.898067
e44c9d42-e240-42a7-9f63-2bd5bec57182	SQ2+	SQ2P	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	9	2025-11-06 22:41:07.903269	2025-11-06 22:41:07.903269
28b29d52-7597-43be-96bd-06f843b070e2	Master	MSTR	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	10	2025-11-06 22:41:07.907266	2025-11-06 22:41:07.907266
a0235789-a68c-4708-bf57-34e634dd5a3b	Extreme	X	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	11	2025-11-06 22:41:07.911257	2025-11-06 22:41:07.911257
378348d3-6e0e-4110-ae7d-a263d1025b7b	Extreme Install	XTRIN	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	12	2025-11-06 22:41:07.914628	2025-11-06 22:41:07.914628
9e0c4a15-b3b4-43a7-94f6-698dc5141ac2	RTA	RTA	SQL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	13	2025-11-06 22:41:07.918195	2025-11-06 22:41:07.918195
f76ae1c6-20a5-4dd0-916d-288ebf8ba789	Bicycle	BICYC	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	1	2025-11-06 22:41:26.216931	2025-11-06 22:41:26.216931
45f5e1f0-79c6-4925-a956-02b46607b957	Motorcycle	MOTO	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	2	2025-11-06 22:41:26.222582	2025-11-06 22:41:26.222582
0c473f28-3d8b-477e-978f-4eb8d4983434	Domestic Car Mild	SSDCM	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	3	2025-11-06 22:41:26.226826	2025-11-06 22:41:26.226826
b2946ee4-5172-402d-b8e0-7d877934c705	Domestic Car Street	SSDCS	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	4	2025-11-06 22:41:26.231553	2025-11-06 22:41:26.231553
f1baf238-af14-4769-babd-28c08e3b9e19	Domestic Car Wild	SSDCW	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	5	2025-11-06 22:41:26.236561	2025-11-06 22:41:26.236561
b93bfa3e-d553-442b-84be-0ecd20197b52	European Mild	SSEM	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	6	2025-11-06 22:41:26.24099	2025-11-06 22:41:26.24099
71c94736-5429-432b-bb92-bc4fc664f19b	European Street	SSES	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	7	2025-11-06 22:41:26.245069	2025-11-06 22:41:26.245069
9a1f61ea-3c13-4d28-aba9-e3a281e60622	European Wild	SSEW	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	8	2025-11-06 22:41:26.249131	2025-11-06 22:41:26.249131
f41ebbd9-ae24-4e27-bcaf-d94fd0b2b2a4	Import Car Mild	SSICM	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	9	2025-11-06 22:41:26.25513	2025-11-06 22:41:26.25513
9583085e-ed74-4426-9852-8e6253b2a715	Import Car Street	SSICS	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	10	2025-11-06 22:41:26.25933	2025-11-06 22:41:26.25933
681933a3-3a44-48ae-931f-21b6855b6b2a	Import Car Wild	SSICW	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	11	2025-11-06 22:41:26.263093	2025-11-06 22:41:26.263093
a5f9b41c-e789-479c-be56-4fd61c6ddbcf	SUV/Van Mild	SUVM	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	12	2025-11-06 22:41:26.267777	2025-11-06 22:41:26.267777
eb34abdb-10c9-414b-8359-c432c2eda8d5	SUV/Van Street	SUVS	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	13	2025-11-06 22:41:26.271142	2025-11-06 22:41:26.271142
4e78ec26-940e-497c-b9d8-5e7707681bb7	SUV/Van Wild	SUVW	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	14	2025-11-06 22:41:26.274525	2025-11-06 22:41:26.274525
e023fd58-fab8-43ab-9e2f-8b4ecd50af5e	Truck Mild	SSTM	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	15	2025-11-06 22:41:26.27773	2025-11-06 22:41:26.27773
988fe86e-8fbe-41e2-9c4c-76e2fe57fc20	Truck Street	SSTS	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	16	2025-11-06 22:41:26.280815	2025-11-06 22:41:26.280815
dbb7f03f-c4a6-4449-9646-4c66e6f2a0d8	Truck Wild	SSTW	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	17	2025-11-06 22:41:26.284729	2025-11-06 22:41:26.284729
d2d6cea8-7d09-44c0-a8cb-e53f198c6e94	Vintage Car	SSVC	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	18	2025-11-06 22:41:26.288027	2025-11-06 22:41:26.288027
5c1a2356-6ec7-479f-96dd-854fa4547d15	Vintage Truck	SSVT	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	19	2025-11-06 22:41:26.291265	2025-11-06 22:41:26.291265
f511f375-ad4f-42a7-9a97-185cf148b5cd	Show MECA Kids	SSMK	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	20	2025-11-06 22:41:26.29454	2025-11-06 22:41:26.29454
7d9a39eb-9a71-4a82-8819-abf3019939cb	Open	SSO	Show and Shine	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	21	2025-11-06 22:41:26.297604	2025-11-06 22:41:26.297604
5174655f-432a-4782-bf62-9fcdbdc84bcb	Exterior	RTLEX	Ride the Light	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	1	2025-11-06 22:41:55.428014	2025-11-06 22:41:55.428014
d7bfffc0-7b61-464b-9c0a-5ffe7d255f3f	Interior	RTLIN	Ride the Light	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	2	2025-11-06 22:41:55.432297	2025-11-06 22:41:55.432297
8725d585-48e4-442f-b343-420d4e57be28	Dueling Demos Extreme	DDX	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	1	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
33536587-0af2-40ab-8094-4fa4215b34e3	Dueling Demos MECA Kids	DDMK	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	2	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
b0fb6508-81fc-4231-9618-9e1c1355e4b4	Dueling Demos Modified 1	DDM1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	3	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
8aa2b4ca-5d82-4f5f-8b4e-76a5a5e7d532	Dueling Demos Modified 2	DDM2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	4	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
ee5581b6-3c35-48f5-88e5-8a54b06c08e4	Dueling Demos Modified Street	DDMS	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	5	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
8fc5cebb-4031-4625-9f7d-de8a24d7d68d	Dueling Demos Motorcycle 1	MOTO1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	6	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
9fed92a3-d2ef-4dc0-8213-d518b433eb61	Dueling Demos Motorcycle 2	MOTO2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	7	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
c845b409-fab9-4da2-9d3d-abf34a6882f8	Dueling Demos Motorcycle 3	MOTO3	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	8	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
c58e5930-1381-47c7-a6e0-1fc6c25130a0	Dueling Demos Open	DDO	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	9	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
5df0642d-abc6-4680-8d99-b0bbd688e12b	Dueling Demos Street	DDS	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	10	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
59be7596-f0fe-4f0f-a490-bd36d56c2f85	Extreme	X	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	11	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
6326c0a3-0780-440a-b40a-155d807b0277	MECA Kids Park and Pound	MKPNP	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	12	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
68af3900-367a-4edc-bc79-91f6d505d923	MECA Kids Sound Pressure	MKSP	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	13	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
6369b3b5-af27-409f-8937-c9ae41d72462	MECA Kids Sound Pressure X	MKSPX	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	14	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
aeef32f5-ef82-43d6-8cb0-deba40146486	Modified 1	M1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	15	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
5a2c0f28-784b-4dc8-b95a-010fea4c9e01	Modified 2	M2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	16	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
a7bb6aae-97f8-4dfd-bb16-c3eefb4af860	Modified 3	M3	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	17	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
055c1d1b-0ad7-47c8-9870-a7d6f31faa60	Modified 4	M4	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	18	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
9385d8dd-e380-4110-8408-d3092e27170f	Modified 5	M5	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	19	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
daf847f6-1d92-4fe1-8bc3-ba58ac2330c7	Modified Street 1	MS1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	20	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
2272475a-c73c-4f45-a367-04e9b3b304ac	Modified Street 2	MS2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	21	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
f1d2cacc-1a20-41f1-8e00-3956600c5f83	Modified Street 3	MS3	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	22	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
0cd7571e-68f7-4621-8998-8238089c291e	Modified Street 4	MS4	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	23	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
eeb1ed8f-cf01-41a2-921d-e5e409a00c21	Park And Pound 1	DB1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	24	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
6645fdc6-d77a-4fce-bb50-d77e6b5a76fe	Park and Pound 2	DB2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	25	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
f8f32b8f-f785-48e6-ad5b-d881adafc582	Park and Pound 3	DB3	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	26	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
b9076e21-474b-459a-8f2f-7fdded0e7fa7	Park and Pound 4	DB4	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	27	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
2694f330-4b4b-4d91-bb82-ab427c410a31	Park and Pound 5	DB5	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	28	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
ed3bad09-252a-4a12-b9aa-7c40fb719b77	Single Position Dueling Demos Extreme	SPDDX	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	29	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
8038da3c-3d65-4e4b-8ef2-0a63ce064d3c	Single Position Dueling Demos Modified	SPDDM	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	30	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
6fecaf73-8dd8-45ec-b513-1344144c786f	Single Position Dueling Demos Street	SPDDS	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	31	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
fcf2dab1-67e2-484f-8034-dccbd426434a	Street 1	S1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	32	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
19e209cb-9ead-456f-9e67-3632897d5b20	Street 2	S2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	33	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
33f77050-05b7-4fe7-97dc-1e9fc37e05aa	Street 3	S3	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	34	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
2b2c6478-67a0-4254-b8a6-09d1e08828c3	Street 4	S4	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	35	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
6af02de1-59b2-4ddf-beb0-1fa5d92fe3b7	Street 5	S5	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	36	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
87efb8d4-8959-40aa-a905-47bac20ef58e	Trunk 1	T1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	37	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
262aed7d-229c-4793-bf0d-437c431f0952	Trunk 2	T2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	38	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
94440bb1-26c4-4f90-8d65-71cd11c2b2b8	X Modified 1	XM1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	39	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
6a21192d-763e-4e49-aff2-a5e92211cd83	X Modified 2	XM2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	40	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
0f5a9ffd-d29b-4eff-872b-7fb5d0ac72bf	X Modified Street	XMS	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	41	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
db7cdb30-697f-4920-b61f-0b0f416b5cdf	X Street 1	XST1	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	42	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
83851565-6dad-42f0-9495-a30cf639a6f1	X Street 2	XST2	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	43	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
44e64267-9a2b-43ac-8852-c686e8db73ea	X Street Trunk	XST	SPL	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	t	44	2025-11-06 23:59:16.770747	2025-11-06 23:59:16.770747
\.


--
-- Data for Name: competition_formats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.competition_formats (id, name, description, is_active, display_order, created_at, updated_at, abbreviation) FROM stdin;
b071a3b6-4fac-4755-845e-0ab36d071455	SPL	Sound Pressure League - Competition focused on maximum sound pressure levels	t	0	2025-11-02 01:49:21.579	2025-11-02 01:49:21.579	SPL
da763a6d-ce4e-490c-98c4-bbd362c8df72	SQL	Sound Quality League - Competition focused on sound quality and installation	t	0	2025-11-02 01:49:21.599	2025-11-02 01:49:21.599	SQL
78e3684a-963b-4fb3-85a6-54f588dedbc6	Show and Shine	Vehicle appearance competition across multiple categories	t	0	2025-11-02 01:49:21.608	2025-11-02 01:49:21.608	SNS
6738312b-69d1-4b44-8cf4-a1cb2ad36b2b	Ride the Light	Lighting installation competition for exterior and interior installations	t	0	2025-11-02 01:49:21.617	2025-11-02 01:49:21.617	RTL
a5f24ee4-ea82-46e8-be55-5881f3315adb	MECA Kids	Kids Format	t	0	2025-11-02 14:16:17.817	2025-11-02 14:16:17.817	MK
d17a09f6-b25f-4896-af1b-c9bec52becbf	PHAT Awards		t	0	2025-11-02 23:14:18.81	2025-11-02 23:14:18.81	PHAT
\.


--
-- Data for Name: competition_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.competition_results (id, event_id, competitor_id, competitor_name, competition_class, score, placement, points_earned, vehicle_info, notes, created_by, created_at, meca_id, season_id, class_id) FROM stdin;
c6a49796-f7b2-427c-8ffe-42250134b073	75751561-6709-4b39-86bf-170c2483319d	87101f9a-3089-4c65-8801-03c867a0f283	Michael Makhool	Modified 4	150.20	2	0	\N	\N	3ae12d0d-e446-470b-9683-0546a85bed93	2025-11-09 16:14:46.378+00	\N	\N	055c1d1b-0ad7-47c8-9870-a7d6f31faa60
4bde7599-7e94-4cf5-bafc-65110b9f2a95	75751561-6709-4b39-86bf-170c2483319d	3ae12d0d-e446-470b-9683-0546a85bed93	James Ryan	Modified 4	150.40	1	20	2007 Ford F150	\N	3ae12d0d-e446-470b-9683-0546a85bed93	2025-11-08 03:11:59.076+00	202401	\N	055c1d1b-0ad7-47c8-9870-a7d6f31faa60
\.


--
-- Data for Name: event_hosting_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_hosting_requests (id, first_name, last_name, email, phone, business_name, user_id, event_name, event_type, event_type_other, event_description, event_start_date, event_start_time, event_end_date, event_end_time, address_line_1, address_line_2, city, state, postal_code, country, venue_type, expected_participants, has_hosted_before, additional_services, other_services_details, other_requests, additional_info, estimated_budget, status, admin_response, admin_response_date, admin_responder_id, created_at, updated_at) FROM stdin;
f88ff158-23ee-4bb6-ae74-eb41089c483c	James	Ryan	james@mecacaraudio.com	313790327	Little Ceasars Arena	\N	SPL Blow Out 2025	4x Event		Best damn SPL: event ever	2026-02-17 00:00:00+00	07:00	2026-02-17 00:00:00+00	19:00	2645 Woodward Ave,		Detroit	Michigan	48201	United States	convention-center	5000	t	["Staffing", "Tents", "Advertising & Marketing", "SPL or SQL Judge Training", "Judges", "Score Sheets", "TermLab SPL Meter", "Vendors", "Security"]				12000000	pending	\N	\N	\N	2025-11-12 19:23:43.013+00	2025-11-12 19:23:43.013+00
\.


--
-- Data for Name: event_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_registrations (id, event_id, user_id, full_name, email, phone, vehicle_info, competition_class, registration_date, payment_status, status) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, title, description, event_date, registration_deadline, venue_name, venue_address, latitude, longitude, flyer_url, event_director_id, status, max_participants, registration_fee, created_at, updated_at, venue_city, venue_state, venue_postal_code, venue_country, season_id, points_multiplier, formats) FROM stdin;
75751561-6709-4b39-86bf-170c2483319d	SPL Madness	Test Event for SPL Madness\nThere will also be SQL judging at 8am	2025-11-21 10:00:00+00	2025-11-05 10:38:00+00	SPL Park	1600 S Jefferson St	30.10529912	-83.58104498	https://assets.mecacaraudio.net/flyers/21fa30fd-8b7f-4d51-bdf9-078f2324cc5c.png	3ae12d0d-e446-470b-9683-0546a85bed93	upcoming	500	35.00	2025-10-01 13:39:49.286002+00	2025-11-11 19:45:42.230447+00	Perry	FL	32348	US	43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	4	["SPL", "SQL", "SSI", "MK", "Dueling Demo", "Ride the Light", "Show and Shine"]
\.


--
-- Data for Name: media_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_files (id, title, description, file_url, file_type, file_size, mime_type, dimensions, is_external, tags, created_at, updated_at, created_by) FROM stdin;
b4ae20f3-a8d5-498e-b519-608e649457ec	MECA Logo (Transparent)	Main site logo with transparent background	/meca-logo-transparent.png	image	0	image/png	\N	f	{logo,branding}	2025-10-01 18:52:24.139952+00	2025-10-01 18:52:24.139952+00	3ae12d0d-e446-470b-9683-0546a85bed93
1cb65d62-082f-4599-aea0-a7dcda3df0b8	2025 SPL Rulebook (2025)	SPL Rulebook rulebook for 2025 season	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341385837-2025_MECA_SPL_Rule_Book_-_Final.pdf	pdf	0	application/pdf	\N	f	{rulebook,"spl rulebook",2025}	2025-10-01 18:52:24.636742+00	2025-10-01 18:52:24.636742+00	3ae12d0d-e446-470b-9683-0546a85bed93
5da9958e-5608-4edb-9efa-a2473e4e3c8f	2025 SQL Rulebook (2025)	SQL Rulebook rulebook for 2025 season	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341757822-2025_MECA_SQL_Rule_Book.pdf	pdf	0	application/pdf	\N	f	{rulebook,"sql rulebook",2025}	2025-10-01 18:52:24.863699+00	2025-10-01 18:52:24.863699+00	3ae12d0d-e446-470b-9683-0546a85bed93
291a6e78-0d4d-4b8e-8ebd-52c5e0753e17	2025 MECA Kids Rulebook (2025)	MECA Kids rulebook for 2025 season	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341784202-2025_MECA_KIDS_Rule_Book.pdf	pdf	0	application/pdf	\N	f	{rulebook,"meca kids",2025}	2025-10-01 18:52:25.110327+00	2025-10-01 18:52:25.110327+00	3ae12d0d-e446-470b-9683-0546a85bed93
66ceac5b-0f18-4d28-9f9d-361026c2363a	2025 Dueling Demos Rulebook (2025)	Dueling Demos rulebook for 2025 season	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341810196-2025_MECA_Dueling_Demo_Rule_Book.pdf	pdf	0	application/pdf	\N	f	{rulebook,"dueling demos",2025}	2025-10-01 18:52:25.274639+00	2025-10-01 18:52:25.274639+00	3ae12d0d-e446-470b-9683-0546a85bed93
3c6a948a-17e7-4db7-8c8d-296526b8c44a	2025 Ride the Light Rulebook (2025)	Ride the Light rulebook for 2025 season	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341832938-2025_MECA_Ride_the_Light_Rule_Book.pdf	pdf	0	application/pdf	\N	f	{rulebook,"ride the light",2025}	2025-10-01 18:52:25.48873+00	2025-10-01 18:52:25.48873+00	3ae12d0d-e446-470b-9683-0546a85bed93
f8e67398-f8d0-4f5c-8dc8-05ad089b97f0	image2	\N	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759450192013-image-701022.0440ef7a-7ce9-4ada-acc5-f748e9d9d2e1.jpg	image	507108	image/jpeg	1753x819	f	\N	2025-10-03 00:09:52.765952+00	2025-10-03 00:09:52.765952+00	3ae12d0d-e446-470b-9683-0546a85bed93
96e80beb-a620-46fa-9897-41f0e1ae6cd2	cb	\N	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452295232-cb.jpg	image	321693	image/jpeg	2086x749	f	\N	2025-10-03 00:44:55.938305+00	2025-10-03 00:44:55.938305+00	3ae12d0d-e446-470b-9683-0546a85bed93
2a090fba-1186-4769-9ae7-d28f96a15ff2	door	\N	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452412985-door.jpg	image	195531	image/jpeg	1678x883	f	\N	2025-10-03 00:46:53.620358+00	2025-10-03 00:46:53.620358+00	3ae12d0d-e446-470b-9683-0546a85bed93
c230b7b2-658a-4ed7-9819-37830cb86c1c	truck	\N	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452610600-green-truck.jpg	image	713051	image/jpeg	2241x832	f	\N	2025-10-03 00:50:11.361388+00	2025-10-03 00:50:11.361388+00	3ae12d0d-e446-470b-9683-0546a85bed93
b767b8c0-5fdb-48fe-9778-239c2532e13d	trunk	\N	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452932068-trunk.jpg	image	262155	image/jpeg	1677x962	f	\N	2025-10-03 00:55:32.837482+00	2025-10-03 00:55:32.837482+00	3ae12d0d-e446-470b-9683-0546a85bed93
2bba123b-a4c7-4e85-8be2-338697596798	big-box	\N	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452954206-big-box.jpg	image	368371	image/jpeg	1684x913	f	\N	2025-10-03 00:55:54.7839+00	2025-10-03 00:55:54.7839+00	3ae12d0d-e446-470b-9683-0546a85bed93
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.memberships (id, user_id, membership_type, purchase_date, expiry_date, amount_paid, payment_method, status) FROM stdin;
\.


--
-- Data for Name: mikro_orm_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mikro_orm_migrations (id, name, executed_at) FROM stdin;
1	Migration20251021213806	2025-11-01 17:29:47.245277+00
2	Migration20251101172851	2025-11-01 17:31:31.905637+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, from_user_id, title, message, type, link, read, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, member_id, order_number, total_amount, status, order_items, payment_method, payment_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, email, full_name, phone, role, membership_status, membership_expiry, avatar_url, bio, created_at, updated_at, billing_street, billing_city, billing_state, billing_zip, billing_country, shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country, use_billing_for_shipping, first_name, last_name, meca_id, profile_picture_url, membership_expires_at, address, city, state, postal_code, country) FROM stdin;
87101f9a-3089-4c65-8801-03c867a0f283	mmakhool6@gmail.com	Michael Makhool	\N	admin	none	\N	\N	\N	2025-10-01 00:27:21.752027+00	2025-10-02 23:09:48.570084+00	\N	\N	\N	\N	USA	\N	\N	\N	\N	USA	f	Michael	Makhool	\N	\N	\N	\N	\N	\N	\N	US
3ae12d0d-e446-470b-9683-0546a85bed93	james@mecacaraudio.com	James Ryan	850-338-8950	admin	active	\N	\N	\N	2025-10-23 13:20:47.213817+00	2025-11-09 03:22:23.025971+00	202 E. Maurice Linton Rd.	Perry	Florida	32347	USA	202 E. Maurice Linton Rd.	Perry	Florida	32347	USA	f	James	Ryan	202401	\N	\N	202 E. Maurice Linton Rd.	Perry	FL	32347	US
\.


--
-- Data for Name: rulebooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rulebooks (id, title, description, year, category, pdf_url, summary_points, is_active, display_order, created_at, updated_at, season, status) FROM stdin;
30254ab8-4f34-4482-bd5c-e6ea3504c329	2025 SPL Rulebook	\N	2025	SPL Rulebook	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341385837-2025_MECA_SPL_Rule_Book_-_Final.pdf	\N	t	0	2025-10-01 17:56:26.828602+00	2025-10-23 14:10:24.71057+00	2025	active
fb76101f-7872-4c9b-bfd0-6ec2c06c2ee8	2025 SQL Rulebook	\N	2025	SQL Rulebook	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341757822-2025_MECA_SQL_Rule_Book.pdf	\N	t	0	2025-10-01 18:02:38.996208+00	2025-10-23 14:10:24.71057+00	2025	active
3e17513f-ae84-4cd1-85aa-e1c4fac36b1c	2025 MECA Kids Rulebook	\N	2025	MECA Kids	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341784202-2025_MECA_KIDS_Rule_Book.pdf	\N	t	0	2025-10-01 18:03:04.652385+00	2025-10-23 14:10:24.71057+00	2025	active
2bcbac64-164d-4960-b6b1-9e0049934ca7	2025 Dueling Demos Rulebook	\N	2025	Dueling Demos	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341810196-2025_MECA_Dueling_Demo_Rule_Book.pdf	\N	t	0	2025-10-01 18:03:30.679231+00	2025-10-23 14:10:24.71057+00	2025	active
b5683521-28ee-40b4-8557-387efd7aa71e	2025 Ride the Light Rulebook	\N	2025	Ride the Light	https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/rulebooks/1759341832938-2025_MECA_Ride_the_Light_Rule_Book.pdf	\N	t	0	2025-10-01 18:03:53.780298+00	2025-10-23 14:10:24.71057+00	2025	active
\.


--
-- Data for Name: seasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seasons (id, year, name, start_date, end_date, is_current, is_next, created_at, updated_at) FROM stdin;
434aaa11-58cd-47de-ba80-ea5254e6b306	2026	2026 Season	2025-10-12	2026-10-13	f	t	2025-11-01 16:29:07.340149	2025-11-07 01:20:15.652688
e10bf430-d81b-4786-957f-f46be5575753	2027	2027 Season	2027-01-01	2027-12-31	f	f	2025-11-01 16:29:54.474	2025-11-10 13:47:43.975771
43b425bb-a5d1-4208-8ef4-cad26ea5e3fa	2025	2025 Season	2024-10-12	2025-10-13	t	f	2025-11-01 16:29:07.338691	2025-11-10 13:47:43.975771
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_settings (id, setting_key, setting_value, setting_type, description, updated_at, updated_by) FROM stdin;
b78c384c-0b9a-4a55-bad8-455d761b2199	hero_image_url	https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920	text	Homepage hero background image	2025-10-23 13:46:09.48859+00	\N
3360ba34-e885-4288-aaeb-ce66b92f31f6	hero_image_urls	["https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920","https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759450192013-image-701022.0440ef7a-7ce9-4ada-acc5-f748e9d9d2e1.jpg","https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452295232-cb.jpg","https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452412985-door.jpg","https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452610600-green-truck.jpg","https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452932068-trunk.jpg","https://qykahrgwtktqycfgxqep.supabase.co/storage/v1/object/public/documents/media/1759452954206-big-box.jpg"]	json	Homepage hero carousel images (JSON array)	2025-11-11 21:58:29.756924+00	3ae12d0d-e446-470b-9683-0546a85bed93
1bcf8419-cd30-44be-8f7b-18ec02d00f1b	hero_title	MECACARAUDIO.COM	text	Homepage hero title	2025-11-11 21:58:29.758125+00	3ae12d0d-e446-470b-9683-0546a85bed93
f936404d-7f22-40af-a509-98167c5d6e5f	hero_button_text	View Events	text	Homepage hero button text	2025-11-11 21:58:29.760845+00	3ae12d0d-e446-470b-9683-0546a85bed93
d5a840ee-ed6b-4160-8409-355b43cc6892	hero_carousel_speed	5000	number	Carousel transition interval in milliseconds	2025-11-11 21:58:29.764862+00	3ae12d0d-e446-470b-9683-0546a85bed93
f2f29b13-755a-4cda-a7d5-caf4cbe52aa0	hero_carousel_direction	left	text	Carousel slide direction: left, right, top, bottom	2025-11-11 21:58:29.766572+00	3ae12d0d-e446-470b-9683-0546a85bed93
faddd852-4241-4735-b973-551f94e5ab4f	hero_subtitle	The Premier Platform for Car Audio Competitions	text	Homepage hero subtitle	2025-11-11 21:58:29.767227+00	3ae12d0d-e446-470b-9683-0546a85bed93
f46037f5-7e34-4797-a277-19f041d95f0d	pdf_viewer_height	1150	text	PDF viewer height in pixels	2025-11-11 21:58:29.772+00	3ae12d0d-e446-470b-9683-0546a85bed93
0fad9b80-614d-4a58-9f30-008c872199f5	pdf_viewer_width	100%	text	PDF viewer width (percentage or pixels)	2025-11-11 21:58:29.773+00	3ae12d0d-e446-470b-9683-0546a85bed93
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_members (id, team_id, member_id, role, joined_at) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, description, team_leader_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
documents	documents	\N	2025-10-23 16:23:21.515667+00	2025-10-23 16:23:21.515667+00	t	f	\N	\N	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (id, type, format, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.iceberg_namespaces (id, bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.iceberg_tables (id, namespace_id, bucket_id, name, location, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2025-11-05 18:01:36.904823
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2025-11-05 18:01:36.907882
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2025-11-05 18:01:36.909851
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2025-11-05 18:01:36.915587
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2025-11-05 18:01:36.921734
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2025-11-05 18:01:36.92377
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2025-11-05 18:01:36.926076
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2025-11-05 18:01:36.928042
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2025-11-05 18:01:36.929572
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2025-11-05 18:01:36.931356
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2025-11-05 18:01:36.933538
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2025-11-05 18:01:36.935681
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2025-11-05 18:01:36.937995
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2025-11-05 18:01:36.939789
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2025-11-05 18:01:36.941428
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2025-11-05 18:01:36.948311
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2025-11-05 18:01:36.950507
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2025-11-05 18:01:36.952265
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2025-11-05 18:01:36.954187
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2025-11-05 18:01:36.95621
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2025-11-05 18:01:36.957965
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2025-11-05 18:01:36.960438
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2025-11-05 18:01:36.965134
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2025-11-05 18:01:36.968561
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2025-11-05 18:01:36.970987
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2025-11-05 18:01:36.973727
26	objects-prefixes	ef3f7871121cdc47a65308e6702519e853422ae2	2025-11-05 18:01:36.975474
27	search-v2	33b8f2a7ae53105f028e13e9fcda9dc4f356b4a2	2025-11-05 18:01:36.980623
28	object-bucket-name-sorting	ba85ec41b62c6a30a3f136788227ee47f311c436	2025-11-05 18:01:36.986135
29	create-prefixes	a7b1a22c0dc3ab630e3055bfec7ce7d2045c5b7b	2025-11-05 18:01:36.988159
30	update-object-levels	6c6f6cc9430d570f26284a24cf7b210599032db7	2025-11-05 18:01:36.990024
31	objects-level-index	33f1fef7ec7fea08bb892222f4f0f5d79bab5eb8	2025-11-05 18:01:36.995414
32	backward-compatible-index-on-objects	2d51eeb437a96868b36fcdfb1ddefdf13bef1647	2025-11-05 18:01:37.000248
33	backward-compatible-index-on-prefixes	fe473390e1b8c407434c0e470655945b110507bf	2025-11-05 18:01:37.005118
34	optimize-search-function-v1	82b0e469a00e8ebce495e29bfa70a0797f7ebd2c	2025-11-05 18:01:37.006327
35	add-insert-trigger-prefixes	63bb9fd05deb3dc5e9fa66c83e82b152f0caf589	2025-11-05 18:01:37.009367
36	optimise-existing-functions	81cf92eb0c36612865a18016a38496c530443899	2025-11-05 18:01:37.011051
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2025-11-05 18:01:37.014024
38	iceberg-catalog-flag-on-buckets	19a8bd89d5dfa69af7f222a46c726b7c41e462c5	2025-11-05 18:01:37.016654
39	add-search-v2-sort-support	39cf7d1e6bf515f4b02e41237aba845a7b492853	2025-11-05 18:01:37.022076
40	fix-prefix-race-conditions-optimized	fd02297e1c67df25a9fc110bf8c8a9af7fb06d1f	2025-11-05 18:01:37.024481
41	add-object-level-update-trigger	44c22478bf01744b2129efc480cd2edc9a7d60e9	2025-11-05 18:01:37.02786
42	rollback-prefix-triggers	f2ab4f526ab7f979541082992593938c05ee4b47	2025-11-05 18:01:37.030407
43	fix-object-level	ab837ad8f1c7d00cc0b7310e989a23388ff29fc6	2025-11-05 18:01:37.032491
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, level) FROM stdin;
\.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.prefixes (bucket_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY supabase_functions.hooks (id, hook_table_id, hook_name, created_at, request_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY supabase_functions.migrations (version, inserted_at) FROM stdin;
initial	2025-11-05 18:01:27.283626+00
20210809183423_update_grants	2025-11-05 18:01:27.283626+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

COPY supabase_migrations.schema_migrations (version, statements, name) FROM stdin;
20250930180623	{"/*\r\n  # MECACARAUDIO.COM Database Schema\r\n\r\n  ## Overview\r\n  Complete database structure for car audio competition management system with:\r\n  - User management with role-based access control\r\n  - Event management and registration\r\n  - Competition results tracking\r\n  - Membership management\r\n  - Leaderboard and rankings\r\n\r\n  ## New Tables\r\n\r\n  ### 1. `profiles`\r\n  User profile information extending Supabase auth.users\r\n  - `id` (uuid, FK to auth.users)\r\n  - `email` (text)\r\n  - `full_name` (text)\r\n  - `phone` (text)\r\n  - `role` (enum: user, event_director, retailer, admin)\r\n  - `membership_status` (enum: none, active, expired)\r\n  - `membership_expiry` (timestamptz)\r\n  - `avatar_url` (text)\r\n  - `bio` (text)\r\n  - `created_at` (timestamptz)\r\n  - `updated_at` (timestamptz)\r\n\r\n  ### 2. `events`\r\n  Competition events with details\r\n  - `id` (uuid, PK)\r\n  - `title` (text)\r\n  - `description` (text)\r\n  - `event_date` (timestamptz)\r\n  - `registration_deadline` (timestamptz)\r\n  - `venue_name` (text)\r\n  - `venue_address` (text)\r\n  - `latitude` (numeric)\r\n  - `longitude` (numeric)\r\n  - `flyer_url` (text)\r\n  - `event_director_id` (uuid, FK to profiles)\r\n  - `status` (enum: upcoming, ongoing, completed, cancelled)\r\n  - `max_participants` (integer)\r\n  - `registration_fee` (numeric)\r\n  - `created_at` (timestamptz)\r\n  - `updated_at` (timestamptz)\r\n\r\n  ### 3. `event_registrations`\r\n  Pre-registrations for events\r\n  - `id` (uuid, PK)\r\n  - `event_id` (uuid, FK to events)\r\n  - `user_id` (uuid, FK to profiles, nullable for non-members)\r\n  - `full_name` (text, for non-members)\r\n  - `email` (text, for non-members)\r\n  - `phone` (text)\r\n  - `vehicle_info` (text)\r\n  - `competition_class` (text)\r\n  - `registration_date` (timestamptz)\r\n  - `payment_status` (enum: pending, paid, refunded)\r\n  - `status` (enum: pending, confirmed, cancelled)\r\n\r\n  ### 4. `competition_results`\r\n  Results from competition events\r\n  - `id` (uuid, PK)\r\n  - `event_id` (uuid, FK to events)\r\n  - `competitor_id` (uuid, FK to profiles, nullable)\r\n  - `competitor_name` (text)\r\n  - `competition_class` (text)\r\n  - `score` (numeric)\r\n  - `placement` (integer)\r\n  - `points_earned` (integer)\r\n  - `vehicle_info` (text)\r\n  - `notes` (text)\r\n  - `created_by` (uuid, FK to profiles)\r\n  - `created_at` (timestamptz)\r\n\r\n  ### 5. `memberships`\r\n  Membership purchase history\r\n  - `id` (uuid, PK)\r\n  - `user_id` (uuid, FK to profiles)\r\n  - `membership_type` (enum: annual, lifetime)\r\n  - `purchase_date` (timestamptz)\r\n  - `expiry_date` (timestamptz)\r\n  - `amount_paid` (numeric)\r\n  - `payment_method` (text)\r\n  - `status` (enum: active, expired, cancelled)\r\n\r\n  ## Security\r\n  - Enable RLS on all tables\r\n  - Profiles: Users can view all profiles, update own profile, admins can manage all\r\n  - Events: Public can view, event directors and admins can create/update\r\n  - Registrations: Users can create and view own, event directors and admins can view all\r\n  - Results: Public can view, admins and event directors can create/update\r\n  - Memberships: Users can view own, admins can view all\r\n\r\n  ## Indexes\r\n  - Events by date and status for calendar queries\r\n  - Results by event and competitor for leaderboard\r\n  - Registrations by event for participant lists\r\n*/\r\n\r\n-- Create custom types\r\nCREATE TYPE user_role AS ENUM ('user', 'event_director', 'retailer', 'admin')","CREATE TYPE membership_status AS ENUM ('none', 'active', 'expired')","CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled')","CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded')","CREATE TYPE registration_status AS ENUM ('pending', 'confirmed', 'cancelled')","CREATE TYPE membership_type AS ENUM ('annual', 'lifetime')","-- Profiles table\r\nCREATE TABLE IF NOT EXISTS profiles (\r\n  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,\r\n  email text NOT NULL,\r\n  full_name text NOT NULL,\r\n  phone text,\r\n  role user_role DEFAULT 'user' NOT NULL,\r\n  membership_status membership_status DEFAULT 'none' NOT NULL,\r\n  membership_expiry timestamptz,\r\n  avatar_url text,\r\n  bio text,\r\n  created_at timestamptz DEFAULT now() NOT NULL,\r\n  updated_at timestamptz DEFAULT now() NOT NULL\r\n)","-- Events table\r\nCREATE TABLE IF NOT EXISTS events (\r\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\r\n  title text NOT NULL,\r\n  description text,\r\n  event_date timestamptz NOT NULL,\r\n  registration_deadline timestamptz,\r\n  venue_name text NOT NULL,\r\n  venue_address text NOT NULL,\r\n  latitude numeric(10, 8),\r\n  longitude numeric(11, 8),\r\n  flyer_url text,\r\n  event_director_id uuid REFERENCES profiles(id) ON DELETE SET NULL,\r\n  status event_status DEFAULT 'upcoming' NOT NULL,\r\n  max_participants integer,\r\n  registration_fee numeric(10, 2) DEFAULT 0,\r\n  created_at timestamptz DEFAULT now() NOT NULL,\r\n  updated_at timestamptz DEFAULT now() NOT NULL\r\n)","-- Event registrations table\r\nCREATE TABLE IF NOT EXISTS event_registrations (\r\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\r\n  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,\r\n  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,\r\n  full_name text NOT NULL,\r\n  email text NOT NULL,\r\n  phone text,\r\n  vehicle_info text,\r\n  competition_class text,\r\n  registration_date timestamptz DEFAULT now() NOT NULL,\r\n  payment_status payment_status DEFAULT 'pending' NOT NULL,\r\n  status registration_status DEFAULT 'pending' NOT NULL\r\n)","-- Competition results table\r\nCREATE TABLE IF NOT EXISTS competition_results (\r\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\r\n  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,\r\n  competitor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,\r\n  competitor_name text NOT NULL,\r\n  competition_class text NOT NULL,\r\n  score numeric(10, 2) NOT NULL,\r\n  placement integer NOT NULL,\r\n  points_earned integer DEFAULT 0 NOT NULL,\r\n  vehicle_info text,\r\n  notes text,\r\n  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,\r\n  created_at timestamptz DEFAULT now() NOT NULL\r\n)","-- Memberships table\r\nCREATE TABLE IF NOT EXISTS memberships (\r\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\r\n  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,\r\n  membership_type membership_type NOT NULL,\r\n  purchase_date timestamptz DEFAULT now() NOT NULL,\r\n  expiry_date timestamptz,\r\n  amount_paid numeric(10, 2) NOT NULL,\r\n  payment_method text,\r\n  status membership_status DEFAULT 'active' NOT NULL\r\n)","-- Create indexes\r\nCREATE INDEX IF NOT EXISTS events_date_idx ON events(event_date)","CREATE INDEX IF NOT EXISTS events_status_idx ON events(status)","CREATE INDEX IF NOT EXISTS results_event_idx ON competition_results(event_id)","CREATE INDEX IF NOT EXISTS results_competitor_idx ON competition_results(competitor_id)","CREATE INDEX IF NOT EXISTS results_points_idx ON competition_results(points_earned DESC)","CREATE INDEX IF NOT EXISTS registrations_event_idx ON event_registrations(event_id)","CREATE INDEX IF NOT EXISTS registrations_user_idx ON event_registrations(user_id)","-- Enable Row Level Security\r\nALTER TABLE profiles ENABLE ROW LEVEL SECURITY","ALTER TABLE events ENABLE ROW LEVEL SECURITY","ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY","ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY","ALTER TABLE memberships ENABLE ROW LEVEL SECURITY","-- Profiles policies\r\nCREATE POLICY \\"Public profiles are viewable by everyone\\"\r\n  ON profiles FOR SELECT\r\n  TO authenticated, anon\r\n  USING (true)","CREATE POLICY \\"Users can update own profile\\"\r\n  ON profiles FOR UPDATE\r\n  TO authenticated\r\n  USING (auth.uid() = id)\r\n  WITH CHECK (auth.uid() = id)","CREATE POLICY \\"Users can insert own profile\\"\r\n  ON profiles FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (auth.uid() = id)","-- Events policies\r\nCREATE POLICY \\"Events are viewable by everyone\\"\r\n  ON events FOR SELECT\r\n  TO authenticated, anon\r\n  USING (true)","CREATE POLICY \\"Event directors can create events\\"\r\n  ON events FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","CREATE POLICY \\"Event directors can update own events\\"\r\n  ON events FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = auth.uid()))\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = auth.uid()))\r\n    )\r\n  )","-- Event registrations policies\r\nCREATE POLICY \\"Users can view own registrations\\"\r\n  ON event_registrations FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    user_id = auth.uid() OR\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","CREATE POLICY \\"Anyone can create registrations\\"\r\n  ON event_registrations FOR INSERT\r\n  TO authenticated, anon\r\n  WITH CHECK (true)","CREATE POLICY \\"Event directors can update registrations\\"\r\n  ON event_registrations FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","-- Competition results policies\r\nCREATE POLICY \\"Results are viewable by everyone\\"\r\n  ON competition_results FOR SELECT\r\n  TO authenticated, anon\r\n  USING (true)","CREATE POLICY \\"Event directors and admins can create results\\"\r\n  ON competition_results FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","CREATE POLICY \\"Event directors and admins can update results\\"\r\n  ON competition_results FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","-- Memberships policies\r\nCREATE POLICY \\"Users can view own memberships\\"\r\n  ON memberships FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    user_id = auth.uid() OR\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE POLICY \\"Admins can create memberships\\"\r\n  ON memberships FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE POLICY \\"Admins can update memberships\\"\r\n  ON memberships FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","-- Function to automatically update updated_at timestamp\r\nCREATE OR REPLACE FUNCTION update_updated_at_column()\r\nRETURNS TRIGGER AS $$\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n$$ LANGUAGE plpgsql","-- Triggers for updated_at\r\nCREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles\r\n  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()","CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events\r\n  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}	create_mecacaraudio_schema
20250930202654	{"/*\r\n  # Add Rulebooks Table\r\n\r\n  ## New Tables\r\n  \r\n  ### `rulebooks`\r\n  Rulebook documents and PDF files\r\n  - `id` (uuid, PK)\r\n  - `title` (text) - Rulebook title (e.g., \\"2025 MECA SPL Rule Book\\")\r\n  - `description` (text) - Brief description or summary\r\n  - `year` (integer) - Competition year\r\n  - `category` (text) - SPL, SQL, Show N Shine, etc.\r\n  - `pdf_url` (text) - URL to the PDF file\r\n  - `summary_points` (jsonb) - Key points as JSON array\r\n  - `is_active` (boolean) - Whether this is the current rulebook\r\n  - `display_order` (integer) - Display order\r\n  - `created_at` (timestamptz)\r\n  - `updated_at` (timestamptz)\r\n\r\n  ## Security\r\n  - Public can view rulebooks\r\n  - Only admins can create/update rulebooks\r\n*/\r\n\r\nCREATE TABLE IF NOT EXISTS rulebooks (\r\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\r\n  title text NOT NULL,\r\n  description text,\r\n  year integer NOT NULL,\r\n  category text NOT NULL,\r\n  pdf_url text NOT NULL,\r\n  summary_points jsonb,\r\n  is_active boolean DEFAULT true,\r\n  display_order integer DEFAULT 0,\r\n  created_at timestamptz DEFAULT now() NOT NULL,\r\n  updated_at timestamptz DEFAULT now() NOT NULL\r\n)","CREATE INDEX IF NOT EXISTS rulebooks_year_idx ON rulebooks(year DESC)","CREATE INDEX IF NOT EXISTS rulebooks_category_idx ON rulebooks(category)","CREATE INDEX IF NOT EXISTS rulebooks_active_idx ON rulebooks(is_active)","ALTER TABLE rulebooks ENABLE ROW LEVEL SECURITY","CREATE POLICY \\"Rulebooks are viewable by everyone\\"\r\n  ON rulebooks FOR SELECT\r\n  TO authenticated, anon\r\n  USING (true)","CREATE POLICY \\"Admins can create rulebooks\\"\r\n  ON rulebooks FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE POLICY \\"Admins can update rulebooks\\"\r\n  ON rulebooks FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE TRIGGER update_rulebooks_updated_at BEFORE UPDATE ON rulebooks\r\n  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}	add_rulebooks_table
20250930213125	{"/*\r\n  # Fix Security and Performance Issues\r\n\r\n  ## Changes\r\n  \r\n  1. **Add Missing Indexes for Foreign Keys**\r\n     - Add index on `competition_results.created_by`\r\n     - Add index on `events.event_director_id`\r\n     - Add index on `memberships.user_id`\r\n  \r\n  2. **Optimize RLS Policies**\r\n     - Replace `auth.uid()` with `(SELECT auth.uid())` in all policies\r\n     - This prevents re-evaluation for each row, improving performance at scale\r\n  \r\n  3. **Fix Function Search Path**\r\n     - Set immutable search_path for `update_updated_at_column` function\r\n  \r\n  ## Performance Impact\r\n  - Significantly improves query performance for foreign key lookups\r\n  - Reduces RLS policy evaluation overhead\r\n  - Ensures predictable function behavior\r\n*/\r\n\r\n-- =====================================================\r\n-- 1. ADD MISSING FOREIGN KEY INDEXES\r\n-- =====================================================\r\n\r\nCREATE INDEX IF NOT EXISTS competition_results_created_by_idx \r\n  ON competition_results(created_by)","CREATE INDEX IF NOT EXISTS events_event_director_id_idx \r\n  ON events(event_director_id)","CREATE INDEX IF NOT EXISTS memberships_user_id_idx \r\n  ON memberships(user_id)","-- =====================================================\r\n-- 2. FIX RLS POLICIES - OPTIMIZE AUTH FUNCTION CALLS\r\n-- =====================================================\r\n\r\n-- Drop existing policies\r\nDROP POLICY IF EXISTS \\"Users can update own profile\\" ON profiles","DROP POLICY IF EXISTS \\"Users can insert own profile\\" ON profiles","DROP POLICY IF EXISTS \\"Event directors can create events\\" ON events","DROP POLICY IF EXISTS \\"Event directors can update own events\\" ON events","DROP POLICY IF EXISTS \\"Users can view own registrations\\" ON event_registrations","DROP POLICY IF EXISTS \\"Event directors can update registrations\\" ON event_registrations","DROP POLICY IF EXISTS \\"Event directors and admins can create results\\" ON competition_results","DROP POLICY IF EXISTS \\"Event directors and admins can update results\\" ON competition_results","DROP POLICY IF EXISTS \\"Users can view own memberships\\" ON memberships","DROP POLICY IF EXISTS \\"Admins can create memberships\\" ON memberships","DROP POLICY IF EXISTS \\"Admins can update memberships\\" ON memberships","DROP POLICY IF EXISTS \\"Admins can create rulebooks\\" ON rulebooks","DROP POLICY IF EXISTS \\"Admins can update rulebooks\\" ON rulebooks","-- Recreate policies with optimized auth function calls\r\n\r\n-- PROFILES POLICIES\r\nCREATE POLICY \\"Users can update own profile\\"\r\n  ON profiles FOR UPDATE\r\n  TO authenticated\r\n  USING ((SELECT auth.uid()) = id)\r\n  WITH CHECK ((SELECT auth.uid()) = id)","CREATE POLICY \\"Users can insert own profile\\"\r\n  ON profiles FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK ((SELECT auth.uid()) = id)","-- EVENTS POLICIES\r\nCREATE POLICY \\"Event directors can create events\\"\r\n  ON events FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","CREATE POLICY \\"Event directors can update own events\\"\r\n  ON events FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = (SELECT auth.uid())))\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = (SELECT auth.uid())))\r\n    )\r\n  )","-- EVENT REGISTRATIONS POLICIES\r\nCREATE POLICY \\"Users can view own registrations\\"\r\n  ON event_registrations FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    user_id = (SELECT auth.uid()) OR\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","CREATE POLICY \\"Event directors can update registrations\\"\r\n  ON event_registrations FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","-- COMPETITION RESULTS POLICIES\r\nCREATE POLICY \\"Event directors and admins can create results\\"\r\n  ON competition_results FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","CREATE POLICY \\"Event directors and admins can update results\\"\r\n  ON competition_results FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role IN ('event_director', 'admin')\r\n    )\r\n  )","-- MEMBERSHIPS POLICIES\r\nCREATE POLICY \\"Users can view own memberships\\"\r\n  ON memberships FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    user_id = (SELECT auth.uid()) OR\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE POLICY \\"Admins can create memberships\\"\r\n  ON memberships FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE POLICY \\"Admins can update memberships\\"\r\n  ON memberships FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","-- RULEBOOKS POLICIES\r\nCREATE POLICY \\"Admins can create rulebooks\\"\r\n  ON rulebooks FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","CREATE POLICY \\"Admins can update rulebooks\\"\r\n  ON rulebooks FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = (SELECT auth.uid())\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","-- =====================================================\r\n-- 3. FIX FUNCTION SEARCH PATH\r\n-- =====================================================\r\n\r\n-- Drop triggers first\r\nDROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles","DROP TRIGGER IF EXISTS update_events_updated_at ON events","DROP TRIGGER IF EXISTS update_rulebooks_updated_at ON rulebooks","-- Drop and recreate the function with proper search_path\r\nDROP FUNCTION IF EXISTS update_updated_at_column() CASCADE","CREATE OR REPLACE FUNCTION update_updated_at_column()\r\nRETURNS TRIGGER\r\nSECURITY DEFINER\r\nSET search_path = public, pg_temp\r\nLANGUAGE plpgsql\r\nAS $$\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n$$","-- Recreate triggers\r\nCREATE TRIGGER update_profiles_updated_at \r\n  BEFORE UPDATE ON profiles\r\n  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()","CREATE TRIGGER update_events_updated_at \r\n  BEFORE UPDATE ON events\r\n  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()","CREATE TRIGGER update_rulebooks_updated_at \r\n  BEFORE UPDATE ON rulebooks\r\n  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}	fix_security_and_performance_issues_v2
20251021000001	{"-- Media Files Table\r\nCREATE TABLE IF NOT EXISTS media_files (\r\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\r\n  title TEXT NOT NULL,\r\n  description TEXT,\r\n  file_url TEXT NOT NULL,\r\n  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'pdf', 'document', 'other')),\r\n  file_size BIGINT NOT NULL DEFAULT 0,\r\n  mime_type TEXT NOT NULL,\r\n  dimensions TEXT,\r\n  is_external BOOLEAN DEFAULT FALSE,\r\n  tags TEXT[],\r\n  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,\r\n  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,\r\n  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL\r\n)","-- Create indexes\r\nCREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type)","CREATE INDEX IF NOT EXISTS idx_media_files_tags ON media_files USING GIN(tags)","CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at DESC)","-- Enable RLS\r\nALTER TABLE media_files ENABLE ROW LEVEL SECURITY","-- Allow anyone to read media files\r\nCREATE POLICY \\"Allow public read access to media files\\"\r\n  ON media_files\r\n  FOR SELECT\r\n  USING (true)","-- Allow admins to manage media files\r\nCREATE POLICY \\"Allow admins to manage media files\\"\r\n  ON media_files\r\n  FOR ALL\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","-- Site Settings Table\r\nCREATE TABLE IF NOT EXISTS site_settings (\r\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\r\n  setting_key TEXT UNIQUE NOT NULL,\r\n  setting_value TEXT NOT NULL,\r\n  setting_type TEXT NOT NULL DEFAULT 'text',\r\n  description TEXT,\r\n  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,\r\n  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL\r\n)","-- Create index\r\nCREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key)","-- Enable RLS\r\nALTER TABLE site_settings ENABLE ROW LEVEL SECURITY","-- Allow anyone to read settings\r\nCREATE POLICY \\"Allow public read access to site settings\\"\r\n  ON site_settings\r\n  FOR SELECT\r\n  USING (true)","-- Allow admins to manage settings\r\nCREATE POLICY \\"Allow admins to manage site settings\\"\r\n  ON site_settings\r\n  FOR ALL\r\n  USING (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )\r\n  WITH CHECK (\r\n    EXISTS (\r\n      SELECT 1 FROM profiles\r\n      WHERE profiles.id = auth.uid()\r\n      AND profiles.role = 'admin'\r\n    )\r\n  )","-- Insert default settings\r\nINSERT INTO site_settings (setting_key, setting_value, setting_type, description)\r\nVALUES\r\n  ('hero_image_urls', 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920', 'json', 'Homepage hero carousel images (JSON array)'),\r\n  ('hero_title', 'MECACARAUDIO.COM', 'text', 'Homepage hero title'),\r\n  ('hero_subtitle', 'The Premier Platform for Car Audio Competition Management', 'text', 'Homepage hero subtitle'),\r\n  ('hero_button_text', 'View Events', 'text', 'Homepage hero button text'),\r\n  ('hero_carousel_speed', '5000', 'number', 'Carousel transition interval in milliseconds'),\r\n  ('hero_carousel_direction', 'left', 'text', 'Carousel slide direction: left, right, top, bottom')\r\nON CONFLICT (setting_key) DO NOTHING","-- Update triggers\r\nCREATE TRIGGER update_media_files_updated_at\r\n  BEFORE UPDATE ON media_files\r\n  FOR EACH ROW\r\n  EXECUTE FUNCTION update_updated_at_column()","CREATE TRIGGER update_site_settings_updated_at\r\n  BEFORE UPDATE ON site_settings\r\n  FOR EACH ROW\r\n  EXECUTE FUNCTION update_updated_at_column()","-- Grant permissions\r\nGRANT ALL ON media_files TO authenticated","GRANT SELECT ON media_files TO anon","GRANT ALL ON site_settings TO authenticated","GRANT SELECT ON site_settings TO anon"}	add_media_and_settings
20251021000002	{"-- Create get_leaderboard function for Top 10 leaderboard\r\nCREATE OR REPLACE FUNCTION get_leaderboard()\r\nRETURNS TABLE (\r\n  competitor_id UUID,\r\n  competitor_name TEXT,\r\n  total_points INTEGER,\r\n  events_participated BIGINT,\r\n  first_place BIGINT,\r\n  second_place BIGINT,\r\n  third_place BIGINT\r\n)\r\nLANGUAGE plpgsql\r\nAS $$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    COALESCE(cr.competitor_id, gen_random_uuid()) as competitor_id,\r\n    cr.competitor_name,\r\n    SUM(cr.points_earned)::INTEGER as total_points,\r\n    COUNT(DISTINCT cr.event_id) as events_participated,\r\n    COUNT(CASE WHEN cr.placement = 1 THEN 1 END) as first_place,\r\n    COUNT(CASE WHEN cr.placement = 2 THEN 1 END) as second_place,\r\n    COUNT(CASE WHEN cr.placement = 3 THEN 1 END) as third_place\r\n  FROM competition_results cr\r\n  WHERE cr.competitor_name IS NOT NULL\r\n  GROUP BY\r\n    cr.competitor_id,\r\n    cr.competitor_name\r\n  ORDER BY total_points DESC\r\n  LIMIT 10;\r\nEND;\r\n$$","-- Grant execute permission to anon and authenticated users\r\nGRANT EXECUTE ON FUNCTION get_leaderboard() TO anon, authenticated"}	add_leaderboard_function
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 122, true);


--
-- Name: mikro_orm_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mikro_orm_migrations_id_seq', 5, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('supabase_functions.hooks_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: competition_classes competition_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_classes
    ADD CONSTRAINT competition_classes_pkey PRIMARY KEY (id);


--
-- Name: competition_formats competition_formats_abbreviation_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_formats
    ADD CONSTRAINT competition_formats_abbreviation_unique UNIQUE (abbreviation);


--
-- Name: competition_formats competition_formats_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_formats
    ADD CONSTRAINT competition_formats_name_key UNIQUE (name);


--
-- Name: competition_formats competition_formats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_formats
    ADD CONSTRAINT competition_formats_pkey PRIMARY KEY (id);


--
-- Name: competition_results competition_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_pkey PRIMARY KEY (id);


--
-- Name: event_hosting_requests event_hosting_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_hosting_requests
    ADD CONSTRAINT event_hosting_requests_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: mikro_orm_migrations mikro_orm_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mikro_orm_migrations
    ADD CONSTRAINT mikro_orm_migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_meca_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_meca_id_unique UNIQUE (meca_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rulebooks rulebooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rulebooks
    ADD CONSTRAINT rulebooks_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_year_key UNIQUE (year);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_member_id_key UNIQUE (team_id, member_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: competition_classes unique_class_per_season; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_classes
    ADD CONSTRAINT unique_class_per_season UNIQUE (abbreviation, format, season_id);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: iceberg_namespaces iceberg_namespaces_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id);


--
-- Name: iceberg_tables iceberg_tables_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: competition_results_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX competition_results_created_by_idx ON public.competition_results USING btree (created_by);


--
-- Name: events_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_date_idx ON public.events USING btree (event_date);


--
-- Name: events_event_director_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_event_director_id_idx ON public.events USING btree (event_director_id);


--
-- Name: events_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_status_idx ON public.events USING btree (status);


--
-- Name: idx_classes_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_active ON public.competition_classes USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_classes_format; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_format ON public.competition_classes USING btree (format);


--
-- Name: idx_classes_season; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_season ON public.competition_classes USING btree (season_id);


--
-- Name: idx_event_hosting_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_hosting_requests_created_at ON public.event_hosting_requests USING btree (created_at DESC);


--
-- Name: idx_event_hosting_requests_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_hosting_requests_email ON public.event_hosting_requests USING btree (email);


--
-- Name: idx_event_hosting_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_hosting_requests_status ON public.event_hosting_requests USING btree (status);


--
-- Name: idx_event_hosting_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_hosting_requests_user_id ON public.event_hosting_requests USING btree (user_id);


--
-- Name: idx_events_season; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_season ON public.events USING btree (season_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_from_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_from_user_id ON public.notifications USING btree (from_user_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_orders_member_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_member_id ON public.orders USING btree (member_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_rulebooks_season; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rulebooks_season ON public.rulebooks USING btree (season DESC);


--
-- Name: idx_rulebooks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rulebooks_status ON public.rulebooks USING btree (status);


--
-- Name: idx_seasons_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seasons_current ON public.seasons USING btree (is_current) WHERE (is_current = true);


--
-- Name: idx_seasons_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seasons_dates ON public.seasons USING btree (start_date, end_date);


--
-- Name: idx_seasons_next; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seasons_next ON public.seasons USING btree (is_next) WHERE (is_next = true);


--
-- Name: idx_seasons_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seasons_year ON public.seasons USING btree (year DESC);


--
-- Name: idx_site_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_settings_key ON public.site_settings USING btree (setting_key);


--
-- Name: idx_team_members_member_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_member_id ON public.team_members USING btree (member_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_teams_team_leader_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_team_leader_id ON public.teams USING btree (team_leader_id);


--
-- Name: memberships_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX memberships_user_id_idx ON public.memberships USING btree (user_id);


--
-- Name: registrations_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registrations_event_idx ON public.event_registrations USING btree (event_id);


--
-- Name: registrations_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registrations_user_idx ON public.event_registrations USING btree (user_id);


--
-- Name: results_competitor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX results_competitor_idx ON public.competition_results USING btree (competitor_id);


--
-- Name: results_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX results_event_idx ON public.competition_results USING btree (event_id);


--
-- Name: rulebooks_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rulebooks_active_idx ON public.rulebooks USING btree (is_active);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_iceberg_namespaces_bucket_id; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (bucket_id, name);


--
-- Name: idx_iceberg_tables_namespace_id; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (namespace_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: competition_classes update_classes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.competition_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: media_files update_media_files_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON public.media_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rulebooks update_rulebooks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rulebooks_updated_at BEFORE UPDATE ON public.rulebooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seasons update_seasons_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: competition_classes competition_classes_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_classes
    ADD CONSTRAINT competition_classes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: competition_results competition_results_competitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_competitor_id_fkey FOREIGN KEY (competitor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: competition_results competition_results_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: competition_results competition_results_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_hosting_requests event_hosting_requests_admin_responder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_hosting_requests
    ADD CONSTRAINT event_hosting_requests_admin_responder_id_fkey FOREIGN KEY (admin_responder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_hosting_requests event_hosting_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_hosting_requests
    ADD CONSTRAINT event_hosting_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: events events_event_director_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_event_director_id_fkey FOREIGN KEY (event_director_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: events events_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: media_files media_files_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: orders orders_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: site_settings site_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: iceberg_namespaces iceberg_namespaces_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_namespace_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES storage.iceberg_namespaces(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: event_hosting_requests Admins and users can update their own requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and users can update their own requests" ON public.event_hosting_requests FOR UPDATE USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: media_files Admins can create media files; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create media files" ON public.media_files FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: memberships Admins can create memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create memberships" ON public.memberships FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: rulebooks Admins can create rulebooks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create rulebooks" ON public.rulebooks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: seasons Admins can create seasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create seasons" ON public.seasons FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: site_settings Admins can create site settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create site settings" ON public.site_settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: competition_classes Admins can delete classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete classes" ON public.competition_classes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: event_hosting_requests Admins can delete event hosting requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete event hosting requests" ON public.event_hosting_requests FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: events Admins can delete events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: competition_formats Admins can delete formats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete formats" ON public.competition_formats FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: media_files Admins can delete media files; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete media files" ON public.media_files FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: memberships Admins can delete memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete memberships" ON public.memberships FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: profiles Admins can delete profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::public.user_role)))));


--
-- Name: rulebooks Admins can delete rulebooks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete rulebooks" ON public.rulebooks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: seasons Admins can delete seasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete seasons" ON public.seasons FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: site_settings Admins can delete site settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete site settings" ON public.site_settings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: teams Admins can delete teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: event_hosting_requests Admins can insert event hosting requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert event hosting requests" ON public.event_hosting_requests FOR INSERT WITH CHECK (true);


--
-- Name: teams Admins can manage teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage teams" ON public.teams FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: competition_classes Admins can modify classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can modify classes" ON public.competition_classes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: competition_formats Admins can modify formats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can modify formats" ON public.competition_formats FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: competition_classes Admins can update classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update classes" ON public.competition_classes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: competition_formats Admins can update formats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update formats" ON public.competition_formats FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: media_files Admins can update media files; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update media files" ON public.media_files FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: memberships Admins can update memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update memberships" ON public.memberships FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: rulebooks Admins can update rulebooks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update rulebooks" ON public.rulebooks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: seasons Admins can update seasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update seasons" ON public.seasons FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: site_settings Admins can update site settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role)))));


--
-- Name: event_registrations Anyone can create registrations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can create registrations" ON public.event_registrations FOR INSERT WITH CHECK (true);


--
-- Name: events Anyone can view events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);


--
-- Name: competition_formats Anyone can view formats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view formats" ON public.competition_formats FOR SELECT USING (true);


--
-- Name: media_files Anyone can view media files; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view media files" ON public.media_files FOR SELECT USING (true);


--
-- Name: profiles Anyone can view profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: competition_results Anyone can view results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view results" ON public.competition_results FOR SELECT USING (true);


--
-- Name: rulebooks Anyone can view rulebooks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view rulebooks" ON public.rulebooks FOR SELECT USING (true);


--
-- Name: seasons Anyone can view seasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);


--
-- Name: site_settings Anyone can view site settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: team_members Anyone can view team members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view team members" ON public.team_members FOR SELECT USING (true);


--
-- Name: teams Anyone can view teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);


--
-- Name: notifications Delete notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Delete notifications" ON public.notifications FOR DELETE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: competition_results Event directors and admins can create results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors and admins can create results" ON public.competition_results FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'event_director'::public.user_role]))))));


--
-- Name: event_registrations Event directors and admins can delete registrations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors and admins can delete registrations" ON public.event_registrations FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_registrations.event_id) AND (e.event_director_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: competition_results Event directors and admins can delete results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors and admins can delete results" ON public.competition_results FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'event_director'::public.user_role]))))));


--
-- Name: event_registrations Event directors and admins can update registrations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors and admins can update registrations" ON public.event_registrations FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_registrations.event_id) AND (e.event_director_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: competition_results Event directors and admins can update results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors and admins can update results" ON public.competition_results FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'event_director'::public.user_role]))))));


--
-- Name: events Event directors can create events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors can create events" ON public.events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'event_director'::public.user_role]))))));


--
-- Name: events Event directors can update their events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event directors can update their events" ON public.events FOR UPDATE USING (((event_director_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: notifications System can create notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: teams Team leaders can update their team; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team leaders can update their team" ON public.teams FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.member_id = ( SELECT auth.uid() AS uid)) AND (team_members.role = 'leader'::text)))));


--
-- Name: notifications Update notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Update notifications" ON public.notifications FOR UPDATE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::public.user_role))))));


--
-- Name: memberships Users can view own memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own memberships" ON public.memberships FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((member_id = ( SELECT auth.uid() AS uid)));


--
-- Name: event_registrations Users can view own registrations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own registrations" ON public.event_registrations FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_registrations.event_id) AND (e.event_director_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: event_hosting_requests Users can view their own event hosting requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own event hosting requests" ON public.event_hosting_requests FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'event_director'::public.user_role])))))));


--
-- Name: competition_classes View classes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "View classes" ON public.competition_classes FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: notifications View notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "View notifications" ON public.notifications FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::public.user_role))))));


--
-- Name: competition_classes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.competition_classes ENABLE ROW LEVEL SECURITY;

--
-- Name: competition_formats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.competition_formats ENABLE ROW LEVEL SECURITY;

--
-- Name: competition_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

--
-- Name: event_hosting_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.event_hosting_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: event_registrations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: media_files; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: rulebooks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rulebooks ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_namespaces; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.iceberg_namespaces ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_tables; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.iceberg_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA net; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO anon;
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT USAGE ON SCHEMA net TO service_role;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA storage TO anon;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA storage TO authenticated;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA storage TO service_role;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA storage TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: SCHEMA supabase_functions; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA supabase_functions TO postgres;
GRANT USAGE ON SCHEMA supabase_functions TO anon;
GRANT USAGE ON SCHEMA supabase_functions TO authenticated;
GRANT USAGE ON SCHEMA supabase_functions TO service_role;
GRANT ALL ON SCHEMA supabase_functions TO supabase_functions_admin;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA vault TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION get_leaderboard(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_leaderboard() TO anon;
GRANT ALL ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT ALL ON FUNCTION public.get_leaderboard() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION http_request(); Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

REVOKE ALL ON FUNCTION supabase_functions.http_request() FROM PUBLIC;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO postgres;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO anon;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO authenticated;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO service_role;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.flow_state TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.identities TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.instances TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.saml_providers TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.sessions TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.sso_domains TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.sso_providers TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT ON TABLE auth.users TO dashboard_user;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;


--
-- Name: TABLE competition_classes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.competition_classes TO anon;
GRANT ALL ON TABLE public.competition_classes TO authenticated;
GRANT ALL ON TABLE public.competition_classes TO service_role;


--
-- Name: TABLE competition_formats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.competition_formats TO anon;
GRANT ALL ON TABLE public.competition_formats TO authenticated;
GRANT ALL ON TABLE public.competition_formats TO service_role;


--
-- Name: TABLE competition_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.competition_results TO anon;
GRANT ALL ON TABLE public.competition_results TO authenticated;
GRANT ALL ON TABLE public.competition_results TO service_role;


--
-- Name: TABLE event_hosting_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.event_hosting_requests TO anon;
GRANT ALL ON TABLE public.event_hosting_requests TO authenticated;
GRANT ALL ON TABLE public.event_hosting_requests TO service_role;


--
-- Name: TABLE event_registrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.event_registrations TO anon;
GRANT ALL ON TABLE public.event_registrations TO authenticated;
GRANT ALL ON TABLE public.event_registrations TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE media_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.media_files TO anon;
GRANT ALL ON TABLE public.media_files TO authenticated;
GRANT ALL ON TABLE public.media_files TO service_role;


--
-- Name: TABLE memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.memberships TO anon;
GRANT ALL ON TABLE public.memberships TO authenticated;
GRANT ALL ON TABLE public.memberships TO service_role;


--
-- Name: TABLE mikro_orm_migrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mikro_orm_migrations TO anon;
GRANT ALL ON TABLE public.mikro_orm_migrations TO authenticated;
GRANT ALL ON TABLE public.mikro_orm_migrations TO service_role;


--
-- Name: SEQUENCE mikro_orm_migrations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mikro_orm_migrations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mikro_orm_migrations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mikro_orm_migrations_id_seq TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE rulebooks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rulebooks TO anon;
GRANT ALL ON TABLE public.rulebooks TO authenticated;
GRANT ALL ON TABLE public.rulebooks TO service_role;


--
-- Name: TABLE seasons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.seasons TO anon;
GRANT ALL ON TABLE public.seasons TO authenticated;
GRANT ALL ON TABLE public.seasons TO service_role;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.site_settings TO anon;
GRANT ALL ON TABLE public.site_settings TO authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_members TO anon;
GRANT ALL ON TABLE public.team_members TO authenticated;
GRANT ALL ON TABLE public.team_members TO service_role;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.teams TO anon;
GRANT ALL ON TABLE public.teams TO authenticated;
GRANT ALL ON TABLE public.teams TO service_role;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON TABLE storage.buckets TO anon;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON TABLE storage.buckets TO authenticated;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON TABLE storage.buckets TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE iceberg_namespaces; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.iceberg_namespaces TO service_role;
GRANT SELECT ON TABLE storage.iceberg_namespaces TO authenticated;
GRANT SELECT ON TABLE storage.iceberg_namespaces TO anon;


--
-- Name: TABLE iceberg_tables; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.iceberg_tables TO service_role;
GRANT SELECT ON TABLE storage.iceberg_tables TO authenticated;
GRANT SELECT ON TABLE storage.iceberg_tables TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON TABLE storage.objects TO anon;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON TABLE storage.objects TO authenticated;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION postgres;
GRANT ALL ON TABLE storage.objects TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE hooks; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON TABLE supabase_functions.hooks TO postgres;
GRANT ALL ON TABLE supabase_functions.hooks TO anon;
GRANT ALL ON TABLE supabase_functions.hooks TO authenticated;
GRANT ALL ON TABLE supabase_functions.hooks TO service_role;


--
-- Name: SEQUENCE hooks_id_seq; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO postgres;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO anon;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO service_role;


--
-- Name: TABLE migrations; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON TABLE supabase_functions.migrations TO postgres;
GRANT ALL ON TABLE supabase_functions.migrations TO anon;
GRANT ALL ON TABLE supabase_functions.migrations TO authenticated;
GRANT ALL ON TABLE supabase_functions.migrations TO service_role;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;
SET SESSION AUTHORIZATION postgres;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;
RESET SESSION AUTHORIZATION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict KDJnnRj6lnBTZCk8GFZ6FpcdwWcz7AcbQAZjT3eRGJD15TzhppkJIgxXXwNhSAR

