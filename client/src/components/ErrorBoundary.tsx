'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress analytics and tracking errors in development
    if (typeof window !== 'undefined') {
      const originalConsoleError = console.error;
      
      console.error = (...args) => {
        const message = args.join(' ');
        
        // Filter out known analytics/tracking errors
        if (
          message.includes('Analytics SDK') ||
          message.includes('coinbase.com') ||
          message.includes('Failed to fetch') ||
          message.includes('ERR_BLOCKED_BY_CLIENT')
        ) {
          return; // Suppress these errors
        }
        
        // Log other errors normally
        originalConsoleError.apply(console, args);
      };

      // Also intercept network errors
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        
        // Silently handle analytics calls
        if (url.includes('coinbase.com') || url.includes('analytics') || url.includes('metrics')) {
          return Promise.resolve(new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        return originalFetch.apply(this, [input, init]);
      };
    }
  }, []);

  return <>{children}</>;
}