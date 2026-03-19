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
- New helper: `getPostMedia(post, accessToken): Promise<ImagePart[]>` — handles carousel children
- Modified: `callGemini()` to accept optional image parts
- Modified: `background-sync` loop to check caption quality and handle retries

### 2.7 Caching

The `ai_analysis_cache` key changes: when images were used in analysis, append `_with_images` to the `caption_hash` so cache distinguishes between caption-only and caption+image analyses.

---

## 3. Universal Product Structure

### 3.1 New Table: `product_specifications`

```sql
CREATE TABLE public.product_specifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    key text NOT NULL,
    value text NOT NULL,
    unit text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(product_id, key)
);

-- RLS
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product specifications"
    ON public.product_specifications
    FOR ALL
    USING (user_id = auth.uid());
```

### 3.2 New Table: `category_templates`

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
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(category_name, type_name, user_id)
);

-- RLS: system templates readable by all, custom templates by owner
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System templates are readable by all authenticated users"
    ON public.category_templates
    FOR SELECT
    USING (is_system = true AND auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own custom templates"
    ON public.category_templates
    FOR ALL
    USING (user_id = auth.uid());
```

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

### 3.3 Seed Data (13 Categories, ~65 Types)

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

### 3.4 Migration: `products.details` → `product_specifications`

A one-time migration script that:

1. For each product with non-empty `details` JSONB:
   - Extract key-value pairs that are NOT `type`, `options`, `options_v2`, `variants`, `Brand`
   - Skip array values (those are legacy options, already in `product_options`)
   - Insert each remaining key-value as a `product_specifications` row
2. Keep `details` column for backward compatibility but stop writing specs to it
3. Update all frontend reads to use `product_specifications` instead of `details`

### 3.5 AI Prompt Updates

Update the Gemini prompt in `ai-product-classifier` to:

1. Reference the `category_templates` system — include the matching template's expected specs and options when a category/type is identified
2. Enforce the distinction:
   - **Specifications**: Fixed product attributes that describe what the product IS. Not selectable by customer. Examples: material, processor, screen_size, battery_mah.
   - **Options**: Attributes the customer CHOOSES when purchasing. Create variant combinations. Examples: color, size, storage, RAM.
3. Return specs as: `"specifications": [{"key": "material", "value": "Cotton", "unit": null}, ...]`
4. Return options as before: `"options": {"Size": [...], "Color": [...]}`

### 3.6 Product Creation Flow Changes

When a product is created (from AI or manually):

1. Look up `category_templates` for the category/type
2. Pre-populate specification fields from template defaults
3. Pre-populate option fields from template defaults
4. AI fills in actual values; user can edit
5. Save specs to `product_specifications` table
6. Save options to `product_options` + `option_values` tables
7. Generate variants from options as before

---

## 4. Category & Type Management Page

### 4.1 Route

`/categories` — New protected route in `App.tsx`, added to sidebar navigation.

### 4.2 Page Structure

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

### 4.3 Behavior

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

### 4.4 Components

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

## 5. Radius Fix

### 5.1 Root Cause

The `InstagramShopLayout` component (`src/components/storefront/InstagramShopLayout.tsx`) contains `applyInstagramShopSettingsToDOM()` which:

1. **Removes all custom CSS properties** from `document.documentElement` (line ~29-36)
2. **Hardcodes `--radius: 0.5rem`** (line ~64)
3. **Injects a `<style>` tag with `!important`** overriding `--radius` (line ~79)

When a user navigates from the Instagram Shop layout back to the dashboard, the hardcoded values and `!important` overrides can persist, making the radius slider appear non-functional.

### 5.2 Fix

1. **`InstagramShopLayout.tsx`**: On unmount (cleanup function in `useEffect`), restore the user's saved design settings by calling `applySettingsToDOM(settings)` from `AppearanceContext`.
2. **Remove the `!important`** from the injected `<style>` tag — the inline styles on `documentElement` already have sufficient specificity.
3. **`AppearanceContext.tsx`**: Ensure `applySettingsToDOM` is called on mount and after any navigation that could have overridden CSS variables.

---

## 6. Files Changed

### New Files
- `src/pages/Categories.tsx`
- `src/components/categories/CategoryCard.tsx`
- `src/components/categories/TypeCard.tsx`
- `src/components/categories/CategoryEditorModal.tsx`
- `src/components/categories/TypeEditorModal.tsx`
- `src/components/categories/SpecificationEditor.tsx`
- `src/components/categories/OptionEditor.tsx`

### Modified Files
- `supabase/functions/ai-product-classifier/index.ts` — Image analysis, updated prompt, new spec output format
- `supabase/functions/background-sync/index.ts` — Caption heuristic, retry logic, image fetching, spec table writes
- `supabase/functions/upsert-combo-from-analysis/index.ts` — Write specs to new table
- `supabase/recreate_db.sql` — New tables, seed data
- `src/App.tsx` — New `/categories` route
- `src/components/layout/Sidebar.tsx` — Add categories link
- `src/components/layout/BottomNav.tsx` — Add categories link (if applicable)
- `src/components/storefront/InstagramShopLayout.tsx` — Radius fix
- `src/components/settings/AppearancePanel.tsx` — Verify radius slider works
- `src/contexts/AppearanceContext.tsx` — Ensure settings restoration after layout switches
- `src/components/product-detail/ProductEditor.tsx` — Read specs from `product_specifications`, show template defaults
- `src/components/product-forms/*` — Use new spec/option structure
- `src/components/storefront/StorefrontProductDetail.tsx` — Display specs from new table
