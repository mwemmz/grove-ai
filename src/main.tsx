import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import App from './App.tsx';
import { applyTheme, getStoredTheme } from './themes';

applyTheme(getStoredTheme(), false);

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <div className="min-h-dvh bg-bg text-slate-100 flex items-center justify-center font-sans">
        <div className="max-w-md rounded-2xl bg-surface border border-line p-8 text-center">
          <h1 className="text-xl font-bold text-text mb-2">Missing VITE_CLERK_PUBLISHABLE_KEY</h1>
          <p className="text-sm text-slate-400">
            Copy <code className="text-emerald-400">.env.example</code> to{' '}
            <code className="text-emerald-400">.env.local</code>, fill in your Clerk publishable key,
            and restart the dev server.
          </p>
        </div>
      </div>
    )}
  </StrictMode>,
);
