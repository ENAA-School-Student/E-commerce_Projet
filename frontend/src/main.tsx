import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 2600,
                style: {
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.8125rem',
                  background: '#2f3131',
                  color: '#f0f1f1',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  boxShadow: '0 -4px 20px rgba(60, 64, 72, 0.18)',
                },
                success: { iconTheme: { primary: '#00abb3', secondary: '#2f3131' } },
                error: { iconTheme: { primary: '#ba1a1a', secondary: '#2f3131' } },
              }}
            />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
