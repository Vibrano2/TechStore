import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Search, Menu, Truck, ShieldCheck, CreditCard, RefreshCw, LogOut, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { mockProducts } from '../../data/mockProducts';
import { formatPrice } from '../../utils/formatPrice';
import { LANGUAGES, type Language } from '../../i18n/translations';
import logoSvg from '../../assets/SVG/logo.svg';

const AuthModal = lazy(() => import('../auth/AuthModal').then(m => ({ default: m.AuthModal })));
const ChatbotWidget = lazy(() => import('../chat/ChatbotWidget').then(m => ({ default: m.ChatbotWidget })));
const CookieConsent = lazy(() => import('../common/CookieConsent').then(m => ({ default: m.CookieConsent })));
const PromoPopup = lazy(() => import('../common/PromoPopup').then(m => ({ default: m.PromoPopup })));

const CURRENT_YEAR = new Date().getFullYear();

export const Layout = () => {
  const { cartCount, wishlist, language, setLanguage, t } = useShop();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const matchingProducts = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase();
    return mockProducts.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    ).slice(0, 6);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsSearchOpen(false);
      navigate(`/category/all?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Announcement Bar */}
      <div className="bg-white border-b border-neutral-200 text-neutral-600 text-xs py-2">
        <div className="container-custom flex justify-between items-center">
          <div className="hidden md:flex items-center gap-6">
            <span className="flex items-center gap-2"><Truck size={14} /> {t('shippingNotice')}</span>
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> {t('warrantyNotice')}</span>
            <span className="flex items-center gap-2"><CreditCard size={14} /> {t('securePayment')}</span>
            <span className="flex items-center gap-2"><RefreshCw size={14} /> {t('returnPolicy')}</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-electric-500">
              <span role="img" aria-label="Flag">
                {LANGUAGES.find(l => l.code === language)?.flag || '🇩🇪'}
              </span> 
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)} 
                className="bg-transparent border-none outline-none font-medium cursor-pointer text-xs"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="text-navy-900 bg-white">
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="border-l border-neutral-300 h-4"></span>
            <div className="flex items-center gap-1 cursor-pointer hover:text-electric-500 font-medium">
              € EUR
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-neutral-100">
        <div className="container-custom py-4 flex items-center justify-between gap-6 md:gap-10">
          {/* Mobile Menu & Logo */}
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-neutral-900 p-1 hover:text-electric-500 transition-colors"
              aria-label="Kategorien anzeigen"
              onClick={() => navigate('/category/all')}
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="text-2xl md:text-[28px] font-bold text-navy-900 tracking-tight flex items-center gap-2.5 group">
              <img 
                src={logoSvg} 
                alt="TechnikWelt Logo" 
                className="w-9 h-9 object-contain transition-transform duration-200 group-hover:scale-105" 
                width="36" 
                height="36" 
              />
              <span>TechnikWelt<span className="text-electric-500">.</span></span>
            </Link>
          </div>

          {/* Desktop Search */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <input 
                type="text" 
                placeholder={t('searchPlaceholder')} 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-5 pr-14 py-3 rounded-full border border-[#E3E8EF] focus:outline-none focus:border-electric-500 focus:ring-4 focus:ring-electric-500/10 bg-[#F6F8FB] focus:bg-white transition-all text-sm font-medium" 
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }}
                  className="absolute right-12 top-3 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={18} />
                </button>
              )}
              <button 
                type="submit" 
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-electric-500 text-white w-10 rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
              >
                <Search size={18} />
              </button>
            </form>

            {/* Instant Search Results Dropdown */}
            {isSearchOpen && matchingProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50">
                <div className="p-3 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs font-semibold text-neutral-500">
                  <span>{t('matchingProducts')} ({matchingProducts.length})</span>
                  <span className="text-electric-500 font-medium">{t('instantSearch')}</span>
                </div>
                <div className="divide-y divide-neutral-100 max-h-[380px] overflow-y-auto">
                  {matchingProducts.map(p => (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-neutral-100 p-1 shrink-0 flex items-center justify-center">
                        <img src={p.images[0]} alt={p.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-navy-900 group-hover:text-electric-500 truncate transition-colors">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <span>{p.brand}</span>
                          <span>•</span>
                          <span>{p.category}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm text-navy-900">{formatPrice(p.price)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-center">
                  <button
                    onClick={handleSearchSubmit}
                    className="text-xs font-semibold text-electric-500 hover:text-blue-700 transition-colors"
                  >
                    {t('viewAllResults')} ({searchTerm}) →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-5 md:gap-7">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="hidden md:flex flex-col items-center gap-1 text-navy-900 hover:text-electric-500 transition-colors"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-electric-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {user?.first_name ? user.first_name[0].toUpperCase() : user?.email[0].toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider max-w-[70px] truncate">
                    {user?.first_name || 'Konto'}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-xs text-neutral-500">{t('signedInAs')}</p>
                      <p className="text-xs font-bold text-navy-900 truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-navy-900 hover:bg-neutral-50 transition-colors"
                    >
                      <User size={14} />
                      {t('myAccount')}
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-status-error hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut size={14} />
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('signin')}
                className="hidden md:flex flex-col items-center gap-1 text-neutral-600 hover:text-electric-500 transition-colors"
              >
                <User size={22} strokeWidth={2.5} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{t('signIn')}</span>
              </button>
            )}
            <Link to="/wishlist" className="hidden md:flex flex-col items-center gap-1 text-neutral-600 hover:text-electric-500 transition-colors relative">
              <div className="relative">
                <Heart size={22} strokeWidth={2.5} />
                {wishlist.length > 0 && <span className="absolute -top-2 -right-2.5 bg-status-error text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm">{wishlist.length}</span>}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider">{t('wishlist')}</span>
            </Link>
            <Link to="/cart" className="flex flex-col items-center gap-1 text-neutral-600 hover:text-electric-500 transition-colors relative">
              <div className="relative">
                <ShoppingCart size={22} strokeWidth={2.5} />
                {cartCount > 0 && <span className="absolute -top-2 -right-2.5 bg-status-error text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm">{cartCount}</span>}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider hidden md:block">{t('cart')}</span>
            </Link>
          </div>
        </div>

        {/* Desktop Categories */}
        <div className="bg-navy-900 hidden md:block border-t border-navy-800">
          <div className="container-custom">
            <nav className="flex items-center text-[14px] font-semibold text-white/90 overflow-x-auto scrollbar-hide">
              <Link to="/category/all" className="flex items-center gap-2 py-3.5 px-4 lg:px-5 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"><Menu size={18} /> {t('allCategories')}</Link>
              <Link to="/category/smartphones" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('smartphones')}</Link>
              <Link to="/category/computer" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('computers')}</Link>
              <Link to="/category/gaming" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('gaming')}</Link>
              <Link to="/category/tv-video" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('tvVideo')}</Link>
              <Link to="/category/audio" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('audio')}</Link>
              <Link to="/category/e-mobility" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('eMobility')}</Link>
              <Link to="/category/smart-home" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('smartHome')}</Link>
              <Link to="/category/haushalt" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('household')}</Link>
              <Link to="/category/recovery" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('recovery')}</Link>
              <Link to="/category/zubehor" className="py-3.5 px-3 lg:px-4 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">{t('accessories')}</Link>
              <div className="flex-1 min-w-[1rem]"></div>
              <Link to="/angebote" className="py-3.5 px-4 lg:px-5 text-status-error hover:text-red-400 hover:bg-white/5 transition-colors whitespace-nowrap flex items-center gap-1 shrink-0">{t('deals')}</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-neutral-50">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-navy-900 text-neutral-200 pt-16 pb-24 md:pb-8">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 border-b border-navy-800 pb-12 mb-8">
            <div>
              <Link to="/" className="text-white text-2xl font-bold mb-6 tracking-tight flex items-center gap-2.5 group">
                <div className="w-8 h-8 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <img 
                    src={logoSvg} 
                    alt="TechnikWelt Logo" 
                    className="w-full h-full object-contain" 
                    width="24" 
                    height="24" 
                  />
                </div>
                <span>TechnikWelt<span className="text-electric-500">.</span></span>
              </Link>
              <p className="text-sm text-neutral-400 leading-relaxed pr-4">
                Moderne Technologie. Klar erklärt. Zuverlässig geliefert. Ihr Premium-Elektronikhändler in Deutschland.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-5 text-[15px] tracking-wide">{t('categories')}</h4>
              <ul className="space-y-3 text-sm text-neutral-400 font-medium">
                <li><Link to="/category/smartphones" className="hover:text-electric-500 transition-colors">{t('smartphones')}</Link></li>
                <li><Link to="/category/computer" className="hover:text-electric-500 transition-colors">{t('computers')}</Link></li>
                <li><Link to="/category/gaming" className="hover:text-electric-500 transition-colors">{t('gaming')}</Link></li>
                <li><Link to="/category/tv-video" className="hover:text-electric-500 transition-colors">{t('tvVideo')}</Link></li>
                <li><Link to="/category/e-mobility" className="hover:text-electric-500 transition-colors">{t('eMobility')}</Link></li>
                <li><Link to="/category/recovery" className="hover:text-electric-500 transition-colors">{t('recovery')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-5 text-[15px] tracking-wide">Kundenservice</h4>
              <ul className="space-y-3 text-sm text-neutral-400 font-medium">
                <li><Link to="/account/orders" className="hover:text-electric-500 transition-colors">Bestellungen</Link></li>
                <li><Link to="/account/returns" className="hover:text-electric-500 transition-colors">Rücksendungen</Link></li>
                <li><Link to="/warranty" className="hover:text-electric-500 transition-colors">Garantie</Link></li>
                <li><Link to="/contact" className="hover:text-electric-500 transition-colors">Kontakt</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-5 text-[15px] tracking-wide">Rechtliches</h4>
              <ul className="space-y-3 text-sm text-neutral-400 font-medium">
                <li><Link to="/impressum" className="hover:text-electric-500 transition-colors">Impressum</Link></li>
                <li><Link to="/datenschutz" className="hover:text-electric-500 transition-colors">Datenschutzerklärung</Link></li>
                <li><Link to="/agb" className="hover:text-electric-500 transition-colors">AGB</Link></li>
                <li><Link to="/widerruf" className="hover:text-electric-500 transition-colors">Widerrufsbelehrung</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-neutral-500 font-medium">
            <p>&copy; {CURRENT_YEAR} {t('copyright')}</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span>Preise inkl. gesetzlicher MwSt.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-4 z-50">
        <div className="flex justify-between items-center text-xs text-neutral-500">
          <Link to="/" className="flex flex-col items-center hover:text-electric-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Start</span>
          </Link>
          <Link to="/category/all" className="flex flex-col items-center hover:text-electric-500">
            <Menu size={20} className="mb-1" />
            <span>{t('allCategories')}</span>
          </Link>
          <Link to="/wishlist" className="flex flex-col items-center hover:text-electric-500 relative">
            <Heart size={20} className="mb-1" />
            {wishlist.length > 0 && (
                <span className="absolute -top-1 right-1 bg-electric-500 text-white text-[10px] w-3 h-3 flex items-center justify-center rounded-full">
                  {wishlist.length}
                </span>
            )}
            <span>{t('wishlist')}</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center hover:text-electric-500 relative">
            <ShoppingCart size={20} className="mb-1" />
            {cartCount > 0 && (
                <span className="absolute -top-1 right-1 bg-electric-500 text-white text-[10px] w-3 h-3 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
            )}
            <span>{t('cart')}</span>
          </Link>
          {isAuthenticated ? (
            <Link to="/account" className="flex flex-col items-center hover:text-electric-500">
              <User size={20} className="mb-1" />
              <span>{t('myAccount')}</span>
            </Link>
          ) : (
            <button onClick={() => openAuthModal('signin')} className="flex flex-col items-center hover:text-electric-500">
              <User size={20} className="mb-1" />
              <span>{t('signIn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-critical Global Widgets (Async & Non-blocking) */}
      <Suspense fallback={null}>
        <ChatbotWidget />
        <AuthModal />
        <CookieConsent />
        <PromoPopup />
      </Suspense>
    </div>
  );
};
