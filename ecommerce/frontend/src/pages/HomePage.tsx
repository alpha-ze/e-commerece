import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProducts, fetchCategories, type Product, type Category } from '../api/products';
import ProductCard from '../components/ProductCard';

// ── Hero banner slides ───────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    tag: 'New Arrivals',
    title: 'Discover What\'s New',
    subtitle: 'Fresh products added every week at unbeatable prices',
    cta: 'Shop Now',
    to: '/products?sort=newest',
    bg: 'from-[#E31E24] to-[#a01018]',
  },
  {
    tag: 'Hot Deals',
    title: 'Up to 40% Off',
    subtitle: 'Limited time offers across all categories',
    cta: 'See Deals',
    to: '/products?sort=price_asc',
    bg: 'from-[#1a1a1a] to-[#333]',
  },
  {
    tag: 'Top Rated',
    title: 'Customer Favourites',
    subtitle: 'Trusted by thousands — shop what people love',
    cta: 'Explore',
    to: '/products',
    bg: 'from-[#0a5c99] to-[#073f6b]',
  },
];

// ── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[current];

  return (
    <div className="relative overflow-hidden rounded-none sm:rounded-xl h-56 sm:h-72 lg:h-80">
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-r ${s.bg} transition-opacity duration-700 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
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
            {slide.cta} &rarr;
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? 'bg-white w-6' : 'bg-white/40 w-2'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Feature strip ────────────────────────────────────────────────────────────

function FeatureStrip() {
  const features = [
    {
      title: 'Free Delivery',
      sub: 'On orders above AED 200',
      icon: (
        <svg className="w-6 h-6 text-[#E31E24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
    {
      title: 'Secure Payment',
      sub: '100% secure transactions',
      icon: (
        <svg className="w-6 h-6 text-[#E31E24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: 'Easy Returns',
      sub: '14-day return policy',
      icon: (
        <svg className="w-6 h-6 text-[#E31E24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
    },
    {
      title: '24/7 Support',
      sub: 'Always here to help',
      icon: (
        <svg className="w-6 h-6 text-[#E31E24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
      {features.map((f) => (
        <div key={f.title} className="flex items-center gap-3 px-4 py-4">
          <div className="flex-shrink-0">{f.icon}</div>
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
      <Link to={to} className="text-sm font-semibold text-[#E31E24] hover:underline">
        View All &rarr;
      </Link>
    </div>
  );
}

// ── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/products?categoryId=${category.id}`}
      className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#E31E24] hover:shadow-md rounded-xl p-4 transition-all group min-h-[80px]"
    >
      {/* Generic folder/tag icon */}
      <svg
        className="w-7 h-7 text-gray-400 group-hover:text-[#E31E24] transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
      <span className="text-xs font-semibold text-gray-700 group-hover:text-[#E31E24] text-center leading-tight">
        {category.name}
      </span>
    </Link>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchProducts({ sort: 'newest', pageSize: 8 }),
      fetchProducts({ sort: 'popularity', pageSize: 8 }),
      fetchCategories(),
    ])
      .then(([newRes, popRes, catRes]) => {
        if (cancelled) return;
        setNewest(newRes.data);
        setPopular(popRes.data);
        setCategories(catRes.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">

        {/* Hero */}
        <HeroBanner />

        {/* Feature strip */}
        <FeatureStrip />

        {/* Shop by Category — loaded from DB */}
        {categories.length > 0 && (
          <section>
            <SectionHeader title="Shop by Category" to="/products" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
              {/* "All Products" tile */}
              <Link
                to="/products"
                className="flex flex-col items-center justify-center gap-2 bg-[#E31E24] hover:bg-[#c41820] border border-transparent rounded-xl p-4 transition-all min-h-[80px]"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-xs font-semibold text-white text-center leading-tight">All Products</span>
              </Link>
            </div>
          </section>
        )}

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
              <p className="text-gray-400 text-sm">No products yet. Check back soon.</p>
            </div>
          )}
        </section>

        {/* Promo banner */}
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#333] rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[#E31E24] font-bold uppercase tracking-widest text-sm mb-1">Special Offer</p>
            <h3 className="text-white text-2xl font-extrabold">Get 10% Off Your First Order</h3>
            <p className="text-gray-400 text-sm mt-1">
              Use code{' '}
              <span className="text-white font-mono font-bold">KADA10</span> at checkout
            </p>
          </div>
          <Link
            to="/products"
            className="flex-shrink-0 bg-[#E31E24] text-white font-bold px-8 py-3 rounded text-sm hover:bg-[#c41820] transition-colors"
          >
            Shop Now
          </Link>
        </div>

        {/* Popular Products */}
        {popular.length > 0 && (
          <section>
            <SectionHeader title="Popular Products" to="/products?sort=popularity" />
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {popular.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
