import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, fetchCategories } from '../api/products';
import type { Product, Category, PaginationMeta } from '../api/products';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import storeConfig from '../config/store';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Popularity' },
];

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24" aria-label="Loading products">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        {hasFilters ? 'No products match your filters' : 'No products found'}
      </h3>
      <p className="text-sm text-gray-500">
        {hasFilters ? 'Try adjusting or clearing your filters to see more results.' : 'Check back later for new products.'}
      </p>
    </div>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQ = searchParams.get('q') ?? '';
  const urlCategory = searchParams.get('categoryId') ?? '';
  const urlMinPrice = searchParams.get('minPrice') ?? '';
  const urlMaxPrice = searchParams.get('maxPrice') ?? '';
  const urlSort = searchParams.get('sort') ?? 'newest';
  const urlPage = parseInt(searchParams.get('page') ?? '1', 10);

  const [searchInput, setSearchInput] = useState(urlQ);
  const [minPriceInput, setMinPriceInput] = useState(urlMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(urlMaxPrice);
  const [categoryInput, setCategoryInput] = useState(urlCategory);

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) => { if (v) { next.set(k, v); } else { next.delete(k); } });
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    fetchCategories().then((res) => setCategories(res.data)).catch(() => { setCategories([]); });
  }, []);

  useEffect(() => { setSearchInput(urlQ); }, [urlQ]);

  useEffect(() => {
    setMinPriceInput(urlMinPrice);
    setMaxPriceInput(urlMaxPrice);
    setCategoryInput(urlCategory);
  }, [urlMinPrice, urlMaxPrice, urlCategory]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchProducts({
          page: urlPage, pageSize: PAGE_SIZE,
          q: urlQ || undefined, categoryId: urlCategory || undefined,
          minPrice: urlMinPrice || undefined, maxPrice: urlMaxPrice || undefined, sort: urlSort,
        });
        if (!cancelled) { setProducts(res.data); setPagination(res.pagination); }
      } catch {
        if (!cancelled) { setError('Failed to load products. Please try again.'); setProducts([]); setPagination(null); }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [urlPage, urlQ, urlCategory, urlMinPrice, urlMaxPrice, urlSort]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { updateParams({ q: value, page: '' }); }, 300);
  }

  function handleCategoryChange(value: string) {
    setCategoryInput(value);
    updateParams({ categoryId: value, page: '' });
  }

  function handleApplyFilters() {
    updateParams({ minPrice: minPriceInput, maxPrice: maxPriceInput, page: '' });
  }

  function handleClearFilters() {
    setSearchInput(''); setCategoryInput(''); setMinPriceInput(''); setMaxPriceInput('');
    setSearchParams({});
  }

  function handleSortChange(value: string) { updateParams({ sort: value, page: '' }); }

  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

  function goToPage(page: number) {
    updateParams({ page: String(page) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const hasFilters = !!(urlQ || urlCategory || urlMinPrice || urlMaxPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="All Products"
        description={`Browse all products at ${storeConfig.name}. Find great deals across all categories.`}
        url="/products"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          {pagination && (
            <p className="text-sm text-gray-500 mt-1">
              {pagination.total} {pagination.total === 1 ? 'product' : 'products'} found
            </p>
          )}
        </div>
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="search" value={searchInput} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search products…" aria-label="Search products"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors bg-white" />
          </div>
        </div>
        <div className="flex gap-6 items-start">
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-6 sticky top-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Filters</h2>
              <div>
                <label htmlFor="category-filter" className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                <select id="category-filter" value={categoryInput} onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white">
                  <option value="">All categories</option>
                  {categories.map((cat) => (<option key={cat.id} value={String(cat.id)}>{cat.name}</option>))}
                </select>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1.5">Price range</span>
                <div className="flex gap-2">
                  <input type="number" min="0" value={minPriceInput} onChange={(e) => setMinPriceInput(e.target.value)}
                    placeholder="Min" aria-label="Minimum price"
                    className="w-1/2 rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                  <input type="number" min="0" value={maxPriceInput} onChange={(e) => setMaxPriceInput(e.target.value)}
                    placeholder="Max" aria-label="Maximum price"
                    className="w-1/2 rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                </div>
                <button onClick={handleApplyFilters}
                  className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors">
                  Apply
                </button>
              </div>
              {hasFilters && (
                <button onClick={handleClearFilters} className="w-full text-sm text-indigo-600 hover:text-indigo-500 font-medium text-left">
                  Clear all filters
                </button>
              )}
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                <select value={urlSort} onChange={(e) => handleSortChange(e.target.value)} aria-label="Sort products"
                  className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white">
                  {SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              {pagination && (
                <span className="text-sm text-gray-500 whitespace-nowrap">Page {urlPage} of {totalPages}</span>
              )}
            </div>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {loading ? (
              <LoadingSpinner />
            ) : products.length === 0 ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((product) => (<ProductCard key={product.id} product={product} />))}
              </div>
            )}
            {!loading && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button onClick={() => goToPage(urlPage - 1)} disabled={urlPage <= 1} aria-label="Previous page"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let page: number;
                    if (totalPages <= 5) { page = i + 1; }
                    else if (urlPage <= 3) { page = i + 1; }
                    else if (urlPage >= totalPages - 2) { page = totalPages - 4 + i; }
                    else { page = urlPage - 2 + i; }
                    return (
                      <button key={page} onClick={() => goToPage(page)} aria-label={`Page ${page}`}
                        aria-current={page === urlPage ? 'page' : undefined}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          page === urlPage ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}>
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => goToPage(urlPage + 1)} disabled={urlPage >= totalPages} aria-label="Next page"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
