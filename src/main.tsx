import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialisiere den QueryClient mit aggressiven Caching-Strategien für historische Daten
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Keine unnötigen Requests, wenn der Tab gewechselt wird
      staleTime: 1000 * 60 * 60 * 24, // Daten bleiben 24 Stunden im RAM als "frisch" markiert
      retry: false, // Bei 429 Rate Limits wollen wir nicht sofort nochmal anfragen
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
