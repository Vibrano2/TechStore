import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Settings, 
  ChevronDown, 
  Star, 
  ArrowRight,
  ExternalLink,
  Key,
  Check,
  Bot
} from 'lucide-react';
import { 
  type ChatMessage, 
  sendChatMessage, 
  getStoredApiKey, 
  setStoredApiKey, 
  getStoredChatHistory, 
  saveStoredChatHistory 
} from '../../services/aiChatService';
import logoSvg from '../../assets/SVG/logo.svg';

const getFormattedTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const makeMessageId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg',
    sender: 'assistant',
    text: `Hallo! 👋 Ich bin Ihr **TechnikWelt KI-Berater**.\n\nIch helfe Ihnen gerne bei:\n• **Produktauswahl & Vergleichen** (z. B. Smartphones, Laptops, E-Mobilität)\n• **Bestellstatus & DHL Sendungsverfolgung**\n• **30 Tage Rücksendungen & Retourenschein**\n• **Garantie & Reparatur nach § 439 BGB**\n\nWie kann ich Sie heute unterstützen?`,
    timestamp: '09:00',
  },
];

const QUICK_PROMPTS = [
  '📱 Welches Smartphone empfehlen Sie?',
  '📦 Wo ist meine Bestellung?',
  '🔄 Wie funktioniert die Retoure?',
  '🛡️ Wie läuft ein Garantiefall ab?',
  '⚡ E-Scooter mit Straßenzulassung',
];

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = getStoredChatHistory();
    return saved.length > 0 ? saved : INITIAL_MESSAGES;
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey());
  const [apiKeySavedNotice, setApiKeySavedNotice] = useState(false);
  const [showGreetingBubble, setShowGreetingBubble] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveStoredChatHistory(messages);
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleOpenWidget = () => {
    setIsOpen(true);
    setShowGreetingBubble(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleToggleSettings = () => {
    setShowSettings(prev => {
      const next = !prev;
      if (next) {
        setApiKeyInput(getStoredApiKey());
      }
      return next;
    });
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: makeMessageId('user'),
      sender: 'user',
      text: textToSend,
      timestamp: getFormattedTime(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await sendChatMessage(newMessages);
      const assistantMessage: ChatMessage = {
        id: makeMessageId('assistant'),
        sender: 'assistant',
        text: result.text,
        timestamp: getFormattedTime(),
        suggestedProducts: result.products,
      };
      setMessages([...newMessages, assistantMessage]);
    } catch {
      const errorMsg: ChatMessage = {
        id: makeMessageId('err'),
        sender: 'assistant',
        text: 'Entschuldigung, es gab einen kurzen Verbindungsfehler. Bitte versuchen Sie es erneut oder wenden Sie sich an kontakt@technikwelt.de.',
        timestamp: getFormattedTime(),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    if (window.confirm('Möchten Sie den Chatverlauf wirklich zurücksetzen?')) {
      setMessages(INITIAL_MESSAGES);
      saveStoredChatHistory([]);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(apiKeyInput);
    setApiKeySavedNotice(true);
    setTimeout(() => {
      setApiKeySavedNotice(false);
      setShowSettings(false);
    }, 1200);
  };

  // Helper to render markdown-like links [title](url) and bold **text**
  const renderFormattedText = (content: string) => {
    const paragraphs = content.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      const lines = para.split('\n');

      return (
        <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
          {lines.map((line, lIdx) => {
            const formatted = parseInlineFormatting(line);
            return (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {formatted}
              </React.Fragment>
            );
          })}
        </p>
      );
    });
  };

  const parseInlineFormatting = (line: string) => {
    // Regex for [text](url) and **bold**
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    const regex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Link [text](url)
        const linkText = match[2];
        const linkUrl = match[3];
        const isExternal = linkUrl.startsWith('http');

        if (isExternal) {
          parts.push(
            <a
              key={keyIdx++}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-500 font-semibold underline hover:text-blue-700 inline-flex items-center gap-0.5"
            >
              {linkText} <ExternalLink size={11} className="inline" />
            </a>
          );
        } else {
          parts.push(
            <Link
              key={keyIdx++}
              to={linkUrl}
              onClick={() => {
                if (window.innerWidth < 768) setIsOpen(false);
              }}
              className="text-electric-500 font-semibold underline hover:text-blue-700"
            >
              {linkText}
            </Link>
          );
        }
      } else if (match[4]) {
        // Bold **text**
        parts.push(<strong key={keyIdx++} className="font-semibold text-navy-900">{match[5]}</strong>);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return parts.length > 0 ? parts : remaining;
  };

  return (
    <>
      {/* Floating Greeting Bubble (when closed) */}
      {!isOpen && showGreetingBubble && (
        <div className="fixed bottom-24 md:bottom-22 right-4 md:right-6 z-50 bg-white border border-[#E3E8EF] shadow-lg rounded-2xl p-3.5 max-w-xs animate-bounce-subtle flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-electric-500/10 flex items-center justify-center shrink-0 text-electric-500 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 text-xs text-navy-900 leading-snug">
            <p className="font-semibold text-navy-900">Fragen zum Einkauf?</p>
            <p className="text-neutral-500 mt-0.5">Unser KI-Berater hilft Ihnen bei Produkten, Retouren & Garantie.</p>
            <button
              onClick={handleOpenWidget}
              className="mt-2 text-electric-500 hover:text-blue-700 font-bold inline-flex items-center gap-1 text-[11px]"
            >
              Jetzt Chat starten <ArrowRight size={12} />
            </button>
          </div>
          <button
            onClick={() => setShowGreetingBubble(false)}
            aria-label="Hinweis schließen"
            className="text-neutral-400 hover:text-neutral-600 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Floating Chat Launcher Button */}
      <button
        onClick={() => (isOpen ? setIsOpen(false) : handleOpenWidget())}
        aria-label={isOpen ? 'Chatbot schließen' : 'KI-Berater öffnen'}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 bg-navy-900 hover:bg-navy-900/90 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-electric-500/20 group border-2 border-white"
      >
        <div className="relative">
          {isOpen ? (
            <X size={26} className="transition-transform duration-200 group-hover:rotate-90" />
          ) : (
            <>
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src={logoSvg} 
                  alt="TechnikWelt" 
                  className="w-full h-full object-contain filter drop-shadow" 
                />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-electric-500 rounded-full border-2 border-navy-900 animate-pulse" />
            </>
          )}
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          role="dialog"
          aria-label="TechnikWelt KI-Berater Chatfenster"
          className="fixed bottom-20 md:bottom-22 right-3 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[min(540px,calc(100dvh-130px))] max-h-[calc(100dvh-130px)] bg-white rounded-2xl shadow-2xl border border-[#E3E8EF] flex flex-col overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="bg-navy-900 text-white p-3.5 px-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white rounded-lg p-1 flex items-center justify-center shrink-0 shadow-sm">
                <img src={logoSvg} alt="TechnikWelt Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">TechnikWelt KI-Berater</h3>
                  <span className="inline-flex items-center gap-1 bg-electric-500/20 text-blue-200 border border-electric-500/30 text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
                    <Sparkles size={9} /> AI
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                  <span>Online • Antwortet sofort</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleSettings}
                aria-label="KI-Einstellungen"
                title="API-Schlüssel konfigurieren"
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings ? 'bg-white/20 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings size={16} />
              </button>
              <button
                onClick={handleResetChat}
                aria-label="Chat zurücksetzen"
                title="Chatverlauf leeren"
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fenster minimieren"
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Settings Drawer (API Key configuration) */}
          {showSettings && (
            <div className="bg-neutral-50 p-4 border-b border-[#E3E8EF] animate-fadeIn text-xs text-navy-900">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Key size={14} className="text-electric-500" />
                  Gemini API-Schlüssel (Optional)
                </span>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2 leading-relaxed">
                Hinterlegen Sie Ihren kostenlosen Google Gemini API-Schlüssel für noch tiefere KI-Dialoge. Ohne Schlüssel antwortet der intelligente Katalog-Assistent.
              </p>
              <form onSubmit={handleSaveApiKey} className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-[#E3E8EF] rounded-lg text-xs outline-none focus:border-electric-500"
                />
                <button
                  type="submit"
                  className="bg-electric-500 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1"
                >
                  {apiKeySavedNotice ? <Check size={14} /> : 'Speichern'}
                </button>
              </form>
              <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-electric-500 hover:underline flex items-center gap-0.5"
                >
                  Kostenlosen Key bei Google AI Studio holen <ExternalLink size={10} />
                </a>
                {getStoredApiKey() && (
                  <button
                    type="button"
                    onClick={() => {
                      setStoredApiKey('');
                      setApiKeyInput('');
                    }}
                    className="text-status-error hover:underline"
                  >
                    Key entfernen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F6F8FB]/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-electric-500 text-white rounded-br-xs'
                      : 'bg-white text-navy-900 border border-[#E3E8EF] rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'assistant' ? (
                    <div className="space-y-1">
                      {renderFormattedText(msg.text)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>

                {/* Product Recommendation Cards (if any) */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="w-full mt-2.5 space-y-2">
                    <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      Empfohlene Artikel:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.suggestedProducts.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/product/${prod.slug}`}
                          onClick={() => {
                            if (window.innerWidth < 768) setIsOpen(false);
                          }}
                          className="bg-white hover:bg-neutral-50 p-2.5 rounded-xl border border-[#E3E8EF] flex items-center gap-3 transition-all hover:border-electric-500 hover:shadow-md group"
                        >
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-12 h-12 object-contain rounded-lg bg-neutral-100 p-1 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 shrink-0">
                              <Bot size={20} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-navy-900 text-xs truncate group-hover:text-electric-500 transition-colors">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <span className="font-bold text-navy-900">{prod.price.toFixed(2)} €</span>
                              <span className="flex items-center text-amber-500 text-[10px]">
                                <Star size={10} className="fill-current mr-0.5" />
                                {prod.rating}
                              </span>
                            </div>
                          </div>
                          <span className="text-electric-500 font-semibold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform">
                            Details →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[10px] text-neutral-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 bg-white border border-[#E3E8EF] rounded-2xl rounded-bl-xs p-3 max-w-[120px] shadow-sm">
                <div className="w-2 h-2 rounded-full bg-electric-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-electric-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-electric-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 3 && !isLoading && (
            <div className="p-2 px-3 bg-white border-t border-[#E3E8EF] overflow-x-auto scrollbar-none flex gap-1.5">
              {QUICK_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  className="bg-neutral-50 hover:bg-neutral-100 text-navy-900 border border-[#E3E8EF] hover:border-electric-500/40 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-[#E3E8EF] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Frage zu Produkten, Retouren, Garantie..."
              className="flex-1 px-3.5 py-2.5 bg-[#F6F8FB] border border-[#E3E8EF] focus:bg-white focus:border-electric-500 focus:ring-2 focus:ring-electric-500/10 rounded-full text-xs font-medium outline-none transition-all placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              aria-label="Nachricht absenden"
              className="w-9 h-9 bg-electric-500 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
