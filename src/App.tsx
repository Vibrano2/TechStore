import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ShopProvider } from './context/ShopProvider';
import { AuthProvider } from './context/AuthProvider';

const Category = lazy(() => import('./pages/Category').then(m => ({ default: m.Category })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Wishlist = lazy(() => import('./pages/Wishlist').then(m => ({ default: m.Wishlist })));
const Account = lazy(() => import('./pages/Account').then(m => ({ default: m.Account })));
const Impressum = lazy(() => import('./pages/Impressum').then(m => ({ default: m.Impressum })));
const Datenschutz = lazy(() => import('./pages/Datenschutz').then(m => ({ default: m.Datenschutz })));
const AGB = lazy(() => import('./pages/AGB').then(m => ({ default: m.AGB })));
const Widerruf = lazy(() => import('./pages/Widerruf').then(m => ({ default: m.Widerruf })));
const Warranty = lazy(() => import('./pages/Warranty').then(m => ({ default: m.Warranty })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const RouteLoadingFallback = () => (
  <div className="container-custom py-24 flex flex-col items-center justify-center text-center">
    <div className="w-8 h-8 border-3 border-neutral-200 border-t-electric-500 rounded-full animate-spin mb-3"></div>
    <span className="text-xs font-semibold text-neutral-400">Wird geladen...</span>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ShopProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="category/:slug" element={<Category />} />
              <Route path="angebote" element={<Category />} />
              <Route path="product/:slug" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="account" element={<Account />} />
              <Route path="account/orders" element={<Account />} />
              <Route path="account/returns" element={<Account />} />
              <Route path="impressum" element={<Impressum />} />
              <Route path="datenschutz" element={<Datenschutz />} />
              <Route path="agb" element={<AGB />} />
              <Route path="widerruf" element={<Widerruf />} />
              <Route path="warranty" element={<Warranty />} />
              <Route path="contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </ShopProvider>
    </AuthProvider>
  );
}

export default App;
