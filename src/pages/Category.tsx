import { useState, useMemo } from 'react';
import { formatPrice } from '../utils/formatPrice';
import { useParams, useLocation, useSearchParams, Link } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';
import { useShop } from '../context/ShopContext';
import { ShoppingCart, Filter, X, ChevronLeft, ChevronRight, RotateCcw, Heart, Star, Check } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

const categorySlugMap: Record<string, string> = {
  'smartphones': 'Smartphones',
  'computer': 'Computer & Laptops',
  'computer-laptops': 'Computer & Laptops',
  'computer-&-laptops': 'Computer & Laptops',
  'tv-video': 'TV & Projektoren',
  'tv-projektoren': 'TV & Projektoren',
  'tv-&-projektoren': 'TV & Projektoren',
  'audio': 'Audio',
  'e-mobility': 'E-Mobilität',
  'e-mobilitaet': 'E-Mobilität',
  'e-mobilität': 'E-Mobilität',
  'smart-home': 'Smart Home',
  'haushalt': 'Haushalt',
  'zubehor': 'Zubehör',
  'zubehoer': 'Zubehör',
  'zubehör': 'Zubehör',
  'gaming': 'Gaming & Konsolen',
  'beauty': 'Beauty & Pflege-Technik',
  'wellness': 'Wellness & Entspannung',
  'recovery': 'Recovery & Sport-Regeneration',
  'pro-equipment': 'Profi-Equipment & 3D-Druck',
};

const ITEMS_PER_PAGE = 16;

export const Category = () => {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = (searchParams.get('q') || searchParams.get('search') || '').trim().toLowerCase();
  const isAngebote = location.pathname === '/angebote';
  const { addToCart, addToWishlist, removeFromWishlist, wishlist, t } = useShop();

  const initialBrands = useMemo(() => {
    const b = searchParams.get('brand');
    return b ? b.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const [minPrice, setMinPrice] = useState<string>(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('max') || '');
  const [sortOrder, setSortOrder] = useState<string>(searchParams.get('sort') || 'Relevanz');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [brandSearch, setBrandSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const updateUrlParams = (brands: string[], min: string, max: string, sort: string, page: number) => {
    const params = new URLSearchParams(searchParams);
    if (brands.length > 0) params.set('brand', brands.join(','));
    else params.delete('brand');

    if (min) params.set('min', min);
    else params.delete('min');

    if (max) params.set('max', max);
    else params.delete('max');

    if (sort && sort !== 'Relevanz') params.set('sort', sort);
    else params.delete('sort');

    if (page > 1) params.set('page', page.toString());
    else params.delete('page');

    setSearchParams(params, { replace: true });
  };

  const handleBrandToggle = (brand: string) => {
    const nextBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(nextBrands);
    setCurrentPage(1);
    updateUrlParams(nextBrands, minPrice, maxPrice, sortOrder, 1);
  };

  const handlePriceChange = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    setCurrentPage(1);
    updateUrlParams(selectedBrands, min, max, sortOrder, 1);
  };

  const handleSortChange = (newSort: string) => {
    setSortOrder(newSort);
    setCurrentPage(1);
    updateUrlParams(selectedBrands, minPrice, maxPrice, newSort, 1);
  };

  const handleClearFilters = () => {
    setSelectedBrands([]);
    setMinPrice('');
    setMaxPrice('');
    setBrandSearch('');
    setInStockOnly(false);
    setMinRating(0);
    setSortOrder('Relevanz');
    setCurrentPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const cleanSlug = slug?.toLowerCase();
  const matchedCategory = cleanSlug ? categorySlugMap[cleanSlug] : undefined;

  const baseProducts = useMemo(() => {
    let prods = mockProducts;
    if (isAngebote) {
      prods = mockProducts.filter(p => p.discountPercentage);
    } else if (!slug || slug === 'all') {
      prods = mockProducts;
    } else if (cleanSlug === 'gaming') {
      prods = mockProducts.filter(p => {
        const text = `${p.name} ${p.shortDescription} ${p.category}`.toLowerCase();
        return text.includes('gaming') || text.includes('switch') || text.includes('ps5') || text.includes('xbox') || text.includes('gamepad') || text.includes('controller') || text.includes('stream deck') || text.includes('geforce') || text.includes('rtx');
      });
    } else if (cleanSlug === 'beauty') {
      prods = mockProducts.filter(p => {
        const text = `${p.name} ${p.shortDescription} ${p.description}`.toLowerCase();
        return text.includes('beauty') || text.includes('facial') || text.includes('led mask') || text.includes('lichttherapie') || text.includes('ipl') || text.includes('haartrockner') || text.includes('hair') || text.includes('gesichts') || text.includes('hifu') || text.includes('microneedling') || text.includes('haut');
      });
    } else if (cleanSlug === 'wellness') {
      prods = mockProducts.filter(p => {
        const text = `${p.name} ${p.shortDescription} ${p.description}`.toLowerCase();
        return text.includes('massage') || text.includes('wellness') || text.includes('entspannung') || text.includes('matte') || text.includes('shiatsu') || text.includes('wärme') || text.includes('fußmassage');
      });
    } else if (cleanSlug === 'recovery') {
      prods = mockProducts.filter(p => {
        const text = `${p.name} ${p.shortDescription} ${p.description}`.toLowerCase();
        return text.includes('recovery') || text.includes('compression') || text.includes('kompression') || text.includes('ice bath') || text.includes('eisbad') || text.includes('chiller') || text.includes('lymph') || text.includes('therapie') || text.includes('cooling');
      });
    } else if (cleanSlug === 'pro-equipment') {
      prods = mockProducts.filter(p => {
        const text = `${p.name} ${p.shortDescription} ${p.description}`.toLowerCase();
        return text.includes('3d printer') || text.includes('3d-drucker') || text.includes('filament') || text.includes('corexy') || text.includes('laser') || text.includes('single-board') || text.includes('raspberry') || text.includes('entwicklung');
      });
    } else if (matchedCategory) {
      prods = mockProducts.filter(p => p.category === matchedCategory);
    } else {
      prods = mockProducts.filter(p => p.category.toLowerCase().replace(/[^a-z0-9]/g, '-') === cleanSlug?.replace(/[^a-z0-9]/g, '-'));
    }

    if (searchQuery) {
      prods = prods.filter(p =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.brand.toLowerCase().includes(searchQuery) ||
        p.category.toLowerCase().includes(searchQuery) ||
        p.shortDescription.toLowerCase().includes(searchQuery)
      );
    }

    return prods;
  }, [cleanSlug, matchedCategory, isAngebote, slug, searchQuery]);

  const availableBrands = useMemo(() => {
    return Array.from(new Set(baseProducts.map(p => p.brand))).sort();
  }, [baseProducts]);

  const displayedBrands = useMemo(() => {
    if (!brandSearch.trim()) return availableBrands;
    return availableBrands.filter(b => b.toLowerCase().includes(brandSearch.trim().toLowerCase()));
  }, [availableBrands, brandSearch]);

  const filteredProducts = useMemo(() => {
    let result = [...baseProducts];

    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }
    if (minPrice) {
      const minVal = parseFloat(minPrice);
      if (!isNaN(minVal)) result = result.filter(p => p.price >= minVal);
    }
    if (maxPrice) {
      const maxVal = parseFloat(maxPrice);
      if (!isNaN(maxVal)) result = result.filter(p => p.price <= maxVal);
    }
    if (inStockOnly) {
      result = result.filter(p => p.stock > 0);
    }
    if (minRating > 0) {
      result = result.filter(p => p.rating >= minRating);
    }

    if (sortOrder === 'Preis aufsteigend') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'Preis absteigend') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOrder === 'Beste Bewertung') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOrder === 'Neueste') {
      result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    return result;
  }, [baseProducts, selectedBrands, minPrice, maxPrice, inStockOnly, minRating, sortOrder]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const hasActiveFilters = selectedBrands.length > 0 || minPrice !== '' || maxPrice !== '' || inStockOnly || minRating > 0 || sortOrder !== 'Relevanz' || !!searchQuery;

  const displayTitle = searchQuery 
    ? `${t('searchResultsFor')} "${searchQuery}"` 
    : isAngebote 
      ? t('topDeals') 
      : slug === 'all' 
        ? t('allProductsTitle') 
        : cleanSlug === 'gaming'
          ? t('gaming')
          : cleanSlug === 'beauty'
            ? t('beauty')
            : cleanSlug === 'wellness'
              ? t('wellness')
              : cleanSlug === 'recovery'
                ? t('recovery')
                : cleanSlug === 'pro-equipment'
                  ? t('proEquipment')
                  : (matchedCategory || slug || t('categories'));

  useSEO({
    title: `${displayTitle} | TechnikWelt`,
    description: `Entdecken Sie ${displayTitle} bei TechnikWelt: Premium-Elektronik, schnelle DHL-Lieferung, 30 Tage kostenfreier Rückversand und 24 Monate gesetzliche Gewährleistung.`,
    canonical: isAngebote ? '/angebote' : `/category/${slug || 'all'}`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Start',
          item: 'https://technikwelt.shop/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: displayTitle,
          item: `https://technikwelt.shop/category/${slug || 'all'}`
        }
      ]
    }
  });

  const subcategoryPills = useMemo(() => {
    if (['haushalt', 'beauty', 'wellness', 'recovery'].includes(cleanSlug || '')) {
      return [
        { label: t('allHousehold'), slug: 'haushalt' },
        { label: t('beauty'), slug: 'beauty' },
        { label: t('wellness'), slug: 'wellness' },
        { label: t('recovery'), slug: 'recovery' },
      ];
    }
    if (['computer', 'computer-laptops', 'gaming', 'pro-equipment'].includes(cleanSlug || '')) {
      return [
        { label: t('allComputers'), slug: 'computer' },
        { label: t('gaming'), slug: 'gaming' },
        { label: t('proEquipment'), slug: 'pro-equipment' },
      ];
    }
    if (cleanSlug === 'all') {
      return [
        { label: t('allProductsTitle'), slug: 'all' },
        { label: t('smartphones'), slug: 'smartphones' },
        { label: t('computers'), slug: 'computer' },
        { label: t('gaming'), slug: 'gaming' },
        { label: t('eMobility'), slug: 'e-mobility' },
        { label: t('smartHome'), slug: 'smart-home' },
        { label: t('tvVideo'), slug: 'tv-video' },
        { label: t('household'), slug: 'haushalt' },
        { label: t('recovery'), slug: 'recovery' },
        { label: t('accessories'), slug: 'zubehor' },
      ];
    }
    return [];
  }, [cleanSlug, t]);

  return (
    <div className="container-custom py-5 sm:py-6">
      <div className="text-xs text-neutral-500 mb-3 sm:mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Link to="/" className="hover:text-electric-500 font-medium transition-colors">Start</Link>
          <span className="text-neutral-300">/</span>
          <span className="text-navy-900 capitalize font-semibold truncate">{displayTitle}</span>
        </div>
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="md:hidden flex items-center gap-1.5 bg-white border border-neutral-200 text-xs font-semibold px-3 py-1.5 rounded-lg text-navy-900 shadow-2xs shrink-0 cursor-pointer"
        >
          <Filter size={13} /> {t('filters')} {hasActiveFilters && '•'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-7">
        {/* Desktop Sidebar */}
        <div className="w-full md:w-56 lg:w-60 shrink-0 hidden md:block">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">{t('filters')}</h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-electric-500 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw size={11} /> {t('reset')}
              </button>
            )}
          </div>

          <div className="border border-neutral-200/90 rounded-xl p-4 bg-white shadow-2xs space-y-4">
            {/* Brand Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-navy-900 text-xs uppercase tracking-wider">{t('brand')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">{availableBrands.length}</span>
              </div>
              
              {availableBrands.length > 7 && (
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Marke suchen..."
                    value={brandSearch}
                    onChange={e => setBrandSearch(e.target.value)}
                    className="w-full text-[11px] bg-neutral-50 border border-neutral-200 rounded-md py-1 pl-2 pr-6 outline-none focus:border-electric-500"
                  />
                  {brandSearch && (
                    <button
                      type="button"
                      onClick={() => setBrandSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {displayedBrands.map(brand => (
                  <label key={brand} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer hover:text-navy-900">
                    <input 
                      type="checkbox" 
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                      className="rounded border-neutral-300 text-electric-500 focus:ring-electric-500 cursor-pointer" 
                    />
                    <span className="truncate">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <hr className="border-neutral-100" />
            
            {/* Price Filter */}
            <div>
              <h3 className="font-bold text-navy-900 mb-2 text-xs uppercase tracking-wider">{t('price')}</h3>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[11px]">€</span>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={minPrice}
                    onChange={e => handlePriceChange(e.target.value, maxPrice)}
                    className="w-full border border-neutral-200 rounded-lg py-1 pl-5 pr-1.5 text-xs outline-none focus:border-electric-500 bg-neutral-50/60" 
                  />
                </div>
                <span className="text-neutral-400 text-xs">-</span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[11px]">€</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={maxPrice}
                    onChange={e => handlePriceChange(minPrice, e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg py-1 pl-5 pr-1.5 text-xs outline-none focus:border-electric-500 bg-neutral-50/60" 
                  />
                </div>
              </div>
            </div>

            <hr className="border-neutral-100" />

            {/* Quick Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer hover:text-navy-900">
                <input 
                  type="checkbox" 
                  checked={inStockOnly}
                  onChange={() => setInStockOnly(!inStockOnly)}
                  className="rounded border-neutral-300 text-electric-500 focus:ring-electric-500 cursor-pointer" 
                />
                <span className="font-medium">Nur sofort lieferbar</span>
              </label>

              <div className="pt-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Bewertung</span>
                <button
                  type="button"
                  onClick={() => setMinRating(minRating === 4 ? 0 : 4)}
                  className={`w-full flex items-center justify-between text-xs py-1 px-2 rounded-md transition-colors cursor-pointer ${
                    minRating === 4 ? 'bg-electric-50 text-electric-600 font-semibold' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span className="flex items-center gap-1 text-amber-500">
                    {'★'.repeat(4)}<span className="text-neutral-300">★</span> <span className="text-neutral-600 text-[11px]">& mehr</span>
                  </span>
                  {minRating === 4 && <Check size={12} className="text-electric-500" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Column */}
        <div className="flex-1 min-w-0">
          {subcategoryPills.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 mb-4 scrollbar-hide">
              {subcategoryPills.map((pill) => (
                <Link
                  key={pill.slug}
                  to={`/category/${pill.slug}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    cleanSlug === pill.slug
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 shadow-2xs'
                  }`}
                >
                  {pill.label}
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-4">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-navy-900 tracking-tight capitalize">{displayTitle}</h1>
              <span className="text-xs text-neutral-500 mt-0.5 block">
                {filteredProducts.length} {t('productsFound')} {filteredProducts.length > ITEMS_PER_PAGE && `(Seite ${currentPage} von ${totalPages})`}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={sortOrder}
                onChange={e => handleSortChange(e.target.value)}
                className="border border-neutral-200 rounded-lg text-xs font-medium py-1.5 px-3 bg-white outline-none cursor-pointer w-full sm:w-auto shadow-2xs focus:border-electric-500"
              >
                <option value="Relevanz">{t('relevance')}</option>
                <option value="Preis aufsteigend">{t('priceAsc')}</option>
                <option value="Preis absteigend">{t('priceDesc')}</option>
                <option value="Neueste">{t('newest')}</option>
                <option value="Beste Bewertung">{t('bestRating')}</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200 shadow-2xs p-8">
              <p className="text-navy-900 font-bold mb-2 text-base">{t('noProductsFound')}</p>
              <p className="text-xs text-neutral-500 mb-6 max-w-sm mx-auto">
                {t('noProductsFoundSub')}
              </p>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 cursor-pointer">
                  <RotateCcw size={14} /> {t('resetFilter')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {paginatedProducts.map((product, idx) => {
                  const isWishlisted = wishlist.some(w => w.id === product.id);
                  return (
                    <div 
                      key={product.id} 
                      className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-3.5 hover:shadow-md hover:border-electric-300 transition-all duration-200 group flex flex-col relative"
                    >
                      {product.discountPercentage && (
                        <span className="absolute top-2.5 left-2.5 bg-status-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs z-10">
                          -{product.discountPercentage}%
                        </span>
                      )}
                      {product.isNew && !product.discountPercentage && (
                        <span className="absolute top-2.5 left-2.5 bg-electric-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs z-10">
                          {t('newBadge')}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isWishlisted) {
                            removeFromWishlist(product.id);
                          } else {
                            addToWishlist(product);
                          }
                        }}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-neutral-200/80 flex items-center justify-center text-neutral-400 hover:text-status-error hover:bg-white shadow-2xs transition-colors cursor-pointer"
                        aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
                      >
                        <Heart size={14} className={isWishlisted ? "fill-status-error text-status-error" : ""} />
                      </button>

                      <Link to={`/product/${product.slug}`} className="h-36 sm:h-44 w-full bg-[#F8FAFC] rounded-lg mb-3 p-2.5 sm:p-3 overflow-hidden relative flex items-center justify-center shrink-0">
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          loading={idx < 4 ? "eager" : "lazy"}
                          decoding="async"
                          width="200"
                          height="180"
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply" 
                        />
                      </Link>

                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1 truncate">
                          {product.brand}
                        </span>
                        <Link to={`/product/${product.slug}`} className="font-semibold text-navy-900 text-xs sm:text-sm leading-snug mb-1.5 line-clamp-2 min-h-[2.4rem] group-hover:text-electric-500 transition-colors">
                          {product.name}
                        </Link>

                        <div className="flex items-center gap-1 mb-2.5">
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                size={11}
                                className={i <= Math.round(product.rating) ? "fill-current" : "text-neutral-200 fill-current"}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-medium">({product.reviewCount})</span>
                        </div>

                        <div className="flex items-end justify-between mt-auto pt-2.5 border-t border-neutral-100">
                          <div className="min-w-0">
                            {product.originalPrice && (
                              <span className="text-[10px] text-neutral-400 line-through block leading-none mb-0.5">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                            <span className="text-sm sm:text-base font-extrabold text-navy-900 tracking-tight block">
                              {formatPrice(product.price)}
                            </span>
                            <span className="text-[10px] text-neutral-400 block leading-tight">inkl. MwSt.</span>
                          </div>
                          <button 
                            type="button"
                            className="bg-electric-500 text-white p-2 sm:p-2.5 rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0 ml-2" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              addToCart(product, 1);
                            }}
                            title={t('addToCart')}
                          >
                            <ShoppingCart size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 sm:mt-10 flex justify-center items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      const next = Math.max(1, currentPage - 1);
                      setCurrentPage(next);
                      updateUrlParams(selectedBrands, minPrice, maxPrice, sortOrder, next);
                    }}
                    className="p-1.5 border border-neutral-200 rounded-lg bg-white text-navy-900 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    aria-label="Vorherige Seite"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => {
                        setCurrentPage(pNum);
                        updateUrlParams(selectedBrands, minPrice, maxPrice, sortOrder, pNum);
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === pNum
                          ? 'bg-navy-900 text-white shadow-xs'
                          : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      const next = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(next);
                      updateUrlParams(selectedBrands, minPrice, maxPrice, sortOrder, next);
                    }}
                    className="p-1.5 border border-neutral-200 rounded-lg bg-white text-navy-900 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    aria-label="Nächste Seite"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex bg-navy-900/60 backdrop-blur-xs">
          <div className="w-80 max-w-full bg-white h-full ml-auto p-5 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-100">
                <h3 className="font-bold text-navy-900 text-base">{t('filters')}</h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 text-neutral-400 hover:text-navy-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="font-bold text-navy-900 mb-2.5 text-xs uppercase tracking-wider">{t('brand')}</h4>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedBrands.includes(brand)}
                          onChange={() => handleBrandToggle(brand)}
                          className="rounded border-neutral-300 text-electric-500 focus:ring-electric-500 cursor-pointer" 
                        />
                        <span>{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div>
                  <h4 className="font-bold text-navy-900 mb-2 text-xs uppercase tracking-wider">{t('price')}</h4>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Min €" 
                      value={minPrice}
                      onChange={e => handlePriceChange(e.target.value, maxPrice)}
                      className="w-full border border-neutral-200 rounded-lg p-1.5 text-xs outline-none bg-neutral-50" 
                    />
                    <span>-</span>
                    <input 
                      type="number" 
                      placeholder="Max €" 
                      value={maxPrice}
                      onChange={e => handlePriceChange(minPrice, e.target.value)}
                      className="w-full border border-neutral-200 rounded-lg p-1.5 text-xs outline-none bg-neutral-50" 
                    />
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={inStockOnly}
                    onChange={() => setInStockOnly(!inStockOnly)}
                    className="rounded border-neutral-300 text-electric-500 focus:ring-electric-500 cursor-pointer" 
                  />
                  <span className="font-medium">Nur sofort lieferbar</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex gap-2">
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-primary w-full text-xs py-2.5 cursor-pointer"
              >
                Ergebnisse ({filteredProducts.length})
              </button>
              {hasActiveFilters && (
                <button 
                  onClick={handleClearFilters}
                  className="btn-secondary text-xs px-3 cursor-pointer"
                >
                  {t('reset')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
