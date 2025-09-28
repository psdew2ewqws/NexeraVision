--
-- PostgreSQL database dump
--

\restrict tIbq6XjCXnKdhcbFzXKjgffKDeYwcgfTAi252lnhc2Z0WLtWIeMffTX4g4M2VG7

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: alert_severity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alert_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public.alert_severity OWNER TO postgres;

--
-- Name: alert_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alert_type AS ENUM (
    'low_stock',
    'out_of_stock',
    'pricing_sync_failed',
    'schedule_conflict',
    'inventory_mismatch',
    'platform_sync_error'
);


ALTER TYPE public.alert_type OWNER TO postgres;

--
-- Name: availability_change_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.availability_change_type AS ENUM (
    'status_change',
    'stock_update',
    'price_change',
    'schedule_update',
    'bulk_operation',
    'template_applied'
);


ALTER TYPE public.availability_change_type OWNER TO postgres;

--
-- Name: careem_order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.careem_order_status AS ENUM (
    'pending',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'rejected'
);


ALTER TYPE public.careem_order_status OWNER TO postgres;

--
-- Name: company_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.company_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'trial'
);


ALTER TYPE public.company_status OWNER TO postgres;

--
-- Name: connected_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.connected_type AS ENUM (
    'product',
    'modifier',
    'category'
);


ALTER TYPE public.connected_type OWNER TO postgres;

--
-- Name: customer_segment; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.customer_segment AS ENUM (
    'new',
    'vip',
    'regular',
    'inactive'
);


ALTER TYPE public.customer_segment OWNER TO postgres;

--
-- Name: license_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.license_status AS ENUM (
    'active',
    'expired',
    'suspended',
    'cancelled'
);


ALTER TYPE public.license_status OWNER TO postgres;

--
-- Name: modifier_selection_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.modifier_selection_type AS ENUM (
    'single',
    'multiple',
    'counter'
);


ALTER TYPE public.modifier_selection_type OWNER TO postgres;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.order_status OWNER TO postgres;

--
-- Name: order_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_type AS ENUM (
    'delivery',
    'pickup',
    'dine_in'
);


ALTER TYPE public.order_type OWNER TO postgres;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'online',
    'wallet'
);


ALTER TYPE public.payment_method OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: print_job_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.print_job_status AS ENUM (
    'pending',
    'printing',
    'completed',
    'failed'
);


ALTER TYPE public.print_job_status OWNER TO postgres;

--
-- Name: print_job_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.print_job_type AS ENUM (
    'receipt',
    'kitchen_order',
    'label',
    'test'
);


ALTER TYPE public.print_job_type OWNER TO postgres;

--
-- Name: printer_assignment; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_assignment AS ENUM (
    'kitchen',
    'cashier',
    'bar',
    'all'
);


ALTER TYPE public.printer_assignment OWNER TO postgres;

--
-- Name: printer_connection; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_connection AS ENUM (
    'network',
    'usb',
    'bluetooth',
    'menuhere'
);


ALTER TYPE public.printer_connection OWNER TO postgres;

--
-- Name: printer_discovery_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_discovery_method AS ENUM (
    'auto_network_scan',
    'usb_detection',
    'manual_add',
    'system_printer',
    'cups_discovery',
    'websocket_broadcast'
);


ALTER TYPE public.printer_discovery_method OWNER TO postgres;

--
-- Name: printer_discovery_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_discovery_status AS ENUM (
    'discovered',
    'validated',
    'registered',
    'connected',
    'disconnected',
    'error',
    'duplicate',
    'ignored'
);


ALTER TYPE public.printer_discovery_status OWNER TO postgres;

--
-- Name: printer_license_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_license_status AS ENUM (
    'pending',
    'active',
    'expired',
    'suspended',
    'revoked'
);


ALTER TYPE public.printer_license_status OWNER TO postgres;

--
-- Name: printer_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_status AS ENUM (
    'online',
    'offline',
    'error',
    'unknown'
);


ALTER TYPE public.printer_status OWNER TO postgres;

--
-- Name: printer_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_type AS ENUM (
    'thermal',
    'receipt',
    'kitchen',
    'label'
);


ALTER TYPE public.printer_type OWNER TO postgres;

--
-- Name: promotion_campaign_type; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public.promotion_campaign_type OWNER TO postgres;

--
-- Name: promotion_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.promotion_status AS ENUM (
    'draft',
    'active',
    'paused',
    'expired',
    'archived',
    'scheduled'
);


ALTER TYPE public.promotion_status OWNER TO postgres;

--
-- Name: promotion_target_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.promotion_target_type AS ENUM (
    'product',
    'category',
    'branch',
    'customer',
    'modifier'
);


ALTER TYPE public.promotion_target_type OWNER TO postgres;

--
-- Name: tax_display_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tax_display_mode AS ENUM (
    'tax_inclusive',
    'tax_exclusive',
    'both'
);


ALTER TYPE public.tax_display_mode OWNER TO postgres;

--
-- Name: tax_rounding_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tax_rounding_mode AS ENUM (
    'round_up',
    'round_down',
    'round_half_up',
    'round_half_down',
    'round_nearest'
);


ALTER TYPE public.tax_rounding_mode OWNER TO postgres;

--
-- Name: tax_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tax_type AS ENUM (
    'percentage',
    'fixed',
    'hybrid'
);


ALTER TYPE public.tax_type OWNER TO postgres;

--
-- Name: template_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.template_type AS ENUM (
    'seasonal',
    'holiday',
    'daily',
    'weekly',
    'monthly',
    'special_event'
);


ALTER TYPE public.template_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'company_owner',
    'branch_manager',
    'cashier',
    'call_center'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending'
);


ALTER TYPE public.user_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _DeliveryProviderToJordanLocation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_DeliveryProviderToJordanLocation" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_DeliveryProviderToJordanLocation" OWNER TO postgres;

--
-- Name: ai_generation_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_generation_history (
    id text NOT NULL,
    company_id text NOT NULL,
    user_id text NOT NULL,
    input_prompt text NOT NULL,
    business_context jsonb NOT NULL,
    generated_templates jsonb NOT NULL,
    selected_template_id text,
    generation_time_ms integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ai_generation_history OWNER TO postgres;

--
-- Name: ai_template_optimization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_template_optimization (
    id text NOT NULL,
    template_id text NOT NULL,
    user_id text,
    optimization_goals text[] DEFAULT ARRAY[]::text[],
    constraints jsonb,
    original_metrics jsonb,
    optimized_metrics jsonb,
    improvements jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) without time zone
);


ALTER TABLE public.ai_template_optimization OWNER TO postgres;

--
-- Name: availability_alerts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.availability_alerts OWNER TO postgres;

--
-- Name: availability_audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.availability_audit_logs OWNER TO postgres;

--
-- Name: availability_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.availability_templates OWNER TO postgres;

--
-- Name: branch_availabilities; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.branch_availabilities OWNER TO postgres;

--
-- Name: branch_provider_mappings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.branch_provider_mappings OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
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
    timezone text DEFAULT 'Asia/Amman'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text,
    name_ar text NOT NULL,
    open_time text,
    close_time text,
    integration_data jsonb
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: careem_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.careem_orders (
    id text NOT NULL,
    careem_order_id text NOT NULL,
    company_id text NOT NULL,
    branch_id text NOT NULL,
    status public.careem_order_status DEFAULT 'pending'::public.careem_order_status NOT NULL,
    order_data jsonb NOT NULL,
    customer_data jsonb NOT NULL,
    items_data jsonb NOT NULL,
    pricing_data jsonb NOT NULL,
    processed_at timestamp(3) without time zone,
    internal_order_id text,
    pos_order_id text,
    error_message text,
    careem_created_at timestamp(3) without time zone NOT NULL,
    careem_updated_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.careem_orders OWNER TO postgres;

--
-- Name: careem_webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.careem_webhook_events (
    id text NOT NULL,
    careem_order_id text,
    event_type text NOT NULL,
    event_data jsonb NOT NULL,
    signature text,
    processed boolean DEFAULT false NOT NULL,
    processed_at timestamp(3) without time zone,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    received_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.careem_webhook_events OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    business_type text DEFAULT 'restaurant'::text,
    timezone text DEFAULT 'Asia/Amman'::text NOT NULL,
    default_currency text DEFAULT 'JOD'::text NOT NULL,
    status public.company_status DEFAULT 'trial'::public.company_status NOT NULL,
    subscription_plan text DEFAULT 'basic'::text,
    subscription_expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by text,
    updated_by text
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: company_logos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_logos (
    id text NOT NULL,
    company_id text NOT NULL,
    original_name text NOT NULL,
    thermal_58_data text NOT NULL,
    thermal_58_width integer NOT NULL,
    thermal_58_height integer NOT NULL,
    thermal_58_commands text[],
    thermal_80_data text NOT NULL,
    thermal_80_width integer NOT NULL,
    thermal_80_height integer NOT NULL,
    thermal_80_commands text[],
    web_url text NOT NULL,
    web_width integer NOT NULL,
    web_height integer NOT NULL,
    file_size integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.company_logos OWNER TO postgres;

--
-- Name: company_provider_configs; Type: TABLE; Schema: public; Owner: postgres
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
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.company_provider_configs OWNER TO postgres;

--
-- Name: company_tax_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_tax_settings (
    id text NOT NULL,
    company_id text NOT NULL,
    price_display_mode public.tax_display_mode DEFAULT 'tax_inclusive'::public.tax_display_mode NOT NULL,
    tax_rounding_mode public.tax_rounding_mode DEFAULT 'round_half_up'::public.tax_rounding_mode NOT NULL,
    decimal_places integer DEFAULT 2 NOT NULL,
    show_tax_breakdown boolean DEFAULT true NOT NULL,
    show_tax_inclusive_text boolean DEFAULT true NOT NULL,
    tax_line_label jsonb DEFAULT '{"ar": "الضريبة", "en": "Tax"}'::jsonb NOT NULL,
    vat_number_label jsonb DEFAULT '{"ar": "الرقم الضريبي", "en": "VAT Number"}'::jsonb NOT NULL,
    tax_registration_number text,
    vat_number text,
    default_tax_id text,
    auto_apply_default_tax boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.company_tax_settings OWNER TO postgres;

--
-- Name: delivery_error_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.delivery_error_logs OWNER TO postgres;

--
-- Name: delivery_provider_analytics; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.delivery_provider_analytics OWNER TO postgres;

--
-- Name: delivery_provider_orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.delivery_provider_orders OWNER TO postgres;

--
-- Name: delivery_providers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.delivery_providers OWNER TO postgres;

--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.delivery_zones OWNER TO postgres;

--
-- Name: global_locations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.global_locations OWNER TO postgres;

--
-- Name: jordan_locations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.jordan_locations OWNER TO postgres;

--
-- Name: license_audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.license_audit_logs OWNER TO postgres;

--
-- Name: license_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.license_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.license_audit_logs_id_seq OWNER TO postgres;

--
-- Name: license_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.license_audit_logs_id_seq OWNED BY public.license_audit_logs.id;


--
-- Name: license_invoices; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.license_invoices OWNER TO postgres;

--
-- Name: license_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.license_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.license_invoices_id_seq OWNER TO postgres;

--
-- Name: license_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.license_invoices_id_seq OWNED BY public.license_invoices.id;


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.licenses OWNER TO postgres;

--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.menu_categories OWNER TO postgres;

--
-- Name: menu_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_products (
    id text NOT NULL,
    company_id text NOT NULL,
    branch_id text,
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


ALTER TABLE public.menu_products OWNER TO postgres;

--
-- Name: modifier_categories; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.modifier_categories OWNER TO postgres;

--
-- Name: modifiers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.modifiers OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.price_history OWNER TO postgres;

--
-- Name: print_jobs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.print_jobs OWNER TO postgres;

--
-- Name: print_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.print_templates OWNER TO postgres;

--
-- Name: printer_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer_configurations (
    id text NOT NULL,
    company_id text NOT NULL,
    branch_id text,
    printer_info_id text NOT NULL,
    printer_info text NOT NULL,
    paper_settings text NOT NULL,
    print_settings text NOT NULL,
    jordan_settings text NOT NULL,
    templates text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.printer_configurations OWNER TO postgres;

--
-- Name: printer_discovery_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer_discovery_events (
    id text NOT NULL,
    printer_id text NOT NULL,
    printer_name text NOT NULL,
    printer_type text NOT NULL,
    connection_type text NOT NULL,
    discovery_method public.printer_discovery_method NOT NULL,
    "discoveryStatus" public.printer_discovery_status DEFAULT 'discovered'::public.printer_discovery_status NOT NULL,
    branch_id text NOT NULL,
    company_id text NOT NULL,
    discovered_by text NOT NULL,
    device_id text,
    device_info jsonb,
    printer_details jsonb,
    network_info jsonb,
    capabilities text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true NOT NULL,
    last_seen timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_discovered timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.printer_discovery_events OWNER TO postgres;

--
-- Name: printer_licenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer_licenses (
    id text NOT NULL,
    license_key character varying(255) NOT NULL,
    branch_id text NOT NULL,
    device_id character varying(255),
    device_fingerprint text,
    status public.printer_license_status DEFAULT 'pending'::public.printer_license_status NOT NULL,
    expires_at timestamp(3) without time zone,
    features jsonb DEFAULT '[]'::jsonb,
    validated_at timestamp(3) without time zone,
    device_info jsonb,
    max_printers integer DEFAULT 5,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text,
    updated_by text
);


ALTER TABLE public.printer_licenses OWNER TO postgres;

--
-- Name: printer_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer_sessions (
    id text NOT NULL,
    license_id text,
    branch_id text,
    device_id character varying(255) NOT NULL,
    device_fingerprint text,
    session_token text,
    status character varying(50) DEFAULT 'active'::character varying,
    last_heartbeat timestamp(3) without time zone,
    app_version character varying(50),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at timestamp(3) without time zone
);


ALTER TABLE public.printer_sessions OWNER TO postgres;

--
-- Name: printers; Type: TABLE; Schema: public; Owner: postgres
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
    delivery_platforms jsonb,
    license_key text,
    printer_license_id text,
    last_auto_detection timestamp(3) without time zone,
    menuhere_config jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.printers OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.product_images OWNER TO postgres;

--
-- Name: product_modifier_categories; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.product_modifier_categories OWNER TO postgres;

--
-- Name: promotion_analytics; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_analytics OWNER TO postgres;

--
-- Name: promotion_campaigns; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_campaigns OWNER TO postgres;

--
-- Name: promotion_codes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_codes OWNER TO postgres;

--
-- Name: promotion_menu_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_menu_items OWNER TO postgres;

--
-- Name: promotion_modifier_markups; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_modifier_markups OWNER TO postgres;

--
-- Name: promotion_platform_configs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_platform_configs OWNER TO postgres;

--
-- Name: promotion_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_products (
    id text NOT NULL,
    promotion_id text NOT NULL,
    product_id text NOT NULL,
    base_discount_type text DEFAULT 'percentage'::text NOT NULL,
    base_discount_value numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.promotion_products OWNER TO postgres;

--
-- Name: promotion_targets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_targets (
    id text NOT NULL,
    campaign_id text NOT NULL,
    target_type public.promotion_target_type NOT NULL,
    target_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.promotion_targets OWNER TO postgres;

--
-- Name: promotion_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_templates OWNER TO postgres;

--
-- Name: promotion_usage; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_usage OWNER TO postgres;

--
-- Name: promotion_variants; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotion_variants OWNER TO postgres;

--
-- Name: promotions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.promotions OWNER TO postgres;

--
-- Name: provider_order_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.provider_order_logs OWNER TO postgres;

--
-- Name: taxable_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxable_categories (
    id text NOT NULL,
    tax_id text NOT NULL,
    category_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.taxable_categories OWNER TO postgres;

--
-- Name: taxable_modifiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxable_modifiers (
    id text NOT NULL,
    tax_id text NOT NULL,
    modifier_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.taxable_modifiers OWNER TO postgres;

--
-- Name: taxable_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxable_products (
    id text NOT NULL,
    tax_id text NOT NULL,
    product_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.taxable_products OWNER TO postgres;

--
-- Name: taxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxes (
    id text NOT NULL,
    company_id text NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    tax_type public.tax_type DEFAULT 'percentage'::public.tax_type NOT NULL,
    percentage double precision DEFAULT 0.0 NOT NULL,
    fixed_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    applicable_from timestamp(3) without time zone,
    applicable_to timestamp(3) without time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    tax_code text,
    reporting_category text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text,
    updated_by text
);


ALTER TABLE public.taxes OWNER TO postgres;

--
-- Name: template_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_analytics (
    id text NOT NULL,
    template_id text NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    success_rate numeric(5,2),
    avg_print_time numeric(8,2),
    user_rating numeric(2,1),
    performance_metrics jsonb,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.template_analytics OWNER TO postgres;

--
-- Name: template_builder_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_analytics (
    id text NOT NULL,
    template_id text NOT NULL,
    company_id text NOT NULL,
    branch_id text,
    user_id text,
    action text NOT NULL,
    action_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    session_id text,
    ip_address text,
    user_agent text,
    device_type text,
    processing_time_ms integer,
    error_message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.template_builder_analytics OWNER TO postgres;

--
-- Name: template_builder_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_components (
    id text NOT NULL,
    template_id text NOT NULL,
    parent_id text,
    type text NOT NULL,
    name text,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    "position" jsonb DEFAULT '{}'::jsonb NOT NULL,
    styles jsonb DEFAULT '{}'::jsonb NOT NULL,
    z_index integer DEFAULT 0 NOT NULL,
    data_binding text,
    data_source text,
    data_formatter text,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    transformations jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.template_builder_components OWNER TO postgres;

--
-- Name: template_builder_marketplace; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_marketplace (
    id text NOT NULL,
    template_id text NOT NULL,
    title text NOT NULL,
    description text,
    industry text,
    template_type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_free boolean DEFAULT true NOT NULL,
    price numeric(10,2) DEFAULT 0.00 NOT NULL,
    download_count integer DEFAULT 0 NOT NULL,
    rating_average numeric(3,2) DEFAULT 0.00 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    publisher_company_id text,
    publisher_name text,
    publisher_email text,
    preview_images text[] DEFAULT ARRAY[]::text[],
    documentation text,
    changelog text,
    tags text[] DEFAULT ARRAY[]::text[],
    compatibility_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    published_at timestamp(3) without time zone
);


ALTER TABLE public.template_builder_marketplace OWNER TO postgres;

--
-- Name: template_builder_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_permissions (
    id text NOT NULL,
    template_id text NOT NULL,
    role text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.template_builder_permissions OWNER TO postgres;

--
-- Name: template_builder_print_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_print_jobs (
    id text NOT NULL,
    template_id text NOT NULL,
    printer_id text NOT NULL,
    job_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    rendered_content text,
    escpos_data bytea,
    status text DEFAULT 'pending'::text NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    render_time_ms integer,
    total_processing_time_ms integer,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at timestamp(3) without time zone,
    rendered_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    failed_at timestamp(3) without time zone
);


ALTER TABLE public.template_builder_print_jobs OWNER TO postgres;

--
-- Name: template_builder_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_templates (
    id text NOT NULL,
    company_id text NOT NULL,
    branch_id text,
    category_id text NOT NULL,
    name text NOT NULL,
    description text,
    design_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    canvas_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    print_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    preview_image text,
    tags text[] DEFAULT ARRAY[]::text[],
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp(3) without time zone,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_template_id text,
    created_by text NOT NULL,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.template_builder_templates OWNER TO postgres;

--
-- Name: template_builder_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_builder_versions (
    id text NOT NULL,
    template_id text NOT NULL,
    version integer NOT NULL,
    design_data jsonb NOT NULL,
    canvas_settings jsonb NOT NULL,
    print_settings jsonb NOT NULL,
    changes text,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.template_builder_versions OWNER TO postgres;

--
-- Name: template_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_categories (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.template_categories OWNER TO postgres;

--
-- Name: template_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_feedback (
    id text NOT NULL,
    template_id text NOT NULL,
    user_id text,
    company_id text,
    rating numeric(2,1) NOT NULL,
    improvements text[] DEFAULT ARRAY[]::text[],
    usage_context jsonb,
    feedback text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.template_feedback OWNER TO postgres;

--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_activity_logs OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    language text DEFAULT 'en'::text NOT NULL,
    timezone text DEFAULT 'Asia/Amman'::text NOT NULL,
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: webhook_delivery_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.webhook_delivery_logs OWNER TO postgres;

--
-- Name: license_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.license_audit_logs_id_seq'::regclass);


--
-- Name: license_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_invoices ALTER COLUMN id SET DEFAULT nextval('public.license_invoices_id_seq'::regclass);


--
-- Data for Name: _DeliveryProviderToJordanLocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_DeliveryProviderToJordanLocation" ("A", "B") FROM stdin;
\.


--
-- Data for Name: ai_generation_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_generation_history (id, company_id, user_id, input_prompt, business_context, generated_templates, selected_template_id, generation_time_ms, created_at) FROM stdin;
\.


--
-- Data for Name: ai_template_optimization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_template_optimization (id, template_id, user_id, optimization_goals, constraints, original_metrics, optimized_metrics, improvements, status, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: availability_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availability_alerts (id, company_id, branch_id, alert_type, severity, title, message, connected_id, connected_type, is_read, is_resolved, resolved_at, resolved_by, channels, sent_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: availability_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availability_audit_logs (id, branch_availability_id, company_id, change_type, old_value, new_value, change_reason, user_id, user_role, ip_address, user_agent, platform, batch_operation, batch_id, "timestamp") FROM stdin;
\.


--
-- Data for Name: availability_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availability_templates (id, company_id, name, description, template_type, configuration, is_active, start_date, end_date, recurring_pattern, last_applied_at, applied_count, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: branch_availabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branch_availabilities (id, connected_id, connected_type, branch_id, company_id, is_in_stock, is_active, stock_level, low_stock_threshold, prices, taxes, available_from, available_to, available_days, last_stock_update, notes, priority, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: branch_provider_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branch_provider_mappings (id, branch_id, company_provider_config_id, provider_branch_id, provider_site_id, branch_configuration, is_active, priority, min_order_value, max_order_value, supported_payment_methods, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, company_id, name, phone, email, address, city, country, latitude, longitude, is_default, is_active, allows_online_orders, allows_delivery, allows_pickup, timezone, created_at, updated_at, deleted_at, created_by, updated_by, name_ar, open_time, close_time, integration_data) FROM stdin;
test-branch-uuid-123456789	test-company-uuid-123456789	Main Branch	+962788888888	\N	456 Branch Street, Amman, Jordan	\N	\N	\N	\N	f	t	t	t	t	Asia/Amman	2025-09-28 22:09:24.617	2025-09-28 22:09:24.617	\N	\N	\N	الفرع الرئيسي	\N	\N	\N
\.


--
-- Data for Name: careem_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.careem_orders (id, careem_order_id, company_id, branch_id, status, order_data, customer_data, items_data, pricing_data, processed_at, internal_order_id, pos_order_id, error_message, careem_created_at, careem_updated_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: careem_webhook_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.careem_webhook_events (id, careem_order_id, event_type, event_data, signature, processed, processed_at, error_message, retry_count, received_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, slug, logo, business_type, timezone, default_currency, status, subscription_plan, subscription_expires_at, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
test-company-uuid-123456789	Test Restaurant Company	test-restaurant	\N	RESTAURANT	Asia/Amman	JOD	active	basic	\N	2025-09-28 22:09:24.608	2025-09-28 22:09:24.608	\N	\N	\N
\.


--
-- Data for Name: company_logos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_logos (id, company_id, original_name, thermal_58_data, thermal_58_width, thermal_58_height, thermal_58_commands, thermal_80_data, thermal_80_width, thermal_80_height, thermal_80_commands, web_url, web_width, web_height, file_size, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: company_provider_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_provider_configs (id, company_id, provider_type, configuration, credentials, is_active, priority, max_distance, base_fee, fee_per_km, avg_delivery_time, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: company_tax_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_tax_settings (id, company_id, price_display_mode, tax_rounding_mode, decimal_places, show_tax_breakdown, show_tax_inclusive_text, tax_line_label, vat_number_label, tax_registration_number, vat_number, default_tax_id, auto_apply_default_tax, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: delivery_error_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_error_logs (id, company_id, provider_type, error_type, error_code, error_message, request_payload, response_payload, retry_count, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: delivery_provider_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_provider_analytics (id, company_id, provider_type, date, total_orders, successful_orders, failed_orders, cancelled_orders, total_revenue, total_delivery_fee, average_delivery_time, customer_ratings_sum, customer_ratings_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: delivery_provider_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_provider_orders (id, company_id, branch_id, delivery_provider_id, provider_order_id, order_number, order_status, order_details, customer_details, delivery_address, webhook_data, is_processed, error_message, created_at, updated_at, actual_delivery_time, delivery_attempts, estimated_delivery_time, failure_reason, last_status_check, provider_fee_charged, tracking_number, webhook_retries) FROM stdin;
\.


--
-- Data for Name: delivery_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_providers (id, name, "displayName", api_base_url, api_key, is_active, priority, supported_areas, avg_delivery_time, base_fee, fee_per_km, max_distance, configuration, created_at, updated_at, company_id, webhook_url) FROM stdin;
\.


--
-- Data for Name: delivery_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_zones (id, branch_id, "zoneName", zone_name_slug, delivery_fee, priority_level, is_active, polygon, center_lat, center_lng, radius, created_at, updated_at, deleted_at, created_by, updated_by, global_location_id, average_delivery_time_mins) FROM stdin;
\.


--
-- Data for Name: global_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.global_locations (id, country_name, country_name_ar, governorate, city_name, city_name_ar, area_name, area_name_ar, sub_area_name, sub_area_name_ar, latitude, longitude, search_text, is_active, delivery_difficulty, average_delivery_fee, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jordan_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jordan_locations (id, governorate, city, district, area_name_en, area_name_ar, postal_code, delivery_difficulty, average_delivery_fee, lat, lng, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: license_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.license_audit_logs (id, license_id, action, old_data, new_data, user_id, "timestamp") FROM stdin;
\.


--
-- Data for Name: license_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.license_invoices (id, license_id, invoice_number, amount, currency, status, created_at, due_date, paid_at, payment_method, company_id, duration_days, issued_at, due_at, metadata, created_by) FROM stdin;
\.


--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.licenses (id, company_id, status, start_date, expires_at, features, created_at, updated_at, created_by, updated_by, days_remaining, last_checked, renewed_at, total_days) FROM stdin;
0d0abd95-435c-4274-8bd7-5f0cf899bac1	test-company-uuid-123456789	active	2025-09-28 22:09:24.917	2026-09-28 22:09:24.917	{"hasDelivery": true, "hasInventory": true, "hasMultiLanguage": true, "hasTemplateBuilder": true, "hasAdvancedPrinting": true}	2025-09-28 22:09:24.919	2025-09-28 22:09:24.919	\N	\N	0	\N	\N	30
\.


--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_categories (id, company_id, name, description, image, display_number, is_active, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
cc18f7b2-0944-42da-8de9-79ce7cec2d9d	test-company-uuid-123456789	{"ar": "Appetizers", "en": "Appetizers"}	\N	\N	1	t	2025-09-28 22:09:24.895	2025-09-28 22:09:24.895	\N	\N	\N
fb859245-3cae-4011-a490-a5c0f566bdf7	test-company-uuid-123456789	{"ar": "Main Courses", "en": "Main Courses"}	\N	\N	2	t	2025-09-28 22:09:24.901	2025-09-28 22:09:24.901	\N	\N	\N
587c7fb8-7ef8-4f13-a197-21aa7115bb8e	test-company-uuid-123456789	{"ar": "Desserts", "en": "Desserts"}	\N	\N	3	t	2025-09-28 22:09:24.907	2025-09-28 22:09:24.907	\N	\N	\N
58454313-07a7-4445-9f51-4dd1e848fb4d	test-company-uuid-123456789	{"ar": "Beverages", "en": "Beverages"}	\N	\N	4	t	2025-09-28 22:09:24.913	2025-09-28 22:09:24.913	\N	\N	\N
\.


--
-- Data for Name: menu_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_products (id, company_id, branch_id, category_id, name, description, image, slug, base_price, pricing, cost, status, priority, preparation_time, pricing_method, selling_method, tags, created_at, updated_at, deleted_at, created_by, updated_by, images) FROM stdin;
658748f2-7856-4a93-b675-4118660f2d52	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "سلطة سيزر", "en": "Caesar Salad"}	{"ar": "خس روماني طازج مع جبنة البارميزان", "en": "Fresh romaine lettuce with parmesan"}	\N	\N	8.99	{"platforms": {"dineIn": 8.99, "delivery": 9.99, "takeaway": 8.99}, "defaultPrice": 8.99}	0.00	1	0	15	1	1	{vegetarian,salad}	2025-09-28 22:41:03.48	2025-09-28 22:41:03.48	\N	\N	\N	{}
48dcc15e-7d1b-4960-9cbc-d811b88e589a	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "أجنحة الدجاج", "en": "Chicken Wings"}	{"ar": "أجنحة بوفالو حارة", "en": "Spicy buffalo wings"}	\N	\N	12.99	{"platforms": {"dineIn": 12.99, "delivery": 14.99, "takeaway": 12.99}, "defaultPrice": 12.99}	0.00	1	0	15	1	1	{spicy,chicken}	2025-09-28 22:41:03.488	2025-09-28 22:41:03.488	\N	\N	\N	{}
0f16b79f-d237-46fa-8eb1-782de68b2fdd	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "دجاج مشوي", "en": "Grilled Chicken"}	{"ar": "صدر دجاج مشوي متبل", "en": "Marinated grilled chicken breast"}	\N	\N	18.99	{"platforms": {"dineIn": 18.99, "delivery": 20.99, "takeaway": 18.99}, "defaultPrice": 18.99}	0.00	1	0	15	1	1	{grilled,chicken,main}	2025-09-28 22:41:03.498	2025-09-28 22:41:03.498	\N	\N	\N	{}
028e2cbf-494b-4921-bda3-8c91a1c87cae	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "برجر لحم البقر", "en": "Beef Burger"}	{"ar": "برجر لحم بقري مع البطاطس", "en": "Juicy beef burger with fries"}	\N	\N	15.99	{"platforms": {"dineIn": 15.99, "delivery": 17.99, "takeaway": 15.99}, "defaultPrice": 15.99}	0.00	1	0	15	1	1	{beef,burger}	2025-09-28 22:41:03.504	2025-09-28 22:41:03.504	\N	\N	\N	{}
8d75b31a-e699-44c7-a775-c01157d47bd8	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "كعكة الشوكولاتة", "en": "Chocolate Cake"}	{"ar": "كعكة شوكولاتة غنية", "en": "Rich chocolate layer cake"}	\N	\N	6.99	{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}	0.00	1	0	15	1	1	{dessert,chocolate}	2025-09-28 22:41:03.508	2025-09-28 22:41:03.508	\N	\N	\N	{}
e3d5b091-d3c1-49ce-aee0-4f611bcb075a	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "آيس كريم", "en": "Ice Cream"}	{"ar": "آيس كريم فانيليا", "en": "Vanilla ice cream"}	\N	\N	4.99	{"platforms": {"dineIn": 4.99, "delivery": 5.99, "takeaway": 4.99}, "defaultPrice": 4.99}	0.00	1	0	15	1	1	{dessert,ice-cream}	2025-09-28 22:41:03.513	2025-09-28 22:41:03.513	\N	\N	\N	{}
239f3903-deb5-4cab-bbf6-bd7d742e8b8c	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "عصير البرتقال", "en": "Orange Juice"}	{"ar": "عصير برتقال طازج", "en": "Fresh squeezed orange juice"}	\N	\N	3.99	{"platforms": {"dineIn": 3.99, "delivery": 4.99, "takeaway": 3.99}, "defaultPrice": 3.99}	0.00	1	0	15	1	1	{juice,fresh}	2025-09-28 22:41:03.516	2025-09-28 22:41:03.516	\N	\N	\N	{}
adbe8b92-865c-4dff-af91-722cbc91e54d	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "كولا", "en": "Cola"}	{"ar": "مشروب كولا منعش", "en": "Refreshing cola drink"}	\N	\N	2.99	{"platforms": {"dineIn": 2.99, "delivery": 3.99, "takeaway": 2.99}, "defaultPrice": 2.99}	0.00	1	0	15	1	1	{soda,cold}	2025-09-28 22:41:03.521	2025-09-28 22:41:03.521	\N	\N	\N	{}
0f571d1b-7a92-4565-8b44-929c0bbf983c	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "حمص مع خبز البيتا", "en": "Hummus with Pita"}	{"ar": "غموس الحمص التقليدي مع خبز البيتا الدافئ", "en": "Traditional chickpea dip with warm pita bread"}	https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400	\N	7.99	{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}	0.00	1	0	10	1	1	{vegetarian,mediterranean,starter}	2025-09-28 22:50:32.867	2025-09-28 22:50:32.867	\N	\N	\N	{}
93b2412e-f848-4fdd-8c85-680343f05dc3	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "أصابع الموتزاريلا", "en": "Mozzarella Sticks"}	{"ar": "جبنة موتزاريلا مقلية مقرمشة مع صلصة المارينارا", "en": "Crispy fried mozzarella with marinara sauce"}	https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400	\N	9.99	{"platforms": {"dineIn": 9.99, "delivery": 10.99, "takeaway": 9.99}, "defaultPrice": 9.99}	0.00	1	0	12	1	1	{fried,cheese,vegetarian}	2025-09-28 22:50:32.882	2025-09-28 22:50:32.882	\N	\N	\N	{}
883da52e-8c3f-4530-a0dd-beef367532c5	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "بروشيتا", "en": "Bruschetta"}	{"ar": "خبز محمص مع الطماطم والريحان", "en": "Toasted bread topped with tomatoes and basil"}	https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400	\N	8.49	{"platforms": {"dineIn": 8.49, "delivery": 9.49, "takeaway": 8.49}, "defaultPrice": 8.49}	0.00	1	0	8	1	1	{italian,vegetarian,fresh}	2025-09-28 22:50:32.886	2025-09-28 22:50:32.886	\N	\N	\N	{}
d804c369-8a7a-4375-9919-f761b3ac3814	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "حلقات الكاليماري", "en": "Calamari Rings"}	{"ar": "حلقات الحبار المقلية الذهبية مع أيولي الليمون", "en": "Golden fried squid rings with lemon aioli"}	https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400	\N	12.99	{"platforms": {"dineIn": 12.99, "delivery": 14.99, "takeaway": 12.99}, "defaultPrice": 12.99}	0.00	1	0	15	1	1	{seafood,fried,crispy}	2025-09-28 22:50:32.891	2025-09-28 22:50:32.891	\N	\N	\N	{}
41172de7-7b06-40e0-9fa0-87d4cbc879e2	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "ناتشوز سوبريم", "en": "Nachos Supreme"}	{"ar": "ناتشوز محملة بالجبن والهالابينو والصلصة", "en": "Loaded nachos with cheese, jalapeños, and salsa"}	https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400	\N	11.99	{"platforms": {"dineIn": 11.99, "delivery": 13.99, "takeaway": 11.99}, "defaultPrice": 11.99}	0.00	1	0	10	1	1	{mexican,sharing,spicy}	2025-09-28 22:50:32.896	2025-09-28 22:50:32.896	\N	\N	\N	{}
b9a1fbd7-3f96-4240-ada0-ec39d9029cd7	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "سبرينغ رول", "en": "Spring Rolls"}	{"ar": "لفائف الخضار المقرمشة مع صلصة الشيلي الحلوة", "en": "Crispy vegetable spring rolls with sweet chili sauce"}	https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400	\N	7.99	{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}	0.00	1	0	12	1	1	{asian,vegetarian,crispy}	2025-09-28 22:50:32.903	2025-09-28 22:50:32.903	\N	\N	\N	{}
45cb6796-8144-4dfd-86e7-8fddec59f203	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "خبز بالثوم", "en": "Garlic Bread"}	{"ar": "خبز فرنسي دافئ مع زبدة الثوم والأعشاب", "en": "Warm baguette with garlic butter and herbs"}	https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400	\N	5.99	{"platforms": {"dineIn": 5.99, "delivery": 6.99, "takeaway": 5.99}, "defaultPrice": 5.99}	0.00	1	0	8	1	1	{bread,vegetarian,italian}	2025-09-28 22:50:32.908	2025-09-28 22:50:32.908	\N	\N	\N	{}
d8fd1f20-d532-4f76-ae49-287f58984539	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "طبق الجبن", "en": "Cheese Platter"}	{"ar": "مجموعة من الأجبان الفاخرة مع البسكويت", "en": "Assorted premium cheeses with crackers"}	https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400	\N	16.99	{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}	0.00	1	0	5	1	1	{cheese,sharing,premium}	2025-09-28 22:50:32.913	2025-09-28 22:50:32.913	\N	\N	\N	{}
9bcca555-1c2f-4da2-9ca3-3d34dc6425d4	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "كوكتيل الروبيان", "en": "Shrimp Cocktail"}	{"ar": "روبيان جامبو مبرد مع صلصة الكوكتيل", "en": "Chilled jumbo shrimp with cocktail sauce"}	https://images.unsplash.com/photo-1599663253423-7cad6e3c73a4?w=400	\N	14.99	{"platforms": {"dineIn": 14.99, "delivery": 16.99, "takeaway": 14.99}, "defaultPrice": 14.99}	0.00	1	0	5	1	1	{seafood,cold,premium}	2025-09-28 22:50:32.919	2025-09-28 22:50:32.919	\N	\N	\N	{}
1bb8fe4a-47a9-4066-a0a9-d7edd0b312d8	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "فطر محشو", "en": "Stuffed Mushrooms"}	{"ar": "فطر مخبوز محشو بالأعشاب والجبن", "en": "Baked mushrooms filled with herbs and cheese"}	https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400	\N	9.99	{"platforms": {"dineIn": 9.99, "delivery": 10.99, "takeaway": 9.99}, "defaultPrice": 9.99}	0.00	1	0	18	1	1	{vegetarian,baked,mushrooms}	2025-09-28 22:50:32.927	2025-09-28 22:50:32.927	\N	\N	\N	{}
a7848aba-971e-4c94-ad6f-cebd3e720ef4	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "ساتاي الدجاج", "en": "Chicken Satay"}	{"ar": "أسياخ دجاج مشوية مع صلصة الفول السوداني", "en": "Grilled chicken skewers with peanut sauce"}	https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400	\N	10.99	{"platforms": {"dineIn": 10.99, "delivery": 12.99, "takeaway": 10.99}, "defaultPrice": 10.99}	0.00	1	0	15	1	1	{asian,grilled,chicken}	2025-09-28 22:50:32.936	2025-09-28 22:50:32.936	\N	\N	\N	{}
14386156-5c75-4076-bdbc-fb3829af7324	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "حلقات البصل", "en": "Onion Rings"}	{"ar": "حلقات بصل مقرمشة مع صلصة الرانش", "en": "Crispy battered onion rings with ranch dip"}	https://images.unsplash.com/photo-1639024471283-03518883512d?w=400	\N	7.49	{"platforms": {"dineIn": 7.49, "delivery": 8.49, "takeaway": 7.49}, "defaultPrice": 7.49}	0.00	1	0	10	1	1	{fried,vegetarian,crispy}	2025-09-28 22:50:32.942	2025-09-28 22:50:32.942	\N	\N	\N	{}
aea1ea1b-7843-4a74-9513-567cacf21411	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "إدامامي", "en": "Edamame"}	{"ar": "فول الصويا المطهو على البخار مع ملح البحر", "en": "Steamed soybeans with sea salt"}	https://images.unsplash.com/photo-1564768048938-b7e7c3e2a2a5?w=400	\N	6.99	{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}	0.00	1	0	8	1	1	{japanese,healthy,vegan}	2025-09-28 22:50:32.945	2025-09-28 22:50:32.945	\N	\N	\N	{}
c712e724-c30c-46f8-9ecb-6f5ca1110444	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "قشور البطاطس", "en": "Potato Skins"}	{"ar": "قشور بطاطس محملة باللحم المقدد والجبن", "en": "Loaded potato skins with bacon and cheese"}	https://images.unsplash.com/photo-1552332386-a347e9261e2c?w=400	\N	8.99	{"platforms": {"dineIn": 8.99, "delivery": 9.99, "takeaway": 8.99}, "defaultPrice": 8.99}	0.00	1	0	15	1	1	{american,baked,bacon}	2025-09-28 22:50:32.95	2025-09-28 22:50:32.95	\N	\N	\N	{}
294a4be6-eeb9-4afc-aec2-fa61ddfcd51d	test-company-uuid-123456789	\N	cc18f7b2-0944-42da-8de9-79ce7cec2d9d	{"ar": "غموس السبانخ", "en": "Spinach Dip"}	{"ar": "غموس كريمي بالسبانخ والخرشوف مع الرقائق", "en": "Creamy spinach and artichoke dip with chips"}	https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=400	\N	9.49	{"platforms": {"dineIn": 9.49, "delivery": 10.49, "takeaway": 9.49}, "defaultPrice": 9.49}	0.00	1	0	12	1	1	{vegetarian,dip,creamy}	2025-09-28 22:50:32.954	2025-09-28 22:50:32.954	\N	\N	\N	{}
ccf11cca-e480-47de-b137-12ca6ed8d31c	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "ستيك ريب آي", "en": "Ribeye Steak"}	{"ar": "قطعة لحم ريب آي فاخرة مشوية بإتقان", "en": "Prime cut ribeye grilled to perfection"}	https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400	\N	32.99	{"platforms": {"dineIn": 32.99, "delivery": 35.99, "takeaway": 32.99}, "defaultPrice": 32.99}	0.00	1	0	25	1	1	{steak,premium,beef}	2025-09-28 22:50:32.958	2025-09-28 22:50:32.958	\N	\N	\N	{}
2e4a9901-a4a8-409f-98ae-1617cb2455db	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "سلمون ترياكي", "en": "Salmon Teriyaki"}	{"ar": "سلمون مزجج بصلصة الترياكي والخضروات", "en": "Glazed salmon with teriyaki sauce and vegetables"}	https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400	\N	24.99	{"platforms": {"dineIn": 24.99, "delivery": 26.99, "takeaway": 24.99}, "defaultPrice": 24.99}	0.00	1	0	20	1	1	{seafood,japanese,healthy}	2025-09-28 22:50:32.962	2025-09-28 22:50:32.962	\N	\N	\N	{}
94796198-d657-40cd-8058-92132152f8f1	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "دجاج ألفريدو", "en": "Chicken Alfredo"}	{"ar": "فيتوتشيني كريمي مع الدجاج المشوي", "en": "Creamy fettuccine with grilled chicken"}	https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400	\N	18.99	{"platforms": {"dineIn": 18.99, "delivery": 20.99, "takeaway": 18.99}, "defaultPrice": 18.99}	0.00	1	0	18	1	1	{pasta,italian,creamy}	2025-09-28 22:50:32.966	2025-09-28 22:50:32.966	\N	\N	\N	{}
b10ec6a9-0304-4d4e-a443-c7ead3b1650e	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "أضلاع الشواء", "en": "BBQ Ribs"}	{"ar": "أضلاع خنزير مطبوخة ببطء مع صلصة الباربكيو", "en": "Slow-cooked pork ribs with BBQ sauce"}	https://images.unsplash.com/photo-1544025162-d76694265947?w=400	\N	26.99	{"platforms": {"dineIn": 26.99, "delivery": 29.99, "takeaway": 26.99}, "defaultPrice": 26.99}	0.00	1	0	30	1	1	{bbq,pork,american}	2025-09-28 22:50:32.969	2025-09-28 22:50:32.969	\N	\N	\N	{}
f86463cf-d22b-47f8-8aee-58673cd89aa8	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "بيتزا نباتية", "en": "Vegetarian Pizza"}	{"ar": "بيتزا 12 بوصة مع الخضار الطازجة والجبن", "en": "12\\" pizza with fresh vegetables and cheese"}	https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400	\N	16.99	{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}	0.00	1	0	20	1	1	{pizza,vegetarian,italian}	2025-09-28 22:50:32.975	2025-09-28 22:50:32.975	\N	\N	\N	{}
b4ab8368-893f-4449-bd8d-5116d6ac3dc5	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "سمك وبطاطس", "en": "Fish and Chips"}	{"ar": "سمك القد المغطى بالبيرة مع البطاطس المقرمشة", "en": "Beer-battered cod with crispy fries"}	https://images.unsplash.com/photo-1580217593608-61931cefc821?w=400	\N	17.99	{"platforms": {"dineIn": 17.99, "delivery": 19.99, "takeaway": 17.99}, "defaultPrice": 17.99}	0.00	1	0	18	1	1	{seafood,british,fried}	2025-09-28 22:50:32.979	2025-09-28 22:50:32.979	\N	\N	\N	{}
973a8311-71a0-4afb-a392-4db998905620	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "قطع لحم الضأن", "en": "Lamb Chops"}	{"ar": "قطع لحم ضأن مغطاة بالأعشاب مع صلصة النعناع", "en": "Herb-crusted lamb chops with mint sauce"}	https://images.unsplash.com/photo-1574484284002-952d92456975?w=400	\N	29.99	{"platforms": {"dineIn": 29.99, "delivery": 32.99, "takeaway": 29.99}, "defaultPrice": 29.99}	0.00	1	0	25	1	1	{lamb,premium,mediterranean}	2025-09-28 22:50:32.983	2025-09-28 22:50:32.983	\N	\N	\N	{}
c7055dfa-6390-48cb-90fd-05677c1d101c	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "تاكو الدجاج", "en": "Chicken Tacos"}	{"ar": "ثلاث تاكو طرية مع الدجاج المتبل", "en": "Three soft tacos with seasoned chicken"}	https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400	\N	14.99	{"platforms": {"dineIn": 14.99, "delivery": 16.99, "takeaway": 14.99}, "defaultPrice": 14.99}	0.00	1	0	15	1	1	{mexican,chicken,tacos}	2025-09-28 22:50:32.986	2025-09-28 22:50:32.986	\N	\N	\N	{}
650f01b6-7569-47b3-a126-67143e707298	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "سباغيتي بولونيز", "en": "Spaghetti Bolognese"}	{"ar": "باستا كلاسيكية مع صلصة اللحم", "en": "Classic pasta with meat sauce"}	https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400	\N	16.99	{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}	0.00	1	0	20	1	1	{pasta,italian,beef}	2025-09-28 22:50:32.99	2025-09-28 22:50:32.99	\N	\N	\N	{}
1b4d6ee3-927c-4766-9fbc-817bc9646184	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "كاري أخضر تايلاندي", "en": "Thai Green Curry"}	{"ar": "كاري جوز الهند الحار مع الخضروات", "en": "Spicy coconut curry with vegetables"}	https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400	\N	15.99	{"platforms": {"dineIn": 15.99, "delivery": 17.99, "takeaway": 15.99}, "defaultPrice": 15.99}	0.00	1	0	22	1	1	{thai,spicy,curry}	2025-09-28 22:50:32.994	2025-09-28 22:50:32.994	\N	\N	\N	{}
67af249e-f25e-4aea-84b5-c36282baeb44	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "برجر مزدوج بالجبن", "en": "Double Cheeseburger"}	{"ar": "قرصان من اللحم البقري مع الجبن والبطاطس", "en": "Two beef patties with cheese and fries"}	https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400	\N	17.99	{"platforms": {"dineIn": 17.99, "delivery": 19.99, "takeaway": 17.99}, "defaultPrice": 17.99}	0.00	1	0	18	1	1	{burger,american,beef}	2025-09-28 22:50:32.997	2025-09-28 22:50:32.997	\N	\N	\N	{}
0e3e06cd-bc01-41af-a7fd-00dfdfb7604f	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "شاورما دجاج", "en": "Chicken Shawarma"}	{"ar": "لفة دجاج بالتوابل الشرق أوسطية", "en": "Middle Eastern spiced chicken wrap"}	https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400	\N	12.99	{"platforms": {"dineIn": 12.99, "delivery": 14.99, "takeaway": 12.99}, "defaultPrice": 12.99}	0.00	1	0	15	1	1	{middle-eastern,chicken,wrap}	2025-09-28 22:50:33	2025-09-28 22:50:33	\N	\N	\N	{}
3712dc28-815f-4612-bc99-2000d96d72eb	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "بايلا المأكولات البحرية", "en": "Seafood Paella"}	{"ar": "أرز إسباني مع مأكولات بحرية مختلطة", "en": "Spanish rice with mixed seafood"}	https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400	\N	28.99	{"platforms": {"dineIn": 28.99, "delivery": 31.99, "takeaway": 28.99}, "defaultPrice": 28.99}	0.00	1	0	35	1	1	{spanish,seafood,rice}	2025-09-28 22:50:33.004	2025-09-28 22:50:33.004	\N	\N	\N	{}
82438d5c-1964-4f4c-9523-bd3c577c8ae1	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "باد تاي بالدجاج", "en": "Chicken Pad Thai"}	{"ar": "نودلز الأرز المقلية مع الدجاج", "en": "Stir-fried rice noodles with chicken"}	https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400	\N	15.99	{"platforms": {"dineIn": 15.99, "delivery": 17.99, "takeaway": 15.99}, "defaultPrice": 15.99}	0.00	1	0	20	1	1	{thai,noodles,chicken}	2025-09-28 22:50:33.009	2025-09-28 22:50:33.009	\N	\N	\N	{}
4a6b3ec5-d89a-49a0-81e3-7d95ba9297a4	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "وعاء بوذا النباتي", "en": "Vegan Buddha Bowl"}	{"ar": "وعاء الكينوا مع الخضار المحمصة", "en": "Quinoa bowl with roasted vegetables"}	https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400	\N	13.99	{"platforms": {"dineIn": 13.99, "delivery": 15.99, "takeaway": 13.99}, "defaultPrice": 13.99}	0.00	1	0	15	1	1	{vegan,healthy,bowl}	2025-09-28 22:50:33.012	2025-09-28 22:50:33.012	\N	\N	\N	{}
2e92c69a-25a5-441c-9600-02717536f003	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "رول الكركند", "en": "Lobster Roll"}	{"ar": "لحم الكركند الطازج في خبز محمص", "en": "Fresh lobster meat in a toasted bun"}	https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400	\N	34.99	{"platforms": {"dineIn": 34.99, "delivery": 37.99, "takeaway": 34.99}, "defaultPrice": 34.99}	0.00	1	0	15	1	1	{seafood,premium,sandwich}	2025-09-28 22:50:33.018	2025-09-28 22:50:33.018	\N	\N	\N	{}
dde37f10-d4ad-4b44-8798-ea152be8eb30	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "برياني الدجاج", "en": "Chicken Biryani"}	{"ar": "أرز عطري مع الدجاج المتبل", "en": "Fragrant rice with spiced chicken"}	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400	\N	16.99	{"platforms": {"dineIn": 16.99, "delivery": 18.99, "takeaway": 16.99}, "defaultPrice": 16.99}	0.00	1	0	30	1	1	{indian,rice,chicken}	2025-09-28 22:50:33.022	2025-09-28 22:50:33.022	\N	\N	\N	{}
ee676480-8f7c-4624-87ee-ee05a0261a03	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "ريزوتو الفطر", "en": "Mushroom Risotto"}	{"ar": "أرز إيطالي كريمي مع الفطر", "en": "Creamy Italian rice with mushrooms"}	https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400	\N	18.99	{"platforms": {"dineIn": 18.99, "delivery": 20.99, "takeaway": 18.99}, "defaultPrice": 18.99}	0.00	1	0	25	1	1	{italian,vegetarian,rice}	2025-09-28 22:50:33.026	2025-09-28 22:50:33.026	\N	\N	\N	{}
de9c57ef-c210-49f4-af37-46c1e35bc660	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "فاهيتا اللحم", "en": "Beef Fajitas"}	{"ar": "لحم بقري متبل مع الفلفل والبصل", "en": "Sizzling beef with peppers and onions"}	https://images.unsplash.com/photo-1564767655658-4e6b365884ff?w=400	\N	19.99	{"platforms": {"dineIn": 19.99, "delivery": 21.99, "takeaway": 19.99}, "defaultPrice": 19.99}	0.00	1	0	20	1	1	{mexican,beef,spicy}	2025-09-28 22:50:33.029	2025-09-28 22:50:33.029	\N	\N	\N	{}
7dc88cd3-81eb-4bac-a12c-3513f2312674	test-company-uuid-123456789	\N	fb859245-3cae-4011-a490-a5c0f566bdf7	{"ar": "شنيتزل", "en": "Pork Schnitzel"}	{"ar": "قطعة لحم خنزير مقلية مع الليمون", "en": "Breaded pork cutlet with lemon"}	https://images.unsplash.com/photo-1599921841143-819065280869?w=400	\N	17.99	{"platforms": {"dineIn": 17.99, "delivery": 19.99, "takeaway": 17.99}, "defaultPrice": 17.99}	0.00	1	0	18	1	1	{german,pork,fried}	2025-09-28 22:50:33.032	2025-09-28 22:50:33.032	\N	\N	\N	{}
ce1ea999-1394-4e6b-b5e2-3562fe00c1ce	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "تيراميسو", "en": "Tiramisu"}	{"ar": "حلوى إيطالية بنكهة القهوة", "en": "Italian coffee-flavored dessert"}	https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400	\N	7.99	{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}	0.00	1	0	5	1	1	{italian,coffee,dessert}	2025-09-28 22:50:33.037	2025-09-28 22:50:33.037	\N	\N	\N	{}
c2cd7f55-eb10-4cbb-98d0-9685b32e5a2e	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "تشيز كيك", "en": "Cheesecake"}	{"ar": "تشيز كيك بطريقة نيويورك مع صلصة التوت", "en": "New York style cheesecake with berry sauce"}	https://images.unsplash.com/photo-1508737804141-4c3b688e2546?w=400	\N	8.49	{"platforms": {"dineIn": 8.49, "delivery": 9.49, "takeaway": 8.49}, "defaultPrice": 8.49}	0.00	1	0	5	1	1	{american,cheese,sweet}	2025-09-28 22:50:33.041	2025-09-28 22:50:33.041	\N	\N	\N	{}
fa89afef-a64a-4a95-8a24-e9ee90599400	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "فطيرة التفاح", "en": "Apple Pie"}	{"ar": "فطيرة التفاح الدافئة مع آيس كريم الفانيليا", "en": "Warm apple pie with vanilla ice cream"}	https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400	\N	6.99	{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}	0.00	1	0	8	1	1	{american,pie,warm}	2025-09-28 22:50:33.044	2025-09-28 22:50:33.044	\N	\N	\N	{}
2b1dc290-f4a7-48ba-bcc6-675ee32c6418	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "كريم بروليه", "en": "Crème Brûlée"}	{"ar": "كاسترد فرنسي مع السكر المكرمل", "en": "French custard with caramelized sugar"}	https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400	\N	8.99	{"platforms": {"dineIn": 8.99, "delivery": 9.99, "takeaway": 8.99}, "defaultPrice": 8.99}	0.00	1	0	5	1	1	{french,custard,caramel}	2025-09-28 22:50:33.047	2025-09-28 22:50:33.047	\N	\N	\N	{}
4d495bfe-5f7e-43a0-a72d-fd76c96e1432	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "براوني سانداي", "en": "Brownie Sundae"}	{"ar": "براوني دافئ مع الآيس كريم وصلصة الشوكولاتة", "en": "Warm brownie with ice cream and chocolate sauce"}	https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400	\N	9.49	{"platforms": {"dineIn": 9.49, "delivery": 10.49, "takeaway": 9.49}, "defaultPrice": 9.49}	0.00	1	0	10	1	1	{chocolate,ice-cream,warm}	2025-09-28 22:50:33.052	2025-09-28 22:50:33.052	\N	\N	\N	{}
d3e27920-7ab0-4028-beeb-66a88b3d6b92	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "بانا كوتا", "en": "Panna Cotta"}	{"ar": "بودينغ فانيليا إيطالي مع الفواكه", "en": "Italian vanilla pudding with fruit"}	https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400	\N	7.49	{"platforms": {"dineIn": 7.49, "delivery": 8.49, "takeaway": 7.49}, "defaultPrice": 7.49}	0.00	1	0	5	1	1	{italian,pudding,light}	2025-09-28 22:50:33.055	2025-09-28 22:50:33.055	\N	\N	\N	{}
bde3ae47-a27d-4535-b426-0257f7b17cd4	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "تارت الفواكه", "en": "Fruit Tart"}	{"ar": "تارت الفواكه الموسمية الطازجة", "en": "Fresh seasonal fruit tart"}	https://images.unsplash.com/photo-1525151498231-bc059cfafa2b?w=400	\N	7.99	{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}	0.00	1	0	5	1	1	{fruit,tart,fresh}	2025-09-28 22:50:33.059	2025-09-28 22:50:33.059	\N	\N	\N	{}
e422bf17-4b45-4c7a-b9bf-7f08eb368557	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "كعكة اللافا", "en": "Molten Lava Cake"}	{"ar": "كعكة الشوكولاتة مع مركز ذائب", "en": "Chocolate cake with molten center"}	https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400	\N	9.99	{"platforms": {"dineIn": 9.99, "delivery": 10.99, "takeaway": 9.99}, "defaultPrice": 9.99}	0.00	1	0	15	1	1	{chocolate,warm,decadent}	2025-09-28 22:50:33.063	2025-09-28 22:50:33.063	\N	\N	\N	{}
4c15e1a2-c9c3-4bad-a362-3b2d06d8361c	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "ثلاثي السوربيه", "en": "Sorbet Trio"}	{"ar": "ثلاث نكهات من سوربيه الفواكه", "en": "Three flavors of fruit sorbet"}	https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400	\N	6.99	{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}	0.00	1	0	5	1	1	{sorbet,fruit,refreshing}	2025-09-28 22:50:33.067	2025-09-28 22:50:33.067	\N	\N	\N	{}
4c248cf8-cf4f-4079-9673-b739f654f768	test-company-uuid-123456789	\N	587c7fb8-7ef8-4f13-a197-21aa7115bb8e	{"ar": "بقلاوة", "en": "Baklava"}	{"ar": "معجنات حلوة مع المكسرات والعسل", "en": "Sweet pastry with nuts and honey"}	https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=400	\N	5.99	{"platforms": {"dineIn": 5.99, "delivery": 6.99, "takeaway": 5.99}, "defaultPrice": 5.99}	0.00	1	0	5	1	1	{middle-eastern,nuts,honey}	2025-09-28 22:50:33.073	2025-09-28 22:50:33.073	\N	\N	\N	{}
e802d022-6457-4675-b0db-7078d2ac452d	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "عصير الليمون الطازج", "en": "Fresh Lemonade"}	{"ar": "عصير الليمون الطازج المحضر في المنزل", "en": "House-made fresh lemonade"}	https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400	\N	4.49	{"platforms": {"dineIn": 4.49, "delivery": 5.49, "takeaway": 4.49}, "defaultPrice": 4.49}	0.00	1	0	5	1	1	{fresh,citrus,cold}	2025-09-28 22:50:33.076	2025-09-28 22:50:33.076	\N	\N	\N	{}
f8fb68f9-7b03-4edc-8289-2c45a36c6c5e	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "قهوة مثلجة", "en": "Iced Coffee"}	{"ar": "قهوة باردة مع الثلج", "en": "Cold brew coffee with ice"}	https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400	\N	4.99	{"platforms": {"dineIn": 4.99, "delivery": 5.99, "takeaway": 4.99}, "defaultPrice": 4.99}	0.00	1	0	5	1	1	{coffee,cold,caffeine}	2025-09-28 22:50:33.079	2025-09-28 22:50:33.079	\N	\N	\N	{}
e193573b-9638-4083-8cce-977cd5f26e32	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "وعاء السموذي", "en": "Smoothie Bowl"}	{"ar": "سموذي الفواكه المختلطة مع الإضافات", "en": "Mixed fruit smoothie with toppings"}	https://images.unsplash.com/photo-1555375771-14b2a63968a9?w=400	\N	7.99	{"platforms": {"dineIn": 7.99, "delivery": 8.99, "takeaway": 7.99}, "defaultPrice": 7.99}	0.00	1	0	8	1	1	{healthy,fruit,smoothie}	2025-09-28 22:50:33.086	2025-09-28 22:50:33.086	\N	\N	\N	{}
2347f482-6427-419b-8177-1769ec41fa53	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "شوكولاتة ساخنة", "en": "Hot Chocolate"}	{"ar": "شوكولاتة ساخنة غنية مع المارشميلو", "en": "Rich hot chocolate with marshmallows"}	https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400	\N	4.49	{"platforms": {"dineIn": 4.49, "delivery": 5.49, "takeaway": 4.49}, "defaultPrice": 4.49}	0.00	1	0	5	1	1	{chocolate,hot,sweet}	2025-09-28 22:50:33.09	2025-09-28 22:50:33.09	\N	\N	\N	{}
669387ab-2c5c-4790-9a50-980c56d6528a	test-company-uuid-123456789	\N	58454313-07a7-4445-9f51-4dd1e848fb4d	{"ar": "بيرة حرفية", "en": "Craft Beer"}	{"ar": "مجموعة مختارة من البيرة الحرفية المحلية", "en": "Selection of local craft beers"}	https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400	\N	6.99	{"platforms": {"dineIn": 6.99, "delivery": 7.99, "takeaway": 6.99}, "defaultPrice": 6.99}	0.00	1	0	2	1	1	{alcohol,beer,craft}	2025-09-28 22:50:33.093	2025-09-28 22:50:33.093	\N	\N	\N	{}
\.


--
-- Data for Name: modifier_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modifier_categories (id, company_id, name, description, display_number, image, created_at, updated_at, deleted_at, is_required, max_selections, min_selections, selection_type) FROM stdin;
1b69def3-7c7c-4369-9a0c-c688ad6eb65a	test-company-uuid-123456789	{"ar": "خيارات الحجم", "en": "Size Options"}	{"ar": "اختر الحجم المفضل لديك", "en": "Choose your preferred size"}	1	\N	2025-09-28 23:03:09.565	2025-09-28 23:03:09.565	\N	t	1	1	single
a1a4d6f5-eda8-4d19-9046-3f5541e068d2	test-company-uuid-123456789	{"ar": "إضافات إضافية", "en": "Extra Toppings"}	{"ar": "أضف إضافات إضافية لطلبك", "en": "Add extra toppings to your order"}	2	\N	2025-09-28 23:03:09.583	2025-09-28 23:03:09.583	\N	f	5	0	multiple
4d039ce0-de48-40b4-9bd8-0a5983da8602	test-company-uuid-123456789	{"ar": "خيارات الصلصة", "en": "Sauce Options"}	{"ar": "حدد تفضيلاتك للصلصة", "en": "Select your sauce preferences"}	3	\N	2025-09-28 23:03:09.587	2025-09-28 23:03:09.587	\N	f	3	0	multiple
fa8b775d-1074-45e3-b69e-7c41c27a81f0	test-company-uuid-123456789	{"ar": "تفضيلات الطهي", "en": "Cooking Preferences"}	{"ar": "كيف تريد أن يتم طهيه؟", "en": "How would you like it cooked?"}	4	\N	2025-09-28 23:03:09.593	2025-09-28 23:03:09.593	\N	f	1	0	single
a0b6efcc-c5b1-483e-8959-6a68d4709007	test-company-uuid-123456789	{"ar": "خيارات المشروبات", "en": "Drink Options"}	{"ar": "اختر حجم المشروب والثلج", "en": "Choose drink size and ice"}	5	\N	2025-09-28 23:03:09.599	2025-09-28 23:03:09.599	\N	f	2	0	multiple
0c2c3e11-5b27-4ab2-8f84-49057b2553f1	test-company-uuid-123456789	{"ar": "خيارات الحجم", "en": "Size Options"}	{"ar": "اختر الحجم المفضل لديك", "en": "Choose your preferred size"}	1	\N	2025-09-28 23:03:23.943	2025-09-28 23:03:23.943	\N	t	1	1	single
e4532c8a-0cd2-4bed-a6b7-3bf68287b25e	test-company-uuid-123456789	{"ar": "إضافات إضافية", "en": "Extra Toppings"}	{"ar": "أضف إضافات إضافية لطلبك", "en": "Add extra toppings to your order"}	2	\N	2025-09-28 23:03:23.954	2025-09-28 23:03:23.954	\N	f	5	0	multiple
9e60122e-d341-4b2a-a390-91e33fdac50c	test-company-uuid-123456789	{"ar": "خيارات الصلصة", "en": "Sauce Options"}	{"ar": "حدد تفضيلاتك للصلصة", "en": "Select your sauce preferences"}	3	\N	2025-09-28 23:03:23.96	2025-09-28 23:03:23.96	\N	f	3	0	multiple
7eaaa784-6f34-436c-b3ee-b7906135b6fc	test-company-uuid-123456789	{"ar": "تفضيلات الطهي", "en": "Cooking Preferences"}	{"ar": "كيف تريد أن يتم طهيه؟", "en": "How would you like it cooked?"}	4	\N	2025-09-28 23:03:23.964	2025-09-28 23:03:23.964	\N	f	1	0	single
06181473-a0ba-4442-9f42-70fd09ae35f7	test-company-uuid-123456789	{"ar": "خيارات المشروبات", "en": "Drink Options"}	{"ar": "اختر حجم المشروب والثلج", "en": "Choose drink size and ice"}	5	\N	2025-09-28 23:03:23.969	2025-09-28 23:03:23.969	\N	f	2	0	multiple
91c4ad52-6b8b-4210-ad99-1e86424825bd	test-company-uuid-123456789	{"ar": "خيارات الحجم", "en": "Size Options"}	{"ar": "اختر الحجم المفضل لديك", "en": "Choose your preferred size"}	1	\N	2025-09-28 23:03:46.581	2025-09-28 23:03:46.581	\N	t	1	1	single
34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "إضافات إضافية", "en": "Extra Toppings"}	{"ar": "أضف إضافات إضافية لطلبك", "en": "Add extra toppings to your order"}	2	\N	2025-09-28 23:03:46.597	2025-09-28 23:03:46.597	\N	f	5	0	multiple
a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "خيارات الصلصة", "en": "Sauce Options"}	{"ar": "حدد تفضيلاتك للصلصة", "en": "Select your sauce preferences"}	3	\N	2025-09-28 23:03:46.602	2025-09-28 23:03:46.602	\N	f	3	0	multiple
9ae4f094-88fe-45d4-b994-f85657342b31	test-company-uuid-123456789	{"ar": "تفضيلات الطهي", "en": "Cooking Preferences"}	{"ar": "كيف تريد أن يتم طهيه؟", "en": "How would you like it cooked?"}	4	\N	2025-09-28 23:03:46.607	2025-09-28 23:03:46.607	\N	f	1	0	single
05b67288-d6ed-450e-b3d1-79dbed4b2eab	test-company-uuid-123456789	{"ar": "خيارات المشروبات", "en": "Drink Options"}	{"ar": "اختر حجم المشروب والثلج", "en": "Choose drink size and ice"}	5	\N	2025-09-28 23:03:46.612	2025-09-28 23:03:46.612	\N	f	2	0	multiple
\.


--
-- Data for Name: modifiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modifiers (id, modifier_category_id, company_id, name, description, base_price, pricing, cost, status, display_number, created_at, updated_at, deleted_at, image, is_default) FROM stdin;
7291bc05-4b55-4f19-9c3f-d701220492eb	91c4ad52-6b8b-4210-ad99-1e86424825bd	test-company-uuid-123456789	{"ar": "صغير", "en": "Small"}	\N	0.00	{}	0.00	1	1	2025-09-28 23:03:46.617	2025-09-28 23:03:46.617	\N	\N	f
bbf9f932-5139-4cbb-8f03-c869cb7c949f	91c4ad52-6b8b-4210-ad99-1e86424825bd	test-company-uuid-123456789	{"ar": "وسط", "en": "Medium"}	\N	2.00	{}	0.00	1	2	2025-09-28 23:03:46.626	2025-09-28 23:03:46.626	\N	\N	t
b58202a0-40ef-4a6a-a703-dab0575a0f3d	91c4ad52-6b8b-4210-ad99-1e86424825bd	test-company-uuid-123456789	{"ar": "كبير", "en": "Large"}	\N	4.00	{}	0.00	1	3	2025-09-28 23:03:46.63	2025-09-28 23:03:46.63	\N	\N	f
310bacfb-f3aa-4c0a-8562-940a9c0b1b52	91c4ad52-6b8b-4210-ad99-1e86424825bd	test-company-uuid-123456789	{"ar": "كبير جداً", "en": "Extra Large"}	\N	6.00	{}	0.00	1	4	2025-09-28 23:03:46.636	2025-09-28 23:03:46.636	\N	\N	f
3412a7a8-f023-4deb-9eff-1a297e1d75f1	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "جبنة إضافية", "en": "Extra Cheese"}	\N	1.50	{}	0.00	1	1	2025-09-28 23:03:46.641	2025-09-28 23:03:46.641	\N	\N	f
8ca3acfa-d7c8-42b2-9feb-28f3ee12f0ff	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "لحم مقدد", "en": "Bacon"}	\N	2.00	{}	0.00	1	2	2025-09-28 23:03:46.645	2025-09-28 23:03:46.645	\N	\N	f
296d01bd-658e-43dd-8594-1047bc2c7f83	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "فطر", "en": "Mushrooms"}	\N	1.00	{}	0.00	1	3	2025-09-28 23:03:46.651	2025-09-28 23:03:46.651	\N	\N	f
41a1bc21-73b5-4493-99c5-c79b8fa74c4d	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "بصل", "en": "Onions"}	\N	0.50	{}	0.00	1	4	2025-09-28 23:03:46.656	2025-09-28 23:03:46.656	\N	\N	f
4568d8ce-74f1-41ea-8b2d-59287434e1c0	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "هالابينو", "en": "Jalapeños"}	\N	0.75	{}	0.00	1	5	2025-09-28 23:03:46.66	2025-09-28 23:03:46.66	\N	\N	f
f8b738c9-d6c6-4ce8-918d-f73e9b8ff7a5	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "زيتون", "en": "Olives"}	\N	0.75	{}	0.00	1	6	2025-09-28 23:03:46.663	2025-09-28 23:03:46.663	\N	\N	f
72262f51-a7c5-4b5d-9735-50873fb1a822	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "طماطم", "en": "Tomatoes"}	\N	0.50	{}	0.00	1	7	2025-09-28 23:03:46.666	2025-09-28 23:03:46.666	\N	\N	f
f3848672-0eb3-4fbd-b305-d5b1c6cd4633	34abfe20-b484-4785-bc1d-227d8f2ce8ee	test-company-uuid-123456789	{"ar": "مخللات", "en": "Pickles"}	\N	0.50	{}	0.00	1	8	2025-09-28 23:03:46.67	2025-09-28 23:03:46.67	\N	\N	f
2489ad17-5ac1-4d43-ba86-6540e106cdcd	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "كاتشب", "en": "Ketchup"}	\N	0.00	{}	0.00	1	1	2025-09-28 23:03:46.675	2025-09-28 23:03:46.675	\N	\N	f
2ba6c02c-e623-460d-97c2-4f3efc49a4d3	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "مايونيز", "en": "Mayo"}	\N	0.00	{}	0.00	1	2	2025-09-28 23:03:46.683	2025-09-28 23:03:46.683	\N	\N	f
dab4d342-fa37-49ff-b476-1096e8544ab5	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "صلصة باربكيو", "en": "BBQ Sauce"}	\N	0.50	{}	0.00	1	3	2025-09-28 23:03:46.688	2025-09-28 23:03:46.688	\N	\N	f
e5afa079-0101-48a6-ba28-b64337558af5	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "رانش", "en": "Ranch"}	\N	0.50	{}	0.00	1	4	2025-09-28 23:03:46.696	2025-09-28 23:03:46.696	\N	\N	f
79791fce-b81d-4fa7-875f-fe1bcc0e1a72	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "صلصة حارة", "en": "Hot Sauce"}	\N	0.00	{}	0.00	1	5	2025-09-28 23:03:46.7	2025-09-28 23:03:46.7	\N	\N	f
dc6ea036-7022-403a-90b1-0dfe54743329	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "صلصة الثوم", "en": "Garlic Sauce"}	\N	0.50	{}	0.00	1	6	2025-09-28 23:03:46.704	2025-09-28 23:03:46.704	\N	\N	f
5f5d349d-6e4d-4a15-949a-361c4f3dd6c7	a701ea89-44b5-44e2-ac1d-0c8710ea2404	test-company-uuid-123456789	{"ar": "خردل بالعسل", "en": "Honey Mustard"}	\N	0.50	{}	0.00	1	7	2025-09-28 23:03:46.708	2025-09-28 23:03:46.708	\N	\N	f
b23420e7-ab6e-44e4-bf90-ad26aad97193	9ae4f094-88fe-45d4-b994-f85657342b31	test-company-uuid-123456789	{"ar": "نيئ", "en": "Rare"}	\N	0.00	{}	0.00	1	1	2025-09-28 23:03:46.711	2025-09-28 23:03:46.711	\N	\N	f
02a03bc1-2c58-47fc-8975-c8a7aaa0c6da	9ae4f094-88fe-45d4-b994-f85657342b31	test-company-uuid-123456789	{"ar": "نصف نيئ", "en": "Medium Rare"}	\N	0.00	{}	0.00	1	2	2025-09-28 23:03:46.714	2025-09-28 23:03:46.714	\N	\N	f
813b33f4-d875-429a-acc9-cc763570cd98	9ae4f094-88fe-45d4-b994-f85657342b31	test-company-uuid-123456789	{"ar": "متوسط", "en": "Medium"}	\N	0.00	{}	0.00	1	3	2025-09-28 23:03:46.719	2025-09-28 23:03:46.719	\N	\N	t
1c6ee07d-089f-4119-a93b-d71993dc9ce5	9ae4f094-88fe-45d4-b994-f85657342b31	test-company-uuid-123456789	{"ar": "متوسط ناضج", "en": "Medium Well"}	\N	0.00	{}	0.00	1	4	2025-09-28 23:03:46.722	2025-09-28 23:03:46.722	\N	\N	f
b36e2220-7d61-4137-974c-c852255dac66	9ae4f094-88fe-45d4-b994-f85657342b31	test-company-uuid-123456789	{"ar": "ناضج جداً", "en": "Well Done"}	\N	0.00	{}	0.00	1	5	2025-09-28 23:03:46.726	2025-09-28 23:03:46.726	\N	\N	f
0370f46e-5155-46ba-8d18-201bcafc4a57	05b67288-d6ed-450e-b3d1-79dbed4b2eab	test-company-uuid-123456789	{"ar": "بدون ثلج", "en": "No Ice"}	\N	0.00	{}	0.00	1	1	2025-09-28 23:03:46.729	2025-09-28 23:03:46.729	\N	\N	f
07436404-7880-4d3f-8b28-375497e7a56f	05b67288-d6ed-450e-b3d1-79dbed4b2eab	test-company-uuid-123456789	{"ar": "ثلج قليل", "en": "Less Ice"}	\N	0.00	{}	0.00	1	2	2025-09-28 23:03:46.731	2025-09-28 23:03:46.731	\N	\N	f
2ab0bad4-3042-4953-90fd-333a40fcc75a	05b67288-d6ed-450e-b3d1-79dbed4b2eab	test-company-uuid-123456789	{"ar": "ثلج عادي", "en": "Regular Ice"}	\N	0.00	{}	0.00	1	3	2025-09-28 23:03:46.734	2025-09-28 23:03:46.734	\N	\N	t
0c399a7a-81be-4a1e-8941-64cd6239d4b6	05b67288-d6ed-450e-b3d1-79dbed4b2eab	test-company-uuid-123456789	{"ar": "ثلج إضافي", "en": "Extra Ice"}	\N	0.00	{}	0.00	1	4	2025-09-28 23:03:46.736	2025-09-28 23:03:46.736	\N	\N	f
73a903eb-e3f0-4a4c-84ae-c07f7e39aca4	05b67288-d6ed-450e-b3d1-79dbed4b2eab	test-company-uuid-123456789	{"ar": "حجم أكبر للمشروب", "en": "Upsize Drink"}	\N	1.50	{}	0.00	1	5	2025-09-28 23:03:46.738	2025-09-28 23:03:46.738	\N	\N	f
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, modifiers, special_requests, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, branch_id, delivery_zone_id, delivery_provider_id, customer_name, customer_phone, customer_email, delivery_address, delivery_lat, delivery_lng, order_type, status, subtotal, delivery_fee, tax_amount, total_amount, payment_method, payment_status, estimated_delivery_time, actual_delivery_time, provider_order_id, provider_tracking_url, driver_info, notes, created_at, updated_at, delivered_at, cancelled_at, cancellation_reason) FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (id, entity_type, entity_id, promotion_id, old_price, new_price, change_reason, platform, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: print_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.print_jobs (id, type, printer_id, content, status, priority, order_id, company_id, branch_id, user_id, attempts, processing_time, error, created_at, updated_at, started_at, completed_at, failed_at) FROM stdin;
\.


--
-- Data for Name: print_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.print_templates (id, name, type, template, is_default, company_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: printer_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printer_configurations (id, company_id, branch_id, printer_info_id, printer_info, paper_settings, print_settings, jordan_settings, templates, is_default, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: printer_discovery_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printer_discovery_events (id, printer_id, printer_name, printer_type, connection_type, discovery_method, "discoveryStatus", branch_id, company_id, discovered_by, device_id, device_info, printer_details, network_info, capabilities, is_active, last_seen, first_discovered, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: printer_licenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printer_licenses (id, license_key, branch_id, device_id, device_fingerprint, status, expires_at, features, validated_at, device_info, max_printers, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: printer_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printer_sessions (id, license_id, branch_id, device_id, device_fingerprint, session_token, status, last_heartbeat, app_version, created_at, ended_at) FROM stdin;
\.


--
-- Data for Name: printers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printers (id, name, type, connection, ip, port, manufacturer, model, location, "paperWidth", "assignedTo", is_default, status, capabilities, last_seen, company_id, branch_id, delivery_platforms, license_key, printer_license_id, last_auto_detection, menuhere_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_images (id, product_id, filename, original_name, url, size, width, height, mime_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_modifier_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_modifier_categories (id, product_id, modifier_category_id, min_quantity, max_quantity, price_override, is_required, display_order, created_at) FROM stdin;
5dac3cc1-63f2-434a-bce2-8a400cb6f28f	658748f2-7856-4a93-b675-4118660f2d52	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.747
2ac295fd-622d-4e90-b255-416a5699131d	658748f2-7856-4a93-b675-4118660f2d52	34abfe20-b484-4785-bc1d-227d8f2ce8ee	0	1	\N	f	0	2025-09-28 23:03:46.75
6c25fffd-5e0c-4847-9dcf-87da6003a6ff	48dcc15e-7d1b-4960-9cbc-d811b88e589a	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.752
32c8d15c-969f-40ad-93af-c59071b56c00	48dcc15e-7d1b-4960-9cbc-d811b88e589a	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.754
625a2595-3e75-40f0-81d0-6386941c1d5f	48dcc15e-7d1b-4960-9cbc-d811b88e589a	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.757
d2c13b1d-14bf-4637-9e45-2acad76922fd	0f16b79f-d237-46fa-8eb1-782de68b2fdd	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.759
f3e527e4-7147-414a-9af0-fe83e72870ef	0f16b79f-d237-46fa-8eb1-782de68b2fdd	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.762
03af3dc4-3222-4773-95ad-cf2ea60e7de6	0f16b79f-d237-46fa-8eb1-782de68b2fdd	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.763
55ddde36-8a1e-45eb-8aa7-c55c8280e97a	028e2cbf-494b-4921-bda3-8c91a1c87cae	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.766
92fed50b-c220-44ff-a6d4-bca2b34a28b4	028e2cbf-494b-4921-bda3-8c91a1c87cae	34abfe20-b484-4785-bc1d-227d8f2ce8ee	0	1	\N	f	0	2025-09-28 23:03:46.768
8edec008-8436-49d4-8ab3-2f5a24eaf983	028e2cbf-494b-4921-bda3-8c91a1c87cae	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.769
b3551355-3789-4e7b-bea0-e1958a6143d7	028e2cbf-494b-4921-bda3-8c91a1c87cae	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.772
b7f6132a-1f1b-4754-85e3-ff14fcecdccc	8d75b31a-e699-44c7-a775-c01157d47bd8	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:46.774
f99a6e43-8f77-4d5c-9ca9-3dbf51b121c5	e3d5b091-d3c1-49ce-aee0-4f611bcb075a	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.776
03b60543-5da6-47b3-9a77-0de232ac2423	e3d5b091-d3c1-49ce-aee0-4f611bcb075a	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.778
2f01b3c2-767e-4db5-8683-210a98c2f2f2	239f3903-deb5-4cab-bbf6-bd7d742e8b8c	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:46.78
d41aa34b-9779-4fac-87ed-158025dccd23	adbe8b92-865c-4dff-af91-722cbc91e54d	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:46.782
ea30e208-e0a0-4a28-bc30-56f5bb805e1b	0f571d1b-7a92-4565-8b44-929c0bbf983c	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.784
b06d7add-c40d-4307-a5da-ecac9128fa22	0f571d1b-7a92-4565-8b44-929c0bbf983c	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.786
d4de4648-b5df-4fbe-a881-b9a8272cf7f8	93b2412e-f848-4fdd-8c85-680343f05dc3	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.788
535886fc-15a0-48b2-be82-80be081154ee	93b2412e-f848-4fdd-8c85-680343f05dc3	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.791
f7df2ed5-6469-497e-bc0e-97c502ba0e06	883da52e-8c3f-4530-a0dd-beef367532c5	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.793
ec478231-8518-4ca8-a35e-3f87765ebe2f	883da52e-8c3f-4530-a0dd-beef367532c5	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.794
44655278-78f1-4d10-aecd-3978de5837ce	d804c369-8a7a-4375-9919-f761b3ac3814	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.796
896769a9-4124-423a-8fd5-00350039d0e0	d804c369-8a7a-4375-9919-f761b3ac3814	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.798
8ebba898-66f8-412e-a5fd-f3523389afd8	41172de7-7b06-40e0-9fa0-87d4cbc879e2	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.8
d377779f-c640-44b8-bccf-a42ab540a385	41172de7-7b06-40e0-9fa0-87d4cbc879e2	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.802
9874bdc4-2c36-440a-89a2-20100b5dde4d	b9a1fbd7-3f96-4240-ada0-ec39d9029cd7	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.804
a576a6df-e7f1-4a55-a4dc-470f9984b499	b9a1fbd7-3f96-4240-ada0-ec39d9029cd7	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.807
b8f9bcbf-94f7-483c-8b33-c5610a9e1080	45cb6796-8144-4dfd-86e7-8fddec59f203	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.812
4179f386-23fc-4f08-84e2-18dbc4119405	45cb6796-8144-4dfd-86e7-8fddec59f203	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.814
6b66aa0e-bbea-4572-ac3e-0ae01dc8a1d5	d8fd1f20-d532-4f76-ae49-287f58984539	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.816
2923e079-4910-437e-aa0b-9cc0cc81d69e	d8fd1f20-d532-4f76-ae49-287f58984539	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.818
e1e8b3f7-b57a-4977-9db0-046e085fdcb8	9bcca555-1c2f-4da2-9ca3-3d34dc6425d4	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.82
07521656-8a40-4c02-ba39-b70fd5017d77	9bcca555-1c2f-4da2-9ca3-3d34dc6425d4	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.822
0732b2ee-6b81-4fd7-a63a-d411def87768	1bb8fe4a-47a9-4066-a0a9-d7edd0b312d8	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.824
81fd999f-178c-4f74-a2ef-73d66bae304b	1bb8fe4a-47a9-4066-a0a9-d7edd0b312d8	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.826
d1e11129-2748-41c3-aafc-01e0facb8415	a7848aba-971e-4c94-ad6f-cebd3e720ef4	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.828
86c4776f-6c1f-487d-8ed7-87c8734bad0d	a7848aba-971e-4c94-ad6f-cebd3e720ef4	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.829
80c6aca2-a4fa-4418-9584-d0abdce276cd	a7848aba-971e-4c94-ad6f-cebd3e720ef4	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.831
64c4e0e9-ee3d-44e1-9f32-9b0abc39e952	14386156-5c75-4076-bdbc-fb3829af7324	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.833
47a114ae-81b8-470c-8b06-0c344a9a99e8	14386156-5c75-4076-bdbc-fb3829af7324	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.834
e0e15ff7-df19-4317-b85b-d1a1d2a49e1b	aea1ea1b-7843-4a74-9513-567cacf21411	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.836
45c7dc06-7d12-435c-adab-d4a0d6485a2b	aea1ea1b-7843-4a74-9513-567cacf21411	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.838
c62beec1-a7c3-48df-aa58-5ec9a1567252	c712e724-c30c-46f8-9ecb-6f5ca1110444	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.839
214ba441-523e-43a4-b34d-6e70be3973bf	c712e724-c30c-46f8-9ecb-6f5ca1110444	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.841
5f1ea288-4490-487e-80a6-782c534aeba6	294a4be6-eeb9-4afc-aec2-fa61ddfcd51d	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.843
886c33d9-fe1a-4039-b530-1021583fb82f	294a4be6-eeb9-4afc-aec2-fa61ddfcd51d	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.846
7dd83453-a59d-4611-bf10-ab5e0197e5d9	ccf11cca-e480-47de-b137-12ca6ed8d31c	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.849
23895c92-87dc-4547-82e6-290d839878cb	ccf11cca-e480-47de-b137-12ca6ed8d31c	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.85
fe6e53a4-7fd0-46f6-8bcd-e70773ff75e4	ccf11cca-e480-47de-b137-12ca6ed8d31c	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:46.853
a40906d7-5747-4d7b-8d73-fd0f8fae8cfa	2e4a9901-a4a8-409f-98ae-1617cb2455db	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.856
8ebabcc6-8f59-40ac-a093-07550ee4d009	2e4a9901-a4a8-409f-98ae-1617cb2455db	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.858
5d6b09a3-13de-4474-bd75-110c30209fc0	94796198-d657-40cd-8058-92132152f8f1	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.861
e7970396-cac1-440a-97bd-5c20fe2fa691	94796198-d657-40cd-8058-92132152f8f1	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.864
f455f580-cfd2-436a-96fc-50b8ecadc046	94796198-d657-40cd-8058-92132152f8f1	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.866
525ac246-dcca-45bc-b828-7be6643cb0f2	b10ec6a9-0304-4d4e-a443-c7ead3b1650e	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.869
4e4fa5a4-dd60-41a2-a2fb-6d3a20615e1f	b10ec6a9-0304-4d4e-a443-c7ead3b1650e	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.872
fe825ae5-a18e-48d4-8416-587d50e56ff4	f86463cf-d22b-47f8-8aee-58673cd89aa8	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.875
2bb8b97b-8c57-4c2a-b09c-1bc847abe64d	f86463cf-d22b-47f8-8aee-58673cd89aa8	34abfe20-b484-4785-bc1d-227d8f2ce8ee	0	1	\N	f	0	2025-09-28 23:03:46.877
c5b3c512-6615-422c-b9cd-843d6af96e98	b4ab8368-893f-4449-bd8d-5116d6ac3dc5	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.88
7e494e6a-c2a0-4f3b-a1ce-69f0bb9a8321	b4ab8368-893f-4449-bd8d-5116d6ac3dc5	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.882
fd2ce4f3-b8ec-41fe-a112-f8678dae5303	973a8311-71a0-4afb-a392-4db998905620	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.885
4a148fd0-e71b-4587-84c0-d284cb253f98	973a8311-71a0-4afb-a392-4db998905620	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.887
28ce6ed2-0277-4bff-a529-ad1a127c904e	c7055dfa-6390-48cb-90fd-05677c1d101c	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.889
059a2cde-25ae-4d58-b7aa-6a1257016193	c7055dfa-6390-48cb-90fd-05677c1d101c	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.891
02276bd3-01dd-4fad-b2f5-e99cc16642e6	c7055dfa-6390-48cb-90fd-05677c1d101c	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.894
0e6f80ba-4cc5-40b7-996d-cec687f8dc3b	650f01b6-7569-47b3-a126-67143e707298	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.897
07462fbc-dea5-4fef-9138-bf428100e8b8	650f01b6-7569-47b3-a126-67143e707298	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.899
aa41dec4-bde2-4223-a665-f4586e044f7d	1b4d6ee3-927c-4766-9fbc-817bc9646184	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.901
10e1191e-de8b-4095-aa96-d79b6bc4af25	1b4d6ee3-927c-4766-9fbc-817bc9646184	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.903
90718ea6-231b-425e-b5ff-87af2d705e00	67af249e-f25e-4aea-84b5-c36282baeb44	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.904
c6107301-2bf5-4c60-b75a-9cd2bf755631	67af249e-f25e-4aea-84b5-c36282baeb44	34abfe20-b484-4785-bc1d-227d8f2ce8ee	0	1	\N	f	0	2025-09-28 23:03:46.906
c392c88a-316a-46dd-9c86-05975caf39ee	67af249e-f25e-4aea-84b5-c36282baeb44	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.908
55ac557c-9e43-461e-aebd-3d5a0437b3b9	67af249e-f25e-4aea-84b5-c36282baeb44	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.91
5511a8fa-6563-45dd-b80b-963f7533acc2	0e3e06cd-bc01-41af-a7fd-00dfdfb7604f	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.912
faa65f5b-5bfe-40e6-85de-1659ebc1ecca	0e3e06cd-bc01-41af-a7fd-00dfdfb7604f	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.913
c8cafb61-1b2d-488c-ab4f-3d22010caa1d	0e3e06cd-bc01-41af-a7fd-00dfdfb7604f	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.921
26bc9fde-fa35-44ba-b62e-32464131b301	3712dc28-815f-4612-bc99-2000d96d72eb	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.937
284f0c40-4cdd-434b-ba31-be0478802a0d	3712dc28-815f-4612-bc99-2000d96d72eb	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.946
8e5b7e55-1bf6-49d0-89c5-257c2948bef5	82438d5c-1964-4f4c-9523-bd3c577c8ae1	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.956
422b698d-673a-466b-a0eb-9f0411bffee3	82438d5c-1964-4f4c-9523-bd3c577c8ae1	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.963
424a9157-41da-4970-ab9a-caf0888b18b3	82438d5c-1964-4f4c-9523-bd3c577c8ae1	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:46.967
ef068f22-39af-4354-8ad9-fbca9d269548	4a6b3ec5-d89a-49a0-81e3-7d95ba9297a4	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.971
e34d0f0f-dce3-432d-bcf7-625cbf373f33	4a6b3ec5-d89a-49a0-81e3-7d95ba9297a4	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.978
c3dbdb52-7c6e-4519-bdd2-8c9cf8dd13ea	2e92c69a-25a5-441c-9600-02717536f003	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.981
1a1f2f37-4d50-4694-90ba-6bd26aeed858	2e92c69a-25a5-441c-9600-02717536f003	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:46.984
d523c07b-b25f-4a92-8427-dd53b7e75c55	dde37f10-d4ad-4b44-8798-ea152be8eb30	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:46.986
b3eed76c-2819-4921-a48f-603f56acd833	dde37f10-d4ad-4b44-8798-ea152be8eb30	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.003
136049cb-4307-4601-bc2d-788c4aff844d	dde37f10-d4ad-4b44-8798-ea152be8eb30	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:47.006
22ca21fe-e352-474f-8fea-6b446cf5fb8b	ee676480-8f7c-4624-87ee-ee05a0261a03	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.008
a9b11c28-3252-4cb7-80f6-a97a61ad7389	ee676480-8f7c-4624-87ee-ee05a0261a03	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.01
4f60089c-56ac-4b3a-adc4-fb71badf3ba3	de9c57ef-c210-49f4-af37-46c1e35bc660	9ae4f094-88fe-45d4-b994-f85657342b31	0	1	\N	f	0	2025-09-28 23:03:47.012
88b95c7b-4878-48af-9627-ccf8d9b6da16	7dc88cd3-81eb-4bac-a12c-3513f2312674	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.014
76a6f523-5da0-41aa-82b2-9f6a035b3ebd	7dc88cd3-81eb-4bac-a12c-3513f2312674	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.017
25903a24-884b-4585-be58-68156b2cfe52	ce1ea999-1394-4e6b-b5e2-3562fe00c1ce	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.019
176a217e-1962-4373-9e69-010a0df6fac9	ce1ea999-1394-4e6b-b5e2-3562fe00c1ce	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.022
8b29f3c8-f47a-469d-b10e-4bff761c2962	c2cd7f55-eb10-4cbb-98d0-9685b32e5a2e	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.024
dcb2178d-6800-4d4d-bab5-a7c6bf166206	c2cd7f55-eb10-4cbb-98d0-9685b32e5a2e	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.027
4e5aef63-468b-481e-82e1-0acad95b1c2f	fa89afef-a64a-4a95-8a24-e9ee90599400	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.03
9b49cd8c-dcf1-4146-8130-d7dd83861161	fa89afef-a64a-4a95-8a24-e9ee90599400	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.032
066a2a9a-a015-48d5-a8ae-78669283e531	2b1dc290-f4a7-48ba-bcc6-675ee32c6418	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.034
fc76ae21-8489-466c-be83-4f29a65501f4	2b1dc290-f4a7-48ba-bcc6-675ee32c6418	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.036
42ae4bd1-5de3-43c9-8a2d-3899e25280e1	4d495bfe-5f7e-43a0-a72d-fd76c96e1432	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.038
cb795040-cf49-449d-ba78-87f71112ca7c	4d495bfe-5f7e-43a0-a72d-fd76c96e1432	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.04
4e5dda88-5e64-41ef-9ac6-be5c0038f19d	d3e27920-7ab0-4028-beeb-66a88b3d6b92	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.042
a71fb591-82a0-4f46-97fa-d7a8bbcec379	d3e27920-7ab0-4028-beeb-66a88b3d6b92	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.043
db043524-698a-49be-8af0-b3705980cca7	bde3ae47-a27d-4535-b426-0257f7b17cd4	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.046
16eb99be-3b22-4268-9efb-518dfa76c5f7	bde3ae47-a27d-4535-b426-0257f7b17cd4	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.047
94dc72f1-8ec0-49d7-81fe-0ebb67367999	e422bf17-4b45-4c7a-b9bf-7f08eb368557	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.05
f8772e61-3455-4ac3-9719-4b80a5fac7bc	e422bf17-4b45-4c7a-b9bf-7f08eb368557	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.052
2fba42d8-52ff-4f98-8388-281c1da21c93	4c15e1a2-c9c3-4bad-a362-3b2d06d8361c	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.054
68b81e89-45f3-4020-9319-f70a5b561743	4c15e1a2-c9c3-4bad-a362-3b2d06d8361c	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.056
fa08280c-230e-4d2a-b7dd-24aa3c0ec029	4c248cf8-cf4f-4079-9673-b739f654f768	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.059
da72c033-578d-46e7-b249-9002ebe78178	4c248cf8-cf4f-4079-9673-b739f654f768	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.061
bb887a77-5098-4b85-8bc9-9b14a61d0db9	e802d022-6457-4675-b0db-7078d2ac452d	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:47.063
282cefea-4c62-4aa4-8ec3-dd46ada32afc	f8fb68f9-7b03-4edc-8289-2c45a36c6c5e	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:47.065
163154f3-ca81-43b2-bd32-a567c7d207ce	e193573b-9638-4083-8cce-977cd5f26e32	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.068
06b0ff44-1188-4c90-923f-9f26b34b4f1f	e193573b-9638-4083-8cce-977cd5f26e32	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.069
e66cfcc8-03a0-446b-885d-e87bf8444811	2347f482-6427-419b-8177-1769ec41fa53	05b67288-d6ed-450e-b3d1-79dbed4b2eab	0	1	\N	f	0	2025-09-28 23:03:47.072
f6d3b246-4ef6-483c-8d77-abb2ec83b6ad	669387ab-2c5c-4790-9a50-980c56d6528a	91c4ad52-6b8b-4210-ad99-1e86424825bd	0	1	\N	f	0	2025-09-28 23:03:47.074
574f08a0-fa29-4265-a291-a01ca6dbb18a	669387ab-2c5c-4790-9a50-980c56d6528a	a701ea89-44b5-44e2-ac1d-0c8710ea2404	0	1	\N	f	0	2025-09-28 23:03:47.076
\.


--
-- Data for Name: promotion_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_analytics (id, campaign_id, date, platform, total_uses, unique_customers, new_customers, returning_customers, gross_revenue, total_discount_given, average_order_value, total_orders, impression_count, click_count, conversion_rate, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_campaigns (id, company_id, name, description, slug, type, status, priority, is_public, is_stackable, starts_at, ends_at, days_of_week, time_ranges, total_usage_limit, per_customer_limit, current_usage_count, discount_value, max_discount_amount, minimum_order_amount, minimum_items_count, buy_quantity, get_quantity, get_discount_percentage, target_platforms, target_customer_segments, total_revenue_impact, total_orders_count, total_customers_reached, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: promotion_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_codes (id, campaign_id, code, is_single_use, usage_count, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_menu_items (id, campaign_id, menu_item_id, discount_value, discount_type, max_discount_amount, platforms, is_active, start_date, end_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: promotion_modifier_markups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_modifier_markups (id, promotion_id, product_id, modifier_id, markup_percentage, original_price, marked_up_price, profit_margin, business_reason, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_platform_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_platform_configs (id, campaign_id, platform, platform_specific_id, custom_settings, is_synced, last_synced_at, sync_error, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_products (id, promotion_id, product_id, base_discount_type, base_discount_value, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_targets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_targets (id, campaign_id, target_type, target_id, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_templates (id, company_id, name, description, template_data, category, is_global, usage_count, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: promotion_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_usage (id, campaign_id, code_id, customer_id, customer_email, customer_phone, order_id, usage_date, discount_applied, order_total, platform_used, branch_id, metadata) FROM stdin;
\.


--
-- Data for Name: promotion_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotion_variants (id, campaign_id, variant_name, traffic_percentage, configuration_override, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotions (id, company_id, name, description, promotion_type, start_date, end_date, is_active, auto_revert, platforms, min_profit_margin, original_pricing_snapshot, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: provider_order_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.provider_order_logs (id, company_provider_config_id, branch_id, order_id, provider_order_id, order_status, request_payload, response_payload, webhook_payload, error_message, processing_time_ms, api_endpoint, http_status_code, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: taxable_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.taxable_categories (id, tax_id, category_id, created_at) FROM stdin;
\.


--
-- Data for Name: taxable_modifiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.taxable_modifiers (id, tax_id, modifier_id, created_at) FROM stdin;
\.


--
-- Data for Name: taxable_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.taxable_products (id, tax_id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: taxes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.taxes (id, company_id, name, description, tax_type, percentage, fixed_amount, is_active, is_default, applicable_from, applicable_to, sort_order, tax_code, reporting_category, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: template_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_analytics (id, template_id, usage_count, success_rate, avg_print_time, user_rating, performance_metrics, updated_at) FROM stdin;
\.


--
-- Data for Name: template_builder_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_analytics (id, template_id, company_id, branch_id, user_id, action, action_details, session_id, ip_address, user_agent, device_type, processing_time_ms, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: template_builder_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_components (id, template_id, parent_id, type, name, properties, "position", styles, z_index, data_binding, data_source, data_formatter, conditions, transformations, is_locked, is_visible, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: template_builder_marketplace; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_marketplace (id, template_id, title, description, industry, template_type, status, is_featured, is_free, price, download_count, rating_average, rating_count, publisher_company_id, publisher_name, publisher_email, preview_images, documentation, changelog, tags, compatibility_info, created_at, updated_at, published_at) FROM stdin;
\.


--
-- Data for Name: template_builder_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_permissions (id, template_id, role, permissions, created_at) FROM stdin;
\.


--
-- Data for Name: template_builder_print_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_print_jobs (id, template_id, printer_id, job_data, rendered_content, escpos_data, status, priority, error_message, retry_count, max_retries, render_time_ms, total_processing_time_ms, created_by, created_at, started_at, rendered_at, completed_at, failed_at) FROM stdin;
\.


--
-- Data for Name: template_builder_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_templates (id, company_id, branch_id, category_id, name, description, design_data, canvas_settings, print_settings, preview_image, tags, usage_count, last_used_at, is_default, is_active, is_public, version, parent_template_id, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: template_builder_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_builder_versions (id, template_id, version, design_data, canvas_settings, print_settings, changes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: template_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_categories (id, name, type, description, icon, sort_order, settings, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: template_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_feedback (id, template_id, user_id, company_id, rating, improvements, usage_context, feedback, created_at) FROM stdin;
\.


--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_activity_logs (id, user_id, action, resource_type, resource_id, description, ip_address, user_agent, success, error_message, "timestamp") FROM stdin;
aa4eca4c-5a64-4e8f-a1f4-3c406f38749b	884627ea-f154-48e3-a756-5f3b84f13594	login_success	\N	\N	User logged in successfully	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	t	\N	2025-09-28 22:40:29.169
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, token_hash, refresh_token_hash, expires_at, refresh_expires_at, ip_address, user_agent, device_type, is_active, revoked_at, created_at, last_used_at) FROM stdin;
80291b2f-805b-4a37-9465-f9b781b8feb2	884627ea-f154-48e3-a756-5f3b84f13594	$2a$10$830l0Bpj7V72f9hpHzqWkuljLkSfT0ODqwsEXIKDPTBBdgmnqvKHC	\N	2025-10-28 22:40:29.155	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	desktop	t	\N	2025-09-28 22:40:29.158	2025-09-28 22:40:29.158
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, phone, avatar_url, password_hash, pin, email_verified_at, role, status, company_id, branch_id, language, timezone, last_login_at, last_login_ip, failed_login_attempts, locked_until, must_change_password, created_at, updated_at, deleted_at, created_by, updated_by, first_name, last_name, username) FROM stdin;
0a9c293c-4bac-448e-baed-3c1430332fe8	Branch Manager	manager@test.com	+962777777777	\N	$2a$10$NDyety4cfkgdeOjAXNyDHuTv1qDQml.wnEuAQ0nGWWRRpTgmOvjku	\N	\N	branch_manager	active	test-company-uuid-123456789	test-branch-uuid-123456789	en	Asia/Amman	\N	\N	0	\N	f	2025-09-28 22:09:24.886	2025-09-28 22:09:24.886	\N	\N	\N	\N	\N	manager
884627ea-f154-48e3-a756-5f3b84f13594	Test Admin	admin@test.com	+962799999999	\N	$2a$10$NDyety4cfkgdeOjAXNyDHuTv1qDQml.wnEuAQ0nGWWRRpTgmOvjku	\N	\N	super_admin	active	test-company-uuid-123456789	\N	en	Asia/Amman	2025-09-28 22:40:28.942	::1	0	\N	f	2025-09-28 22:09:24.877	2025-09-28 22:40:28.946	\N	\N	\N	\N	\N	admin
\.


--
-- Data for Name: webhook_delivery_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhook_delivery_logs (id, company_id, provider_type, webhook_type, order_id, payload, status, processing_attempts, processed_at, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Name: license_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.license_audit_logs_id_seq', 1, false);


--
-- Name: license_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.license_invoices_id_seq', 1, false);


--
-- Name: ai_generation_history ai_generation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_history
    ADD CONSTRAINT ai_generation_history_pkey PRIMARY KEY (id);


--
-- Name: ai_template_optimization ai_template_optimization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_template_optimization
    ADD CONSTRAINT ai_template_optimization_pkey PRIMARY KEY (id);


--
-- Name: availability_alerts availability_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_alerts
    ADD CONSTRAINT availability_alerts_pkey PRIMARY KEY (id);


--
-- Name: availability_audit_logs availability_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_audit_logs
    ADD CONSTRAINT availability_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: availability_templates availability_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_templates
    ADD CONSTRAINT availability_templates_pkey PRIMARY KEY (id);


--
-- Name: branch_availabilities branch_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_availabilities
    ADD CONSTRAINT branch_availabilities_pkey PRIMARY KEY (id);


--
-- Name: branch_provider_mappings branch_provider_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_provider_mappings
    ADD CONSTRAINT branch_provider_mappings_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: careem_orders careem_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.careem_orders
    ADD CONSTRAINT careem_orders_pkey PRIMARY KEY (id);


--
-- Name: careem_webhook_events careem_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.careem_webhook_events
    ADD CONSTRAINT careem_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_logos company_logos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_logos
    ADD CONSTRAINT company_logos_pkey PRIMARY KEY (id);


--
-- Name: company_provider_configs company_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_provider_configs
    ADD CONSTRAINT company_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: company_tax_settings company_tax_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_tax_settings
    ADD CONSTRAINT company_tax_settings_pkey PRIMARY KEY (id);


--
-- Name: delivery_error_logs delivery_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_error_logs
    ADD CONSTRAINT delivery_error_logs_pkey PRIMARY KEY (id);


--
-- Name: delivery_provider_analytics delivery_provider_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_provider_analytics
    ADD CONSTRAINT delivery_provider_analytics_pkey PRIMARY KEY (id);


--
-- Name: delivery_provider_orders delivery_provider_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_pkey PRIMARY KEY (id);


--
-- Name: delivery_providers delivery_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_providers
    ADD CONSTRAINT delivery_providers_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: global_locations global_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_locations
    ADD CONSTRAINT global_locations_pkey PRIMARY KEY (id);


--
-- Name: jordan_locations jordan_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jordan_locations
    ADD CONSTRAINT jordan_locations_pkey PRIMARY KEY (id);


--
-- Name: license_audit_logs license_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_audit_logs
    ADD CONSTRAINT license_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: license_invoices license_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_invoices
    ADD CONSTRAINT license_invoices_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_products menu_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_pkey PRIMARY KEY (id);


--
-- Name: modifier_categories modifier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifier_categories
    ADD CONSTRAINT modifier_categories_pkey PRIMARY KEY (id);


--
-- Name: modifiers modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifiers
    ADD CONSTRAINT modifiers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: print_jobs print_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_pkey PRIMARY KEY (id);


--
-- Name: print_templates print_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_pkey PRIMARY KEY (id);


--
-- Name: printer_configurations printer_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_configurations
    ADD CONSTRAINT printer_configurations_pkey PRIMARY KEY (id);


--
-- Name: printer_discovery_events printer_discovery_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_discovery_events
    ADD CONSTRAINT printer_discovery_events_pkey PRIMARY KEY (id);


--
-- Name: printer_licenses printer_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_licenses
    ADD CONSTRAINT printer_licenses_pkey PRIMARY KEY (id);


--
-- Name: printer_sessions printer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_sessions
    ADD CONSTRAINT printer_sessions_pkey PRIMARY KEY (id);


--
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_modifier_categories product_modifier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_modifier_categories
    ADD CONSTRAINT product_modifier_categories_pkey PRIMARY KEY (id);


--
-- Name: promotion_analytics promotion_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_analytics
    ADD CONSTRAINT promotion_analytics_pkey PRIMARY KEY (id);


--
-- Name: promotion_campaigns promotion_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_campaigns
    ADD CONSTRAINT promotion_campaigns_pkey PRIMARY KEY (id);


--
-- Name: promotion_codes promotion_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_pkey PRIMARY KEY (id);


--
-- Name: promotion_menu_items promotion_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_menu_items
    ADD CONSTRAINT promotion_menu_items_pkey PRIMARY KEY (id);


--
-- Name: promotion_modifier_markups promotion_modifier_markups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_pkey PRIMARY KEY (id);


--
-- Name: promotion_platform_configs promotion_platform_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_platform_configs
    ADD CONSTRAINT promotion_platform_configs_pkey PRIMARY KEY (id);


--
-- Name: promotion_products promotion_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_pkey PRIMARY KEY (id);


--
-- Name: promotion_targets promotion_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_targets
    ADD CONSTRAINT promotion_targets_pkey PRIMARY KEY (id);


--
-- Name: promotion_templates promotion_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_templates
    ADD CONSTRAINT promotion_templates_pkey PRIMARY KEY (id);


--
-- Name: promotion_usage promotion_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_usage
    ADD CONSTRAINT promotion_usage_pkey PRIMARY KEY (id);


--
-- Name: promotion_variants promotion_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_variants
    ADD CONSTRAINT promotion_variants_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: provider_order_logs provider_order_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_order_logs
    ADD CONSTRAINT provider_order_logs_pkey PRIMARY KEY (id);


--
-- Name: taxable_categories taxable_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_categories
    ADD CONSTRAINT taxable_categories_pkey PRIMARY KEY (id);


--
-- Name: taxable_modifiers taxable_modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_modifiers
    ADD CONSTRAINT taxable_modifiers_pkey PRIMARY KEY (id);


--
-- Name: taxable_products taxable_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_products
    ADD CONSTRAINT taxable_products_pkey PRIMARY KEY (id);


--
-- Name: taxes taxes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxes
    ADD CONSTRAINT taxes_pkey PRIMARY KEY (id);


--
-- Name: template_analytics template_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_analytics
    ADD CONSTRAINT template_analytics_pkey PRIMARY KEY (id);


--
-- Name: template_builder_analytics template_builder_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_analytics
    ADD CONSTRAINT template_builder_analytics_pkey PRIMARY KEY (id);


--
-- Name: template_builder_components template_builder_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_components
    ADD CONSTRAINT template_builder_components_pkey PRIMARY KEY (id);


--
-- Name: template_builder_marketplace template_builder_marketplace_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_marketplace
    ADD CONSTRAINT template_builder_marketplace_pkey PRIMARY KEY (id);


--
-- Name: template_builder_permissions template_builder_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_permissions
    ADD CONSTRAINT template_builder_permissions_pkey PRIMARY KEY (id);


--
-- Name: template_builder_print_jobs template_builder_print_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_print_jobs
    ADD CONSTRAINT template_builder_print_jobs_pkey PRIMARY KEY (id);


--
-- Name: template_builder_templates template_builder_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_templates
    ADD CONSTRAINT template_builder_templates_pkey PRIMARY KEY (id);


--
-- Name: template_builder_versions template_builder_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_versions
    ADD CONSTRAINT template_builder_versions_pkey PRIMARY KEY (id);


--
-- Name: template_categories template_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_categories
    ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);


--
-- Name: template_feedback template_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_feedback
    ADD CONSTRAINT template_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_delivery_logs webhook_delivery_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_delivery_logs
    ADD CONSTRAINT webhook_delivery_logs_pkey PRIMARY KEY (id);


--
-- Name: _DeliveryProviderToJordanLocation_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_DeliveryProviderToJordanLocation_AB_unique" ON public."_DeliveryProviderToJordanLocation" USING btree ("A", "B");


--
-- Name: _DeliveryProviderToJordanLocation_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_DeliveryProviderToJordanLocation_B_index" ON public."_DeliveryProviderToJordanLocation" USING btree ("B");


--
-- Name: ai_generation_history_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_generation_history_company_id_idx ON public.ai_generation_history USING btree (company_id);


--
-- Name: ai_generation_history_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_generation_history_created_at_idx ON public.ai_generation_history USING btree (created_at);


--
-- Name: ai_generation_history_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_generation_history_user_id_idx ON public.ai_generation_history USING btree (user_id);


--
-- Name: ai_template_optimization_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_template_optimization_status_idx ON public.ai_template_optimization USING btree (status);


--
-- Name: ai_template_optimization_template_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_template_optimization_template_id_idx ON public.ai_template_optimization USING btree (template_id);


--
-- Name: ai_template_optimization_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_template_optimization_user_id_idx ON public.ai_template_optimization USING btree (user_id);


--
-- Name: availability_alerts_branch_id_alert_type_is_resolved_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availability_alerts_branch_id_alert_type_is_resolved_idx ON public.availability_alerts USING btree (branch_id, alert_type, is_resolved);


--
-- Name: availability_alerts_company_id_is_read_severity_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availability_alerts_company_id_is_read_severity_created_at_idx ON public.availability_alerts USING btree (company_id, is_read, severity, created_at);


--
-- Name: availability_audit_logs_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availability_audit_logs_batch_id_idx ON public.availability_audit_logs USING btree (batch_id);


--
-- Name: availability_audit_logs_branch_availability_id_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availability_audit_logs_branch_availability_id_timestamp_idx ON public.availability_audit_logs USING btree (branch_availability_id, "timestamp");


--
-- Name: availability_audit_logs_company_id_change_type_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availability_audit_logs_company_id_change_type_timestamp_idx ON public.availability_audit_logs USING btree (company_id, change_type, "timestamp");


--
-- Name: availability_templates_company_id_template_type_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX availability_templates_company_id_template_type_is_active_idx ON public.availability_templates USING btree (company_id, template_type, is_active);


--
-- Name: branch_availabilities_branch_id_connected_type_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_availabilities_branch_id_connected_type_is_active_idx ON public.branch_availabilities USING btree (branch_id, connected_type, is_active);


--
-- Name: branch_availabilities_branch_id_is_active_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_availabilities_branch_id_is_active_priority_idx ON public.branch_availabilities USING btree (branch_id, is_active, priority);


--
-- Name: branch_availabilities_company_id_connected_type_is_in_stock_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_availabilities_company_id_connected_type_is_in_stock_idx ON public.branch_availabilities USING btree (company_id, connected_type, is_in_stock);


--
-- Name: branch_availabilities_connected_id_connected_type_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_availabilities_connected_id_connected_type_branch_id_idx ON public.branch_availabilities USING btree (connected_id, connected_type, branch_id);


--
-- Name: branch_provider_mappings_branch_id_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_provider_mappings_branch_id_is_active_idx ON public.branch_provider_mappings USING btree (branch_id, is_active);


--
-- Name: branch_provider_mappings_company_provider_config_id_is_acti_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_provider_mappings_company_provider_config_id_is_acti_idx ON public.branch_provider_mappings USING btree (company_provider_config_id, is_active);


--
-- Name: branch_provider_mappings_provider_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branch_provider_mappings_provider_branch_id_idx ON public.branch_provider_mappings USING btree (provider_branch_id);


--
-- Name: branches_allows_delivery_allows_online_orders_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branches_allows_delivery_allows_online_orders_idx ON public.branches USING btree (allows_delivery, allows_online_orders);


--
-- Name: branches_city_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branches_city_is_active_idx ON public.branches USING btree (city, is_active);


--
-- Name: branches_company_id_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branches_company_id_is_active_idx ON public.branches USING btree (company_id, is_active);


--
-- Name: branches_company_id_is_default_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branches_company_id_is_default_idx ON public.branches USING btree (company_id, is_default);


--
-- Name: branches_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX branches_latitude_longitude_idx ON public.branches USING btree (latitude, longitude);


--
-- Name: careem_orders_branch_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX careem_orders_branch_id_status_idx ON public.careem_orders USING btree (branch_id, status);


--
-- Name: careem_orders_careem_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX careem_orders_careem_order_id_idx ON public.careem_orders USING btree (careem_order_id);


--
-- Name: careem_orders_careem_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX careem_orders_careem_order_id_key ON public.careem_orders USING btree (careem_order_id);


--
-- Name: careem_orders_company_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX careem_orders_company_id_status_idx ON public.careem_orders USING btree (company_id, status);


--
-- Name: careem_webhook_events_careem_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX careem_webhook_events_careem_order_id_idx ON public.careem_webhook_events USING btree (careem_order_id);


--
-- Name: careem_webhook_events_event_type_processed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX careem_webhook_events_event_type_processed_idx ON public.careem_webhook_events USING btree (event_type, processed);


--
-- Name: companies_business_type_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX companies_business_type_status_idx ON public.companies USING btree (business_type, status);


--
-- Name: companies_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX companies_slug_key ON public.companies USING btree (slug);


--
-- Name: companies_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX companies_status_idx ON public.companies USING btree (status);


--
-- Name: companies_subscription_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX companies_subscription_expires_at_idx ON public.companies USING btree (subscription_expires_at);


--
-- Name: company_logos_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_logos_company_id_idx ON public.company_logos USING btree (company_id);


--
-- Name: company_logos_company_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX company_logos_company_id_key ON public.company_logos USING btree (company_id);


--
-- Name: company_provider_configs_company_id_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_provider_configs_company_id_priority_idx ON public.company_provider_configs USING btree (company_id, priority);


--
-- Name: company_provider_configs_company_id_provider_type_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_provider_configs_company_id_provider_type_is_active_idx ON public.company_provider_configs USING btree (company_id, provider_type, is_active);


--
-- Name: company_tax_settings_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_tax_settings_company_id_idx ON public.company_tax_settings USING btree (company_id);


--
-- Name: company_tax_settings_company_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX company_tax_settings_company_id_key ON public.company_tax_settings USING btree (company_id);


--
-- Name: delivery_error_logs_company_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_error_logs_company_id_created_at_idx ON public.delivery_error_logs USING btree (company_id, created_at);


--
-- Name: delivery_error_logs_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_error_logs_created_at_idx ON public.delivery_error_logs USING btree (created_at);


--
-- Name: delivery_error_logs_provider_type_error_type_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_error_logs_provider_type_error_type_created_at_idx ON public.delivery_error_logs USING btree (provider_type, error_type, created_at);


--
-- Name: delivery_provider_analytics_company_id_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_provider_analytics_company_id_date_idx ON public.delivery_provider_analytics USING btree (company_id, date);


--
-- Name: delivery_provider_analytics_company_id_provider_type_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX delivery_provider_analytics_company_id_provider_type_date_key ON public.delivery_provider_analytics USING btree (company_id, provider_type, date);


--
-- Name: delivery_provider_analytics_provider_type_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_provider_analytics_provider_type_date_idx ON public.delivery_provider_analytics USING btree (provider_type, date);


--
-- Name: delivery_provider_orders_company_id_order_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_provider_orders_company_id_order_status_created_at_idx ON public.delivery_provider_orders USING btree (company_id, order_status, created_at);


--
-- Name: delivery_provider_orders_delivery_provider_id_provider_orde_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_provider_orders_delivery_provider_id_provider_orde_idx ON public.delivery_provider_orders USING btree (delivery_provider_id, provider_order_id);


--
-- Name: delivery_provider_orders_order_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_provider_orders_order_number_idx ON public.delivery_provider_orders USING btree (order_number);


--
-- Name: delivery_providers_company_id_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_providers_company_id_is_active_idx ON public.delivery_providers USING btree (company_id, is_active);


--
-- Name: delivery_providers_is_active_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_providers_is_active_priority_idx ON public.delivery_providers USING btree (is_active, priority);


--
-- Name: delivery_zones_branch_id_is_active_priority_level_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX delivery_zones_branch_id_is_active_priority_level_idx ON public.delivery_zones USING btree (branch_id, is_active, priority_level);


--
-- Name: global_locations_city_name_area_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_locations_city_name_area_name_idx ON public.global_locations USING btree (city_name, area_name);


--
-- Name: global_locations_country_name_city_name_area_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_locations_country_name_city_name_area_name_idx ON public.global_locations USING btree (country_name, city_name, area_name);


--
-- Name: global_locations_governorate_city_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_locations_governorate_city_name_idx ON public.global_locations USING btree (governorate, city_name);


--
-- Name: global_locations_is_active_city_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_locations_is_active_city_name_idx ON public.global_locations USING btree (is_active, city_name);


--
-- Name: global_locations_search_text_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_locations_search_text_idx ON public.global_locations USING btree (search_text);


--
-- Name: idx_delivery_error_logs_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_error_logs_company ON public.delivery_error_logs USING btree (company_id, created_at);


--
-- Name: idx_delivery_error_logs_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_error_logs_provider ON public.delivery_error_logs USING btree (provider_type, error_type, created_at);


--
-- Name: idx_delivery_provider_analytics_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_provider_analytics_company ON public.delivery_provider_analytics USING btree (company_id, date);


--
-- Name: idx_delivery_provider_analytics_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_provider_analytics_provider ON public.delivery_provider_analytics USING btree (provider_type, date);


--
-- Name: idx_delivery_provider_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_provider_orders_status ON public.delivery_provider_orders USING btree (company_id, order_status, created_at);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_webhook_delivery_logs_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_delivery_logs_company ON public.webhook_delivery_logs USING btree (company_id, created_at);


--
-- Name: idx_webhook_delivery_logs_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_delivery_logs_provider ON public.webhook_delivery_logs USING btree (provider_type, webhook_type, created_at);


--
-- Name: idx_webhook_delivery_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_delivery_logs_status ON public.webhook_delivery_logs USING btree (status, created_at);


--
-- Name: jordan_locations_area_name_en_area_name_ar_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jordan_locations_area_name_en_area_name_ar_idx ON public.jordan_locations USING btree (area_name_en, area_name_ar);


--
-- Name: jordan_locations_governorate_city_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jordan_locations_governorate_city_idx ON public.jordan_locations USING btree (governorate, city);


--
-- Name: license_invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX license_invoices_invoice_number_key ON public.license_invoices USING btree (invoice_number);


--
-- Name: licenses_company_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX licenses_company_id_status_idx ON public.licenses USING btree (company_id, status);


--
-- Name: licenses_days_remaining_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX licenses_days_remaining_idx ON public.licenses USING btree (days_remaining);


--
-- Name: licenses_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX licenses_expires_at_idx ON public.licenses USING btree (expires_at);


--
-- Name: licenses_status_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX licenses_status_expires_at_idx ON public.licenses USING btree (status, expires_at);


--
-- Name: menu_categories_company_id_is_active_display_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_categories_company_id_is_active_display_number_idx ON public.menu_categories USING btree (company_id, is_active, display_number);


--
-- Name: menu_products_company_id_branch_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_products_company_id_branch_id_status_idx ON public.menu_products USING btree (company_id, branch_id, status);


--
-- Name: menu_products_company_id_category_id_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_products_company_id_category_id_priority_idx ON public.menu_products USING btree (company_id, category_id, priority);


--
-- Name: menu_products_company_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_products_company_id_created_at_idx ON public.menu_products USING btree (company_id, created_at);


--
-- Name: menu_products_company_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_products_company_id_status_idx ON public.menu_products USING btree (company_id, status);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_product_id_idx ON public.order_items USING btree (product_id);


--
-- Name: orders_branch_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_branch_id_status_created_at_idx ON public.orders USING btree (branch_id, status, created_at);


--
-- Name: orders_customer_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_customer_phone_idx ON public.orders USING btree (customer_phone);


--
-- Name: orders_delivery_provider_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_delivery_provider_id_status_idx ON public.orders USING btree (delivery_provider_id, status);


--
-- Name: orders_estimated_delivery_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_estimated_delivery_time_idx ON public.orders USING btree (estimated_delivery_time);


--
-- Name: orders_order_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_order_number_idx ON public.orders USING btree (order_number);


--
-- Name: orders_order_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);


--
-- Name: orders_order_type_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_order_type_status_created_at_idx ON public.orders USING btree (order_type, status, created_at);


--
-- Name: orders_payment_status_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_payment_status_status_idx ON public.orders USING btree (payment_status, status);


--
-- Name: print_jobs_company_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_jobs_company_id_status_created_at_idx ON public.print_jobs USING btree (company_id, status, created_at);


--
-- Name: print_jobs_printer_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_jobs_printer_id_status_created_at_idx ON public.print_jobs USING btree (printer_id, status, created_at);


--
-- Name: print_jobs_priority_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_jobs_priority_created_at_idx ON public.print_jobs USING btree (priority, created_at);


--
-- Name: print_templates_company_id_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_templates_company_id_type_idx ON public.print_templates USING btree (company_id, type);


--
-- Name: printer_configurations_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_configurations_branch_id_idx ON public.printer_configurations USING btree (branch_id);


--
-- Name: printer_configurations_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_configurations_company_id_idx ON public.printer_configurations USING btree (company_id);


--
-- Name: printer_configurations_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_configurations_is_active_idx ON public.printer_configurations USING btree (is_active);


--
-- Name: printer_discovery_events_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_discovery_events_branch_id_idx ON public.printer_discovery_events USING btree (branch_id);


--
-- Name: printer_discovery_events_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_discovery_events_company_id_idx ON public.printer_discovery_events USING btree (company_id);


--
-- Name: printer_discovery_events_discovered_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_discovery_events_discovered_by_idx ON public.printer_discovery_events USING btree (discovered_by);


--
-- Name: printer_discovery_events_discoveryStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "printer_discovery_events_discoveryStatus_idx" ON public.printer_discovery_events USING btree ("discoveryStatus");


--
-- Name: printer_discovery_events_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_discovery_events_is_active_idx ON public.printer_discovery_events USING btree (is_active);


--
-- Name: printer_discovery_events_last_seen_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_discovery_events_last_seen_idx ON public.printer_discovery_events USING btree (last_seen);


--
-- Name: printer_discovery_events_printer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_discovery_events_printer_id_idx ON public.printer_discovery_events USING btree (printer_id);


--
-- Name: printer_licenses_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_licenses_branch_id_idx ON public.printer_licenses USING btree (branch_id);


--
-- Name: printer_licenses_device_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_licenses_device_id_idx ON public.printer_licenses USING btree (device_id);


--
-- Name: printer_licenses_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_licenses_expires_at_idx ON public.printer_licenses USING btree (expires_at);


--
-- Name: printer_licenses_license_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX printer_licenses_license_key_key ON public.printer_licenses USING btree (license_key);


--
-- Name: printer_licenses_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_licenses_status_idx ON public.printer_licenses USING btree (status);


--
-- Name: printer_sessions_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_sessions_branch_id_idx ON public.printer_sessions USING btree (branch_id);


--
-- Name: printer_sessions_device_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_sessions_device_id_idx ON public.printer_sessions USING btree (device_id);


--
-- Name: printer_sessions_last_heartbeat_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_sessions_last_heartbeat_idx ON public.printer_sessions USING btree (last_heartbeat);


--
-- Name: printer_sessions_license_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printer_sessions_license_id_idx ON public.printer_sessions USING btree (license_id);


--
-- Name: printers_branch_id_assignedTo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "printers_branch_id_assignedTo_idx" ON public.printers USING btree (branch_id, "assignedTo");


--
-- Name: printers_company_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printers_company_id_status_idx ON public.printers USING btree (company_id, status);


--
-- Name: printers_printer_license_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX printers_printer_license_id_idx ON public.printers USING btree (printer_license_id);


--
-- Name: product_images_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX product_images_created_at_idx ON public.product_images USING btree (created_at);


--
-- Name: product_images_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX product_images_product_id_idx ON public.product_images USING btree (product_id);


--
-- Name: promotion_analytics_campaign_id_date_platform_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX promotion_analytics_campaign_id_date_platform_key ON public.promotion_analytics USING btree (campaign_id, date, platform);


--
-- Name: promotion_campaigns_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX promotion_campaigns_slug_key ON public.promotion_campaigns USING btree (slug);


--
-- Name: promotion_codes_campaign_id_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX promotion_codes_campaign_id_code_key ON public.promotion_codes USING btree (campaign_id, code);


--
-- Name: promotion_menu_items_campaign_id_menu_item_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX promotion_menu_items_campaign_id_menu_item_id_key ON public.promotion_menu_items USING btree (campaign_id, menu_item_id);


--
-- Name: promotion_menu_items_campaign_id_platforms_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX promotion_menu_items_campaign_id_platforms_idx ON public.promotion_menu_items USING btree (campaign_id, platforms);


--
-- Name: promotion_menu_items_menu_item_id_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX promotion_menu_items_menu_item_id_is_active_idx ON public.promotion_menu_items USING btree (menu_item_id, is_active);


--
-- Name: promotion_platform_configs_campaign_id_platform_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX promotion_platform_configs_campaign_id_platform_key ON public.promotion_platform_configs USING btree (campaign_id, platform);


--
-- Name: provider_order_logs_company_provider_config_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX provider_order_logs_company_provider_config_id_created_at_idx ON public.provider_order_logs USING btree (company_provider_config_id, created_at);


--
-- Name: provider_order_logs_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX provider_order_logs_order_id_idx ON public.provider_order_logs USING btree (order_id);


--
-- Name: provider_order_logs_order_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX provider_order_logs_order_status_idx ON public.provider_order_logs USING btree (order_status);


--
-- Name: provider_order_logs_provider_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX provider_order_logs_provider_order_id_idx ON public.provider_order_logs USING btree (provider_order_id);


--
-- Name: taxable_categories_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taxable_categories_category_id_idx ON public.taxable_categories USING btree (category_id);


--
-- Name: taxable_categories_tax_id_category_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX taxable_categories_tax_id_category_id_key ON public.taxable_categories USING btree (tax_id, category_id);


--
-- Name: taxable_modifiers_modifier_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taxable_modifiers_modifier_id_idx ON public.taxable_modifiers USING btree (modifier_id);


--
-- Name: taxable_modifiers_tax_id_modifier_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX taxable_modifiers_tax_id_modifier_id_key ON public.taxable_modifiers USING btree (tax_id, modifier_id);


--
-- Name: taxable_products_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taxable_products_product_id_idx ON public.taxable_products USING btree (product_id);


--
-- Name: taxable_products_tax_id_product_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX taxable_products_tax_id_product_id_key ON public.taxable_products USING btree (tax_id, product_id);


--
-- Name: taxes_company_id_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taxes_company_id_is_active_idx ON public.taxes USING btree (company_id, is_active);


--
-- Name: taxes_company_id_is_default_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taxes_company_id_is_default_idx ON public.taxes USING btree (company_id, is_default);


--
-- Name: taxes_tax_type_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taxes_tax_type_is_active_idx ON public.taxes USING btree (tax_type, is_active);


--
-- Name: template_analytics_template_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX template_analytics_template_id_key ON public.template_analytics USING btree (template_id);


--
-- Name: template_builder_analytics_company_id_action_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_analytics_company_id_action_created_at_idx ON public.template_builder_analytics USING btree (company_id, action, created_at);


--
-- Name: template_builder_analytics_template_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_analytics_template_id_created_at_idx ON public.template_builder_analytics USING btree (template_id, created_at);


--
-- Name: template_builder_components_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_components_parent_id_idx ON public.template_builder_components USING btree (parent_id);


--
-- Name: template_builder_components_template_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_components_template_id_idx ON public.template_builder_components USING btree (template_id);


--
-- Name: template_builder_components_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_components_type_idx ON public.template_builder_components USING btree (type);


--
-- Name: template_builder_marketplace_download_count_rating_average_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_marketplace_download_count_rating_average_idx ON public.template_builder_marketplace USING btree (download_count, rating_average);


--
-- Name: template_builder_marketplace_industry_template_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_marketplace_industry_template_type_idx ON public.template_builder_marketplace USING btree (industry, template_type);


--
-- Name: template_builder_marketplace_status_is_featured_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_marketplace_status_is_featured_idx ON public.template_builder_marketplace USING btree (status, is_featured);


--
-- Name: template_builder_marketplace_template_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX template_builder_marketplace_template_id_key ON public.template_builder_marketplace USING btree (template_id);


--
-- Name: template_builder_permissions_template_id_role_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX template_builder_permissions_template_id_role_key ON public.template_builder_permissions USING btree (template_id, role);


--
-- Name: template_builder_print_jobs_printer_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_print_jobs_printer_id_status_idx ON public.template_builder_print_jobs USING btree (printer_id, status);


--
-- Name: template_builder_print_jobs_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_print_jobs_status_created_at_idx ON public.template_builder_print_jobs USING btree (status, created_at);


--
-- Name: template_builder_print_jobs_template_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_print_jobs_template_id_created_at_idx ON public.template_builder_print_jobs USING btree (template_id, created_at);


--
-- Name: template_builder_templates_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_templates_category_id_idx ON public.template_builder_templates USING btree (category_id);


--
-- Name: template_builder_templates_company_id_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_templates_company_id_branch_id_idx ON public.template_builder_templates USING btree (company_id, branch_id);


--
-- Name: template_builder_templates_is_active_is_default_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_templates_is_active_is_default_idx ON public.template_builder_templates USING btree (is_active, is_default);


--
-- Name: template_builder_templates_usage_count_last_used_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_builder_templates_usage_count_last_used_at_idx ON public.template_builder_templates USING btree (usage_count, last_used_at);


--
-- Name: template_builder_versions_template_id_version_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX template_builder_versions_template_id_version_key ON public.template_builder_versions USING btree (template_id, version);


--
-- Name: template_feedback_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_feedback_company_id_idx ON public.template_feedback USING btree (company_id);


--
-- Name: template_feedback_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_feedback_created_at_idx ON public.template_feedback USING btree (created_at);


--
-- Name: template_feedback_template_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_feedback_template_id_idx ON public.template_feedback USING btree (template_id);


--
-- Name: template_feedback_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_feedback_user_id_idx ON public.template_feedback USING btree (user_id);


--
-- Name: unique_company_printer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_company_printer ON public.printer_configurations USING btree (company_id, printer_info_id);


--
-- Name: user_activity_logs_action_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_activity_logs_action_timestamp_idx ON public.user_activity_logs USING btree (action, "timestamp");


--
-- Name: user_activity_logs_resource_type_resource_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_activity_logs_resource_type_resource_id_idx ON public.user_activity_logs USING btree (resource_type, resource_id);


--
-- Name: user_activity_logs_success_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_activity_logs_success_timestamp_idx ON public.user_activity_logs USING btree (success, "timestamp");


--
-- Name: user_activity_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_activity_logs_timestamp_idx ON public.user_activity_logs USING btree ("timestamp");


--
-- Name: user_activity_logs_user_id_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_activity_logs_user_id_timestamp_idx ON public.user_activity_logs USING btree (user_id, "timestamp");


--
-- Name: user_sessions_expires_at_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_sessions_expires_at_is_active_idx ON public.user_sessions USING btree (expires_at, is_active);


--
-- Name: user_sessions_ip_address_user_agent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_sessions_ip_address_user_agent_idx ON public.user_sessions USING btree (ip_address, user_agent);


--
-- Name: user_sessions_last_used_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_sessions_last_used_at_idx ON public.user_sessions USING btree (last_used_at);


--
-- Name: user_sessions_refresh_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_sessions_refresh_expires_at_idx ON public.user_sessions USING btree (refresh_expires_at);


--
-- Name: user_sessions_refresh_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_sessions_refresh_token_hash_key ON public.user_sessions USING btree (refresh_token_hash);


--
-- Name: user_sessions_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_sessions_token_hash_key ON public.user_sessions USING btree (token_hash);


--
-- Name: user_sessions_user_id_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_sessions_user_id_is_active_idx ON public.user_sessions USING btree (user_id, is_active);


--
-- Name: users_branch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_branch_id_idx ON public.users USING btree (branch_id);


--
-- Name: users_company_id_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_company_id_role_idx ON public.users USING btree (company_id, role);


--
-- Name: users_company_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_company_id_status_idx ON public.users USING btree (company_id, status);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_failed_login_attempts_locked_until_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_failed_login_attempts_locked_until_idx ON public.users USING btree (failed_login_attempts, locked_until);


--
-- Name: users_status_last_login_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_status_last_login_at_idx ON public.users USING btree (status, last_login_at);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: webhook_delivery_logs_company_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhook_delivery_logs_company_id_created_at_idx ON public.webhook_delivery_logs USING btree (company_id, created_at);


--
-- Name: webhook_delivery_logs_provider_type_webhook_type_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhook_delivery_logs_provider_type_webhook_type_created_at_idx ON public.webhook_delivery_logs USING btree (provider_type, webhook_type, created_at);


--
-- Name: webhook_delivery_logs_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhook_delivery_logs_status_created_at_idx ON public.webhook_delivery_logs USING btree (status, created_at);


--
-- Name: _DeliveryProviderToJordanLocation _DeliveryProviderToJordanLocation_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_DeliveryProviderToJordanLocation"
    ADD CONSTRAINT "_DeliveryProviderToJordanLocation_A_fkey" FOREIGN KEY ("A") REFERENCES public.delivery_providers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _DeliveryProviderToJordanLocation _DeliveryProviderToJordanLocation_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_DeliveryProviderToJordanLocation"
    ADD CONSTRAINT "_DeliveryProviderToJordanLocation_B_fkey" FOREIGN KEY ("B") REFERENCES public.jordan_locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_generation_history ai_generation_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_history
    ADD CONSTRAINT ai_generation_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_generation_history ai_generation_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_history
    ADD CONSTRAINT ai_generation_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_template_optimization ai_template_optimization_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_template_optimization
    ADD CONSTRAINT ai_template_optimization_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.print_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_template_optimization ai_template_optimization_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_template_optimization
    ADD CONSTRAINT ai_template_optimization_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: availability_alerts availability_alerts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_alerts
    ADD CONSTRAINT availability_alerts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: availability_alerts availability_alerts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_alerts
    ADD CONSTRAINT availability_alerts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_audit_logs availability_audit_logs_branch_availability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_audit_logs
    ADD CONSTRAINT availability_audit_logs_branch_availability_id_fkey FOREIGN KEY (branch_availability_id) REFERENCES public.branch_availabilities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_audit_logs availability_audit_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_audit_logs
    ADD CONSTRAINT availability_audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_templates availability_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_templates
    ADD CONSTRAINT availability_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_availabilities branch_availabilities_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_availabilities
    ADD CONSTRAINT branch_availabilities_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_availabilities branch_availabilities_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_availabilities
    ADD CONSTRAINT branch_availabilities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_provider_mappings branch_provider_mappings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_provider_mappings
    ADD CONSTRAINT branch_provider_mappings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branch_provider_mappings branch_provider_mappings_company_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branch_provider_mappings
    ADD CONSTRAINT branch_provider_mappings_company_provider_config_id_fkey FOREIGN KEY (company_provider_config_id) REFERENCES public.company_provider_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branches branches_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: careem_orders careem_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.careem_orders
    ADD CONSTRAINT careem_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: careem_orders careem_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.careem_orders
    ADD CONSTRAINT careem_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: careem_webhook_events careem_webhook_events_careem_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.careem_webhook_events
    ADD CONSTRAINT careem_webhook_events_careem_order_id_fkey FOREIGN KEY (careem_order_id) REFERENCES public.careem_orders(careem_order_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: company_logos company_logos_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_logos
    ADD CONSTRAINT company_logos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_provider_configs company_provider_configs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_provider_configs
    ADD CONSTRAINT company_provider_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_tax_settings company_tax_settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_tax_settings
    ADD CONSTRAINT company_tax_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_error_logs delivery_error_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_error_logs
    ADD CONSTRAINT delivery_error_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_provider_analytics delivery_provider_analytics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_provider_analytics
    ADD CONSTRAINT delivery_provider_analytics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_provider_orders delivery_provider_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_provider_orders delivery_provider_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_provider_orders delivery_provider_orders_delivery_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_provider_orders
    ADD CONSTRAINT delivery_provider_orders_delivery_provider_id_fkey FOREIGN KEY (delivery_provider_id) REFERENCES public.delivery_providers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_providers delivery_providers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_providers
    ADD CONSTRAINT delivery_providers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: delivery_zones delivery_zones_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delivery_zones delivery_zones_global_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_global_location_id_fkey FOREIGN KEY (global_location_id) REFERENCES public.global_locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: licenses licenses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_products menu_products_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_products menu_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_products menu_products_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_products
    ADD CONSTRAINT menu_products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modifier_categories modifier_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifier_categories
    ADD CONSTRAINT modifier_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modifiers modifiers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifiers
    ADD CONSTRAINT modifiers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modifiers modifiers_modifier_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modifiers
    ADD CONSTRAINT modifiers_modifier_category_id_fkey FOREIGN KEY (modifier_category_id) REFERENCES public.modifier_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_delivery_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_provider_id_fkey FOREIGN KEY (delivery_provider_id) REFERENCES public.delivery_providers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_delivery_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_zone_id_fkey FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: price_history price_history_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: print_jobs print_jobs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: print_jobs print_jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: print_jobs print_jobs_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: print_jobs print_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_jobs
    ADD CONSTRAINT print_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: print_templates print_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printer_configurations printer_configurations_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_configurations
    ADD CONSTRAINT printer_configurations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: printer_configurations printer_configurations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_configurations
    ADD CONSTRAINT printer_configurations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printer_discovery_events printer_discovery_events_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_discovery_events
    ADD CONSTRAINT printer_discovery_events_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printer_discovery_events printer_discovery_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_discovery_events
    ADD CONSTRAINT printer_discovery_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printer_discovery_events printer_discovery_events_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_discovery_events
    ADD CONSTRAINT printer_discovery_events_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: printer_licenses printer_licenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_licenses
    ADD CONSTRAINT printer_licenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printer_sessions printer_sessions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_sessions
    ADD CONSTRAINT printer_sessions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printer_sessions printer_sessions_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_sessions
    ADD CONSTRAINT printer_sessions_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.printer_licenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printers printers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: printers printers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: printers printers_printer_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_printer_license_id_fkey FOREIGN KEY (printer_license_id) REFERENCES public.printer_licenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_modifier_categories product_modifier_categories_modifier_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_modifier_categories
    ADD CONSTRAINT product_modifier_categories_modifier_category_id_fkey FOREIGN KEY (modifier_category_id) REFERENCES public.modifier_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_modifier_categories product_modifier_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_modifier_categories
    ADD CONSTRAINT product_modifier_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_analytics promotion_analytics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_analytics
    ADD CONSTRAINT promotion_analytics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_campaigns promotion_campaigns_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_campaigns
    ADD CONSTRAINT promotion_campaigns_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_codes promotion_codes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_codes
    ADD CONSTRAINT promotion_codes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_menu_items promotion_menu_items_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_menu_items
    ADD CONSTRAINT promotion_menu_items_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_menu_items promotion_menu_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_menu_items
    ADD CONSTRAINT promotion_menu_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_modifier_markups promotion_modifier_markups_modifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_modifier_id_fkey FOREIGN KEY (modifier_id) REFERENCES public.modifiers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_modifier_markups promotion_modifier_markups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_modifier_markups promotion_modifier_markups_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_modifier_markups
    ADD CONSTRAINT promotion_modifier_markups_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_platform_configs promotion_platform_configs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_platform_configs
    ADD CONSTRAINT promotion_platform_configs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_products promotion_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_products promotion_products_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_targets promotion_targets_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_targets
    ADD CONSTRAINT promotion_targets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_templates promotion_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_templates
    ADD CONSTRAINT promotion_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_usage promotion_usage_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_usage
    ADD CONSTRAINT promotion_usage_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_usage promotion_usage_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_usage
    ADD CONSTRAINT promotion_usage_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.promotion_codes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: promotion_variants promotion_variants_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_variants
    ADD CONSTRAINT promotion_variants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promotion_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotions promotions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: provider_order_logs provider_order_logs_company_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_order_logs
    ADD CONSTRAINT provider_order_logs_company_provider_config_id_fkey FOREIGN KEY (company_provider_config_id) REFERENCES public.company_provider_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxable_categories taxable_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_categories
    ADD CONSTRAINT taxable_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxable_categories taxable_categories_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_categories
    ADD CONSTRAINT taxable_categories_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxable_modifiers taxable_modifiers_modifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_modifiers
    ADD CONSTRAINT taxable_modifiers_modifier_id_fkey FOREIGN KEY (modifier_id) REFERENCES public.modifiers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxable_modifiers taxable_modifiers_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_modifiers
    ADD CONSTRAINT taxable_modifiers_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxable_products taxable_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_products
    ADD CONSTRAINT taxable_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxable_products taxable_products_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxable_products
    ADD CONSTRAINT taxable_products_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: taxes taxes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxes
    ADD CONSTRAINT taxes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_analytics template_analytics_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_analytics
    ADD CONSTRAINT template_analytics_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.print_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_analytics template_builder_analytics_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_analytics
    ADD CONSTRAINT template_builder_analytics_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_analytics template_builder_analytics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_analytics
    ADD CONSTRAINT template_builder_analytics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_analytics template_builder_analytics_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_analytics
    ADD CONSTRAINT template_builder_analytics_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_components template_builder_components_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_components
    ADD CONSTRAINT template_builder_components_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.template_builder_components(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: template_builder_components template_builder_components_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_components
    ADD CONSTRAINT template_builder_components_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_marketplace template_builder_marketplace_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_marketplace
    ADD CONSTRAINT template_builder_marketplace_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_permissions template_builder_permissions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_permissions
    ADD CONSTRAINT template_builder_permissions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_print_jobs template_builder_print_jobs_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_print_jobs
    ADD CONSTRAINT template_builder_print_jobs_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: template_builder_print_jobs template_builder_print_jobs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_print_jobs
    ADD CONSTRAINT template_builder_print_jobs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: template_builder_templates template_builder_templates_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_templates
    ADD CONSTRAINT template_builder_templates_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_templates template_builder_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_templates
    ADD CONSTRAINT template_builder_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.template_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: template_builder_templates template_builder_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_templates
    ADD CONSTRAINT template_builder_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_builder_templates template_builder_templates_parent_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_templates
    ADD CONSTRAINT template_builder_templates_parent_template_id_fkey FOREIGN KEY (parent_template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: template_builder_versions template_builder_versions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_builder_versions
    ADD CONSTRAINT template_builder_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_builder_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_feedback template_feedback_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_feedback
    ADD CONSTRAINT template_feedback_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_feedback template_feedback_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_feedback
    ADD CONSTRAINT template_feedback_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.print_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_feedback template_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_feedback
    ADD CONSTRAINT template_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_activity_logs user_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhook_delivery_logs webhook_delivery_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_delivery_logs
    ADD CONSTRAINT webhook_delivery_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict tIbq6XjCXnKdhcbFzXKjgffKDeYwcgfTAi252lnhc2Z0WLtWIeMffTX4g4M2VG7

