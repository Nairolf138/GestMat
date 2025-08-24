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
