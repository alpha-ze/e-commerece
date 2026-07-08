import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProducts, type Product } from '../api/products';
import ProductCard from '../components/ProductCard';

// ── Category icons ──────────────────────────────────────────────────────────

const SHOP_CATEGORIES = [
  { label: 'Mobiles', icon: '📱', to: '/products?categoryId=1' },
  { label: 'Laptops', icon: '💻', to: '/products?categoryId=2' },
  { label: 'TVs', icon: '📺', to: '/products?categoryId=3' },
  { label: 'Tablets', icon: '⌨️', to: '/products?categoryId=4' },
  { label: 'Audio', icon: '🎧', to: '/products?categoryId=5' },
  { label: 'Cameras', icon: '📷', to: '/products?categoryId=6' },
  { label: 'Gaming', icon: '🎮', to: '/products?categoryId=7' },
  { label: 'Accessories', icon: '🔌', to: '/products?categoryId=8' },
];

// ── Hero banner slides ───────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    tag: 'New Arrivals',
    title: 'Latest Electronics',
    subtitle: 'Discover the newest tech at the best prices',
    cta: 'Shop Now',
    to: '/products?sort=newest',
    bg: 'from-[#E31E24] to-[#a01018]',
    accent: 'bg-white/10',
  },
  {
    tag: 'Hot Deals',
    title: 'Up to 40% Off',
    subtitle: 'Limited time offers on top brands',
    cta: 'See Deals',
    to: '/products?sort=price_asc',
    bg: 'from-[#1a1a1a] to-[#333]',
    accent: 'bg-white/5',
  },
  {
    tag: 'Featured',
    title: 'Top Rated Products',
    subtitle: 'Loved by thousands of customers',
    cta: 'Explore',
    to: '/products',
    bg: 'from-[#0a5c99] to-[#073f6b]',
    accent: 'bg-white/10',
  },
];

function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[current];

  return (
    <div className="relative overflow-hidden rounded-none sm:rounded-xl h-56 sm:h-72 lg:h-80">
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-r ${s.bg} transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      <div className="relative z-10 h-full flex items-center px-8 sm:px-14">
        <div className="max-w-lg">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-widest">
            {slide.tag}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">
            {slide.title}
          </h1>
          <p className="text-white/80 text-sm sm:text-base mb-6">{slide.subtitle}</p>
          <button
            onClick={() => navigate(slide.to)}
            className="bg-white text-[#E31E24] font-bold px-6 py-2.5 rounded text-sm hover:bg-gray-100 transition-colors"
          >
            {slide.cta} →
          </button>
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/40'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Feature strips ───────────────────────────────────────────────────────────

function FeatureStrip() {
  const features = [
    { icon: '🚚', title: 'Free Delivery', sub: 'On orders above AED 200' },
    { icon: '🔒', title: 'Secure Payment', sub: '100% secure transactions' },
    { icon: '↩️', title: 'Easy Returns', sub: '14-day return policy' },
    { icon: '💬', title: '24/7 Support', sub: 'Always here to help' },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
      {features.map((f) => (
        <div key={f.title} className="flex items-center gap-3 px-4 py-4">
          <span className="text-2xl">{f.icon}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{f.title}</p>
            <p className="text-xs text-gray-500">{f.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Product skeleton ─────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100 p-4">
        <div className="w-full h-full bg-gray-200 rounded" />
      </div>
      <div className="px-3 pb-4 pt-2 space-y-2">
        <div className="h-2 bg-gray-200 rounded w-1/3" />
        <div className="h-3.5 bg-gray-200 rounded w-full" />
        <div className="h-3.5 bg-gray-200 rounded w-4/5" />
        <div className="h-5 bg-gray-200 rounded w-1/2 mt-3" />
        <div className="h-8 bg-gray-200 rounded mt-2" />
      </div>
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span className="w-1 h-6 bg-[#E31E24] rounded-full" />
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <Link
        to={to}
        className="text-sm font-semibold text-[#E31E24] hover:underline"
      >
        View All →
      </Link>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchProducts({ sort: 'newest', pageSize: 8 }),
      fetchProducts({ sort: 'popularity', pageSize: 8 }),
    ]).then(([newRes, popRes]) => {
      if (cancelled) return;
      setNewest(newRes.data);
      setFeatured(popRes.data);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">

        {/* Hero */}
        <HeroBanner />

        {/* Feature strip */}
        <FeatureStrip />

        {/* Shop by Category */}
        <section>
          <SectionHeader title="Shop by Category" to="/products" />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {SHOP_CATEGORIES.map((cat) => (
              <Link
                key={cat.to}
                to={cat.to}
                className="flex flex-col items-center gap-2 bg-white border border-gray-200 hover:border-[#E31E24] hover:shadow-md rounded-xl p-3 transition-all group"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-700 group-hover:text-[#E31E24] text-center leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* New Arrivals */}
        <section>
          <SectionHeader title="New Arrivals" to="/products?sort=newest" />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : newest.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {newest.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-400">No products yet. Check back soon.</p>
            </div>
          )}
        </section>

        {/* Promotional banner */}
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#333] rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[#E31E24] font-bold uppercase tracking-widest text-sm mb-1">Special Offer</p>
            <h3 className="text-white text-2xl font-extrabold">Get 10% Off Your First Order</h3>
            <p className="text-gray-400 text-sm mt-1">Use code <span className="text-white font-mono font-bold">KADA10</span> at checkout</p>
          </div>
          <Link
            to="/products"
            className="flex-shrink-0 bg-[#E31E24] text-white font-bold px-8 py-3 rounded text-sm hover:bg-[#c41820] transition-colors"
          >
            Shop Now
          </Link>
        </div>

        {/* Popular Products */}
        <section>
          <SectionHeader title="Popular Products" to="/products?sort=popularity" />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : null}
        </section>

      </div>
    </div>
  );
}
