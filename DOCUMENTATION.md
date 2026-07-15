# InstaShopify Application Documentation

This document provides a comprehensive overview of the InstaShopify application, detailing its purpose, features, design principles, page structure, key components, and underlying technical architecture.

## 1. Application Overview

InstaShopify is a modern web application designed to empower small businesses and creators to effortlessly transform their Instagram posts into sellable products. It streamlines the e-commerce process by integrating directly with Instagram Business accounts, leveraging AI for product analysis, and providing a robust dashboard for managing products, orders, and shop appearance.

**Core Purpose:** To bridge the gap between social media presence and online sales, enabling users to quickly monetize their visual content.

**Key Highlights:**
-   **Instagram Integration:** Seamlessly connect to Instagram Business accounts to import posts.
-   **AI-Powered Product Creation:** Automatically analyze post captions to extract product details like name, description, price, category, and attributes.
-   **Comprehensive Product Management:** Edit, categorize, price, manage inventory, and set statuses for all products.
-   **Order Tracking:** Monitor sales, view order details, and update order statuses.
-   **Client Order Management:** Customers can view their orders, confirm receipt, and report issues directly from the storefront.
-   **Customizable Storefront:** Personalize the shop's appearance with themes, fonts, colors, and backgrounds.
-   **Realtime Updates:** Stay informed with live activity feeds and sync status.
-   **Secure & Scalable:** Built with Supabase for authentication, database, and serverless functions, ensuring security and performance.

## 2. Tech Stack

InstaShopify is built using a modern and robust web development stack:

-   **Frontend:**
    -   **React:** A declarative, component-based JavaScript library for building user interfaces.
    -   **TypeScript:** A superset of JavaScript that adds static typing, enhancing code quality and maintainability.
    -   **React Router:** For declarative routing within the application.
    -   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
    -   **shadcn/ui:** A collection of beautifully designed, accessible, and customizable UI components built with Radix UI and Tailwind CSS.
    -   **Framer Motion:** For smooth animations and transitions.
    -   **Recharts:** For building interactive charts and data visualizations.
    -   **Sonner:** For elegant toast notifications.
-   **Backend/Database/Auth:**
    -   **Supabase:** An open-source Firebase alternative providing a PostgreSQL database, authentication, real-time subscriptions, and Edge Functions.
-   **AI/Serverless:**
    -   **Supabase Edge Functions (Deno):** For server-side logic, including Instagram API interactions and AI model calls.
    -   **Google Gemini API:** Used for AI-powered product analysis from Instagram captions.

## 3. Design Principles & Layout

The application follows a clean, modern, and responsive design philosophy, prioritizing user experience and ease of use.

-   **Responsive Design:** The UI is fully responsive, adapting seamlessly to various screen sizes, from mobile devices to large desktop monitors.
-   **Tailwind CSS:** All styling is implemented using Tailwind CSS utility classes, ensuring consistency and rapid development.
-   **shadcn/ui Components:** Leverages a wide array of pre-built and customizable shadcn/ui components for a consistent and accessible user interface.
-   **Customizable Appearance:** Users have extensive control over the app's visual appearance through the "Appearance" settings, including:
    -   **Themes:** Selection from preset color palettes or creation of custom themes.
    -   **Colors:** Fine-grained control over all primary, secondary, accent, background, and foreground colors (HSL values).
    -   **Fonts:** Choice of heading and body fonts from a curated list of Google Fonts, with dynamic loading.
    -   **Corner Radius:** Adjustable global border-radius for UI elements.
    -   **Layout Style:** Option for 'floating' (header and sidebar float) or 'docked' (header and sidebar are fixed) layouts.
    -   **Sidebar Width:** Adjustable sidebar width (compact, default, spacious).
    -   **Backgrounds:** Option for solid color backgrounds, custom image uploads, or selection from a curated image gallery.
    -   **Background Effects:** Adjustable brightness, contrast, saturation, and hue for background images.
    -   **Glassmorphism:** A toggle to enable a frosted glass effect on UI elements, enhancing the modern aesthetic.
-   **Dashboard Layout (`DashboardLayout` component):**
    -   **Sidebar (`Sidebar` component):** A persistent navigation menu on the left for desktop, offering quick access to main sections (Dashboard, Products, Out of Stock, Orders, AI Keywords, Settings). It can be styled with either a 'primary' (vibrant) or 'card' (subtle) background.
    -   **Header (`Header` component):** Displays the current page title and a user dropdown menu. Includes a search bar. Its position adapts based on the chosen layout style.
    -   **Bottom Navigation (`BottomNav` component):** A mobile-specific navigation bar that appears at the bottom of the screen, mirroring the main sidebar links for easy access on smaller devices.
    -   **Main Content Area:** Dynamically renders page content based on the active route, with smooth `framer-motion` transitions.
    -   **Sync Status Widget (`SyncStatusWidget` component):** A floating widget that provides real-time updates on background sync jobs, including progress, current post being analyzed, AI analysis results, and options to abort or view a summary.

## 4. Pages

The application is structured into several distinct pages, each serving a specific function:

-   **`/login` (Login Page):**
    -   Allows users to sign in or sign up using their Facebook account (which also connects Instagram).
    -   Includes a link to a demo version of the app.
-   **`/onboarding` (Onboarding Page):**
    -   A mandatory step for new users after initial login.
    -   Prompts users to confirm their first name, last name, and set a password.
    -   Updates user metadata and marks onboarding as complete in the `profiles` table.
-   **`/` (Dashboard - `Index` Page):**
    -   The main landing page after login.
    -   Provides an overview of key business metrics: total revenue, sales count, active products, total customers.
    -   Features an interactive `OverviewChart` displaying monthly revenue, new clients, and orders.
    -   Includes `ProfileStats` showing Instagram follower count, post count, and product count.
    -   Highlights `TopProducts` by sales volume.
    -   Displays a `Live Activity` feed (`ActivityFeed` component) with real-time updates on new sales, product changes, and client disputes.
    -   Offers `QuickActions` for common tasks like quick sync, restocking, checking orders, customizing appearance, and adding mock data.
-   **`/products` (Products Page):**
    -   Displays a comprehensive list of all products.
    -   Supports filtering by status, searching by name, and sorting by various criteria (newest, oldest, price, name).
    -   Offers two view modes: `Grid` (`ProductCard` component) and `Table` (`ProductTableView` component).
    -   Includes bulk actions for selected products (set status, add sale, delete) via `BulkActionsToolbar`.
    -   Allows importing new products from Instagram posts (`InstagramPostModal`).
    -   Provides a `ProductEditor` modal for detailed product editing.
-   **`/out-of-stock` (Stock / Inventory Page):**
    -   Dedicated page for viewing and adjusting inventory across all physical products and their variants.
    -   Filter by stock level (all / in stock / low stock / out of stock), search, and filter by category.
    -   Expand any product to edit per-variant stock inline, apply set/add-to-all per product, or bulk set/add/zero-out across the selected variants (with a confirm step for zero-out and an undo affordance).
-   **`/orders` (Orders Page):**
    -   Lists all customer orders.
    -   Allows filtering by order status (All, Pending, In Progress, Fulfilled), searching by customer name/email, and filtering by date range.
    -   Displays key order statistics: total revenue, order count, average order value.
    -   Provides an `OrderDetailModal` for viewing and updating individual order statuses and items.
-   **`/keywords` (AI Keywords Page):**
    -   Allows users to define custom keywords and descriptions.
    -   These keywords guide the AI in extracting specific product details from Instagram captions, improving accuracy and relevance.
    -   Features a `KeywordsTable` and `KeywordEditorModal` for managing keywords.
-   **`/settings` (Settings Page):**
    -   Organized into tabs:
        -   **Account:** Displays user profile information (synced from Facebook), and preferences for notifications. Includes `IntegrationSettings` for connecting/disconnecting Facebook/Instagram.
        -   **Shop:** Allows editing shop-specific details like shop name, headline, about section, contact email, and default currency. Displays read-only synced Instagram profile data.
        -   **Appearance:** Provides extensive customization options for the app's visual theme, as described in Section 3.
-   **`/demo` (Demo Page):**
    -   A public-facing page showcasing the application's dashboard features with mock data.
    -   Allows potential users to explore the app's capabilities without logging in.
-   **`*` (Not Found Page):**
    -   A generic 404 page for any unhandled routes.

## 5. Key Components

This section highlights some of the crucial components that form the building blocks of InstaShopify.

-   **`App.tsx`:** The root component, setting up React Query, Tooltip Provider, Sonner, React Router, and all major Context Providers (`AppearanceProvider`, `PageTitleProvider`, `ShopProvider`, `IntegrationProvider`, `SyncProvider`).
-   **`ProtectedRoute.tsx`:** A React Router outlet component that ensures only authenticated users can access protected routes, redirecting to `/login` if no session is found.
-   **`OnboardingGuard.tsx`:** Another React Router outlet component that ensures users complete the onboarding process before accessing the main dashboard, redirecting to `/onboarding` if not complete.
-   **`DashboardLayout.tsx`:** The main layout component for authenticated users, integrating the `Sidebar`, `Header`, `BottomNav`, and `SyncStatusWidget`.
-   **`Sidebar.tsx`:** The primary navigation component for desktop, dynamically styled based on `AppearanceContext` settings.
-   **`Header.tsx`:** Displays the current page title, a search bar, and user dropdown, also styled dynamically.
-   **`BottomNav.tsx`:** Mobile-specific navigation for easy access to main sections.
-   **`IntegrationPrompt.tsx`:** A modal that appears when an Instagram integration is required but not yet set up, guiding the user through the connection process.
-   **`SyncStatusWidget.tsx`:** A persistent, interactive widget displaying the status and progress of background sync jobs, including AI analysis details.
-   **`InstagramPostModal.tsx`:** A modal for importing Instagram posts. It fetches posts, runs AI analysis on them, and allows users to select a post to create a product.
-   **`CreateProductModal.tsx`:** A form modal used to create a new product, pre-filled with AI-analyzed data from an Instagram post. It allows users to refine details before saving.
-   **`ProductEditor.tsx`:** A modal for viewing and editing existing product details. It supports media management (upload, delete, reorder), dynamic attribute fields, and AI re-analysis.
-   **`ProductCard.tsx`:** Displays individual product information in a grid view, with options for selection, status change, and quick editing. Supports image carousels for multiple media.
-   **`ProductTableView.tsx`:** Displays product information in a table format, suitable for bulk management.
-   **`BulkActionsToolbar.tsx`:** A floating toolbar that appears when products are selected, offering bulk actions like changing status, applying sales, or deleting.
-   **`SaleModal.tsx`:** A modal for applying percentage or flat-amount discounts to selected products.
-   **`OrderDetailModal.tsx`:** A modal displaying detailed information about a specific order, including customer details, items, total amount, and options to update its status.
-   **`StorefrontOrderDetailModal.tsx`:** A client-facing modal for customers to view their order details, confirm receipt, and report issues. Includes options to cancel pending orders.
-   **`StatCard.tsx`:** A reusable card component for displaying key performance indicators (KPIs) on the dashboard.
-   **`OverviewChart.tsx`:** An interactive chart component for visualizing business trends.
-   **`ActivityFeed.tsx`:** Displays a real-time stream of recent sales, product updates, and client disputes.
-   **`QuickActions.tsx`:** Provides quick access buttons for common tasks on the dashboard.
-   **`AppearancePanel.tsx`:** The main settings panel for customizing the app's visual theme.
-   **`ThemeSelector.tsx`:** Allows users to pick from preset themes or manage custom saved themes.
-   **`FontSelector.tsx`:** Provides options to choose heading and body fonts, with curated pairings and individual selection.
-   **`BackgroundImageSelector.tsx`:** Manages the application's background, allowing solid colors, custom uploads, or gallery images, along with image adjustment filters.
-   **`AdvancedPanel.tsx`:** Reveals granular color controls for advanced theme customization.
-   **`CreatableCombobox.tsx`:** A versatile combobox component that allows users to select existing options or create new ones on the fly (e.g., for categories, types).
-   **`TagInput.tsx`:** A component for entering and displaying tags, used for product tags and other multi-value inputs.
-   **`MediaItem.tsx`:** A utility component to correctly render either an image or a video based on its `media_type`.

## 6. Supabase Integration

Supabase is central to InstaShopify's functionality, handling authentication, data storage, and server-side logic.

-   **Authentication:**
    -   Uses Supabase Auth for user management.
    -   **OAuth with Facebook:** Primary login method, which also facilitates Instagram Business account connection.
    -   **User Profiles (`public.profiles` table):** Stores additional user data (first name, last name, avatar URL, onboarding status) linked to `auth.users`.
    -   **`handle_new_user` function:** An automatic trigger that creates a `public.profiles` entry upon new user signup.
    -   **`Onboarding` page:** Guides new users to complete their profile and set a password.
-   **Database Schema:**
    -   **`public.businesses`:** Stores information about each user's business, linked to `auth.users`. Includes `last_full_sync_at` to track full sync history.
    -   **`public.products`:** Stores product details (name, price, status, media, categories, tags, custom details), linked to `public.businesses` and `auth.users`.
    -   **`public.orders`:** Stores customer order information (customer name, email, total, status), linked to `public.businesses`. All monetary values are stored in `ALL` (Albanian Lek) for consistency.
    -   **`public.order_items`:** Details individual items within an order, linking to `public.orders` and `public.products`. Item prices are stored in `ALL`.
    -   **`public.integrations`:** Stores access tokens and provider information for external services (e.g., Facebook/Instagram), linked to `auth.users`.
    -   **`public.categories`:** User-defined product categories.
    -   **`public.types`:** User-defined product types within categories, with associated attributes.
    -   **`public.keywords`:** User-defined keywords for AI analysis.
    -   **`public.ai_feedback`:** Stores user corrections to AI-generated product data, used to improve AI models.
    -   **`public.sync_jobs`:** Tracks the status and progress of background sync operations.
    -   **`public.shop_details`:** Stores customizable shop information (name, headline, currency, etc.).
    -   **`public.design_settings`:** Stores user-specific appearance customization settings.
    -   **`public.exchange_rates_cache`:** Caches currency exchange rates to reduce external API calls.
    -   **`public.order_disputes`:** Stores records of customer-reported issues with orders.
-   **Row Level Security (RLS):** Enabled on all tables to ensure users can only access and modify their own data, or data associated with their business.
-   **Realtime Subscriptions:** Used for `ActivityFeed`, `Products` page updates, `Orders` page updates, and `SyncStatusWidget` to provide a dynamic and responsive user experience.

## 7. Supabase Edge Functions

Edge Functions are used for server-side logic, particularly for interacting with external APIs and running AI models, ensuring security and performance.

-   **`instagram-auth`:** Handles the OAuth flow with Facebook/Instagram. It exchanges short-lived tokens for long-lived ones, fetches user profile data, creates/updates user accounts in Supabase, and stores the integration token. It also generates a magic link for seamless user login after integration.
-   **`instagram-profile`:** Fetches the user's Instagram Business profile details (followers, media count, profile picture, bio) using the stored access token. This data is used to populate shop details.
-   **`instagram-posts`:** Retrieves media posts from the user's Instagram Business account. It handles pagination and token validation.
-   **`ai-product-classifier`:** The core AI function. It takes an Instagram caption, fetches user-defined keywords and recent product examples, and then calls the Google Gemini API to:
    -   Determine if the post is a product.
    -   Extract product name, description, price, currency, category, type, and attributes.
    -   Suggest appropriate input types for attributes.
-   **`analyze-instagram-posts`:** Orchestrates the process of fetching Instagram posts and then sending each post's caption to `ai-product-classifier` for analysis. It also marks posts that have already been imported.
-   **`background-sync`:** Initiates and manages the background synchronization process. It fetches all Instagram posts, compares them with existing products, sends new/updated posts for AI analysis, and then upserts products into the database. It updates `sync_jobs` with progress and summary. It supports `quick` (skips existing products) and `full` (re-analyzes all products) sync types.
-   **`periodic-sync`:** A scheduled function (not directly invoked by the user UI) that iterates through all users with Facebook integrations and triggers a `background-sync` for each, ensuring product catalogs are regularly updated.
-   **`exchange-rates`:** Fetches and caches currency exchange rates from an external API (ExchangeRate-API.com). It uses the `exchange_rates_cache` table to store rates for 24 hours, reducing API calls.
-   **`seed-mock-data`:** Generates mock sales data (orders and order items) for a user's business, useful for testing and demo purposes.
-   **`create-order`:** Handles the creation of new orders from the storefront, including inserting order details and items, and updating product inventory. All monetary values are converted to `ALL` before storage.
-   **`cancel-order`:** Allows customers to cancel pending orders from the storefront. It verifies order ownership, updates order status to 'Cancelled', and restores inventory for one-time products.
-   **`auto-fulfill-orders` (Conceptual):** A potential future scheduled function to automatically mark orders as 'Fulfilled' after a certain period (e.g., 7-14 days) if they are in 'Given to Courier' status and no dispute has been raised. This would require a scheduled job setup outside the application's direct codebase.

## 8. Contexts

React Context is used to manage global state and provide data and functions to various parts of the application without prop-drilling.

-   **`AppearanceContext.tsx`:** Manages all user-defined appearance settings (themes, colors, fonts, layout, backgrounds, effects) and provides functions to update and reset them. It also applies these settings to the DOM.
-   **`PageTitleContext.tsx`:** Manages the current page title, allowing components to update the document title dynamically.
-   **`IntegrationContext.tsx`:** Manages the state of the Instagram integration prompt and provides a `runWithIntegrationCheck` function to ensure integration is active before performing certain actions.
-   **`ShopContext.tsx`:** Manages global shop details (name, logo, currency, Instagram stats) and provides functions to fetch and update them. It also handles currency conversion using fetched exchange rates.
-   **`SyncContext.tsx`:** Manages the state of the active background sync job, providing real-time updates and functions to dismiss or start new syncs.
-   **`CartContext.tsx`:** Manages the client-side shopping cart, including adding/removing items, updating quantities, saving for later, and calculating totals.
-   **`RecentlyViewedContext.tsx`:** Manages a list of recently viewed products for the storefront, stored locally.

This documentation provides a thorough understanding of the InstaShopify application's architecture and functionality.