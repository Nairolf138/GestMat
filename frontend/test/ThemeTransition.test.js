import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

describe('Theme transitions', () => {
  it('maintains transitions when toggling dark theme', () => {
    const cssPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../src/styles.css',
    );
    const css = readFileSync(cssPath, 'utf8');
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const navbar = document.createElement('div');
    navbar.className = 'navbar';
    document.body.appendChild(navbar);

    const transitionBodyBefore = getComputedStyle(document.body).transition;
    const transitionNavbarBefore = getComputedStyle(navbar).transition;

    document.body.classList.add('dark-theme');

    const transitionBodyAfter = getComputedStyle(document.body).transition;
    const transitionNavbarAfter = getComputedStyle(navbar).transition;

    expect(transitionBodyBefore).toBe(transitionBodyAfter);
    expect(transitionNavbarBefore).toBe(transitionNavbarAfter);
    expect(transitionBodyBefore).toContain('background-color');
    expect(transitionBodyBefore).toContain('color');
    expect(transitionNavbarBefore).toContain('background-color');

    document.body.classList.remove('dark-theme');
    document.body.removeChild(navbar);
    document.head.removeChild(styleEl);
  });
});
