import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { cart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-xl font-bold text-indigo-600 tracking-tight flex-shrink-0"
          >
            Kada
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/products" className={navLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/wishlist" className={navLinkClass}>
              Wishlist
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </div>

          {/* Desktop right-side actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Cart */}
            <NavLink
              to="/cart"
              className="relative p-1.5 text-gray-600 hover:text-indigo-600 transition-colors"
              aria-label={`Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </NavLink>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NavLink to="/profile" className={navLinkClass}>
                  {user?.email.split('@')[0]}
                </NavLink>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <NavLink
              to="/cart"
              className="relative p-1.5 text-gray-600 hover:text-indigo-600 transition-colors"
              aria-label={`Cart${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </NavLink>

            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="p-1.5 text-gray-600 hover:text-indigo-600 transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-gray-100 py-2 pb-3 space-y-1">
            <NavLink to="/" end className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/products" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
              Shop
            </NavLink>
            <NavLink to="/wishlist" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
              Wishlist
            </NavLink>
            <NavLink to="/profile" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
              Account
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
                Admin
              </NavLink>
            )}

            <div className="pt-2 border-t border-gray-100 mt-2">
              {isAuthenticated ? (
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{user?.email}</span>
                  <button
                    onClick={() => { setMobileOpen(false); logout(); }}
                    className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
