--
-- PostgreSQL database dump
--

\restrict m36JkPKNkXyKI2cHChlhk8AlDMBwr33sfzG5pcsDEspjfvXe6hO0RPm0iY3bUfp

-- Dumped from database version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)

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
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: alert_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: alert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_type AS ENUM (
    'low_stock',
    'out_of_stock',
    'pricing_sync_failed',
    'schedule_conflict',
    'inventory_mismatch',
    'platform_sync_error'
);


--
-- Name: availability_change_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.availability_change_type AS ENUM (
    'status_change',
    'stock_update',
    'price_change',
    'schedule_update',
    'bulk_operation',
    'template_applied'
);


--
-- Name: company_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'trial'
);


--
-- Name: connected_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.connected_type AS ENUM (
    'product',
    'modifier',
    'category'
);


--
-- Name: customer_segment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.customer_segment AS ENUM (
    'new',
    'vip',
    'regular',
    'inactive'
);


--
-- Name: license_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.license_status AS ENUM (
    'active',
    'expired',
    'suspended',
    'cancelled'
);


--
-- Name: modifier_selection_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.modifier_selection_type AS ENUM (
    'single',
    'multiple',
    'counter'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded'
);


--
-- Name: order_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_type AS ENUM (
    'delivery',
    'pickup',
    'dine_in'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'online',
    'wallet'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);


--
-- Name: print_job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.print_job_status AS ENUM (
    'pending',
    'printing',
    'completed',
    'failed'
);


--
-- Name: print_job_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.print_job_type AS ENUM (
    'receipt',
    'kitchen_order',
    'label',
    'test'
);


--
-- Name: printer_assignment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.printer_assignment AS ENUM (
    'kitchen',
    'cashier',
    'bar',
    'all'
);


--
-- Name: printer_connection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.printer_connection AS ENUM (
    'network',
    'usb',
    'bluetooth'
);


--
-- Name: printer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.printer_status AS ENUM (
    'online',
    'offline',
    'error',
    'unknown'
);


--
-- Name: printer_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.printer_type AS ENUM (
    'thermal',
    'receipt',
    'kitchen',
    'label'
);


--
-- Name: promotion_campaign_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotion_campaign_type AS ENUM (
    'percentage_discount',
    'fixed_discount',
    'buy_x_get_y',
    'free_shipping',
    'minimum_order',
    'loyalty_points',
    'first_time_customer',
    'happy_hour',
    'bulk_discount',
    'combo_deal',
    'platform_exclusive'
);


--
-- Name: promotion_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotion_status AS ENUM (
    'draft',
    'active',
    'paused',
    'expired',
    'archived',
    'scheduled'
);


--
-- Name: promotion_target_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotion_target_type AS ENUM (
    'product',
    'category',
    'branch',
    'customer',
    'modifier'
);


--
-- Name: template_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_type AS ENUM (
    'seasonal',
    'holiday',
    'daily',
    'weekly',
    'monthly',
    'special_event'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'company_owner',
    'branch_manager',
    'cashier',
    'call_center'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending'
);


--
-- Name: check_expired_licenses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_expired_licenses() RETURNS TABLE(updated_count integer, expired_licenses jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
    updated_count integer := 0;
    expired_licenses jsonb := '[]'::jsonb;
BEGIN
    -- Update expired licenses
    WITH expired_updates AS (
        UPDATE licenses 
        SET status = 'expired',
            days_remaining = 0,
            updated_at = now()
        WHERE expires_at < now() 
        AND status = 'active'
        RETURNING id, company_id, type, expires_at
    ),
    expired_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'license_id', id,
                'company_id', company_id,
                'type', type,
                'expired_at', expires_at
            )
        ) as licenses
        FROM expired_updates
    )
    SELECT 
        (SELECT count(*)::integer FROM expired_updates),
        COALESCE((SELECT licenses FROM expired_data), '[]'::jsonb)
    INTO updated_count, expired_licenses;

    -- Log expired licenses
    INSERT INTO license_audit_logs (license_id, company_id, action, new_data, created_at)
    SELECT 
        (value->>'license_id')::text,
        (value->>'company_id')::text,
        'expired',
        value,
        now()
    FROM jsonb_array_elements(expired_licenses);

    RETURN QUERY SELECT updated_count, expired_licenses;
END;
$$;


--
-- Name: create_license_expiry_warnings(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_license_expiry_warnings(warning_days integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    created_count integer := 0;
BEGIN
    -- Create warnings for licenses expiring within warning_days
    WITH warning_licenses AS (
        SELECT 
            l.id as license_id,
            l.company_id,
            l.type,
            l.expires_at,
            l.days_remaining,
            c.name as company_name
        FROM licenses l
        JOIN companies c ON l.company_id = c.id
        WHERE l.status = 'active'
        AND l.days_remaining <= warning_days
        AND l.days_remaining > 0
        AND NOT EXISTS (
            SELECT 1 FROM license_notifications ln 
            WHERE ln.license_id = l.id 
            AND ln.type = 'expiry_warning'
            AND ln.created_at > now() - interval '24 hours'
        )
    ),
    new_notifications AS (
        INSERT INTO license_notifications (
            company_id, 
            license_id, 
            type, 
            title,
            message, 
            severity,
            metadata,
            created_at
        )
        SELECT 
            company_id,
            license_id,
            'expiry_warning',
            'License Expiring Soon',
            CASE 
                WHEN days_remaining <= 7 THEN 'URGENT: Your ' || type::text || ' license expires in ' || days_remaining || ' days!'
                WHEN days_remaining <= 14 THEN 'WARNING: Your ' || type::text || ' license expires in ' || days_remaining || ' days.'
                ELSE 'NOTICE: Your ' || type::text || ' license expires in ' || days_remaining || ' days.'
            END,
            CASE 
                WHEN days_remaining <= 7 THEN 'critical'
                WHEN days_remaining <= 14 THEN 'warning'
                ELSE 'info'
            END,
            jsonb_build_object(
                'days_remaining', days_remaining,
                'expires_at', expires_at,
                'license_type', type::text,
                'company_name', company_name
            ),
            now()
        FROM warning_licenses
        RETURNING id
    )
    SELECT count(*)::integer INTO created_count FROM new_notifications;
    
    RETURN created_count;
END;
$$;


--
-- Name: generate_license_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_license_notifications() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Insert notifications for licenses expiring in 30, 14, 7, and 1 days
  INSERT INTO license_notifications (
    company_id, license_id, type, title, message, severity, metadata
  )
  SELECT 
    l.company_id,
    l.id,
    CASE 
      WHEN l.days_remaining <= 1 THEN 'license_expiring_critical'
      WHEN l.days_remaining <= 7 THEN 'license_expiring_urgent'
      WHEN l.days_remaining <= 14 THEN 'license_expiring_warning'
      WHEN l.days_remaining <= 30 THEN 'license_expiring_notice'
    END,
    CASE 
      WHEN l.days_remaining <= 1 THEN 'License Expires Tomorrow\!'
      WHEN l.days_remaining <= 7 THEN 'License Expires Soon'
      WHEN l.days_remaining <= 14 THEN 'License Renewal Reminder'
      WHEN l.days_remaining <= 30 THEN 'License Renewal Notice'
    END,
    CASE 
      WHEN l.days_remaining <= 1 THEN 'Your license expires in ' || l.days_remaining || ' day. Renew immediately to avoid service interruption.'
      WHEN l.days_remaining <= 7 THEN 'Your license expires in ' || l.days_remaining || ' days. Please renew soon to avoid service interruption.'
      WHEN l.days_remaining <= 14 THEN 'Your license expires in ' || l.days_remaining || ' days. Consider renewing to ensure uninterrupted service.'
      WHEN l.days_remaining <= 30 THEN 'Your license expires in ' || l.days_remaining || ' days. Plan your renewal to maintain access to all features.'
    END,
    CASE 
      WHEN l.days_remaining <= 1 THEN 'critical'
      WHEN l.days_remaining <= 7 THEN 'critical'
      WHEN l.days_remaining <= 14 THEN 'warning'
      WHEN l.days_remaining <= 30 THEN 'info'
    END::text,
    jsonb_build_object(
      'license_type', l.type,
      'days_remaining', l.days_remaining,
      'expires_at', l.expires_at,
      'renewal_url', '/subscription'
    )
  FROM licenses l
  WHERE l.status = 'active' 
    AND l.days_remaining <= 30 
    AND l.days_remaining > 0
    AND NOT EXISTS (
      SELECT 1 FROM license_notifications n 
      WHERE n.license_id = l.id 
        AND n.type = CASE 
          WHEN l.days_remaining <= 1 THEN 'license_expiring_critical'
          WHEN l.days_remaining <= 7 THEN 'license_expiring_urgent'
          WHEN l.days_remaining <= 14 THEN 'license_expiring_warning'
          WHEN l.days_remaining <= 30 THEN 'license_expiring_notice'
        END
        AND n.created_at::date = CURRENT_DATE
    );
END;
$$;


--
-- Name: get_company_license_status(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_company_license_status(company_uuid text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'license_id', l.id,
        'company_id', l.company_id,
        'type', l.type,
        'status', l.status,
        'days_remaining', l.days_remaining,
        'expires_at', l.expires_at,
        'is_expired', (l.status = 'expired' OR l.expires_at < now()),
        'is_near_expiry', (l.days_remaining <= 30 AND l.days_remaining > 0),
        'is_critical', (l.days_remaining <= 7 AND l.days_remaining > 0),
        'max_users', l.max_users,
        'max_branches', l.max_branches,
        'features', l.features,
        'warning_level', 
            CASE 
                WHEN l.status = 'expired' OR l.expires_at < now() THEN 'expired'
                WHEN l.days_remaining <= 7 THEN 'critical'
                WHEN l.days_remaining <= 14 THEN 'warning'
                WHEN l.days_remaining <= 30 THEN 'notice'
                ELSE 'active'
            END
    )
    INTO result
    FROM licenses l
    WHERE l.company_id = company_uuid
    AND l.status = 'active'
    ORDER BY l.created_at DESC
    LIMIT 1;
    
    -- Return default if no license found
    IF result IS NULL THEN
        result := jsonb_build_object(
            'license_id', null,
            'company_id', company_uuid,
            'type', 'trial',
            'status', 'expired',
            'days_remaining', 0,
            'expires_at', null,
            'is_expired', true,
            'is_near_expiry', false,
            'is_critical', false,
            'max_users', 5,
            'max_branches', 1,
            'features', '["basic"]'::jsonb,
            'warning_level', 'expired'
        );
    END IF;
    
    RETURN result;
END;
$$;


--
-- Name: get_company_license_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_company_license_status(company_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'license_id', l.id,
        'company_id', l.company_id,
        'type', l.type,
        'status', l.status,
        'days_remaining', l.days_remaining,
        'expires_at', l.expires_at,
        'is_expired', (l.status = 'expired' OR l.expires_at < now()),
        'is_near_expiry', (l.days_remaining <= 30 AND l.days_remaining > 0),
        'is_critical', (l.days_remaining <= 7 AND l.days_remaining > 0),
        'max_users', l.max_users,
        'max_branches', l.max_branches,
        'features', l.features,
        'warning_level', 
            CASE 
                WHEN l.status = 'expired' OR l.expires_at < now() THEN 'expired'
                WHEN l.days_remaining <= 7 THEN 'critical'
                WHEN l.days_remaining <= 14 THEN 'warning'
                WHEN l.days_remaining <= 30 THEN 'notice'
                ELSE 'active'
            END
    )
    INTO result
    FROM licenses l
    WHERE l.company_id = company_uuid
    AND l.status = 'active'
    ORDER BY l.created_at DESC
    LIMIT 1;
    
    -- Return default if no license found
    IF result IS NULL THEN
        result := jsonb_build_object(
            'license_id', null,
            'company_id', company_uuid,
            'type', 'trial',
            'status', 'expired',
            'days_remaining', 0,
            'expires_at', null,
            'is_expired', true,
            'is_near_expiry', false,
            'is_critical', false,
            'max_users', 5,
            'max_branches', 1,
            'features', '["basic"]'::jsonb,
            'warning_level', 'expired'
        );
    END IF;
    
    RETURN result;
END;
$$;


--
-- Name: track_license_usage(text, character varying, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_license_usage(company_uuid text, feature_name_param character varying, usage_count_param integer DEFAULT 1, metadata_param jsonb DEFAULT '{}'::jsonb) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    license_uuid text;
BEGIN
    -- Get active license
    SELECT id INTO license_uuid
    FROM licenses 
    WHERE company_id = company_uuid 
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF license_uuid IS NULL THEN
        RETURN false;
    END IF;
    
    -- Insert usage log
    INSERT INTO license_usage_logs (
        company_id, 
        license_id, 
        feature_name, 
        usage_count, 
        metadata,
        created_at
    ) VALUES (
        company_uuid,
        license_uuid,
        feature_name_param,
        usage_count_param,
        metadata_param,
        now()
    );
    
    RETURN true;
END;
$$;


--
-- Name: track_license_usage(uuid, character varying, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_license_usage(company_uuid uuid, feature_name_param character varying, usage_count_param integer DEFAULT 1, metadata_param jsonb DEFAULT '{}'::jsonb) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    license_uuid uuid;
    current_usage integer;
    max_allowed integer;
BEGIN
    -- Get active license
    SELECT id INTO license_uuid
    FROM licenses 
    WHERE company_id = company_uuid 
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF license_uuid IS NULL THEN
        RETURN false;
    END IF;
    
    -- Insert usage log
    INSERT INTO license_usage_logs (
        company_id, 
        license_id, 
        feature_name, 
        usage_count, 
        metadata,
        created_at
    ) VALUES (
        company_uuid,
        license_uuid,
        feature_name_param,
        usage_count_param,
        metadata_param,
        now()
    );
    
    RETURN true;
END;
$$;


--
-- Name: trigger_license_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_license_audit_log() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO license_audit_logs (license_id, action, new_data, timestamp)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO license_audit_logs (license_id, action, old_data, new_data, timestamp)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NOW());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_license_days_remaining(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_license_days_remaining() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    updated_count integer := 0;
BEGIN
    WITH updates AS (
        UPDATE licenses 
        SET 
            days_remaining = GREATEST(0, EXTRACT(days FROM expires_at - now())::integer),
            last_checked = now(),
            updated_at = now()
        WHERE status = 'active'
        RETURNING id
    )
    SELECT count(*)::integer INTO updated_count FROM updates;
    
    RETURN updated_count;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _DeliveryProviderToJordanLocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_DeliveryProviderToJordanLocation" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: availability_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_alerts (
    id text NOT NULL,
    company_id text NOT NULL,
    branch_id text,
    alert_type public.alert_type NOT NULL,
    severity public.alert_severity DEFAULT 'medium'::public.alert_severity NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    connected_id text,
    connected_type public.connected_type,
    is_read boolean DEFAULT false NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp(3) without time zone,
    resolved_by text,
    channels text[] DEFAULT ARRAY[]::text[],
    sent_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: availability_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_audit_logs (
    id text NOT NULL,
    branch_availability_id text NOT NULL,
    company_id text NOT NULL,
    change_type public.availability_change_type NOT NULL,
    old_value jsonb,
    new_value jsonb,
    change_reason text,
    user_id text,
    user_role public.user_role,
    ip_address text,
    user_agent text,
    platform text,
    batch_operation boolean DEFAULT false NOT NULL,
    batch_id text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: availability_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_templates (
    id text NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    description text,
    template_type public.template_type NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    recurring_pattern jsonb,
    last_applied_at timestamp(3) without time zone,
    applied_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text
);


--
-- Name: branch_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_availabilities (
    id text NOT NULL,
    connected_id text NOT NULL,
    connected_type public.connected_type NOT NULL,
    branch_id text NOT NULL,
    company_id text NOT NULL,
    is_in_stock boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    stock_level integer,
    low_stock_threshold integer,
    prices jsonb DEFAULT '{}'::jsonb NOT NULL,
    taxes jsonb DEFAULT '{}'::jsonb,
    available_from text,
    available_to text,
    available_days text[] DEFAULT ARRAY[]::text[],
    last_stock_update timestamp(3) without time zone,
    notes text,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text
);


--
-- Name: branch_provider_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_provider_mappings (
    id text NOT NULL,
    branch_id text NOT NULL,
    company_provider_config_id text NOT NULL,
    provider_branch_id text NOT NULL,
    provider_site_id text,
    branch_configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    min_order_value numeric(10,2),
    max_order_value numeric(10,2),
    supported_payment_methods text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id text NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    city text,
    country text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    allows_online_orders boolean DEFAULT true NOT NULL,
    allows_delivery boolean DEFAULT true NOT NULL,
    allows_pickup boolean DEFAULT true NOT NULL,
    timezone text DEFAULT 'Asia/Amman'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text,
    name_ar text NOT NULL,
    open_time text,
    close_time text
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    business_type text DEFAULT 'restaurant'::character varying,
    timezone text DEFAULT 'Asia/Amman'::character varying NOT NULL,
    default_currency text DEFAULT 'JOD'::bpchar NOT NULL,
    status public.company_status DEFAULT 'trial'::public.company_status NOT NULL,
    subscription_plan text DEFAULT 'basic'::character varying,
    subscription_expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text
);


--
-- Name: company_provider_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_provider_configs (
    id text NOT NULL,
    company_id text NOT NULL,
    provider_type text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    max_distance numeric(8,2) DEFAULT 15.00 NOT NULL,
    base_fee numeric(8,2) DEFAULT 2.50 NOT NULL,
    fee_per_km numeric(8,2) DEFAULT 0.50 NOT NULL,
    avg_delivery_time integer DEFAULT 30 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    CONSTRAINT valid_provider_type CHECK ((provider_type = ANY (ARRAY['dhub'::text, 'talabat'::text, 'careem'::text, 'careemexpress'::text, 'jahez'::text, 'deliveroo'::text, 'yallow'::text, 'jooddelivery'::text, 'topdeliver'::text, 'nashmi'::text, 'tawasi'::text, 'delivergy'::text, 'utrac'::text, 'local_delivery'::text])))
);


--
-- Name: delivery_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_error_logs (
    id text NOT NULL,
    company_id text NOT NULL,
    provider_type text NOT NULL,
    error_type text NOT NULL,
    error_code text,
    error_message text NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    retry_count integer DEFAULT 0 NOT NULL,
    resolved_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: delivery_provider_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_provider_analytics (
    id text NOT NULL,
    company_id text NOT NULL,
    provider_type text NOT NULL,
    date date NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    successful_orders integer DEFAULT 0 NOT NULL,
    failed_orders integer DEFAULT 0 NOT NULL,
    cancelled_orders integer DEFAULT 0 NOT NULL,
    total_revenue numeric(10,2) DEFAULT 0 NOT NULL,
    total_delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    average_delivery_time integer DEFAULT 0 NOT NULL,
    customer_ratings_sum numeric(10,2) DEFAULT 0 NOT NULL,
    customer_ratings_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: delivery_provider_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_provider_orders (
    id text NOT NULL,
    company_id text NOT NULL,
    branch_id text NOT NULL,
    delivery_provider_id text NOT NULL,
    provider_order_id text NOT NULL,
    order_number text NOT NULL,
    order_status text DEFAULT 'created'::text NOT NULL,
    order_details jsonb NOT NULL,
    customer_details jsonb,
    delivery_address jsonb,
    webhook_data jsonb,
    is_processed boolean DEFAULT false NOT NULL,
    error_message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    actual_delivery_time timestamp(3) without time zone,
    delivery_attempts integer DEFAULT 1 NOT NULL,
    estimated_delivery_time timestamp(3) without time zone,
    failure_reason text,
    last_status_check timestamp(3) without time zone,
    provider_fee_charged numeric(8,2),
    tracking_number text,
    webhook_retries integer DEFAULT 0 NOT NULL
);


--
-- Name: delivery_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_providers (
    id text NOT NULL,
    name text NOT NULL,
    "displayName" jsonb NOT NULL,
    api_base_url text,
    api_key text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    supported_areas text[] DEFAULT ARRAY[]::text[],
    avg_delivery_time integer DEFAULT 30 NOT NULL,
    base_fee numeric(8,2) DEFAULT 0.00 NOT NULL,
    fee_per_km numeric(8,2) DEFAULT 0.50 NOT NULL,
    max_distance numeric(8,2) DEFAULT 15.00 NOT NULL,
    configuration jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    company_id text,
    webhook_url text
);


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id text NOT NULL,
    branch_id text NOT NULL,
    "zoneName" jsonb NOT NULL,
    zone_name_slug text,
    delivery_fee numeric(8,2),
    priority_level integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    polygon jsonb,
    center_lat numeric(10,8),
    center_lng numeric(11,8),
    radius numeric(8,2),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text,
    global_location_id text,
    average_delivery_time_mins integer
);


--
-- Name: global_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_locations (
    id text NOT NULL,
    country_name text NOT NULL,
    country_name_ar text NOT NULL,
    governorate text,
    city_name text NOT NULL,
    city_name_ar text NOT NULL,
    area_name text NOT NULL,
    area_name_ar text NOT NULL,
    sub_area_name text,
    sub_area_name_ar text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    search_text text,
    is_active boolean DEFAULT true NOT NULL,
    delivery_difficulty integer DEFAULT 2 NOT NULL,
    average_delivery_fee numeric(8,2) DEFAULT 3.00 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: jordan_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jordan_locations (
    id text NOT NULL,
    governorate text NOT NULL,
    city text NOT NULL,
    district text,
    area_name_en text NOT NULL,
    area_name_ar text NOT NULL,
    postal_code text,
    delivery_difficulty integer DEFAULT 2 NOT NULL,
    average_delivery_fee numeric(8,2) DEFAULT 3.00 NOT NULL,
    lat numeric(10,8),
    lng numeric(11,8),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: license_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_audit_logs (
    id integer NOT NULL,
    license_id text NOT NULL,
    action character varying(50) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    user_id text,
    "timestamp" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: license_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_audit_logs_id_seq OWNED BY public.license_audit_logs.id;


--
-- Name: license_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_invoices (
    id integer NOT NULL,
    license_id text NOT NULL,
    invoice_number character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'JOD'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    due_date timestamp(6) without time zone,
    paid_at timestamp(6) without time zone,
    payment_method character varying(50),
    company_id text,
    duration_days integer,
    issued_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    due_at timestamp(6) without time zone,
    metadata jsonb,
    created_by text
);


--
-- Name: license_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_invoices_id_seq OWNED BY public.license_invoices.id;


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id text NOT NULL,
    company_id text NOT NULL,
    status public.license_status DEFAULT 'active'::public.license_status NOT NULL,
    start_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    features jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text,
    updated_by text,
    days_remaining integer DEFAULT 0 NOT NULL,
    last_checked timestamp(3) without time zone,
    renewed_at timestamp(3) without time zone,
    total_days integer DEFAULT 30 NOT NULL
);


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id text NOT NULL,
    company_id text NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    image text,
    display_number integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text
);


--
-- Name: menu_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_products (
    id text NOT NULL,
    company_id text NOT NULL,
    category_id text,
    name jsonb NOT NULL,
    description jsonb,
    image text,
    slug text,
    base_price numeric(10,2) NOT NULL,
    pricing jsonb DEFAULT '{}'::jsonb NOT NULL,
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    status integer DEFAULT 1 NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    preparation_time integer DEFAULT 15 NOT NULL,
    pricing_method integer DEFAULT 1 NOT NULL,
    selling_method integer DEFAULT 1 NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text,
    images text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: modifier_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifier_categories (
    id text NOT NULL,
    company_id text NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    display_number integer DEFAULT 0 NOT NULL,
    image text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    is_required boolean DEFAULT false NOT NULL,
    max_selections integer DEFAULT 1 NOT NULL,
    min_selections integer DEFAULT 0 NOT NULL,
    selection_type public.modifier_selection_type DEFAULT 'single'::public.modifier_selection_type NOT NULL
);


--
-- Name: modifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifiers (
    id text NOT NULL,
    modifier_category_id text NOT NULL,
    company_id text NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    base_price numeric(10,2) NOT NULL,
    pricing jsonb DEFAULT '{}'::jsonb NOT NULL,
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    status integer DEFAULT 1 NOT NULL,
    display_number integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    image text,
    is_default boolean DEFAULT false NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    order_id text NOT NULL,
    product_id text NOT NULL,
    product_name jsonb NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    modifiers jsonb,
    special_requests text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text NOT NULL,
    order_number text NOT NULL,
    branch_id text NOT NULL,
    delivery_zone_id text,
    delivery_provider_id text,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text,
    delivery_address text,
    delivery_lat numeric(10,8),
    delivery_lng numeric(11,8),
    order_type public.order_type NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    delivery_fee numeric(8,2) DEFAULT 0.00 NOT NULL,
    tax_amount numeric(8,2) DEFAULT 0.00 NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    estimated_delivery_time timestamp(3) without time zone,
    actual_delivery_time timestamp(3) without time zone,
    provider_order_id text,
    provider_tracking_url text,
    driver_info jsonb,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    delivered_at timestamp(3) without time zone,
    cancelled_at timestamp(3) without time zone,
    cancellation_reason text
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    promotion_id text,
    old_price numeric(10,2),
    new_price numeric(10,2),
    change_reason text,
    platform text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text
);


--
-- Name: print_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.print_jobs (
    id text NOT NULL,
    type public.print_job_type NOT NULL,
    printer_id text NOT NULL,
    content text NOT NULL,
    status public.print_job_status DEFAULT 'pending'::public.print_job_status NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    order_id text,
    company_id text NOT NULL,
    branch_id text,
    user_id text,
    attempts integer DEFAULT 0 NOT NULL,
    processing_time integer,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    started_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    failed_at timestamp(3) without time zone
);


--
-- Name: print_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.print_templates (
    id text NOT NULL,
    name text NOT NULL,
    type public.print_job_type NOT NULL,
    template text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    company_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: printers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.printers (
    id text NOT NULL,
    name text NOT NULL,
    type public.printer_type NOT NULL,
    connection public.printer_connection NOT NULL,
    ip text,
    port integer DEFAULT 9100,
    manufacturer text,
    model text,
    location text,
    "paperWidth" integer,
    "assignedTo" public.printer_assignment DEFAULT 'cashier'::public.printer_assignment NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    status public.printer_status DEFAULT 'unknown'::public.printer_status NOT NULL,
    capabilities text,
    last_seen timestamp(3) without time zone,
    company_id text NOT NULL,
    branch_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id text NOT NULL,
    product_id text,
    filename text NOT NULL,
    original_name text NOT NULL,
    url text NOT NULL,
    size integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    mime_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: product_modifier_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_modifier_categories (
    id text NOT NULL,
    product_id text NOT NULL,
    modifier_category_id text NOT NULL,
    min_quantity integer DEFAULT 0 NOT NULL,
    max_quantity integer DEFAULT 1 NOT NULL,
    price_override numeric(10,2),
    is_required boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_analytics (
    id text NOT NULL,
    campaign_id text NOT NULL,
    date date NOT NULL,
    platform text NOT NULL,
    total_uses integer DEFAULT 0 NOT NULL,
    unique_customers integer DEFAULT 0 NOT NULL,
    new_customers integer DEFAULT 0 NOT NULL,
    returning_customers integer DEFAULT 0 NOT NULL,
    gross_revenue numeric(15,2) DEFAULT 0 NOT NULL,
    total_discount_given numeric(15,2) DEFAULT 0 NOT NULL,
    average_order_value numeric(10,2) DEFAULT 0 NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    impression_count integer DEFAULT 0 NOT NULL,
    click_count integer DEFAULT 0 NOT NULL,
    conversion_rate numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_campaigns (
    id text NOT NULL,
    company_id text NOT NULL,
    name jsonb DEFAULT '{}'::jsonb NOT NULL,
    description jsonb DEFAULT '{}'::jsonb NOT NULL,
    slug text NOT NULL,
    type public.promotion_campaign_type NOT NULL,
    status public.promotion_status DEFAULT 'draft'::public.promotion_status NOT NULL,
    priority integer DEFAULT 999 NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    is_stackable boolean DEFAULT false NOT NULL,
    starts_at timestamp(3) without time zone,
    ends_at timestamp(3) without time zone,
    days_of_week integer[] DEFAULT ARRAY[]::integer[],
    time_ranges jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_usage_limit integer,
    per_customer_limit integer DEFAULT 1 NOT NULL,
    current_usage_count integer DEFAULT 0 NOT NULL,
    discount_value numeric(10,2),
    max_discount_amount numeric(10,2),
    minimum_order_amount numeric(10,2),
    minimum_items_count integer DEFAULT 1 NOT NULL,
    buy_quantity integer,
    get_quantity integer,
    get_discount_percentage numeric(5,2),
    target_platforms text[] DEFAULT ARRAY[]::text[],
    target_customer_segments text[] DEFAULT ARRAY[]::text[],
    total_revenue_impact numeric(15,2) DEFAULT 0 NOT NULL,
    total_orders_count integer DEFAULT 0 NOT NULL,
    total_customers_reached integer DEFAULT 0 NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


--
-- Name: promotion_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_codes (
    id text NOT NULL,
    campaign_id text NOT NULL,
    code text NOT NULL,
    is_single_use boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_menu_items (
    id text NOT NULL,
    campaign_id text NOT NULL,
    menu_item_id text NOT NULL,
    discount_value numeric(10,2),
    discount_type text DEFAULT 'percentage'::text NOT NULL,
    max_discount_amount numeric(10,2),
    platforms text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: promotion_modifier_markups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_modifier_markups (
    id text NOT NULL,
    promotion_id text NOT NULL,
    product_id text NOT NULL,
    modifier_id text NOT NULL,
    markup_percentage numeric(5,2) NOT NULL,
    original_price numeric(10,2) NOT NULL,
    marked_up_price numeric(10,2) NOT NULL,
    profit_margin numeric(5,2),
    business_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_platform_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_platform_configs (
    id text NOT NULL,
    campaign_id text NOT NULL,
    platform text NOT NULL,
    platform_specific_id text,
    custom_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_synced boolean DEFAULT false NOT NULL,
    last_synced_at timestamp(3) without time zone,
    sync_error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_products (
    id text NOT NULL,
    promotion_id text NOT NULL,
    product_id text NOT NULL,
    base_discount_type text DEFAULT 'percentage'::text NOT NULL,
    base_discount_value numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_targets (
    id text NOT NULL,
    campaign_id text NOT NULL,
    target_type public.promotion_target_type NOT NULL,
    target_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotion_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_templates (
    id text NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    description text,
    template_data jsonb NOT NULL,
    category text DEFAULT 'custom'::text NOT NULL,
    is_global boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: promotion_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_usage (
    id text NOT NULL,
    campaign_id text NOT NULL,
    code_id text,
    customer_id text,
    customer_email text,
    customer_phone text,
    order_id text,
    usage_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    discount_applied numeric(10,2) NOT NULL,
    order_total numeric(10,2),
    platform_used text,
    branch_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: promotion_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_variants (
    id text NOT NULL,
    campaign_id text NOT NULL,
    variant_name text NOT NULL,
    traffic_percentage integer DEFAULT 50 NOT NULL,
    configuration_override jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id text NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    description text,
    promotion_type text DEFAULT 'selective_product'::text NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    auto_revert boolean DEFAULT true NOT NULL,
    platforms jsonb DEFAULT '["all"]'::jsonb NOT NULL,
    min_profit_margin numeric(5,2) DEFAULT 15.00 NOT NULL,
    original_pricing_snapshot jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text
);


--
-- Name: provider_order_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_order_logs (
    id text NOT NULL,
    company_provider_config_id text NOT NULL,
    branch_id text,
    order_id text,
    provider_order_id text,
    order_status text DEFAULT 'pending'::text NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    webhook_payload jsonb,
    error_message text,
    processing_time_ms integer,
    api_endpoint text,
    http_status_code integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    description text,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    refresh_token_hash text,
    expires_at timestamp(3) without time zone NOT NULL,
    refresh_expires_at timestamp(3) without time zone,
    ip_address text,
    user_agent text,
    device_type text,
    is_active boolean DEFAULT true NOT NULL,
    revoked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    avatar_url text,
    password_hash text NOT NULL,
    pin text,
    email_verified_at timestamp(3) without time zone,
    role public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    company_id text NOT NULL,
    branch_id text,
    language text DEFAULT 'en'::bpchar NOT NULL,
    timezone text DEFAULT 'Asia/Amman'::character varying NOT NULL,
    last_login_at timestamp(3) without time zone,
    last_login_ip text,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) without time zone,
    must_change_password boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text,
    first_name text,
    last_name text,
    username text
);


--
-- Name: webhook_delivery_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_delivery_logs (
    id text NOT NULL,
    company_id text NOT NULL,
    provider_type text NOT NULL,
    webhook_type text NOT NULL,
    order_id text,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    processing_attempts integer DEFAULT 0 NOT NULL,
    processed_at timestamp(3) without time zone,
    error_message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: license_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.license_audit_logs_id_seq'::regclass);


--
-- Name: license_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_invoices ALTER COLUMN id SET DEFAULT nextval('public.license_invoices_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: availability_alerts availability_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_alerts
    ADD CONSTRAINT availability_alerts_pkey PRIMARY KEY (id);


--
-- Name: availability_audit_logs availability_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_audit_logs
    ADD CONSTRAINT availability_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: availability_templates availability_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_templates
    ADD CONSTRAINT availability_templates_pkey PRIMARY KEY (id);


--
-- Name: branch_availabilities branch_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_availabilities
    ADD CONSTRAINT branch_availabilities_pkey PRIMARY KEY (id);


--
-- Name: branch_provider_mappings branch_provider_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_provider_mappings
    ADD CONSTRAINT branch_provider_mappings_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: company_provider_configs company_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_provider_configs
    ADD CONSTRAINT company_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: delivery_error_logs delivery_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_error_logs
    ADD CONSTRAINT delivery_error_logs_pkey PRIMARY KEY (id);


--
-- Name: delivery_provider_analytics delivery_provider_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_analytics
    ADD CONSTRAINT delivery_provider_analytics_pkey PRIMARY KEY (id);


--
-- Name: delivery_provider_orders delivery_provider_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_pkey PRIMARY KEY (id);


--
-- Name: delivery_providers delivery_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_providers
    ADD CONSTRAINT delivery_providers_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: global_locations global_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_locations
    ADD CONSTRAINT global_locations_pkey PRIMARY KEY (id);


--
-- Name: jordan_locations jordan_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jordan_locations
    ADD CONSTRAINT jordan_locations_pkey PRIMARY KEY (id);


--
-- Name: license_audit_logs license_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_audit_logs
    ADD CONSTRAINT license_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: license_invoices license_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_invoices
    ADD CONSTRAINT license_invoices_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_products menu_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_pkey PRIMARY KEY (id);


--
-- Name: modifier_categories modifier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_categories
    ADD CONSTRAINT modifier_categories_pkey PRIMARY KEY (id);


--
-- Name: modifiers modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifiers
    ADD CONSTRAINT modifiers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: print_jobs print_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_pkey PRIMARY KEY (id);


--
-- Name: print_templates print_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_pkey PRIMARY KEY (id);


--
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_modifier_categories product_modifier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_modifier_categories
    ADD CONSTRAINT product_modifier_categories_pkey PRIMARY KEY (id);


--
-- Name: promotion_analytics promotion_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_analytics
    ADD CONSTRAINT promotion_analytics_pkey PRIMARY KEY (id);


--
-- Name: promotion_campaigns promotion_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_campaigns
    ADD CONSTRAINT promotion_campaigns_pkey PRIMARY KEY (id);


--
-- Name: promotion_codes promotion_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_pkey PRIMARY KEY (id);


--
-- Name: promotion_menu_items promotion_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_menu_items
    ADD CONSTRAINT promotion_menu_items_pkey PRIMARY KEY (id);


--
-- Name: promotion_modifier_markups promotion_modifier_markups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_pkey PRIMARY KEY (id);


--
-- Name: promotion_platform_configs promotion_platform_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_platform_configs
    ADD CONSTRAINT promotion_platform_configs_pkey PRIMARY KEY (id);


--
-- Name: promotion_products promotion_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_pkey PRIMARY KEY (id);


--
-- Name: promotion_targets promotion_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_targets
    ADD CONSTRAINT promotion_targets_pkey PRIMARY KEY (id);


--
-- Name: promotion_templates promotion_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_templates
    ADD CONSTRAINT promotion_templates_pkey PRIMARY KEY (id);


--
-- Name: promotion_usage promotion_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage
    ADD CONSTRAINT promotion_usage_pkey PRIMARY KEY (id);


--
-- Name: promotion_variants promotion_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_variants
    ADD CONSTRAINT promotion_variants_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: provider_order_logs provider_order_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_order_logs
    ADD CONSTRAINT provider_order_logs_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);


--
-- Name: user_sessions user_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_delivery_logs webhook_delivery_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_delivery_logs
    ADD CONSTRAINT webhook_delivery_logs_pkey PRIMARY KEY (id);


--
-- Name: _DeliveryProviderToJordanLocation_AB_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "_DeliveryProviderToJordanLocation_AB_unique" ON public."_DeliveryProviderToJordanLocation" USING btree ("A", "B");


--
-- Name: _DeliveryProviderToJordanLocation_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_DeliveryProviderToJordanLocation_B_index" ON public."_DeliveryProviderToJordanLocation" USING btree ("B");


--
-- Name: availability_alerts_branch_id_alert_type_is_resolved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_alerts_branch_id_alert_type_is_resolved_idx ON public.availability_alerts USING btree (branch_id, alert_type, is_resolved);


--
-- Name: availability_alerts_company_id_is_read_severity_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_alerts_company_id_is_read_severity_created_at_idx ON public.availability_alerts USING btree (company_id, is_read, severity, created_at);


--
-- Name: availability_audit_logs_batch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_audit_logs_batch_id_idx ON public.availability_audit_logs USING btree (batch_id);


--
-- Name: availability_audit_logs_branch_availability_id_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_audit_logs_branch_availability_id_timestamp_idx ON public.availability_audit_logs USING btree (branch_availability_id, "timestamp");


--
-- Name: availability_audit_logs_company_id_change_type_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_audit_logs_company_id_change_type_timestamp_idx ON public.availability_audit_logs USING btree (company_id, change_type, "timestamp");


--
-- Name: availability_templates_company_id_template_type_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_templates_company_id_template_type_is_active_idx ON public.availability_templates USING btree (company_id, template_type, is_active);


--
-- Name: branch_availabilities_branch_id_connected_type_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_availabilities_branch_id_connected_type_is_active_idx ON public.branch_availabilities USING btree (branch_id, connected_type, is_active);


--
-- Name: branch_availabilities_branch_id_is_active_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_availabilities_branch_id_is_active_priority_idx ON public.branch_availabilities USING btree (branch_id, is_active, priority);


--
-- Name: branch_availabilities_company_id_connected_type_is_in_stock_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_availabilities_company_id_connected_type_is_in_stock_idx ON public.branch_availabilities USING btree (company_id, connected_type, is_in_stock);


--
-- Name: branch_availabilities_connected_id_connected_type_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_availabilities_connected_id_connected_type_branch_id_idx ON public.branch_availabilities USING btree (connected_id, connected_type, branch_id);


--
-- Name: branch_provider_mappings_branch_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_provider_mappings_branch_id_is_active_idx ON public.branch_provider_mappings USING btree (branch_id, is_active);


--
-- Name: branch_provider_mappings_company_provider_config_id_is_acti_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_provider_mappings_company_provider_config_id_is_acti_idx ON public.branch_provider_mappings USING btree (company_provider_config_id, is_active);


--
-- Name: branch_provider_mappings_provider_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branch_provider_mappings_provider_branch_id_idx ON public.branch_provider_mappings USING btree (provider_branch_id);


--
-- Name: branches_allows_delivery_allows_online_orders_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_allows_delivery_allows_online_orders_idx ON public.branches USING btree (allows_delivery, allows_online_orders);


--
-- Name: branches_city_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_city_is_active_idx ON public.branches USING btree (city, is_active);


--
-- Name: branches_company_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_company_id_is_active_idx ON public.branches USING btree (company_id, is_active);


--
-- Name: branches_company_id_is_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_company_id_is_default_idx ON public.branches USING btree (company_id, is_default);


--
-- Name: branches_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_latitude_longitude_idx ON public.branches USING btree (latitude, longitude);


--
-- Name: companies_business_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_business_type_status_idx ON public.companies USING btree (business_type, status);


--
-- Name: companies_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_status_idx ON public.companies USING btree (status);


--
-- Name: companies_subscription_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_subscription_expires_at_idx ON public.companies USING btree (subscription_expires_at);


--
-- Name: company_provider_configs_company_id_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_provider_configs_company_id_priority_idx ON public.company_provider_configs USING btree (company_id, priority);


--
-- Name: company_provider_configs_company_id_provider_type_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_provider_configs_company_id_provider_type_is_active_idx ON public.company_provider_configs USING btree (company_id, provider_type, is_active);


--
-- Name: delivery_error_logs_company_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_error_logs_company_id_created_at_idx ON public.delivery_error_logs USING btree (company_id, created_at);


--
-- Name: delivery_error_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_error_logs_created_at_idx ON public.delivery_error_logs USING btree (created_at);


--
-- Name: delivery_error_logs_provider_type_error_type_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_error_logs_provider_type_error_type_created_at_idx ON public.delivery_error_logs USING btree (provider_type, error_type, created_at);


--
-- Name: delivery_provider_analytics_company_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_provider_analytics_company_id_date_idx ON public.delivery_provider_analytics USING btree (company_id, date);


--
-- Name: delivery_provider_analytics_company_id_provider_type_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX delivery_provider_analytics_company_id_provider_type_date_key ON public.delivery_provider_analytics USING btree (company_id, provider_type, date);


--
-- Name: delivery_provider_analytics_provider_type_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_provider_analytics_provider_type_date_idx ON public.delivery_provider_analytics USING btree (provider_type, date);


--
-- Name: delivery_provider_orders_company_id_order_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_provider_orders_company_id_order_status_created_at_idx ON public.delivery_provider_orders USING btree (company_id, order_status, created_at);


--
-- Name: delivery_provider_orders_delivery_provider_id_provider_orde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_provider_orders_delivery_provider_id_provider_orde_idx ON public.delivery_provider_orders USING btree (delivery_provider_id, provider_order_id);


--
-- Name: delivery_provider_orders_order_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_provider_orders_order_number_idx ON public.delivery_provider_orders USING btree (order_number);


--
-- Name: delivery_providers_company_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_providers_company_id_is_active_idx ON public.delivery_providers USING btree (company_id, is_active);


--
-- Name: delivery_providers_is_active_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_providers_is_active_priority_idx ON public.delivery_providers USING btree (is_active, priority);


--
-- Name: delivery_zones_branch_id_is_active_priority_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_zones_branch_id_is_active_priority_level_idx ON public.delivery_zones USING btree (branch_id, is_active, priority_level);


--
-- Name: global_locations_city_name_area_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_locations_city_name_area_name_idx ON public.global_locations USING btree (city_name, area_name);


--
-- Name: global_locations_country_name_city_name_area_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_locations_country_name_city_name_area_name_idx ON public.global_locations USING btree (country_name, city_name, area_name);


--
-- Name: global_locations_governorate_city_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_locations_governorate_city_name_idx ON public.global_locations USING btree (governorate, city_name);


--
-- Name: global_locations_is_active_city_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_locations_is_active_city_name_idx ON public.global_locations USING btree (is_active, city_name);


--
-- Name: global_locations_search_text_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX global_locations_search_text_idx ON public.global_locations USING btree (search_text);


--
-- Name: idx_branch_provider_mappings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_provider_mappings_active ON public.branch_provider_mappings USING btree (branch_id, is_active, priority) WHERE (deleted_at IS NULL);


--
-- Name: idx_branches_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_active ON public.branches USING btree (is_active) WHERE ((deleted_at IS NULL) AND (is_active = true));


--
-- Name: idx_branches_company_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_company_active ON public.branches USING btree (company_id, is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_branches_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_default ON public.branches USING btree (company_id) WHERE ((is_default = true) AND (deleted_at IS NULL));


--
-- Name: idx_company_provider_configs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_provider_configs_active ON public.company_provider_configs USING btree (company_id, is_active, priority) WHERE (deleted_at IS NULL);


--
-- Name: idx_company_provider_configs_provider_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_provider_configs_provider_type ON public.company_provider_configs USING btree (provider_type, is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_delivery_error_logs_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_error_logs_company ON public.delivery_error_logs USING btree (company_id, created_at);


--
-- Name: idx_delivery_error_logs_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_error_logs_provider ON public.delivery_error_logs USING btree (provider_type, error_type, created_at);


--
-- Name: idx_delivery_error_logs_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_error_logs_unresolved ON public.delivery_error_logs USING btree (created_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_delivery_provider_analytics_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_provider_analytics_company ON public.delivery_provider_analytics USING btree (company_id, date);


--
-- Name: idx_delivery_provider_analytics_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_provider_analytics_provider ON public.delivery_provider_analytics USING btree (provider_type, date);


--
-- Name: idx_delivery_provider_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_provider_orders_status ON public.delivery_provider_orders USING btree (company_id, order_status, created_at);


--
-- Name: idx_licenses_days_remaining; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_days_remaining ON public.licenses USING btree (days_remaining) WHERE (status = 'active'::public.license_status);


--
-- Name: idx_licenses_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_expires_at ON public.licenses USING btree (expires_at) WHERE (status = 'active'::public.license_status);


--
-- Name: idx_licenses_expiry_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_expiry_active ON public.licenses USING btree (expires_at) WHERE (status = 'active'::public.license_status);


--
-- Name: idx_menu_categories_company_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_categories_company_active ON public.menu_categories USING btree (company_id, is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_menu_products_company_category_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_products_company_category_status ON public.menu_products USING btree (company_id, category_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_menu_products_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_products_deleted_at ON public.menu_products USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_menu_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_products_slug ON public.menu_products USING btree (slug) WHERE (deleted_at IS NULL);


--
-- Name: idx_menu_products_status_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_products_status_priority ON public.menu_products USING btree (status, priority DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.user_sessions USING btree (token_hash) WHERE (is_active = true);


--
-- Name: idx_user_sessions_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_active ON public.user_sessions USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_users_branch_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_branch_role ON public.users USING btree (branch_id, role) WHERE ((deleted_at IS NULL) AND (branch_id IS NOT NULL));


--
-- Name: idx_users_company_role_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_role_status ON public.users USING btree (company_id, role, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_status ON public.users USING btree (company_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login_at DESC) WHERE (last_login_at IS NOT NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role) WHERE (deleted_at IS NULL);


--
-- Name: idx_webhook_delivery_logs_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_delivery_logs_company ON public.webhook_delivery_logs USING btree (company_id, created_at);


--
-- Name: idx_webhook_delivery_logs_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_delivery_logs_provider ON public.webhook_delivery_logs USING btree (provider_type, webhook_type, created_at);


--
-- Name: idx_webhook_delivery_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_delivery_logs_status ON public.webhook_delivery_logs USING btree (status, created_at);


--
-- Name: jordan_locations_area_name_en_area_name_ar_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jordan_locations_area_name_en_area_name_ar_idx ON public.jordan_locations USING btree (area_name_en, area_name_ar);


--
-- Name: jordan_locations_governorate_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jordan_locations_governorate_city_idx ON public.jordan_locations USING btree (governorate, city);


--
-- Name: license_invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX license_invoices_invoice_number_key ON public.license_invoices USING btree (invoice_number);


--
-- Name: licenses_company_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licenses_company_id_status_idx ON public.licenses USING btree (company_id, status);


--
-- Name: licenses_days_remaining_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licenses_days_remaining_idx ON public.licenses USING btree (days_remaining);


--
-- Name: licenses_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licenses_expires_at_idx ON public.licenses USING btree (expires_at);


--
-- Name: licenses_status_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX licenses_status_expires_at_idx ON public.licenses USING btree (status, expires_at);


--
-- Name: menu_categories_company_id_is_active_display_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_categories_company_id_is_active_display_number_idx ON public.menu_categories USING btree (company_id, is_active, display_number);


--
-- Name: menu_products_company_id_category_id_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_products_company_id_category_id_priority_idx ON public.menu_products USING btree (company_id, category_id, priority);


--
-- Name: menu_products_company_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_products_company_id_created_at_idx ON public.menu_products USING btree (company_id, created_at);


--
-- Name: menu_products_company_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_products_company_id_status_idx ON public.menu_products USING btree (company_id, status);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_product_id_idx ON public.order_items USING btree (product_id);


--
-- Name: orders_branch_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_branch_id_status_created_at_idx ON public.orders USING btree (branch_id, status, created_at);


--
-- Name: orders_customer_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_customer_phone_idx ON public.orders USING btree (customer_phone);


--
-- Name: orders_delivery_provider_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_delivery_provider_id_status_idx ON public.orders USING btree (delivery_provider_id, status);


--
-- Name: orders_estimated_delivery_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_estimated_delivery_time_idx ON public.orders USING btree (estimated_delivery_time);


--
-- Name: orders_order_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_order_number_idx ON public.orders USING btree (order_number);


--
-- Name: orders_order_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);


--
-- Name: orders_order_type_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_order_type_status_created_at_idx ON public.orders USING btree (order_type, status, created_at);


--
-- Name: orders_payment_status_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_payment_status_status_idx ON public.orders USING btree (payment_status, status);


--
-- Name: print_jobs_company_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX print_jobs_company_id_status_created_at_idx ON public.print_jobs USING btree (company_id, status, created_at);


--
-- Name: print_jobs_printer_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX print_jobs_printer_id_status_created_at_idx ON public.print_jobs USING btree (printer_id, status, created_at);


--
-- Name: print_jobs_priority_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX print_jobs_priority_created_at_idx ON public.print_jobs USING btree (priority, created_at);


--
-- Name: print_templates_company_id_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX print_templates_company_id_type_idx ON public.print_templates USING btree (company_id, type);


--
-- Name: printers_branch_id_assignedTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "printers_branch_id_assignedTo_idx" ON public.printers USING btree (branch_id, "assignedTo");


--
-- Name: printers_company_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX printers_company_id_status_idx ON public.printers USING btree (company_id, status);


--
-- Name: product_images_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_images_created_at_idx ON public.product_images USING btree (created_at);


--
-- Name: product_images_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_images_product_id_idx ON public.product_images USING btree (product_id);


--
-- Name: promotion_analytics_campaign_id_date_platform_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotion_analytics_campaign_id_date_platform_key ON public.promotion_analytics USING btree (campaign_id, date, platform);


--
-- Name: promotion_campaigns_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotion_campaigns_slug_key ON public.promotion_campaigns USING btree (slug);


--
-- Name: promotion_codes_campaign_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotion_codes_campaign_id_code_key ON public.promotion_codes USING btree (campaign_id, code);


--
-- Name: promotion_menu_items_campaign_id_menu_item_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotion_menu_items_campaign_id_menu_item_id_key ON public.promotion_menu_items USING btree (campaign_id, menu_item_id);


--
-- Name: promotion_menu_items_campaign_id_platforms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotion_menu_items_campaign_id_platforms_idx ON public.promotion_menu_items USING btree (campaign_id, platforms);


--
-- Name: promotion_menu_items_menu_item_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotion_menu_items_menu_item_id_is_active_idx ON public.promotion_menu_items USING btree (menu_item_id, is_active);


--
-- Name: promotion_platform_configs_campaign_id_platform_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotion_platform_configs_campaign_id_platform_key ON public.promotion_platform_configs USING btree (campaign_id, platform);


--
-- Name: provider_order_logs_company_provider_config_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provider_order_logs_company_provider_config_id_created_at_idx ON public.provider_order_logs USING btree (company_provider_config_id, created_at);


--
-- Name: provider_order_logs_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provider_order_logs_order_id_idx ON public.provider_order_logs USING btree (order_id);


--
-- Name: provider_order_logs_order_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provider_order_logs_order_status_idx ON public.provider_order_logs USING btree (order_status);


--
-- Name: provider_order_logs_provider_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provider_order_logs_provider_order_id_idx ON public.provider_order_logs USING btree (provider_order_id);


--
-- Name: user_activity_logs_action_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_activity_logs_action_timestamp_idx ON public.user_activity_logs USING btree (action, "timestamp");


--
-- Name: user_activity_logs_resource_type_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_activity_logs_resource_type_resource_id_idx ON public.user_activity_logs USING btree (resource_type, resource_id);


--
-- Name: user_activity_logs_success_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_activity_logs_success_timestamp_idx ON public.user_activity_logs USING btree (success, "timestamp");


--
-- Name: user_activity_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_activity_logs_timestamp_idx ON public.user_activity_logs USING btree ("timestamp");


--
-- Name: user_activity_logs_user_id_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_activity_logs_user_id_timestamp_idx ON public.user_activity_logs USING btree (user_id, "timestamp");


--
-- Name: user_sessions_expires_at_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_expires_at_is_active_idx ON public.user_sessions USING btree (expires_at, is_active);


--
-- Name: user_sessions_ip_address_user_agent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_ip_address_user_agent_idx ON public.user_sessions USING btree (ip_address, user_agent);


--
-- Name: user_sessions_last_used_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_last_used_at_idx ON public.user_sessions USING btree (last_used_at);


--
-- Name: user_sessions_refresh_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_refresh_expires_at_idx ON public.user_sessions USING btree (refresh_expires_at);


--
-- Name: user_sessions_user_id_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_user_id_is_active_idx ON public.user_sessions USING btree (user_id, is_active);


--
-- Name: users_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_branch_id_idx ON public.users USING btree (branch_id);


--
-- Name: users_company_id_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_company_id_role_idx ON public.users USING btree (company_id, role);


--
-- Name: users_company_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_company_id_status_idx ON public.users USING btree (company_id, status);


--
-- Name: users_failed_login_attempts_locked_until_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_failed_login_attempts_locked_until_idx ON public.users USING btree (failed_login_attempts, locked_until);


--
-- Name: users_status_last_login_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_status_last_login_at_idx ON public.users USING btree (status, last_login_at);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: webhook_delivery_logs_company_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_delivery_logs_company_id_created_at_idx ON public.webhook_delivery_logs USING btree (company_id, created_at);


--
-- Name: webhook_delivery_logs_provider_type_webhook_type_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_delivery_logs_provider_type_webhook_type_created_at_idx ON public.webhook_delivery_logs USING btree (provider_type, webhook_type, created_at);


--
-- Name: webhook_delivery_logs_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_delivery_logs_status_created_at_idx ON public.webhook_delivery_logs USING btree (status, created_at);


--
-- Name: licenses license_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER license_audit_trigger AFTER INSERT OR UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.trigger_license_audit_log();


--
-- Name: delivery_error_logs update_delivery_error_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_error_logs_updated_at BEFORE UPDATE ON public.delivery_error_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_provider_analytics update_delivery_provider_analytics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_provider_analytics_updated_at BEFORE UPDATE ON public.delivery_provider_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhook_delivery_logs update_webhook_delivery_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webhook_delivery_logs_updated_at BEFORE UPDATE ON public.webhook_delivery_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _DeliveryProviderToJordanLocation _DeliveryProviderToJordanLocation_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_DeliveryProviderToJordanLocation"
    ADD CONSTRAINT "_DeliveryProviderToJordanLocation_A_fkey" FOREIGN KEY ("A") REFERENCES public.delivery_providers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _DeliveryProviderToJordanLocation _DeliveryProviderToJordanLocation_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_DeliveryProviderToJordanLocation"
    ADD CONSTRAINT "_DeliveryProviderToJordanLocation_B_fkey" FOREIGN KEY ("B") REFERENCES public.jordan_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_alerts availability_alerts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_alerts
    ADD CONSTRAINT availability_alerts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: availability_alerts availability_alerts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_alerts
    ADD CONSTRAINT availability_alerts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_audit_logs availability_audit_logs_branch_availability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_audit_logs
    ADD CONSTRAINT availability_audit_logs_branch_availability_id_fkey FOREIGN KEY (branch_availability_id) REFERENCES public.branch_availabilities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_audit_logs availability_audit_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_audit_logs
    ADD CONSTRAINT availability_audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_templates availability_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_templates
    ADD CONSTRAINT availability_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_availabilities branch_availabilities_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_availabilities
    ADD CONSTRAINT branch_availabilities_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_availabilities branch_availabilities_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_availabilities
    ADD CONSTRAINT branch_availabilities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_provider_mappings branch_provider_mappings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_provider_mappings
    ADD CONSTRAINT branch_provider_mappings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_provider_mappings branch_provider_mappings_company_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_provider_mappings
    ADD CONSTRAINT branch_provider_mappings_company_provider_config_id_fkey FOREIGN KEY (company_provider_config_id) REFERENCES public.company_provider_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branches branches_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_provider_configs company_provider_configs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_provider_configs
    ADD CONSTRAINT company_provider_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_error_logs delivery_error_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_error_logs
    ADD CONSTRAINT delivery_error_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_provider_analytics delivery_provider_analytics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_analytics
    ADD CONSTRAINT delivery_provider_analytics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_provider_orders delivery_provider_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_provider_orders delivery_provider_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_provider_orders delivery_provider_orders_delivery_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_delivery_provider_id_fkey FOREIGN KEY (delivery_provider_id) REFERENCES public.delivery_providers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_providers delivery_providers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_providers
    ADD CONSTRAINT delivery_providers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: delivery_zones delivery_zones_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_zones delivery_zones_global_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_global_location_id_fkey FOREIGN KEY (global_location_id) REFERENCES public.global_locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: licenses licenses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_products menu_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_products menu_products_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modifier_categories modifier_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_categories
    ADD CONSTRAINT modifier_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modifiers modifiers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifiers
    ADD CONSTRAINT modifiers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modifiers modifiers_modifier_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifiers
    ADD CONSTRAINT modifiers_modifier_category_id_fkey FOREIGN KEY (modifier_category_id) REFERENCES public.modifier_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_delivery_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_provider_id_fkey FOREIGN KEY (delivery_provider_id) REFERENCES public.delivery_providers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_delivery_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_zone_id_fkey FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: price_history price_history_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: print_jobs print_jobs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: print_jobs print_jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: print_jobs print_jobs_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: print_jobs print_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: print_templates print_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printers printers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: printers printers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_modifier_categories product_modifier_categories_modifier_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_modifier_categories
    ADD CONSTRAINT product_modifier_categories_modifier_category_id_fkey FOREIGN KEY (modifier_category_id) REFERENCES public.modifier_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_modifier_categories product_modifier_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_modifier_categories
    ADD CONSTRAINT product_modifier_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_analytics promotion_analytics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_analytics
    ADD CONSTRAINT promotion_analytics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_campaigns promotion_campaigns_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_campaigns
    ADD CONSTRAINT promotion_campaigns_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_codes promotion_codes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_menu_items promotion_menu_items_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_menu_items
    ADD CONSTRAINT promotion_menu_items_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_menu_items promotion_menu_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_menu_items
    ADD CONSTRAINT promotion_menu_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_modifier_markups promotion_modifier_markups_modifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_modifier_id_fkey FOREIGN KEY (modifier_id) REFERENCES public.modifiers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_modifier_markups promotion_modifier_markups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_modifier_markups promotion_modifier_markups_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_platform_configs promotion_platform_configs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_platform_configs
    ADD CONSTRAINT promotion_platform_configs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_products promotion_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_products promotion_products_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_targets promotion_targets_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_targets
    ADD CONSTRAINT promotion_targets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_templates promotion_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_templates
    ADD CONSTRAINT promotion_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_usage promotion_usage_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage
    ADD CONSTRAINT promotion_usage_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_usage promotion_usage_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage
    ADD CONSTRAINT promotion_usage_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.promotion_codes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: promotion_variants promotion_variants_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_variants
    ADD CONSTRAINT promotion_variants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotions promotions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: provider_order_logs provider_order_logs_company_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_order_logs
    ADD CONSTRAINT provider_order_logs_company_provider_config_id_fkey FOREIGN KEY (company_provider_config_id) REFERENCES public.company_provider_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_activity_logs user_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhook_delivery_logs webhook_delivery_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_delivery_logs
    ADD CONSTRAINT webhook_delivery_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict m36JkPKNkXyKI2cHChlhk8AlDMBwr33sfzG5pcsDEspjfvXe6hO0RPm0iY3bUfp

