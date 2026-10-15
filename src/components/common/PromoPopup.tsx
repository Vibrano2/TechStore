import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, ShoppingCart, Sparkles, ArrowRight, ShieldCheck, Truck, Tag } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { mockProducts } from '../../data/mockProducts';
import { formatPrice } from '../../utils/formatPrice';

const PROMO_CODE = 'WILLKOMMEN10';
const STORAGE_KEY = 'tw_promo_dismissed_v1';

export const PromoPopup: React.FC = () => {
  const { addToCart } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Curate 2 top attractive promotional deal items from catalog
  const suggestedProducts = React.useMemo(() => {
    const p1 = mockProducts.find(p => p.slug === 'sony-wf-1000xm5-true-wireless-earbuds') || mockProducts.find(p => p.category === 'Audio' && p.discountPercentage);
    const p2 = mockProducts.find(p => p.slug === 'xbox-elite-wireless-controller-series-2') || mockProducts.find(p => p.category === 'Haushalt' && p.discountPercentage);
    return [p1, p2].filter(Boolean);
  }, []);

  // Check if dismissed previously in current session
  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Trigger after 6 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 6000);

    // Desktop exit-intent trigger
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !sessionStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(PROMO_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  return (
    <>
      {/* Floating Re-Open Pill when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 bg-navy-900 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-electric-500 hover:shadow-xl transition-all duration-300 flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-white/20 group cursor-pointer"
          aria-label="Aktionsgutschein und Empfehlungen ansehen"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-electric-500 text-white text-xs group-hover:scale-110 transition-transform">
            <Tag size={13} />
          </span>
          <span>10% Gutschein & Deal-Tipps</span>
        </button>
      )}

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-popup-title"
        >
          <div 
            className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E3E8EF] relative animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-navy-900 to-electric-600 text-white p-6 relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Schließen"
              >
                <X size={20} />
              </button>

              <div className="inline-flex items-center gap-1.5 bg-electric-500/40 text-electric-100 text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-electric-400/30">
                <Sparkles size={13} />
                <span>Exklusives Willkommens-Angebot</span>
              </div>

              <h2 id="promo-popup-title" className="text-2xl sm:text-[26px] font-bold leading-tight mb-2">
                Sichern Sie sich 10% Rabatt!
              </h2>
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-md">
                Verwenden Sie den Gutscheincode bei Ihrer nächsten Bestellung oder entdecken Sie unsere tagesaktuellen Spitzen-Angebote.
              </p>

              {/* Voucher Code Box */}
              <div className="mt-4 flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/25 rounded-xl p-2.5 sm:p-3">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">Ihr Gutscheincode</span>
                  <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-white">{PROMO_CODE}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied 
                      ? 'bg-status-success text-white' 
                      : 'bg-white text-navy-900 hover:bg-neutral-100'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
                </button>
              </div>
            </div>

            {/* Curated Suggested Products Section */}
            <div className="p-5 sm:p-6 bg-neutral-50/50">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                  <Tag size={15} className="text-electric-500" />
                  <span>Aktuelle Bestseller-Empfehlungen:</span>
                </h3>
                <span className="text-[11px] text-neutral-500 font-medium">Stark reduziert</span>
              </div>

              <div className="space-y-3">
                {suggestedProducts.map((product: any) => (
                  <div 
                    key={product.id}
                    className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-[#E3E8EF] hover:border-electric-500/50 transition-colors shadow-xs"
                  >
                    <Link 
                      to={`/product/${product.slug}`} 
                      onClick={handleClose}
                      className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center bg-neutral-50 rounded-lg p-1.5"
                    >
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        width="80"
                        height="80"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-neutral-500 font-medium">{product.brand}</div>
                      <Link 
                        to={`/product/${product.slug}`} 
                        onClick={handleClose}
                        className="font-semibold text-navy-900 text-xs sm:text-sm line-clamp-1 hover:text-electric-500 transition-colors"
                      >
                        {product.name}
                      </Link>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-navy-900 text-sm sm:text-base">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && (
                          <span className="text-xs text-neutral-400 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                        {product.discountPercentage && (
                          <span className="bg-status-error/10 text-status-error text-[10px] font-bold px-1.5 py-0.5 rounded">
                            -{product.discountPercentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => handleAddToCart(e, product)}
                        className={`p-2.5 rounded-xl font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                          addedIds[product.id]
                            ? 'bg-status-success text-white'
                            : 'bg-electric-500 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                        title="In den Warenkorb"
                        aria-label={`${product.name} in den Warenkorb legen`}
                      >
                        {addedIds[product.id] ? (
                          <Check size={16} />
                        ) : (
                          <ShoppingCart size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guarantees Bar */}
              <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Truck size={13} className="text-status-success" />
                  Kostenloser Versand ab 50 €
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-status-success" />
                  24 Monate Gewährleistung
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#E3E8EF] flex items-center justify-between gap-3">
              <button
                onClick={handleClose}
                className="text-xs sm:text-sm text-neutral-500 hover:text-navy-900 font-medium px-3 py-2 cursor-pointer"
              >
                Später ansehen
              </button>
              <Link
                to="/angebote"
                onClick={handleClose}
                className="bg-navy-900 hover:bg-electric-500 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Alle Sonderangebote</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
