-- 11. NEW TABLES: PRODUCT INTELLIGENCE & CATEGORY TEMPLATES

-- Extension for fuzzy text matching (required by global_product_intelligence)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- product_specifications: Stores fixed product attributes (replaces the details JSONB approach)
CREATE TABLE IF NOT EXISTS public.product_specifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    key text NOT NULL,
    value text NOT NULL,
    unit text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(product_id, key)
);

CREATE INDEX IF NOT EXISTS idx_product_specifications_user_id ON public.product_specifications(user_id);
CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id ON public.product_specifications(product_id);

-- Auto-populate user_id from product owner (for edge function inserts that only know product_id)
CREATE OR REPLACE FUNCTION set_spec_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        SELECT user_id INTO NEW.user_id FROM public.products WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_spec_user_id_trigger ON public.product_specifications;
CREATE TRIGGER set_spec_user_id_trigger
    BEFORE INSERT ON public.product_specifications
    FOR EACH ROW EXECUTE FUNCTION set_spec_user_id();

ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product specifications"
    ON public.product_specifications FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Public read product specifications for active products"
    ON public.product_specifications FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_specifications.product_id AND p.status = 'Active'
    ));

-- category_templates: System-level templates defining expected specs/options per category/type
CREATE TABLE IF NOT EXISTS public.category_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name text NOT NULL,
    type_name text NOT NULL,
    default_specifications jsonb NOT NULL DEFAULT '[]',
    default_options jsonb NOT NULL DEFAULT '[]',
    is_system boolean DEFAULT true,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_templates_system
    ON public.category_templates (category_name, type_name) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_templates_user
    ON public.category_templates (category_name, type_name, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_category_templates_is_system ON public.category_templates(is_system, category_name);
CREATE INDEX IF NOT EXISTS idx_category_templates_user_id ON public.category_templates(user_id);

ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System templates are readable by all"
    ON public.category_templates FOR SELECT USING (is_system = true);

CREATE POLICY "Users can manage their own custom templates"
    ON public.category_templates FOR ALL USING (user_id = auth.uid());

-- global_product_intelligence: Cross-user shared cache of product intelligence
CREATE TABLE IF NOT EXISTS public.global_product_intelligence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_name text NOT NULL,
    category_name text NOT NULL,
    type_name text NOT NULL,
    description text,
    tags jsonb DEFAULT '[]',
    specifications jsonb NOT NULL,
    options jsonb DEFAULT '[]',
    source text DEFAULT 'ai_classified',
    confidence numeric DEFAULT 0.8,
    reuse_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(normalized_name, category_name, type_name)
);

CREATE INDEX IF NOT EXISTS idx_gpi_name_lookup ON public.global_product_intelligence(normalized_name);
CREATE INDEX IF NOT EXISTS idx_gpi_category_lookup ON public.global_product_intelligence(category_name, type_name);
CREATE INDEX IF NOT EXISTS idx_gpi_reuse_count ON public.global_product_intelligence(reuse_count DESC);
CREATE INDEX IF NOT EXISTS idx_gpi_name_trgm ON public.global_product_intelligence USING gin(normalized_name gin_trgm_ops);

ALTER TABLE public.global_product_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read global product intelligence"
    ON public.global_product_intelligence FOR SELECT
    USING (auth.role() = 'authenticated');

-- Function for fuzzy product name matching using pg_trgm similarity
CREATE OR REPLACE FUNCTION find_similar_product(search_name text, min_similarity float)
RETURNS SETOF global_product_intelligence AS $$
  SELECT * FROM global_product_intelligence
  WHERE normalized_name % search_name
    AND similarity(normalized_name, search_name) > min_similarity
  ORDER BY similarity(normalized_name, search_name) DESC
  LIMIT 1;
$$ LANGUAGE sql;
