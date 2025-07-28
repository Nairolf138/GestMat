import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';

function Structures() {
  const [structures, setStructures] = useState([]);

  useEffect(() => {
    api('/structures')
      .then(setStructures)
      .catch(() => setStructures([]));
  }, []);

  return (
    <div>
      <NavBar />
      <h1>Structures</h1>
      <ul>
        {structures.map((s) => (
          <li key={s._id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default Structures;
