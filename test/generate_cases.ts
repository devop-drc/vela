/**
 * Generates the Instagram→Product extraction test matrix.
 *
 *   node test/generate_cases.ts
 *
 * Produces test/case_<id>_<scenario>/ folders, each containing:
 *   input.json               mock Instagram post payload (what background-sync
 *                            would hand to ai-product-classifier)
 *   expected_behavior.json   human-annotated baseline the runner asserts
 *   mock_model_response.json a CORRECT Gemini structured output for this case —
 *                            lets the runner exercise the deterministic tail
 *                            (normalizeAnalysis & co) without an API key
 *
 * Matrix: media (4) × products (3) × caption (4) = 48 cases, plus 8 hand-
 * crafted edge cases (49–56). Regenerating is idempotent — files are
 * overwritten in place, so tweak THIS script, not the folders.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/* ── axes ─────────────────────────────────────────────────────────────── */
type MediaKind = 'single_image' | 'carousel_images' | 'video_reel' | 'mixed_carousel';
type ProductKind = 'single' | 'multi' | 'variant';
type CaptionKind = 'none' | 'minimal' | 'noisy' | 'detailed';

const MEDIA: MediaKind[] = ['single_image', 'carousel_images', 'video_reel', 'mixed_carousel'];
const PRODUCTS: ProductKind[] = ['single', 'multi', 'variant'];
const CAPTIONS: CaptionKind[] = ['none', 'minimal', 'noisy', 'detailed'];

const IG_USER = 'dyqani.yt';
const TS = '2026-07-18T10:30:00+0000';
const cdn = (n: string) => `https://mock-cdn.test/vela/${n}.jpg`;

/* ── captions per (products × caption-type) ───────────────────────────── */
const CAPTION_TEXT: Record<ProductKind, Record<CaptionKind, string | null>> = {
  single: {
    none: null,
    minimal: '😍🔥',
    noisy: 'Dita e përsosur në Tiranë me shoqërinë! ☀️ Faleminderit të gjithëve për mbështetjen — ju duam shumë! #blessed #weekend #tirana',
    detailed: [
      "Fustan liri 'Vera' 👗",
      'Çmimi: 4500 Lekë',
      'Masat: S, M, L',
      'Ngjyra: e bardhë',
      'Material: 100% liri',
      'Porosit me DM ose në dyqan 📍Tiranë #fustane #verore',
    ].join('\n'),
  },
  multi: {
    none: null,
    minimal: '🔥🔥🛍️',
    noisy: 'Çfarë fundjave! Ne panair me ekipin — energji fantastike dhe shumë buzëqeshje 😊 #teamwork #panair2026',
    detailed: [
      'Produkte të reja në stok! 🛍️', // neutral header — "Oferta e javës" made the model (correctly) flag a promotion
      '',
      'Kufje Bluetooth X200',
      'Çmimi: 2500 ALL',
      'Stock: 15',
      '',
      'Kabllo USB-C 1m',
      'Çmimi: 500 ALL',
      'Stock: 40',
      '',
      'Mbajtëse telefoni për makinë',
      'Çmimi: 900 ALL',
      'Stock: 25',
    ].join('\n'),
  },
  variant: {
    none: null,
    minimal: '😍✨',
    noisy: 'Frymëzim i sotëm nga rrugët e Milanos 🇮🇹 Stili nuk blihet — jetohet! #fashioninspo #ootd',
    detailed: [
      'Bluzë pambuku premium 🧵',
      'Çmimi: 1800 Lekë',
      'Vjen në tre ngjyra: e zezë, e bardhë, bezhë',
      'Masat: S / M / L / XL',
      'Cilësi e lartë, prodhim Turqi',
    ].join('\n'),
  },
};

/* ── media builders ───────────────────────────────────────────────────── */
function buildMedia(kind: MediaKind, slug: string) {
  switch (kind) {
    case 'single_image':
      return { media_type: 'IMAGE', media_url: cdn(`${slug}-main`), thumbnail_url: null, children: undefined };
    case 'video_reel':
      return { media_type: 'VIDEO', media_url: `https://mock-cdn.test/vela/${slug}.mp4`, thumbnail_url: cdn(`${slug}-thumb`), children: undefined };
    case 'carousel_images':
      return {
        media_type: 'CAROUSEL_ALBUM', media_url: cdn(`${slug}-c0`), thumbnail_url: null,
        children: [0, 1, 2, 3].map((i) => ({ id: `${slug}-child-${i}`, media_type: 'IMAGE', media_url: cdn(`${slug}-c${i}`) })),
      };
    case 'mixed_carousel':
      return {
        media_type: 'CAROUSEL_ALBUM', media_url: cdn(`${slug}-m0`), thumbnail_url: null,
        children: [
          { id: `${slug}-mchild-0`, media_type: 'IMAGE', media_url: cdn(`${slug}-m0`) },
          { id: `${slug}-mchild-1`, media_type: 'VIDEO', media_url: `https://mock-cdn.test/vela/${slug}-m1.mp4`, thumbnail_url: cdn(`${slug}-m1-thumb`) },
          { id: `${slug}-mchild-2`, media_type: 'IMAGE', media_url: cdn(`${slug}-m2`) },
        ],
      };
  }
}

function expectedMediaSelection(kind: MediaKind) {
  switch (kind) {
    case 'single_image': return [{ index: 0, source: 'media_url' }];
    case 'video_reel': return [{ index: 0, source: 'thumbnail_url' }];
    case 'carousel_images': return [0, 1, 2].map((i) => ({ index: i, source: 'carousel_child' })); // 4th child dropped by design
    case 'mixed_carousel': return [0, 1, 2].map((i) => ({ index: i, source: 'carousel_child' }));
  }
}

/* ── expected classification + mock model output per case ────────────── */
function detailedExpectation(products: ProductKind) {
  if (products === 'single') {
    return {
      classification: { skip: false, is_product_post: true, is_multi: false, product_count: 1, pricing_type: 'one_time', is_sale_or_promotion: false },
      products: [{
        name_keywords_any: ['fustan', 'liri', 'vera', 'dress', 'linen'],
        price: 4500, currency: 'ALL',
        options_expect: { size: ['S', 'M', 'L'] },
        media_indices: [0],
      }],
    };
  }
  if (products === 'multi') {
    return {
      classification: { skip: false, is_product_post: true, is_multi: true, product_count: 3, pricing_type: 'one_time', is_sale_or_promotion: false },
      products: [
        { name_keywords_any: ['kufje', 'bluetooth', 'x200', 'headphone', 'earbud'], price: 2500, currency: 'ALL', inventory: 15, media_indices: [0] },
        { name_keywords_any: ['kabllo', 'usb', 'cable'], price: 500, currency: 'ALL', inventory: 40, media_indices: [1] },
        { name_keywords_any: ['mbajtëse', 'mbajtese', 'holder', 'telefoni', 'phone'], price: 900, currency: 'ALL', inventory: 25, media_indices: [2] },
      ],
    };
  }
  return { // variant
    classification: { skip: false, is_product_post: true, is_multi: false, product_count: 1, pricing_type: 'one_time', is_sale_or_promotion: false },
    products: [{
      name_keywords_any: ['bluzë', 'bluze', 'pambuku', 'shirt', 'cotton', 'top'],
      price: 1800, currency: 'ALL',
      options_expect: { color: ['e zezë', 'e bardhë', 'bezhë'], size: ['S', 'M', 'L', 'XL'] },
      media_indices: [0, 1, 2],
    }],
    variant_guard: 'Same garment in three colors — MUST be one product with options, never a products[] array.',
  };
}

function detailedMock(products: ProductKind) {
  if (products === 'single') {
    return {
      isProductPost: true, isSaleOrPromotion: false,
      productName: 'Vera Linen Dress', productNameSq: "Fustan liri 'Vera'",
      categoryName: 'Clothing & Apparel', typeName: 'Dresses',
      description: 'The Vera linen dress is a breezy summer staple cut from 100% natural linen. Its relaxed white silhouette keeps you cool while looking effortlessly polished. Available in three sizes for the perfect fit.',
      descriptionSq: "Fustani 'Vera' prej liri të pastër është zgjedhja ideale për verën. Silueta e bardhë e lirshme të mban freskët dhe elegante në çdo rast. Vjen në tre masa për një përshtatje të përsosur.",
      price: 4500, currency: 'ALL', inventory: 10, pricingType: 'one_time',
      tags: ['linen dress', 'summer fashion', 'women clothing'],
      specifications: [{ key: 'material', value: '100% linen', unit: null }, { key: 'color', value: 'White', unit: null }],
      options: [{ name: 'Size', values: [{ value: 'S' }, { value: 'M' }, { value: 'L' }] }],
    };
  }
  if (products === 'multi') {
    return {
      isProductPost: true, isSaleOrPromotion: false,
      products: [
        { productName: 'Kufje Bluetooth X200', price: 2500, currency: 'ALL', inventory: 15, specifications: [], options: [] },
        { productName: 'Kabllo USB-C 1m', price: 500, currency: 'ALL', inventory: 40, specifications: [{ key: 'length', value: '1', unit: 'm' }], options: [] },
        { productName: 'Mbajtëse telefoni për makinë', price: 900, currency: 'ALL', inventory: 25, specifications: [], options: [] },
      ],
    };
  }
  return { // variant
    isProductPost: true, isSaleOrPromotion: false,
    productName: 'Premium Cotton Blouse', productNameSq: 'Bluzë pambuku premium',
    categoryName: 'Clothing & Apparel', typeName: 'Blouses',
    description: 'A premium cotton blouse made in Turkey with exceptional attention to quality. The soft, breathable fabric drapes beautifully for both office and casual wear. Choose from three timeless colors and four sizes.',
    descriptionSq: 'Bluzë pambuku premium, e prodhuar në Turqi me cilësi të lartë. Pëlhura e butë dhe e ajrosur i përshtatet si veshjes zyrtare ashtu edhe asaj të përditshme. Zgjidh mes tre ngjyrave klasike dhe katër masave.',
    price: 1800, currency: 'ALL', inventory: 10, pricingType: 'one_time',
    tags: ['cotton blouse', 'women fashion', 'premium basics'],
    specifications: [{ key: 'material', value: '100% cotton', unit: null }, { key: 'origin', value: 'Turkey', unit: null }],
    options: [
      { name: 'Color', values: [{ value: 'e zezë' }, { value: 'e bardhë' }, { value: 'bezhë' }] },
      { name: 'Size', values: [{ value: 'S' }, { value: 'M' }, { value: 'L' }, { value: 'XL' }] },
    ],
  };
}

/* ── folder writer ────────────────────────────────────────────────────── */
let written = 0;
function writeCase(id: number, scenario: string, input: unknown, expected: unknown, mock: unknown) {
  const dir = path.join(ROOT, `case_${String(id).padStart(2, '0')}_${scenario}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'input.json'), JSON.stringify(input, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'expected_behavior.json'), JSON.stringify(expected, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'mock_model_response.json'), JSON.stringify(mock, null, 2) + '\n');
  written++;
}

/* ── the 48 matrix cases ──────────────────────────────────────────────── */
let id = 1;
for (const media of MEDIA) {
  for (const products of PRODUCTS) {
    for (const captionKind of CAPTIONS) {
      const slug = `${media}-${products}-${captionKind}`;
      const caption = CAPTION_TEXT[products][captionKind];
      const m = buildMedia(media, slug);
      const insufficient = captionKind !== 'detailed'; // none/minimal/noisy all lack a price signal
      const input = {
        post: {
          id: `mock_${slug}`,
          caption,
          media_type: m.media_type,
          media_url: m.media_url,
          thumbnail_url: m.thumbnail_url,
          ...(m.children ? { children: m.children } : {}),
          permalink: `https://www.instagram.com/p/mock_${id}/`,
          timestamp: TS,
          username: IG_USER,
        },
        user_context: { keywords: [], similar_products: [] },
        include_images: null,
      };

      let expected: any;
      let mock: any;
      if (captionKind === 'detailed') {
        const det = detailedExpectation(products);
        // Clamp annotated media mappings to what THIS media kind actually
        // provides (single image / video thumb = 1 slot; carousels = 3).
        const slots = expectedMediaSelection(media).length;
        for (const p of det.products) {
          if (Array.isArray((p as any).media_indices)) {
            (p as any).media_indices = [...new Set((p as any).media_indices.map((ix: number) => Math.min(ix, slots - 1)))];
          }
        }
        expected = {
          annotation: `${media} × ${products} × detailed caption — full extraction from caption; media only confirms.`,
          routing: { caption_insufficient: false, image_analysis_expected: false },
          media_selection: expectedMediaSelection(media),
          ...det,
          must_be_empty_or_zero: [],
          llm_checks: true,
        };
        mock = detailedMock(products);
      } else {
        const why = captionKind === 'none' ? 'no caption at all'
          : captionKind === 'minimal' ? 'emoji-only caption'
          : 'lifestyle caption with zero product info';
        expected = {
          annotation: `${media} × ${products} × ${captionKind} caption — ${why}: the caption alone cannot produce a product. The pipeline MUST route to image analysis (or flag _needsImageRetry) instead of inventing fields.`,
          routing: { caption_insufficient: true, image_analysis_expected: true },
          media_selection: expectedMediaSelection(media),
          classification: { skip_or_image_retry: true },
          products: [],
          must_be_empty_or_zero: ['price'],
          llm_checks: true,
        };
        // A well-behaved model, given no usable signal, declines:
        mock = { isProductPost: false };
      }
      writeCase(id, slug.replace(/-/g, '_'), input, expected, mock);
      id++;
    }
  }
}

/* ── edge cases 49–56 ─────────────────────────────────────────────────── */
const edge = (idNum: number, scenario: string, caption: string | null, mediaKind: MediaKind, expected: any, mock: any, extraPost: any = {}) => {
  const m = buildMedia(mediaKind, scenario);
  writeCase(idNum, scenario, {
    post: {
      id: `mock_${scenario}`, caption, media_type: m.media_type, media_url: m.media_url,
      thumbnail_url: m.thumbnail_url, ...(m.children ? { children: m.children } : {}),
      permalink: `https://www.instagram.com/p/mock_${idNum}/`, timestamp: TS, username: IG_USER, ...extraPost,
    },
    user_context: { keywords: [], similar_products: [] },
    include_images: null,
  }, { media_selection: expectedMediaSelection(mediaKind), ...expected }, mock);
};

edge(49, 'edge_missing_price_detailed',
  'Çantë lëkure punuar me dorë 👜\nLëkurë natyrale 100%\nNgjyra: kafe dhe e zezë\nPunim artizanal shqiptar\nPorosit me DM!',
  'single_image',
  {
    annotation: 'Rich caption but NO price anywhere — price must land as 0/null, never a hallucinated estimate.',
    routing: { caption_insufficient: true, image_analysis_expected: true },
    classification: { skip: false, is_product_post: true, is_multi: false, product_count: 1, pricing_type: 'one_time', is_sale_or_promotion: false },
    products: [{ name_keywords_any: ['çantë', 'cante', 'lëkure', 'lekure', 'bag', 'leather'], price: 0, currency: 'ALL', options_expect: { color: ['kafe', 'e zezë'] }, media_indices: [0] }],
    must_be_empty_or_zero: ['price'],
    llm_checks: true,
  },
  {
    isProductPost: true, productName: 'Handmade Leather Bag', productNameSq: 'Çantë lëkure punuar me dorë',
    categoryName: 'Bags & Luggage', typeName: 'Handbags',
    description: 'A handcrafted Albanian leather bag made from 100% natural leather. Each piece is artisan-made with meticulous attention to detail. Available in brown and black.',
    price: 0, currency: 'ALL', inventory: 10, pricingType: 'one_time',
    tags: ['leather bag', 'handmade', 'artisan'],
    specifications: [{ key: 'material', value: '100% natural leather', unit: null }],
    options: [{ name: 'Color', values: [{ value: 'kafe' }, { value: 'e zezë' }] }],
  });

edge(50, 'edge_mixed_currencies_multi',
  'Set dhuratash 🎁\n\nParfum francez 50ml\nÇmimi: 25 EUR\nStock: 8\n\nKrem duarsh me lavandë\nÇmimi: 700 ALL\nStock: 30',
  'carousel_images',
  {
    annotation: 'Two products, two DIFFERENT currencies in one caption — each item must keep its own currency; nothing may be silently unified.',
    routing: { caption_insufficient: false, image_analysis_expected: false },
    classification: { skip: false, is_product_post: true, is_multi: true, product_count: 2, pricing_type: 'one_time', is_sale_or_promotion: false },
    products: [
      { name_keywords_any: ['parfum', 'perfume'], price: 25, currency: 'EUR', inventory: 8, media_indices: [0] },
      { name_keywords_any: ['krem', 'cream', 'lavandë', 'lavender'], price: 700, currency: 'ALL', inventory: 30, media_indices: [1] },
    ],
    must_be_empty_or_zero: [],
    llm_checks: true,
  },
  {
    isProductPost: true,
    products: [
      { productName: 'Parfum francez 50ml', price: 25, currency: 'EUR', inventory: 8, specifications: [{ key: 'volume', value: '50', unit: 'ml' }], options: [] },
      { productName: 'Krem duarsh me lavandë', price: 700, currency: 'ALL', inventory: 30, specifications: [], options: [] },
    ],
  });

edge(51, 'edge_slang_price_20k_lek',
  'Atlete sportive të reja 🔥 vetëm 20k lek! Masa 40-45 në stok. Porosit tani, dërgesa falas mbi 5000L 🚚',
  'single_image',
  {
    annotation: 'Albanian slang price "20k lek" = 20,000 ALL. The "5000L" shipping threshold must NOT be mistaken for the product price.',
    routing: { caption_insufficient: false, image_analysis_expected: false },
    classification: { skip: false, is_product_post: true, is_multi: false, product_count: 1, pricing_type: 'one_time', is_sale_or_promotion: null },  // 'vetëm 20k'+'dërgesa falas' legitimately reads as a promo — don't assert the flag
    products: [{ name_keywords_any: ['atlete', 'sneaker', 'sport'], price: 20000, currency: 'ALL', options_expect: { size: ['40', '41', '42', '43', '44', '45'] }, media_indices: [0] }],
    must_be_empty_or_zero: [],
    llm_checks: true,
  },
  {
    isProductPost: true, productName: 'Sports Sneakers', productNameSq: 'Atlete sportive',
    categoryName: 'Clothing & Apparel', typeName: 'Sneakers',
    description: 'Fresh sports sneakers built for daily training and street wear. Durable construction with a comfortable fit across sizes 40 to 45. Free delivery on qualifying orders.',
    price: 20000, currency: 'ALL', inventory: 10, pricingType: 'one_time',
    tags: ['sneakers', 'sports shoes', 'footwear'],
    specifications: [],
    options: [{ name: 'Size', values: [{ value: '40' }, { value: '41' }, { value: '42' }, { value: '43' }, { value: '44' }, { value: '45' }] }],
  });

edge(52, 'edge_multi_caption_single_image',
  'Kompleti i zyres 🖥️\n\nTastierë mekanike RGB\nÇmimi: 6500 ALL\nStock: 5\n\nMaus gaming\nÇmimi: 3200 ALL\nStock: 12\n\nShumë produkte, një foto — shkruajna në DM për detaje!',
  'single_image',
  {
    annotation: 'Caption lists 2 products but there is only ONE image — extraction must still yield 2 products; media mapping degrades to the single available index.',
    routing: { caption_insufficient: false, image_analysis_expected: false },
    classification: { skip: false, is_product_post: true, is_multi: true, product_count: 2, pricing_type: 'one_time', is_sale_or_promotion: false },
    products: [
      { name_keywords_any: ['tastierë', 'tastiere', 'keyboard'], price: 6500, currency: 'ALL', inventory: 5, media_indices: [0] },
      { name_keywords_any: ['maus', 'mouse'], price: 3200, currency: 'ALL', inventory: 12, media_indices: [0] },
    ],
    must_be_empty_or_zero: [],
    llm_checks: true,
  },
  {
    isProductPost: true,
    products: [
      { productName: 'Tastierë mekanike RGB', price: 6500, currency: 'ALL', inventory: 5, specifications: [], options: [] },
      { productName: 'Maus gaming', price: 3200, currency: 'ALL', inventory: 12, specifications: [], options: [] },
    ],
  });

edge(53, 'edge_lifestyle_with_product_image',
  'Mëngjes i qetë me librin tim të preferuar dhe një filxhan kafe ☕📖 #morningvibes #slowliving',
  'single_image',
  {
    annotation: 'Pure lifestyle caption over what is actually a product photo — the caption alone must NOT produce a product; the pipeline routes to image analysis instead.',
    routing: { caption_insufficient: true, image_analysis_expected: true },
    classification: { skip_or_image_retry: true },
    products: [],
    must_be_empty_or_zero: ['price'],
    llm_checks: true,
  },
  { isProductPost: false });

edge(54, 'edge_subscription_service',
  'Abonim mujor stërvitje personale 💪\nÇmimi: 5000 lekë në muaj\nPlan individual + ndjekje javore\nVendet e limituara — shkruaj tani!',
  'video_reel',
  {
    annotation: 'Monthly personal-training subscription — pricingType must be "subscription" with billingInterval "month", not a one-time 5000 ALL product.',
    routing: { caption_insufficient: false, image_analysis_expected: false },
    classification: { skip: false, is_product_post: true, is_multi: false, product_count: 1, pricing_type: 'subscription', is_sale_or_promotion: false },
    products: [{ name_keywords_any: ['stërvitje', 'stervitje', 'training', 'abonim', 'coaching'], price: 5000, currency: 'ALL', media_indices: [0] }],
    must_be_empty_or_zero: [],
    llm_checks: true,
  },
  {
    isProductPost: true, productName: 'Monthly Personal Training Subscription', productNameSq: 'Abonim mujor stërvitje personale',
    categoryName: 'Services', typeName: 'Personal Training',
    description: 'A monthly personal training subscription with a fully individual plan and weekly follow-ups. Spots are limited to keep coaching quality high. Train with structure and real accountability.',
    price: 5000, currency: 'ALL', inventory: 10, pricingType: 'subscription', billingInterval: 'month',
    tags: ['personal training', 'fitness', 'subscription'],
    specifications: [], options: [],
  });

edge(55, 'edge_promotion_only',
  'SUPER OFERTË! 🎉 -20% në të gjitha artikujt këtë fundjavë!! Vetëm të shtunën dhe të dielën. Mos e humbisni! #sale #ofertë',
  'single_image',
  {
    annotation: 'Pure discount announcement with no specific product — must yield a promotion object, not a fake product named "SUPER OFERTË".',
    routing: { caption_insufficient: true, image_analysis_expected: true },
    classification: { skip: false, is_product_post: null, is_multi: false, product_count: 0, pricing_type: null, is_sale_or_promotion: true },  // model may keep a product wrapper around a sale — the promotion payload is what matters
    products: [],
    promotion_expect: { discount_type: 'percent', discount_value: 20 },
    must_be_empty_or_zero: [],
    llm_checks: true,
  },
  {
    isProductPost: false, isSaleOrPromotion: true,
    promotion: { title: 'Weekend Sale -20%', summary: '20% off all items this weekend only', discount_type: 'percent', discount_value: 20, currency: null, valid_until: null },
  });

edge(56, 'edge_emoji_plus_price_only',
  '🔥🔥 2500 L 🔥🔥',
  'mixed_carousel',
  {
    annotation: 'A price with zero product context — the number alone is not a product; pipeline must bring in the media (mixed carousel: image, video thumbnail, image).',
    routing: { caption_insufficient: true, image_analysis_expected: true },
    classification: { skip_or_image_retry: true },
    products: [],
    must_be_empty_or_zero: [],
    llm_checks: true,
  },
  { isProductPost: false });

console.log(`generated ${written} case folders in ${ROOT}`);
