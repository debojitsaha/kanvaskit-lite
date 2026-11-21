import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import '@/app/styles.css';

const mRootElement = document.getElementById('root');

if (!mRootElement) {
  throw new Error('Root element #root not found');
}

createRoot(mRootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
