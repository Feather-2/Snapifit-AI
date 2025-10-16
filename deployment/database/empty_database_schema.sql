--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg22.04+1)

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

DROP PUBLICATION IF EXISTS supabase_realtime;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP TRIGGER IF EXISTS trigger_user_bans_updated_at ON public.user_bans;
DROP TRIGGER IF EXISTS trigger_update_user_profiles_modified ON public.user_profiles;
DROP TRIGGER IF EXISTS trigger_update_ai_memories_modified ON public.ai_memories;
DROP TRIGGER IF EXISTS trigger_ip_bans_updated_at ON public.ip_bans;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_key;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS public.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS public.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS public.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS public.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS public.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS public.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS public.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS public.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS public.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS public.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_trust_level;
DROP INDEX IF EXISTS public.idx_users_provider;
DROP INDEX IF EXISTS public.idx_users_linux_do_id;
DROP INDEX IF EXISTS public.idx_users_last_login;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_active;
DROP INDEX IF EXISTS public.idx_user_profiles_user_id;
DROP INDEX IF EXISTS public.idx_user_profiles_updated_at;
DROP INDEX IF EXISTS public.idx_user_bans_user_id;
DROP INDEX IF EXISTS public.idx_user_bans_type_severity;
DROP INDEX IF EXISTS public.idx_user_bans_severity;
DROP INDEX IF EXISTS public.idx_user_bans_is_active;
DROP INDEX IF EXISTS public.idx_user_bans_expires_at;
DROP INDEX IF EXISTS public.idx_user_bans_banned_at;
DROP INDEX IF EXISTS public.idx_user_bans_ban_type;
DROP INDEX IF EXISTS public.idx_user_bans_active_user;
DROP INDEX IF EXISTS public.idx_user_bans_active_expires;
DROP INDEX IF EXISTS public.idx_shared_keys_user_id;
DROP INDEX IF EXISTS public.idx_shared_keys_user;
DROP INDEX IF EXISTS public.idx_shared_keys_active;
DROP INDEX IF EXISTS public.idx_security_events_user_time;
DROP INDEX IF EXISTS public.idx_security_events_user_id;
DROP INDEX IF EXISTS public.idx_security_events_type_severity;
DROP INDEX IF EXISTS public.idx_security_events_severity;
DROP INDEX IF EXISTS public.idx_security_events_ip_created;
DROP INDEX IF EXISTS public.idx_security_events_ip_address;
DROP INDEX IF EXISTS public.idx_security_events_event_type;
DROP INDEX IF EXISTS public.idx_security_events_created_at;
DROP INDEX IF EXISTS public.idx_ip_bans_type_severity;
DROP INDEX IF EXISTS public.idx_ip_bans_severity;
DROP INDEX IF EXISTS public.idx_ip_bans_is_active;
DROP INDEX IF EXISTS public.idx_ip_bans_ip_address;
DROP INDEX IF EXISTS public.idx_ip_bans_expires_at;
DROP INDEX IF EXISTS public.idx_ip_bans_banned_at;
DROP INDEX IF EXISTS public.idx_ip_bans_ban_type;
DROP INDEX IF EXISTS public.idx_ip_bans_active_ip;
DROP INDEX IF EXISTS public.idx_ip_bans_active_expires;
DROP INDEX IF EXISTS public.idx_invite_configs_user_specific_active;
DROP INDEX IF EXISTS public.idx_invite_configs_user_id;
DROP INDEX IF EXISTS public.idx_invite_configs_default_active;
DROP INDEX IF EXISTS public.idx_invite_configs_active;
DROP INDEX IF EXISTS public.idx_invite_codes_code;
DROP INDEX IF EXISTS public.idx_invite_codes_active;
DROP INDEX IF EXISTS public.idx_daily_logs_user_id;
DROP INDEX IF EXISTS public.idx_daily_logs_user_date;
DROP INDEX IF EXISTS public.idx_daily_logs_last_modified;
DROP INDEX IF EXISTS public.idx_daily_logs_date;
DROP INDEX IF EXISTS public.idx_ai_memories_user_id;
DROP INDEX IF EXISTS public.idx_ai_memories_user_expert;
DROP INDEX IF EXISTS public.idx_ai_memories_last_updated;
DROP INDEX IF EXISTS public.idx_ai_memories_expert_id;
DROP INDEX IF EXISTS public.identities_user_id_idx;
DROP INDEX IF EXISTS public.identities_email_idx;
DROP INDEX IF EXISTS public.audit_logs_instance_id_idx;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
ALTER TABLE IF EXISTS ONLY supabase_migrations.seed_files DROP CONSTRAINT IF EXISTS seed_files_pkey;
ALTER TABLE IF EXISTS ONLY supabase_migrations.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_key;
ALTER TABLE IF EXISTS ONLY public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_date_unique;
ALTER TABLE IF EXISTS ONLY public.ai_memories DROP CONSTRAINT IF EXISTS ai_memories_user_expert_unique;
DROP TABLE IF EXISTS supabase_migrations.seed_files;
DROP TABLE IF EXISTS supabase_migrations.schema_migrations;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.system_configs;
DROP TABLE IF EXISTS public.sso_providers;
DROP TABLE IF EXISTS public.sso_domains;
DROP TABLE IF EXISTS public.shared_keys;
DROP TABLE IF EXISTS public.security_events_backup_20250610_173749;
DROP TABLE IF EXISTS public.security_events;
DROP TABLE IF EXISTS public.schema_migrations;
DROP TABLE IF EXISTS public.saml_relay_states;
DROP TABLE IF EXISTS public.saml_providers;
DROP SEQUENCE IF EXISTS public.refresh_tokens_id_seq;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP TABLE IF EXISTS public.mfa_challenges;
DROP TABLE IF EXISTS public.mfa_amr_claims;
DROP TABLE IF EXISTS public.ip_bans;
DROP VIEW IF EXISTS public.invite_configs_view;
DROP TABLE IF EXISTS public.invite_configs;
DROP TABLE IF EXISTS public.invite_codes;
DROP TABLE IF EXISTS public.instances;
DROP TABLE IF EXISTS public.identities;
DROP TABLE IF EXISTS public.daily_logs;
DROP TABLE IF EXISTS public.audit_log_entries;
DROP TABLE IF EXISTS public.ai_memories;
DROP VIEW IF EXISTS public.active_user_bans;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_bans;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS public.verify_user_credentials(p_identifier character varying, p_password_hash character varying);
DROP FUNCTION IF EXISTS public.validate_invite_code_format(code text);
DROP FUNCTION IF EXISTS public.validate_invite_code_checksum(code text);
DROP FUNCTION IF EXISTS public.upsert_user_profile(p_user_id uuid, p_weight numeric, p_height numeric, p_age integer, p_gender text, p_activity_level text, p_goal text, p_target_weight numeric, p_target_calories integer, p_notes text, p_professional_mode boolean, p_medical_history text, p_lifestyle text, p_health_awareness text);
DROP FUNCTION IF EXISTS public.upsert_oauth_user(p_provider_id character varying, p_provider_type character varying, p_email character varying, p_username character varying, p_display_name character varying, p_avatar_url text);
DROP FUNCTION IF EXISTS public.upsert_log_patch(p_user_id uuid, p_date date, p_log_data_patch jsonb, p_last_modified timestamp with time zone, p_based_on_modified timestamp with time zone);
DROP FUNCTION IF EXISTS public.upsert_ai_memories(p_user_id uuid, p_memories jsonb);
DROP FUNCTION IF EXISTS public.update_user_profiles_modified();
DROP FUNCTION IF EXISTS public.update_user_bans_updated_at();
DROP FUNCTION IF EXISTS public.update_ip_bans_updated_at();
DROP FUNCTION IF EXISTS public.update_ai_memories_modified();
DROP FUNCTION IF EXISTS public.schedule_security_event_enhancement();
DROP FUNCTION IF EXISTS public.reset_shared_keys_daily();
DROP FUNCTION IF EXISTS public.remove_log_entry(p_user_id uuid, p_date date, p_entry_type text, p_log_id text);
DROP FUNCTION IF EXISTS public.refresh_ai_memory_markers();
DROP FUNCTION IF EXISTS public.merge_arrays_by_log_id(existing_array jsonb, new_array jsonb, deleted_ids jsonb);
DROP FUNCTION IF EXISTS public.merge_arrays_by_log_id(existing_array jsonb, new_array jsonb);
DROP FUNCTION IF EXISTS public.mark_old_ai_memories();
DROP FUNCTION IF EXISTS public.log_limit_violation(p_user_id uuid, p_trust_level integer, p_attempted_usage integer, p_daily_limit integer, p_ip_address text, p_user_agent text);
DROP FUNCTION IF EXISTS public.jsonb_deep_merge(jsonb1 jsonb, jsonb2 jsonb);
DROP FUNCTION IF EXISTS public.is_valid_invite_code(code text);
DROP FUNCTION IF EXISTS public.is_user_banned(check_user_id uuid);
DROP FUNCTION IF EXISTS public.is_ip_banned(check_ip inet);
DROP FUNCTION IF EXISTS public.increment_shared_key_usage(p_user_id uuid, p_shared_key_id uuid, p_model_used text, p_api_endpoint text);
DROP FUNCTION IF EXISTS public.get_user_today_usage(p_user_id uuid, p_usage_type text);
DROP FUNCTION IF EXISTS public.get_user_shared_key_usage(p_user_id uuid, p_days integer);
DROP FUNCTION IF EXISTS public.get_user_profile(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_invite_config(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_ban_statistics();
DROP FUNCTION IF EXISTS public.get_user_ai_memories(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_ban_statistics();
DROP FUNCTION IF EXISTS public.get_ai_memory_statistics();
DROP FUNCTION IF EXISTS public.decrement_usage_count(p_user_id uuid, p_usage_type text);
DROP FUNCTION IF EXISTS public.create_user_with_password(p_username character varying, p_email character varying, p_password_hash character varying, p_display_name character varying, p_invite_code character varying);
DROP FUNCTION IF EXISTS public.correlate_user_security_events();
DROP FUNCTION IF EXISTS public.auto_unban_expired_users();
DROP FUNCTION IF EXISTS public.auto_unban_expired_ips();
DROP FUNCTION IF EXISTS public.atomic_usage_check_and_increment(p_user_id uuid, p_usage_type text, p_daily_limit integer);
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS public.one_time_token_type;
DROP TYPE IF EXISTS public.factor_type;
DROP TYPE IF EXISTS public.factor_status;
DROP TYPE IF EXISTS public.code_challenge_method;
DROP TYPE IF EXISTS public.aal_level;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS supabase_migrations;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);

--
-- Name: aal_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);

--
-- Name: code_challenge_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.code_challenge_method AS ENUM (
    's256',
    'plain'
);

--
-- Name: factor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.factor_status AS ENUM (
    'unverified',
    'verified'
);

--
-- Name: factor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);

--
-- Name: one_time_token_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
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

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';

--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
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

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
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

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';

--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
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

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';

--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
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

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';

--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
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

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';

--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
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
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';

--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
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

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
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

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
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

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
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

--
-- Name: atomic_usage_check_and_increment(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atomic_usage_check_and_increment(p_user_id uuid, p_usage_type text, p_daily_limit integer) RETURNS TABLE(allowed boolean, new_count integer)
    LANGUAGE plpgsql
    AS $$
      DECLARE
        current_count INTEGER := 0;
        new_count INTEGER := 0;
      BEGIN
        SELECT COALESCE(
          CASE
            WHEN (log_data->>p_usage_type) IS NULL THEN 0
            WHEN (log_data->>p_usage_type) = 'null' THEN 0
            ELSE (log_data->>p_usage_type)::int
          END,
          0
        )
        INTO current_count
        FROM daily_logs
        WHERE user_id = p_user_id AND date = CURRENT_DATE
        FOR UPDATE;

        current_count := COALESCE(current_count, 0);

        IF current_count >= p_daily_limit THEN
          RETURN QUERY SELECT FALSE, current_count;
          RETURN;
        END IF;

        new_count := current_count + 1;

        INSERT INTO daily_logs (user_id, date, log_data)
        VALUES (
          p_user_id,
          CURRENT_DATE,
          jsonb_build_object(p_usage_type, new_count)
        )
        ON CONFLICT (user_id, date)
        DO UPDATE SET
          log_data = COALESCE(daily_logs.log_data, '{}'::jsonb) || jsonb_build_object(
            p_usage_type,
            new_count
          ),
          last_modified = NOW();

        RETURN QUERY SELECT TRUE, new_count;
      END;
      $$;

--
-- Name: FUNCTION atomic_usage_check_and_increment(p_user_id uuid, p_usage_type text, p_daily_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.atomic_usage_check_and_increment(p_user_id uuid, p_usage_type text, p_daily_limit integer) IS '原子性使用量检查和递增';

--
-- Name: auto_unban_expired_ips(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_unban_expired_ips() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  unbanned_count INTEGER;
BEGIN
  -- 自动解封过期的IP
  UPDATE ip_bans 
  SET 
    is_active = FALSE,
    unbanned_at = NOW(),
    unban_reason = 'expired'
  WHERE 
    is_active = TRUE 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS unbanned_count = ROW_COUNT;
  
  -- 记录解封事件到安全日志
  IF unbanned_count > 0 THEN
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      description,
      metadata
    ) VALUES (
      '0.0.0.0'::INET,
      'suspicious_activity',
      'low',
      'Automatically unbanned expired IPs',
      jsonb_build_object('unbanned_count', unbanned_count, 'unban_reason', 'expired')
    );
  END IF;
  
  RETURN unbanned_count;
END;
$$;

--
-- Name: auto_unban_expired_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_unban_expired_users() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  unbanned_count INTEGER;
BEGIN
  -- 自动解封过期的用户
  UPDATE user_bans 
  SET 
    is_active = FALSE,
    unbanned_at = NOW(),
    unban_reason = 'expired'
  WHERE 
    is_active = TRUE 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS unbanned_count = ROW_COUNT;
  
  -- 记录解封事件到安全日志
  IF unbanned_count > 0 THEN
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      description,
      metadata
    ) VALUES (
      '0.0.0.0'::INET,
      'system_maintenance',
      'low',
      'Automatically unbanned expired users',
      jsonb_build_object('unbanned_count', unbanned_count, 'unban_reason', 'expired')
    );
  END IF;
  
  RETURN unbanned_count;
END;
$$;

--
-- Name: correlate_user_security_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.correlate_user_security_events() RETURNS TABLE(enhanced_count integer, correlation_method text, details text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    enhanced_by_session INTEGER := 0;
    enhanced_by_pattern INTEGER := 0;
    enhanced_by_proximity INTEGER := 0;
BEGIN
    -- 方法1: 基于会话时间关联
    -- 如果用户在某个IP上有已知活动，关联前后5分钟内相同IP的未知事件
    WITH user_sessions AS (
        SELECT DISTINCT 
            user_id, 
            ip_address, 
            created_at,
            created_at - INTERVAL '5 minutes' as window_start,
            created_at + INTERVAL '5 minutes' as window_end
        FROM security_events 
        WHERE user_id IS NOT NULL
    ),
    events_to_enhance AS (
        SELECT DISTINCT se.id, us.user_id
        FROM security_events se
        JOIN user_sessions us ON se.ip_address = us.ip_address
        WHERE se.user_id IS NULL
        AND se.created_at BETWEEN us.window_start AND us.window_end
    )
    UPDATE security_events 
    SET 
        user_id = ete.user_id,
        metadata = COALESCE(metadata, '{}'::jsonb) || 
                   jsonb_build_object(
                       'enhanced', true,
                       'enhanced_at', NOW(),
                       'enhancement_method', 'session_correlation',
                       'enhancement_reason', 'IP and time proximity to known user session'
                   )
    FROM events_to_enhance ete
    WHERE security_events.id = ete.id;
    
    GET DIAGNOSTICS enhanced_by_session = ROW_COUNT;
    
    -- 方法2: 基于IP使用模式关联
    -- 如果某个IP 90%以上的已知事件都属于同一用户，则关联该IP的未知事件
    WITH ip_user_patterns AS (
        SELECT 
            ip_address,
            user_id,
            COUNT(*) as event_count,
            COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY ip_address) as percentage
        FROM security_events 
        WHERE user_id IS NOT NULL
        GROUP BY ip_address, user_id
        HAVING COUNT(*) >= 3  -- 至少3个事件
    ),
    dominant_users AS (
        SELECT ip_address, user_id
        FROM ip_user_patterns
        WHERE percentage >= 90  -- 90%以上的事件属于该用户
    ),
    pattern_events_to_enhance AS (
        SELECT DISTINCT se.id, du.user_id
        FROM security_events se
        JOIN dominant_users du ON se.ip_address = du.ip_address
        WHERE se.user_id IS NULL
        AND se.created_at >= NOW() - INTERVAL '7 days'  -- 只处理最近7天的事件
    )
    UPDATE security_events 
    SET 
        user_id = pete.user_id,
        metadata = COALESCE(metadata, '{}'::jsonb) || 
                   jsonb_build_object(
                       'enhanced', true,
                       'enhanced_at', NOW(),
                       'enhancement_method', 'pattern_correlation',
                       'enhancement_reason', 'IP usage pattern indicates high probability user match'
                   )
    FROM pattern_events_to_enhance pete
    WHERE security_events.id = pete.id
    AND security_events.user_id IS NULL;  -- 确保不覆盖已有的关联
    
    GET DIAGNOSTICS enhanced_by_pattern = ROW_COUNT;
    
    -- 方法3: 基于时间邻近性关联
    -- 关联在同一IP上时间非常接近（1分钟内）的事件
    WITH proximity_correlations AS (
        SELECT DISTINCT
            se1.id as target_event_id,
            se2.user_id
        FROM security_events se1
        JOIN security_events se2 ON se1.ip_address = se2.ip_address
        WHERE se1.user_id IS NULL
        AND se2.user_id IS NOT NULL
        AND ABS(EXTRACT(EPOCH FROM (se1.created_at - se2.created_at))) <= 60  -- 1分钟内
        AND se1.created_at >= NOW() - INTERVAL '24 hours'  -- 只处理最近24小时
    )
    UPDATE security_events 
    SET 
        user_id = pc.user_id,
        metadata = COALESCE(metadata, '{}'::jsonb) || 
                   jsonb_build_object(
                       'enhanced', true,
                       'enhanced_at', NOW(),
                       'enhancement_method', 'proximity_correlation',
                       'enhancement_reason', 'Very close temporal proximity to known user event'
                   )
    FROM proximity_correlations pc
    WHERE security_events.id = pc.target_event_id
    AND security_events.user_id IS NULL;
    
    GET DIAGNOSTICS enhanced_by_proximity = ROW_COUNT;
    
    -- 返回结果
    RETURN QUERY VALUES 
        (enhanced_by_session, 'session_correlation', 'Events correlated based on session time windows'),
        (enhanced_by_pattern, 'pattern_correlation', 'Events correlated based on IP usage patterns'),
        (enhanced_by_proximity, 'proximity_correlation', 'Events correlated based on temporal proximity');
END;
$$;

--
-- Name: create_user_with_password(character varying, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_with_password(p_username character varying, p_email character varying, p_password_hash character varying, p_display_name character varying, p_invite_code character varying DEFAULT NULL::character varying) RETURNS TABLE(success boolean, user_id uuid, error text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id UUID;
  v_trust_level INTEGER := 0;
  v_role VARCHAR(50) := NULL;
  v_invite_code_id UUID;
  v_user_count INTEGER;
BEGIN
  -- 检查用户名和邮箱是否已存在
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Username already exists';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Email already exists';
    RETURN;
  END IF;

  -- 检查是否是第一个用户
  SELECT COUNT(*) INTO v_user_count FROM users;
  IF v_user_count = 0 THEN
    v_trust_level := 4;
    v_role := 'super_admin';
    RAISE NOTICE '第一个注册用户 % 已设置为超级管理员', p_username;
  ELSE
    -- 处理邀请码
    IF p_invite_code IS NOT NULL THEN
      SELECT id INTO v_invite_code_id
      FROM invite_codes
      WHERE code = UPPER(p_invite_code)
        AND is_active = TRUE
        AND used_by IS NULL
        AND (expires_at IS NULL OR expires_at > NOW());

      IF v_invite_code_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invite code';
        RETURN;
      END IF;

      v_trust_level := 3;
    END IF;
  END IF;

  -- 创建用户
  INSERT INTO users (
    username, email, password_hash, display_name, trust_level, role,
    provider_type, is_active, is_silenced, email_verified,
    created_at, updated_at
  ) VALUES (
    p_username, p_email, p_password_hash, p_display_name, v_trust_level, v_role,
    'credentials', TRUE, FALSE, FALSE,
    NOW(), NOW()
  ) RETURNING id INTO v_user_id;

  -- 处理邀请码使用
  IF v_invite_code_id IS NOT NULL THEN
    UPDATE invite_codes
    SET used_by = v_user_id, used_at = NOW(), is_active = FALSE
    WHERE id = v_invite_code_id;
  END IF;

  -- 为超级管理员创建配置
  IF v_role = 'super_admin' THEN
    INSERT INTO invite_configs (
      user_id, interval_days, codes_per_batch, max_total_codes,
      is_active, created_by, created_at, updated_at
    ) VALUES (
      v_user_id, 1, 10, 1000,
      TRUE, v_user_id, NOW(), NOW()
    );
    RAISE NOTICE '已为超级管理员创建默认邀请码配置';
  END IF;

  RETURN QUERY SELECT TRUE, v_user_id, NULL::TEXT;
END;
$$;

--
-- Name: decrement_usage_count(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_usage_count(p_user_id uuid, p_usage_type text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_count INTEGER := 0;
  new_count INTEGER := 0;
BEGIN
  SELECT COALESCE((log_data->>p_usage_type)::int, 0)
  INTO current_count
  FROM daily_logs
  WHERE user_id = p_user_id AND date = CURRENT_DATE
  FOR UPDATE;

  new_count := GREATEST(current_count - 1, 0);

  UPDATE daily_logs
  SET
    log_data = COALESCE(log_data, '{}'::jsonb) || jsonb_build_object(p_usage_type, new_count),
    last_modified = NOW()
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN new_count;
END;
$$;

--
-- Name: FUNCTION decrement_usage_count(p_user_id uuid, p_usage_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.decrement_usage_count(p_user_id uuid, p_usage_type text) IS '使用量回滚函数';

--
-- Name: get_ai_memory_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_memory_statistics() RETURNS TABLE(total_memories bigint, old_memories bigint, marked_memories bigint, unmarked_old_memories bigint, recent_memories bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_memories,
    COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days') as old_memories,
    COUNT(*) FILTER (WHERE content LIKE '[该内容距今时间较长，可能会有更新]%') as marked_memories,
    COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days' AND content NOT LIKE '[该内容距今时间较长，可能会有更新]%') as unmarked_old_memories,
    COUNT(*) FILTER (WHERE last_updated > NOW() - INTERVAL '7 days') as recent_memories
  FROM ai_memories;
END;
$$;

--
-- Name: FUNCTION get_ai_memory_statistics(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_ai_memory_statistics() IS '获取AI记忆的统计信息';

--
-- Name: get_ban_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ban_statistics() RETURNS TABLE(total_active bigint, total_expired bigint, manual_bans bigint, automatic_bans bigint, recent_bans bigint, by_severity jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
  one_day_ago TIMESTAMP WITH TIME ZONE;
BEGIN
  one_day_ago := NOW() - INTERVAL '24 hours';
  
  -- 总活跃封禁数
  SELECT COUNT(*) INTO total_active
  FROM ip_bans 
  WHERE is_active = TRUE;
  
  -- 总过期封禁数
  SELECT COUNT(*) INTO total_expired
  FROM ip_bans 
  WHERE is_active = FALSE;
  
  -- 手动封禁数
  SELECT COUNT(*) INTO manual_bans
  FROM ip_bans 
  WHERE ban_type = 'manual';
  
  -- 自动封禁数
  SELECT COUNT(*) INTO automatic_bans
  FROM ip_bans 
  WHERE ban_type = 'automatic';
  
  -- 最近24小时封禁数
  SELECT COUNT(*) INTO recent_bans
  FROM ip_bans 
  WHERE banned_at >= one_day_ago;
  
  -- 按严重程度统计
  SELECT jsonb_object_agg(severity, ban_count) INTO by_severity
  FROM (
    SELECT severity, COUNT(*) as ban_count
    FROM ip_bans
    WHERE is_active = TRUE
    GROUP BY severity
  ) t;
  
  RETURN QUERY SELECT 
    get_ban_statistics.total_active,
    get_ban_statistics.total_expired,
    get_ban_statistics.manual_bans,
    get_ban_statistics.automatic_bans,
    get_ban_statistics.recent_bans,
    get_ban_statistics.by_severity;
END;
$$;

--
-- Name: get_user_ai_memories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_ai_memories(p_user_id uuid) RETURNS TABLE(expert_id text, content text, version integer, last_updated timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.expert_id::TEXT,
    am.content,
    am.version,
    am.last_updated
  FROM ai_memories am
  WHERE am.user_id = p_user_id
  ORDER BY am.last_updated DESC;
END;
$$;

--
-- Name: get_user_ban_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_ban_statistics() RETURNS TABLE(total_active bigint, total_expired bigint, manual_bans bigint, automatic_bans bigint, recent_bans bigint, by_severity jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
  one_day_ago TIMESTAMP WITH TIME ZONE;
BEGIN
  one_day_ago := NOW() - INTERVAL '24 hours';
  
  -- 总活跃封禁数
  SELECT COUNT(*) INTO total_active
  FROM user_bans 
  WHERE is_active = TRUE;
  
  -- 总过期封禁数
  SELECT COUNT(*) INTO total_expired
  FROM user_bans 
  WHERE is_active = FALSE;
  
  -- 手动封禁数
  SELECT COUNT(*) INTO manual_bans
  FROM user_bans 
  WHERE ban_type = 'manual';
  
  -- 自动封禁数
  SELECT COUNT(*) INTO automatic_bans
  FROM user_bans 
  WHERE ban_type = 'automatic';
  
  -- 最近24小时封禁数
  SELECT COUNT(*) INTO recent_bans
  FROM user_bans 
  WHERE banned_at >= one_day_ago;
  
  -- 按严重程度统计
  SELECT jsonb_object_agg(severity, ban_count) INTO by_severity
  FROM (
    SELECT severity, COUNT(*) as ban_count
    FROM user_bans
    WHERE is_active = TRUE
    GROUP BY severity
  ) t;
  
  RETURN QUERY SELECT 
    get_user_ban_statistics.total_active,
    get_user_ban_statistics.total_expired,
    get_user_ban_statistics.manual_bans,
    get_user_ban_statistics.automatic_bans,
    get_user_ban_statistics.recent_bans,
    get_user_ban_statistics.by_severity;
END;
$$;

--
-- Name: get_user_invite_config(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_invite_config(p_user_id uuid) RETURNS TABLE(config_id uuid, interval_days integer, codes_per_batch integer, max_total_codes integer, config_type text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 首先尝试获取用户特定配置
  RETURN QUERY
  SELECT 
    ic.id,
    ic.interval_days,
    ic.codes_per_batch,
    ic.max_total_codes,
    'user_specific'::TEXT
  FROM invite_configs ic
  WHERE ic.user_id = p_user_id 
    AND ic.is_active = TRUE
  LIMIT 1;

  -- 如果没有找到用户特定配置，返回全局默认配置
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      ic.id,
      ic.interval_days,
      ic.codes_per_batch,
      ic.max_total_codes,
      'global_default'::TEXT
    FROM invite_configs ic
    WHERE ic.user_id IS NULL 
      AND ic.is_active = TRUE
    LIMIT 1;
  END IF;

  -- 如果都没有找到，返回硬编码默认值
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID,
      7::INTEGER,
      5::INTEGER,
      50::INTEGER,
      'hardcoded_default'::TEXT;
  END IF;
END;
$$;

--
-- Name: FUNCTION get_user_invite_config(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_invite_config(p_user_id uuid) IS '获取用户的有效邀请码配置，按优先级返回';

--
-- Name: get_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_profile(p_user_id uuid) RETURNS TABLE(weight numeric, height numeric, age integer, gender text, activity_level text, goal text, target_weight numeric, target_calories integer, notes text, professional_mode boolean, medical_history text, lifestyle text, health_awareness text, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.weight,
    up.height,
    up.age,
    up.gender::TEXT,
    up.activity_level::TEXT,
    up.goal::TEXT,
    up.target_weight,
    up.target_calories,
    up.notes,
    up.professional_mode,
    up.medical_history,
    up.lifestyle,
    up.health_awareness,
    up.updated_at
  FROM user_profiles up
  WHERE up.user_id = p_user_id;
END;
$$;

--
-- Name: get_user_shared_key_usage(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_shared_key_usage(p_user_id uuid, p_days integer DEFAULT 7) RETURNS TABLE(date date, shared_key_usage jsonb, total_api_calls integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.date,
    COALESCE(dl.log_data->'shared_key_usage', '{}'::jsonb) as shared_key_usage,
    COALESCE((dl.log_data->>'api_call_count')::int, 0) as total_api_calls
  FROM daily_logs dl
  WHERE dl.user_id = p_user_id
    AND dl.date >= CURRENT_DATE - (p_days - 1)
    AND dl.date <= CURRENT_DATE
  ORDER BY dl.date DESC;
END;
$$;

--
-- Name: FUNCTION get_user_shared_key_usage(p_user_id uuid, p_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_shared_key_usage(p_user_id uuid, p_days integer) IS '获取用户的共享Key使用历史';

--
-- Name: get_user_today_usage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_today_usage(p_user_id uuid, p_usage_type text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  usage_count INTEGER := 0;
BEGIN
  SELECT COALESCE((log_data->>p_usage_type)::int, 0)
  INTO usage_count
  FROM daily_logs
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN COALESCE(usage_count, 0);
END;
$$;

--
-- Name: increment_shared_key_usage(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_shared_key_usage(p_user_id uuid, p_shared_key_id uuid, p_model_used text, p_api_endpoint text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_data JSONB;
  shared_key_usage JSONB;
  key_stats JSONB;
BEGIN
  -- 获取当前的 daily_logs 数据
  SELECT COALESCE(log_data, '{}'::jsonb)
  INTO current_data
  FROM daily_logs
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  -- 如果没有记录，初始化为空对象
  IF current_data IS NULL THEN
    current_data := '{}'::jsonb;
  END IF;

  -- 获取或初始化 shared_key_usage 对象
  shared_key_usage := COALESCE(current_data->'shared_key_usage', '{}'::jsonb);

  -- 获取或初始化特定Key的统计
  key_stats := COALESCE(shared_key_usage->p_shared_key_id::text, '{
    "total_calls": 0,
    "successful_calls": 0,
    "models_used": {},
    "endpoints_used": {},
    "last_used_at": null
  }'::jsonb);

  -- 更新统计数据
  key_stats := jsonb_set(key_stats, '{total_calls}',
    to_jsonb((key_stats->>'total_calls')::int + 1));

  key_stats := jsonb_set(key_stats, '{successful_calls}',
    to_jsonb((key_stats->>'successful_calls')::int + 1));

  key_stats := jsonb_set(key_stats, '{last_used_at}',
    to_jsonb(NOW()::text));

  -- 更新模型使用统计
  key_stats := jsonb_set(key_stats,
    ARRAY['models_used', p_model_used],
    to_jsonb(COALESCE((key_stats->'models_used'->>p_model_used)::int, 0) + 1));

  -- 更新端点使用统计
  key_stats := jsonb_set(key_stats,
    ARRAY['endpoints_used', p_api_endpoint],
    to_jsonb(COALESCE((key_stats->'endpoints_used'->>p_api_endpoint)::int, 0) + 1));

  -- 更新 shared_key_usage
  shared_key_usage := jsonb_set(shared_key_usage,
    ARRAY[p_shared_key_id::text],
    key_stats);

  -- 更新 current_data
  current_data := jsonb_set(current_data, '{shared_key_usage}', shared_key_usage);

  -- 同时增加总的 api_call_count
  current_data := jsonb_set(current_data, '{api_call_count}',
    to_jsonb(COALESCE((current_data->>'api_call_count')::int, 0) + 1));

  -- 更新或插入到 daily_logs
  INSERT INTO daily_logs (user_id, date, log_data)
  VALUES (p_user_id, CURRENT_DATE, current_data)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    log_data = EXCLUDED.log_data,
    last_modified = NOW();

END;
$$;

--
-- Name: FUNCTION increment_shared_key_usage(p_user_id uuid, p_shared_key_id uuid, p_model_used text, p_api_endpoint text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.increment_shared_key_usage(p_user_id uuid, p_shared_key_id uuid, p_model_used text, p_api_endpoint text) IS '增加用户的共享Key使用统计';

--
-- Name: is_ip_banned(inet); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ip_banned(check_ip inet) RETURNS TABLE(is_banned boolean, ban_id uuid, reason text, severity text, banned_at timestamp with time zone, expires_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 首先自动解封过期的IP
  PERFORM auto_unban_expired_ips();
  
  -- 检查IP是否被封禁
  RETURN QUERY
  SELECT 
    TRUE as is_banned,
    ib.id as ban_id,
    ib.reason,
    ib.severity,
    ib.banned_at,
    ib.expires_at
  FROM ip_bans ib
  WHERE ib.ip_address = check_ip 
    AND ib.is_active = TRUE
  LIMIT 1;
  
  -- 如果没有找到封禁记录，返回未封禁状态
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

--
-- Name: is_user_banned(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_banned(check_user_id uuid) RETURNS TABLE(is_banned boolean, ban_id uuid, reason text, severity text, banned_at timestamp with time zone, expires_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 首先自动解封过期的用户
  PERFORM auto_unban_expired_users();
  
  -- 检查用户是否被封禁
  RETURN QUERY
  SELECT 
    TRUE as is_banned,
    ub.id as ban_id,
    ub.reason,
    ub.severity,
    ub.banned_at,
    ub.expires_at
  FROM user_bans ub
  WHERE ub.user_id = check_user_id 
    AND ub.is_active = TRUE
  LIMIT 1;
  
  -- 如果没有找到封禁记录，返回未封禁状态
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

--
-- Name: is_valid_invite_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_valid_invite_code(code text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
  BEGIN
    RETURN validate_invite_code_format(code) AND validate_invite_code_checksum(code);
  END;
  $$;

--
-- Name: FUNCTION is_valid_invite_code(code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_valid_invite_code(code text) IS '综合验证邀请码格式和校验位';

--
-- Name: jsonb_deep_merge(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_deep_merge(jsonb1 jsonb, jsonb2 jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  result JSONB;
  v JSONB;
  k TEXT;
BEGIN
  IF jsonb1 IS NULL THEN RETURN jsonb2; END IF;
  IF jsonb2 IS NULL THEN RETURN jsonb1; END IF;

  result := jsonb1;
  FOR k, v IN SELECT * FROM jsonb_each(jsonb2) LOOP
    IF result ? k AND jsonb_typeof(result->k) = 'object' AND jsonb_typeof(v) = 'object' THEN
      result := jsonb_set(result, ARRAY[k], jsonb_deep_merge(result->k, v));
    ELSE
      result := result || jsonb_build_object(k, v);
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

--
-- Name: FUNCTION jsonb_deep_merge(jsonb1 jsonb, jsonb2 jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.jsonb_deep_merge(jsonb1 jsonb, jsonb2 jsonb) IS '递归深度合并两个JSONB对象';

--
-- Name: log_limit_violation(uuid, integer, integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_limit_violation(p_user_id uuid, p_trust_level integer, p_attempted_usage integer, p_daily_limit integer, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO security_events (
    user_id,
    ip_address,
    user_agent,
    event_type,
    severity,
    description,
    metadata
  ) VALUES (
    p_user_id,
    COALESCE(p_ip_address::INET, '0.0.0.0'::INET),
    p_user_agent,
    'rate_limit_exceeded',
    CASE 
      WHEN p_attempted_usage > p_daily_limit * 2 THEN 'high'
      WHEN p_attempted_usage > p_daily_limit * 1.5 THEN 'medium'
      ELSE 'low'
    END,
    FORMAT('User exceeded daily limit: attempted %s, limit %s (trust level %s)', 
           p_attempted_usage, p_daily_limit, p_trust_level),
    jsonb_build_object(
      'attempted_usage', p_attempted_usage,
      'daily_limit', p_daily_limit,
      'trust_level', p_trust_level,
      'excess_amount', p_attempted_usage - p_daily_limit
    )
  );
END;
$$;

--
-- Name: mark_old_ai_memories(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_old_ai_memories() RETURNS TABLE(marked_count integer, details text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  marked_count INTEGER := 0;
BEGIN
  -- 标记30天前未更新的记忆，但内容还没有标记的
  UPDATE ai_memories 
  SET 
    content = CASE 
      WHEN content NOT LIKE '[该内容距今时间较长，可能会有更新]%' 
      THEN '[该内容距今时间较长，可能会有更新] ' || content
      ELSE content
    END,
    version = version + 1,
    last_updated = NOW()
  WHERE last_updated < NOW() - INTERVAL '30 days'
    AND content NOT LIKE '[该内容距今时间较长，可能会有更新]%';
  
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  
  -- 记录操作到安全日志
  IF marked_count > 0 THEN
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      description,
      metadata
    ) VALUES (
      '0.0.0.0'::INET,
      'system_maintenance',
      'low',
      'Marked old AI memories with time warning',
      jsonb_build_object(
        'marked_count', marked_count,
        'operation', 'mark_old_memories',
        'automated', true,
        'scheduled_at', NOW()
      )
    );
  END IF;
  
  RETURN QUERY SELECT marked_count, 
    CASE 
      WHEN marked_count > 0 THEN 'Successfully marked ' || marked_count || ' old AI memories'
      ELSE 'No old AI memories found to mark'
    END;
END;
$$;

--
-- Name: FUNCTION mark_old_ai_memories(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.mark_old_ai_memories() IS '标记30天前未更新的AI记忆，而不是删除它们';

--
-- Name: merge_arrays_by_log_id(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_arrays_by_log_id(existing_array jsonb, new_array jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  existing_item JSONB;
  new_item JSONB;
  existing_ids TEXT[];
  new_ids TEXT[];
  all_ids TEXT[];
  item_id TEXT;
BEGIN
  IF existing_array IS NULL OR jsonb_array_length(existing_array) = 0 THEN
    RETURN COALESCE(new_array, '[]'::jsonb);
  END IF;

  IF new_array IS NULL OR jsonb_array_length(new_array) = 0 THEN
    RETURN existing_array;
  END IF;

  SELECT array_agg(DISTINCT item->>'log_id') INTO existing_ids
  FROM jsonb_array_elements(existing_array) AS item
  WHERE item->>'log_id' IS NOT NULL;

  SELECT array_agg(DISTINCT item->>'log_id') INTO new_ids
  FROM jsonb_array_elements(new_array) AS item
  WHERE item->>'log_id' IS NOT NULL;

  SELECT array_agg(DISTINCT unnest) INTO all_ids
  FROM unnest(COALESCE(existing_ids, ARRAY[]::TEXT[]) || COALESCE(new_ids, ARRAY[]::TEXT[])) AS unnest;

  FOR item_id IN SELECT unnest(COALESCE(all_ids, ARRAY[]::TEXT[]))
  LOOP
    SELECT item INTO new_item
    FROM jsonb_array_elements(new_array) AS item
    WHERE item->>'log_id' = item_id
    LIMIT 1;

    IF new_item IS NOT NULL THEN
      result := result || jsonb_build_array(new_item);
    ELSE
      SELECT item INTO existing_item
      FROM jsonb_array_elements(existing_array) AS item
      WHERE item->>'log_id' = item_id
      LIMIT 1;

      IF existing_item IS NOT NULL THEN
        result := result || jsonb_build_array(existing_item);
      END IF;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

--
-- Name: FUNCTION merge_arrays_by_log_id(existing_array jsonb, new_array jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.merge_arrays_by_log_id(existing_array jsonb, new_array jsonb) IS '智能合并数组，基于log_id去重';

--
-- Name: merge_arrays_by_log_id(jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_arrays_by_log_id(existing_array jsonb, new_array jsonb, deleted_ids jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  existing_item JSONB;
  new_item JSONB;
  existing_ids TEXT[];
  new_ids TEXT[];
  deleted_ids_array TEXT[];
  all_ids TEXT[];
  item_id TEXT;
BEGIN
  -- 如果任一数组为空，返回另一个（但要过滤已删除的）
  IF existing_array IS NULL OR jsonb_array_length(existing_array) = 0 THEN
    IF new_array IS NULL OR jsonb_array_length(new_array) = 0 THEN
      RETURN '[]'::jsonb;
    END IF;
    -- 过滤已删除的条目
    IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
      SELECT array_agg(value::text) INTO deleted_ids_array
      FROM jsonb_array_elements_text(deleted_ids);

      SELECT jsonb_agg(item)
      INTO result
      FROM jsonb_array_elements(new_array) AS item
      WHERE NOT (deleted_ids_array @> ARRAY[item->>'log_id']);

      RETURN COALESCE(result, '[]'::jsonb);
    END IF;
    RETURN new_array;
  END IF;

  IF new_array IS NULL OR jsonb_array_length(new_array) = 0 THEN
    -- 过滤已删除的条目
    IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
      SELECT array_agg(value::text) INTO deleted_ids_array
      FROM jsonb_array_elements_text(deleted_ids);

      SELECT jsonb_agg(item)
      INTO result
      FROM jsonb_array_elements(existing_array) AS item
      WHERE NOT (deleted_ids_array @> ARRAY[item->>'log_id']);

      RETURN COALESCE(result, '[]'::jsonb);
    END IF;
    RETURN existing_array;
  END IF;

  -- 获取已删除的ID列表
  IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
    SELECT array_agg(value::text) INTO deleted_ids_array
    FROM jsonb_array_elements_text(deleted_ids);
  ELSE
    deleted_ids_array := ARRAY[]::TEXT[];
  END IF;

  -- 获取现有和新数组的所有ID
  SELECT array_agg(item->>'log_id') INTO existing_ids
  FROM jsonb_array_elements(existing_array) AS item
  WHERE NOT (deleted_ids_array @> ARRAY[item->>'log_id']);

  SELECT array_agg(item->>'log_id') INTO new_ids
  FROM jsonb_array_elements(new_array) AS item
  WHERE NOT (deleted_ids_array @> ARRAY[item->>'log_id']);

  -- 合并所有唯一ID
  SELECT array_agg(DISTINCT id) INTO all_ids
  FROM (
    SELECT unnest(COALESCE(existing_ids, ARRAY[]::TEXT[])) AS id
    UNION
    SELECT unnest(COALESCE(new_ids, ARRAY[]::TEXT[]))
  ) AS combined_ids;

  -- 为每个ID选择最新版本
  FOR item_id IN SELECT unnest(COALESCE(all_ids, ARRAY[]::TEXT[]))
  LOOP
    -- 跳过已删除的条目
    IF deleted_ids_array @> ARRAY[item_id] THEN
      CONTINUE;
    END IF;

    -- 优先选择新数组中的项目
    SELECT item INTO new_item
    FROM jsonb_array_elements(new_array) AS item
    WHERE item->>'log_id' = item_id
    LIMIT 1;

    IF new_item IS NOT NULL THEN
      result := result || jsonb_build_array(new_item);
    ELSE
      -- 如果新数组中没有，使用现有数组中的
      SELECT item INTO existing_item
      FROM jsonb_array_elements(existing_array) AS item
      WHERE item->>'log_id' = item_id
      LIMIT 1;

      IF existing_item IS NOT NULL THEN
        result := result || jsonb_build_array(existing_item);
      END IF;
    END IF;

    -- 重置变量
    new_item := NULL;
    existing_item := NULL;
  END LOOP;

  RETURN result;
END;
$$;

--
-- Name: refresh_ai_memory_markers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_ai_memory_markers() RETURNS TABLE(refreshed_count integer, details text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  refreshed_count INTEGER := 0;
BEGIN
  -- 移除最近7天内更新的记忆的旧标记
  UPDATE ai_memories 
  SET 
    content = REPLACE(content, '[该内容距今时间较长，可能会有更新] ', ''),
    version = version + 1
  WHERE content LIKE '[该内容距今时间较长，可能会有更新]%'
    AND last_updated > NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS refreshed_count = ROW_COUNT;
  
  -- 记录操作到安全日志
  IF refreshed_count > 0 THEN
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      description,
      metadata
    ) VALUES (
      '0.0.0.0'::INET,
      'system_maintenance',
      'low',
      'Refreshed AI memory markers for recently updated memories',
      jsonb_build_object(
        'refreshed_count', refreshed_count,
        'operation', 'refresh_memory_markers',
        'automated', true,
        'scheduled_at', NOW()
      )
    );
  END IF;
  
  RETURN QUERY SELECT refreshed_count,
    CASE 
      WHEN refreshed_count > 0 THEN 'Successfully refreshed ' || refreshed_count || ' AI memory markers'
      ELSE 'No AI memory markers found to refresh'
    END;
END;
$$;

--
-- Name: FUNCTION refresh_ai_memory_markers(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_ai_memory_markers() IS '移除最近更新的AI记忆的旧标记';

--
-- Name: remove_log_entry(uuid, date, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_log_entry(p_user_id uuid, p_date date, p_entry_type text, p_log_id text) RETURNS TABLE(success boolean, entries_remaining integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_data JSONB;
  updated_array JSONB;
  field_name TEXT;
BEGIN
  IF p_entry_type = 'food' THEN
    field_name := 'foodEntries';
  ELSIF p_entry_type = 'exercise' THEN
    field_name := 'exerciseEntries';
  ELSE
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  SELECT log_data INTO current_data
  FROM daily_logs
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF current_data IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  SELECT jsonb_agg(item) INTO updated_array
  FROM jsonb_array_elements(current_data->field_name) AS item
  WHERE item->>'log_id' != p_log_id;

  UPDATE daily_logs
  SET
    log_data = jsonb_set(log_data, ('{' || field_name || '}')::text[], COALESCE(updated_array, '[]'::jsonb)),
    last_modified = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  RETURN QUERY SELECT TRUE, COALESCE(jsonb_array_length(updated_array), 0);
END;
$$;

--
-- Name: FUNCTION remove_log_entry(p_user_id uuid, p_date date, p_entry_type text, p_log_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.remove_log_entry(p_user_id uuid, p_date date, p_entry_type text, p_log_id text) IS '安全删除日志条目';

--
-- Name: reset_shared_keys_daily(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_shared_keys_daily() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- 重置所有活跃共享密钥的今日使用量
  UPDATE shared_keys 
  SET usage_count_today = 0, 
      updated_at = NOW() 
  WHERE is_active = true 
    AND usage_count_today > 0;
  
  -- 获取重置的数量
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- 简单的日志记录（使用RAISE NOTICE而不是插入表）
  RAISE NOTICE 'Daily shared keys reset completed. Reset % keys at %', reset_count, NOW();
  
  -- 可选：如果security_events表存在，则记录
  BEGIN
    INSERT INTO security_events (
      event_type, 
      severity, 
      details
    ) VALUES (
      'DAILY_SHARED_KEYS_RESET',
      1,
      jsonb_build_object(
        'reset_count', reset_count,
        'timestamp', NOW()
      )
    );
  EXCEPTION 
    WHEN undefined_table THEN
      -- 如果表不存在，忽略错误
      RAISE NOTICE 'security_events table not found, skipping log insertion';
  END;
END;
$$;

--
-- Name: schedule_security_event_enhancement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_security_event_enhancement() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_enhanced INTEGER := 0;
    method_results RECORD;
BEGIN
    -- 执行关联增强
    FOR method_results IN SELECT * FROM correlate_user_security_events() LOOP
        total_enhanced := total_enhanced + method_results.enhanced_count;
        
        -- 记录增强活动
        INSERT INTO security_events (
            ip_address,
            event_type,
            severity,
            description,
            metadata
        ) VALUES (
            '0.0.0.0'::INET,
            'system_maintenance',
            'low',
            'Automated security event enhancement completed',
            jsonb_build_object(
                'enhancement_method', method_results.correlation_method,
                'enhanced_count', method_results.enhanced_count,
                'details', method_results.details,
                'automated', true,
                'scheduled_at', NOW()
            )
        );
    END LOOP;
    
    RETURN total_enhanced;
END;
$$;

--
-- Name: update_ai_memories_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_memories_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_updated = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

--
-- Name: update_ip_bans_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ip_bans_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

--
-- Name: update_user_bans_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_bans_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

--
-- Name: update_user_profiles_modified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_profiles_modified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

--
-- Name: upsert_ai_memories(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_ai_memories(p_user_id uuid, p_memories jsonb) RETURNS TABLE(result_expert_id text, success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  expert_key TEXT;
  memory_data JSONB;
BEGIN
  -- 遍历传入的记忆数据
  FOR expert_key, memory_data IN SELECT * FROM jsonb_each(p_memories)
  LOOP
    BEGIN
      -- 验证内容长度
      IF char_length(memory_data->>'content') > 500 THEN
        RETURN QUERY SELECT expert_key::TEXT, FALSE, 'Content exceeds 500 characters'::TEXT;
        CONTINUE;
      END IF;

      -- 插入或更新记忆
      INSERT INTO ai_memories (user_id, expert_id, content, version, last_updated)
      VALUES (
        p_user_id,
        expert_key,
        memory_data->>'content',
        COALESCE((memory_data->>'version')::INTEGER, 1),
        COALESCE((memory_data->>'lastUpdated')::TIMESTAMP WITH TIME ZONE, NOW())
      )
      ON CONFLICT (user_id, expert_id)
      DO UPDATE SET
        content = EXCLUDED.content,
        version = GREATEST(ai_memories.version, EXCLUDED.version),
        last_updated = GREATEST(ai_memories.last_updated, EXCLUDED.last_updated);

      RETURN QUERY SELECT expert_key::TEXT, TRUE, NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT expert_key::TEXT, FALSE, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$;

--
-- Name: upsert_log_patch(uuid, date, jsonb, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_log_patch(p_user_id uuid, p_date date, p_log_data_patch jsonb, p_last_modified timestamp with time zone, p_based_on_modified timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(success boolean, conflict_resolved boolean, final_modified timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_modified TIMESTAMP WITH TIME ZONE;
  current_data JSONB;
  merged_data JSONB;
  conflict_detected BOOLEAN := FALSE;
  deleted_food_ids JSONB;
  deleted_exercise_ids JSONB;
BEGIN
  -- 🔒 获取当前记录（带行锁）
  SELECT last_modified, log_data INTO current_modified, current_data
  FROM daily_logs
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  -- 确保 current_data 不为空
  current_data := COALESCE(current_data, '{}'::jsonb);

  -- 🔍 检测冲突：使用基于的版本时间戳进行检查
  IF current_modified IS NOT NULL THEN
    IF p_based_on_modified IS NOT NULL THEN
      -- ✅ 新的乐观锁逻辑：检查服务器版本是否比客户端基于的版本新
      IF current_modified > p_based_on_modified THEN
        conflict_detected := TRUE;
        RAISE NOTICE 'Conflict detected: server_time=%, client_based_on=%, using smart merge', current_modified, p_based_on_modified;
      END IF;
    ELSE
      -- 🔄 旧的逻辑（向后兼容）
      IF current_modified > p_last_modified THEN
        conflict_detected := TRUE;
        RAISE NOTICE 'Conflict detected (legacy mode): server_time=%, client_time=%', current_modified, p_last_modified;
      END IF;
    END IF;
  END IF;

  -- 提取删除的ID列表，确保不为空
  deleted_food_ids := COALESCE(current_data->'deletedFoodIds', '[]'::jsonb);
  deleted_exercise_ids := COALESCE(current_data->'deletedExerciseIds', '[]'::jsonb);

  -- 如果补丁包含新的删除ID，合并它们
  IF p_log_data_patch ? 'deletedFoodIds' THEN
    deleted_food_ids := deleted_food_ids || COALESCE(p_log_data_patch->'deletedFoodIds', '[]'::jsonb);
  END IF;

  IF p_log_data_patch ? 'deletedExerciseIds' THEN
    deleted_exercise_ids := deleted_exercise_ids || COALESCE(p_log_data_patch->'deletedExerciseIds', '[]'::jsonb);
  END IF;

  -- 初始化 merged_data
  merged_data := COALESCE(current_data, '{}'::jsonb);

  IF conflict_detected THEN
    -- 🧠 智能合并策略（支持逻辑删除）
    
    -- 对于数组字段，使用支持逻辑删除的智能合并
    IF p_log_data_patch ? 'foodEntries' THEN
      merged_data := jsonb_set(
        merged_data,
        '{foodEntries}',
        merge_arrays_by_log_id(
          current_data->'foodEntries',
          p_log_data_patch->'foodEntries',
          deleted_food_ids
        )
      );
    END IF;

    IF p_log_data_patch ? 'exerciseEntries' THEN
      merged_data := jsonb_set(
        merged_data,
        '{exerciseEntries}',
        merge_arrays_by_log_id(
          current_data->'exerciseEntries',
          p_log_data_patch->'exerciseEntries',
          deleted_exercise_ids
        )
      );
    END IF;

    -- 对于非数组字段，使用补丁覆盖
    merged_data := merged_data || (p_log_data_patch - 'foodEntries' - 'exerciseEntries' - 'deletedFoodIds' - 'deletedExerciseIds');

  ELSE
    -- 无冲突，直接合并（支持逻辑删除）

    -- 安全合并数组字段
    IF p_log_data_patch ? 'foodEntries' THEN
      merged_data := jsonb_set(
        merged_data,
        '{foodEntries}',
        merge_arrays_by_log_id(
          current_data->'foodEntries',
          p_log_data_patch->'foodEntries',
          deleted_food_ids
        )
      );
    END IF;

    IF p_log_data_patch ? 'exerciseEntries' THEN
      merged_data := jsonb_set(
        merged_data,
        '{exerciseEntries}',
        merge_arrays_by_log_id(
          current_data->'exerciseEntries',
          p_log_data_patch->'exerciseEntries',
          deleted_exercise_ids
        )
      );
    END IF;

    -- 合并其他字段
    merged_data := merged_data || (p_log_data_patch - 'foodEntries' - 'exerciseEntries' - 'deletedFoodIds' - 'deletedExerciseIds');
  END IF;

  -- 确保 merged_data 不为空
  IF merged_data IS NULL THEN
    merged_data := '{}'::jsonb;
  END IF;

  -- 保存删除的ID列表
  merged_data := jsonb_set(merged_data, '{deletedFoodIds}', deleted_food_ids);
  merged_data := jsonb_set(merged_data, '{deletedExerciseIds}', deleted_exercise_ids);

  -- 最终安全检查：确保数据不为空
  IF merged_data IS NULL OR merged_data = 'null'::jsonb THEN
    merged_data := jsonb_build_object(
      'deletedFoodIds', deleted_food_ids,
      'deletedExerciseIds', deleted_exercise_ids
    );
  END IF;

  -- 🔒 原子性更新或插入
  INSERT INTO daily_logs (user_id, date, log_data, last_modified)
  VALUES (
    p_user_id,
    p_date,
    merged_data,
    GREATEST(COALESCE(current_modified, p_last_modified), p_last_modified)
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    log_data = EXCLUDED.log_data,
    last_modified = EXCLUDED.last_modified;

  -- 返回最终的修改时间
  SELECT last_modified INTO current_modified
  FROM daily_logs
  WHERE user_id = p_user_id AND date = p_date;

  RETURN QUERY SELECT TRUE, conflict_detected, current_modified;
END;
$$;

--
-- Name: FUNCTION upsert_log_patch(p_user_id uuid, p_date date, p_log_data_patch jsonb, p_last_modified timestamp with time zone, p_based_on_modified timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.upsert_log_patch(p_user_id uuid, p_date date, p_log_data_patch jsonb, p_last_modified timestamp with time zone, p_based_on_modified timestamp with time zone) IS 'Updated function with proper optimistic locking. Uses based_on_modified parameter for conflict detection instead of the new timestamp, preventing the bypass of conflict detection mechanism.';

--
-- Name: upsert_oauth_user(character varying, character varying, character varying, character varying, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_oauth_user(p_provider_id character varying, p_provider_type character varying, p_email character varying, p_username character varying, p_display_name character varying, p_avatar_url text DEFAULT NULL::text) RETURNS TABLE(user_id uuid, is_new_user boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id UUID;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- 尝试查找现有用户
  SELECT id INTO v_user_id
  FROM users
  WHERE (provider_id = p_provider_id AND provider_type = p_provider_type)
     OR email = p_email;

  IF v_user_id IS NULL THEN
    -- 创建新用户
    INSERT INTO users (
      provider_id, provider_type, email, username, display_name,
      avatar_url, trust_level, is_active, is_silenced, email_verified,
      login_count, created_at, updated_at, last_login_at
    ) VALUES (
      p_provider_id, p_provider_type, p_email, p_username, p_display_name,
      p_avatar_url, 1, true, false, true,
      1, NOW(), NOW(), NOW()
    ) RETURNING id INTO v_user_id;

    v_is_new := TRUE;
  ELSE
    -- 更新现有用户
    UPDATE users SET
      provider_id = p_provider_id,
      provider_type = p_provider_type,
      username = COALESCE(p_username, username),
      display_name = COALESCE(p_display_name, display_name),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      login_count = login_count + 1,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT v_user_id, v_is_new;
END;
$$;

--
-- Name: upsert_user_profile(uuid, numeric, numeric, integer, text, text, text, numeric, integer, text, boolean, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_user_profile(p_user_id uuid, p_weight numeric DEFAULT NULL::numeric, p_height numeric DEFAULT NULL::numeric, p_age integer DEFAULT NULL::integer, p_gender text DEFAULT NULL::text, p_activity_level text DEFAULT NULL::text, p_goal text DEFAULT NULL::text, p_target_weight numeric DEFAULT NULL::numeric, p_target_calories integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text, p_professional_mode boolean DEFAULT NULL::boolean, p_medical_history text DEFAULT NULL::text, p_lifestyle text DEFAULT NULL::text, p_health_awareness text DEFAULT NULL::text) RETURNS TABLE(id uuid, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- 插入或更新用户档案
  INSERT INTO user_profiles (
    user_id, weight, height, age, gender, activity_level, goal,
    target_weight, target_calories, notes, professional_mode,
    medical_history, lifestyle, health_awareness
  )
  VALUES (
    p_user_id, p_weight, p_height, p_age, p_gender, p_activity_level, p_goal,
    p_target_weight, p_target_calories, p_notes, p_professional_mode,
    p_medical_history, p_lifestyle, p_health_awareness
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    weight = COALESCE(EXCLUDED.weight, user_profiles.weight),
    height = COALESCE(EXCLUDED.height, user_profiles.height),
    age = COALESCE(EXCLUDED.age, user_profiles.age),
    gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
    activity_level = COALESCE(EXCLUDED.activity_level, user_profiles.activity_level),
    goal = COALESCE(EXCLUDED.goal, user_profiles.goal),
    target_weight = COALESCE(EXCLUDED.target_weight, user_profiles.target_weight),
    target_calories = COALESCE(EXCLUDED.target_calories, user_profiles.target_calories),
    notes = COALESCE(EXCLUDED.notes, user_profiles.notes),
    professional_mode = COALESCE(EXCLUDED.professional_mode, user_profiles.professional_mode),
    medical_history = COALESCE(EXCLUDED.medical_history, user_profiles.medical_history),
    lifestyle = COALESCE(EXCLUDED.lifestyle, user_profiles.lifestyle),
    health_awareness = COALESCE(EXCLUDED.health_awareness, user_profiles.health_awareness),
    updated_at = NOW()
  RETURNING user_profiles.id, user_profiles.updated_at INTO result_record;

  RETURN QUERY SELECT result_record.id, result_record.updated_at;
END;
$$;

--
-- Name: validate_invite_code_checksum(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_invite_code_checksum(code text) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
  DECLARE
    chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    segments TEXT[];
    data_to_check TEXT;
    provided_checksum CHAR(1);
    calculated_sum INTEGER := 0;
    expected_checksum CHAR(1);
    i INTEGER;
  BEGIN
    -- 只对新格式进行校验位验证
    IF LENGTH(code) != 14 OR code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$' THEN
      RETURN TRUE; -- 旧格式或无效格式，跳过校验位验证
    END IF;
    
    -- 分割邀请码
    segments := string_to_array(code, '-');
    data_to_check := segments[1] || segments[2] || substring(segments[3], 1, 3);
    provided_checksum := substring(segments[3], 4, 1);
    
    -- 计算校验和
    FOR i IN 1..length(data_to_check) LOOP
      calculated_sum := calculated_sum + ascii(substring(data_to_check, i, 1)) * i;
    END LOOP;
    
    -- 获取期望的校验位
    expected_checksum := substring(chars, (calculated_sum % length(chars)) + 1, 1);
    
    RETURN provided_checksum = expected_checksum;
  END;
  $_$;

--
-- Name: FUNCTION validate_invite_code_checksum(code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_invite_code_checksum(code text) IS '验证新格式邀请码的校验位';

--
-- Name: validate_invite_code_format(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_invite_code_format(code text) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
  BEGIN
    -- 支持两种格式：
    -- 1. 旧格式：8位大写字母和数字
    -- 2. 新格式：XXXX-YYYY-ZZZZ（12位字符+2个分隔符）
    
    -- 检查旧格式
    IF LENGTH(code) = 8 AND code ~ '^[A-Z0-9]{8}$' THEN
      RETURN TRUE;
    END IF;
    
    -- 检查新格式
    IF LENGTH(code) = 14 AND code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$' THEN
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
  END;
  $_$;

--
-- Name: FUNCTION validate_invite_code_format(code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_invite_code_format(code text) IS '验证邀请码格式，支持旧格式(8位)和新格式(XXXX-YYYY-ZZZZ)';

--
-- Name: verify_user_credentials(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_user_credentials(p_identifier character varying, p_password_hash character varying) RETURNS TABLE(user_id uuid, username character varying, email character varying, display_name character varying, trust_level integer, is_active boolean, is_silenced boolean, email_verified boolean, avatar_url text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 判断是邮箱还是用户名
  IF p_identifier LIKE '%@%' THEN
    -- 邮箱登录
    RETURN QUERY
    SELECT u.id, u.username, u.email, u.display_name, u.trust_level,
           u.is_active, u.is_silenced, u.email_verified, u.avatar_url
    FROM users u
    WHERE u.email = p_identifier
      AND u.password_hash = p_password_hash
      AND u.is_active = true;
  ELSE
    -- 用户名登录
    RETURN QUERY
    SELECT u.id, u.username, u.email, u.display_name, u.trust_level,
           u.is_active, u.is_silenced, u.email_verified, u.avatar_url
    FROM users u
    WHERE u.username = p_identifier
      AND u.password_hash = p_password_hash
      AND u.is_active = true;
  END IF;
END;
$$;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      PERFORM pg_notify(
          'realtime:system',
          jsonb_build_object(
              'error', SQLERRM,
              'function', 'realtime.send',
              'event', event,
              'topic', topic,
              'private', private
          )::text
      );
  END;
END;
$$;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
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

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
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

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
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

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
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

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
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

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';

--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';

--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';

--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';

--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';

--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';

--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;

--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';

--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';

--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
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
    tag text
);

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';

--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';

--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';

--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';

--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
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

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';

--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';

--
-- Name: user_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    severity text NOT NULL,
    banned_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    ban_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    unbanned_at timestamp with time zone,
    unban_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_bans_ban_type_check CHECK ((ban_type = ANY (ARRAY['manual'::text, 'automatic'::text, 'temporary'::text]))),
    CONSTRAINT user_bans_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

--
-- Name: TABLE user_bans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_bans IS '用户封禁记录表，用于管理被封禁的用户账户';

--
-- Name: COLUMN user_bans.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bans.user_id IS '被封禁的用户ID';

--
-- Name: COLUMN user_bans.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bans.reason IS '封禁原因';

--
-- Name: COLUMN user_bans.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bans.severity IS '严重程度：low, medium, high, critical';

--
-- Name: COLUMN user_bans.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bans.expires_at IS '过期时间，NULL表示永久封禁';

--
-- Name: COLUMN user_bans.ban_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bans.ban_type IS '封禁类型：manual(手动), automatic(自动), temporary(临时)';

--
-- Name: COLUMN user_bans.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_bans.metadata IS '封禁相关的额外信息，JSON格式';

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    linux_do_id text,
    username text,
    avatar_url text,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    display_name text,
    trust_level integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_silenced boolean DEFAULT false,
    last_login_at timestamp without time zone,
    login_count integer DEFAULT 0,
    role text DEFAULT 'user'::text,
    permissions jsonb DEFAULT '[]'::jsonb,
    password_hash text,
    email_verified boolean DEFAULT false,
    email_verification_token text,
    password_reset_token text,
    password_reset_expires timestamp with time zone,
    provider_id character varying(255),
    provider_type character varying(50) DEFAULT 'credentials'::character varying,
    CONSTRAINT check_credentials_username CHECK ((((provider_type)::text <> 'credentials'::text) OR (((provider_type)::text = 'credentials'::text) AND (username IS NOT NULL)))),
    CONSTRAINT check_oauth_provider_id CHECK ((((provider_type)::text = 'credentials'::text) OR (((provider_type)::text <> 'credentials'::text) AND (provider_id IS NOT NULL))))
);

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'User data - access controlled at application layer';

--
-- Name: COLUMN users.provider_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.provider_id IS 'OAuth provider的用户ID，对于credentials用户为NULL';

--
-- Name: COLUMN users.provider_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.provider_type IS '登录方式：credentials, github, google等';

--
-- Name: active_user_bans; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_user_bans AS
 SELECT ub.id,
    ub.user_id,
    u.username,
    u.email,
    ub.reason,
    ub.severity,
    ub.ban_type,
    ub.banned_at,
    ub.expires_at,
        CASE
            WHEN (ub.expires_at IS NULL) THEN 'permanent'::text
            WHEN (ub.expires_at > now()) THEN 'active'::text
            ELSE 'expired'::text
        END AS status,
    (EXTRACT(epoch FROM (COALESCE(ub.expires_at, (now() + '100 years'::interval)) - now())) / (3600)::numeric) AS hours_remaining
   FROM (public.user_bans ub
     JOIN public.users u ON ((ub.user_id = u.id)))
  WHERE (ub.is_active = true)
  ORDER BY ub.banned_at DESC;

--
-- Name: VIEW active_user_bans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.active_user_bans IS '活跃用户封禁记录视图，包含用户信息和状态';

--
-- Name: ai_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    expert_id character varying(50) NOT NULL,
    content text NOT NULL,
    version integer DEFAULT 1,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_content_length CHECK ((char_length(content) <= 500))
);

--
-- Name: TABLE ai_memories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_memories IS 'AI memories - access controlled at application layer via user_id filtering';

--
-- Name: COLUMN ai_memories.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_memories.user_id IS '用户ID，关联users表';

--
-- Name: COLUMN ai_memories.expert_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_memories.expert_id IS '专家ID，如general、nutrition、fitness等';

--
-- Name: COLUMN ai_memories.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_memories.content IS 'AI记忆内容，限制500字符';

--
-- Name: COLUMN ai_memories.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_memories.version IS '版本号，用于跟踪更新';

--
-- Name: COLUMN ai_memories.last_updated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_memories.last_updated IS '最后更新时间';

--
-- Name: audit_log_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_log_entries IS 'Auth: Audit trail for user actions.';

--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    log_data jsonb NOT NULL,
    last_modified timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: TABLE daily_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_logs IS 'User daily logs - access controlled at application layer via user_id filtering';

--
-- Name: COLUMN daily_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_logs.user_id IS '关联到 users 表，标识日志的所属用户。';

--
-- Name: COLUMN daily_logs.date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_logs.date IS '日志对应的具体日期。';

--
-- Name: COLUMN daily_logs.log_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_logs.log_data IS '存储完整日志内容的 JSON 对象。';

--
-- Name: COLUMN daily_logs.last_modified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_logs.last_modified IS '最后修改时间戳，用于同步时的冲突解决。';

--
-- Name: identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identities (
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

--
-- Name: TABLE identities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.identities IS 'Auth: Stores identities associated to a user.';

--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';

--
-- Name: instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

--
-- Name: TABLE instances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.instances IS 'Auth: Manages users across multiple sites.';

--
-- Name: invite_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    created_by uuid,
    used_by uuid,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone,
    description text
);

--
-- Name: COLUMN invite_codes.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invite_codes.description IS '邀请码描述，用于备注用途';

--
-- Name: invite_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    interval_days integer DEFAULT 7 NOT NULL,
    codes_per_batch integer DEFAULT 5 NOT NULL,
    max_total_codes integer DEFAULT 50 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);

--
-- Name: COLUMN invite_configs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invite_configs.user_id IS '用户ID，NULL表示全局默认配置';

--
-- Name: invite_configs_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.invite_configs_view AS
 SELECT ic.id,
    ic.user_id,
    ic.interval_days,
    ic.codes_per_batch,
    ic.max_total_codes,
    ic.is_active,
    ic.created_at,
    ic.updated_at,
    ic.created_by,
        CASE
            WHEN (ic.user_id IS NULL) THEN '全局默认配置'::text
            ELSE (((COALESCE(u.display_name, u.username, 'Unknown User'::text) || ' ('::text) || COALESCE(u.username, 'no-username'::text)) || ')'::text)
        END AS config_description,
    u.username,
    u.display_name,
    u.email,
    creator.username AS creator_username,
    creator.display_name AS creator_display_name
   FROM ((public.invite_configs ic
     LEFT JOIN public.users u ON ((ic.user_id = u.id)))
     LEFT JOIN public.users creator ON ((ic.created_by = creator.id)))
  WHERE (ic.is_active = true)
  ORDER BY
        CASE
            WHEN (ic.user_id IS NULL) THEN 0
            ELSE 1
        END, ic.created_at DESC;

--
-- Name: VIEW invite_configs_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.invite_configs_view IS '邀请码配置视图，包含用户信息和创建者信息';

--
-- Name: ip_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address inet NOT NULL,
    reason text NOT NULL,
    severity text NOT NULL,
    banned_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    ban_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    unbanned_at timestamp with time zone,
    unban_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ip_bans_ban_type_check CHECK ((ban_type = ANY (ARRAY['manual'::text, 'automatic'::text, 'temporary'::text]))),
    CONSTRAINT ip_bans_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

--
-- Name: TABLE ip_bans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ip_bans IS 'IP封禁记录表，用于管理被封禁的IP地址';

--
-- Name: COLUMN ip_bans.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_bans.ip_address IS '被封禁的IP地址';

--
-- Name: COLUMN ip_bans.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_bans.reason IS '封禁原因';

--
-- Name: COLUMN ip_bans.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_bans.severity IS '严重程度：low, medium, high, critical';

--
-- Name: COLUMN ip_bans.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_bans.expires_at IS '过期时间，NULL表示永久封禁';

--
-- Name: COLUMN ip_bans.ban_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_bans.ban_type IS '封禁类型：manual(手动), automatic(自动), temporary(临时)';

--
-- Name: COLUMN ip_bans.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_bans.metadata IS '封禁相关的额外信息，JSON格式';

--
-- Name: mfa_amr_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';

--
-- Name: mfa_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mfa_challenges IS 'auth: stores metadata about challenge requests made';

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
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

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;

--
-- Name: saml_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saml_providers (
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

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';

--
-- Name: saml_relay_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saml_relay_states (
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

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(255) NOT NULL
);

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS 'Auth: Manages updates to the auth system.';

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address inet NOT NULL,
    user_agent text,
    event_type text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT security_events_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT valid_event_type CHECK ((event_type = ANY (ARRAY['rate_limit_exceeded'::text, 'invalid_input'::text, 'unauthorized_access'::text, 'suspicious_activity'::text, 'brute_force_attempt'::text, 'data_injection_attempt'::text, 'file_upload_violation'::text, 'api_abuse'::text, 'privilege_escalation_attempt'::text, 'system_maintenance'::text])))
);

--
-- Name: TABLE security_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.security_events IS '安全事件记录表，用于监控和分析系统安全状况';

--
-- Name: COLUMN security_events.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_events.event_type IS '事件类型：rate_limit_exceeded, invalid_input, unauthorized_access 等';

--
-- Name: COLUMN security_events.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_events.severity IS '严重程度：low, medium, high, critical';

--
-- Name: COLUMN security_events.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_events.metadata IS '事件相关的额外信息，JSON格式';

--
-- Name: security_events_backup_20250610_173749; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events_backup_20250610_173749 (
    id bigint,
    event_type character varying(50),
    user_id uuid,
    shared_key_id uuid,
    severity smallint,
    details jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone
);

--
-- Name: shared_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    base_url text NOT NULL,
    api_key_encrypted text NOT NULL,
    daily_limit integer DEFAULT 150,
    description text,
    tags text[],
    is_active boolean DEFAULT true,
    usage_count_today integer DEFAULT 0,
    total_usage_count integer DEFAULT 0,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    available_models text[] NOT NULL
);

--
-- Name: TABLE shared_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shared_keys IS 'Shared API keys - access controlled at application layer';

--
-- Name: sso_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

--
-- Name: sso_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';

--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';

--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    weight numeric(5,2),
    height numeric(5,2),
    age integer,
    gender character varying(20),
    activity_level character varying(50),
    goal character varying(50),
    target_weight numeric(5,2),
    target_calories integer,
    notes text,
    professional_mode boolean DEFAULT false,
    medical_history text,
    lifestyle text,
    health_awareness text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: TABLE user_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_profiles IS '用户档案表，存储用户的个人信息和健康目标';

--
-- Name: COLUMN user_profiles.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.user_id IS '用户ID，关联users表';

--
-- Name: COLUMN user_profiles.weight; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.weight IS '体重(kg)';

--
-- Name: COLUMN user_profiles.height; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.height IS '身高(cm)';

--
-- Name: COLUMN user_profiles.age; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.age IS '年龄';

--
-- Name: COLUMN user_profiles.gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.gender IS '性别';

--
-- Name: COLUMN user_profiles.activity_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.activity_level IS '活动水平';

--
-- Name: COLUMN user_profiles.goal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.goal IS '健康目标';

--
-- Name: COLUMN user_profiles.target_weight; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.target_weight IS '目标体重(kg)';

--
-- Name: COLUMN user_profiles.target_calories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.target_calories IS '目标卡路里';

--
-- Name: COLUMN user_profiles.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.notes IS '备注';

--
-- Name: COLUMN user_profiles.professional_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.professional_mode IS '专业模式';

--
-- Name: COLUMN user_profiles.medical_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.medical_history IS '病史';

--
-- Name: COLUMN user_profiles.lifestyle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.lifestyle IS '生活方式';

--
-- Name: COLUMN user_profiles.health_awareness; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.health_awareness IS '健康意识';

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
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
    owner_id text
);

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
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
    user_metadata jsonb
);

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
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

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
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

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);

--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);

--
-- Name: ai_memories ai_memories_user_expert_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_memories
    ADD CONSTRAINT ai_memories_user_expert_unique UNIQUE (user_id, expert_id);

--
-- Name: daily_logs daily_logs_user_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);

--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);

--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);

--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);

--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);

--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);

--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);

--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);

--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);

--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);

--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);

--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';

--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);

--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);

--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);

--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);

--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);

--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);

--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);

--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);

--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);

--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);

--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);

--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);

--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);

--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);

--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);

--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);

--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);

--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);

--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);

--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);

--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);

--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);

--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));

--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);

--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));

--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);

--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);

--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);

--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';

--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));

--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);

--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);

--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON public.audit_log_entries USING btree (instance_id);

--
-- Name: identities_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identities_email_idx ON public.identities USING btree (email text_pattern_ops);

--
-- Name: identities_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identities_user_id_idx ON public.identities USING btree (user_id);

--
-- Name: idx_ai_memories_expert_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_memories_expert_id ON public.ai_memories USING btree (expert_id);

--
-- Name: idx_ai_memories_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_memories_last_updated ON public.ai_memories USING btree (last_updated);

--
-- Name: idx_ai_memories_user_expert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_memories_user_expert ON public.ai_memories USING btree (user_id, expert_id);

--
-- Name: idx_ai_memories_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_memories_user_id ON public.ai_memories USING btree (user_id);

--
-- Name: idx_daily_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_date ON public.daily_logs USING btree (date);

--
-- Name: idx_daily_logs_last_modified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_last_modified ON public.daily_logs USING btree (last_modified);

--
-- Name: idx_daily_logs_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_user_date ON public.daily_logs USING btree (user_id, date);

--
-- Name: idx_daily_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_user_id ON public.daily_logs USING btree (user_id);

--
-- Name: idx_invite_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_codes_active ON public.invite_codes USING btree (is_active);

--
-- Name: idx_invite_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_codes_code ON public.invite_codes USING btree (code);

--
-- Name: idx_invite_configs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_configs_active ON public.invite_configs USING btree (is_active);

--
-- Name: idx_invite_configs_default_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invite_configs_default_active ON public.invite_configs USING btree (is_active) WHERE ((is_active = true) AND (user_id IS NULL));

--
-- Name: idx_invite_configs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_configs_user_id ON public.invite_configs USING btree (user_id);

--
-- Name: idx_invite_configs_user_specific_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invite_configs_user_specific_active ON public.invite_configs USING btree (user_id) WHERE ((is_active = true) AND (user_id IS NOT NULL));

--
-- Name: idx_ip_bans_active_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_active_expires ON public.ip_bans USING btree (is_active, expires_at);

--
-- Name: idx_ip_bans_active_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_ip_bans_active_ip ON public.ip_bans USING btree (ip_address) WHERE (is_active = true);

--
-- Name: idx_ip_bans_ban_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_ban_type ON public.ip_bans USING btree (ban_type);

--
-- Name: idx_ip_bans_banned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_banned_at ON public.ip_bans USING btree (banned_at);

--
-- Name: idx_ip_bans_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_expires_at ON public.ip_bans USING btree (expires_at) WHERE (expires_at IS NOT NULL);

--
-- Name: idx_ip_bans_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_ip_address ON public.ip_bans USING btree (ip_address);

--
-- Name: idx_ip_bans_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_is_active ON public.ip_bans USING btree (is_active);

--
-- Name: idx_ip_bans_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_severity ON public.ip_bans USING btree (severity);

--
-- Name: idx_ip_bans_type_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_bans_type_severity ON public.ip_bans USING btree (ban_type, severity);

--
-- Name: idx_security_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at);

--
-- Name: idx_security_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);

--
-- Name: idx_security_events_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip_address ON public.security_events USING btree (ip_address);

--
-- Name: idx_security_events_ip_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip_created ON public.security_events USING btree (ip_address, created_at);

--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);

--
-- Name: idx_security_events_type_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_type_severity ON public.security_events USING btree (event_type, severity);

--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);

--
-- Name: idx_security_events_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user_time ON public.security_events USING btree (user_id, created_at) WHERE (user_id IS NOT NULL);

--
-- Name: idx_shared_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_keys_active ON public.shared_keys USING btree (is_active, usage_count_today, daily_limit);

--
-- Name: idx_shared_keys_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_keys_user ON public.shared_keys USING btree (user_id);

--
-- Name: idx_shared_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_keys_user_id ON public.shared_keys USING btree (user_id);

--
-- Name: idx_user_bans_active_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_active_expires ON public.user_bans USING btree (is_active, expires_at);

--
-- Name: idx_user_bans_active_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_bans_active_user ON public.user_bans USING btree (user_id) WHERE (is_active = true);

--
-- Name: idx_user_bans_ban_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_ban_type ON public.user_bans USING btree (ban_type);

--
-- Name: idx_user_bans_banned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_banned_at ON public.user_bans USING btree (banned_at);

--
-- Name: idx_user_bans_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_expires_at ON public.user_bans USING btree (expires_at) WHERE (expires_at IS NOT NULL);

--
-- Name: idx_user_bans_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_is_active ON public.user_bans USING btree (is_active);

--
-- Name: idx_user_bans_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_severity ON public.user_bans USING btree (severity);

--
-- Name: idx_user_bans_type_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_type_severity ON public.user_bans USING btree (ban_type, severity);

--
-- Name: idx_user_bans_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_bans_user_id ON public.user_bans USING btree (user_id);

--
-- Name: idx_user_profiles_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_updated_at ON public.user_profiles USING btree (updated_at);

--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);

--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);

--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);

--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login_at);

--
-- Name: idx_users_linux_do_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_linux_do_id ON public.users USING btree (linux_do_id);

--
-- Name: idx_users_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_provider ON public.users USING btree (provider_type, provider_id);

--
-- Name: idx_users_trust_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_trust_level ON public.users USING btree (trust_level);

--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);

--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON public.mfa_challenges USING btree (created_at DESC);

--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON public.refresh_tokens USING btree (instance_id);

--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON public.refresh_tokens USING btree (instance_id, user_id);

--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON public.refresh_tokens USING btree (parent);

--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON public.refresh_tokens USING btree (session_id, revoked);

--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON public.refresh_tokens USING btree (updated_at DESC);

--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON public.saml_providers USING btree (sso_provider_id);

--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON public.saml_relay_states USING btree (created_at DESC);

--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON public.saml_relay_states USING btree (for_email);

--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON public.saml_relay_states USING btree (sso_provider_id);

--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON public.sso_domains USING btree (sso_provider_id);

--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);

--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);

--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);

--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);

--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);

--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");

--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);

--
-- Name: ip_bans trigger_ip_bans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ip_bans_updated_at BEFORE UPDATE ON public.ip_bans FOR EACH ROW EXECUTE FUNCTION public.update_ip_bans_updated_at();

--
-- Name: ai_memories trigger_update_ai_memories_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_ai_memories_modified BEFORE UPDATE ON public.ai_memories FOR EACH ROW EXECUTE FUNCTION public.update_ai_memories_modified();

--
-- Name: user_profiles trigger_update_user_profiles_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_profiles_modified BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_modified();

--
-- Name: user_bans trigger_user_bans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_user_bans_updated_at BEFORE UPDATE ON public.user_bans FOR EACH ROW EXECUTE FUNCTION public.update_user_bans_updated_at();

--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();

--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');

--
-- PostgreSQL database dump complete
--



--
-- 数据清理和序列重置
-- 此部分由 create-empty-database.js 自动生成
--

-- 清空数据表（按依赖关系顺序）
DELETE FROM public.security_events;
DELETE FROM public.ai_memories;
DELETE FROM public.daily_logs;
DELETE FROM public.user_bans;
DELETE FROM public.ip_bans;
DELETE FROM public.invite_codes;
DELETE FROM public.invite_configs;
DELETE FROM public.shared_keys;
DELETE FROM public.user_profiles;
DELETE FROM public.users;
DELETE FROM public.system_configs;

-- 重置序列
SELECT setval('public.users_id_seq', 1, false);
SELECT setval('public.shared_keys_id_seq', 1, false);
SELECT setval('public.daily_logs_id_seq', 1, false);
SELECT setval('public.ai_memories_id_seq', 1, false);
SELECT setval('public.security_events_id_seq', 1, false);
SELECT setval('public.invite_codes_id_seq', 1, false);
SELECT setval('public.ip_bans_id_seq', 1, false);
SELECT setval('public.user_bans_id_seq', 1, false);

-- 清理完成
-- 数据库已重置为空状态，保留所有结构
-- 生成时间: 2025-06-19T21:28:08.717Z