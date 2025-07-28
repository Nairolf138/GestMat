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
    <div className="container">
      <NavBar />
      <h1>Utilisateurs</h1>
      <ul className="list-group">
        {users.map((u) => (
          <li key={u._id} className="list-group-item">
            {u.username} - {u.role}
            {u.structure ? ` (${u.structure.name})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Users;
