import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';

function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api('/users')
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  return (
    <div>
      <NavBar />
      <h1>Utilisateurs</h1>
      <ul>
        {users.map((u) => (
          <li key={u._id}>
            {u.username} - {u.role}
            {u.structure ? ` (${u.structure.name})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Users;
