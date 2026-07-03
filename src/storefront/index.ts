// Storefront Studio — public module surface.
export * from './config';
export { StorefrontThemeProvider, useStorefrontConfig } from './theme/StorefrontThemeProvider';
export { SectionRenderer } from './blocks/SectionRenderer';
export { BLOCK_REGISTRY, getBlockDef } from './blocks/registry';
export { ProductCard } from './components/ProductCard';
export { Header } from './components/Header';
export { Footer } from './components/Footer';
export { BottomNav } from './components/BottomNav';
export { HomePage } from './pages/HomePage';
export { TEMPLATES, getTemplate } from './templates';
export { TemplatePreview } from './preview/TemplatePreview';
export { TemplateGallery } from './preview/TemplateGallery';
