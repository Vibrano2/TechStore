import { formatPrice } from '../utils/formatPrice';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useSEO } from '../utils/useSEO';

export const Wishlist = () => {
  const { wishlist, removeFromWishlist, addToCart, t } = useShop();

  useSEO({
    title: 'Wunschliste & Merkzettel | TechnikWelt',
    description: 'Ihre gespeicherten Wunschartikel bei TechnikWelt im Überblick.',
    canonical: '/wishlist'
  });

  if (wishlist.length === 0) {
    return (
      <div className="container-custom py-24 text-center">
        <h1 className="text-3xl font-bold text-navy-900 mb-4">{t('wishlistEmpty')}</h1>
        <p className="text-neutral-500 mb-8">{t('wishlistEmptySub')}</p>
        <Link to="/category/all" className="btn-primary inline-flex">{t('exploreProducts')}</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-navy-900 mb-8">{t('wishlistTitle')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
        {wishlist.map((product) => (
          <div key={product.id} className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-3.5 hover:shadow-md hover:border-electric-300 transition-all group flex flex-col">
            <Link to={`/product/${product.slug}`} className="h-36 sm:h-44 w-full bg-[#F8FAFC] rounded-lg mb-3 p-2.5 sm:p-3 overflow-hidden flex items-center justify-center shrink-0">
              <img src={product.images[0]} alt={product.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply" />
            </Link>
            
            <div className="flex-1 flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1 truncate">{product.brand}</span>
              <Link to={`/product/${product.slug}`} className="font-semibold text-navy-900 text-xs sm:text-sm leading-snug mb-2 line-clamp-2 min-h-[2.4rem] hover:text-electric-500 transition-colors">
                {product.name}
              </Link>
              
              <div className="mb-3">
                <span className="text-sm sm:text-base font-extrabold text-navy-900">{formatPrice(product.price)}</span>
                <span className="text-[10px] text-neutral-400 block leading-tight">inkl. 19% MwSt.</span>
              </div>
              
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-neutral-100">
                <button 
                  className="flex-1 btn-primary py-2 px-3 text-xs font-semibold cursor-pointer"
                  onClick={() => addToCart(product, 1)}
                >
                  <ShoppingCart size={14} className="mr-1.5" /> {t('addToCart')}
                </button>
                <button 
                  className="p-2 border border-neutral-200 rounded-lg text-neutral-400 hover:text-status-error hover:border-status-error hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                  onClick={() => removeFromWishlist(product.id)}
                  aria-label={t('removeFromWishlist')}
                  title={t('removeFromWishlist')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
