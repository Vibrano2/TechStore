import { formatPrice } from '../utils/formatPrice';
import { Link } from 'react-router-dom';
import { Trash2, ArrowRight, Shield } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useSEO } from '../utils/useSEO';

export const Cart = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal, t } = useShop();

  useSEO({
    title: 'Warenkorb | TechnikWelt',
    description: 'Ihr Warenkorb bei TechnikWelt. Schnelle DHL-Lieferung, 30 Tage Rückgaberecht & 24 Monate Gewährleistung.',
    canonical: '/cart'
  });

  const netAmount = Math.round((cartTotal / 1.19) * 100) / 100;
  const vatAmount = Math.round((cartTotal - netAmount) * 100) / 100;
  const shippingFee = cartTotal >= 50 || cartTotal === 0 ? 0 : 4.99;
  const grandTotal = Math.round((cartTotal + shippingFee) * 100) / 100;

  if (cart.length === 0) {
    return (
      <div className="container-custom py-24 text-center">
        <h1 className="text-3xl font-bold text-navy-900 mb-4">{t('cartEmpty')}</h1>
        <p className="text-neutral-500 mb-8">{t('continueShopping')}</p>
        <Link to="/category/all" className="btn-primary inline-flex">{t('continueShopping')}</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-navy-900 mb-8">{t('cart')}</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {cart.map((item) => (
            <div key={`${item.product.id}-${item.variantId || 'default'}`} className="bg-white rounded-xl border border-neutral-200 p-4 flex gap-4 items-start sm:items-center">
              <Link to={`/product/${item.product.slug}`} className="w-24 h-24 shrink-0 bg-neutral-50 rounded-lg p-2">
                <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-contain" />
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.product.slug}`} className="font-bold text-navy-900 hover:text-electric-500 truncate block">
                  {item.product.name}
                </Link>
                <div className="text-sm text-neutral-500 mb-2">{item.product.brand}</div>
                <div className="text-lg font-bold text-navy-900">
                  {formatPrice(item.product.price)}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                <div className="flex items-center border border-neutral-200 rounded-lg bg-white overflow-hidden">
                  <button className="px-3 py-1 text-neutral-500 hover:text-electric-500 hover:bg-neutral-50" onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1), item.variantId)}>-</button>
                  <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                  <button className="px-3 py-1 text-neutral-500 hover:text-electric-500 hover:bg-neutral-50" onClick={() => updateQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1), item.variantId)}>+</button>
                </div>
                <button 
                  className="text-neutral-400 hover:text-status-error p-2"
                  onClick={() => removeFromCart(item.product.id, item.variantId)}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-navy-900 mb-6">{t('cartSummaryTitle')}</h2>
            
            <div className="space-y-3 text-sm mb-6 pb-6 border-b border-neutral-200">
              <div className="flex justify-between text-neutral-600">
                <span>{t('subtotal')}</span>
                <span className="font-semibold text-navy-900">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 text-xs">
                <span>{t('taxIncluded')} (19%)</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>{t('shipping')}</span>
                <span>{shippingFee === 0 ? t('freeShipping') : formatPrice(shippingFee)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-6">
              <span className="font-bold text-navy-900">{t('total')}</span>
              <span className="text-2xl font-bold text-navy-900">
                {formatPrice(grandTotal)}
              </span>
            </div>
            
            <Link to="/checkout" className="btn-primary w-full">
              {t('goToCheckout')} <ArrowRight size={18} className="ml-2" />
            </Link>
            
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                <Shield size={14} /> {t('securePaymentBadge')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
