import { formatPrice } from '../utils/formatPrice';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Shield, Truck, AlertCircle } from 'lucide-react';
import { mockProducts } from '../data/mockProducts';
import { useShop } from '../context/ShopContext';
import { ProductReviews } from '../components/reviews/ProductReviews';
import { useSEO } from '../utils/useSEO';

export const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart, addToWishlist, removeFromWishlist, wishlist, t } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  
  const product = mockProducts.find(p => p.slug === slug || p.id === slug);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useSEO({
    title: product ? `${product.name} | TechnikWelt` : 'Produkt | TechnikWelt',
    description: product ? `${product.shortDescription} Jetzt bei TechnikWelt mit 24 Monaten Gewährleistung & 30 Tagen Rückgaberecht bestellen.` : undefined,
    canonical: product ? `/product/${product.slug}` : undefined,
    ogType: 'product',
    ogImage: product?.images[0],
    schema: product ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: product.images,
      description: product.description,
      brand: {
        '@type': 'Brand',
        name: product.brand
      },
      sku: product.id,
      offers: {
        '@type': 'Offer',
        url: `https://technikwelt.shop/product/${product.slug}`,
        priceCurrency: 'EUR',
        price: product.price,
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition'
      },
      ...(product.reviewCount > 0 ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount
        }
      } : {})
    } : undefined
  });
  
  if (!product) {
    return (
      <div className="container-custom py-24 text-center">
        <h1 className="text-4xl font-bold text-navy-900 mb-4">Produkt nicht gefunden</h1>
        <p className="text-neutral-500 mb-8">Das von Ihnen gesuchte Produkt existiert leider nicht.</p>
        <Link to="/" className="btn-primary inline-flex">Zurück zur Startseite</Link>
      </div>
    );
  }

  const isFavorite = wishlist.some(p => p.id === product.id);
  const isOutOfStock = product.stock <= 0;
  const activeImage = selectedImage && product.images.includes(selectedImage)
    ? selectedImage
    : (product.images[0] || '');

  return (
    <div className="container-custom py-8">
      <div className="text-sm text-neutral-500 mb-8">
        <Link to="/" className="hover:text-electric-500">Start</Link>
        <span className="mx-2">/</span>
        <Link to={`/category/${product.category.toLowerCase().replace(/ /g, '-')}`} className="hover:text-electric-500">{product.category}</Link>
        <span className="mx-2">/</span>
        <span className="text-navy-900">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        <div className="flex flex-col gap-4">
          <div className="aspect-square bg-white rounded-2xl border border-neutral-200 p-8 flex items-center justify-center relative shadow-xs">
             {product.discountPercentage && (
                <span className="absolute top-4 left-4 bg-status-error text-white text-xs font-bold px-3 py-1 rounded shadow-sm z-10">
                  -{product.discountPercentage}%
                </span>
             )}
             {product.isNew && !product.discountPercentage && (
                <span className="absolute top-4 left-4 bg-electric-500 text-white text-xs font-bold px-3 py-1 rounded shadow-sm z-10">
                  {t('newBadge')}
                </span>
             )}
            <img 
              src={activeImage} 
              alt={product.name} 
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="600"
              height="600"
              className="w-full h-full object-contain transition-all duration-300" 
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
               {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    aria-label={`${product.name} Bild ${idx + 1} auswählen`}
                    className={`w-20 h-20 bg-white border rounded-xl p-2 cursor-pointer transition-all flex items-center justify-center ${
                      activeImage === img ? 'border-electric-500 ring-2 ring-electric-500/20 shadow-sm' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                     <img src={img} alt={`${product.name} Detailansicht ${idx + 1}`} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
                  </button>
               ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="mb-6">
            <span className="text-sm font-medium text-neutral-500 mb-2 block">{product.brand}</span>
            <h1 className="text-3xl font-bold text-navy-900 mb-4">{product.name}</h1>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reviews');
                  document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center text-status-warning cursor-pointer hover:opacity-85 transition-opacity"
              >
                {'★'.repeat(Math.floor(product.rating))}
                <span className="text-neutral-300">{'★'.repeat(5 - Math.floor(product.rating))}</span>
                <span className="text-sm text-navy-900 ml-2 font-medium">{product.rating}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reviews');
                  document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-neutral-500 underline cursor-pointer hover:text-electric-500 transition-colors"
              >
                {product.reviewCount} {t('reviews')}
              </button>
            </div>
          </div>

          <div className="mb-6 pb-6 border-b border-neutral-200">
            <div className="flex items-end gap-4 mb-2">
              <span className="text-4xl font-bold text-navy-900">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-neutral-500 line-through mb-1">{formatPrice(product.originalPrice)}</span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mb-6">inkl. MwSt. zzgl. <Link to="/shipping" className="underline">Versandkosten</Link></p>
          </div>

          {product.eMobilityCompliance && (
            <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <h4 className="font-bold text-navy-900 mb-3 text-sm flex items-center gap-2">
                <Shield size={16} className="text-electric-500" /> {t('eMobilityComplianceTitle')}
              </h4>
              <ul className="text-sm space-y-2 text-neutral-600">
                <li className="flex justify-between">
                  <span>{t('roadLegal')}:</span> 
                  <span className="font-medium">{product.eMobilityCompliance.roadLegal ? t('yes') : t('no')}</span>
                </li>
                <li className="flex justify-between">
                  <span>{t('abeAvailable')}:</span> 
                  <span className="font-medium">{product.eMobilityCompliance.abeAvailable ? t('yes') : t('no')}</span>
                </li>
                <li className="flex justify-between">
                  <span>{t('insuranceRequired')}:</span> 
                  <span className="font-medium">{product.eMobilityCompliance.insuranceRequired ? t('yes') : t('no')}</span>
                </li>
                <li className="flex justify-between">
                  <span>{t('intendedUse')}:</span> 
                  <span className="font-medium">{product.eMobilityCompliance.intendedUse}</span>
                </li>
              </ul>
            </div>
          )}

          <div className="mb-8 space-y-4">
            {isOutOfStock ? (
              <div className="flex items-center gap-2 text-sm text-status-error font-semibold bg-red-50 p-3 rounded-xl border border-red-200">
                <AlertCircle size={18} className="shrink-0" />
                <span>Derzeit nicht lieferbar (Ausverkauft)</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-status-success font-medium">
                <span className="w-2 h-2 rounded-full bg-status-success"></span>
                {t('inStock')} ({product.stock} {t('piecesAvailable')})
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <Truck size={20} className="text-neutral-400" />
              {product.delivery}
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <Shield size={20} className="text-neutral-400" />
              {product.warranty}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className={`flex items-center border border-neutral-200 rounded-xl bg-white ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
              <button
                type="button"
                className="px-4 py-3 text-neutral-500 hover:text-electric-500 cursor-pointer disabled:opacity-40"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={isOutOfStock || quantity <= 1}
              >
                -
              </button>
              <span className="w-12 text-center font-medium text-navy-900">{isOutOfStock ? 0 : quantity}</span>
              <button
                type="button"
                className="px-4 py-3 text-neutral-500 hover:text-electric-500 cursor-pointer disabled:opacity-40"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={isOutOfStock || quantity >= product.stock}
              >
                +
              </button>
            </div>
            <button 
              type="button"
              disabled={isOutOfStock}
              className="flex-1 btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              onClick={() => addToCart(product, quantity)}
            >
              {isOutOfStock ? 'Derzeit ausverkauft' : t('addToCart')}
            </button>
            <button 
              type="button"
              aria-label={isFavorite ? t('removeFromWishlist') : t('addToWishlist')}
              className={`p-3 border rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isFavorite
                  ? 'border-status-error text-status-error bg-red-50'
                  : 'border-neutral-200 text-neutral-500 hover:border-electric-500 hover:text-electric-500 bg-white'
              }`}
              onClick={() => {
                if (isFavorite) {
                  removeFromWishlist(product.id);
                } else {
                  addToWishlist(product);
                }
              }}
            >
              <Heart size={24} className={isFavorite ? 'fill-current' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div id="product-tabs" className="border-b border-neutral-200 mb-8 scroll-mt-24">
        <div className="flex gap-8 overflow-x-auto">
          {['description', 'specs', 'reviews', 'delivery', 'warranty'].map(tab => (
            <button 
              key={tab}
              className={`py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab ? 'border-electric-500 text-electric-500 font-bold' : 'border-transparent text-neutral-500 hover:text-navy-900'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'description' && t('description')}
              {tab === 'specs' && t('specifications')}
              {tab === 'reviews' && `${t('reviews')} (${product.reviewCount})`}
              {tab === 'delivery' && t('deliveryTime')}
              {tab === 'warranty' && t('warranty')}
            </button>
          ))}
        </div>
      </div>

      <div className={`mb-16 ${activeTab === 'reviews' ? 'max-w-4xl' : 'max-w-3xl'}`}>
        {activeTab === 'description' && (
          <div className="text-neutral-600 leading-relaxed">
            <p className="mb-4">{product.shortDescription}</p>
            <p>{product.description}</p>
          </div>
        )}
        {activeTab === 'specs' && (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            {Object.entries(product.specifications).map(([key, value], idx) => (
              <div key={key} className={`flex px-4 py-3 text-sm ${idx % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}`}>
                <div className="w-1/3 font-medium text-navy-900">{key}</div>
                <div className="w-2/3 text-neutral-600">{value}</div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'reviews' && (
          <ProductReviews
            productId={product.id}
            productName={product.name}
            defaultRating={product.rating}
            defaultReviewCount={product.reviewCount}
            t={t}
          />
        )}
        {activeTab === 'delivery' && (
          <div className="text-neutral-600 text-sm">
            <p className="mb-2"><strong>Versandart:</strong> {product.delivery}</p>
            <p>Die genauen Versandkosten werden im Checkout berechnet. Kostenloser Standardversand ab 50 € Bestellwert.</p>
          </div>
        )}
        {activeTab === 'warranty' && (
          <div className="text-neutral-600 text-sm">
            <p className="mb-2"><strong>Garantie:</strong> {product.warranty}</p>
            <p>Für alle Elektronikartikel gilt die gesetzliche Gewährleistung von 24 Monaten.</p>
          </div>
        )}
      </div>

      {(() => {
        const related = mockProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
        if (related.length === 0) return null;
        return (
          <div className="pt-8 border-t border-neutral-200 mb-16">
            <h2 className="text-2xl font-bold text-navy-900 mb-6">{t('similarProducts')} ({product.category})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
              {related.map(rel => (
                <Link to={`/product/${rel.slug}`} key={rel.id} className="bg-white rounded-xl border border-neutral-200/90 p-3 sm:p-3.5 hover:shadow-md hover:border-electric-300 transition-all duration-200 group flex flex-col">
                  <div className="h-36 sm:h-44 w-full bg-[#F8FAFC] rounded-lg mb-3 p-2.5 sm:p-3 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={rel.images[0]} alt={rel.name} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply" />
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider mb-1 truncate">{rel.brand}</span>
                  <h4 className="font-semibold text-navy-900 text-xs sm:text-sm line-clamp-2 min-h-[2.4rem] mb-2 leading-snug group-hover:text-electric-500 transition-colors flex-1">{rel.name}</h4>
                  <div className="mt-auto pt-2 border-t border-neutral-100 flex items-baseline justify-between">
                    <div className="text-sm sm:text-base font-extrabold text-navy-900">{formatPrice(rel.price)}</div>
                    <span className="text-[10px] text-neutral-400">inkl. MwSt.</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
