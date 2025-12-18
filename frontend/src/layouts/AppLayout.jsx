import React from 'react';
import NavBar from '../NavBar.jsx';

function AppLayout({ children }) {
  return (
    <>
      <NavBar />
      <main id="main-content" className="app-main">
        <div className="container app-container">{children}</div>
      </main>
    </>
  );
}

export default AppLayout;
