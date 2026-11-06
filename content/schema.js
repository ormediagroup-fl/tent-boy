export const REQUIRED_DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases.';
export function httpsUrl(value, kind = 'social') {
  try {
    const u = new URL(value), h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
    if (kind === 'amazon') return h === 'link.amazon' || h === 'amzn.to' || /(^|\.)amazon\.(com|ca|co\.uk|com\.au|de|fr|it|es|co\.jp|in)$/.test(h);
    if (kind === 'payhip') return h === 'payhip.com' || h.endsWith('.payhip.com');
    return true;
  } catch { return false; }
}
export function imagePath(value) { return !value || /^assets\/[a-zA-Z0-9_/-]+\.(jpg|jpeg|png|webp)$/i.test(value) && !value.includes('..'); }
export function validate(data) {
  const errors = [], check = (ok, message) => { if (!ok) errors.push(message); };
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.products) || !data.home || !data.guide) return ['Invalid content structure.'];
  check(data.products.length <= 500 && data.categories.length <= 50, 'Maximum 500 products and 50 categories.');
  const ids = new Set();
  for (const c of data.categories) { check(typeof c.id === 'string' && /^[a-z0-9-]{1,80}$/.test(c.id) && !ids.has(c.id), 'Categories need unique IDs.'); ids.add(c.id); check(typeof c.name === 'string' && c.name.trim().length > 0 && c.name.length <= 100, 'Category name is required (100 characters maximum).'); }
  const productIds = new Set();
  for (const p of data.products) {
    check(typeof p.id === 'string' && /^[a-z0-9-]{1,80}$/.test(p.id) && !productIds.has(p.id), 'Products need unique IDs.'); productIds.add(p.id);
    check(typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 350, 'Product name is required (350 characters maximum).');
    check(typeof p.description === 'string' && p.description.length <= 3000, 'Product descriptions must be under 3,000 characters.');
    check(ids.has(p.category), `Choose an existing category for ${p.name || 'each product'}.`);
    check(typeof p.published === 'boolean' && typeof p.featured === 'boolean', 'Product visibility and featured values must be switches.');
    check(!p.url && !p.published || httpsUrl(p.url, 'amazon'), `Enter a valid HTTPS Amazon affiliate URL for ${p.name || 'the product'}.`);
    check(imagePath(p.image), 'Product image must be an uploaded JPG, PNG or WebP.');
    check(!p.image || typeof p.alt === 'string' && p.alt.trim().length > 0, 'Add descriptive image text for each product photo.');
  }
  for (const key of ['headline','intro','gearHeadline','gearIntro','setupHeadline','setupDescription','note','heroCaption','stamp','ticker']) check(typeof data.home[key] === 'string' && data.home[key].length <= 4000, `Invalid homepage ${key}.`);
  check(data.home.headline?.trim() && data.home.intro?.trim(), 'Homepage headline and introduction are required.');
  check(imagePath(data.home.heroImage) && !!data.home.heroImage && !!data.home.heroAlt?.trim(), 'Hero needs an uploaded image and descriptive image text.');
  check(typeof data.disclosure === 'string' && data.disclosure.length <= 3000, 'Disclosure must be under 3,000 characters.');
  check(typeof data.guide.visible === 'boolean', 'Guide visibility must be a switch.');
  check(typeof data.guide.title === 'string' && typeof data.guide.description === 'string', 'Guide title and description must be text.');
  check(!data.guide.visible || !!data.guide.title?.trim() && httpsUrl(data.guide.url, 'payhip'), 'Visible guide needs a title and valid HTTPS Payhip URL.');
  check(!data.guide.url || httpsUrl(data.guide.url, 'payhip'), 'Use a valid HTTPS Payhip URL.');
  check(typeof data.guide.price === 'string' && data.guide.price.length <= 50, 'Guide price must be display text, e.g. a currency and amount, or blank.');
  check(imagePath(data.guide.cover), 'Guide cover must be an uploaded JPG, PNG or WebP.');
  check(!data.guide.cover || !!data.guide.coverAlt?.trim(), 'Guide cover needs descriptive image text.');
  check(Array.isArray(data.socials) && data.socials.length <= 20, 'Maximum 20 social links.');
  for (const s of data.socials || []) check(typeof s.label === 'string' && !!s.label.trim() && httpsUrl(s.url), 'Social links need a label and HTTPS URL.');
  return errors;
}
export function publishedCatalog(data) {
  return data.categories.map(c => ({ ...c, products: data.products.filter(p => p.published && p.category === c.id) })).filter(c => c.products.length);
}
export function publicContent(data) { return {...data, products:data.products.filter(p=>p.published), categories:publishedCatalog(data).map(({products,...c})=>c), guide:data.guide.visible?data.guide:{visible:false}}; }
