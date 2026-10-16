import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  LogOut,
  RefreshCw,
  ExternalLink,
  Package,
  TrendingUp,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Check,
  X,
  Eye,
  Send,
  Truck,
  Edit,
  DollarSign,
  FileText,
  Users,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import {
  getAdminToken,
  getAdminUser,
  clearAdminSession,
  fetchAdminStats,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReturns,
  fetchAdminWarrantyClaims,
  fetchAdminCustomers,
  updateAdminOrderStatus,
  approveAdminPaymentProof,
  rejectAdminPaymentProof,
  resendAdminInvoice,
  updateAdminProduct,
  updateAdminReturnStatus,
  updateAdminWarrantyStatus,
} from '../../services/adminApi';
import type {
  AdminStats,
  AdminOrder,
  AdminProduct,
  AdminReturn,
  AdminWarrantyClaim,
  AdminCustomer,
} from '../../services/adminApi';

type DashboardTab = 'overview' | 'orders' | 'products' | 'returns' | 'customers';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const adminUser = useMemo(() => getAdminUser(), []);

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [warranties, setWarranties] = useState<AdminWarrantyClaim[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productStockFilter, setProductStockFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [returnsSubTab, setReturnsSubTab] = useState<'returns' | 'warranties'>('returns');

  // Modals state
  const [selectedProofOrder, setSelectedProofOrder] = useState<AdminOrder | null>(null);
  const [proofRejectReason, setProofRejectReason] = useState<string>('');
  const [isProcessingProof, setIsProcessingProof] = useState<boolean>(false);

  const [selectedStatusOrder, setSelectedStatusOrder] = useState<AdminOrder | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<string>('');
  const [newOrderTracking, setNewOrderTracking] = useState<string>('');

  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [editProductStock, setEditProductStock] = useState<number>(0);
  const [editProductPrice, setEditProductPrice] = useState<string>('');
  const [editProductRoadLegal, setEditProductRoadLegal] = useState<boolean>(false);

  const [selectedDetailOrder, setSelectedDetailOrder] = useState<AdminOrder | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate('/intern/login', { replace: true });
  };

  const loadAllData = useCallback(async (silent = false) => {
    if (!getAdminToken()) {
      navigate('/intern/login', { replace: true });
      return;
    }

    if (!silent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const [statsData, ordersData, productsData, returnsData, warrantiesData, customersData] = await Promise.all([
        fetchAdminStats().catch(() => null),
        fetchAdminOrders().catch(() => ({ count: 0, orders: [] })),
        fetchAdminProducts().catch(() => ({ count: 0, products: [] })),
        fetchAdminReturns().catch(() => ({ count: 0, returns: [] })),
        fetchAdminWarrantyClaims().catch(() => ({ count: 0, claims: [] })),
        fetchAdminCustomers().catch(() => ({ count: 0, customers: [] })),
      ]);

      if (statsData) setStats(statsData);
      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
      setReturns(returnsData.returns || []);
      setWarranties(warrantiesData.claims || []);
      setCustomers(customersData.customers || []);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Ungültig')) {
        handleLogout();
      } else {
        showNotification(err.message || 'Fehler beim Laden der Admin-Daten.', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Order Handlers
  const handleApprovePayment = async (orderId: string) => {
    setIsProcessingProof(true);
    try {
      const res = await approveAdminPaymentProof(orderId);
      showNotification(res.message || 'Zahlungsnachweis genehmigt. Rechnung wurde versendet.');
      setSelectedProofOrder(null);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim Genehmigen der Zahlung.', 'error');
    } finally {
      setIsProcessingProof(false);
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    if (!proofRejectReason.trim()) {
      showNotification('Bitte geben Sie einen Grund für die Ablehnung an.', 'error');
      return;
    }
    setIsProcessingProof(true);
    try {
      const res = await rejectAdminPaymentProof(orderId, proofRejectReason);
      showNotification(res.message || 'Zahlungsnachweis wurde abgelehnt.');
      setSelectedProofOrder(null);
      setProofRejectReason('');
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim Ablehnen.', 'error');
    } finally {
      setIsProcessingProof(false);
    }
  };

  const handleSaveOrderStatus = async () => {
    if (!selectedStatusOrder) return;
    try {
      await updateAdminOrderStatus(selectedStatusOrder.id, newOrderStatus, newOrderTracking);
      showNotification(`Bestellstatus für ${selectedStatusOrder.id} erfolgreich aktualisiert.`);
      setSelectedStatusOrder(null);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim Aktualisieren des Status.', 'error');
    }
  };

  const handleResendInvoice = async (orderId: string) => {
    try {
      await resendAdminInvoice(orderId);
      showNotification(`Offizielle Rechnung für Bestellung ${orderId} erneut versendet.`);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim E-Mail-Versand der Rechnung.', 'error');
    }
  };

  // Product Handlers
  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    try {
      const payload: any = {
        stock: editProductStock,
        price: parseFloat(editProductPrice) || selectedProduct.price,
      };
      if (selectedProduct.road_legal !== null) {
        payload.road_legal = editProductRoadLegal;
      }
      await updateAdminProduct(selectedProduct.id, payload);
      showNotification(`Produkt '${selectedProduct.name}' aktualisiert.`);
      setSelectedProduct(null);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim Speichern des Produkts.', 'error');
    }
  };

  // Return Handlers
  const handleUpdateReturn = async (returnId: string, newStatus: string) => {
    try {
      await updateAdminReturnStatus(returnId, newStatus);
      showNotification(`Status der Retoure ${returnId} aktualisiert.`);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim Aktualisieren der Retoure.', 'error');
    }
  };

  const handleUpdateWarranty = async (claimId: number, newStatus: string) => {
    try {
      await updateAdminWarrantyStatus(claimId, newStatus);
      showNotification(`Status des Garantieantrags aktualisiert.`);
      loadAllData(true);
    } catch (err: any) {
      showNotification(err.message || 'Fehler beim Aktualisieren des Garantieantrags.', 'error');
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (orderPaymentFilter === 'proof_submitted' && o.payment_status !== 'proof_submitted') return false;
      if (orderPaymentFilter === 'paid' && o.payment_status !== 'paid') return false;
      if (orderPaymentFilter === 'bank_transfer' && o.payment_method !== 'bank_transfer') return false;
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        const matchId = o.id.toLowerCase().includes(q);
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchEmail = o.email.toLowerCase().includes(q);
        const matchCity = o.shipping_address?.city?.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchEmail && !matchCity) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderPaymentFilter, orderSearch]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (productCategoryFilter !== 'all' && p.category_slug !== productCategoryFilter) return false;
      if (productStockFilter === 'low' && (p.stock > 5 || p.stock === 0)) return false;
      if (productStockFilter === 'out' && p.stock !== 0) return false;
      if (productStockFilter === 'in_stock' && p.stock <= 0) return false;
      if (productSearch) {
        const q = productSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCat) return false;
      }
      return true;
    });
  }, [products, productCategoryFilter, productStockFilter, productSearch]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (customerSearch) {
        const q = customerSearch.toLowerCase();
        return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
      }
      return true;
    });
  }, [customers, customerSearch]);

  const pendingProofsCount = useMemo(() => {
    return orders.filter(o => o.payment_status === 'proof_submitted').length;
  }, [orders]);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category_slug));
    return Array.from(set).filter(Boolean);
  }, [products]);

  const formatEUR = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-medium border animate-slideDown ${
          notification.type === 'error'
            ? 'bg-red-950/95 border-red-800 text-red-200'
            : notification.type === 'info'
            ? 'bg-blue-950/95 border-blue-800 text-blue-200'
            : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
        }`}>
          {notification.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Primary Top Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 font-black text-sm tracking-tight">
              TW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">TechnikWelt</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-blue-400 border border-slate-700 font-semibold">
                  Internes Kontrollzentrum
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Verwaltung • GoBD-konform • Markt Deutschland (EUR)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => loadAllData(false)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/80 cursor-pointer disabled:opacity-50"
              title="Daten aktualisieren"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium flex items-center gap-1.5 border border-slate-700/80"
            >
              <span className="hidden md:inline">Storefront öffnen</span>
              <ExternalLink size={13} />
            </a>

            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
              <Shield size={13} className="text-emerald-400" />
              <span>{adminUser?.full_name || 'Administrator'}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-900/60 text-red-300 hover:text-red-100 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp size={14} />
            <span>Übersicht & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Package size={14} />
            <span>Bestellungen & Zahlungen</span>
            {pendingProofsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                {pendingProofsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign size={14} />
            <span>Warenbestand & Katalog</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'returns'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <RotateCcw size={14} />
            <span>Retouren & Garantie</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users size={14} />
            <span>Kundenstamm</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {isLoading && !stats ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-3 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-medium text-slate-400">Lade Dashboard-Daten...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Pending Actions Banner if proofs exist */}
                {pendingProofsCount > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/70 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-black/40">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-amber-100">
                          {pendingProofsCount} Zahlungsnachweis{pendingProofsCount > 1 ? 'e' : ''} zur Prüfung ausstehend
                        </h2>
                        <p className="text-xs text-amber-300/80">
                          Kunden haben Überweisungsbelege hochgeladen. Prüfen und geben Sie die Bestellungen zur Lieferung frei.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('orders');
                        setOrderPaymentFilter('proof_submitted');
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-md"
                    >
                      Jetzt prüfen
                    </button>
                  </div>
                )}

                {/* KPI Metrics Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Gesamtumsatz (Brutto)</span>
                      <CreditCard size={16} className="text-emerald-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {formatEUR(stats?.metrics.total_revenue || 0)}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="text-emerald-400 font-semibold">{formatEUR(stats?.metrics.revenue_7d || 0)}</span>
                      <span>letzte 7 Tage</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Bestellungen Gesamt</span>
                      <Package size={16} className="text-blue-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {stats?.metrics.total_orders || 0}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="text-blue-400 font-semibold">+{stats?.metrics.orders_today || 0}</span>
                      <span>heute eingegangen</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Offene Retouren</span>
                      <RotateCcw size={16} className="text-amber-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {stats?.metrics.active_returns || 0}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="text-amber-400 font-semibold">{stats?.metrics.active_warranties || 0}</span>
                      <span>Garantieanträge</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Katalog & Lager</span>
                      <ShieldAlert size={16} className="text-purple-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {stats?.metrics.total_products || 0}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                      <span className={stats?.metrics.low_stock_products ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                        {stats?.metrics.low_stock_products || 0}
                      </span>
                      <span>mit geringem Bestand</span>
                    </div>
                  </div>
                </div>

                {/* Revenue Trend Chart & Quick Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2 Cols: 7-Day Revenue Trend Bars */}
                  <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-sm font-bold text-white">Umsatzentwicklung (Letzte 7 Tage)</h2>
                        <p className="text-xs text-slate-400">Reale Einnahmen aus bezahlten Bestellungen</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
                        GoBD Konform
                      </span>
                    </div>

                    <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2">
                      {(stats?.daily_points || []).map((point, idx) => {
                        const maxRev = Math.max(...(stats?.daily_points.map(p => p.revenue) || [100]), 100);
                        const heightPct = Math.min(100, Math.max(8, (point.revenue / maxRev) * 100));

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatEUR(point.revenue)}
                            </div>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full max-w-[48px] rounded-t-lg bg-blue-600/80 group-hover:bg-blue-500 transition-all relative overflow-hidden"
                            >
                              <div className="absolute inset-x-0 top-0 h-1 bg-blue-300"></div>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400 text-center">
                              <div>{point.day_name}</div>
                              <div className="text-[9px] text-slate-500 font-normal">{point.date}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Col: Quick Status Overview */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white">Bestell-Pipeline</h2>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          Zahlungsnachweis eingereicht
                        </span>
                        <span className="font-bold text-amber-400 font-mono">
                          {orders.filter(o => o.payment_status === 'proof_submitted').length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          In Bearbeitung
                        </span>
                        <span className="font-bold text-blue-400 font-mono">
                          {orders.filter(o => o.status === 'processing').length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          Versendet (DHL)
                        </span>
                        <span className="font-bold text-indigo-400 font-mono">
                          {orders.filter(o => o.status === 'shipped').length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          Zugestellt / Abgeschlossen
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {orders.filter(o => o.status === 'delivered').length}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Alle Bestellungen öffnen</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white">Letzte Bestelleingänge</h2>
                      <p className="text-xs text-slate-400">Echtzeit-Transaktionen der Kunden</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Alle anzeigen ({orders.length}) →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-3">Bestell-Nr.</th>
                          <th className="pb-3">Kunde</th>
                          <th className="pb-3">Datum</th>
                          <th className="pb-3">Zahlungsart</th>
                          <th className="pb-3">Zahlungsstatus</th>
                          <th className="pb-3 text-right">Gesamtbetrag</th>
                          <th className="pb-3 text-right">Aktion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {orders.slice(0, 6).map((o) => (
                          <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 font-mono font-bold text-blue-400">{o.id}</td>
                            <td className="py-3">
                              <div className="font-semibold text-slate-200">{o.customer_name}</div>
                              <div className="text-[11px] text-slate-500">{o.email}</div>
                            </td>
                            <td className="py-3 text-slate-400">{formatDate(o.created_at)}</td>
                            <td className="py-3 capitalize text-slate-300">{o.payment_method.replace('_', ' ')}</td>
                            <td className="py-3">
                              {o.payment_status === 'paid' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  Bezahlt
                                </span>
                              ) : o.payment_status === 'proof_submitted' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit animate-pulse">
                                  <Clock size={10} /> Beleg prüfen
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  {o.payment_status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right font-semibold font-mono text-white">
                              {formatEUR(o.grand_total)}
                            </td>
                            <td className="py-3 text-right">
                              {o.payment_proof_url ? (
                                <button
                                  onClick={() => setSelectedProofOrder(o)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer transition-colors"
                                >
                                  Beleg prüfen
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelectedDetailOrder(o)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer transition-colors"
                                >
                                  Details
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS & PAYMENTS */}
            {activeTab === 'orders' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Orders Filter Bar */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="flex-1 relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Suche nach Bestell-ID, Kunde, E-Mail, Stadt..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={orderPaymentFilter}
                      onChange={(e) => setOrderPaymentFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Alle Zahlungsarten</option>
                      <option value="proof_submitted">⚠️ Nachweis eingereicht ({pendingProofsCount})</option>
                      <option value="paid">Bezahlt</option>
                      <option value="bank_transfer">Vorkasse (Überweisung)</option>
                    </select>

                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Alle Status</option>
                      <option value="order_received">Eingegangen</option>
                      <option value="processing">In Bearbeitung</option>
                      <option value="shipped">Versendet</option>
                      <option value="delivered">Zugestellt</option>
                      <option value="cancelled">Storniert</option>
                    </select>
                  </div>
                </div>

                {/* Orders List Table */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-300">
                      Gefunden: <span className="text-white">{filteredOrders.length}</span> Bestellungen
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-3">Bestell-Nr.</th>
                          <th className="pb-3">Kunde / Lieferort</th>
                          <th className="pb-3">Zahlung</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Tracking</th>
                          <th className="pb-3 text-right">Summe</th>
                          <th className="pb-3 text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500">
                              Keine Bestellungen entsprechen den aktuellen Filterkriterien.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 font-mono font-bold text-blue-400">
                                {o.id}
                                <div className="text-[10px] text-slate-500 font-sans font-normal">
                                  {formatDate(o.created_at)}
                                </div>
                              </td>
                              <td className="py-3.5">
                                <div className="font-semibold text-slate-200">{o.customer_name}</div>
                                <div className="text-[11px] text-slate-400">{o.email}</div>
                                <div className="text-[10px] text-slate-500">
                                  {o.shipping_address?.postal_code} {o.shipping_address?.city}
                                </div>
                              </td>
                              <td className="py-3.5">
                                <div className="font-medium text-slate-300 capitalize">
                                  {o.payment_method.replace('_', ' ')}
                                </div>
                                <div className="mt-1">
                                  {o.payment_status === 'paid' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                      Bezahlt
                                    </span>
                                  ) : o.payment_status === 'proof_submitted' ? (
                                    <button
                                      onClick={() => setSelectedProofOrder(o)}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer animate-pulse"
                                    >
                                      <Eye size={10} /> Nachweis prüfen
                                    </button>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                      {o.payment_status}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  o.status === 'delivered'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : o.status === 'shipped'
                                    ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                    : o.status === 'processing'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-3.5">
                                {o.tracking_number ? (
                                  <span className="font-mono text-[11px] text-slate-300 flex items-center gap-1">
                                    <Truck size={12} className="text-blue-400" />
                                    {o.tracking_number}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-3.5 text-right font-mono font-semibold text-white">
                                {formatEUR(o.grand_total)}
                              </td>
                              <td className="py-3.5 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setSelectedStatusOrder(o);
                                    setNewOrderStatus(o.status);
                                    setNewOrderTracking(o.tracking_number || '');
                                  }}
                                  title="Status & DHL Tracking ändern"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Truck size={13} />
                                </button>
                                <button
                                  onClick={() => handleResendInvoice(o.id)}
                                  title="GoBD Rechnung erneut senden"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Send size={13} />
                                </button>
                                <button
                                  onClick={() => setSelectedDetailOrder(o)}
                                  title="Bestelldetails ansehen"
                                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                                >
                                  <Eye size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRODUCTS & INVENTORY */}
            {activeTab === 'products' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="flex-1 relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Suche nach Produktname, Marke oder Kategorie..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Alle Kategorien</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={productStockFilter}
                      onChange={(e) => setProductStockFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Alle Lagerbestände</option>
                      <option value="in_stock">Lieferbar (&gt;0)</option>
                      <option value="low">Gering (1-5 Stück)</option>
                      <option value="out">Ausverkauft (0)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-300">
                      Gefunden: <span className="text-white">{filteredProducts.length}</span> Artikel
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-3">Produkt</th>
                          <th className="pb-3">Kategorie</th>
                          <th className="pb-3">Preis</th>
                          <th className="pb-3">Lagerbestand</th>
                          <th className="pb-3">StVZO Zulassung</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Aktion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredProducts.slice(0, 100).map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 font-semibold text-slate-200">
                              <div className="flex items-center gap-2.5">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-slate-950 shrink-0 border border-slate-800"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Package size={14} />
                                  </div>
                                )}
                                <div className="max-w-xs truncate">
                                  <div className="truncate text-white">{p.name}</div>
                                  <div className="text-[10px] text-slate-500">{p.brand} • {p.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-slate-400">{p.category}</td>
                            <td className="py-3 font-mono font-bold text-white">
                              {formatEUR(p.price)}
                              {p.original_price && (
                                <div className="text-[10px] text-slate-500 line-through">
                                  {formatEUR(p.original_price)}
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.stock > 5
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : p.stock > 0
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-red-950 text-red-300 border border-red-800'
                              }`}>
                                {p.stock} auf Lager
                              </span>
                            </td>
                            <td className="py-3">
                              {p.road_legal !== null ? (
                                p.road_legal ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    StVZO Ja
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                                    Privatgelände
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-500 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setEditProductStock(p.stock);
                                  setEditProductPrice(String(p.price));
                                  setEditProductRoadLegal(Boolean(p.road_legal));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Edit size={12} />
                                <span>Bearbeiten</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: RETURNS & WARRANTIES */}
            {activeTab === 'returns' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setReturnsSubTab('returns')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      returnsSubTab === 'returns'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    DHL Retouren ({returns.length})
                  </button>
                  <button
                    onClick={() => setReturnsSubTab('warranties')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      returnsSubTab === 'warranties'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Garantie- & Reklamationsanträge ({warranties.length})
                  </button>
                </div>

                {returnsSubTab === 'returns' ? (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Retouren-ID</th>
                            <th className="pb-3">Bestellung</th>
                            <th className="pb-3">Kunde</th>
                            <th className="pb-3">Grund</th>
                            <th className="pb-3">Erstattung</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Status ändern</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {returns.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-500">
                                Keine Retouren eingereicht.
                              </td>
                            </tr>
                          ) : (
                            returns.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 font-mono font-bold text-blue-400">
                                  {r.id}
                                  <div className="text-[10px] text-slate-500 font-sans font-normal">
                                    {formatDate(r.created_at)}
                                  </div>
                                </td>
                                <td className="py-3 font-mono text-slate-300">{r.order_id}</td>
                                <td className="py-3">
                                  <div className="font-semibold text-slate-200">{r.customer_name}</div>
                                  <div className="text-[11px] text-slate-400">{r.customer_email}</div>
                                </td>
                                <td className="py-3 text-slate-300">{r.reason}</td>
                                <td className="py-3 font-mono font-bold text-white">
                                  {formatEUR(r.refund_amount)}
                                </td>
                                <td className="py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {r.status_display || r.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <select
                                    value={r.status}
                                    onChange={(e) => handleUpdateReturn(r.id, e.target.value)}
                                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                  >
                                    <option value="label_created">Etikett erstellt</option>
                                    <option value="in_transit">Unterwegs</option>
                                    <option value="received">Im Lager eingegangen</option>
                                    <option value="inspected">Ware geprüft</option>
                                    <option value="refunded">Erstattung freigegeben</option>
                                    <option value="rejected">Abgelehnt</option>
                                  </select>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">Vorgangs-Nr.</th>
                            <th className="pb-3">Kunde</th>
                            <th className="pb-3">Produkt</th>
                            <th className="pb-3">Kategorie / Mangel</th>
                            <th className="pb-3">Präferenz (§ 439 BGB)</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Status ändern</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {warranties.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-500">
                                Keine Garantieanträge vorhanden.
                              </td>
                            </tr>
                          ) : (
                            warranties.map((w) => (
                              <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 font-mono font-bold text-blue-400">
                                  {w.claim_number}
                                  <div className="text-[10px] text-slate-500 font-sans font-normal">
                                    {formatDate(w.created_at)}
                                  </div>
                                </td>
                                <td className="py-3">
                                  <div className="font-semibold text-slate-200">{w.customer_name}</div>
                                  <div className="text-[11px] text-slate-400">{w.customer_email}</div>
                                </td>
                                <td className="py-3 text-slate-200 font-medium">{w.product_name}</td>
                                <td className="py-3 text-slate-300">{w.defect_category}</td>
                                <td className="py-3 text-slate-300">{w.remedy_preference}</td>
                                <td className="py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {w.status_display || w.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <select
                                    value={w.status}
                                    onChange={(e) => handleUpdateWarranty(w.id, e.target.value)}
                                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                  >
                                    <option value="submitted">Eingereicht</option>
                                    <option value="in_review">In Prüfung</option>
                                    <option value="approved">Genehmigt</option>
                                    <option value="repair_scheduled">Reparatur veranlasst</option>
                                    <option value="replaced">Ersatzgerät versendet</option>
                                    <option value="rejected">Abgelehnt</option>
                                  </select>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: CUSTOMERS */}
            {activeTab === 'customers' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex-1 max-w-md relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Kunden suchen nach Name, E-Mail, Ort..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    Registrierte Kunden: <span className="text-white">{customers.length}</span>
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                          <th className="pb-3">Kunde</th>
                          <th className="pb-3">Standort</th>
                          <th className="pb-3">Telefon</th>
                          <th className="pb-3">Kunde seit</th>
                          <th className="pb-3 text-center">Bestellungen</th>
                          <th className="pb-3 text-right">Gesamtumsatz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              Keine Kunden gefunden.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3">
                                <div className="font-semibold text-slate-200">{c.full_name}</div>
                                <div className="text-[11px] text-slate-400">{c.email}</div>
                              </td>
                              <td className="py-3 text-slate-300">
                                {c.city ? `${c.city}, ${c.country}` : 'Deutschland'}
                              </td>
                              <td className="py-3 text-slate-400">{c.phone || '—'}</td>
                              <td className="py-3 text-slate-400">{formatDate(c.date_joined)}</td>
                              <td className="py-3 text-center font-bold text-white">{c.order_count}</td>
                              <td className="py-3 text-right font-mono font-bold text-emerald-400">
                                {formatEUR(c.total_spent)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL 1: INSPECT PAYMENT PROOF */}
      {selectedProofOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-semibold tracking-wider">
                  Zahlungsprüfung (Vorkasse / Banküberweisung)
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Bestellung {selectedProofOrder.id}
                </h3>
                <p className="text-xs text-slate-400">
                  Kunde: {selectedProofOrder.customer_name} ({selectedProofOrder.email}) • Betrag: {formatEUR(selectedProofOrder.grand_total)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Proof Preview Box */}
            <div className="border border-slate-800 rounded-2xl bg-slate-950 p-4 flex flex-col items-center justify-center min-h-[220px]">
              {selectedProofOrder.payment_proof_url ? (
                <div className="w-full text-center space-y-3">
                  {selectedProofOrder.payment_proof_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={selectedProofOrder.payment_proof_url}
                      alt="Überweisungsbeleg"
                      className="max-h-80 mx-auto rounded-xl object-contain shadow-lg border border-slate-800"
                    />
                  ) : (
                    <div className="py-8 space-y-3">
                      <FileText size={48} className="mx-auto text-blue-400" />
                      <p className="text-xs text-slate-300 font-semibold">
                        {selectedProofOrder.payment_proof_note || 'Dokument (PDF/Beleg)'}
                      </p>
                    </div>
                  )}
                  <a
                    href={selectedProofOrder.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                  >
                    Beleg in voller Auflösung öffnen <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Keine Belegdatei auffindbar.</p>
              )}
            </div>

            {/* Order Summary & Expected Details */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Zu überweisender Gesamtbetrag:</span>
                <span className="font-bold text-white font-mono">{formatEUR(selectedProofOrder.grand_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verwendungszweck:</span>
                <span className="font-bold text-blue-400 font-mono">{selectedProofOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hochgeladen am:</span>
                <span className="text-slate-200">{formatDate(selectedProofOrder.payment_proof_uploaded_at || '')}</span>
              </div>
            </div>

            {/* Rejection Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hinweis bei eventueller Ablehnung (optional)
              </label>
              <input
                type="text"
                placeholder="z. B. Betrag stimmt nicht überein, unleserlich..."
                value={proofRejectReason}
                onChange={(e) => setProofRejectReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
              <button
                disabled={isProcessingProof}
                onClick={() => handleApprovePayment(selectedProofOrder.id)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <Check size={16} />
                <span>Zahlung bestätigen & Bestellung freigeben</span>
              </button>

              <button
                disabled={isProcessingProof}
                onClick={() => handleRejectPayment(selectedProofOrder.id)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <X size={15} />
                <span>Beleg ablehnen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ORDER STATUS & TRACKING */}
      {selectedStatusOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Status & Tracking bearbeiten</h3>
                <p className="text-xs text-slate-400">Bestellung {selectedStatusOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedStatusOrder(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Erfüllungsstatus
                </label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="order_received">Eingegangen (order_received)</option>
                  <option value="payment_confirmed">Zahlung bestätigt (payment_confirmed)</option>
                  <option value="processing">In Bearbeitung (processing)</option>
                  <option value="shipped">Versendet (shipped)</option>
                  <option value="delivered">Zugestellt (delivered)</option>
                  <option value="cancelled">Storniert (cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  DHL Sendungsverfolgungsnummer (Tracking-Code)
                </label>
                <input
                  type="text"
                  placeholder="z. B. 00340434238753459231"
                  value={newOrderTracking}
                  onChange={(e) => setNewOrderTracking(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedStatusOrder(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveOrderStatus}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Änderungen speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK EDIT PRODUCT */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Produkt bearbeiten</h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lagerbestand (Stück)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editProductStock}
                  onChange={(e) => setEditProductStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Verkaufspreis (€ EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editProductPrice}
                  onChange={(e) => setEditProductPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {selectedProduct.road_legal !== null && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={editProductRoadLegal}
                      onChange={(e) => setEditProductRoadLegal(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Offizielle StVZO / eKFV Straßenzulassung aktiv</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ORDER DETAILS */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-semibold">
                  Bestelldetails
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Bestellung {selectedDetailOrder.id}
                </h3>
                <p className="text-xs text-slate-400">
                  Ausgestellt am: {formatDate(selectedDetailOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetailOrder(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer & Address */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Kunde:</span>
                <span className="font-semibold text-white">{selectedDetailOrder.customer_name}</span>
                <div className="text-slate-400">{selectedDetailOrder.email}</div>
                <div className="text-slate-400">{selectedDetailOrder.phone || 'Keine Telefonnummer'}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Lieferadresse:</span>
                <div className="text-slate-200">{selectedDetailOrder.shipping_address?.street}</div>
                <div className="text-slate-200">
                  {selectedDetailOrder.shipping_address?.postal_code} {selectedDetailOrder.shipping_address?.city}
                </div>
                <div className="text-slate-400">{selectedDetailOrder.shipping_address?.country}</div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Positionen:</span>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-950">
                {selectedDetailOrder.items.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{it.product_name}</div>
                      <div className="text-slate-400">{it.quantity}x {formatEUR(it.unit_price)}</div>
                    </div>
                    <div className="font-mono font-bold text-white">
                      {formatEUR(it.total_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monetary breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Zwischensumme:</span>
                <span className="font-mono text-slate-200">{formatEUR(selectedDetailOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Versandkosten:</span>
                <span className="font-mono text-slate-200">{formatEUR(selectedDetailOrder.shipping_total)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Enthaltene 19% MwSt.:</span>
                <span className="font-mono text-slate-200">{formatEUR(selectedDetailOrder.tax_total)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800 text-sm">
                <span>Gesamtbetrag (Brutto):</span>
                <span className="font-mono text-emerald-400">{formatEUR(selectedDetailOrder.grand_total)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleResendInvoice(selectedDetailOrder.id)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={14} />
                <span>GoBD Rechnung versenden</span>
              </button>

              <button
                onClick={() => setSelectedDetailOrder(null)}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer shadow-md"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;
