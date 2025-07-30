import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import NavBar from "./NavBar";
import { api } from "./api";
import Alert from "./Alert.jsx";

function Home() {
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
      <h1>Accueil</h1>
      <Alert message={error} />
      <Alert type="success" message={message} />
      {user && <p>Bonjour {user.firstName || user.username} !</p>}
      <h2>Demandes récentes</h2>
      <ul className="list-group mb-3">
        {pending.slice(0, 5).map((l) => (
          <li key={l._id} className="list-group-item">
            {l.borrower?.name} → {l.owner?.name} ({l.startDate?.slice(0, 10)})
          </li>
        ))}
        {!pending.length && <li className="list-group-item">Aucune demande</li>}
      </ul>
      <h2>Emprunts à venir</h2>
      <ul className="list-group mb-3">
        {incoming.slice(0, 5).map((l) => (
          <li key={l._id} className="list-group-item">
            {l.owner?.name} ({l.startDate?.slice(0, 10)} →{" "}
            {l.endDate?.slice(0, 10)})
          </li>
        ))}
        {!incoming.length && <li className="list-group-item">Aucun emprunt</li>}
      </ul>
      <h2>Raccourcis</h2>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <Link className="btn btn-primary" to="/inventory">
          Inventaire
        </Link>
        <Link className="btn btn-primary" to="/catalog">
          Catalogue
        </Link>
        <Link className="btn btn-primary" to="/loans">
          Prêts/Emprunts
        </Link>
        <Link className="btn btn-primary" to="/cart">
          Panier
        </Link>
        <Link className="btn btn-primary" to="/profile">
          Profil
        </Link>
      </div>
    </div>
  );
}

export default Home;
