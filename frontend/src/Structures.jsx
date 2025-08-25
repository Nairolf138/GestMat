import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import { useTranslation } from 'react-i18next';

function Structures() {
  const { t } = useTranslation();
  const [structures, setStructures] = useState([]);

  useEffect(() => {
    api('/structures')
      .then(setStructures)
      .catch(() => setStructures([]));
  }, []);

  return (
    <div className="container">
      <NavBar />
      <h1 className="h1">{t('structures.title')}</h1>
      <ul className="list-group">
        {structures.map((s) => (
          <li key={s._id} className="list-group-item">
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Structures;
