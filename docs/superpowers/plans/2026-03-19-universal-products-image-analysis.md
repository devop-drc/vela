# Universal Products, Image Analysis & Spec Intelligence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image analysis for insufficient captions, a universal product structure with dedicated specs/options/variants, a cost-optimized AI spec-finding waterfall with global intelligence cache, a category management page, and fix the radius settings bug.

**Architecture:** 6 phases building bottom-up: DB schema first, then radius fix (quick win), then category templates + seed data, then image analysis in edge functions, then the spec waterfall with global intelligence, and finally frontend integration. Each phase produces working, committable code.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (PostgreSQL + Edge Functions/Deno), Gemini 2.5 Flash/Pro API, Tailwind CSS + shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-19-universal-products-image-analysis-design.md`

---

## Chunk 1: Foundation — Database Schema & Radius Fix

### Task 1: Fix Radius Settings Bug

**Files:**
- Modify: `src/contexts/AppearanceContext.tsx`
- Modify: `src/components/storefront/InstagramShopLayout.tsx`

- [ ] **Step 1: Export `restoreSettings` from AppearanceContext**

In `src/contexts/AppearanceContext.tsx`, add `restoreSettings` to the context value. This function calls `applySettingsToDOM(settings)` to re-apply the user's saved design settings after another layout has overridden CSS variables.

Find the context value object (where `settings`, `updateSetting`, etc. are provided) and add:
```typescript
restoreSettings: () => applySettingsToDOM(settings),
```

Also add it to the context interface and default value.

- [ ] **Step 2: Remove `!important` and restore settings on unmount in InstagramShopLayout**

In `src/components/storefront/InstagramShopLayout.tsx`:

1. Find the injected `<style>` tag (line ~79) that uses `!important` on CSS variables. Remove all `!important` declarations from the CSS string.

2. In the `useEffect` cleanup function (the return function), call `restoreSettings()` from AppearanceContext to re-apply dashboard settings when navigating away:

```typescript
const { restoreSettings } = useAppearance();

useEffect(() => {
  applyInstagramShopSettingsToDOM(isDark);
  return () => {
    restoreSettings();
  };
}, [isDark]);
```

- [ ] **Step 3: Verify the fix**

Run `npm run dev`. Navigate to Settings > Appearance. Adjust the corner radius slider. Verify:
- The slider value changes visually
- UI elements (cards, buttons) update their border-radius in real-time
- After navigating to an Instagram shop page and back, the radius setting persists

- [ ] **Step 4: Commit**

```bash
git add src/contexts/AppearanceContext.tsx src/components/storefront/InstagramShopLayout.tsx
git commit -m "fix: radius settings not persisting — export restoreSettings, remove !important overrides"
```

---

### Task 2: Create New Database Tables

**Files:**
- Modify: `supabase/recreate_db.sql`

- [ ] **Step 1: Add `pg_trgm` extension and `product_specifications` table**

Add to `supabase/recreate_db.sql` (after existing table definitions):

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Product Specifications (dedicated table replacing details JSONB for specs)
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
```

- [ ] **Step 2: Add `category_templates` table**

```sql
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
```

- [ ] **Step 3: Add `global_product_intelligence` table**

```sql
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
```

- [ ] **Step 4: Run the SQL against Supabase**

Execute the SQL via the Supabase dashboard SQL editor or CLI. Verify all three tables exist with correct columns, indexes, and RLS policies.

- [ ] **Step 5: Commit**

```bash
git add supabase/recreate_db.sql
git commit -m "feat: add product_specifications, category_templates, global_product_intelligence tables"
```

---

### Task 3: Seed Category Templates Data

**Files:**
- Create: `supabase/seed_category_templates.sql`

- [ ] **Step 1: Create seed SQL file with all 13 categories / ~65 types**

Create `supabase/seed_category_templates.sql` with INSERT statements for all category templates. Each INSERT should include the full `default_specifications` and `default_options` JSONB arrays as defined in spec section 4.3.

The file should use `INSERT ... ON CONFLICT DO NOTHING` for idempotency. Structure each insert as:

```sql
INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'T-Shirts',
  '[{"key":"material","label":"Material","unit":null,"common_values":["Cotton","Polyester","Silk","Wool","Linen","Blend"]},{"key":"fit","label":"Fit","unit":null,"common_values":["Regular","Slim","Oversized","Relaxed"]},{"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Kids"]},{"key":"care_instructions","label":"Care Instructions","unit":null,"common_values":["Machine Wash","Hand Wash","Dry Clean Only"]},{"key":"season","label":"Season","unit":null,"common_values":["Spring","Summer","Fall","Winter","All Season"]}]'::jsonb,
  '[{"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},{"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;
```

Include ALL types from the spec:
- Clothing & Apparel (8 types)
- Electronics & Tech (10 types)
- Home & Living (6 types)
- Beauty & Personal Care (6 types)
- Art & Handmade (6 types)
- Food & Beverages (6 types)
- Sports & Fitness (5 types)
- Books & Media (4 types)
- Services (6 types)
- Automotive & Parts (3 types)
- Toys & Games (4 types)
- Pet Supplies (4 types)
- Bags & Luggage (4 types)

For each type, translate the spec's table row into the full JSONB format. Use the spec's listed specifications as `default_specifications` keys and listed options as `default_options` names. Add reasonable `common_values` arrays based on domain knowledge.

- [ ] **Step 2: Run the seed SQL against Supabase**

Execute via Supabase SQL editor. Verify:
```sql
SELECT category_name, count(*) FROM category_templates GROUP BY category_name ORDER BY category_name;
```
Should show 13 categories with correct type counts.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed_category_templates.sql
git commit -m "feat: seed 13 categories / ~65 types with specs and options templates"
```

---

### Task 4: Migration — Move Existing Specs from `details` JSONB

**Files:**
- Create: `supabase/migrate_details_to_specs.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrate_details_to_specs.sql`:

```sql
-- Migrate product specifications from details JSONB to product_specifications table
-- Skip reserved keys: type, options, options_v2, variants, Brand
-- Skip array values (legacy options) and null/object values
-- Coerce numeric values to text

INSERT INTO public.product_specifications (product_id, user_id, key, value, display_order)
SELECT
    p.id as product_id,
    p.user_id,
    kv.key,
    CASE
        WHEN jsonb_typeof(kv.value) = 'number' THEN kv.value::text
        WHEN jsonb_typeof(kv.value) = 'string' THEN kv.value #>> '{}'
        ELSE kv.value::text
    END as value,
    row_number() OVER (PARTITION BY p.id ORDER BY kv.key) as display_order
FROM public.products p,
     jsonb_each(p.details) AS kv(key, value)
WHERE p.details IS NOT NULL
  AND p.details != '{}'::jsonb
  AND kv.key NOT IN ('type', 'options', 'options_v2', 'variants', 'Brand')
  AND jsonb_typeof(kv.value) != 'array'
  AND jsonb_typeof(kv.value) != 'object'
  AND jsonb_typeof(kv.value) != 'null'
ON CONFLICT (product_id, key) DO NOTHING;
```

- [ ] **Step 2: Run migration and verify**

Execute via Supabase SQL editor. Verify:
```sql
SELECT count(*) FROM product_specifications;
SELECT ps.key, ps.value, p.name FROM product_specifications ps JOIN products p ON p.id = ps.product_id LIMIT 20;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrate_details_to_specs.sql
git commit -m "feat: migration script to move specs from details JSONB to product_specifications"
```

---

## Chunk 2: Category & Type Management Page

### Task 5: Categories Page — Route & Base Layout

**Files:**
- Create: `src/pages/Categories.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create the Categories page component**

Create `src/pages/Categories.tsx` with:
- Page title set via `usePageTitle("Categories & Types")`
- Tabs component (shadcn) with "All Templates" and "My Custom" tabs
- Search input to filter categories/types by name
- "Add Category" button (opens modal — wired in Task 7)
- State: `activeTab`, `searchQuery`, `categories` (fetched from Supabase)
- Data fetching: query `category_templates` table, group by `category_name`
  - "All Templates" tab: all system + user's custom templates
  - "My Custom" tab: only where `user_id = auth.uid()` or `is_system = false`
- Render a list of `CategoryCard` components (created in Task 6)

- [ ] **Step 2: Add route in App.tsx**

Add to the protected routes section (inside `DashboardLayout`):
```tsx
<Route path="/categories" element={<Categories />} />
```

Import: `import Categories from "./pages/Categories";`

- [ ] **Step 3: Add sidebar link**

In `src/components/layout/Sidebar.tsx`, add a navigation item for Categories. Use the `Layers` icon from lucide-react. Place it after "AI Keywords" in the nav items array:
```typescript
{ label: "Categories", path: "/categories", icon: Layers }
```

- [ ] **Step 4: Verify**

Run `npm run dev`. Navigate to `/categories`. Should see the page skeleton with tabs and empty state. The sidebar should show the Categories link.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Categories.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add Categories & Types management page with route and sidebar link"
```

---

### Task 6: CategoryCard & TypeCard Components

**Files:**
- Create: `src/components/categories/CategoryCard.tsx`
- Create: `src/components/categories/TypeCard.tsx`

- [ ] **Step 1: Create CategoryCard component**

Create `src/components/categories/CategoryCard.tsx`:
- Props: `categoryName: string`, `types: CategoryTemplate[]`, `isSystem: boolean`, `onEditType`, `onDeleteType`, `onAddType`, `onDuplicate`
- Uses shadcn `Collapsible` (or `Accordion`) to expand/collapse
- Header shows: category name, type count badge, system badge (if `is_system`), action buttons
- System templates: show "Duplicate as Custom" button (copy icon)
- Custom templates: show Edit and Delete buttons
- Expanded content: renders `TypeCard` for each type in the category
- Footer: "+ Add Type" button (custom categories only)

- [ ] **Step 2: Create TypeCard component**

Create `src/components/categories/TypeCard.tsx`:
- Props: `template: CategoryTemplate`, `isSystem: boolean`, `onEdit`, `onDelete`
- Displays: type name, specifications as chips/tags (key names), options as chips/tags (option names)
- Specifications shown with a wrench icon prefix, options with a palette icon prefix
- If system: read-only appearance, no edit/delete buttons
- If custom: Edit and Delete icon buttons

- [ ] **Step 3: Wire into Categories page**

Update `src/pages/Categories.tsx` to render `CategoryCard` components from the fetched data, grouped by `category_name`.

- [ ] **Step 4: Verify**

Run `npm run dev`. Navigate to `/categories`. Should see all 13 seeded categories as collapsible cards, each with their types listed. Expanding a category should show type cards with spec/option chips.

- [ ] **Step 5: Commit**

```bash
git add src/components/categories/CategoryCard.tsx src/components/categories/TypeCard.tsx src/pages/Categories.tsx
git commit -m "feat: add CategoryCard and TypeCard components for categories page"
```

---

### Task 7: Category & Type Editor Modals

**Files:**
- Create: `src/components/categories/CategoryEditorModal.tsx`
- Create: `src/components/categories/TypeEditorModal.tsx`
- Create: `src/components/categories/SpecificationEditor.tsx`
- Create: `src/components/categories/OptionEditor.tsx`

- [ ] **Step 1: Create SpecificationEditor component**

Create `src/components/categories/SpecificationEditor.tsx`:
- Props: `specs: SpecTemplate[]`, `onChange: (specs: SpecTemplate[]) => void`
- Where `SpecTemplate = { key: string, label: string, unit: string | null, common_values: string[] | null }`
- Renders a list of specification rows, each with:
  - Key input (text, snake_case)
  - Label input (text, human-readable)
  - Unit input (optional text, e.g., "grams", "mAh")
  - Common values: use `TagInput` component from existing codebase for multi-value entry
  - Delete button per row
- "Add Specification" button at bottom
- Drag-to-reorder using `@dnd-kit` (already installed)

- [ ] **Step 2: Create OptionEditor component**

Create `src/components/categories/OptionEditor.tsx`:
- Props: `options: OptionTemplate[]`, `onChange: (options: OptionTemplate[]) => void`
- Where `OptionTemplate = { name: string, common_values: string[] }`
- Similar to SpecificationEditor but simpler: just name + common values per row
- "Add Option" button at bottom

- [ ] **Step 3: Create CategoryEditorModal**

Create `src/components/categories/CategoryEditorModal.tsx`:
- Props: `open`, `onClose`, `categoryName?: string` (null for new, string for edit), `onSave`
- Simple modal with a single "Category Name" text input
- Save button inserts/updates via Supabase
- For new categories: just saves the name (types added separately)

- [ ] **Step 4: Create TypeEditorModal**

Create `src/components/categories/TypeEditorModal.tsx`:
- Props: `open`, `onClose`, `categoryName: string`, `template?: CategoryTemplate` (null for new), `onSave`
- Modal with:
  - Type Name input
  - `SpecificationEditor` for default specifications
  - `OptionEditor` for default options
- Save button upserts to `category_templates` table with `is_system = false`, `user_id = auth.uid()`

- [ ] **Step 5: Wire modals into Categories page**

Update `src/pages/Categories.tsx` to:
- Open `CategoryEditorModal` when "Add Category" button clicked
- Open `TypeEditorModal` when "Add Type" or "Edit" on a type is clicked
- Handle "Duplicate as Custom" by copying system template data into a new custom template
- Handle delete with confirmation dialog
- Refresh data after any mutation

- [ ] **Step 6: Verify**

Run `npm run dev`. Test:
- Create a custom category with a custom type
- Add specifications and options to the type
- Duplicate a system template as custom
- Edit and delete custom templates
- Verify system templates are read-only

- [ ] **Step 7: Commit**

```bash
git add src/components/categories/ src/pages/Categories.tsx
git commit -m "feat: category & type editor modals with spec/option editors"
```

---

## Chunk 3: Image Analysis in Edge Functions

### Task 8: Image Fetching Helpers

**Files:**
- Modify: `supabase/functions/ai-product-classifier/index.ts`

- [ ] **Step 1: Add `fetchImageAsBase64` helper**

Add at the top of `supabase/functions/ai-product-classifier/index.ts`:

```typescript
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 4 * 1024 * 1024) return null; // 4MB limit

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 4 * 1024 * 1024) return null;

    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { data: base64, mimeType };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Add `getPostMedia` helper**

```typescript
async function getPostMedia(
  post: { media_url?: string; thumbnail_url?: string; media_type?: string; id?: string },
  accessToken?: string
): Promise<Array<{ inline_data: { mime_type: string; data: string } }>> {
  const parts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

  if (post.media_type === 'VIDEO') {
    if (post.thumbnail_url) {
      const img = await fetchImageAsBase64(post.thumbnail_url);
      if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    }
  } else if (post.media_type === 'CAROUSEL_ALBUM' && post.id && accessToken) {
    try {
      const childrenRes = await fetch(
        `https://graph.instagram.com/${post.id}/children?fields=id,media_url,media_type,thumbnail_url&access_token=${accessToken}`
      );
      const children = await childrenRes.json();
      const items = (children.data || []).slice(0, 3);
      for (const child of items) {
        const url = child.media_type === 'VIDEO' ? child.thumbnail_url : child.media_url;
        if (url) {
          const img = await fetchImageAsBase64(url);
          if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
        }
      }
    } catch { /* graceful degradation */ }
  } else if (post.media_url) {
    const img = await fetchImageAsBase64(post.media_url);
    if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }

  return parts;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-product-classifier/index.ts
git commit -m "feat: add fetchImageAsBase64 and getPostMedia helpers for Gemini Vision"
```

---

### Task 9: Caption Quality Heuristic & Gemini Model Selector

**Files:**
- Modify: `supabase/functions/ai-product-classifier/index.ts`

- [ ] **Step 1: Add `isCaptionInsufficient` function**

```typescript
function isCaptionInsufficient(caption: string | null): boolean {
  if (!caption || caption.trim().length === 0) return true;
  if (caption.trim().length < 20) return true;

  const words = caption.trim().split(/\s+/);
  if (words.every(w => w.startsWith('#'))) return true;

  if (!/[a-zA-Z0-9]/.test(caption)) return true;

  const pricePattern = /\b(ALL|EUR|USD|GBP|Lek|Leke)\b|\d+[\.,]?\d*\s?(ALL|EUR|USD|GBP|€|\$)/i;
  if (!pricePattern.test(caption)) return true;

  return false;
}
```

- [ ] **Step 2: Add tiered model selector**

Replace the hardcoded `GEMINI_PRO_API_URL` with:

```typescript
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

function getGeminiUrl(model: 'flash' | 'pro' = 'flash'): string {
  const modelId = model === 'flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
}
```

Update all existing `fetch(GEMINI_PRO_API_URL, ...)` calls to use `fetch(getGeminiUrl('flash'), ...)`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-product-classifier/index.ts
git commit -m "feat: add caption quality heuristic and tiered Flash/Pro model selector"
```

---

### Task 10: Integrate Image Analysis into Gemini Calls

**Files:**
- Modify: `supabase/functions/ai-product-classifier/index.ts`

- [ ] **Step 1: Modify the Gemini call to accept image parts**

Find the section where the Gemini API is called (the `fetch` call with `contents`). Modify it to:

1. Accept an optional `imageParts` parameter
2. When images are included, append the image analysis prompt addition (spec section 2.5)
3. Include image parts in the `contents.parts` array

```typescript
// Build request parts
const requestParts: any[] = [{ text: promptText }];

if (imageParts && imageParts.length > 0) {
  requestParts[0].text += `\n\nIMPORTANT: The caption for this post is insufficient or missing. Product images have been provided.\nAnalyze the images carefully to identify:\n- The product(s) shown (name, type, brand if visible)\n- Visual attributes (color, material, condition)\n- Any text visible in the image (price tags, labels, brand names)\n- Product category based on visual appearance\nCombine image analysis with any caption text available to produce the most accurate product details.`;
  requestParts.push(...imageParts);
}
```

- [ ] **Step 2: Add retry logic for insufficient AI responses**

After the Gemini response is parsed, add the fallback retry:

```typescript
// After parsing analysis from Gemini response
const needsImageRetry = !usedImages && (
  (analysis.isProductPost === false && post.media_url) ||
  (analysis.isProductPost === true && (!analysis.productName || analysis.price === null))
);

if (needsImageRetry) {
  const imageParts = await getPostMedia(post, accessToken);
  if (imageParts.length > 0) {
    // Retry with images using same prompt + image parts
    // ... second Gemini call with imageParts
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-product-classifier/index.ts
git commit -m "feat: integrate Gemini Vision — image analysis for insufficient captions with retry"
```

---

### Task 11: Update Background Sync for Image Analysis

**Files:**
- Modify: `supabase/functions/background-sync/index.ts`

- [ ] **Step 1: Replace caption skip with heuristic check**

Find the `if (!post.caption)` early return (line ~317) and replace with:

```typescript
// Old: if (!post.caption) { summary.skipped++; ... continue; }
// New: allow captionless posts to proceed to image analysis
const captionInsufficient = isCaptionInsufficient(post.caption);
```

Copy the `isCaptionInsufficient` function into this file (or extract to a shared module).

- [ ] **Step 2: Pass image analysis flag to classifier**

When calling `ai-product-classifier`, include the `captionInsufficient` flag and post media info so the classifier knows to fetch images:

```typescript
const { data: analysisData } = await supabaseAdmin.functions.invoke('ai-product-classifier', {
  body: {
    caption: post.caption,
    user_id: user.id,
    include_images: captionInsufficient,
    post_media: {
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
      media_type: post.media_type,
      post_id: post.id
    },
    access_token: integration.access_token
  }
});
```

Update `ai-product-classifier` to accept and use these new body fields.

- [ ] **Step 3: Verify**

Deploy the updated edge functions. Test with:
1. A post with a full caption — should analyze caption only
2. A post with a short/empty caption — should include images in analysis
3. A post where caption analysis fails — should retry with images

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/background-sync/index.ts supabase/functions/ai-product-classifier/index.ts
git commit -m "feat: background sync uses image analysis for insufficient captions"
```

---

## Chunk 4: Spec Waterfall & Global Intelligence

### Task 12: Heuristic Pre-Filter

**Files:**
- Create: `supabase/functions/_shared/heuristics.ts`

- [ ] **Step 1: Create shared heuristic utilities**

Create `supabase/functions/_shared/heuristics.ts` with the following functions from the spec:

```typescript
export function extractProductName(caption: string | null): string | null {
  if (!caption) return null;
  const lines = caption.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const cleaned = line.replace(/#\S+/g, '').replace(/[^\w\s\-&.'\/]/g, '').trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return null;
}

export function normalizeProductName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\b(the|a|an)\b/g, '')
    .trim();
}

export function isCaptionInsufficient(caption: string | null): boolean {
  // ... (same as Task 9 Step 1)
}

export interface HeuristicResult {
  productName: string;
  price: number;
  currency: string;
  reference_code: string | null;
  inventory: number;
  confidence: 'heuristic';
}

export function heuristicParse(caption: string): HeuristicResult | null {
  const priceMatch = caption.match(/(\d+[\.,]?\d*)\s*(ALL|EUR|USD|GBP|Lek|€|\$)/i);
  const refMatch = caption.match(/ref\.?\s*code\s*:\s*([A-Za-z0-9\-]+)/i);
  const stockMatch = caption.match(/stock\s*:\s*(\d+)/i);
  const lines = caption.split('\n').filter(l => l.trim());
  const name = lines[0]?.replace(/#\S+/g, '').trim();

  if (!priceMatch || !name || name.length < 3) return null;

  const currencyMap: Record<string, string> = { '€': 'EUR', '$': 'USD' };
  const rawCurrency = priceMatch[2];
  const currency = currencyMap[rawCurrency] || rawCurrency.toUpperCase();

  return {
    productName: name,
    price: parseFloat(priceMatch[1].replace(',', '.')),
    currency,
    reference_code: refMatch?.[1] || null,
    inventory: stockMatch ? parseInt(stockMatch[1]) : 10,
    confidence: 'heuristic'
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/heuristics.ts
git commit -m "feat: shared heuristic utilities — name extraction, normalization, caption parsing"
```

---

### Task 13: Create `find-product-specs` Edge Function — Waterfall Core

**Files:**
- Create: `supabase/functions/find-product-specs/index.ts`

- [ ] **Step 1: Create the edge function scaffold**

Create `supabase/functions/find-product-specs/index.ts` with CORS handling and the main handler:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractProductName, normalizeProductName } from "../_shared/heuristics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { product_id, product_name, category, type, user_id, caption, media_urls, force_search } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalized = normalizeProductName(product_name);

    // Waterfall: L1 → L2 → L3 → L4
    let result;

    if (!force_search) {
      result = await checkGlobalIntelligence(supabaseAdmin, normalized);
      if (!result) result = await checkUserProductReuse(supabaseAdmin, user_id, product_name, product_id);
      if (!result) result = await checkCategoryTemplateDefaults(supabaseAdmin, category, type);
    }

    if (!result || result.source === 'template_default') {
      result = await searchWithGemini(supabaseAdmin, { product_name, category, type, caption, media_urls, normalized }, result);
    }

    // Write specs to product_specifications table
    if (result?.specifications?.length > 0 && product_id) {
      await writeSpecifications(supabaseAdmin, product_id, user_id, result.specifications);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

- [ ] **Step 2: Implement Level 1 — Global Product Intelligence lookup**

```typescript
async function checkGlobalIntelligence(supabase: any, normalizedName: string) {
  // Exact match first
  let { data } = await supabase
    .from('global_product_intelligence')
    .select('*')
    .eq('normalized_name', normalizedName)
    .order('confidence', { ascending: false })
    .limit(1)
    .single();

  // Fuzzy match fallback (using RPC for pg_trgm)
  if (!data) {
    const { data: fuzzy } = await supabase.rpc('find_similar_product', {
      search_name: normalizedName,
      min_similarity: 0.6
    });
    if (fuzzy?.length > 0) data = fuzzy[0];
  }

  if (data && data.confidence >= 0.7) {
    // Increment reuse count
    await supabase
      .from('global_product_intelligence')
      .update({ reuse_count: (data.reuse_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      category_name: data.category_name,
      type_name: data.type_name,
      description: data.description,
      tags: data.tags,
      specifications: data.specifications,
      options: data.options,
      source: 'global_intelligence' as const,
      cost: { grounding_used: false, tokens_used: 0, model_used: 'none' as const }
    };
  }
  return null;
}
```

Also create the PostgreSQL function for fuzzy matching. Add to `supabase/recreate_db.sql`:

```sql
CREATE OR REPLACE FUNCTION find_similar_product(search_name text, min_similarity float)
RETURNS SETOF global_product_intelligence AS $$
  SELECT * FROM global_product_intelligence
  WHERE normalized_name % search_name
    AND similarity(normalized_name, search_name) > min_similarity
  ORDER BY similarity(normalized_name, search_name) DESC
  LIMIT 1;
$$ LANGUAGE sql;
```

- [ ] **Step 3: Implement Level 2 — User Product Reuse**

```typescript
async function checkUserProductReuse(supabase: any, userId: string, productName: string, currentProductId?: string) {
  const { data: matches } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('user_id', userId)
    .neq('id', currentProductId || '')
    .or(`name.ilike.%${productName}%`)
    .limit(3);

  if (!matches?.length) return null;

  for (const match of matches) {
    const { data: specs } = await supabase
      .from('product_specifications')
      .select('key, value, unit')
      .eq('product_id', match.id);

    if (specs?.length > 0) {
      const { data: options } = await supabase
        .from('product_options')
        .select('name, option_values(value)')
        .eq('product_id', match.id);

      const formattedOptions = options?.map((o: any) => ({
        name: o.name,
        common_values: o.option_values?.map((v: any) => v.value) || []
      })) || [];

      // Also populate global intelligence for future users
      const normalized = normalizeProductName(match.name);
      await supabase.from('global_product_intelligence').upsert({
        normalized_name: normalized,
        category_name: match.category || 'Uncategorized',
        type_name: 'General',
        specifications: specs,
        options: formattedOptions,
        source: 'user_reuse',
        confidence: 0.75
      }, { onConflict: 'normalized_name,category_name,type_name' });

      return {
        category_name: match.category,
        type_name: null,
        specifications: specs,
        options: formattedOptions,
        source: 'user_reuse' as const,
        cost: { grounding_used: false, tokens_used: 0, model_used: 'none' as const }
      };
    }
  }
  return null;
}
```

- [ ] **Step 4: Implement Level 3 — Category Template Defaults**

```typescript
async function checkCategoryTemplateDefaults(supabase: any, category?: string, type?: string) {
  if (!category || !type) return null;

  const { data: template } = await supabase
    .from('category_templates')
    .select('*')
    .eq('category_name', category)
    .eq('type_name', type)
    .order('is_system', { ascending: true }) // user custom first
    .limit(1)
    .single();

  if (!template) return null;

  const specs = (template.default_specifications || []).map((s: any, i: number) => ({
    key: s.key,
    value: s.common_values?.[0] || '',
    unit: s.unit || null,
  })).filter((s: any) => s.value);

  const filledCount = specs.filter((s: any) => s.value).length;
  const totalCount = (template.default_specifications || []).length;
  const isSufficient = totalCount > 0 && filledCount / totalCount >= 0.8;

  return {
    category_name: category,
    type_name: type,
    specifications: specs,
    options: template.default_options || [],
    source: 'template_default' as const,
    _sufficient: isSufficient,
    cost: { grounding_used: false, tokens_used: 0, model_used: 'none' as const }
  };
}
```

- [ ] **Step 5: Implement Level 4 — Gemini Flash with Dynamic Retrieval**

```typescript
async function searchWithGemini(
  supabase: any,
  context: { product_name: string; category?: string; type?: string; caption?: string; media_urls?: string[]; normalized: string },
  templateResult?: any
) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const knownSpecs = templateResult?.specifications?.map((s: any) => `${s.key}: ${s.value}`).join('\n') || 'None';

  const prompt = `Find the exact specifications for this product.

Product name: ${context.product_name}
${context.category ? `Category: ${context.category}` : ''}
${context.type ? `Type: ${context.type}` : ''}
${context.caption ? `Caption/description: ${context.caption}` : ''}
Already known specs: ${knownSpecs}

Fill in accurate values for each specification. Use Google Search ONLY if needed.
Return JSON: {"specifications": [{"key": "...", "value": "...", "unit": "..."}], "options": [{"name": "...", "common_values": ["..."]}], "description": "...", "tags": ["..."], "category_name": "...", "type_name": "..."}`;

  const requestBody: any = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    tool_config: {
      google_search_retrieval: {
        dynamic_retrieval_config: { mode: "MODE_DYNAMIC", dynamic_threshold: 0.5 }
      }
    },
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const geminiData = await response.json();
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return templateResult || null;

  const analysis = JSON.parse(text);
  const groundingUsed = geminiData.candidates?.[0]?.groundingMetadata?.searchEntryPoint != null;

  // Populate global intelligence cache
  await supabase.from('global_product_intelligence').upsert({
    normalized_name: context.normalized,
    category_name: analysis.category_name || context.category || 'Uncategorized',
    type_name: analysis.type_name || context.type || 'General',
    description: analysis.description,
    tags: analysis.tags || [],
    specifications: analysis.specifications || [],
    options: analysis.options || [],
    source: 'ai_classified',
    confidence: groundingUsed ? 0.9 : 0.8
  }, { onConflict: 'normalized_name,category_name,type_name' });

  return {
    category_name: analysis.category_name || context.category,
    type_name: analysis.type_name || context.type,
    description: analysis.description,
    tags: analysis.tags,
    specifications: analysis.specifications || [],
    options: analysis.options || [],
    source: 'google_search' as const,
    cost: {
      grounding_used: groundingUsed,
      tokens_used: geminiData.usageMetadata?.totalTokenCount || 0,
      model_used: 'flash' as const
    }
  };
}
```

- [ ] **Step 6: Implement `writeSpecifications` helper**

```typescript
async function writeSpecifications(supabase: any, productId: string, userId: string, specs: any[]) {
  const rows = specs.map((s: any, i: number) => ({
    product_id: productId,
    user_id: userId,
    key: s.key,
    value: String(s.value),
    unit: s.unit || null,
    display_order: i
  }));

  for (const row of rows) {
    await supabase.from('product_specifications').upsert(row, {
      onConflict: 'product_id,key'
    });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/find-product-specs/ supabase/recreate_db.sql
git commit -m "feat: find-product-specs edge function with 4-level waterfall and global intelligence"
```

---

### Task 14: Integrate Waterfall into Background Sync

**Files:**
- Modify: `supabase/functions/background-sync/index.ts`

- [ ] **Step 1: Add heuristic pre-filter before AI classification**

At the start of the post processing loop, before calling `ai-product-classifier`:

```typescript
import { extractProductName, normalizeProductName, heuristicParse } from "../_shared/heuristics.ts";

// Try heuristic first
const heuristicResult = heuristicParse(post.caption || '');
const extractedName = extractProductName(post.caption);

if (heuristicResult && extractedName) {
  // Check global intelligence with extracted name
  const normalized = normalizeProductName(extractedName);
  const { data: globalMatch } = await supabaseAdmin
    .from('global_product_intelligence')
    .select('*')
    .eq('normalized_name', normalized)
    .gte('confidence', 0.7)
    .limit(1)
    .single();

  if (globalMatch) {
    // Skip AI entirely — use cached intelligence + heuristic price/inventory
    // Create product with globalMatch.category, specs, options + heuristicResult.price
    summary.cache_hits++;
    continue; // to next post
  }
}
```

- [ ] **Step 2: After product creation, call `find-product-specs` waterfall**

After a product is created/upserted by the sync, run the spec waterfall:

```typescript
// After product upsert
if (createdProduct?.id) {
  await supabaseAdmin.functions.invoke('find-product-specs', {
    body: {
      product_id: createdProduct.id,
      product_name: createdProduct.name,
      category: createdProduct.category,
      type: analysis?.typeName,
      user_id: user.id,
      caption: post.caption,
      media_urls: post.media_url ? [post.media_url] : []
    }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/background-sync/index.ts
git commit -m "feat: integrate heuristic pre-filter and spec waterfall into background sync"
```

---

## Chunk 5: Frontend Integration

### Task 15: Update Product Editor to Use `product_specifications` Table

**Files:**
- Modify: `src/components/product-detail/ProductEditMode.tsx`
- Modify: `src/components/product-detail/ProductEditor.tsx`

- [ ] **Step 1: Fetch specs from `product_specifications` in ProductEditor**

In `ProductEditor.tsx`, after fetching the product, also fetch its specifications:

```typescript
const { data: specs } = await supabase
  .from('product_specifications')
  .select('*')
  .eq('product_id', product.id)
  .order('display_order');
```

Pass `specs` as a prop to `ProductEditMode`.

- [ ] **Step 2: Display specs in ProductEditMode**

Replace the current `details` JSONB display with a structured specifications table/list. Each spec shows: key (label), value, unit. Allow inline editing of values.

- [ ] **Step 3: Update `handleReanalyze` to call `find-product-specs`**

In `ProductEditMode.tsx`, update the "Find specs with AI" button handler:

```typescript
const handleFindSpecs = async () => {
  setIsReanalyzing(true);
  showSuccess("Finding specs with AI...");

  const { data, error } = await supabase.functions.invoke('find-product-specs', {
    body: {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      type: product.details?.type,
      user_id: session.user.id,
      caption: product.caption,
      media_urls: product.media_url ? [product.media_url] : [],
      force_search: false
    }
  });

  if (data?.specifications) {
    // Refresh specs from table
    const { data: refreshedSpecs } = await supabase
      .from('product_specifications')
      .select('*')
      .eq('product_id', product.id)
      .order('display_order');

    setSpecs(refreshedSpecs || []);
    showSuccess(`Found ${data.specifications.length} specifications (source: ${data.source})`);
  }

  setIsReanalyzing(false);
};
```

- [ ] **Step 4: Commit**

```bash
git add src/components/product-detail/ProductEditMode.tsx src/components/product-detail/ProductEditor.tsx
git commit -m "feat: product editor reads/writes product_specifications table, Find Specs calls waterfall"
```

---

### Task 16: Update Storefront Product Detail

**Files:**
- Modify: `src/components/storefront/StorefrontProductDetail.tsx`

- [ ] **Step 1: Fetch and display specs from `product_specifications`**

In the storefront product detail page, fetch specifications:

```typescript
const { data: specs } = await supabase
  .from('product_specifications')
  .select('key, value, unit')
  .eq('product_id', product.id)
  .order('display_order');
```

Render as a specifications table in the product detail view:
```tsx
{specs && specs.length > 0 && (
  <div className="space-y-2">
    <h3 className="font-semibold">Specifications</h3>
    <div className="grid grid-cols-2 gap-2">
      {specs.map((spec) => (
        <div key={spec.key} className="flex justify-between border-b pb-1">
          <span className="text-muted-foreground capitalize">{spec.key.replace(/_/g, ' ')}</span>
          <span>{spec.value}{spec.unit ? ` ${spec.unit}` : ''}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/StorefrontProductDetail.tsx
git commit -m "feat: storefront product detail displays specs from product_specifications table"
```

---

### Task 17: Update AI Prompt for Structured Spec Output

**Files:**
- Modify: `supabase/functions/ai-product-classifier/index.ts`

- [ ] **Step 1: Update the classifier prompt to enforce spec/option distinction**

Find the `getClassifierPrompt()` function. Update the prompt to:

1. Clearly distinguish specifications (fixed) vs options (customer-selectable)
2. Return specs as an array of `{key, value, unit}` objects instead of a flat object
3. Reference category templates when available

Add to the prompt:
```
CRITICAL DISTINCTION:
- SPECIFICATIONS are fixed product attributes that describe what the product IS. The customer CANNOT change these.
  Examples: material, processor, screen_size, battery_mah, weight, dimensions
  Return as: "specifications": [{"key": "material", "value": "Cotton", "unit": null}, ...]

- OPTIONS are attributes the customer CHOOSES when purchasing. These create variant combinations.
  Examples: color, size, storage capacity, RAM amount
  Return as before: "options": {"Size": [{"value": "M", "price_difference": 0, "inventory": 10}], ...}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/ai-product-classifier/index.ts
git commit -m "feat: update AI prompt to enforce specs vs options distinction with structured output"
```

---

### Task 18: Final Integration — Update `upsert-combo-from-analysis`

**Files:**
- Modify: `supabase/functions/upsert-combo-from-analysis/index.ts`

- [ ] **Step 1: Write specs to `product_specifications` table for combo items**

After creating each combo item product, write its specifications to the new table:

```typescript
// After product upsert for each combo item
if (analysis.specifications && createdProduct?.id) {
  for (let i = 0; i < analysis.specifications.length; i++) {
    const spec = analysis.specifications[i];
    await supabaseAdmin.from('product_specifications').upsert({
      product_id: createdProduct.id,
      user_id: userId,
      key: typeof spec === 'object' ? spec.key : spec,
      value: typeof spec === 'object' ? String(spec.value) : '',
      unit: typeof spec === 'object' ? spec.unit : null,
      display_order: i
    }, { onConflict: 'product_id,key' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/upsert-combo-from-analysis/index.ts
git commit -m "feat: upsert-combo writes specs to product_specifications table"
```

---

## Chunk 6: Verification & Cleanup

### Task 19: End-to-End Verification

- [ ] **Step 1: Verify radius fix**

1. Go to Settings > Appearance
2. Adjust corner radius slider
3. Verify all UI elements update
4. Navigate to Instagram shop and back
5. Verify radius setting persists

- [ ] **Step 2: Verify category management**

1. Go to /categories
2. Verify 13 system categories with ~65 types are visible
3. Create a custom category with a custom type
4. Add specs and options to the type
5. Duplicate a system template as custom
6. Delete a custom template

- [ ] **Step 3: Verify image analysis**

1. Import an Instagram post with a short/empty caption
2. Verify the sync processes it with image analysis (check sync widget for "Analyzing images...")
3. Verify the product is created with reasonable details extracted from the image

- [ ] **Step 4: Verify spec waterfall**

1. Create a product (e.g., "iPhone 16 Pro")
2. Click "Find specs with AI"
3. Verify specs are populated in the product editor
4. Check `product_specifications` table in Supabase dashboard
5. Check `global_product_intelligence` table — should have an entry
6. Create another product with the same name — should reuse specs instantly (source: global_intelligence)

- [ ] **Step 5: Verify storefront**

1. Navigate to public storefront for a product with specs
2. Verify specifications table is displayed on product detail page

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end verification complete for universal products & image analysis"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| **Chunk 1: Foundation** | Tasks 1-4 | Radius fix, 3 new DB tables, seed data, migration |
| **Chunk 2: Categories Page** | Tasks 5-7 | `/categories` route, CategoryCard, TypeCard, editor modals |
| **Chunk 3: Image Analysis** | Tasks 8-11 | Gemini Vision helpers, caption heuristic, background sync integration |
| **Chunk 4: Spec Waterfall** | Tasks 12-14 | Heuristic parser, `find-product-specs` with 4-level waterfall, sync integration |
| **Chunk 5: Frontend** | Tasks 15-18 | Product editor, storefront, AI prompt update, combo integration |
| **Chunk 6: Verification** | Task 19 | End-to-end testing of all features |
