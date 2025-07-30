import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import NavBar from "./NavBar";
import { api } from "./api";
import Alert from "./Alert.jsx";

function Home() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");
  const location = useLocation();
  const [message] = useState(location.state?.message || "");

  useEffect(() => {
    api("/users/me")
      .then(setUser)
      .catch(() => {});
    api("/loans")
      .then(setLoans)
      .catch(() => setLoans([]));
  }, []);

  const pending = loans.filter((l) => l.status === "pending");
  const now = new Date();
  const incoming = loans.filter((l) => {
    if (l.borrower?._id !== (user?.structure?._id || user?.structure))
      return false;
    const start = l.startDate ? new Date(l.startDate) : null;
    const end = l.endDate ? new Date(l.endDate) : null;
    return (
      (start && start >= now) || (start && end && start <= now && end >= now)
    );
  });

  return (
    <div className="container">
      <NavBar />
      <h1>{t('home.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={message} />
      {user && <p>{t('home.greeting', { name: user.firstName || user.username })}</p>}
      <h2>{t('home.recent_requests')}</h2>
      <ul className="list-group mb-3">
        {pending.slice(0, 5).map((l) => (
          <li key={l._id} className="list-group-item">
            {l.borrower?.name} → {l.owner?.name} ({l.startDate?.slice(0, 10)})
          </li>
        ))}
        {!pending.length && <li className="list-group-item">{t('home.no_requests')}</li>}
      </ul>
      <h2>{t('home.incoming_loans')}</h2>
      <ul className="list-group mb-3">
        {incoming.slice(0, 5).map((l) => (
          <li key={l._id} className="list-group-item">
            {l.owner?.name} ({l.startDate?.slice(0, 10)} →{" "}
            {l.endDate?.slice(0, 10)})
          </li>
        ))}
        {!incoming.length && <li className="list-group-item">{t('home.no_loans')}</li>}
      </ul>
      <h2>{t('home.shortcuts')}</h2>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <Link className="btn btn-primary" to="/inventory">
          {t('nav.inventory')}
        </Link>
        <Link className="btn btn-primary" to="/catalog">
          {t('nav.catalog')}
        </Link>
        <Link className="btn btn-primary" to="/loans">
          {t('nav.loans')}
        </Link>
        <Link className="btn btn-primary" to="/cart">
          {t('nav.cart')}
        </Link>
        <Link className="btn btn-primary" to="/profile">
          {t('nav.profile')}
        </Link>
      </div>
    </div>
  );
}

export default Home;
