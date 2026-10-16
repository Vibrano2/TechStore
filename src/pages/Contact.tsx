import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, CheckCircle2, ArrowLeft, MessageSquare } from 'lucide-react';
import { useSEO } from '../utils/useSEO';

export const Contact: React.FC = () => {
  useSEO({
    title: 'Kundenservice & Kontakt',
    description: 'Kontaktieren Sie das TechnikWelt Kundenservice-Team per E-Mail, Telefon oder Kontaktformular. Wir helfen Ihnen gerne weiter.',
    canonical: '/contact'
  });

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
    }
  };

  return (
    <div className="container-custom py-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-electric-500 transition-colors">
          <ArrowLeft size={14} /> Zurück zur Startseite
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 shadow-xs space-y-8">
        <div className="border-b border-neutral-100 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-electric-600 bg-electric-50 px-2.5 py-1 rounded-md">
            Kundenservice
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900 mt-3 tracking-tight">Kontakt & Hilfe</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Haben Sie Fragen zu einer Bestellung, einem Produkt oder einer Rücksendung? Unser Support-Team ist für Sie da.
          </p>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <Phone size={20} className="text-electric-500 mb-2" />
            <h2 className="font-bold text-sm text-navy-900">Telefonischer Support</h2>
            <p className="text-xs text-navy-900 font-semibold mt-1">+49 (0) 89 2154 7890</p>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">Mo. - Fr. 09:00 - 18:00 Uhr</span>
          </div>
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <Mail size={20} className="text-electric-500 mb-2" />
            <h2 className="font-bold text-sm text-navy-900">E-Mail Service</h2>
            <p className="text-xs text-navy-900 font-semibold mt-1">info@technikwelt.shop</p>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">Antwort innerhalb 24 Std.</span>
          </div>
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
            <MapPin size={20} className="text-electric-500 mb-2" />
            <h2 className="font-bold text-sm text-navy-900">Standort</h2>
            <p className="text-xs text-navy-900 font-semibold mt-1">Maximilianstraße 35</p>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">80539 München, Deutschland</span>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-neutral-50/70 p-6 sm:p-8 rounded-2xl border border-neutral-200">
          <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-electric-500" /> Nachricht senden
          </h2>

          {submitted ? (
            <div className="bg-white p-6 rounded-xl border border-green-200 text-center space-y-2">
              <CheckCircle2 size={36} className="text-status-success mx-auto" />
              <h3 className="font-bold text-navy-900">Vielen Dank für Ihre Nachricht!</h3>
              <p className="text-xs text-neutral-600">
                Wir haben Ihre Anfrage erhalten und melden uns innerhalb von 24 Stunden bei Ihnen unter <strong>{formData.email}</strong>.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', subject: '', message: '' });
                }}
                className="mt-3 text-xs text-electric-600 font-semibold hover:underline"
              >
                Weitere Nachricht senden
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-navy-900 mb-1">
                    Ihr Name <span className="text-status-error">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Max Mustermann"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-electric-500"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-navy-900 mb-1">
                    Ihre E-Mail-Adresse <span className="text-status-error">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="max@beispiel.de"
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-semibold text-navy-900 mb-1">
                  Betreff
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Frage zu Bestellung / Produkt / Retoure"
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-navy-900 mb-1">
                  Ihre Nachricht <span className="text-status-error">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Wie können wir Ihnen behilflich sein?"
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-electric-500 resize-y"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-electric-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-electric-600 transition-colors shadow-sm text-sm"
              >
                <Send size={15} /> Nachricht absenden
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
