import { mockProducts } from '../data/mockProducts';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  suggestedProducts?: Array<{
    id: string;
    slug: string;
    name: string;
    price: number;
    rating: number;
    image?: string;
  }>;
}

const STORAGE_KEY_API_KEY = 'technikwelt_gemini_api_key';
const STORAGE_KEY_HISTORY = 'technikwelt_chat_history';

export const getStoredApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem(STORAGE_KEY_API_KEY) ||
    ''
  );
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  }
};

export const getStoredChatHistory = (): ChatMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveStoredChatHistory = (messages: ChatMessage[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages.slice(-30)));
  } catch {
    // Ignore storage quota errors
  }
};

// Summary of top products for grounding
const productGroundingContext = mockProducts
  .slice(0, 40)
  .map(
    (p) =>
      `- ${p.name} (${p.brand}, Kategorie: ${p.category}): ${p.price.toFixed(2)} EUR, Bewertung: ${p.rating}/5. Link: /product/${p.slug}. ${p.shortDescription}`
  )
  .join('\n');

const SYSTEM_PROMPT = `
Du bist der offizielle, hochqualifizierte KI-Verkaufs- und Kundenservice-Berater von "TechnikWelt Deutschland" (Webshop: technikwelt.shop).
Deine Aufgabe ist es, Kunden freundlich, kompetent und präzise bei der Produktauswahl, technischen Fragen und Kundenservice-Themen zu beraten.

WICHTIGE GESCHÄFTS- & RECHTLICHE REGELN FÜR DEN DEUTSCHEN MARKT:
1. Sprache: Antworte standardmäßig auf Deutsch (professionell, zuvorkommend, "Sie"-Form). Falls der Kunde auf Englisch schreibt, antworte auf Englisch.
2. Währung: Ausschließlich Euro (EUR, z. B. 499,00 €). Alle Preise verstehen sich inkl. 19 % gesetzlicher MwSt.
3. Versand: Schneller DHL GoGreen Versand innerhalb Deutschlands (Standard: 3-15 Werktage, Express: 2-5 Werktage). Versandkostenfrei ab 50 € Bestellwert.
4. Rückgaberecht: 30 Tage freiwilliges Rückgaberecht mit kostenloser DHL Retoure. Retouren können im Kundenkonto unter /account oder direkt unter /account/returns gestartet werden.
5. Gewährleistung & Garantie: 24 Monate gesetzliche Gewährleistung nach § 439 BGB mit kostenfreier Reparatur oder Austausch bei Mängeln. Zusätzlich bieten viele Hersteller 2 Jahre Garantie. Garantie-Tracking unter /warranty.
6. E-Mobilität: Betone bei E-Scootern stets die deutsche Straßenzulassung (StVZO / eKFV, max. 20 km/h, Versicherungskennzeichen erforderlich).
7. Produktauswahl: Empfehle konkrete Produkte aus dem Sortiment und formatiere Produktlinks immer im Markdown-Format: [Produktname](/product/slug).
8. Datenschutz & Sicherheit: TechnikWelt nutzt sichere Einmal-Codes (OTP) per E-Mail für passwortlosen Login und erfüllt alle DSGVO-Vorgaben.

Hier ist ein Auszug verfügbarer Top-Produkte:
${productGroundingContext}

Formatierung:
- Halte Antworten übersichtlich mit Bullet Points oder kurzen Absätzen.
- Bei Produktempfehlungen nenne Name, Preis und warum es zum Kunden passt.
- Sei ehrlich, wenn ein Produkt für einen bestimmten Zweck nicht optimal ist.
`.trim();

/**
 * Intelligent local fallback when no API key is set yet.
 */
const generateLocalFallbackResponse = (userPrompt: string): { text: string; products?: ChatMessage['suggestedProducts'] } => {
  const lower = userPrompt.toLowerCase();

  // 1. Order tracking
  if (lower.includes('bestellung') || lower.includes('wo ist mein') || lower.includes('tracking') || lower.includes('paket') || lower.includes('status')) {
    return {
      text: `Sie können den Status Ihrer Bestellung jederzeit transparent einsehen:\n\n• **Im Kundenkonto:** Gehen Sie zu [Ihre Bestellungen](/account/orders), um den aktuellen Lieferstatus und die Sendungsverfolgung via DHL aufzurufen.\n• **Direkte Sendungsverfolgung:** Besuchen Sie unsere Seite [Bestellstatus](/account/orders) mit Ihrer Bestellnummer.\n\nDer Versand erfolgt standardmäßig in **3–15 Werktagen mit DHL GoGreen** (bzw. **2–5 Werktage per Express**).`,
    };
  }

  // 2. Returns
  if (lower.includes('retoure') || lower.includes('rücksend') || lower.includes('zurücksenden') || lower.includes('umtausch') || lower.includes('widerruf')) {
    return {
      text: `Bei TechnikWelt genießen Sie **30 Tage Rückgaberecht**:\n\n1. Öffnen Sie den Bereich [Rücksendungen](/account/returns) in Ihrem Kundenkonto.\n2. Wählen Sie den Artikel und den Rücksendegrund aus.\n3. Drucken Sie Ihr **kostenfreies DHL Retourenlabel** aus oder nutzen Sie den mobilen QR-Code in der DHL Filiale.\n4. Nach Eingang und Prüfung wird der Erstattungsbetrag innerhalb von 3–5 Werktagen gutgeschrieben.`,
    };
  }

  // 3. Warranty
  if (lower.includes('garantie') || lower.includes('defekt') || lower.includes('kaputt') || lower.includes('reparatur') || lower.includes('gewährleistung')) {
    return {
      text: `Sie haben vollen gesetzlichen Anspruch auf **24 Monate Gewährleistung gem. § 439 BGB** sowie Herstellergarantie:\n\n• Kostenfreie Reparatur oder Austausch bei technischen Defekten.\n• Sie können Ihren Anspruch direkt online unter [Garantiefall melden](/warranty) einreichen und nachverfolgen.\n• Unser Serviceteam in Deutschland bearbeitet Gewährleistungsfälle prioritär.`,
    };
  }

  // 4. E-Mobility
  if (lower.includes('scooter') || lower.includes('roller') || lower.includes('e-bike') || lower.includes('fahrrad') || lower.includes('mobilität') || lower.includes('zulassung')) {
    const eMobilityProducts = mockProducts.filter((p) => p.category.includes('E-Mobilität')).slice(0, 3);
    return {
      text: `Unsere E-Mobilitäts-Produkte sind für den **deutschen Straßenverkehr (StVZO / eKFV)** zugelassen:\n\n• Höchstgeschwindigkeit 20 km/h mit Straßenzulassung (ABE).\n• Versicherungsplakette erforderlich.\n• Inklusive 2 Jahren Herstellergarantie auf Rahmen und Motor.\n\nEntdecken Sie unsere Top-Modelle in der Kategorie [E-Mobilität](/category/e-mobility):`,
      products: eMobilityProducts.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        rating: p.rating,
        image: p.images[0],
      })),
    };
  }

  // 5. Smartphones
  if (lower.includes('smartphone') || lower.includes('handy') || lower.includes('iphone') || lower.includes('galaxy') || lower.includes('apple') || lower.includes('samsung')) {
    const phoneProducts = mockProducts.filter((p) => p.category.includes('Smartphone')).slice(0, 3);
    return {
      text: `Hier sind unsere aktuellen Top-Empfehlungen im Bereich **Smartphones**:\n\n• Neueste Generation mit 5G und OLED-Displays.\n• 2 Jahre Herstellergarantie & Express-Lieferung.\n\nSchauen Sie sich die Modelle im Detail an oder besuchen Sie alle [Smartphones](/category/smartphones):`,
      products: phoneProducts.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        rating: p.rating,
        image: p.images[0],
      })),
    };
  }

  // 6. Gaming / Consoles
  if (lower.includes('gaming') || lower.includes('playstation') || lower.includes('nintendo') || lower.includes('xbox') || lower.includes('konsole') || lower.includes('switch')) {
    const gamingProducts = mockProducts.filter((p) => p.category.includes('Gaming')).slice(0, 3);
    return {
      text: `Für Gamer bieten wir die neuesten Konsolen und Zubehör mit offizieller Herstellergarantie:\n\n• Sofort lieferbar in 3–15 Werktagen (Express: 2–5 Werktage).\n• Besuchen Sie unsere komplette Kategorie [Gaming & Konsolen](/category/gaming):\n`,
      products: gamingProducts.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        rating: p.rating,
        image: p.images[0],
      })),
    };
  }

  // 7. General search / recommendation
  const matched = mockProducts
    .filter((p) => lower.split(' ').some((word) => word.length >= 4 && (p.name.toLowerCase().includes(word) || p.category.toLowerCase().includes(word))))
    .slice(0, 3);

  if (matched.length > 0) {
    return {
      text: `Gerne! Passend zu Ihrer Anfrage habe ich folgende Empfehlungen aus unserem aktuellen Sortiment gefunden:`,
      products: matched.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        rating: p.rating,
        image: p.images[0],
      })),
    };
  }

  return {
    text: `Hallo! Ich bin Ihr persönlicher KI-Berater bei TechnikWelt Deutschland.\n\nIch kann Ihnen helfen bei:\n• **Produktsuche & Kaufberatung** (Smartphones, Laptops, Gaming, E-Mobilität)\n• **Bestellstatus & DHL Sendungsverfolgung**\n• **30 Tage Rücksendungen & DHL Retourenlabel**\n• **Garantie- & Gewährleistungsansprüche (§ 439 BGB)**\n\nWie kann ich Ihnen heute helfen?`,
  };
};

/**
 * Send chat message to Gemini API (with fallback to local intelligent catalog engine).
 */
export const sendChatMessage = async (
  messages: ChatMessage[],
  apiKeyOverride?: string
): Promise<{ text: string; products?: ChatMessage['suggestedProducts']; isLiveAi: boolean }> => {
  const apiKey = (apiKeyOverride || getStoredApiKey()).trim();
  const lastUserMessage = messages[messages.length - 1];

  if (!apiKey) {
    // Intelligent local catalog assistant fallback
    const fallback = generateLocalFallbackResponse(lastUserMessage.text);
    return {
      text: fallback.text,
      products: fallback.products,
      isLiveAi: false,
    };
  }

  // Call Gemini REST API directly
  try {
    const formattedHistory = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: formattedHistory,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      console.warn('[TechnikWelt AI] Gemini API error, falling back:', errMsg);
      const fallback = generateLocalFallbackResponse(lastUserMessage.text);
      return {
        text: `${fallback.text}\n\n*(Hinweis: Der konfigurierte Gemini API-Schlüssel meldete: "${errMsg}". Antworten erfolgen über den internen Katalog-Assistenten.)*`,
        products: fallback.products,
        isLiveAi: false,
      };
    }

    const data = await response.json();
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!candidateText) {
      const fallback = generateLocalFallbackResponse(lastUserMessage.text);
      return { text: fallback.text, products: fallback.products, isLiveAi: false };
    }

    // Check if the AI recommended any specific product slugs
    const suggestedProducts: ChatMessage['suggestedProducts'] = [];
    const slugRegex = /\/product\/([a-z0-9-]+)/g;
    let match;
    const seenSlugs = new Set<string>();

    while ((match = slugRegex.exec(candidateText)) !== null) {
      const slug = match[1];
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        const prod = mockProducts.find((p) => p.slug === slug);
        if (prod && suggestedProducts.length < 3) {
          suggestedProducts.push({
            id: prod.id,
            slug: prod.slug,
            name: prod.name,
            price: prod.price,
            rating: prod.rating,
            image: prod.images[0],
          });
        }
      }
    }

    return {
      text: candidateText,
      products: suggestedProducts.length > 0 ? suggestedProducts : undefined,
      isLiveAi: true,
    };
  } catch (err: any) {
    console.warn('[TechnikWelt AI] Network error, using local assistant:', err);
    const fallback = generateLocalFallbackResponse(lastUserMessage.text);
    return {
      text: fallback.text,
      products: fallback.products,
      isLiveAi: false,
    };
  }
};
