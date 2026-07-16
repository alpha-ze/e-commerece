import { Link } from 'react-router-dom';
import storeConfig from '../config/store';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a] text-gray-400 mt-8">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="text-white text-2xl font-extrabold tracking-tight">{storeConfig.name}</span>
            <p className="mt-3 text-sm leading-relaxed">
              {storeConfig.tagline}
            </p>
            <div className="flex gap-3 mt-4">
              {/* Social placeholders */}
              {['F', 'T', 'I'].map((s) => (
                <span key={s} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white hover:bg-[#E31E24] cursor-pointer transition-colors">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/products', label: 'All Products' },
                { to: '/products?sort=newest', label: 'New Arrivals' },
                { to: '/products?sort=popularity', label: 'Best Sellers' },
                { to: '/products?sort=price_asc', label: 'Deals & Offers' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white hover:underline transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">My Account</h3>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/profile', label: 'My Profile' },
                { to: '/orders', label: 'Order History' },
                { to: '/wishlist', label: 'Wishlist' },
                { to: '/cart', label: 'Cart' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white hover:underline transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>{storeConfig.location}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📧</span>
                <span>{storeConfig.supportEmail}</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📞</span>
                <span>{storeConfig.supportPhone}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© {year} {storeConfig.name}. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Use</span>
            <span className="hover:text-white cursor-pointer">Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
