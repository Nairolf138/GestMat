import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NavBar from '../src/NavBar.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';

describe('NavBar navigation', () => {
  it('navigates to catalog when link is clicked', async () => {
    render(
      <AuthContext.Provider value={{ user: null, setUser: () => {} }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path='/' element={<NavBar />} />
            <Route path='/catalog' element={<h1>Catalogue page</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Catalogue' }));
    expect(await screen.findByRole('heading', { name: 'Catalogue page' })).toBeTruthy();
  });
});
