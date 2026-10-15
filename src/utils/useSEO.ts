import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_TITLE = 'TechnikWelt | Ihr Elektronik- & E-Mobilitäts-Fachhändler';
const DEFAULT_DESC = 'TechnikWelt: Entdecken Sie hochwertige Smartphones, Computer & Laptops, TV, Audio, E-Mobilität und Smart Home. Schneller DHL-Versand und 24 Monate Gewährleistung.';
const BASE_URL = 'https://technikwelt.shop';

export function useSEO({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogType = 'website',
  ogImage = `${BASE_URL}/logo.svg`,
  schema
}: SEOProps) {
  useEffect(() => {
    // 1. Page Title
    const fullTitle = title
      ? (title.includes('TechnikWelt') ? title : `${title} | TechnikWelt`)
      : DEFAULT_TITLE;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (attrName: string, attrVal: string, content: string) => {
      let tag = document.querySelector(`meta[${attrName}="${attrVal}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrVal);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 2. Meta description
    setMeta('name', 'description', description);

    // 3. Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:site_name', 'TechnikWelt');
    setMeta('property', 'og:locale', 'de_DE');

    // 4. Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    // 5. Canonical Link
    const canonicalUrl = canonical 
      ? (canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical.startsWith('/') ? '' : '/'}${canonical}`)
      : window.location.href.split('?')[0];

    let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonicalUrl);
    setMeta('property', 'og:url', canonicalUrl);

    // 6. JSON-LD Structured Data
    const scriptId = 'dynamic-seo-schema';
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    if (schema) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [title, description, canonical, ogType, ogImage, schema]);
}
