import React, { useEffect, useState, useContext } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './AuthContext.jsx';
import { formatDate } from './utils/dateFormat.js';
import { showToast } from './toast';

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cartGroupKey(item) {
  const owner = item.equipment.structure?._id || item.equipment.structure;
  return JSON.stringify([owner, item.startDate, item.endDate]);
}

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
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState({});
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
    setPendingSubmissions(
      JSON.parse(localStorage.getItem('cartSubmissionIds') || '{}'),
    );
    const storedNote = localStorage.getItem('cartNote') || '';
    setNote(storedNote);
  }, []);

  useEffect(() => {
    setBorrower(user?.structure?._id || user?.structure || '');
  }, [user]);

  const removeItem = (idx) => {
    const newCart = cart.filter((_, i) => i !== idx);
    const key = cartGroupKey(cart[idx]);
    if (!newCart.some((item) => cartGroupKey(item) === key)) {
      const nextPending = { ...pendingSubmissions };
      delete nextPending[key];
      setPendingSubmissions(nextPending);
      if (Object.keys(nextPending).length)
        localStorage.setItem('cartSubmissionIds', JSON.stringify(nextPending));
      else localStorage.removeItem('cartSubmissionIds');
    }
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const updateQuantity = (idx, quantity) => {
    const value = Number(quantity);
    if (!Number.isSafeInteger(value) || value < 1) {
      showToast(t('cart.invalid_quantity'));
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
    if (!cart.length || submitting) return;
    setSubmitting(true);
    const groups = {};
    cart.forEach((it) => {
      const owner = it.equipment.structure?._id || it.equipment.structure;
      const key = cartGroupKey(it);
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
      const entries = Object.entries(groups);
      const submissionIds = JSON.parse(
        localStorage.getItem('cartSubmissionIds') || '{}',
      );
      if (
        entries.some(
          ([key, group]) =>
            submissionIds[key] &&
            submissionIds[key].content !==
              JSON.stringify({ ...group, borrower, note }),
        )
      ) {
        setError(t('cart.retry_changed'));
        return;
      }
      const requests = entries.map(([key, group]) => {
        const content = JSON.stringify({ ...group, borrower, note });
        if (!submissionIds[key]) {
          submissionIds[key] = { content, id: newRequestId() };
        }
        return api('/loans', {
          method: 'POST',
          body: JSON.stringify({
            ...group,
            borrower,
            note,
            clientRequestId: submissionIds[key].id,
          }),
        });
      });
      localStorage.setItem('cartSubmissionIds', JSON.stringify(submissionIds));
      const results = await Promise.allSettled(requests);
      const sentKeys = new Set(
        entries
          .filter((_, i) => results[i].status === 'fulfilled')
          .map(([key]) => key),
      );
      for (const key of sentKeys) delete submissionIds[key];
      setPendingSubmissions({ ...submissionIds });
      if (Object.keys(submissionIds).length)
        localStorage.setItem(
          'cartSubmissionIds',
          JSON.stringify(submissionIds),
        );
      else localStorage.removeItem('cartSubmissionIds');
      const remaining = cart.filter((it) => {
        return !sentKeys.has(cartGroupKey(it));
      });
      setCart(remaining);
      if (remaining.length)
        localStorage.setItem('cart', JSON.stringify(remaining));
      else {
        localStorage.removeItem('cart');
        localStorage.removeItem('cartNote');
        setNote('');
      }
      setSuccess(
        sentKeys.size
          ? t('cart.requests_sent_count', { count: sentKeys.size })
          : '',
      );
      const failed = results.filter((result) => result.status === 'rejected');
      setError(
        failed.length
          ? t('cart.requests_remaining', {
              count: failed.length,
              reason: failed[0].reason?.message || t('common.error'),
            })
          : '',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="h1">{t('cart.title')}</h1>
      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />
      <ul className="list-group mb-3">
        {cart.map((it, idx) => {
          const structure =
            typeof it.equipment.structure === 'string'
              ? it.equipment.structure
              : it.equipment.structure?.name;
          const startLabel = formatDate(it.startDate);
          const endLabel = formatDate(it.endDate);
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
                ({startLabel} → {endLabel})
              </span>
              <div className="d-flex align-items-center">
                <input
                  type="number"
                  min="1"
                  disabled={
                    submitting || Boolean(pendingSubmissions[cartGroupKey(it)])
                  }
                  value={it.quantity}
                  onChange={(e) => updateQuantity(idx, e.target.value)}
                  className="form-control me-3"
                  style={{ width: '6rem' }}
                />
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removeItem(idx)}
                  disabled={submitting}
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
          disabled={submitting || Object.keys(pendingSubmissions).length > 0}
          onChange={(e) => handleNoteChange(e.target.value)}
        />
      </div>
      <button
        disabled={!cart.length || submitting}
        onClick={validate}
        className="btn btn-primary"
      >
        {t('cart.send_requests')}
      </button>
    </>
  );
}

export default Cart;
