import { formatPrice } from '../utils/formatPrice';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';
import { ShoppingCart, Star, Heart, ArrowRight, ShieldCheck, Truck, RefreshCw, Zap, Award } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useSEO } from '../utils/useSEO';

export const Home = () => {
  const { addToCart, addToWishlist, removeFromWishlist, wishlist, t } = useShop();

  useSEO({
    title: 'TechnikWelt | Ihr Elektronik- & E-Mobilitäts-Fachhändler',
    description: 'Entdecken Sie bei TechnikWelt die neuesten Smartphones, Laptops, TV-Geräte, Audio, Smart Home und E-Mobilität mit 24 Monaten Gewährleistung & 30 Tagen Rückgaberecht.',
    canonical: '/'
  });

  const [activeFilter, setActiveFilter] = useState('Alle');
  const [highlightCategory, setHighlightCategory] = useState('Alle');

  // Top attractive flagship showcase products
  const flagshipHighlights = useMemo(() => {
    const slugs = [
      'apple-iphone-17-pro',
      'samsung-75-crystal-uhd-4k-smart-tv',
      'navee-xt5-ultra-electric-scooter',
      'sony-wf-1000xm5-true-wireless-earbuds',
      'roborock-q-revo-saug-wisch-roboter',
      'apple-macbook-pro-14-m4-pro',
      'anker-solix-balkonkraftwerk-mit-1-6kwh-speicher',
      'dyson-v15-detect-extra-akku-staubsauger'
    ];
    return slugs
      .map(slug => mockProducts.find(p => p.slug === slug))
      .filter((p): p is typeof mockProducts[0] => Boolean(p));
  }, []);

  const filteredHighlights = useMemo(() => {
    if (highlightCategory === 'Alle') return flagshipHighlights;
    if (highlightCategory === 'Smartphones & Laptops') {
      return flagshipHighlights.filter(p => ['Smartphones', 'Computer & Laptops'].includes(p.category));
    }
    if (highlightCategory === 'E-Mobilität & Outdoor') {
      return flagshipHighlights.filter(p => p.category === 'E-Mobilität');
    }
    if (highlightCategory === 'TV & Audio') {
      return flagshipHighlights.filter(p => ['TV & Projektoren', 'Audio'].includes(p.category));
    }
    if (highlightCategory === 'Smart Home & Haushalt') {
      return flagshipHighlights.filter(p => ['Smart Home', 'Haushalt'].includes(p.category));
    }
    return flagshipHighlights;
  }, [highlightCategory, flagshipHighlights]);

  // Curate top discounted deals ordered by discount percentage & rating
  const dealsPool = useMemo(() => {
    return [...mockProducts]
      .filter(p => p.discountPercentage && p.discountPercentage >= 10)
      .sort((a, b) => ((b.discountPercentage || 0) * (b.rating || 4)) - ((a.discountPercentage || 0) * (a.rating || 4)));
  }, []);

  const filteredDeals = useMemo(() => {
    if (activeFilter === 'Alle') {
      return dealsPool.length >= 8 ? dealsPool.slice(0, 8) : mockProducts.slice(0, 8);
    }
    const catDeals = dealsPool.filter(p => p.category === activeFilter);
    return catDeals.length > 0 ? catDeals.slice(0, 8) : mockProducts.filter(p => p.category === activeFilter).slice(0, 8);
  }, [activeFilter, dealsPool]);

  const newArrivals = useMemo(() => {
    return mockProducts.filter(p => p.isNew || p.rating >= 4.9).slice(0, 4);
  }, []);

  const popularCategories = useMemo(() => [
    { id: 'smartphones', name: t('smartphones'), image: new URL('../assets/icons/smartphones.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[125px] w-auto h-auto' },
    { id: 'computer', name: t('computers'), image: new URL('../assets/icons/laptop.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[125px] w-auto h-auto' },
    { id: 'tv-video', name: t('tvVideo'), image: new URL('../assets/icons/Computer & Laptops.webp', import.meta.url).href, imgClasses: 'max-w-[150px] max-h-[120px] w-auto h-auto' },
    { id: 'e-mobility', name: t('eMobility'), image: new URL('../assets/icons/e-mobility.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[130px] w-auto h-auto' },
    { id: 'audio', name: t('audio'), image: new URL('../assets/icons/audio.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[125px] w-auto h-auto' },
    { id: 'smart-home', name: t('smartHome'), image: new URL('../assets/icons/cctv camera.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[125px] w-auto h-auto' },
    { id: 'haushalt', name: t('household'), image: new URL('../assets/icons/Haushalt.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[125px] w-auto h-auto' },
    { id: 'zubehor', name: t('accessories'), image: new URL('../assets/icons/zubehor.webp', import.meta.url).href, imgClasses: 'max-w-[135px] max-h-[125px] w-auto h-auto' }
  ], [t]);

  return (
    <div className="flex-1 bg-white">
      {/* Hero Section with Trust Guarantees */}
      <section className="bg-[#F6F8FB] relative overflow-hidden">
        <div className="container-custom py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center relative z-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-electric-500/10 text-electric-600 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 border border-electric-500/20">
              <Zap size={14} className="fill-electric-500 text-electric-500" />
              <span>Die neuesten Technik-Trends 2026</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-navy-900 leading-[1.15] mb-6 tracking-tight">
              {t('heroTitle')}
            </h1>
            <p className="text-lg text-neutral-600 mb-8 max-w-md leading-relaxed">
              {t('heroSubtitle')}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <Link to="/category/all" className="bg-electric-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                {t('exploreNow')}
              </Link>
              <Link to="/angebote" className="bg-white text-navy-900 border border-neutral-300 px-8 py-3.5 rounded-xl font-semibold hover:bg-neutral-50 transition-colors shadow-sm">
                {t('ourDeals')}
              </Link>
            </div>

            {/* Trust Pillars */}
            <div className="mt-8 pt-6 border-t border-neutral-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-600 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-status-success flex-shrink-0" />
                <span>24 Mon. Gewährleistung</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-status-success flex-shrink-0" />
                <span>Gratis-Versand ab 50 €</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-status-success flex-shrink-0" />
                <span>1-3 Tage Lieferzeit</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-status-success flex-shrink-0" />
                <span>30 Tage Rückgaberecht</span>
              </div>
            </div>
          </div>

          <div className="relative h-[350px] md:h-[450px] w-full flex items-center justify-center">
             <div className="relative w-full h-full max-w-[500px] mx-auto rounded-2xl flex items-center justify-center">
               <img 
                 src={new URL('../assets/icons/products/apple-iphone-17-pro.webp', import.meta.url).href} 
                 className="absolute left-0 bottom-10 w-[35%] object-contain z-30 drop-shadow-2xl" 
                 alt="Apple iPhone 17 Pro Smartphone" 
                 width="175"
                 height="175"
                 loading="eager"
                 decoding="async"
               />
               <img 
                 src={new URL('../assets/icons/products/sony-bravia-4k-tv.webp', import.meta.url).href} 
                 className="absolute right-0 top-[20%] w-[75%] object-contain z-10 drop-shadow-xl" 
                 alt="Sony Bravia 4K Fernseher" 
                 width="375"
                 height="250"
                 loading="eager"
                 fetchPriority="high"
                 decoding="async"
               />
               <img 
                 src={new URL('../assets/icons/products/navee-xt5-ultra-electric-scooter.webp', import.meta.url).href} 
                 className="absolute right-4 bottom-4 w-[45%] object-contain z-20 drop-shadow-2xl" 
                 alt="NAVEE XT5 Ultra E-Scooter" 
                 width="225"
                 height="180"
                 loading="eager"
                 decoding="async"
               />
               <img 
                 src={new URL('../assets/icons/products/sony-wh-1000xm-headphones.webp', import.meta.url).href} 
                 className="absolute left-[20%] top-[10%] w-[30%] object-contain z-20 drop-shadow-2xl" 
                 alt="Sony WH-1000XM Premium Kopfhörer" 
                 width="150"
                 height="150"
                 loading="eager"
                 decoding="async"
               />

               {/* Spotlight Floating Pill */}
               <Link 
                 to="/product/sony-bravia-4k-tv" 
                 className="absolute bottom-2 left-6 z-40 bg-white/95 backdrop-blur-md border border-[#E3E8EF] px-3.5 py-2 rounded-xl shadow-lg hover:border-electric-500 transition-all flex items-center gap-2.5 text-xs text-navy-900 font-semibold group"
               >
                 <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                 <span>Highlight: BRAVIA XR OLED • 3.299 €</span>
                 <ArrowRight size={13} className="text-electric-500 group-hover:translate-x-0.5 transition-transform" />
               </Link>
             </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-12 border-t border-neutral-100">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-navy-900">{t('popularCategories')}</h2>
            <Link to="/category/all" className="text-electric-500 font-medium hover:underline flex items-center gap-1">{t('viewAll')} <ArrowRight size={16}/></Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
            {popularCategories.map(cat => (
              <Link key={cat.id} to={`/category/${cat.id}`} className="flex flex-col bg-white border border-[#E3E8EF] rounded-[20px] hover:border-[#B8CEF5] hover:-translate-y-[3px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200 group h-[270px] w-full overflow-hidden">
                <div className="h-[165px] w-full flex items-center justify-center p-[20px_20px_8px]">
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    loading="lazy" 
                    decoding="async" 
                    width="135" 
                    height="125" 
                    className={`object-contain transition-transform duration-200 group-hover:scale-[1.03] ${cat.imgClasses}`} 
                  />
                </div>
                <div className="flex-1 flex items-center justify-center px-4 pb-4">
                  <span className="text-center text-[#0B1F33] text-[17px] font-medium leading-[1.25]">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEW SECTION: Top Attractive Products & Flagship Highlights */}
      <section className="py-12 bg-white border-t border-neutral-100">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-600 bg-electric-50 px-3 py-1 rounded-full mb-2">
                <Award size={14} />
                <span>Kundenlieblinge & Redaktionsempfehlungen</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900">
                Top-Bestseller & Technik-Highlights
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Handverlesene Premium-Produkte mit geprüfter Qualität, 24 Monaten Gewährleistung und Bestpreis-Garantie.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['Alle', 'Smartphones & Laptops', 'E-Mobilität & Outdoor', 'TV & Audio', 'Smart Home & Haushalt'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHighlightCategory(tab)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    highlightCategory === tab
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredHighlights.map((product) => (
              <div 
                key={product.id} 
                className="border border-[#E3E8EF] rounded-2xl p-4 sm:p-5 flex flex-col hover:border-electric-500 hover:shadow-[0_10px_30px_rgba(15,91,216,0.08)] transition-all duration-300 bg-white relative group h-full"
              >
                {/* Badges */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                  {product.discountPercentage ? (
                    <span className="bg-status-error text-white text-[11px] font-bold px-2.5 py-0.5 rounded shadow-xs">
                      -{product.discountPercentage}%
                    </span>
                  ) : (
                    <span className="bg-navy-900 text-white text-[11px] font-bold px-2.5 py-0.5 rounded shadow-xs">
                      Bestseller
                    </span>
                  )}
                  {product.category === 'E-Mobilität' && (
                    <span className="bg-status-success text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs">
                      StVZO / eKFV
                    </span>
                  )}
                </div>

                {/* Wishlist */}
                <button 
                  className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-status-error transition-colors p-1 rounded-full hover:bg-neutral-50 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    if (wishlist.some(w => w.id === product.id)) {
                      removeFromWishlist(product.id);
                    } else {
                      addToWishlist(product);
                    }
                  }}
                  aria-label={wishlist.some(w => w.id === product.id) ? t('removeFromWishlist') : t('addToWishlist')}
                >
                  <Heart size={20} className={wishlist.some(w => w.id === product.id) ? "fill-status-error text-status-error" : ""} />
                </button>

                {/* Product Image */}
                <Link to={`/product/${product.slug}`} className="mb-4 h-[200px] w-full flex items-center justify-center overflow-hidden bg-neutral-50/50 rounded-xl p-3">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    loading="lazy"
                    decoding="async"
                    width="200"
                    height="180"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Info */}
                <Link to={`/product/${product.slug}`} className="flex flex-col flex-1">
                  <div className="text-xs text-neutral-500 mb-1 font-medium">{product.brand}</div>
                  <h3 className="font-semibold text-navy-900 mb-2 line-clamp-2 min-h-[44px] leading-snug text-sm group-hover:text-electric-500 transition-colors">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => (
                        <Star 
                          key={i} 
                          size={13} 
                          className={i <= Math.round(product.rating) ? "fill-current" : "text-neutral-200 fill-current"} 
                        />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">({product.reviewCount})</span>
                  </div>

                  <div className="mt-auto flex flex-col items-start gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-navy-900">{formatPrice(product.price)}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-neutral-400 line-through">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>
                    <span className="text-xs text-status-success font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span>
                      Auf Lager • 1-3 Werktage
                    </span>
                  </div>
                </Link>

                {/* Add to Cart CTA */}
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(product, 1);
                    }}
                    className="w-full bg-electric-500 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <ShoppingCart size={16} />
                    <span>{t('addToCart')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Deals Section */}
      <section className="py-12 bg-[#F8FAFC] border-t border-neutral-100">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-navy-900">{t('topDeals')}</h2>
              <p className="text-xs text-neutral-500 mt-1">Stark reduzierte Aktionspreise aus unserem gesamten Sortiment.</p>
            </div>
            <Link to="/angebote" className="text-electric-500 font-medium hover:underline flex items-center gap-1 text-sm">{t('viewAll')} <ArrowRight size={16}/></Link>
          </div>
          
          <div className="flex items-center gap-2.5 mb-8 overflow-x-auto pb-2 scrollbar-hide">
             {[
               { id: 'Alle', label: t('allFilter') },
               { id: 'Smartphones', label: t('smartphones') },
               { id: 'Computer & Laptops', label: t('computers') },
               { id: 'E-Mobilität', label: t('eMobility') },
               { id: 'TV & Projektoren', label: t('tvVideo') },
               { id: 'Audio', label: t('audio') },
               { id: 'Smart Home', label: t('smartHome') },
               { id: 'Haushalt', label: t('household') },
               { id: 'Zubehör', label: t('accessories') }
             ].map(filter => (
               <button 
                 key={filter.id}
                 onClick={() => setActiveFilter(filter.id)}
                 className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                   activeFilter === filter.id 
                     ? 'bg-navy-900 text-white shadow-xs' 
                     : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                 }`}
               >
                 {filter.label}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
            {filteredDeals.map((product) => (
              <div key={product.id} className="border border-[#E3E8EF] rounded-2xl p-3.5 sm:p-5 flex flex-col hover:border-[#B8CEF5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 bg-white relative group h-full">
                {product.discountPercentage && (
                  <div className="absolute top-4 left-4 z-10">
                     <span className="bg-status-error text-white text-xs font-bold px-2.5 py-1 rounded">
                       -{product.discountPercentage}%
                     </span>
                  </div>
                )}
                <button 
                  className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-status-error transition-colors cursor-pointer p-1"
                  onClick={(e) => {
                    e.preventDefault();
                    if (wishlist.some(w => w.id === product.id)) {
                      removeFromWishlist(product.id);
                    } else {
                      addToWishlist(product);
                    }
                  }}
                  aria-label={wishlist.some(w => w.id === product.id) ? t('removeFromWishlist') : t('addToWishlist')}
                >
                  <Heart size={20} className={wishlist.some(w => w.id === product.id) ? "fill-status-error text-status-error" : ""} />
                </button>
                <Link to={`/product/${product.slug}`} className="mb-4 h-[180px] w-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    loading="lazy"
                    decoding="async"
                    width="180"
                    height="180"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                  />
                </Link>
                <Link to={`/product/${product.slug}`} className="flex flex-col flex-1">
                  <div className="text-xs text-neutral-500 mb-1 font-medium">{product.brand}</div>
                  <h3 className="font-semibold text-navy-900 mb-2 line-clamp-2 min-h-[44px] leading-snug text-sm">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} size={13} className={i <= Math.round(product.rating) ? "fill-current" : "text-neutral-200 fill-current"} />)}
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">({product.reviewCount})</span>
                  </div>
                  <div className="mt-auto flex flex-col items-start gap-1">
                    <div className="flex items-baseline gap-2">
                       <span className="text-xl font-bold text-navy-900">{formatPrice(product.price)}</span>
                       {product.originalPrice && (
                         <span className="text-xs text-neutral-400 line-through">{formatPrice(product.originalPrice)}</span>
                       )}
                    </div>
                    <span className="text-xs text-status-success font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span> {t('inStock')}
                    </span>
                  </div>
                </Link>
                
                <div className="mt-4">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(product, 1);
                    }}
                    className="w-full bg-white border-2 border-electric-500 text-electric-500 hover:bg-electric-500 hover:text-white py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                  >
                    <ShoppingCart size={16} /> {t('addToCart')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals & Trends */}
      <section className="py-12 bg-white border-t border-neutral-100">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-navy-900">Neu eingetroffen & Trends</h2>
              <p className="text-xs text-neutral-500 mt-1">Die neuesten Highlights aus E-Mobilität, Gaming, Smart Home & Profi-Technik.</p>
            </div>
            <Link to="/category/all?sort=Neueste" className="text-electric-500 font-medium hover:underline flex items-center gap-1 text-sm">
              Alle Neuheiten <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
            {newArrivals.map((product) => (
              <div key={product.id} className="border border-[#E3E8EF] rounded-2xl p-3.5 sm:p-5 flex flex-col hover:border-[#B8CEF5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 bg-white relative group h-full">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-electric-500 text-white text-xs font-bold px-2.5 py-1 rounded shadow-xs">
                    {t('newBadge')}
                  </span>
                </div>
                <button 
                  className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-status-error transition-colors cursor-pointer p-1"
                  onClick={(e) => {
                    e.preventDefault();
                    if (wishlist.some(w => w.id === product.id)) {
                      removeFromWishlist(product.id);
                    } else {
                      addToWishlist(product);
                    }
                  }}
                  aria-label={wishlist.some(w => w.id === product.id) ? t('removeFromWishlist') : t('addToWishlist')}
                >
                  <Heart size={20} className={wishlist.some(w => w.id === product.id) ? "fill-status-error text-status-error" : ""} />
                </button>
                <Link to={`/product/${product.slug}`} className="mb-4 h-[180px] w-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    loading="lazy"
                    decoding="async"
                    width="180"
                    height="180"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                  />
                </Link>
                <Link to={`/product/${product.slug}`} className="flex flex-col flex-1">
                  <div className="text-xs text-neutral-500 mb-1 font-medium">{product.brand}</div>
                  <h3 className="font-semibold text-navy-900 mb-2 line-clamp-2 min-h-[44px] leading-snug text-sm">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} size={13} className={i <= Math.round(product.rating) ? "fill-current" : "text-neutral-200 fill-current"} />)}
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">({product.reviewCount})</span>
                  </div>
                  <div className="mt-auto flex flex-col items-start gap-1">
                    <span className="text-xl font-bold text-navy-900">{formatPrice(product.price)}</span>
                    <span className="text-xs text-status-success font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span> {t('inStock')}
                    </span>
                  </div>
                </Link>
                <div className="mt-4">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(product, 1);
                    }}
                    className="w-full bg-white border-2 border-electric-500 text-electric-500 hover:bg-electric-500 hover:text-white py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                  >
                    <ShoppingCart size={16} /> {t('addToCart')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Category Promo Banners */}
      <section className="py-12 pb-20 bg-white">
        <div className="container-custom grid md:grid-cols-3 gap-6">
           <Link to="/category/e-mobility" className="bg-[#F6F8FB] rounded-[24px] p-8 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[220px] group cursor-pointer border border-[#E3E8EF] hover:border-[#B8CEF5] transition-colors">
              <div className="relative z-20 w-full md:w-1/2 flex flex-col items-start">
                <span className="text-xs font-bold text-electric-600 bg-electric-50 px-2.5 py-1 rounded-md mb-2">Straßenzulassung ABE</span>
                <h3 className="text-navy-900 text-2xl font-bold mb-1">E-Mobilität</h3>
                <p className="text-neutral-600 text-sm mb-4 font-medium leading-snug">Freiheit auf zwei Rädern mit bis zu 65 km Reichweite.</p>
                <span className="bg-white text-navy-900 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-electric-500 hover:text-white transition-colors border border-neutral-200 group-hover:border-transparent">Jetzt entdecken</span>
              </div>
              <div className="absolute right-[-10%] md:right-[-5%] top-1/2 -translate-y-1/2 w-[60%] h-full flex items-center justify-center p-4">
                <img 
                  src={new URL('../assets/icons/products/navee-xt5-ultra-electric-scooter.webp', import.meta.url).href} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                  alt="NAVEE XT5 Ultra E-Scooter mit ABE" 
                  loading="lazy"
                  width="220"
                  height="180"
                />
              </div>
           </Link>
           
           <Link to="/category/tv-video" className="bg-[#F6F8FB] rounded-[24px] p-8 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[220px] group cursor-pointer border border-[#E3E8EF] hover:border-[#B8CEF5] transition-colors">
              <div className="relative z-20 w-full md:w-1/2 flex flex-col items-start">
                <span className="text-xs font-bold text-electric-600 bg-electric-50 px-2.5 py-1 rounded-md mb-2">Cinema 4K HDR</span>
                <h3 className="text-navy-900 text-2xl font-bold mb-1">TV & Heimkino</h3>
                <p className="text-neutral-600 text-sm mb-4 font-medium leading-snug">OLED Bildqualität & echtes Kinoerlebnis zu Hause.</p>
                <span className="bg-white text-navy-900 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-electric-500 hover:text-white transition-colors border border-neutral-200 group-hover:border-transparent">Zur Auswahl</span>
              </div>
              <div className="absolute right-[-10%] md:right-[-10%] top-1/2 -translate-y-1/2 w-[65%] h-full flex items-center justify-center p-4">
                <img 
                  src={new URL('../assets/icons/products/lg-oled-55-tv.webp', import.meta.url).href} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                  alt="LG OLED 55 Zoll 4K Smart TV" 
                  loading="lazy"
                  width="240"
                  height="180"
                />
              </div>
           </Link>

           <Link to="/category/smartphones" className="bg-[#F6F8FB] rounded-[24px] p-8 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[220px] group cursor-pointer border border-[#E3E8EF] hover:border-[#B8CEF5] transition-colors">
              <div className="relative z-20 w-full md:w-1/2 flex flex-col items-start">
                <span className="text-xs font-bold text-electric-600 bg-electric-50 px-2.5 py-1 rounded-md mb-2">Flaggschiff-Technik</span>
                <h3 className="text-navy-900 text-2xl font-bold mb-1">Smartphones</h3>
                <p className="text-neutral-600 text-sm mb-4 font-medium leading-snug">Apple, Samsung & Google mit Titanium-Design & 5G.</p>
                <span className="bg-white text-navy-900 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-electric-500 hover:text-white transition-colors border border-neutral-200 group-hover:border-transparent">Jetzt entdecken</span>
              </div>
              <div className="absolute right-[0%] md:right-[-5%] top-1/2 -translate-y-1/2 w-[55%] h-[80%] flex items-center justify-center p-2">
                <img 
                  src={new URL('../assets/icons/products/apple-iphone-17-pro.webp', import.meta.url).href} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                  alt="Apple iPhone 17 Pro Flaggschiff-Smartphone" 
                  loading="lazy"
                  width="180"
                  height="180"
                />
              </div>
           </Link>
        </div>
      </section>
    </div>
  );
};
