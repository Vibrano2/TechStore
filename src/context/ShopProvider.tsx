import { useState, useEffect, type ReactNode } from 'react';
import type { Product, CartItem } from '../types';
import { mockProducts } from '../data/mockProducts';
import { type Language, type TranslationKey, getTranslation } from '../i18n/translations';
import { ShopContext } from './ShopContext';

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('technikwelt_cart') || localStorage.getItem('techstore_cart');
    if (!saved) return [];
    try {
      const parsed: CartItem[] = JSON.parse(saved);
      return parsed.map(item => {
        const authoritativeProduct = mockProducts.find(p => p.id === item.product.id);
        return { ...item, product: authoritativeProduct || item.product };
      });
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = localStorage.getItem('technikwelt_wishlist') || localStorage.getItem('techstore_wishlist');
    if (!saved) return [];
    try {
      const parsed: Product[] = JSON.parse(saved);
      return parsed.map(p => mockProducts.find(mp => mp.id === p.id) || p);
    } catch {
      return [];
    }
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('technikwelt_lang') || localStorage.getItem('techstore_lang');
    if (saved === 'de' || saved === 'en' || saved === 'fr' || saved === 'es') {
      return saved;
    }
    return 'de';
  });

  const t = (key: TranslationKey): string => getTranslation(key, language);

  useEffect(() => {
    localStorage.setItem('technikwelt_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('technikwelt_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('technikwelt_lang', language);
  }, [language]);

  const addToCart = (product: Product, quantity: number, variantId?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.variantId === variantId);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.variantId === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, variantId }];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.variantId === variantId)));
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId && item.variantId === variantId
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const addToWishlist = (product: Product) => {
    setWishlist(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(p => p.id !== productId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <ShopContext.Provider value={{
      cart, wishlist, addToCart, removeFromCart, updateQuantity, clearCart,
      addToWishlist, removeFromWishlist, cartTotal, cartCount,
      language, setLanguage, t
    }}>
      {children}
    </ShopContext.Provider>
  );
};
