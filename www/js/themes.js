import { ACCENTS } from './constants.js';

const Themes = (() => {
  const THEME_VARIANTS = {
    default: {},
    amoled: { '--s1': '#000', '--s2': '#050505', '--s3': '#0a0a0a', '--s4': '#111' },
    sepia: {
      '--bg': '#faf0e6', '--s1': '#f5ead0', '--s2': '#efe0c8', '--s3': '#e8d5b8', '--s4': '#dfc9a8',
      '--tp': '#3d2b1f', '--ts': 'rgba(61,43,31,.6)', '--tm': 'rgba(61,43,31,.35)',
      '--border': 'rgba(61,43,31,.1)', '--bmd': 'rgba(61,43,31,.18)',
    },
    midnight: {
      '--bg': '#0a0e1a', '--s1': '#0f1424', '--s2': '#151b30', '--s3': '#1b223c', '--s4': '#212948',
      '--tp': '#d0d8f0', '--ts': 'rgba(208,216,240,.55)', '--tm': 'rgba(208,216,240,.3)',
    },
    forest: {
      '--bg': '#0a1a0a', '--s1': '#0f2410', '--s2': '#152e15', '--s3': '#1b381b', '--s4': '#214221',
      '--accent': '#4cd964', '--tp': '#d0f0d0', '--ts': 'rgba(208,240,208,.55)', '--tm': 'rgba(208,240,208,.3)',
    },
    ocean: {
      '--bg': '#0a0e1a', '--s1': '#0e1a2e', '--s2': '#142542', '--s3': '#1a3055', '--s4': '#203c69',
      '--accent': '#5ac8fa', '--tp': '#d0e8f8', '--ts': 'rgba(208,232,248,.55)', '--tm': 'rgba(208,232,248,.3)',
    },
    dracula: {
      '--bg': '#1e1e2e', '--s1': '#282840', '--s2': '#313150', '--s3': '#3a3a5c', '--s4': '#44446a',
      '--tp': '#f8f8f2', '--ts': 'rgba(248,248,242,.55)', '--tm': 'rgba(248,248,242,.3)',
      '--accent': '#bd93f9', '--border': 'rgba(189,147,249,.15)', '--bmd': 'rgba(189,147,249,.25)',
    },
    nord: {
      '--bg': '#2e3440', '--s1': '#3b4252', '--s2': '#434c5e', '--s3': '#4c566a', '--s4': '#5e6872',
      '--tp': '#eceff4', '--ts': 'rgba(236,239,244,.55)', '--tm': 'rgba(236,239,244,.3)',
      '--accent': '#88c0d0', '--border': 'rgba(136,192,208,.15)', '--bmd': 'rgba(136,192,208,.25)',
    },
    solarized: {
      '--bg': '#002b36', '--s1': '#073642', '--s2': '#0a4a56', '--s3': '#0e5d6b', '--s4': '#127080',
      '--tp': '#839496', '--ts': 'rgba(131,148,150,.55)', '--tm': 'rgba(131,148,150,.3)',
      '--accent': '#b58900', '--border': 'rgba(181,137,0,.15)', '--bmd': 'rgba(181,137,0,.25)',
    },
    monochrome: {
      '--bg': '#000', '--s1': '#111', '--s2': '#1a1a1a', '--s3': '#222', '--s4': '#2a2a2a',
      '--accent': '#fff', '--adim': 'rgba(255,255,255,.1)', '--tp': '#eee', '--ts': 'rgba(238,238,238,.55)', '--tm': 'rgba(238,238,238,.3)',
    },
    sunset: {
      '--bg': '#1a0a0a', '--s1': '#2e1212', '--s2': '#421a1a', '--s3': '#562222', '--s4': '#6a2a2a',
      '--tp': '#f0d0c0', '--ts': 'rgba(240,208,192,.55)', '--tm': 'rgba(240,208,192,.3)',
      '--accent': '#ff6b35', '--border': 'rgba(255,107,53,.15)', '--bmd': 'rgba(255,107,53,.25)',
    },
    tokyo: {
      '--bg': '#0a0e1a', '--s1': '#111628', '--s2': '#181e38', '--s3': '#1f2648', '--s4': '#262e58',
      '--tp': '#c0d0f0', '--ts': 'rgba(192,208,240,.55)', '--tm': 'rgba(192,208,240,.3)',
      '--accent': '#7aa2f7', '--border': 'rgba(122,162,247,.15)', '--bmd': 'rgba(122,162,247,.25)',
    },
  };

  const FONT_SIZES = ['small', 'normal', 'large', 'xlarge'];
  const FONT_FAMILIES = [
    { name: 'DM Sans', value: '"DM Sans", sans-serif' },
    { name: 'Inter', value: '"Inter", sans-serif' },
    { name: 'SF Pro', value: 'system-ui, -apple-system, sans-serif' },
    { name: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  ];
  const CORNER_RADII = { minimal: 4, normal: 8, rounded: 12, pill: 16 };

  let _currentAccent = 0;
  let _currentVariant = 'default';
  let _currentFontSize = 'normal';
  let _currentFontFamily = 0;
  let _currentRadius = 'normal';

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 229, b: 160 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  }

  function lighten(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(
      r + (255 - r) * amount,
      g + (255 - g) * amount,
      b + (255 - b) * amount
    );
  }

  function darken(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  }

  function complement(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(255 - r, 255 - g, 255 - b);
  }

  function getLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rs = r / 255, gs = g / 255, bs = b / 255;
    const rr = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const rg = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const rb = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    return 0.2126 * rr + 0.7152 * rg + 0.0722 * rb;
  }

  function contrastRatio(hex1, hex2) {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function isLight(hex) {
    return getLuminance(hex) > 0.5;
  }

  function generateAccentVariants(hex) {
    return {
      base: hex,
      light: lighten(hex, 0.3),
      lighter: lighten(hex, 0.6),
      dark: darken(hex, 0.3),
      darker: darken(hex, 0.6),
      complement: complement(hex),
    };
  }

  function setAccent(index) {
    const idx = ((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length;
    _currentAccent = idx;
    const accent = ACCENTS[idx];
    const app = document.getElementById('app');
    if (!app) return;
    app.style.setProperty('--accent', accent.c);
    app.style.setProperty('--adim', accent.c + '1f');
    app.style.setProperty('--adim2', accent.c + '2f');
    app.style.setProperty('--accent-light', lighten(accent.c, 0.3));
    app.style.setProperty('--accent-dark', darken(accent.c, 0.3));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const isLm = document.getElementById('app')?.classList.contains('lm');
      meta.content = isLm ? accent.c : '#000000';
    }
    const accentNames = document.querySelectorAll('.accent-name');
    accentNames.forEach(el => { el.textContent = accent.name; });
    const accentPreviews = document.querySelectorAll('.accent-preview');
    accentPreviews.forEach(el => { el.style.background = accent.c; });
    return accent;
  }

  function getAccent() {
    return ACCENTS[_currentAccent];
  }

  function getAccentIndex() {
    return _currentAccent;
  }

  function getAccentByIndex(index) {
    const idx = ((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length;
    return ACCENTS[idx];
  }

  function cycleAccent(dir = 1) {
    const next = (_currentAccent + dir + ACCENTS.length) % ACCENTS.length;
    setAccent(next);
    return ACCENTS[next];
  }

  function setThemeVariant(variant) {
    if (!THEME_VARIANTS[variant] && variant !== 'default') return false;
    _currentVariant = variant;
    const vars = THEME_VARIANTS[variant] || {};
    const app = document.getElementById('app');
    if (!app) return false;
    const variantNames = document.querySelectorAll('.theme-variant-name');
    variantNames.forEach(el => { el.textContent = variant.charAt(0).toUpperCase() + variant.slice(1); });
    for (const [key, val] of Object.entries(vars)) {
      if (key.startsWith('--')) {
        app.style.setProperty(key, val);
      }
    }
    return true;
  }

  function getThemeVariant() {
    return _currentVariant;
  }

  function getVariants() {
    return Object.keys(THEME_VARIANTS);
  }

  function getVariantNames() {
    return Object.keys(THEME_VARIANTS).map(k => ({
      id: k,
      name: k.charAt(0).toUpperCase() + k.slice(1),
    }));
  }

  function setLightMode(enabled) {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.toggle('lm', enabled);
    const bnav = document.getElementById('bnav');
    if (bnav) {
      if (enabled) bnav.classList.add('lm-nav');
      else bnav.classList.remove('lm-nav');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = enabled ? '#fbfbf9' : '#000000';
    }
    const toggleLbl = document.getElementById('lm-lbl');
    if (toggleLbl) toggleLbl.textContent = enabled ? 'On' : 'Off';
    const toggle = document.getElementById('lm-tog');
    if (toggle) toggle.classList.toggle('on', enabled);
  }

  function isLightMode() {
    return document.getElementById('app')?.classList.contains('lm') || false;
  }

  function toggleLightMode() {
    const current = isLightMode();
    setLightMode(!current);
    return !current;
  }

  function setFontSize(scale) {
    const s = Math.max(0.75, Math.min(1.5, scale));
    document.documentElement.style.fontSize = `${s * 16}px`;
    const fontSizeLabels = document.querySelectorAll('.font-size-label');
    fontSizeLabels.forEach(el => { el.textContent = `${Math.round(s * 100)}%`; });
  }

  function setFontSizePreset(preset) {
    const sizes = { small: 0.875, normal: 1, large: 1.125, xlarge: 1.25 };
    _currentFontSize = sizes[preset] ? preset : 'normal';
    setFontSize(sizes[_currentFontSize] || 1);
  }

  function getFontSizePreset() {
    return _currentFontSize;
  }

  function setFontFamily(index) {
    _currentFontFamily = Math.max(0, Math.min(FONT_FAMILIES.length - 1, index));
    const font = FONT_FAMILIES[_currentFontFamily];
    document.documentElement.style.setProperty('--font', font.value);
    const fontLabels = document.querySelectorAll('.font-family-label');
    fontLabels.forEach(el => { el.textContent = font.name; });
  }

  function cycleFontFamily(dir = 1) {
    const next = (_currentFontFamily + dir + FONT_FAMILIES.length) % FONT_FAMILIES.length;
    setFontFamily(next);
    return FONT_FAMILIES[next].name;
  }

  function getFontFamily() {
    return FONT_FAMILIES[_currentFontFamily];
  }

  function getFontFamilies() {
    return FONT_FAMILIES;
  }

  function setCornerRadius(preset) {
    _currentRadius = CORNER_RADII[preset] ? preset : 'normal';
    const val = CORNER_RADII[_currentRadius] || 8;
    const app = document.getElementById('app');
    if (!app) return;
    app.style.setProperty('--rsm', `${val}px`);
    app.style.setProperty('--rmd', `${Math.round(val * 1.5)}px`);
    app.style.setProperty('--rlg', `${Math.round(val * 2.25)}px`);
    app.style.setProperty('--rxl', `${Math.round(val * 3)}px`);
    const radiusLabels = document.querySelectorAll('.corner-radius-label');
    radiusLabels.forEach(el => { el.textContent = _currentRadius.charAt(0).toUpperCase() + _currentRadius.slice(1); });
  }

  function getCornerRadius() {
    return { preset: _currentRadius, value: CORNER_RADII[_currentRadius] || 8 };
  }

  function getThemeCSS() {
    const accent = ACCENTS[_currentAccent];
    const vars = THEME_VARIANTS[_currentVariant] || {};
    return { accent, variant: _currentVariant, ...vars };
  }

  function applyAll(settings) {
    if (settings.accentIdx != null) setAccent(settings.accentIdx);
    if (settings.lightMode != null) setLightMode(settings.lightMode);
    if (settings.themeVariant) setThemeVariant(settings.themeVariant);
    if (settings.fontSize) setFontSizePreset(settings.fontSize);
    if (settings.fontFamily != null) setFontFamily(settings.fontFamily);
    if (settings.cornerRadius) setCornerRadius(settings.cornerRadius);
  }

  function toCSSVariables() {
    const accent = ACCENTS[_currentAccent];
    const vars = THEME_VARIANTS[_currentVariant] || {};
    let css = `--accent: ${accent.c};\n--adim: ${accent.c}1f;\n`;
    for (const [k, v] of Object.entries(vars)) {
      css += `${k}: ${v};\n`;
    }
    return css;
  }

  function getThemeSnapshot() {
    return {
      accentIdx: _currentAccent,
      accentName: ACCENTS[_currentAccent].name,
      variant: _currentVariant,
      lightMode: isLightMode(),
      fontSize: _currentFontSize,
      fontFamily: _currentFontFamily,
      cornerRadius: _currentRadius,
    };
  }

  function previewAccent(index) {
    const accent = ACCENTS[((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];
    const app = document.getElementById('app');
    if (!app) return;
    app.style.setProperty('--accent', accent.c);
    app.style.setProperty('--adim', accent.c + '1f');
  }

  function resetToDefaults() {
    setAccent(0);
    setLightMode(false);
    setThemeVariant('default');
    setFontSizePreset('normal');
    setFontFamily(0);
    setCornerRadius('normal');
  }

  return {
    setAccent, getAccent, getAccentIndex, getAccentByIndex, cycleAccent,
    setThemeVariant, getThemeVariant, getVariants, getVariantNames,
    setLightMode, isLightMode, toggleLightMode,
    setFontSize, setFontSizePreset, getFontSizePreset,
    setFontFamily, cycleFontFamily, getFontFamily, getFontFamilies,
    setCornerRadius, getCornerRadius,
    getThemeCSS, applyAll, toCSSVariables, getThemeSnapshot,
    previewAccent, resetToDefaults,
    hexToRgb, rgbToHex, lighten, darken, complement,
    getLuminance, contrastRatio, isLight, generateAccentVariants,
    THEME_VARIANTS, FONT_FAMILIES, FONT_SIZES, CORNER_RADII,
  };
})();

export default Themes;
