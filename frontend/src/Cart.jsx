import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';

function Cart() {
  const [cart, setCart] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [borrower, setBorrower] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
    api('/users/me')
      .then((u) => setBorrower(u.structure?._id || u.structure || ''))
      .catch(() => {});
  }, []);

  const removeItem = (idx) => {
    const newCart = cart.filter((_, i) => i !== idx);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
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
      setSuccess('Demandes envoyées');
      setError('');
    } catch (err) {
      setError(err.message || 'Erreur');
      setSuccess('');
    }
  };

  return (
    <div className="container">
      <NavBar />
      <h1>Panier</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <ul className="list-group mb-3">
        {cart.map((it, idx) => (
          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
            <span>
              {it.equipment.name} - {it.quantity}x ({it.startDate} → {it.endDate})
            </span>
            <button className="btn btn-outline-danger btn-sm" onClick={() => removeItem(idx)}>
              Supprimer
            </button>
          </li>
        ))}
      </ul>
      <button disabled={!cart.length} onClick={validate} className="btn btn-primary">
        Valider la demande de prêt
      </button>
    </div>
  );
}

export default Cart;
