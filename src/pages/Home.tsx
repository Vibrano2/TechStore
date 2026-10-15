import { formatPrice } from '../utils/formatPrice';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';
import { ShoppingCart, Star, Heart, ArrowRight } from 'lucide-react';
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

  const dealsPool = useMemo(() => mockProducts.filter(p => p.discountPercentage), []);
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
      <section className="bg-[#F6F8FB] relative overflow-hidden">
        <div className="container-custom py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center relative z-10">
          <div className="max-w-xl">
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
             </div>
          </div>
        </div>
      </section>

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

      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-navy-900">{t('topDeals')}</h2>
            <Link to="/angebote" className="text-electric-500 font-medium hover:underline flex items-center gap-1">{t('viewAll')} <ArrowRight size={16}/></Link>
          </div>
          
          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
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
                 className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                   activeFilter === filter.id 
                     ? 'bg-navy-900 text-white shadow-sm' 
                     : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
                  <div className="absolute top-5 left-5 z-10">
                     <span className="bg-status-error text-white text-xs font-bold px-2.5 py-1 rounded">
                       -{product.discountPercentage}%
                     </span>
                  </div>
                )}
                <button 
                  className="absolute top-5 right-5 z-10 text-neutral-400 hover:text-status-error transition-colors"
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
                  <Heart size={22} className={wishlist.some(w => w.id === product.id) ? "fill-status-error text-status-error" : ""} />
                </button>
                <Link to={`/product/${product.slug}`} className="mb-5 h-[180px] w-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                  />
                </Link>
                <Link to={`/product/${product.slug}`} className="flex flex-col flex-1">
                  <div className="text-xs text-neutral-500 mb-1.5 font-medium">{product.brand}</div>
                  <h3 className="font-semibold text-navy-900 mb-2 line-clamp-2 min-h-[44px] leading-snug">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= Math.round(product.rating) ? "fill-current" : "text-neutral-200 fill-current"} />)}
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">({product.reviewCount})</span>
                  </div>
                  <div className="mt-auto flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-bold text-navy-900">{formatPrice(product.price)}</span>
                       {product.originalPrice && (
                         <span className="text-sm text-neutral-400 line-through">{formatPrice(product.originalPrice)}</span>
                       )}
                    </div>
                    <span className="text-xs text-status-success font-medium flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span> {t('inStock')}
                    </span>
                  </div>
                </Link>
                
                <div className="mt-5">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(product, 1);
                    }}
                    className="w-full bg-white border-2 border-electric-500 text-electric-500 hover:bg-electric-500 hover:text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingCart size={18} /> {t('addToCart')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-[#F8FAFC] border-t border-b border-neutral-100">
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
                <div className="absolute top-5 left-5 z-10">
                  <span className="bg-electric-500 text-white text-xs font-bold px-2.5 py-1 rounded shadow-xs">
                    {t('newBadge')}
                  </span>
                </div>
                <button 
                  className="absolute top-5 right-5 z-10 text-neutral-400 hover:text-status-error transition-colors"
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
                  <Heart size={22} className={wishlist.some(w => w.id === product.id) ? "fill-status-error text-status-error" : ""} />
                </button>
                <Link to={`/product/${product.slug}`} className="mb-5 h-[180px] w-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                  />
                </Link>
                <Link to={`/product/${product.slug}`} className="flex flex-col flex-1">
                  <div className="text-xs text-neutral-500 mb-1.5 font-medium">{product.brand}</div>
                  <h3 className="font-semibold text-navy-900 mb-2 line-clamp-2 min-h-[44px] leading-snug text-sm">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= Math.round(product.rating) ? "fill-current" : "text-neutral-200 fill-current"} />)}
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">({product.reviewCount})</span>
                  </div>
                  <div className="mt-auto flex flex-col items-start gap-1">
                    <span className="text-xl font-bold text-navy-900">{formatPrice(product.price)}</span>
                    <span className="text-xs text-status-success font-medium flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span> {t('inStock')}
                    </span>
                  </div>
                </Link>
                <div className="mt-5">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(product, 1);
                    }}
                    className="w-full bg-white border-2 border-electric-500 text-electric-500 hover:bg-electric-500 hover:text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShoppingCart size={18} /> {t('addToCart')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 pb-20">
        <div className="container-custom grid md:grid-cols-3 gap-6">
           <Link to="/category/e-mobility" className="bg-[#F6F8FB] rounded-[24px] p-8 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[220px] group cursor-pointer border border-[#E3E8EF] hover:border-[#B8CEF5] transition-colors">
              <div className="relative z-20 w-full md:w-1/2 flex flex-col items-start">
                <h3 className="text-navy-900 text-2xl font-bold mb-2">E-Mobilität</h3>
                <p className="text-neutral-600 text-[15px] mb-5 font-medium leading-snug">Freiheit auf<br/>zwei Rädern.</p>
                <span className="bg-white text-navy-900 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-electric-500 hover:text-white transition-colors border border-neutral-200 group-hover:border-transparent">Jetzt entdecken</span>
              </div>
              <div className="absolute right-[-10%] md:right-[-5%] top-1/2 -translate-y-1/2 w-[60%] h-full flex items-center justify-center p-4">
                <img src={new URL('../assets/icons/products/navee-xt5-ultra-electric-scooter.png', import.meta.url).href} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" alt="E-Scooter mit ABE Straßenzulassung" />
              </div>
           </Link>
           
           <Link to="/category/tv-video" className="bg-[#F6F8FB] rounded-[24px] p-8 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[220px] group cursor-pointer border border-[#E3E8EF] hover:border-[#B8CEF5] transition-colors">
              <div className="relative z-20 w-full md:w-1/2 flex flex-col items-start">
                <h3 className="text-navy-900 text-2xl font-bold mb-2">TV & Heimkino</h3>
                <p className="text-neutral-600 text-[15px] mb-5 font-medium leading-snug">Entertainment für<br/>Ihr Zuhause.</p>
                <span className="bg-white text-navy-900 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-electric-500 hover:text-white transition-colors border border-neutral-200 group-hover:border-transparent">Zur Auswahl</span>
              </div>
              <div className="absolute right-[-10%] md:right-[-10%] top-1/2 -translate-y-1/2 w-[65%] h-full flex items-center justify-center p-4">
                <img src={new URL('../assets/icons/products/lg-oled-55-tv.png', import.meta.url).href} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" alt="LG OLED 55 Zoll 4K Smart TV" />
              </div>
           </Link>

           <Link to="/category/smartphones" className="bg-[#F6F8FB] rounded-[24px] p-8 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[220px] group cursor-pointer border border-[#E3E8EF] hover:border-[#B8CEF5] transition-colors">
              <div className="relative z-20 w-full md:w-1/2 flex flex-col items-start">
                <h3 className="text-navy-900 text-2xl font-bold mb-2">Smartphones</h3>
                <p className="text-neutral-600 text-[15px] mb-5 font-medium leading-snug">Die neuesten<br/>Modelle.</p>
                <span className="bg-white text-navy-900 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-electric-500 hover:text-white transition-colors border border-neutral-200 group-hover:border-transparent">Jetzt entdecken</span>
              </div>
              <div className="absolute right-[0%] md:right-[-5%] top-1/2 -translate-y-1/2 w-[55%] h-[80%] flex items-center justify-center p-2">
                <img src={new URL('../assets/icons/products/apple-iphone-17-pro.png', import.meta.url).href} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" alt="Apple iPhone 17 Pro Flaggschiff-Smartphone" />
              </div>
           </Link>
        </div>
      </section>
    </div>
  );
};
