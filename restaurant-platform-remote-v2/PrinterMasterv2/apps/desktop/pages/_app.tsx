import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Global error handling
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.error('Global renderer error', {
          message: event.error?.message,
          stack: event.error?.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.error('Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        body {
          display: block !important;
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
      <div className="min-h-screen">
        <Component {...pageProps} />
      </div>
    </>
  );
}