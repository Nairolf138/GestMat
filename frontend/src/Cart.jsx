import React, { useEffect, useState, useContext } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './AuthContext.jsx';

export function addToCart(newItem) {
  const equipmentStructure = newItem.equipment?.structure;
  const cartItem = {
    ...newItem,
    equipment: {
      ...newItem.equipment,
      structure: equipmentStructure,
    },
  };
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(
    (it) =>
      it.equipment._id === cartItem.equipment._id &&
      it.startDate === cartItem.startDate &&
      it.endDate === cartItem.endDate,
  );
  if (existing) {
    existing.quantity += cartItem.quantity;
    if (!existing.equipment.structure && cartItem.equipment.structure) {
      existing.equipment.structure = cartItem.equipment.structure;
    }
  } else {
    cart.push(cartItem);
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
  const [note, setNote] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
    const storedNote = localStorage.getItem('cartNote') || '';
    setNote(storedNote);
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
      i === idx ? { ...item, quantity: value } : item,
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const handleNoteChange = (value) => {
    setNote(value);
    localStorage.setItem('cartNote', value);
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
      groups[key].items.push({
        equipment: it.equipment._id,
        quantity: it.quantity,
      });
    });
    try {
      await Promise.all(
        Object.values(groups).map((g) =>
          api('/loans', {
            method: 'POST',
            body: JSON.stringify({ ...g, borrower, note }),
          }),
        ),
      );
      setCart([]);
      setNote('');
      localStorage.removeItem('cart');
      localStorage.removeItem('cartNote');
      setSuccess(t('cart.requests_sent'));
      setError('');
    } catch (err) {
      setError(err.message || t('common.error'));
      setSuccess('');
    }
  };

  return (
    <>
      <h1 className="h1">{t('cart.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <ul className="list-group mb-3">
        {cart.map((it, idx) => {
          const structure =
            typeof it.equipment.structure === 'string'
              ? it.equipment.structure
              : it.equipment.structure?.name;
          return (
            <li
              key={idx}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>
                {it.equipment.name}
                {structure && (
                  <>
                    {' '}
                    <span className="text-muted">
                      {t('cart.structure_label', { structure })}
                    </span>
                  </>
                )}{' '}
                ({it.startDate} → {it.endDate})
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
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removeItem(idx)}
                >
                  {t('cart.remove')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mb-3">
        <label className="form-label" htmlFor="cart-note">
          {t('cart.note_label')}
        </label>
        <textarea
          id="cart-note"
          className="form-control"
          placeholder={t('cart.note_placeholder')}
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
        />
      </div>
      <button disabled={!cart.length} onClick={validate} className="btn btn-primary">
        {t('cart.send_requests')}
      </button>
    </>
  );
}

export default Cart;
