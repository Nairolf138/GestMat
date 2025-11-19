import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import './i18n';
import { GlobalProvider } from './GlobalContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom';
// Apply saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
} else {
  document.body.classList.remove('dark-theme');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <GlobalProvider>
            <App />
          </GlobalProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
