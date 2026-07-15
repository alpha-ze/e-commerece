import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { fetchCategories, type Category } from '../api/products';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* ── Top utility bar ─────────────────────────────────────────── */}
      <div className="bg-[#1a1a1a] text-gray-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          <span className="hidden sm:block">Free delivery on orders above AED 200</span>
          <div className="flex items-center gap-4">
            <Link to="/orders" className="hover:text-white transition-colors">Track Order</Link>
            {isAdmin && (
              <Link to="/admin" className="hover:text-white transition-colors text-red-400">Admin Panel</Link>
            )}
            {isAuthenticated ? (
              <button onClick={logout} className="hover:text-white transition-colors">Sign Out</button>
            ) : (
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Main navbar ─────────────────────────────────────────────── */}
      <div className="bg-[#E31E24]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <span className="text-white text-2xl font-extrabold tracking-tight">Kada</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:flex">
            <div className="flex w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more..."
                className="flex-1 px-4 py-2 text-sm text-gray-900 bg-white rounded-l-md focus:outline-none placeholder-gray-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-black text-white rounded-r-md transition-colors"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Right icons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Account */}
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="flex flex-col items-center p-2 text-white hover:bg-red-700 rounded transition-colors"
              aria-label="Account"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[10px] hidden sm:block">
                {isAuthenticated ? (user?.email.split('@')[0] ?? 'Account') : 'Sign In'}
              </span>
            </Link>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="flex flex-col items-center p-2 text-white hover:bg-red-700 rounded transition-colors"
              aria-label="Wishlist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-[10px] hidden sm:block">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex flex-col items-center p-2 text-white hover:bg-red-700 rounded transition-colors"
              aria-label={`Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-[10px] hidden sm:block">Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-[#1a1a1a] text-white text-[9px] font-bold flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((p) => !p)}
              className="sm:hidden p-2 text-white hover:bg-red-700 rounded transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Category bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <NavLink
              to="/products"
              end
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#E31E24] text-[#E31E24]'
                    : 'border-transparent text-gray-600 hover:text-[#E31E24] hover:border-[#E31E24]'
                }`
              }
            >
              All Products
            </NavLink>
            {categories.map((cat) => (
              <NavLink
                key={cat.id}
                to={`/products?categoryId=${cat.id}`}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#E31E24] text-[#E31E24]'
                      : 'border-transparent text-gray-600 hover:text-[#E31E24] hover:border-[#E31E24]'
                  }`
                }
              >
                {cat.name}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 shadow-lg">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="p-3 border-b border-gray-100">
            <div className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button type="submit" className="px-3 py-2 bg-[#E31E24] text-white rounded-r-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
          {/* Mobile nav links */}
          <nav className="py-2">
            <Link
              to="/products"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-[#E31E24] transition-colors"
            >
              All Products
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?categoryId=${cat.id}`}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-[#E31E24] transition-colors"
              >
                {cat.name}
              </Link>
            ))}
            <Link to="/orders" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-[#E31E24] transition-colors border-t border-gray-100 mt-1">
              My Orders
            </Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors">
                Admin Panel
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
