import React, { useEffect, useState } from 'react';
import { api } from './api';
import { useTranslation } from 'react-i18next';

function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api('/users')
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  return (
    <>
      <h1 className="h1">{t('users.title')}</h1>
      <ul className="list-group">
        {users.map((u) => (
          <li key={u._id} className="list-group-item">
            {u.username}
            {u.firstName || u.lastName ? ` - ${u.firstName || ''} ${u.lastName || ''}` : ''}
            {' - ' + u.role}
            {u.structure ? ` (${u.structure.name})` : ''}
          </li>
        ))}
      </ul>
    </>
  );
}

export default Users;
