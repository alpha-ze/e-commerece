/**
 * Store configuration — edit this file to customise for each shop deployment.
 * No code changes needed anywhere else.
 */
const storeConfig = {
  // ── Branding ──────────────────────────────────────────────────────────────
  name: 'Kada',
  tagline: 'Quality products at unbeatable prices',

  // ── Currency ──────────────────────────────────────────────────────────────
  // Change to: 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', etc.
  currency: 'AED',

  // ── Primary brand color (used in navbar, buttons, accents) ────────────────
  // Change to any hex color, e.g. '#2563EB' for blue, '#16A34A' for green
  primaryColor: '#E31E24',

  // ── Free delivery threshold ───────────────────────────────────────────────
  freeDeliveryThreshold: 200,

  // ── Contact ───────────────────────────────────────────────────────────────
  supportEmail: 'support@kada.ae',
  supportPhone: '+971 4 000 0000',
  location: 'Dubai, United Arab Emirates',

  // ── Features ─────────────────────────────────────────────────────────────
  // Set to false to hide features you don't need
  showWishlist: true,
  showReviews: true,
  showCoupons: true,
} as const;

export default storeConfig;
