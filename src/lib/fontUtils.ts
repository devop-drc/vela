const loadedFonts = new Set();

// Fonts already loaded app-wide via the Fontshare @import in globals.css — never
// try to fetch these from Google Fonts (they'd 404).
const PRELOADED_FONTS = new Set(['Inter', 'Clash Display', 'Satoshi']);

export const loadGoogleFont = (fontName: string) => {
  if (!fontName || loadedFonts.has(fontName) || PRELOADED_FONTS.has(fontName) || fontName.includes('system-ui')) {
    return;
  }
  // Ensure preconnects are added once for faster and more reliable mobile loading
  if (!document.getElementById('gf-preconnect-css')) {
    const pre1 = document.createElement('link');
    pre1.id = 'gf-preconnect-css';
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(pre1);
  }
  if (!document.getElementById('gf-preconnect-gstatic')) {
    const pre2 = document.createElement('link');
    pre2.id = 'gf-preconnect-gstatic';
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = '';
    document.head.appendChild(pre2);
  }
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
  const link = document.createElement('link');
  link.id = `font-${fontName}`;
  link.href = fontUrl;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  loadedFonts.add(fontName);
};