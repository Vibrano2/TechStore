import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that whenever a user navigates to any new page
 * or changes query parameters, the viewport immediately resets to the top (scrollY: 0).
 * If a hash anchor is provided (e.g. #faq), it scrolls smoothly to that specific anchor.
 */
export const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If navigating to an in-page anchor, scroll to that element
    if (hash) {
      try {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      } catch {
        // Fallback to top if invalid selector
      }
    }

    // Immediately reset scroll to the top of the page
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Secondary frame check in case of lazy-loaded route chunk hydration
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname, search, hash]);

  return null;
};
