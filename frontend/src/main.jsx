import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import './i18n';
import { GlobalProvider } from './GlobalContext.jsx';
import { AuthProvider } from './AuthContext.jsx';

const queryClient = new QueryClient();

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
      <AuthProvider>
        <GlobalProvider>
          <App />
        </GlobalProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
