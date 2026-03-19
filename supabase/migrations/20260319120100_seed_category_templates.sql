-- =============================================================================
-- seed_category_templates.sql
-- Project: InstantShop
-- Purpose: Seed system-level category templates (13 categories, ~65 types).
--          Each row defines expected specifications and options for a product
--          category/type pair. These are read-only reference templates used by
--          the AI classification pipeline and product creation forms.
--
-- All rows are system templates: is_system = true, user_id = NULL.
-- The file is idempotent: ON CONFLICT DO NOTHING guards repeated runs.
-- The unique index used for conflict detection is:
--   idx_category_templates_system ON (category_name, type_name) WHERE user_id IS NULL
-- =============================================================================

-- ============================================================
-- 1. Clothing & Apparel  (8 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'T-Shirts',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["100% Cotton","Polyester","Cotton Blend","Linen","Bamboo"]},
    {"key":"fit","label":"Fit","unit":null,"common_values":["Regular","Slim","Oversized","Relaxed"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"care_instructions","label":"Care Instructions","unit":null,"common_values":["Machine Wash Cold","Hand Wash","Dry Clean Only","Tumble Dry Low"]},
    {"key":"season","label":"Season","unit":null,"common_values":["Spring","Summer","Fall","Winter","All Season"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Hoodies & Sweatshirts',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Fleece","Cotton Blend","Polyester","French Terry","Sherpa"]},
    {"key":"fit","label":"Fit","unit":null,"common_values":["Regular","Slim","Oversized","Relaxed"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"weight_gsm","label":"Weight (GSM)","unit":"gsm","common_values":["280","320","350","400","450"]},
    {"key":"care_instructions","label":"Care Instructions","unit":null,"common_values":["Machine Wash Cold","Tumble Dry Low","Hand Wash","Do Not Bleach"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Pants & Jeans',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Denim","Cotton","Polyester","Chino","Linen","Wool Blend"]},
    {"key":"fit","label":"Fit","unit":null,"common_values":["Slim","Regular","Relaxed","Straight","Skinny","Wide Leg"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"rise","label":"Rise","unit":null,"common_values":["Low","Mid","High"]},
    {"key":"closure","label":"Closure","unit":null,"common_values":["Button","Zipper","Elastic","Drawstring"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Length","common_values":["28\"","30\"","32\"","34\"","36\""]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Dresses & Skirts',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Cotton","Polyester","Silk","Chiffon","Linen","Satin"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Women","Girls"]},
    {"key":"length","label":"Length","unit":null,"common_values":["Mini","Midi","Maxi","Knee Length","Above Knee"]},
    {"key":"occasion","label":"Occasion","unit":null,"common_values":["Casual","Formal","Party","Beach","Work","Wedding"]},
    {"key":"care_instructions","label":"Care Instructions","unit":null,"common_values":["Machine Wash Cold","Hand Wash","Dry Clean Only","Do Not Bleach"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Jackets & Coats',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Wool","Polyester","Down","Leather","Denim","Nylon"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"insulation","label":"Insulation","unit":null,"common_values":["Down","Synthetic","Fleece","None"]},
    {"key":"waterproof","label":"Waterproof","unit":null,"common_values":["Yes","No","Water Resistant"]},
    {"key":"season","label":"Season","unit":null,"common_values":["Spring","Summer","Fall","Winter","All Season"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Shoes & Sneakers',
  '[
    {"key":"upper_material","label":"Upper Material","unit":null,"common_values":["Leather","Suede","Canvas","Mesh","Synthetic"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"sole_material","label":"Sole Material","unit":null,"common_values":["Rubber","EVA","TPU","Leather","PU"]},
    {"key":"closure_type","label":"Closure Type","unit":null,"common_values":["Lace-Up","Slip-On","Velcro","Buckle","Zipper"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["36","37","38","39","40","41","42","43","44","45"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Underwear & Socks',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Cotton","Modal","Bamboo","Polyester","Nylon","Wool"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"pack_count","label":"Pack Count","unit":"pcs","common_values":["1","3","5","6","7","10"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Clothing & Apparel',
  'Accessories',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Cotton","Wool","Polyester","Leather","Acrylic","Silk"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"season","label":"Season","unit":null,"common_values":["Spring","Summer","Fall","Winter","All Season"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Electronics & Tech  (10 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Smartphones',
  '[
    {"key":"processor","label":"Processor","unit":null,"common_values":["Apple A17 Pro","Snapdragon 8 Gen 3","Dimensity 9300","Google Tensor G3"]},
    {"key":"gpu","label":"GPU","unit":null,"common_values":["Apple GPU","Adreno 750","Immortalis-G720","Immortalis-G715"]},
    {"key":"screen_size","label":"Screen Size","unit":"inches","common_values":["6.1","6.4","6.7","6.8","5.9"]},
    {"key":"resolution","label":"Resolution","unit":null,"common_values":["1080x2340","1440x3120","1290x2796","1080x2400"]},
    {"key":"battery_mah","label":"Battery Capacity","unit":"mAh","common_values":["3279","4000","4500","5000","4700"]},
    {"key":"os","label":"Operating System","unit":null,"common_values":["iOS","Android"]},
    {"key":"camera_mp","label":"Main Camera","unit":"MP","common_values":["12","48","50","200","108"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["170","187","195","206","228"]},
    {"key":"connectivity","label":"Connectivity","unit":null,"common_values":["5G","4G LTE","Wi-Fi 6E","Bluetooth 5.3"]}
  ]'::jsonb,
  '[
    {"name":"Storage","common_values":["64GB","128GB","256GB","512GB","1TB"]},
    {"name":"RAM","common_values":["4GB","6GB","8GB","12GB","16GB"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Laptops',
  '[
    {"key":"processor","label":"Processor","unit":null,"common_values":["Intel Core i5","Intel Core i7","AMD Ryzen 5","AMD Ryzen 7","Apple M3","Apple M3 Pro"]},
    {"key":"gpu","label":"GPU","unit":null,"common_values":["Integrated","NVIDIA RTX 3050","NVIDIA RTX 4060","AMD Radeon","Apple M3 GPU"]},
    {"key":"screen_size","label":"Screen Size","unit":"inches","common_values":["13","14","15.6","16","17.3"]},
    {"key":"resolution","label":"Resolution","unit":null,"common_values":["1920x1080","2560x1600","3840x2160","2560x1664"]},
    {"key":"battery_wh","label":"Battery Capacity","unit":"Wh","common_values":["40","56","72","86","100"]},
    {"key":"os","label":"Operating System","unit":null,"common_values":["Windows 11","macOS","Ubuntu","ChromeOS"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["1.2","1.4","1.6","1.8","2.0","2.4"]},
    {"key":"ports","label":"Ports","unit":null,"common_values":["USB-A","USB-C","HDMI","Thunderbolt 4","SD Card","3.5mm Audio"]}
  ]'::jsonb,
  '[
    {"name":"Storage","common_values":["256GB","512GB","1TB","2TB"]},
    {"name":"RAM","common_values":["8GB","16GB","32GB","64GB"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Tablets',
  '[
    {"key":"processor","label":"Processor","unit":null,"common_values":["Apple M2","Snapdragon 8 Gen 2","MediaTek Dimensity 9000","Unisoc T618"]},
    {"key":"screen_size","label":"Screen Size","unit":"inches","common_values":["8","10.2","10.9","11","12.9","13"]},
    {"key":"resolution","label":"Resolution","unit":null,"common_values":["1620x2160","1668x2388","2048x2732","1200x2000"]},
    {"key":"battery_mah","label":"Battery Capacity","unit":"mAh","common_values":["5124","7606","9720","10000","12000"]},
    {"key":"os","label":"Operating System","unit":null,"common_values":["iPadOS","Android","Windows"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["335","477","684","490","570"]},
    {"key":"connectivity","label":"Connectivity","unit":null,"common_values":["Wi-Fi","Wi-Fi + Cellular","5G","4G LTE","Bluetooth 5.3"]}
  ]'::jsonb,
  '[
    {"name":"Storage","common_values":["64GB","128GB","256GB","512GB","1TB"]},
    {"name":"RAM","common_values":["4GB","6GB","8GB","12GB","16GB"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Headphones & Earbuds',
  '[
    {"key":"driver_size","label":"Driver Size","unit":"mm","common_values":["6","8","10","12","40","50"]},
    {"key":"frequency_response","label":"Frequency Response","unit":"Hz","common_values":["20-20000","10-40000","20-40000","5-40000"]},
    {"key":"impedance","label":"Impedance","unit":"Ohm","common_values":["16","32","64","250","300"]},
    {"key":"battery_life","label":"Battery Life","unit":"hrs","common_values":["6","8","12","20","24","30"]},
    {"key":"noise_cancelling","label":"Noise Cancelling","unit":null,"common_values":["Active Noise Cancelling","Passive","None","Transparency Mode"]},
    {"key":"connectivity","label":"Connectivity","unit":null,"common_values":["Bluetooth 5.3","Wireless","Wired 3.5mm","USB-C","Multipoint"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Smartwatches',
  '[
    {"key":"processor","label":"Processor","unit":null,"common_values":["Apple S9","Snapdragon W5+","Exynos W930","MediaTek MT2601"]},
    {"key":"screen_size","label":"Screen Size","unit":"mm","common_values":["40","41","44","45","49"]},
    {"key":"battery_life","label":"Battery Life","unit":"days","common_values":["1","2","5","7","14","18"]},
    {"key":"water_resistance","label":"Water Resistance","unit":null,"common_values":["50M","100M","IP68","5ATM","10ATM"]},
    {"key":"os","label":"Operating System","unit":null,"common_values":["watchOS","Wear OS","Tizen","HarmonyOS","proprietary"]},
    {"key":"sensors","label":"Sensors","unit":null,"common_values":["Heart Rate","SpO2","GPS","Altimeter","ECG","Skin Temperature"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Band","common_values":["Silicone","Leather","Milanese Loop","Sport Loop","Metal Bracelet"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Cameras',
  '[
    {"key":"sensor_size","label":"Sensor Size","unit":null,"common_values":["Full Frame","APS-C","Micro Four Thirds","1-inch","1/2.3\""]},
    {"key":"megapixels","label":"Megapixels","unit":"MP","common_values":["12","20","24","36","45","61"]},
    {"key":"iso_range","label":"ISO Range","unit":null,"common_values":["100-6400","100-12800","100-51200","100-204800"]},
    {"key":"video_resolution","label":"Video Resolution","unit":null,"common_values":["1080p 60fps","4K 30fps","4K 60fps","8K 30fps"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["400","520","650","800","1000"]},
    {"key":"lens_mount","label":"Lens Mount","unit":null,"common_values":["Canon RF","Nikon Z","Sony E","Fuji X","L-Mount","MFT"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Kit","common_values":["Body Only","Kit with 18-55mm","Kit with 24-105mm","Twin Lens Kit"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Gaming Consoles',
  '[
    {"key":"processor","label":"Processor","unit":null,"common_values":["AMD Zen 2","AMD Zen 4","Custom NVIDIA Tegra","Intel Core"]},
    {"key":"gpu","label":"GPU","unit":null,"common_values":["AMD RDNA 2","AMD RDNA 3","NVIDIA","Custom"]},
    {"key":"storage","label":"Storage","unit":null,"common_values":["512GB SSD","1TB SSD","2TB SSD"]},
    {"key":"resolution_output","label":"Max Resolution","unit":null,"common_values":["1080p","4K","8K","720p handheld"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.4","1.0","3.2","3.9","4.5"]}
  ]'::jsonb,
  '[
    {"name":"Edition","common_values":["Standard","Digital","Disc","Pro","Slim","OLED"]},
    {"name":"Bundle","common_values":["Console Only","With Controller","Game Bundle","Accessories Bundle"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Computer Accessories',
  '[
    {"key":"connectivity","label":"Connectivity","unit":null,"common_values":["USB-A","USB-C","Bluetooth","Wireless 2.4GHz","Thunderbolt"]},
    {"key":"compatibility","label":"Compatibility","unit":null,"common_values":["Windows","macOS","Linux","Universal","Chrome OS"]},
    {"key":"dimensions","label":"Dimensions","unit":null,"common_values":["Compact","Full Size","Tenkeyless","60%"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["80","120","200","350","500"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Speakers',
  '[
    {"key":"driver_size","label":"Driver Size","unit":"inches","common_values":["2","3","4","5","6.5","8","10"]},
    {"key":"power_watts","label":"Power Output","unit":"W","common_values":["5","10","20","30","50","100"]},
    {"key":"battery_life","label":"Battery Life","unit":"hrs","common_values":["8","10","12","16","24","36"]},
    {"key":"connectivity","label":"Connectivity","unit":null,"common_values":["Bluetooth 5.3","Wi-Fi","AUX","USB","NFC"]},
    {"key":"water_resistance","label":"Water Resistance","unit":null,"common_values":["IPX4","IPX5","IPX7","IP67","IP68","None"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Electronics & Tech',
  'Power Banks & Chargers',
  '[
    {"key":"capacity_mah","label":"Capacity","unit":"mAh","common_values":["5000","10000","20000","26800","30000"]},
    {"key":"output_watts","label":"Max Output","unit":"W","common_values":["18","20","30","45","65","100","140"]},
    {"key":"ports","label":"Ports","unit":null,"common_values":["1x USB-A","2x USB-A","1x USB-C","2x USB-C","USB-A + USB-C"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["150","200","300","450","600"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Home & Living  (6 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Home & Living',
  'Furniture',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Solid Wood","MDF","Metal","Upholstered","Glass","Bamboo","Rattan"]},
    {"key":"dimensions","label":"Dimensions (L×W×H)","unit":"cm","common_values":["60×40×75","120×60×75","180×90×75","200×160×45"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["5","10","20","30","50","80"]},
    {"key":"weight_capacity","label":"Weight Capacity","unit":"kg","common_values":["50","100","120","150","200"]},
    {"key":"assembly_required","label":"Assembly Required","unit":null,"common_values":["Yes","No","Partial"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large","Custom"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Home & Living',
  'Decor',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Ceramic","Wood","Metal","Glass","Resin","Fabric","Stone"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["10×10×10","20×20×30","30×30×50","50×50×100"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.2","0.5","1","2","5"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Style","common_values":["Modern","Rustic","Bohemian","Minimalist","Industrial","Scandinavian"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Home & Living',
  'Kitchenware',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Stainless Steel","Cast Iron","Ceramic","Non-Stick","Glass","Silicone","Bamboo"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["10","20","24","28","30","32"]},
    {"key":"dishwasher_safe","label":"Dishwasher Safe","unit":null,"common_values":["Yes","No","Top Rack Only"]},
    {"key":"capacity","label":"Capacity","unit":"L","common_values":["0.5","1","1.5","2","3","5","8"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Home & Living',
  'Bedding & Textiles',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Cotton","Microfiber","Linen","Bamboo","Flannel","Silk","Polyester"]},
    {"key":"thread_count","label":"Thread Count","unit":"TC","common_values":["200","300","400","600","800","1000"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["90×200","120×200","140×200","160×200","180×200","200×200"]},
    {"key":"care_instructions","label":"Care Instructions","unit":null,"common_values":["Machine Wash 30°C","Machine Wash 40°C","Hand Wash","Dry Clean Only","Do Not Tumble Dry"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Single","Double","Queen","King","Super King"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Home & Living',
  'Lighting',
  '[
    {"key":"wattage","label":"Wattage","unit":"W","common_values":["5","7","9","12","15","40","60","100"]},
    {"key":"lumens","label":"Lumens","unit":"lm","common_values":["400","600","800","1100","1600","2000"]},
    {"key":"color_temperature","label":"Color Temperature","unit":"K","common_values":["2700","3000","4000","5000","6500"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["10","20","30","40","60"]},
    {"key":"bulb_type","label":"Bulb Type","unit":null,"common_values":["LED","Halogen","Incandescent","CFL","Smart LED"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Home & Living',
  'Storage & Organization',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Plastic","Metal","Wood","Fabric","Bamboo","Wicker"]},
    {"key":"dimensions","label":"Dimensions (L×W×H)","unit":"cm","common_values":["30×20×15","40×30×20","60×40×30","80×40×40"]},
    {"key":"weight_capacity","label":"Weight Capacity","unit":"kg","common_values":["5","10","15","20","30","50"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Beauty & Personal Care  (6 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Beauty & Personal Care',
  'Skincare',
  '[
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Hyaluronic Acid","Retinol","Vitamin C","Niacinamide","Salicylic Acid","Ceramides","SPF 30"]},
    {"key":"volume","label":"Volume","unit":"ml","common_values":["15","30","50","100","150","200","500"]},
    {"key":"skin_type","label":"Skin Type","unit":null,"common_values":["All Skin Types","Dry","Oily","Combination","Sensitive","Normal"]},
    {"key":"spf","label":"SPF","unit":null,"common_values":["None","SPF 15","SPF 30","SPF 50","SPF 50+"]},
    {"key":"cruelty_free","label":"Cruelty Free","unit":null,"common_values":["Yes","No","Leaping Bunny Certified","PETA Certified"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Travel (15ml)","Small (30ml)","Regular (50ml)","Large (100ml)","Family (200ml)"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Beauty & Personal Care',
  'Makeup',
  '[
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Mineral Pigments","Vitamin E","Aloe Vera","Hyaluronic Acid","Jojoba Oil"]},
    {"key":"finish","label":"Finish","unit":null,"common_values":["Matte","Dewy","Satin","Gloss","Shimmer","Natural"]},
    {"key":"coverage","label":"Coverage","unit":null,"common_values":["Sheer","Light","Medium","Full","Buildable"]},
    {"key":"cruelty_free","label":"Cruelty Free","unit":null,"common_values":["Yes","No","Leaping Bunny Certified","PETA Certified"]}
  ]'::jsonb,
  '[
    {"name":"Shade","common_values":["Fair","Light","Medium","Tan","Deep","Universal"]},
    {"name":"Size","common_values":["Mini","Regular","Full Size","Value Size"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Beauty & Personal Care',
  'Haircare',
  '[
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Keratin","Argan Oil","Biotin","Coconut Oil","Shea Butter","Panthenol"]},
    {"key":"volume","label":"Volume","unit":"ml","common_values":["100","200","250","300","400","500","1000"]},
    {"key":"hair_type","label":"Hair Type","unit":null,"common_values":["All Hair Types","Dry","Oily","Curly","Color-Treated","Fine","Thick"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Travel (100ml)","Small (200ml)","Regular (300ml)","Large (500ml)","Family (1000ml)"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Beauty & Personal Care',
  'Fragrances',
  '[
    {"key":"notes_top","label":"Top Notes","unit":null,"common_values":["Citrus","Bergamot","Lemon","Grapefruit","Apple","Pepper","Lavender"]},
    {"key":"notes_middle","label":"Middle Notes","unit":null,"common_values":["Rose","Jasmine","Iris","Geranium","Cardamom","Cinnamon","Violet"]},
    {"key":"notes_base","label":"Base Notes","unit":null,"common_values":["Sandalwood","Cedarwood","Musk","Amber","Vanilla","Patchouli","Vetiver"]},
    {"key":"concentration","label":"Concentration","unit":null,"common_values":["Eau de Cologne","Eau de Toilette","Eau de Parfum","Parfum/Extrait"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["30ml","50ml","75ml","100ml","150ml"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Beauty & Personal Care',
  'Nail Care',
  '[
    {"key":"finish","label":"Finish","unit":null,"common_values":["Glossy","Matte","Shimmer","Glitter","Satin","Chrome"]},
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Vegan Formula","Free of Formaldehyde","5-Free","10-Free","Biotin"]},
    {"key":"cruelty_free","label":"Cruelty Free","unit":null,"common_values":["Yes","No","PETA Certified","Leaping Bunny"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Beauty & Personal Care',
  'Tools & Devices',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Stainless Steel","Ceramic","Titanium","Plastic","Silicone"]},
    {"key":"power_source","label":"Power Source","unit":null,"common_values":["Battery","USB Rechargeable","AC Plug","Corded","Solar"]},
    {"key":"battery_life","label":"Battery Life","unit":"hrs","common_values":["1","2","4","8","12","24"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["50","100","200","350","500"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Art & Handmade  (6 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Art & Handmade',
  'Paintings',
  '[
    {"key":"medium","label":"Medium","unit":null,"common_values":["Oil","Acrylic","Watercolor","Gouache","Tempera","Mixed Media","Digital Print"]},
    {"key":"dimensions","label":"Dimensions (W×H)","unit":"cm","common_values":["20×30","30×40","40×60","60×80","80×100","100×120"]},
    {"key":"artist","label":"Artist","unit":null,"common_values":[]},
    {"key":"year","label":"Year Created","unit":null,"common_values":["2020","2021","2022","2023","2024","2025"]},
    {"key":"signed","label":"Signed by Artist","unit":null,"common_values":["Yes","No"]}
  ]'::jsonb,
  '[
    {"name":"Frame","common_values":["Unframed","Black Frame","White Frame","Natural Wood Frame","Gold Frame","Floating Frame"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Art & Handmade',
  'Prints & Posters',
  '[
    {"key":"print_method","label":"Print Method","unit":null,"common_values":["Giclée","Screen Print","Digital Print","Lithograph","Risograph","Offset Print"]},
    {"key":"paper_type","label":"Paper Type","unit":null,"common_values":["Matte","Glossy","Semi-Gloss","Fine Art","Cardstock","Canvas"]},
    {"key":"dimensions","label":"Dimensions (W×H)","unit":"cm","common_values":["21×30","30×42","42×59","50×70","60×90","70×100"]},
    {"key":"edition","label":"Edition","unit":null,"common_values":["Open Edition","Limited Edition","Artist Proof","Numbered"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["A4 (21×30cm)","A3 (30×42cm)","A2 (42×59cm)","50×70cm","70×100cm"]},
    {"name":"Frame","common_values":["Unframed","Black Frame","White Frame","Natural Wood Frame","Gold Frame"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Art & Handmade',
  'Sculptures',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Bronze","Marble","Resin","Ceramic","Wood","Steel","Stone","Clay"]},
    {"key":"dimensions","label":"Dimensions (L×W×H)","unit":"cm","common_values":["10×10×20","20×15×30","30×20×50","40×30×60"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.5","1","2","5","10"]},
    {"key":"artist","label":"Artist","unit":null,"common_values":[]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Art & Handmade',
  'Handmade Jewelry',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Sterling Silver","Gold","Rose Gold","Brass","Copper","Bronze","Stainless Steel"]},
    {"key":"gemstone","label":"Gemstone","unit":null,"common_values":["None","Diamond","Ruby","Sapphire","Emerald","Amethyst","Turquoise","Pearl","Opal"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["1","2","5","10","20","50"]},
    {"key":"hypoallergenic","label":"Hypoallergenic","unit":null,"common_values":["Yes","No","Nickel-Free"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","Custom"]},
    {"name":"Metal","common_values":["Silver","Gold","Rose Gold","Platinum","Bronze","Brass"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Art & Handmade',
  'Pottery & Ceramics',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Stoneware","Earthenware","Porcelain","Terracotta","Bone China"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["8×8","10×10","12×12","15×15","20×20"]},
    {"key":"technique","label":"Technique","unit":null,"common_values":["Wheel Thrown","Hand Built","Slipcasted","Press Molded","Coil Built"]},
    {"key":"dishwasher_safe","label":"Dishwasher Safe","unit":null,"common_values":["Yes","No","Hand Wash Recommended"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Art & Handmade',
  'Candles & Wax',
  '[
    {"key":"wax_type","label":"Wax Type","unit":null,"common_values":["Soy","Beeswax","Coconut","Paraffin","Palm","Soy Blend"]},
    {"key":"scent","label":"Scent","unit":null,"common_values":["Unscented","Vanilla","Lavender","Sandalwood","Eucalyptus","Rose","Cedar","Citrus"]},
    {"key":"burn_time","label":"Burn Time","unit":"hrs","common_values":["10","20","30","40","50","60","80"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["100","200","300","450","600"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Travel (100g)","Small (200g)","Medium (300g)","Large (450g)"]},
    {"name":"Scent","common_values":["Unscented","Vanilla","Lavender","Sandalwood","Eucalyptus","Rose","Cedar","Citrus"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Food & Beverages  (6 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Food & Beverages',
  'Snacks',
  '[
    {"key":"ingredients","label":"Ingredients","unit":null,"common_values":[]},
    {"key":"allergens","label":"Allergens","unit":null,"common_values":["Gluten-Free","Nut-Free","Dairy-Free","Vegan","Soy-Free","Egg-Free"]},
    {"key":"nutritional_info","label":"Nutritional Info (per 100g)","unit":null,"common_values":[]},
    {"key":"net_weight","label":"Net Weight","unit":"g","common_values":["30","50","100","150","200","250","500"]},
    {"key":"shelf_life","label":"Shelf Life","unit":"months","common_values":["3","6","9","12","18","24"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Single Serve (30g)","Small (100g)","Regular (200g)","Large (500g)","Family (1kg)"]},
    {"name":"Flavor","common_values":["Original","Salted","Sweet","Spicy","Cheese","BBQ","Sour Cream"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Food & Beverages',
  'Beverages',
  '[
    {"key":"ingredients","label":"Ingredients","unit":null,"common_values":[]},
    {"key":"volume","label":"Volume","unit":"ml","common_values":["250","330","500","750","1000","1500","2000"]},
    {"key":"allergens","label":"Allergens","unit":null,"common_values":["Gluten-Free","Dairy-Free","Vegan","Nut-Free","Soy-Free"]},
    {"key":"caffeine_content","label":"Caffeine Content","unit":"mg","common_values":["0","20","50","80","100","150","200"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["250ml","330ml","500ml","750ml","1L","1.5L","2L"]},
    {"name":"Flavor","common_values":["Original","Lemon","Orange","Berry","Tropical","Mint","Cola"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Food & Beverages',
  'Baked Goods',
  '[
    {"key":"ingredients","label":"Ingredients","unit":null,"common_values":[]},
    {"key":"allergens","label":"Allergens","unit":null,"common_values":["Contains Gluten","Contains Dairy","Contains Eggs","Contains Nuts","Vegan","Gluten-Free"]},
    {"key":"net_weight","label":"Net Weight","unit":"g","common_values":["100","200","250","400","500","1000"]},
    {"key":"shelf_life","label":"Shelf Life","unit":"days","common_values":["1","3","5","7","14","30"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Mini","Individual","Small (4pc)","Regular (6pc)","Large (12pc)","Whole"]},
    {"name":"Flavor","common_values":["Original","Chocolate","Vanilla","Blueberry","Cinnamon","Lemon"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Food & Beverages',
  'Meal Kits',
  '[
    {"key":"ingredients","label":"Ingredients","unit":null,"common_values":[]},
    {"key":"servings","label":"Servings","unit":"persons","common_values":["1","2","3","4","6"]},
    {"key":"prep_time","label":"Prep Time","unit":"min","common_values":["10","15","20","30","45","60"]},
    {"key":"allergens","label":"Allergens","unit":null,"common_values":["Gluten-Free","Dairy-Free","Vegan","Vegetarian","Nut-Free","Halal","Kosher"]},
    {"key":"calories","label":"Calories per Serving","unit":"kcal","common_values":["300","400","500","600","700","800"]}
  ]'::jsonb,
  '[
    {"name":"Portion","common_values":["1 Person","2 Persons","3 Persons","4 Persons","Family (6)"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Food & Beverages',
  'Coffee & Tea',
  '[
    {"key":"origin","label":"Origin","unit":null,"common_values":["Ethiopia","Colombia","Brazil","Guatemala","Sumatra","Kenya","Costa Rica","Sri Lanka","Japan","China"]},
    {"key":"roast_level","label":"Roast Level","unit":null,"common_values":["Light","Medium-Light","Medium","Medium-Dark","Dark","Espresso"]},
    {"key":"process","label":"Process","unit":null,"common_values":["Washed","Natural","Honey","Anaerobic","Wet-Hulled"]},
    {"key":"net_weight","label":"Net Weight","unit":"g","common_values":["100","200","250","500","1000"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["100g","200g","250g","500g","1kg"]},
    {"name":"Grind","common_values":["Whole Bean","Coarse","Medium-Coarse","Medium","Fine","Espresso"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Food & Beverages',
  'Supplements',
  '[
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Vitamin C","Vitamin D","Omega-3","Probiotics","Magnesium","Zinc","B-Complex","Collagen","Creatine","Protein"]},
    {"key":"dosage","label":"Dosage","unit":null,"common_values":["1 capsule/day","2 capsules/day","1 scoop/day","1 tablet/day","2 tablets/day"]},
    {"key":"servings","label":"Servings per Container","unit":"servings","common_values":["30","60","90","120","180"]},
    {"key":"certifications","label":"Certifications","unit":null,"common_values":["GMP Certified","NSF","Informed Sport","USDA Organic","Non-GMO","Halal","Kosher"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["30 servings","60 servings","90 servings","120 servings","180 servings"]},
    {"name":"Flavor","common_values":["Unflavored","Vanilla","Chocolate","Strawberry","Berry","Citrus","Tropical"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Sports & Fitness  (5 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Sports & Fitness',
  'Equipment',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Steel","Aluminum","Rubber","Neoprene","Nylon","Foam","Carbon Fiber"]},
    {"key":"dimensions","label":"Dimensions (L×W×H)","unit":"cm","common_values":["30×20×10","50×30×20","80×50×30","100×60×40","200×80×50"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.5","1","2","5","10","20","50"]},
    {"key":"weight_capacity","label":"Weight Capacity","unit":"kg","common_values":["50","100","120","150","200","300"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Sports & Fitness',
  'Sports Clothing',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Polyester","Nylon","Spandex","Merino Wool","Bamboo","Recycled Polyester"]},
    {"key":"fit","label":"Fit","unit":null,"common_values":["Regular","Slim","Compression","Relaxed","Loose"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"moisture_wicking","label":"Moisture Wicking","unit":null,"common_values":["Yes","No","Quick-Dry"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Sports & Fitness',
  'Supplements',
  '[
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Whey Protein","Creatine","BCAAs","Pre-Workout","Casein","Collagen","Glutamine"]},
    {"key":"servings","label":"Servings per Container","unit":"servings","common_values":["20","30","40","60","90"]},
    {"key":"dosage","label":"Dosage","unit":null,"common_values":["1 scoop","2 scoops","1 capsule","2 capsules","1 tablet"]},
    {"key":"certifications","label":"Certifications","unit":null,"common_values":["Informed Sport","NSF Certified","GMP","Banned Substance Tested","Informed Choice"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["20 servings","30 servings","60 servings","90 servings"]},
    {"name":"Flavor","common_values":["Unflavored","Vanilla","Chocolate","Strawberry","Cookies & Cream","Tropical","Berry"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Sports & Fitness',
  'Sports Footwear',
  '[
    {"key":"material","label":"Upper Material","unit":null,"common_values":["Mesh","Knit","Leather","Synthetic","TPU Overlay"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Men","Women","Unisex","Boys","Girls"]},
    {"key":"sole_type","label":"Sole Type","unit":null,"common_values":["Rubber","EVA","TPU","Boost","React","Air"]},
    {"key":"terrain","label":"Terrain","unit":null,"common_values":["Road","Trail","Track","Indoor","Multi-Surface","Gym"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["36","37","38","39","40","41","42","43","44","45"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Sports & Fitness',
  'Accessories',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Neoprene","Nylon","Polyester","Rubber","Leather","Silicone"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["20×10","30×15","40×20","50×25"]},
    {"key":"weight","label":"Weight","unit":"g","common_values":["50","100","200","350","500"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL","XXL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. Books & Media  (4 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Books & Media',
  'Physical Books',
  '[
    {"key":"author","label":"Author","unit":null,"common_values":[]},
    {"key":"pages","label":"Pages","unit":"pages","common_values":["100","200","300","400","500","600","800"]},
    {"key":"language","label":"Language","unit":null,"common_values":["English","Spanish","French","German","Arabic","Portuguese","Italian","Mandarin"]},
    {"key":"publisher","label":"Publisher","unit":null,"common_values":[]},
    {"key":"isbn","label":"ISBN","unit":null,"common_values":[]},
    {"key":"year","label":"Publication Year","unit":null,"common_values":["2020","2021","2022","2023","2024","2025"]}
  ]'::jsonb,
  '[
    {"name":"Format","common_values":["Hardcover","Paperback","Large Print","Collector Edition"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Books & Media',
  'E-books',
  '[
    {"key":"author","label":"Author","unit":null,"common_values":[]},
    {"key":"pages","label":"Pages","unit":"pages","common_values":["50","100","200","300","400","500"]},
    {"key":"language","label":"Language","unit":null,"common_values":["English","Spanish","French","German","Arabic","Portuguese","Italian","Mandarin"]},
    {"key":"file_format","label":"File Format","unit":null,"common_values":["PDF","EPUB","MOBI","AZW3"]}
  ]'::jsonb,
  '[]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Books & Media',
  'Music (Physical)',
  '[
    {"key":"artist","label":"Artist","unit":null,"common_values":[]},
    {"key":"label","label":"Record Label","unit":null,"common_values":[]},
    {"key":"year","label":"Release Year","unit":null,"common_values":["2020","2021","2022","2023","2024","2025"]},
    {"key":"genre","label":"Genre","unit":null,"common_values":["Pop","Rock","Hip-Hop","Electronic","Jazz","Classical","R&B","Country","Metal"]},
    {"key":"tracks","label":"Track Count","unit":"tracks","common_values":["8","10","12","14","16","20"]}
  ]'::jsonb,
  '[
    {"name":"Format","common_values":["CD","Vinyl (12\")","Vinyl (7\")","Cassette","Blu-ray Audio"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Books & Media',
  'Online Courses',
  '[
    {"key":"instructor","label":"Instructor","unit":null,"common_values":[]},
    {"key":"duration","label":"Total Duration","unit":"hrs","common_values":["2","5","10","15","20","30","40"]},
    {"key":"level","label":"Level","unit":null,"common_values":["Beginner","Intermediate","Advanced","All Levels"]},
    {"key":"language","label":"Language","unit":null,"common_values":["English","Spanish","French","German","Arabic","Portuguese"]},
    {"key":"modules","label":"Number of Modules","unit":"modules","common_values":["5","10","15","20","30"]}
  ]'::jsonb,
  '[
    {"name":"Plan","common_values":["Lifetime Access","Monthly","Annual","Team License"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Services  (6 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Services',
  'Consulting',
  '[
    {"key":"duration","label":"Session Duration","unit":"min","common_values":["30","60","90","120"]},
    {"key":"delivery_method","label":"Delivery Method","unit":null,"common_values":["Video Call","Phone","In-Person","Email","Chat"]},
    {"key":"includes","label":"What is Included","unit":null,"common_values":["1:1 Call","Written Report","Action Plan","Follow-Up","Recording"]}
  ]'::jsonb,
  '[
    {"name":"Package","common_values":["Starter","Basic","Standard","Premium","Enterprise"]},
    {"name":"Duration","common_values":["30 min","60 min","90 min","Half Day","Full Day"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Services',
  'Design Services',
  '[
    {"key":"deliverables","label":"Deliverables","unit":null,"common_values":["Logo Files","Brand Kit","Source Files","Print-Ready Files","Web-Ready Assets"]},
    {"key":"revisions","label":"Revisions Included","unit":"rounds","common_values":["1","2","3","5","Unlimited"]},
    {"key":"turnaround_time","label":"Turnaround Time","unit":"days","common_values":["1","3","5","7","14"]},
    {"key":"format","label":"File Formats","unit":null,"common_values":["AI","EPS","SVG","PNG","PDF","PSD","Figma"]}
  ]'::jsonb,
  '[
    {"name":"Package","common_values":["Basic","Standard","Premium","Custom"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Services',
  'Photography',
  '[
    {"key":"duration","label":"Session Duration","unit":"hrs","common_values":["1","2","3","4","6","8"]},
    {"key":"deliverables","label":"Deliverables","unit":null,"common_values":["Digital Files","Online Gallery","USB Drive","Prints","Albums"]},
    {"key":"location","label":"Location","unit":null,"common_values":["Studio","Outdoor","Client Location","Destination","Remote"]},
    {"key":"edited_photos_count","label":"Edited Photos Included","unit":"photos","common_values":["25","50","75","100","150","200","Unlimited"]}
  ]'::jsonb,
  '[
    {"name":"Package","common_values":["Mini Session","Standard","Full Day","Destination","Wedding"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Services',
  'Tutoring & Lessons',
  '[
    {"key":"subject","label":"Subject","unit":null,"common_values":["Math","Science","English","Programming","Music","Art","Language","Business","Fitness"]},
    {"key":"duration","label":"Session Duration","unit":"min","common_values":["30","45","60","90","120"]},
    {"key":"level","label":"Level","unit":null,"common_values":["Beginner","Elementary","Intermediate","Advanced","All Levels"]},
    {"key":"delivery_method","label":"Delivery Method","unit":null,"common_values":["Online","In-Person","Hybrid"]}
  ]'::jsonb,
  '[
    {"name":"Duration","common_values":["30 min","45 min","60 min","90 min"]},
    {"name":"Frequency","common_values":["Single Session","Weekly","Bi-Weekly","Daily","Monthly Package"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Services',
  'Repair & Maintenance',
  '[
    {"key":"warranty","label":"Warranty on Work","unit":"months","common_values":["1","3","6","12","24"]},
    {"key":"turnaround_time","label":"Turnaround Time","unit":"days","common_values":["Same Day","1","2","3","5","7"]},
    {"key":"includes","label":"What is Included","unit":null,"common_values":["Diagnosis","Parts","Labor","Parts & Labor","Pickup & Delivery"]}
  ]'::jsonb,
  '[
    {"name":"Type","common_values":["Basic","Standard","Premium","Express","Comprehensive"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Services',
  'Subscriptions',
  '[
    {"key":"billing_cycle","label":"Billing Cycle","unit":null,"common_values":["Monthly","Quarterly","Annual","Bi-Annual","One-Time"]},
    {"key":"includes","label":"What is Included","unit":null,"common_values":["Unlimited Access","Premium Content","Priority Support","Downloads","Custom Domain"]},
    {"key":"access_level","label":"Access Level","unit":null,"common_values":["Basic","Standard","Pro","Enterprise","Unlimited"]}
  ]'::jsonb,
  '[
    {"name":"Plan","common_values":["Starter","Basic","Pro","Business","Enterprise"]},
    {"name":"Duration","common_values":["Monthly","Quarterly","Annual","2-Year","Lifetime"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. Automotive & Parts  (3 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Automotive & Parts',
  'Car Parts',
  '[
    {"key":"compatibility","label":"Vehicle Compatibility","unit":null,"common_values":["Universal","Check Description for Fitment"]},
    {"key":"material","label":"Material","unit":null,"common_values":["Steel","Aluminum","Cast Iron","Plastic","Rubber","Carbon Fiber"]},
    {"key":"dimensions","label":"Dimensions","unit":"mm","common_values":[]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.5","1","2","5","10","20"]},
    {"key":"oem_aftermarket","label":"OEM or Aftermarket","unit":null,"common_values":["OEM","Aftermarket","OEM-Grade","Performance"]}
  ]'::jsonb,
  '[]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Automotive & Parts',
  'Car Accessories',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Leather","Neoprene","Rubber","ABS Plastic","Aluminum","Stainless Steel"]},
    {"key":"compatibility","label":"Vehicle Compatibility","unit":null,"common_values":["Universal","Sedan","SUV","Truck","Hatchback"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":[]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small","Medium","Large","Universal"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Automotive & Parts',
  'Tools',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Chrome Vanadium","Carbon Steel","Stainless Steel","Alloy Steel","Titanium"]},
    {"key":"drive_size","label":"Drive Size","unit":null,"common_values":["1/4\"","3/8\"","1/2\"","3/4\"","1\""]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.1","0.3","0.5","1","2","5"]},
    {"key":"set_count","label":"Pieces in Set","unit":"pcs","common_values":["1","5","10","20","40","72","100"]}
  ]'::jsonb,
  '[
    {"name":"Set","common_values":["Individual","Starter Set","Standard Set","Professional Set","Complete Kit"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. Toys & Games  (4 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Toys & Games',
  'Toys',
  '[
    {"key":"age_range","label":"Recommended Age","unit":null,"common_values":["0-2 years","3-5 years","6-8 years","9-12 years","12+ years","All Ages"]},
    {"key":"material","label":"Material","unit":null,"common_values":["Plastic","Wood","Plush","Metal","Fabric","Rubber","Foam"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["10×10×10","20×15×10","30×20×15","40×30×20"]},
    {"key":"battery_required","label":"Battery Required","unit":null,"common_values":["Yes - AA","Yes - AAA","Yes - 9V","No","Rechargeable"]},
    {"key":"safety_certifications","label":"Safety Certifications","unit":null,"common_values":["CE","ASTM F963","EN71","CPSC","OEKO-TEX"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Toys & Games',
  'Board Games',
  '[
    {"key":"age_range","label":"Recommended Age","unit":null,"common_values":["3+","6+","8+","10+","12+","14+","18+"]},
    {"key":"players","label":"Number of Players","unit":"players","common_values":["1","2","2-4","2-6","3-8","4-12"]},
    {"key":"play_time","label":"Average Play Time","unit":"min","common_values":["15","30","45","60","90","120","180"]},
    {"key":"language","label":"Language","unit":null,"common_values":["English","Spanish","French","German","Multi-Language","Language Independent"]}
  ]'::jsonb,
  '[
    {"name":"Edition","common_values":["Standard","Deluxe","Anniversary","Travel","Digital","Expansion"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Toys & Games',
  'Puzzles',
  '[
    {"key":"pieces","label":"Piece Count","unit":"pieces","common_values":["24","48","100","200","300","500","1000","1500","2000","5000"]},
    {"key":"dimensions","label":"Completed Dimensions (W×H)","unit":"cm","common_values":["25×25","35×25","50×35","70×50","90×60","100×70"]},
    {"key":"age_range","label":"Recommended Age","unit":null,"common_values":["2+","3+","5+","8+","12+","14+","Adult"]},
    {"key":"material","label":"Material","unit":null,"common_values":["Cardboard","Wood","Foam","Plastic","Fabric"]}
  ]'::jsonb,
  '[]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Toys & Games',
  'Video Games',
  '[
    {"key":"platform","label":"Platform","unit":null,"common_values":["PlayStation 5","PlayStation 4","Xbox Series X|S","Xbox One","Nintendo Switch","PC","Mobile"]},
    {"key":"genre","label":"Genre","unit":null,"common_values":["Action","Adventure","RPG","Sports","Racing","FPS","Simulation","Strategy","Puzzle","Fighting"]},
    {"key":"esrb_rating","label":"ESRB Rating","unit":null,"common_values":["E (Everyone)","E10+","T (Teen)","M (Mature 17+)","AO (Adults Only)"]},
    {"key":"players","label":"Players","unit":null,"common_values":["1 Player","2 Players","2-4 Local","Online Multiplayer","MMO"]},
    {"key":"language","label":"Language","unit":null,"common_values":["English","Multi-Language","English + Spanish","English + French"]}
  ]'::jsonb,
  '[
    {"name":"Edition","common_values":["Standard","Deluxe","Ultimate","Game of the Year","Collector''s Edition"]},
    {"name":"Platform","common_values":["PlayStation 5","PlayStation 4","Xbox Series X|S","Xbox One","Nintendo Switch","PC"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. Pet Supplies  (4 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Pet Supplies',
  'Pet Food',
  '[
    {"key":"animal_type","label":"Animal Type","unit":null,"common_values":["Dog","Cat","Bird","Fish","Rabbit","Hamster","Reptile"]},
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Chicken","Beef","Salmon","Turkey","Lamb","Rice","Vegetables","Grain-Free"]},
    {"key":"allergens","label":"Free From","unit":null,"common_values":["Grain-Free","Gluten-Free","Soy-Free","Corn-Free","By-Product Free","Artificial Preservative-Free"]},
    {"key":"net_weight","label":"Net Weight","unit":"kg","common_values":["0.5","1","2","3","5","7","10","15","20"]},
    {"key":"life_stage","label":"Life Stage","unit":null,"common_values":["Puppy/Kitten","Adult","Senior","All Life Stages","Breed Specific"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Trial (0.5kg)","Small (1kg)","Medium (3kg)","Large (7kg)","Extra Large (15kg)"]},
    {"name":"Flavor","common_values":["Chicken","Beef","Salmon","Turkey","Lamb","Mixed","Original"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Pet Supplies',
  'Pet Toys',
  '[
    {"key":"animal_type","label":"Animal Type","unit":null,"common_values":["Dog","Cat","Bird","Rabbit","Hamster","Reptile","All Pets"]},
    {"key":"material","label":"Material","unit":null,"common_values":["Rubber","Plush","Rope","Nylon","Latex","TPR","Catnip Fabric"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["5×5","10×5","15×10","20×10","30×15"]},
    {"key":"durability","label":"Durability","unit":null,"common_values":["Light","Standard","Heavy Duty","Indestructible","Interactive"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Small","Medium","Large","Extra Large"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Pet Supplies',
  'Pet Accessories',
  '[
    {"key":"animal_type","label":"Animal Type","unit":null,"common_values":["Dog","Cat","Bird","Rabbit","Hamster","All Pets"]},
    {"key":"material","label":"Material","unit":null,"common_values":["Nylon","Leather","Polyester","Cotton","Stainless Steel","Plastic"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["25-35","30-45","40-60","50-70","60-80"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["XS","S","M","L","XL"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Pet Supplies',
  'Pet Health',
  '[
    {"key":"animal_type","label":"Animal Type","unit":null,"common_values":["Dog","Cat","Bird","Rabbit","Hamster","All Pets"]},
    {"key":"ingredients","label":"Key Ingredients","unit":null,"common_values":["Omega-3","Glucosamine","Probiotics","Vitamins A,D,E","Chondroitin","Biotin"]},
    {"key":"dosage","label":"Dosage","unit":null,"common_values":["1 tablet/day","2 tablets/day","1 chew/day","As directed by vet","Apply topically"]},
    {"key":"volume","label":"Volume / Count","unit":null,"common_values":["30 tablets","60 tablets","90 chews","100ml","200ml"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["30 servings","60 servings","90 servings","120 servings"]},
    {"name":"Flavor","common_values":["Unflavored","Chicken","Beef","Salmon","Bacon"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 13. Bags & Luggage  (4 types)
-- ============================================================

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Bags & Luggage',
  'Backpacks',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Nylon","Polyester","Canvas","Leather","Cordura","Recycled PET"]},
    {"key":"capacity_liters","label":"Capacity","unit":"L","common_values":["10","15","20","25","30","40","50","60","80"]},
    {"key":"dimensions","label":"Dimensions (H×W×D)","unit":"cm","common_values":["40×30×15","45×32×18","50×35×20","55×38×22","60×40×25"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["0.5","0.8","1","1.2","1.5","2"]},
    {"key":"laptop_compartment","label":"Laptop Compartment","unit":null,"common_values":["No","13\"","14\"","15.6\"","17\""]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]},
    {"name":"Size","common_values":["Small (10-15L)","Medium (20-30L)","Large (40-50L)","Extra Large (60L+)"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Bags & Luggage',
  'Handbags & Purses',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Leather","PU Leather","Canvas","Suede","Nylon","Fabric","Woven"]},
    {"key":"dimensions","label":"Dimensions (H×W×D)","unit":"cm","common_values":["15×25×8","20×30×10","25×35×12","30×40×15"]},
    {"key":"closure_type","label":"Closure Type","unit":null,"common_values":["Zipper","Magnetic Snap","Buckle","Drawstring","Open Top","Turn Lock"]},
    {"key":"gender","label":"Gender","unit":null,"common_values":["Women","Men","Unisex"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Bags & Luggage',
  'Luggage & Suitcases',
  '[
    {"key":"material","label":"Shell Material","unit":null,"common_values":["ABS","Polycarbonate","ABS+PC","Aluminum","Softside Fabric","Ballistic Nylon"]},
    {"key":"capacity_liters","label":"Capacity","unit":"L","common_values":["30","40","55","70","85","100","120"]},
    {"key":"dimensions","label":"Dimensions (H×W×D)","unit":"cm","common_values":["55×40×20","65×45×25","75×50×30","80×55×35"]},
    {"key":"weight","label":"Weight","unit":"kg","common_values":["2","2.5","3","3.5","4","4.5","5"]},
    {"key":"wheels","label":"Wheels","unit":null,"common_values":["2-Wheel","4-Wheel Spinner","8-Wheel Spinner","Inline"]},
    {"key":"tsa_lock","label":"TSA Lock","unit":null,"common_values":["Yes","No","Integrated TSA Lock"]}
  ]'::jsonb,
  '[
    {"name":"Size","common_values":["Cabin/Carry-On (55cm)","Medium (65cm)","Large (75cm)","Extra Large (80cm+)"]},
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.category_templates (category_name, type_name, default_specifications, default_options, is_system, user_id)
VALUES (
  'Bags & Luggage',
  'Wallets & Cardholders',
  '[
    {"key":"material","label":"Material","unit":null,"common_values":["Leather","PU Leather","Nylon","Canvas","Carbon Fiber","Metal"]},
    {"key":"card_slots","label":"Card Slots","unit":"slots","common_values":["2","4","6","8","10","12","16"]},
    {"key":"dimensions","label":"Dimensions","unit":"cm","common_values":["9×12×1","9×12×2","10×12×2","10×13×3"]},
    {"key":"rfid_blocking","label":"RFID Blocking","unit":null,"common_values":["Yes","No"]}
  ]'::jsonb,
  '[
    {"name":"Color","common_values":["Black","White","Red","Blue","Green","Grey","Navy","Brown","Pink","Beige"]}
  ]'::jsonb,
  true,
  NULL
) ON CONFLICT DO NOTHING;
