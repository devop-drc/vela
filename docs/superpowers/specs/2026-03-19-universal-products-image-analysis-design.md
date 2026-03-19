# Design Spec: Universal Product Structure, Image Analysis & Radius Fix

**Date:** 2026-03-19
**Status:** Approved

---

## 1. Overview

Three changes to InstantShop:

1. **Gemini Vision image analysis** — When Instagram post captions are insufficient, analyze product images to extract details.
2. **Universal product structure** — Dedicated `product_specifications` table, `category_templates` seed system, and clear separation of specifications (fixed) vs options (customer-selectable) vs variants (combinations).
3. **Category & Type management page** — Admin page to manage system templates and custom categories/types with their associated specs and options.
4. **Radius fix** — Fix the broken border-radius adjustment in settings.

---

## 2. Image Analysis with Gemini Vision

### 2.1 Caption Quality Heuristic

Before the first Gemini API call, check if the caption is sufficient:

```
function isCaptionInsufficient(caption: string | null): boolean
  - caption is null or empty
  - caption is under 20 characters
  - caption is only hashtags (every word starts with #)
  - caption is only emojis (no alphanumeric characters)
  - caption has no price signals (no digits adjacent to currency symbols/codes)
```

If `isCaptionInsufficient` returns `true`, the first Gemini call includes images.

### 2.2 AI Fallback Retry

After the first Gemini call (caption-only), if:
- `isProductPost === false` AND the post has media, OR
- `isProductPost === true` but `productName` is missing or `price` is null

Then retry once with images attached.

### 2.3 Media Selection

For image analysis, select media to send:

| Post Type | What to Send |
|-----------|-------------|
| `IMAGE` | The single image (from `media_url`) |
| `VIDEO` | The thumbnail (from `thumbnail_url`) |
| `CAROUSEL_ALBUM` | Up to 3 child images via Instagram Graph API (`/{media_id}/children?fields=id,media_url,media_type,thumbnail_url`). For child videos, use their thumbnail. |

### 2.4 Gemini API Request Format (with images)

```json
{
  "contents": [{
    "parts": [
      { "text": "PROMPT_TEXT" },
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "<base64_encoded_image>"
        }
      },
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "<base64_encoded_image_2>"
        }
      }
    ]
  }],
  "tools": [{ "google_search": {} }],
  "generationConfig": { "responseMimeType": "application/json" }
}
```

Images are fetched from their URLs and base64-encoded in the edge function before sending to Gemini.

### 2.5 Prompt Additions

When images are included, append to the existing prompt:

```
IMPORTANT: The caption for this post is insufficient or missing. Product images have been provided.
Analyze the images carefully to identify:
- The product(s) shown (name, type, brand if visible)
- Visual attributes (color, material, condition)
- Any text visible in the image (price tags, labels, brand names)
- Product category based on visual appearance
Combine image analysis with any caption text available to produce the most accurate product details.
```

### 2.6 Implementation Location

All changes in `supabase/functions/ai-product-classifier/index.ts` and `supabase/functions/background-sync/index.ts`:

- New helper: `fetchImageAsBase64(url: string): Promise<{data: string, mimeType: string}>`
  - 10 second timeout per image fetch
  - Skip images larger than 4MB
  - Returns null on failure (graceful degradation)
- New helper: `getPostMedia(post, accessToken): Promise<ImagePart[]>` — handles carousel children
- Modified: `callGemini()` to accept optional image parts
- Modified: `background-sync` loop to check caption quality and handle retries

**Critical:** The existing `!post.caption` early-return skip in `background-sync` (line ~317) must be replaced with the `isCaptionInsufficient` check. Posts without captions should proceed to image analysis, not be skipped.

**Price signal regex** should align with existing pattern in `background-sync`: `/\b(ALL|EUR|USD|GBP|Lek|Leke)\b|\d+[\.,]?\d*\s?(ALL|EUR|USD|GBP)/i`

### 2.7 Caching

The `ai_analysis_cache` uses `instagram_post_id` as PK, so only one cache entry exists per post. When an image-enhanced analysis is performed, it overwrites any prior caption-only analysis (the image analysis is strictly better). No schema change needed — the cache simply stores the best available analysis.

---

## 3. Enhanced "Find Specs with AI" System

The current spec-finding uses `ai-product-classifier` with Google Search grounding, but only when manually triggered or during background sync. The `analyze-instagram-posts` function (used for import preview) has NO grounding. This section improves spec-finding across the board.

### 3.1 Enable Google Search Grounding Everywhere

**Problem:** `analyze-instagram-posts` does not include `tools: [{ google_search: {} }]` in its Gemini call, so import preview analysis lacks real-world specs.

**Fix:** Add `tools: [{ google_search: {} }]` to the Gemini call in `analyze-instagram-posts/index.ts`. All AI analysis paths should use grounding:

| Function | Currently Has Grounding | After |
|----------|------------------------|-------|
| `ai-product-classifier` | Yes | Yes |
| `analyze-instagram-posts` | **No** | **Yes** |
| `background-sync` (calls classifier) | Yes (inherited) | Yes |

### 3.2 Category Template-Guided Spec Search

Once the product's category/type is identified (either from caption analysis or image analysis), include the matching `category_templates` expected spec keys in the prompt so Gemini knows exactly what to look for.

**Flow:**
1. First, the AI identifies `categoryName` and `typeName` from the caption/image
2. Look up matching `category_templates` row (custom first, then system)
3. Include the template's `default_specifications` keys in a follow-up instruction:

```
For this product type "{typeName}" in category "{categoryName}", find these specific specifications:
- processor: The CPU/chipset model
- gpu: The graphics processor
- battery_mah: Battery capacity in milliampere-hours
- screen_size: Display diagonal in inches
- resolution: Screen resolution (e.g., 2796x1290)
- weight: Device weight
- os: Operating system version
...
Also find any additional specifications not listed above that are relevant to this product.
```

**Implementation:** The template lookup happens inside the edge function before the Gemini call. Fetch templates using the service role client. If no template matches, use the generic prompt (current behavior).

### 3.3 Better Search Context with Images

When "Find specs with AI" is triggered (manual button or during sync), send richer context to Gemini:

1. **Product name as explicit search hint** — Prepend to the prompt: `"Product to search for: {productName}"`
2. **Product images** — Include up to 3 images (reusing the image analysis infrastructure from Section 2) so Gemini can identify the exact product model, variant, and color from the image
3. **Existing partial specs** — Include any specs already known so Gemini can fill gaps rather than re-derive everything

**Updated prompt structure for "Find specs" calls:**
```
Search for the exact specifications of this product.

Product name: {productName}
Category: {categoryName}
Type: {typeName}
Known specifications: {existingSpecs as key-value pairs}
Caption/description: {caption}

[Images attached if available]

Expected specifications for this product type: {templateSpecKeys}

Use Google Search to find the most accurate and complete specifications.
Return ONLY the specifications as a JSON array: [{"key": "...", "value": "...", "unit": "..."}]
Do not re-classify the product. Focus entirely on finding accurate specifications.
```

### 3.4 Write Results to `product_specifications` Table

After the spec-finding call returns, write results directly to the new `product_specifications` table instead of the `details` JSONB blob.

**In `ProductEditMode.tsx` (`handleReanalyze`):**
- Current: writes specs to `details` JSONB via `setValue('details', ...)`
- New: upsert each spec to `product_specifications` table via Supabase client
- Then refresh the specs display from the table

**In `background-sync`:**
- After product creation, insert specs into `product_specifications` from the analysis result
- Use `INSERT ... ON CONFLICT (product_id, key) DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit`

**In `upsert-combo-from-analysis`:**
- For each combo item product, insert its specs into `product_specifications`

### 3.5 Two-Pass Analysis for Accurate Specs

For the manual "Find specs with AI" button and during background sync, use a two-pass approach:

**Pass 1 — Classification (existing behavior):**
- Analyze caption (+ images if needed per Section 2)
- Extract: product name, category, type, price, options, basic specs
- This is the current `ai-product-classifier` call

**Pass 2 — Dedicated Spec Search (new):**
- Triggered automatically after Pass 1 completes
- Uses the identified product name + category/type
- Loads the matching `category_templates` to know what specs to search for
- Sends a focused prompt (see Section 3.3) asking ONLY for specifications
- Includes product images for exact model identification
- Google Search grounding finds real-world specs (dimensions, battery, processor, etc.)
- Results merged with Pass 1 specs (Pass 2 wins on conflicts)

**When to run Pass 2:**
- **Background sync:** Always run both passes (the second pass is cheap and greatly improves spec quality)
- **Manual "Find specs" button:** Always run (this is what the user explicitly asked for)
- **Import preview (`analyze-instagram-posts`):** Only Pass 1 (speed matters for preview; user can run Pass 2 later)

**New edge function: `find-product-specs`**

A dedicated function for Pass 2 that:
1. Accepts: `{ product_id, product_name, category, type, caption?, media_urls?, existing_specs? }`
2. Fetches matching `category_templates`
3. Builds a spec-focused prompt with template keys
4. Calls Gemini with Google Search grounding + optional images
5. Returns: `{ specifications: [{ key, value, unit }] }`
6. Upserts results into `product_specifications` table

This function can also be called independently from the product editor UI to re-fetch specs at any time.

### 3.6 Spec Reuse for Known Products

When a new product is added that matches an existing product (e.g., another "iPhone 16 Pro" listing), reuse the already-extracted specifications and options instead of re-searching from scratch.

**Matching logic (in `ai-product-classifier` and `background-sync`):**

1. After Pass 1 classifies the product (name, category, type), before running Pass 2:
2. Query `products` joined with `product_specifications` to find existing products with a similar name and same category/type:
   ```sql
   SELECT p.id, p.name, p.category,
          array_agg(json_build_object('key', ps.key, 'value', ps.value, 'unit', ps.unit)) as specs
   FROM products p
   LEFT JOIN product_specifications ps ON ps.product_id = p.id
   WHERE p.user_id = :userId
     AND p.category = :categoryName
     AND (
       p.name ILIKE '%' || :productName || '%'
       OR :productName ILIKE '%' || p.name || '%'
     )
     AND p.id != :currentProductId  -- exclude self
   GROUP BY p.id
   LIMIT 3
   ```
3. Also query `product_options` + `option_values` for the matched products to get existing options.

**If a match is found:**
- Copy specifications from the matched product into the new product's `product_specifications` rows
- Copy option structure (option names and common values) from matched product
- Skip Pass 2 (no need to Google Search for specs we already have)
- Still allow the AI to adjust price, inventory, and specific option values (e.g., different color selection) from the caption

**If no match is found:**
- Proceed with Pass 2 as normal (Google Search for specs)

**Benefits:**
- Avoids redundant Gemini API calls for well-known products
- Ensures consistency across multiple listings of the same product
- Faster sync when re-importing similar products

---

## 4. Universal Product Structure

### 4.1 New Table: `product_specifications`

```sql
CREATE TABLE public.product_specifications (
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

CREATE INDEX idx_product_specifications_user_id ON public.product_specifications(user_id);
CREATE INDEX idx_product_specifications_product_id ON public.product_specifications(product_id);

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

CREATE TRIGGER set_spec_user_id_trigger
    BEFORE INSERT ON public.product_specifications
    FOR EACH ROW EXECUTE FUNCTION set_spec_user_id();

-- RLS
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product specifications"
    ON public.product_specifications
    FOR ALL
    USING (user_id = auth.uid());

-- Public storefront can read specs for active products
CREATE POLICY "Public read product specifications for active products"
    ON public.product_specifications
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_specifications.product_id
        AND p.status = 'Active'
    ));
```

### 4.2 New Table: `category_templates`

System-level templates defining expected specs and options per category/type. These are global (not per-user) and serve as defaults. Users can also create custom categories/types.

```sql
CREATE TABLE public.category_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name text NOT NULL,
    type_name text NOT NULL,
    default_specifications jsonb NOT NULL DEFAULT '[]',
    default_options jsonb NOT NULL DEFAULT '[]',
    is_system boolean DEFAULT true,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Separate unique indexes to handle NULL user_id correctly
CREATE UNIQUE INDEX idx_category_templates_system
    ON public.category_templates (category_name, type_name)
    WHERE user_id IS NULL;

CREATE UNIQUE INDEX idx_category_templates_user
    ON public.category_templates (category_name, type_name, user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_category_templates_is_system ON public.category_templates(is_system, category_name);
CREATE INDEX idx_category_templates_user_id ON public.category_templates(user_id);

-- RLS
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;

-- System templates readable by all (including anon for storefront)
CREATE POLICY "System templates are readable by all"
    ON public.category_templates
    FOR SELECT
    USING (is_system = true);

CREATE POLICY "Users can manage their own custom templates"
    ON public.category_templates
    FOR ALL
    USING (user_id = auth.uid());
```

**Relationship with existing `categories` and `types` tables:** The existing per-user `categories` and `types` tables remain for product categorization (the actual category/type assigned to each product). `category_templates` is a separate reference library that provides default specs and options. When AI classifies a product, it looks up `category_templates` to know what to extract, then writes the category name to `products.category` and upserts into `categories`/`types` as before. The template is consulted, not replaced.

#### `default_specifications` format:
```json
[
  { "key": "material", "label": "Material", "unit": null, "common_values": ["Cotton", "Polyester", "Silk", "Wool", "Linen"] },
  { "key": "weight", "label": "Weight", "unit": "grams", "common_values": null },
  { "key": "care_instructions", "label": "Care Instructions", "unit": null, "common_values": ["Machine Wash", "Hand Wash", "Dry Clean Only"] }
]
```

#### `default_options` format:
```json
[
  { "name": "Size", "common_values": ["XS", "S", "M", "L", "XL", "XXL"] },
  { "name": "Color", "common_values": ["Black", "White", "Red", "Blue", "Green", "Grey", "Navy", "Brown", "Pink", "Beige"] }
]
```

### 4.3 Seed Data (13 Categories, ~65 Types)

#### Clothing & Apparel

| Type | Specifications | Options |
|------|---------------|---------|
| T-Shirts | material, fit (Regular/Slim/Oversized), gender, care_instructions, season | Size, Color |
| Hoodies & Sweatshirts | material, fit, gender, weight_gsm, care_instructions | Size, Color |
| Pants & Jeans | material, fit, gender, rise (Low/Mid/High), closure | Size, Color, Length |
| Dresses & Skirts | material, gender, length, occasion, care_instructions | Size, Color |
| Jackets & Coats | material, gender, insulation, waterproof, season | Size, Color |
| Shoes & Sneakers | upper_material, gender, sole_material, closure_type | Size, Color |
| Underwear & Socks | material, gender, pack_count | Size, Color |
| Accessories | material, gender, season | Size, Color |

#### Electronics & Tech

| Type | Specifications | Options |
|------|---------------|---------|
| Smartphones | processor, gpu, screen_size, resolution, battery_mah, os, camera_mp, weight, connectivity | Storage, RAM, Color |
| Laptops | processor, gpu, screen_size, resolution, battery_wh, os, weight, ports | Storage, RAM, Color |
| Tablets | processor, screen_size, resolution, battery_mah, os, weight, connectivity | Storage, RAM, Color |
| Headphones & Earbuds | driver_size, frequency_response, impedance, battery_life, noise_cancelling, connectivity | Color |
| Smartwatches | processor, screen_size, battery_life, water_resistance, os, sensors | Color, Band |
| Cameras | sensor_size, megapixels, iso_range, video_resolution, weight, lens_mount | Color, Kit |
| Gaming Consoles | processor, gpu, storage, resolution_output, weight | Edition, Bundle |
| Computer Accessories | connectivity, compatibility, dimensions, weight | Color, Size |
| Speakers | driver_size, power_watts, battery_life, connectivity, water_resistance | Color |
| Power Banks & Chargers | capacity_mah, output_watts, ports, weight | Color |

#### Home & Living

| Type | Specifications | Options |
|------|---------------|---------|
| Furniture | material, dimensions, weight, weight_capacity, assembly_required | Color, Size |
| Decor | material, dimensions, weight | Color, Style |
| Kitchenware | material, dimensions, dishwasher_safe, capacity | Color, Size |
| Bedding & Textiles | material, thread_count, dimensions, care_instructions | Size, Color |
| Lighting | wattage, lumens, color_temperature, dimensions, bulb_type | Color, Size |
| Storage & Organization | material, dimensions, weight_capacity | Color, Size |

#### Beauty & Personal Care

| Type | Specifications | Options |
|------|---------------|---------|
| Skincare | ingredients, volume, skin_type, spf, cruelty_free | Size |
| Makeup | ingredients, finish, coverage, cruelty_free | Shade, Size |
| Haircare | ingredients, volume, hair_type | Size |
| Fragrances | notes_top, notes_middle, notes_base, concentration, gender | Size |
| Nail Care | finish, ingredients, cruelty_free | Color |
| Tools & Devices | material, power_source, battery_life, weight | Color |

#### Art & Handmade

| Type | Specifications | Options |
|------|---------------|---------|
| Paintings | medium, dimensions, artist, year, signed | Frame |
| Prints & Posters | print_method, paper_type, dimensions, edition | Size, Frame |
| Sculptures | material, dimensions, weight, artist | Size |
| Handmade Jewelry | material, gemstone, weight, hypoallergenic | Size, Metal |
| Pottery & Ceramics | material, dimensions, technique, dishwasher_safe | Color, Size |
| Candles & Wax | wax_type, scent, burn_time, weight | Size, Scent |

#### Food & Beverages

| Type | Specifications | Options |
|------|---------------|---------|
| Snacks | ingredients, allergens, nutritional_info, net_weight, shelf_life | Size, Flavor |
| Beverages | ingredients, volume, allergens, caffeine_content | Size, Flavor |
| Baked Goods | ingredients, allergens, net_weight, shelf_life | Size, Flavor |
| Meal Kits | ingredients, servings, prep_time, allergens, calories | Portion |
| Coffee & Tea | origin, roast_level, process, net_weight | Size, Grind |
| Supplements | ingredients, dosage, servings, certifications | Size, Flavor |

#### Sports & Fitness

| Type | Specifications | Options |
|------|---------------|---------|
| Equipment | material, dimensions, weight, weight_capacity | Size, Color |
| Sports Clothing | material, fit, gender, moisture_wicking | Size, Color |
| Supplements | ingredients, servings, dosage, certifications | Size, Flavor |
| Sports Footwear | material, gender, sole_type, terrain | Size, Color |
| Accessories | material, dimensions, weight | Size, Color |

#### Books & Media

| Type | Specifications | Options |
|------|---------------|---------|
| Physical Books | author, pages, language, publisher, isbn, year | Format |
| E-books | author, pages, language, file_format | — |
| Music (Physical) | artist, label, year, genre, tracks | Format |
| Online Courses | instructor, duration, level, language, modules | Plan |

#### Services

| Type | Specifications | Options |
|------|---------------|---------|
| Consulting | duration, delivery_method, includes | Package, Duration |
| Design Services | deliverables, revisions, turnaround_time, format | Package |
| Photography | duration, deliverables, location, edited_photos_count | Package |
| Tutoring & Lessons | subject, duration, level, delivery_method | Duration, Frequency |
| Repair & Maintenance | warranty, turnaround_time, includes | Type |
| Subscriptions | billing_cycle, includes, access_level | Plan, Duration |

#### Automotive & Parts

| Type | Specifications | Options |
|------|---------------|---------|
| Car Parts | compatibility, material, dimensions, weight, oem_aftermarket | — |
| Car Accessories | material, compatibility, dimensions | Color, Size |
| Tools | material, drive_size, weight, set_count | Set |

#### Toys & Games

| Type | Specifications | Options |
|------|---------------|---------|
| Toys | age_range, material, dimensions, battery_required, safety_certifications | Color |
| Board Games | age_range, players, play_time, language | Edition |
| Puzzles | pieces, dimensions, age_range, material | — |
| Video Games | platform, genre, esrb_rating, players, language | Edition, Platform |

#### Pet Supplies

| Type | Specifications | Options |
|------|---------------|---------|
| Pet Food | animal_type, ingredients, allergens, net_weight, life_stage | Size, Flavor |
| Pet Toys | animal_type, material, dimensions, durability | Size, Color |
| Pet Accessories | animal_type, material, dimensions | Size, Color |
| Pet Health | animal_type, ingredients, dosage, volume | Size |

#### Bags & Luggage

| Type | Specifications | Options |
|------|---------------|---------|
| Backpacks | material, capacity_liters, dimensions, weight, laptop_compartment | Color, Size |
| Handbags & Purses | material, dimensions, closure_type, gender | Color |
| Luggage & Suitcases | material, capacity_liters, dimensions, weight, wheels, tsa_lock | Size, Color |
| Wallets & Cardholders | material, card_slots, dimensions, rfid_blocking | Color |

### 4.4 Migration: `products.details` → `product_specifications`

A one-time migration script that:

1. For each product with non-empty `details` JSONB:
   - Extract key-value pairs that are NOT `type`, `options`, `options_v2`, `variants`, `Brand`
   - Skip array values (those are legacy options, already in `product_options`)
   - Skip null values and nested object values
   - Coerce numeric values to text via `::text`
   - Insert using `INSERT ... ON CONFLICT (product_id, key) DO NOTHING`
   - Set `user_id` from the product's `user_id` column
2. Keep `details` column for backward compatibility but stop writing specs to it
3. Update all frontend reads to use `product_specifications` instead of `details`

### 4.5 AI Prompt Updates

Update the Gemini prompt in `ai-product-classifier` to:

1. Reference the `category_templates` system — include the matching template's expected specs and options when a category/type is identified
2. Enforce the distinction:
   - **Specifications**: Fixed product attributes that describe what the product IS. Not selectable by customer. Examples: material, processor, screen_size, battery_mah.
   - **Options**: Attributes the customer CHOOSES when purchasing. Create variant combinations. Examples: color, size, storage, RAM.
3. Return specs as: `"specifications": [{"key": "material", "value": "Cotton", "unit": null}, ...]`
4. Return options as before: `"options": {"Size": [...], "Color": [...]}`

### 4.6 Product Creation Flow Changes

When a product is created (from AI or manually):

1. Look up `category_templates` for the category/type
2. Pre-populate specification fields from template defaults
3. Pre-populate option fields from template defaults
4. AI fills in actual values; user can edit
5. Save specs to `product_specifications` table
6. Save options to `product_options` + `option_values` tables
7. Generate variants from options as before

---

## 5. Category & Type Management Page

### 5.1 Route

`/categories` — New protected route in `App.tsx`, added to sidebar navigation.

### 5.2 Page Structure

```
Categories & Types Management Page
├── Header: "Categories & Types" + "Add Category" button
├── Tab bar: "System Templates" | "My Custom"
│
├── Category List (accordion/collapsible)
│   ├── Category Card: "Clothing & Apparel" [Edit] [Delete (custom only)]
│   │   ├── Type: "T-Shirts" [Edit] [Delete (custom only)]
│   │   │   ├── Specifications: material, fit, gender, care_instructions, season
│   │   │   └── Options: Size, Color
│   │   ├── Type: "Hoodies & Sweatshirts" [Edit] [Delete]
│   │   └── + Add Type
│   │
│   ├── Category Card: "Electronics & Tech"
│   │   ├── Type: "Smartphones" [Edit] [Delete]
│   │   └── ...
│   └── ...
│
└── Modals:
    ├── Add/Edit Category Modal
    │   └── Fields: Category Name
    ├── Add/Edit Type Modal
    │   ├── Fields: Type Name
    │   ├── Specifications Editor (add/remove/reorder specs)
    │   │   └── Per spec: key, label, unit (optional), common_values (tag input)
    │   └── Options Editor (add/remove/reorder options)
    │       └── Per option: name, common_values (tag input)
    └── Delete Confirmation Modal
```

### 5.3 Behavior

**System templates:**
- Read-only by default (marked with a badge)
- Users can "Duplicate as Custom" to make an editable copy
- Users cannot delete system templates

**Custom templates:**
- Fully editable (CRUD)
- Created by user via "Add Category" / "Add Type" buttons
- `is_system = false`, `user_id = auth.uid()`
- Appear in "My Custom" tab and also in the combined view

**Template usage:**
- When AI classifies a product, it checks custom templates first (user-specific), then falls back to system templates
- When user manually creates a product and selects a category/type, the template pre-populates spec and option fields

### 5.4 Components

| Component | Purpose |
|-----------|---------|
| `src/pages/Categories.tsx` | Page component with tabs, search, category list |
| `src/components/categories/CategoryCard.tsx` | Collapsible category with its types |
| `src/components/categories/TypeCard.tsx` | Type display with specs and options |
| `src/components/categories/CategoryEditorModal.tsx` | Add/edit category |
| `src/components/categories/TypeEditorModal.tsx` | Add/edit type with spec/option editors |
| `src/components/categories/SpecificationEditor.tsx` | Manage spec list with key, label, unit, common values |
| `src/components/categories/OptionEditor.tsx` | Manage option list with name and common values |

---

## 6. Radius Fix

### 6.1 Root Cause

The `InstagramShopLayout` component (`src/components/storefront/InstagramShopLayout.tsx`) contains `applyInstagramShopSettingsToDOM()` which:

1. **Removes all custom CSS properties** from `document.documentElement` (line ~29-36)
2. **Hardcodes `--radius: 0.5rem`** (line ~64)
3. **Injects a `<style>` tag with `!important`** overriding `--radius` (line ~79)

When a user navigates from the Instagram Shop layout back to the dashboard, the hardcoded values and `!important` overrides can persist, making the radius slider appear non-functional.

### 6.2 Fix

1. **`AppearanceContext.tsx`**: Export a `restoreSettings()` method via context (or export `applySettingsToDOM` directly). Currently `applySettingsToDOM` is a module-level function not exposed to other components.
2. **`InstagramShopLayout.tsx`**: On unmount (cleanup function in `useEffect`), call the exported `restoreSettings()` to re-apply the user's saved design settings.
3. **Remove the `!important`** from the injected `<style>` tag — the inline styles on `documentElement` already have sufficient specificity.
4. **`AppearanceContext.tsx`**: Ensure `applySettingsToDOM` is called on mount and after any navigation that could have overridden CSS variables.

---

## 7. Files Changed

### New Files
- `supabase/functions/find-product-specs/index.ts` — Dedicated Pass 2 spec-finding edge function
- `src/pages/Categories.tsx` — Category & Type management page
- `src/components/categories/CategoryCard.tsx` — Collapsible category with types
- `src/components/categories/TypeCard.tsx` — Type display with specs and options
- `src/components/categories/CategoryEditorModal.tsx` — Add/edit category
- `src/components/categories/TypeEditorModal.tsx` — Add/edit type with spec/option editors
- `src/components/categories/SpecificationEditor.tsx` — Manage spec list
- `src/components/categories/OptionEditor.tsx` — Manage option list

### Modified Files
- `supabase/functions/ai-product-classifier/index.ts` — Image analysis, template-guided prompts, new spec output format, Pass 1 classification
- `supabase/functions/analyze-instagram-posts/index.ts` — Add Google Search grounding (`tools: [{ google_search: {} }]`)
- `supabase/functions/background-sync/index.ts` — Caption heuristic, retry logic, image fetching, two-pass analysis (calls `find-product-specs` after classification), write specs to `product_specifications` table
- `supabase/functions/upsert-combo-from-analysis/index.ts` — Write specs to `product_specifications` table
- `supabase/recreate_db.sql` — New tables (`product_specifications`, `category_templates`), seed data, indexes, RLS policies, triggers
- `src/App.tsx` — New `/categories` route
- `src/components/layout/Sidebar.tsx` — Add categories link
- `src/components/layout/BottomNav.tsx` — Add categories link (if applicable)
- `src/components/storefront/InstagramShopLayout.tsx` — Radius fix (remove `!important`, cleanup restores settings)
- `src/components/settings/AppearancePanel.tsx` — Verify radius slider works
- `src/contexts/AppearanceContext.tsx` — Export `restoreSettings()`, ensure settings restoration after layout switches
- `src/components/product-detail/ProductEditMode.tsx` — "Find specs with AI" button now calls `find-product-specs`, reads/writes `product_specifications` table instead of `details` JSONB
- `src/components/product-detail/ProductEditor.tsx` — Read specs from `product_specifications`, show template defaults
- `src/components/product-forms/*` — Use new spec/option structure
- `src/components/storefront/StorefrontProductDetail.tsx` — Display specs from `product_specifications` table
- `src/components/InstagramPostModal.tsx` — Benefits from grounding in `analyze-instagram-posts`
