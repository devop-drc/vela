-- Consolidated SQL to recreate the database from scratch
-- Project: InstantShop
-- Derived from deep backup analysis and project structure
-- Version: 3.6 (Idempotent: Skip if exists)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. SCHEMAS
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- 3. ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE public.order_status_enum AS ENUM (
            'Pending',
            'Order Seen',
            'Order Packaged',
            'Given to Courier',
            'Fulfilled',
            'Problematic',
            'Cancelled'
        );
    END IF;
END $$;

-- 4. TABLES

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    first_name text,
    last_name text,
    avatar_url text,
    onboarding_complete boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    phone_number text,
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_full_sync_at timestamp with time zone,
    CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Types
CREATE TABLE IF NOT EXISTS public.types (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    category_id uuid NOT NULL,
    name text NOT NULL,
    attributes jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT types_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE,
    CONSTRAINT types_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    status text DEFAULT 'Draft',
    price numeric,
    inventory integer DEFAULT 0,
    instagram_post_id text,
    media_url text,
    caption text,
    created_at timestamp with time zone DEFAULT now(),
    reference_code text,
    pricing_type text DEFAULT 'one_time' NOT NULL,
    billing_interval text,
    business_id uuid,
    media_type text,
    thumbnail_url text,
    media_gallery text[],
    currency text,
    category text,
    details jsonb,
    tags text[],
    user_id uuid,
    product_type text DEFAULT 'physical' NOT NULL,
    interval_repetitions integer,
    CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Product Options
CREATE TABLE IF NOT EXISTS public.product_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    product_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean,
    "position" smallint,
    CONSTRAINT product_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT product_options_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Option Values
CREATE TABLE IF NOT EXISTS public.option_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    option_id uuid NOT NULL,
    user_id uuid,
    value text NOT NULL,
    price_difference numeric DEFAULT 0,
    inventory integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT option_values_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.product_options(id) ON DELETE CASCADE,
    CONSTRAINT option_values_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT option_values_option_id_value_key UNIQUE (option_id, value)
);

-- Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    product_id uuid NOT NULL,
    option_value_ids uuid[] DEFAULT '{}',
    inventory integer DEFAULT 0 NOT NULL,
    price_difference numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sku text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    combination_key text,
    option_values jsonb DEFAULT '{}' NOT NULL,
    user_id uuid,
    CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT product_variants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid NOT NULL,
    customer_name text,
    customer_email text,
    status public.order_status_enum DEFAULT 'Pending' NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    currency text DEFAULT 'USD' NOT NULL,
    payment_method text DEFAULT 'card' NOT NULL,
    payment_status text DEFAULT 'pending' NOT NULL,
    shipping_address text,
    shipping_city text,
    shipping_state text,
    shipping_zip text,
    shipping_country text,
    order_notes text,
    shipping_notes_seller text,
    shipping_notes_courier text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    order_id uuid NOT NULL,
    product_id uuid,
    quantity integer NOT NULL,
    price_at_purchase numeric(10,2) NOT NULL,
    CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- Order Disputes
CREATE TABLE IF NOT EXISTS public.order_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    order_id uuid NOT NULL,
    customer_email text NOT NULL,
    reason text NOT NULL,
    message text,
    status text DEFAULT 'Open' NOT NULL,
    reply_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    value jsonb NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    target_products uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repeat_interval text,
    CONSTRAINT promotions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Shop Details
CREATE TABLE IF NOT EXISTS public.shop_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid NOT NULL UNIQUE,
    shop_name text,
    headline text,
    about text,
    contact_email text,
    currency character varying(3) DEFAULT 'USD',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    slug text NOT NULL UNIQUE,
    instagram_url text,
    favicon_url text,
    logo_url text,
    ig_account_id text,
    CONSTRAINT shop_details_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    access_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    ig_account_id text,
    CONSTRAINT integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT integrations_user_id_provider_key UNIQUE (user_id, provider)
);

-- Keywords
CREATE TABLE IF NOT EXISTS public.keywords (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    keyword text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT keywords_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT keywords_user_id_keyword_key UNIQUE (user_id, keyword)
);

-- Marquee Elements
CREATE TABLE IF NOT EXISTS public.marquee_elements (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    message text NOT NULL,
    icon_name text DEFAULT 'Sparkles' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    repeat_interval text,
    CONSTRAINT marquee_elements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Design Settings
CREATE TABLE IF NOT EXISTS public.design_settings (
    user_id uuid NOT NULL PRIMARY KEY,
    settings jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT design_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sync Jobs
CREATE TABLE IF NOT EXISTS public.sync_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    thumbnail_url text,
    summary jsonb,
    current_post_caption text,
    ai_analysis_message text,
    analysis_result jsonb,
    CONSTRAINT sync_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Customer Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    label text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text NOT NULL,
    city text NOT NULL,
    state text,
    zip_code text NOT NULL,
    country text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- AI Analysis Cache
CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
    instagram_post_id text NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    caption_hash text NOT NULL,
    analysis_result jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_analysis_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- AI Feedback
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    product_id uuid,
    field_name text NOT NULL,
    original_value text,
    corrected_value text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT ai_feedback_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Combo Products
CREATE TABLE IF NOT EXISTS public.combo_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    instagram_post_id text,
    description text,
    discount_type text,
    discount_value numeric,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT combo_products_discount_type_check CHECK (discount_type = ANY (ARRAY['percent', 'fixed']))
);

-- Combo Items
CREATE TABLE IF NOT EXISTS public.combo_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    combo_id uuid NOT NULL,
    product_id uuid,
    required boolean DEFAULT false NOT NULL,
    min_qty integer DEFAULT 0 NOT NULL,
    max_qty integer DEFAULT 1 NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    default_variant_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_name text NOT NULL,
    item_description text,
    default_combination_key text,
    media jsonb,
    base_price numeric,
    CONSTRAINT combo_items_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combo_products(id) ON DELETE CASCADE,
    CONSTRAINT combo_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- Combo Item Options
CREATE TABLE IF NOT EXISTS public.combo_item_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    combo_item_id uuid NOT NULL,
    name text NOT NULL,
    "position" smallint,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_item_options_combo_item_id_fkey FOREIGN KEY (combo_item_id) REFERENCES public.combo_items(id) ON DELETE CASCADE
);

-- Combo Option Values
CREATE TABLE IF NOT EXISTS public.combo_option_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    item_option_id uuid NOT NULL,
    value text NOT NULL,
    price_difference numeric,
    inventory integer,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_option_values_item_option_id_fkey FOREIGN KEY (item_option_id) REFERENCES public.combo_item_options(id) ON DELETE CASCADE
);

-- Combo Item Variants
CREATE TABLE IF NOT EXISTS public.combo_item_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    combo_item_id uuid NOT NULL,
    combination_key text NOT NULL,
    inventory integer,
    price_difference numeric,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sku text,
    option_values jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_item_variants_combo_item_id_fkey FOREIGN KEY (combo_item_id) REFERENCES public.combo_items(id) ON DELETE CASCADE
);

-- Exchange Rates Cache
CREATE TABLE IF NOT EXISTS public.exchange_rates_cache (
    id integer NOT NULL PRIMARY KEY,
    rates jsonb NOT NULL,
    last_fetched_at timestamp with time zone NOT NULL
);

-- 5. FUNCTIONS

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for sales summary
CREATE OR REPLACE FUNCTION public.get_products_sales_summary(p_product_ids uuid[])
RETURNS TABLE(product_id uuid, total_earned numeric, total_sold bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT
        oi.product_id,
        SUM(oi.quantity * oi.price_at_purchase) AS total_earned,
        SUM(oi.quantity) AS total_sold
    FROM
        public.order_items oi
    JOIN
        public.orders o ON oi.order_id = o.id
    WHERE
        oi.product_id = ANY(p_product_ids) AND o.status = 'Fulfilled'
    GROUP BY
        oi.product_id;
END;
$$ LANGUAGE plpgsql;

-- Function for top products
CREATE OR REPLACE FUNCTION public.get_top_products(p_business_id uuid)
RETURNS TABLE(product_id uuid, name text, media_url text, total_sold bigint, price numeric, currency text, media_type text, thumbnail_url text, caption text, category text, tags text[], pricing_type text, billing_interval text, details jsonb, status text, inventory integer) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as product_id,
        p.name,
        p.media_url,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        p.price,
        p.currency,
        p.media_type,
        p.thumbnail_url,
        p.caption,
        p.category,
        p.tags,
        p.pricing_type,
        p.billing_interval,
        p.details,
        p.status,
        p.inventory
    FROM
        public.products p
    LEFT JOIN
        public.order_items oi ON oi.product_id = p.id
    LEFT JOIN
        public.orders o ON oi.order_id = o.id AND o.status = 'Fulfilled'
    WHERE
        p.business_id = p_business_id
    GROUP BY
        p.id, p.name, p.media_url, p.price, p.currency, p.media_type, p.thumbnail_url, p.caption, p.category, p.tags, p.pricing_type, p.billing_interval, p.details, p.status, p.inventory
    ORDER BY
        total_sold DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- User Onboarding: Create Business, Profile, and Shop on Signup
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS trigger AS $$
DECLARE
    v_business_id uuid;
    v_first_name text;
    v_last_name text;
    v_full_name text;
    v_shop_slug text;
BEGIN
    -- Extract metadata from Auth.Users
    v_first_name := new.raw_user_meta_data ->> 'first_name';
    v_last_name := new.raw_user_meta_data ->> 'last_name';
    v_full_name := new.raw_user_meta_data ->> 'full_name';
    
    -- Fallbacks for missing metadata
    IF v_first_name IS NULL THEN v_first_name := 'User'; END IF;
    IF v_full_name IS NULL THEN v_full_name := v_first_name; END IF;
    v_shop_slug := lower(v_first_name) || '-shop-' || substr(gen_random_uuid()::text, 1, 4);

    -- 1. Create Profile
    INSERT INTO public.profiles (id, first_name, last_name, phone_number, onboarding_complete)
    VALUES (
        new.id,
        v_first_name,
        v_last_name,
        new.raw_user_meta_data ->> 'phone_number',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Create Business
    INSERT INTO public.businesses (user_id, name)
    VALUES (
        new.id,
        v_full_name || '''s Business'
    ) ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO v_business_id;

    -- 3. Create Shop Details
    IF v_business_id IS NOT NULL THEN
        INSERT INTO public.shop_details (business_id, shop_name, slug, currency, contact_email)
        VALUES (
            v_business_id,
            v_full_name || '''s Shop',
            v_shop_slug,
            'USD',
            new.email
        ) ON CONFLICT (business_id) DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Onboarding: Create Design Settings
CREATE OR REPLACE FUNCTION public.handle_new_user_design_settings()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.design_settings (user_id, settings)
    VALUES (new.id, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic user_id assignment for products
CREATE OR REPLACE FUNCTION public.set_product_user_id()
RETURNS trigger AS $$
BEGIN
    SELECT user_id INTO NEW.user_id
    FROM public.businesses
    WHERE id = NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Automatic user_id assignment for product options
CREATE OR REPLACE FUNCTION public.set_product_option_user_id()
RETURNS trigger AS $$
BEGIN
    SELECT user_id INTO NEW.user_id
    FROM public.products
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Automatic user_id assignment for option values
CREATE OR REPLACE FUNCTION public.set_user_id_on_option_values()
RETURNS trigger AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        SELECT po.user_id INTO NEW.user_id
        FROM public.product_options po
        WHERE po.id = NEW.option_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic user_id assignment for product variants
CREATE OR REPLACE FUNCTION public.set_product_variant_user_id()
RETURNS trigger AS $$
BEGIN
    SELECT user_id INTO NEW.user_id
    FROM public.products
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
        CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_disputes_updated_at') THEN
        CREATE TRIGGER update_order_disputes_updated_at BEFORE UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_promotions_updated_at') THEN
        CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shop_details_updated_at') THEN
        CREATE TRIGGER update_shop_details_updated_at BEFORE UPDATE ON public.shop_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_marquee_elements_updated_at') THEN
        CREATE TRIGGER update_marquee_elements_updated_at BEFORE UPDATE ON public.marquee_elements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sync_jobs_updated_at') THEN
        CREATE TRIGGER update_sync_jobs_updated_at BEFORE UPDATE ON public.sync_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_addresses_updated_at') THEN
        CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_analysis_cache_updated_at') THEN
        CREATE TRIGGER update_ai_analysis_cache_updated_at BEFORE UPDATE ON public.ai_analysis_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_create_business') THEN
        CREATE TRIGGER on_auth_user_created_create_business AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_business();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_create_design_settings') THEN
        CREATE TRIGGER on_auth_user_created_create_design_settings AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_design_settings();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_product_user_id') THEN
        CREATE TRIGGER trg_set_product_user_id BEFORE INSERT OR UPDATE OF business_id ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_product_user_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_product_option_user_id') THEN
        CREATE TRIGGER trg_set_product_option_user_id BEFORE INSERT ON public.product_options FOR EACH ROW EXECUTE FUNCTION public.set_product_option_user_id();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_user_id_option_values') THEN
        CREATE TRIGGER trg_set_user_id_option_values BEFORE INSERT ON public.option_values FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_option_values();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_product_variant_user_id') THEN
        CREATE TRIGGER trg_set_product_variant_user_id BEFORE INSERT ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_product_variant_user_id();
    END IF;
END $$;

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_combo_products_user ON public.combo_products(user_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON public.combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);

-- 8. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('design-assets', 'design-assets', true) ON CONFLICT (id) DO NOTHING;

-- 9. REALTIME
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_jobs;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 10. RLS POLICIES (Comprehensive)

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marquee_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates_cache ENABLE ROW LEVEL SECURITY;

-- Anonymous Select Policies (Public Shop View)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read active products') THEN
        CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon USING (status = 'Active');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read active product variants') THEN
        CREATE POLICY "Public read active product variants" ON public.product_variants FOR SELECT TO anon USING (
            EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.status = 'Active')
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read active product options') THEN
        CREATE POLICY "Public read active product options" ON public.product_options FOR SELECT TO anon USING (
            EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_options.product_id AND p.status = 'Active')
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read active option values') THEN
        CREATE POLICY "Public read active option values" ON public.option_values FOR SELECT TO anon USING (
            EXISTS (SELECT 1 FROM public.product_options po JOIN public.products p ON p.id = po.product_id WHERE po.id = option_values.option_id AND p.status = 'Active')
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read active promotions') THEN
        CREATE POLICY "Public read active promotions" ON public.promotions FOR SELECT TO anon USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read shop details') THEN
        CREATE POLICY "Public read shop details" ON public.shop_details FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read marquee') THEN
        CREATE POLICY "Public read marquee" ON public.marquee_elements FOR SELECT TO anon USING (is_active = true);
    END IF;

    -- Owner Management Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow profile creation on signup') THEN
        CREATE POLICY "Allow profile creation on signup" ON public.profiles FOR INSERT TO anon WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow business creation on signup') THEN
        CREATE POLICY "Allow business creation on signup" ON public.businesses FOR INSERT TO anon WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow shop details creation on signup') THEN
        CREATE POLICY "Allow shop details creation on signup" ON public.shop_details FOR INSERT TO anon WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own profile') THEN
        CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own business') THEN
        CREATE POLICY "Users can manage their own business" ON public.businesses FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own categories') THEN
        CREATE POLICY "Users can manage their own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own types') THEN
        CREATE POLICY "Users can manage their own types" ON public.types FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own products') THEN
        CREATE POLICY "Users can manage their own products" ON public.products FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own product options') THEN
        CREATE POLICY "Users can manage their own product options" ON public.product_options FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own option values') THEN
        CREATE POLICY "Users can manage their own option values" ON public.option_values FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own variants') THEN
        CREATE POLICY "Users can manage their own variants" ON public.product_variants FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own promotions') THEN
        CREATE POLICY "Users can manage their own promotions" ON public.promotions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own shop details') THEN
        CREATE POLICY "Users can manage their own shop details" ON public.shop_details FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = shop_details.business_id AND b.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own integrations') THEN
        CREATE POLICY "Users can manage their own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own keywords') THEN
        CREATE POLICY "Users can manage their own keywords" ON public.keywords FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own marquee') THEN
        CREATE POLICY "Users can manage their own marquee" ON public.marquee_elements FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own design settings') THEN
        CREATE POLICY "Users can manage their own design settings" ON public.design_settings FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own sync jobs') THEN
        CREATE POLICY "Users can manage their own sync jobs" ON public.sync_jobs FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own addresses') THEN
        CREATE POLICY "Users can manage their own addresses" ON public.customer_addresses FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own combo products') THEN
        CREATE POLICY "Users can manage their own combo products" ON public.combo_products FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own combo items') THEN
        CREATE POLICY "Users can manage their own combo items" ON public.combo_items FOR ALL USING (EXISTS (SELECT 1 FROM public.combo_products cp WHERE cp.id = combo_items.combo_id AND cp.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own combo item options') THEN
        CREATE POLICY "Users can manage their own combo item options" ON public.combo_item_options FOR ALL USING (EXISTS (SELECT 1 FROM public.combo_items ci JOIN public.combo_products cp ON cp.id = ci.combo_id WHERE ci.id = combo_item_options.combo_item_id AND cp.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own combo option values') THEN
        CREATE POLICY "Users can manage their own combo option values" ON public.combo_option_values FOR ALL USING (EXISTS (SELECT 1 FROM public.combo_item_options cio JOIN public.combo_items ci ON ci.id = cio.combo_item_id JOIN public.combo_products cp ON cp.id = ci.combo_id WHERE cio.id = combo_option_values.item_option_id AND cp.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own combo item variants') THEN
        CREATE POLICY "Users can manage their own combo item variants" ON public.combo_item_variants FOR ALL USING (EXISTS (SELECT 1 FROM public.combo_items ci JOIN public.combo_products cp ON cp.id = ci.combo_id WHERE ci.id = combo_item_variants.combo_item_id AND cp.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own analysis cache') THEN
        CREATE POLICY "Users can manage their own analysis cache" ON public.ai_analysis_cache FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own ai feedback') THEN
        CREATE POLICY "Users can manage their own ai feedback" ON public.ai_feedback FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Public read for combo products
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo products') THEN
        CREATE POLICY "Public read combo products" ON public.combo_products FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo items') THEN
        CREATE POLICY "Public read combo items" ON public.combo_items FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo item options') THEN
        CREATE POLICY "Public read combo item options" ON public.combo_item_options FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo option values') THEN
        CREATE POLICY "Public read combo option values" ON public.combo_option_values FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo item variants') THEN
        CREATE POLICY "Public read combo item variants" ON public.combo_item_variants FOR SELECT TO anon USING (true);
    END IF;
    
    -- Public read for categories and types
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read categories') THEN
        CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read types') THEN
        CREATE POLICY "Public read types" ON public.types FOR SELECT TO anon USING (true);
    END IF;

    -- Orders and Items
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own orders') THEN
        CREATE POLICY "Users can manage their own orders" ON public.orders FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = orders.business_id AND b.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own order items') THEN
        CREATE POLICY "Users can manage their own order items" ON public.order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.businesses b ON b.id = o.business_id WHERE o.id = order_items.order_id AND b.user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can manage their own order disputes') THEN
        CREATE POLICY "Users can manage their own order disputes" ON public.order_disputes FOR ALL USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.businesses b ON b.id = o.business_id WHERE o.id = order_disputes.order_id AND b.user_id = auth.uid()));
    END IF;

    -- Exchange Rates Cache
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read exchange rates') THEN
        CREATE POLICY "Public read exchange rates" ON public.exchange_rates_cache FOR SELECT TO anon USING (true);
    END IF;
    -- Service role can do anything, no specific policy needed for that
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo item options') THEN
        CREATE POLICY "Public read combo item options" ON public.combo_item_options FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo option values') THEN
        CREATE POLICY "Public read combo option values" ON public.combo_option_values FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read combo item variants') THEN
        CREATE POLICY "Public read combo item variants" ON public.combo_item_variants FOR SELECT TO anon USING (true);
    END IF;
    
    -- Public read for categories and types
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read categories') THEN
        CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public read types') THEN
        CREATE POLICY "Public read types" ON public.types FOR SELECT TO anon USING (true);
    END IF;

    -- Storage Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can upload media') THEN
        CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own media') THEN
        CREATE POLICY "Users can update their own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own media') THEN
        CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public can view product media') THEN
        CREATE POLICY "Public can view product media" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'product-media');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can upload avatars') THEN
        CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own avatar') THEN
        CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid() = owner);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public can view avatars') THEN
        CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'avatars');
    END IF;
END $$;
