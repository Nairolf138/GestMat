import React, { useEffect, useState, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './AuthContext.jsx';

export function addToCart(newItem) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(
    (it) =>
      it.equipment._id === newItem.equipment._id &&
      it.startDate === newItem.startDate &&
      it.endDate === newItem.endDate
  );
  if (existing) {
    existing.quantity += newItem.quantity;
  } else {
    cart.push(newItem);
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  return cart;
}

function Cart() {
  const { t } = useTranslation();
  const [cart, setCart] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [borrower, setBorrower] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
  }, []);

  useEffect(() => {
    setBorrower(user?.structure?._id || user?.structure || '');
  }, [user]);

  const removeItem = (idx) => {
    const newCart = cart.filter((_, i) => i !== idx);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const updateQuantity = (idx, quantity) => {
    const value = Number(quantity);
    if (value <= 0) {
      removeItem(idx);
      return;
    }
    const newCart = cart.map((item, i) =>
      i === idx ? { ...item, quantity: value } : item
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const outlineDangerStyle = {
    color: 'var(--color-danger)',
    borderColor: 'var(--color-danger)',
    backgroundColor: 'transparent',
  };

  const primaryBtnStyle = {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: '#fff',
  };

  const validate = async () => {
    if (!cart.length) return;
    const groups = {};
    cart.forEach((it) => {
      const owner = it.equipment.structure?._id || it.equipment.structure;
      const key = `${owner}-${it.startDate}-${it.endDate}`;
      if (!groups[key]) {
        groups[key] = {
          owner,
          startDate: it.startDate,
          endDate: it.endDate,
          items: [],
        };
      }
      groups[key].items.push({ equipment: it.equipment._id, quantity: it.quantity });
    });
    try {
      await Promise.all(
        Object.values(groups).map((g) =>
          api('/loans', {
            method: 'POST',
            body: JSON.stringify({ ...g, borrower }),
          })
        )
      );
        setCart([]);
        localStorage.removeItem('cart');
        setSuccess(t('cart.requests_sent'));
        setError('');
      } catch (err) {
        setError(err.message || t('common.error'));
        setSuccess('');
      }
    };

  return (
      <div className="container">
        <NavBar />
        <main id="main-content">
        <h1 className="h1">{t('cart.title')}</h1>
        <Alert message={error} />
        <Alert type="success" message={success} />
      <ul className="list-group mb-3">
        {cart.map((it, idx) => (
          <li
            key={idx}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <span>
              {it.equipment.name} ({it.startDate} → {it.endDate})
            </span>
            <div className="d-flex align-items-center">
              <input
                type="number"
                min="1"
                value={it.quantity}
                onChange={(e) => updateQuantity(idx, e.target.value)}
                className="form-control me-3"
                style={{ width: '6rem' }}
              />
              <button
                className="btn btn-sm"
                style={outlineDangerStyle}
                onClick={() => removeItem(idx)}
              >
                {t('cart.remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>
        <button
          disabled={!cart.length}
          onClick={validate}
          className="btn"
          style={primaryBtnStyle}
        >
          {t('cart.send_requests')}
        </button>
      </main>
      </div>
  );
}

export default Cart;
