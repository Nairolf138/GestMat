import React, { useEffect, useState, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';
import { useTranslation } from 'react-i18next';

function Loans() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [tab, setTab] = useState('owner');

  useEffect(() => {
    api('/loans')
      .then(setLoans)
      .catch(() => setLoans([]));
  }, []);

  const updateStatus = async (id, status) => {
    await api(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    api('/loans').then(setLoans);
  };

  const categorize = (list) => {
    const now = new Date();
    const finished = [];
    const ongoing = [];
    const upcoming = [];
    list.forEach((l) => {
      const start = l.startDate ? new Date(l.startDate) : null;
      const end = l.endDate ? new Date(l.endDate) : null;
      if (l.status === 'refused' || (end && end < now)) {
        finished.push(l);
      } else if (start && start > now) {
        upcoming.push(l);
      } else {
        ongoing.push(l);
      }
    });
    return { finished, ongoing, upcoming };
  };

  const structureId = user?.structure?._id || user?.structure;
  const ownerLoans = categorize(
    loans.filter((l) => l.owner?._id === structureId || l.owner === structureId)
  );
  const borrowerLoans = categorize(
    loans.filter((l) => l.borrower?._id === structureId || l.borrower === structureId)
  );

  const renderList = (list, isOwner) => (
    <ul className="list-group mb-3">
      {list.map((l) => (
        <li key={l._id} className="list-group-item">
          {l.owner?.name} → {l.borrower?.name} :
          {l.items?.map((it) =>
            it.equipment ? ` ${it.equipment.name} x${it.quantity}` : ''
          )}{' '}
          [{l.status}]
          {isOwner && l.status === 'pending' && (
            <>
              <button
                onClick={() => updateStatus(l._id, 'accepted')}
                className="btn btn-success btn-sm ms-2"
              >
                {t('loans.accept')}
              </button>
              <button
                onClick={() => updateStatus(l._id, 'refused')}
                className="btn btn-danger btn-sm ms-2"
              >
                {t('loans.refuse')}
              </button>
            </>
          )}
        </li>
      ))}
      {!list.length && (
        <li className="list-group-item">{t('home.no_loans')}</li>
      )}
    </ul>
  );

  return (
    <div className="container">
      <NavBar />
      <h1>{t('loans.title')}</h1>
      <ul className="nav nav-tabs mt-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'owner' ? 'active' : ''}`}
            onClick={() => setTab('owner')}
          >
            {t('loans.as_owner')}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'borrower' ? 'active' : ''}`}
            onClick={() => setTab('borrower')}
          >
            {t('loans.as_borrower')}
          </button>
        </li>
      </ul>
      <div className="mt-3">
        <h2>{t('loans.finished')}</h2>
        {renderList(tab === 'owner' ? ownerLoans.finished : borrowerLoans.finished, tab === 'owner')}
        <h2>{t('loans.ongoing')}</h2>
        {renderList(tab === 'owner' ? ownerLoans.ongoing : borrowerLoans.ongoing, tab === 'owner')}
        <h2>{t('loans.upcoming')}</h2>
        {renderList(tab === 'owner' ? ownerLoans.upcoming : borrowerLoans.upcoming, tab === 'owner')}
      </div>
    </div>
  );
}

export default Loans;
