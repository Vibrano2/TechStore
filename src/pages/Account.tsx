import { useState, useEffect } from 'react';
import { Package, MapPin, RefreshCw, ShieldCheck, Heart, User, Lock, LogOut, CheckCircle, Mail, Plus, Trash2, Eye, FileText, Download, Loader2, AlertCircle, UploadCloud } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/formatPrice';
import type { SavedOrder } from './Checkout';
import type { OrderReturn, WarrantyClaim } from '../types';
import { fetchUserOrders, downloadInvoicePdf } from '../services/ordersApi';
import { fetchUserReturns, downloadReturnLabelPdf } from '../services/returnsApi';
import { fetchUserWarrantyClaims } from '../services/warrantyApi';
import { ReturnModal } from '../components/account/ReturnModal';
import { WarrantyModal } from '../components/account/WarrantyModal';
import { PaymentProofModal } from '../components/account/PaymentProofModal';
import { useSEO } from '../utils/useSEO';

interface Address {
  id: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  isDefault?: boolean;
}

export const Account = () => {
  const { user, isAuthenticated, logout, openAuthModal, updateUser } = useAuth();
  const location = useLocation();

  useSEO({
    title: 'Mein Kundenkonto | TechnikWelt',
    description: 'Verwalten Sie Ihre Bestellungen, Sendungsverfolgung, 30 Tage Rücksendungen und persönliche Daten bei TechnikWelt.',
  });

  const getTabFromPath = () => {
    if (location.pathname.includes('/orders')) return 'orders';
    if (location.pathname.includes('/returns')) return 'returns';
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) return tabParam;
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath);

  // Sync activeTab when URL pathname or search changes
  const [prevLoc, setPrevLoc] = useState(location.pathname + location.search);
  if (prevLoc !== location.pathname + location.search) {
    setPrevLoc(location.pathname + location.search);
    const nextTab = getTabFromPath();
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }

  const [orders, setOrders] = useState<SavedOrder[]>(() => {
    try {
      const savedOrders = localStorage.getItem('technikwelt_orders');
      if (savedOrders) return JSON.parse(savedOrders);
    } catch {
    }
    return [];
  });
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const handleDownloadInvoice = async (ord: SavedOrder) => {
    const id = ord.orderNumber || ord.id;
    if (downloadingOrderId) return;
    setDownloadingOrderId(id);
    setInvoiceError(null);
    const res = await downloadInvoicePdf(id, ord.customer?.email || user?.email);
    if (!res.success) {
      setInvoiceError(res.error || 'Rechnung konnte nicht heruntergeladen werden.');
    }
    setDownloadingOrderId(null);
  };

  const [returnsList, setReturnsList] = useState<OrderReturn[]>([]);
  const [isLoadingReturns, setIsLoadingReturns] = useState(false);
  const [downloadingReturnId, setDownloadingReturnId] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | undefined>(undefined);

  const [warrantyList, setWarrantyList] = useState<WarrantyClaim[]>([]);
  const [isLoadingWarranty, setIsLoadingWarranty] = useState(false);
  const [warrantyError, setWarrantyError] = useState<string | null>(null);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [warrantyModalOrderId, setWarrantyModalOrderId] = useState<string | undefined>(undefined);
  const [warrantyModalProductId, setWarrantyModalProductId] = useState<string | undefined>(undefined);

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofModalOrder, setProofModalOrder] = useState<SavedOrder | null>(null);

  const handleDownloadReturnPdf = async (ret: OrderReturn) => {
    if (downloadingReturnId) return;
    setDownloadingReturnId(ret.id);
    setReturnError(null);
    const res = await downloadReturnLabelPdf(ret.id, ret.customer_email || user?.email);
    if (!res.success) {
      setReturnError(res.error || 'DHL Retourenschein konnte nicht heruntergeladen werden.');
    }
    setDownloadingReturnId(null);
  };

  const [addresses, setAddresses] = useState<Address[]>(() => {
    try {
      const saved = localStorage.getItem('technikwelt_addresses');
      if (saved) return JSON.parse(saved);
    } catch {
    }
    return [
      {
        id: 'addr_1',
        name: 'Standard-Lieferadresse',
        street: user?.street || 'Musterstraße 42',
        postalCode: user?.postal_code || '10115',
        city: user?.city || 'Berlin',
        isDefault: true,
      }
    ];
  });

  const [newAddressStreet, setNewAddressStreet] = useState('');
  const [newAddressPostalCode, setNewAddressPostalCode] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState(user?.street || '');
  const [postalCode, setPostalCode] = useState(user?.postal_code || '');
  const [city, setCity] = useState(user?.city || '');
  const [isSaved, setIsSaved] = useState(false);

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setStreet(user.street || '');
      setPostalCode(user.postal_code || '');
      setCity(user.city || '');
    }
  }

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user?.email) {
      fetchUserOrders(user.email).then((fetched) => {
        if (isMounted && fetched && fetched.length > 0) {
          setOrders(fetched);
        }
      });
      fetchUserReturns(user.email).then((fetched) => {
        if (isMounted) setReturnsList(fetched);
      });
      fetchUserWarrantyClaims(user.email).then((fetched) => {
        if (isMounted) setWarrantyList(fetched);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.email]);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedOrder(null);
    if (tabId === 'orders' && user?.email) {
      fetchUserOrders(user.email).then((fetched) => {
        if (fetched && fetched.length > 0) {
          setOrders(fetched);
        }
      });
    }
    if (tabId === 'returns' && user?.email) {
      setIsLoadingReturns(true);
      fetchUserReturns(user.email).then((res) => {
        setReturnsList(res);
        setIsLoadingReturns(false);
      });
    }
    if (tabId === 'warranty' && user?.email) {
      setIsLoadingWarranty(true);
      setWarrantyError(null);
      fetchUserWarrantyClaims(user.email)
        .then((res) => {
          setWarrantyList(res);
          setIsLoadingWarranty(false);
        })
        .catch(() => {
          setWarrantyError('Garantieanträge konnten nicht geladen werden.');
          setIsLoadingWarranty(false);
        });
    }
  };

  useEffect(() => {
    localStorage.setItem('technikwelt_addresses', JSON.stringify(addresses));
  }, [addresses]);

  const userOrders = orders.filter((o) => {
    if (!user?.email) return false;
    return !o.customer?.email || o.customer.email.toLowerCase().trim() === user.email.toLowerCase().trim();
  });

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: <User size={18} /> },
    { id: 'orders', label: 'Bestellungen', icon: <Package size={18} /> },
    { id: 'addresses', label: 'Adressen', icon: <MapPin size={18} /> },
    { id: 'profile', label: 'Profil & Daten', icon: <User size={18} /> },
    { id: 'security', label: 'Sicherheit & OTP', icon: <Lock size={18} /> },
    { id: 'returns', label: 'Rücksendungen', icon: <RefreshCw size={18} /> },
    { id: 'warranty', label: 'Garantie & BGB', icon: <ShieldCheck size={18} /> },
    { id: 'favorites', label: 'Favoriten', icon: <Heart size={18} /> },
  ];

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      await updateUser({
        ...user,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim() || user.email,
        phone,
        street,
        postal_code: postalCode,
        city,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressStreet || !newAddressCity) return;
    const newAddr: Address = {
      id: `addr_${Date.now()}`,
      name: `Lieferadresse ${addresses.length + 1}`,
      street: newAddressStreet,
      postalCode: newAddressPostalCode,
      city: newAddressCity,
      isDefault: addresses.length === 0,
    };
    setAddresses([...addresses, newAddr]);
    setNewAddressStreet('');
    setNewAddressPostalCode('');
    setNewAddressCity('');
    setShowAddressForm(false);
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
  };

  if (!isAuthenticated) {
    return (
      <div className="container-custom py-16 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-electric-500/10 text-electric-500 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <User size={32} />
        </div>
        <h1 className="text-3xl font-bold text-navy-900 mb-3">Mein Kundenkonto</h1>
        <p className="text-neutral-600 text-sm mb-8 leading-relaxed">
          Melden Sie sich sicher mit Ihrer E-Mail-Adresse an. Wir senden Ihnen einen kostenlosen 6-stelligen Bestätigungscode (OTP) – ganz ohne Passwort.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => openAuthModal('signin')}
            className="btn-primary py-3 px-6 text-sm font-bold shadow-md"
          >
            Jetzt anmelden
          </button>
          <button
            onClick={() => openAuthModal('signup')}
            className="btn-secondary py-3 px-6 text-sm font-semibold"
          >
            Konto erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Mein Konto</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Angemeldet als <strong className="text-navy-900">{user?.email}</strong>
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-status-error hover:bg-red-50 border border-red-200 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Abmelden
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-electric-500 text-white font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-navy-900'
                } border-b border-neutral-100 last:border-b-0`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 min-h-[460px] shadow-xs">
            <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center justify-between">
              <span>{tabs.find((t) => t.id === activeTab)?.label}</span>
            </h2>

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="p-5 bg-[#F6F8FB] rounded-xl border border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-navy-900 text-base">
                      Willkommen zurück, {user?.first_name || user?.email.split('@')[0]}!
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      E-Mail: {user?.email} • Status: Verifiziert per Einmal-Code (OTP)
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-status-success">
                    <CheckCircle size={14} />
                    Verifiziertes Konto
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-xs">
                    <div className="text-2xl font-bold text-navy-900 mb-1">{userOrders.length}</div>
                    <div className="text-xs text-neutral-500">Getätigte Bestellungen</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-xs">
                    <div className="text-2xl font-bold text-navy-900 mb-1">{addresses.length}</div>
                    <div className="text-xs text-neutral-500">Hinterlegte Adressen</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-xs">
                    <div className="text-2xl font-bold text-status-success mb-1">Aktiv</div>
                    <div className="text-xs text-neutral-500">OTP-Sicherheitsstatus</div>
                  </div>
                </div>

                {userOrders.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-bold text-navy-900 text-sm mb-3">Letzte Bestellung</h4>
                    <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="font-bold text-navy-900">#{userOrders[0].orderNumber}</span>
                        <span className="font-bold text-navy-900">{formatPrice(userOrders[0].total)}</span>
                      </div>
                      <div className="text-xs text-neutral-500 flex justify-between">
                        <span>{userOrders[0].date} • {userOrders[0].items.length} Artikel</span>
                        <span className="text-status-success font-semibold">{userOrders[0].status}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                {userOrders.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
                    <Package size={40} className="mx-auto mb-3 text-neutral-300" />
                    <p className="font-medium text-navy-900">Noch keine Bestellungen vorhanden.</p>
                    <p className="text-xs text-neutral-400 mt-1">Sobald Sie eine Bestellung aufgeben, erscheint diese hier.</p>
                    <Link to="/category/all" className="btn-primary inline-flex text-xs mt-4">
                      Jetzt einkaufen
                    </Link>
                  </div>
                ) : (
                  userOrders.map((ord) => (
                    <div key={ord.id} className="border border-neutral-200 rounded-xl p-5 hover:border-[#B8CEF5] transition-all bg-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-4 border-b border-neutral-100">
                        <div>
                          <div className="font-bold text-navy-900 text-base">Bestellung #{ord.orderNumber}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">Bestellt am: {ord.date} • {ord.paymentMethod}</div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                          <div className="font-bold text-navy-900 text-lg">{formatPrice(ord.total)}</div>
                          <span className="inline-block bg-status-success/10 text-status-success text-xs px-2.5 py-0.5 rounded-full font-semibold mt-1">
                            {ord.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="flex gap-3 items-center">
                            <div className="w-12 h-12 bg-neutral-50 rounded-lg p-1 shrink-0 flex items-center justify-center border border-neutral-100">
                              <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-navy-900 text-sm truncate">{item.name}</div>
                              <div className="text-xs text-neutral-500">Menge: {item.quantity} • {formatPrice(item.price)}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-2 text-xs text-neutral-500">
                        <span>{ord.shippingMethod}</span>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleDownloadInvoice(ord)}
                            disabled={downloadingOrderId === (ord.orderNumber || ord.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-navy-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Offizielle Rechnung (PDF) gem. §14 UStG herunterladen"
                          >
                            {downloadingOrderId === (ord.orderNumber || ord.id) ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-electric-500" />
                                <span>Laden...</span>
                              </>
                            ) : (
                              <>
                                <FileText size={13} className="text-electric-500" />
                                <span>Rechnung (PDF)</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setReturnModalOrderId(ord.orderNumber || ord.id);
                              setIsReturnModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-600 hover:text-navy-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors cursor-pointer"
                            title="Artikel aus dieser Bestellung zurücksenden (30 Tage Rückgaberecht)"
                          >
                            <RefreshCw size={12} className="text-electric-500" />
                            <span>Retoure</span>
                          </button>
                          <button
                            onClick={() => {
                              setWarrantyModalOrderId(ord.orderNumber || ord.id);
                              setWarrantyModalProductId(ord.items[0]?.id);
                              setIsWarrantyModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-600 hover:text-navy-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors cursor-pointer"
                            title="Gewährleistungsfall melden (§ 439 BGB)"
                          >
                            <ShieldCheck size={12} className="text-electric-500" />
                            <span>Garantie</span>
                          </button>
                          {(ord.paymentMethod.toLowerCase().includes('überweis') || ord.paymentMethod.toLowerCase().includes('bank')) && (
                            <button
                              onClick={() => {
                                setProofModalOrder(ord);
                                setIsProofModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100/90 border border-amber-200 rounded-md transition-colors cursor-pointer"
                              title="Zahlungsnachweis / Überweisungsbeleg übermitteln"
                            >
                              <UploadCloud size={13} className="text-amber-700" />
                              <span>Zahlungsnachweis</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrder(selectedOrder?.id === ord.id ? null : ord)}
                            className="text-electric-500 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={14} /> {selectedOrder?.id === ord.id ? 'Weniger anzeigen' : 'Details ansehen'}
                          </button>
                        </div>
                      </div>

                      {invoiceError && (
                        <div className="mt-2 text-xs text-status-error bg-red-50 border border-red-200 p-2 rounded-lg">
                          {invoiceError}
                        </div>
                      )}

                      {selectedOrder?.id === ord.id && (
                        <div className="mt-4 p-4 bg-neutral-50 rounded-xl text-xs space-y-2 border border-neutral-200 animate-fadeIn">
                          <div className="font-semibold text-navy-900 text-sm mb-2">Liefer- & Rechnungsdetails:</div>
                          <div><strong>Empfänger:</strong> {ord.customer.firstName} {ord.customer.lastName}</div>
                          <div><strong>Lieferadresse:</strong> {ord.customer.street}, {ord.customer.postalCode} {ord.customer.city}</div>
                          <div><strong>Zwischensumme:</strong> {formatPrice(ord.subtotal)}</div>
                          <div><strong>Enthaltene MwSt. (19%):</strong> {formatPrice(ord.vatAmount)}</div>
                          <div><strong>Versandkosten:</strong> {ord.shipping === 0 ? 'Kostenlos' : formatPrice(ord.shipping)}</div>
                          <div className="pt-2 font-bold text-navy-900 text-sm">Gesamtsumme: {formatPrice(ord.total)}</div>
                          <div className="pt-2">
                            <button
                              onClick={() => handleDownloadInvoice(ord)}
                              disabled={downloadingOrderId === (ord.orderNumber || ord.id)}
                              className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Download size={13} />
                              Rechnung (PDF) erneut herunterladen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-neutral-500">Verwalten Sie Ihre Liefer- und Rechnungsadressen für schnellere Bestellungen.</p>
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Neue Adresse
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                    <h4 className="font-bold text-navy-900 text-sm">Neue Lieferadresse anlegen</h4>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">Straße & Hausnummer</label>
                      <input
                        type="text"
                        required
                        value={newAddressStreet}
                        onChange={(e) => setNewAddressStreet(e.target.value)}
                        placeholder="Musterweg 10"
                        className="w-full border border-neutral-300 rounded-lg p-2 text-xs outline-none bg-white focus:border-electric-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">PLZ</label>
                        <input
                          type="text"
                          required
                          value={newAddressPostalCode}
                          onChange={(e) => setNewAddressPostalCode(e.target.value)}
                          placeholder="80331"
                          className="w-full border border-neutral-300 rounded-lg p-2 text-xs outline-none bg-white focus:border-electric-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">Stadt</label>
                        <input
                          type="text"
                          required
                          value={newAddressCity}
                          onChange={(e) => setNewAddressCity(e.target.value)}
                          placeholder="München"
                          className="w-full border border-neutral-300 rounded-lg p-2 text-xs outline-none bg-white focus:border-electric-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="btn-primary text-xs py-2 px-4">Speichern</button>
                      <button type="button" onClick={() => setShowAddressForm(false)} className="btn-secondary text-xs py-2 px-4">Abbrechen</button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="border border-neutral-200 rounded-xl p-4 relative bg-white flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-navy-900 text-sm">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="bg-electric-50 text-electric-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-electric-200">
                              Standard
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {addr.street}<br />
                          {addr.postalCode} {addr.city}<br />
                          Deutschland
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-electric-500 hover:underline font-medium cursor-pointer"
                          >
                            Als Standard setzen
                          </button>
                        )}
                        {addresses.length > 1 && (
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-status-error hover:text-red-700 ml-auto flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={13} /> Löschen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
                {isSaved && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-status-success text-xs font-semibold flex items-center gap-2">
                    <CheckCircle size={16} />
                    Profil erfolgreich aktualisiert!
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1">E-Mail (verifiziert)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-neutral-100 border border-neutral-200 rounded-lg p-2.5 text-sm text-neutral-500 cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1">Vorname</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1">Nachname</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1">Telefonnummer</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+49 170 1234567"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1">Straße & Hausnummer</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Musterstraße 12"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1">PLZ</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="10115"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1">Stadt</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Berlin"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary py-2.5 px-5 text-sm font-bold cursor-pointer">
                  Änderungen speichern
                </button>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4 max-w-xl">
                <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-3 mb-3">
                    <ShieldCheck className="text-electric-500" size={24} />
                    <h3 className="font-bold text-navy-900 text-base">Passwortlose OTP-Sicherheit</h3>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                    Ihr Konto bei <strong>TechnikWelt</strong> wird über kryptografisch sichere Einmal-Codes (OTP) geschützt. Sie benötigen kein statisches Passwort, das gestohlen oder kompromittiert werden könnte.
                  </p>
                  <div className="text-xs text-neutral-700 bg-white p-3 rounded-lg border border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-electric-500" />
                      <span>Verifizierte E-Mail: <strong>{user?.email}</strong></span>
                    </div>
                    <span className="text-status-success font-semibold flex items-center gap-1">
                      <CheckCircle size={14} /> Aktiv
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-navy-900">Rücksendungen & Retouren</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      30 Tage Rückgaberecht • Kostenfreies DHL Retourenetikett • Gesetzlicher Widerruf gem. § 355 BGB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReturnModalOrderId(undefined);
                      setIsReturnModalOpen(true);
                    }}
                    className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Neue Rücksendung anlegen</span>
                  </button>
                </div>

                {returnError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{returnError}</span>
                  </div>
                )}

                {isLoadingReturns ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Loader2 size={24} className="animate-spin text-electric-500 mb-2" />
                    <span className="text-xs text-neutral-400">Rücksendungen werden geladen...</span>
                  </div>
                ) : returnsList.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-neutral-200 p-6">
                    <RefreshCw size={36} className="mx-auto mb-3 text-neutral-300" />
                    <p className="font-semibold text-navy-900">Keine aktiven Rücksendungen</p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Möchten Sie einen Artikel aus einer Ihrer Bestellungen zurücksenden? Bei TechnikWelt genießen Sie 30 Tage Rückgaberecht mit kostenfreier DHL Retoure.
                    </p>
                    <button
                      onClick={() => {
                        setReturnModalOrderId(undefined);
                        setIsReturnModalOpen(true);
                      }}
                      className="btn-secondary py-2 px-5 text-xs inline-flex items-center gap-1.5 mt-4 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Rücksendung veranlassen</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returnsList.map((ret) => (
                      <div
                        key={ret.id}
                        className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs transition-shadow hover:shadow-sm"
                      >
                        <div className="flex flex-wrap justify-between items-start gap-3 border-b border-neutral-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-navy-900 font-mono text-sm">{ret.id}</span>
                              <span className="bg-electric-50 text-electric-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-electric-200">
                                {ret.status_display}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                              Zugehörige Bestellung: <strong className="text-navy-900">{ret.order_id}</strong> • Erstellt am {new Date(ret.created_at).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-neutral-500 block">Erstattung</span>
                            <span className="font-bold text-navy-900 text-sm">{formatPrice(ret.refund_amount)}</span>
                          </div>
                        </div>

                        <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-neutral-500">Grund:</span>{' '}
                            <span className="font-medium text-navy-900">{ret.reason_display}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Erstattungsweg:</span>{' '}
                            <span className="font-medium text-navy-900">{ret.refund_method_display}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Logistikdienstleister:</span>{' '}
                            <span className="font-medium text-navy-900">{ret.carrier}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">DHL Sendungsnummer:</span>{' '}
                            <span className="font-mono text-navy-900 font-medium">{ret.return_tracking_number}</span>
                          </div>
                        </div>

                        {ret.items_data && ret.items_data.length > 0 && (
                          <div className="bg-neutral-50 rounded-lg p-3 text-xs space-y-1.5 border border-neutral-100">
                            <span className="font-semibold text-navy-900 block mb-1">Retournierte Artikel:</span>
                            {ret.items_data.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-neutral-600">
                                <span>{it.quantity}x {it.product_name}</span>
                                <span className="font-medium text-navy-900">{formatPrice(it.unit_price * it.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-2">
                          <span className="text-[11px] text-neutral-500">
                            Paket kostenfrei in jeder DHL Filiale oder Packstation abgeben.
                          </span>
                          <button
                            onClick={() => handleDownloadReturnPdf(ret)}
                            disabled={downloadingReturnId === ret.id}
                            className="btn-secondary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {downloadingReturnId === ret.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-electric-500" />
                                <span>Laden...</span>
                              </>
                            ) : (
                              <>
                                <Download size={13} />
                                <span>DHL Retourenschein (PDF)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'warranty' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-navy-900">Garantie & Gesetzliche Gewährleistung</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      24 Monate gesetzliche Gewährleistung gem. §§ 437, 438 BGB • Recht auf Nacherfüllung gem. § 439 BGB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setWarrantyModalOrderId(undefined);
                      setWarrantyModalProductId(undefined);
                      setIsWarrantyModalOpen(true);
                    }}
                    className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Neuen Garantieantrag stellen</span>
                  </button>
                </div>

                {warrantyError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{warrantyError}</span>
                  </div>
                )}

                {isLoadingWarranty ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Loader2 size={24} className="animate-spin text-electric-500 mb-2" />
                    <span className="text-xs text-neutral-400">Garantieanträge werden geladen...</span>
                  </div>
                ) : warrantyList.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-neutral-200 p-6">
                    <ShieldCheck size={36} className="mx-auto mb-3 text-neutral-300" />
                    <p className="font-semibold text-navy-900">Keine Garantie- oder Gewährleistungsfälle</p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Weist ein bei TechnikWelt gekauftes Gerät einen technischen Defekt auf? Sie haben vollen Anspruch auf kostenfreie Reparatur oder Austausch gem. § 439 BGB.
                    </p>
                    <button
                      onClick={() => {
                        setWarrantyModalOrderId(undefined);
                        setWarrantyModalProductId(undefined);
                        setIsWarrantyModalOpen(true);
                      }}
                      className="btn-secondary py-2 px-5 text-xs inline-flex items-center gap-1.5 mt-4 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Garantieantrag stellen</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {warrantyList.map((claim) => (
                      <div
                        key={claim.claim_number}
                        className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs transition-shadow hover:shadow-sm"
                      >
                        <div className="flex flex-wrap justify-between items-start gap-3 border-b border-neutral-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-navy-900 font-mono text-sm">{claim.claim_number}</span>
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                {claim.status_display}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                              Produkt: <strong className="text-navy-900">{claim.product_name}</strong> • Eingereicht am {new Date(claim.created_at).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                          {claim.order_id && (
                            <div className="text-xs text-neutral-500">
                              Bestellnummer: <strong className="text-navy-900">{claim.order_id}</strong>
                            </div>
                          )}
                        </div>

                        <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-neutral-500">Fehlerkategorie:</span>{' '}
                            <span className="font-medium text-navy-900">{claim.defect_category_display}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Gewählte Nacherfüllung (§ 439 BGB):</span>{' '}
                            <span className="font-medium text-navy-900">{claim.remedy_preference_display}</span>
                          </div>
                          {claim.serial_number && (
                            <div>
                              <span className="text-neutral-500">Seriennummer:</span>{' '}
                              <span className="font-mono text-neutral-800">{claim.serial_number}</span>
                            </div>
                          )}
                        </div>

                        <div className="bg-neutral-50 rounded-lg p-3 text-xs text-neutral-700 border border-neutral-100 space-y-1">
                          <span className="font-semibold text-navy-900 block">Fehlerbeschreibung:</span>
                          <p className="italic text-neutral-600 leading-relaxed">{claim.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                          <span>Technik-Servicecenter Prüfung läuft • Kostenfreie Abwicklung</span>
                          <span className="text-electric-500 font-medium">TechnikWelt Servicestatus: Aktiv</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="text-center py-12">
                <Heart size={40} className="mx-auto mb-3 text-neutral-300" />
                <p className="font-medium text-navy-900">Ihre gemerkten Artikel</p>
                <p className="text-xs text-neutral-400 mt-1">Sehen und verwalten Sie alle Ihre Favoriten in der Wunschliste.</p>
                <Link to="/wishlist" className="btn-primary inline-flex text-xs px-5 py-2.5 mt-4">
                  Zur Wunschliste
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        orders={userOrders}
        userEmail={user?.email || ''}
        userName={user?.full_name || user?.email || 'Kunde'}
        initialOrderId={returnModalOrderId}
        onReturnCreated={(ret) => {
          setReturnsList((prev) => [ret, ...prev.filter((r) => r.id !== ret.id)]);
        }}
      />

      <WarrantyModal
        isOpen={isWarrantyModalOpen}
        onClose={() => setIsWarrantyModalOpen(false)}
        orders={userOrders}
        userEmail={user?.email || ''}
        userName={user?.full_name || user?.email || 'Kunde'}
        initialOrderId={warrantyModalOrderId}
        initialProductId={warrantyModalProductId}
        onClaimCreated={(claim) => {
          setWarrantyList((prev) => [claim, ...prev.filter((c) => c.claim_number !== claim.claim_number)]);
        }}
      />

      <PaymentProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        order={proofModalOrder}
        userEmail={user?.email || ''}
        onProofSubmitted={(orderId) => {
          setOrders((prev) =>
            prev.map((o) =>
              (o.orderNumber || o.id) === orderId ? { ...o, status: 'In Bearbeitung' } : o
            )
          );
        }}
      />
    </div>
  );
};

