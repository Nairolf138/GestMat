import React, { useEffect, useState, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import LoanItem from './LoanItem.jsx';
import Loading from './Loading.jsx';
import CollapsibleSection from './CollapsibleSection.jsx';

function Loans() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [tab, setTab] = useState('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    finished: true,
    ongoing: true,
    upcoming: true,
  });

  const toggleSection = (section) =>
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));

  const refresh = () => {
    setLoading(true);
    setError(null);
    api('/loans')
      .then((data) => {
        setLoans(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoans([]);
        setError(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
  }, []);

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

  const renderSection = (list, isOwner) => (
    <ul className="list-group mb-3">
      {list.map((l) => (
        <LoanItem key={l._id} loan={l} isOwner={isOwner} refresh={refresh} />
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
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="alert alert-danger">{t('common.error')}</div>
      ) : (
        <>
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
            <CollapsibleSection
              title={t('loans.finished')}
              isOpen={sectionsOpen.finished}
              onToggle={() => toggleSection('finished')}
            >
              {renderSection(
                tab === 'owner' ? ownerLoans.finished : borrowerLoans.finished,
                tab === 'owner'
              )}
            </CollapsibleSection>
            <CollapsibleSection
              title={t('loans.ongoing')}
              isOpen={sectionsOpen.ongoing}
              onToggle={() => toggleSection('ongoing')}
            >
              {renderSection(
                tab === 'owner' ? ownerLoans.ongoing : borrowerLoans.ongoing,
                tab === 'owner'
              )}
            </CollapsibleSection>
            <CollapsibleSection
              title={t('loans.upcoming')}
              isOpen={sectionsOpen.upcoming}
              onToggle={() => toggleSection('upcoming')}
            >
              {renderSection(
                tab === 'owner' ? ownerLoans.upcoming : borrowerLoans.upcoming,
                tab === 'owner'
              )}
            </CollapsibleSection>
          </div>
        </>
      )}
    </div>
  );
}

export default Loans;
