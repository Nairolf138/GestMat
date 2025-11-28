# Style guide

Ce projet utilise un petit système de variables CSS pour faciliter la maintenance et l’accessibilité des styles.

## Variables

```css
:root {
  --color-bg: #f4f6f9;         /* Couleur de fond par défaut */
  --color-text: #212529;       /* Couleur du texte principal */
  --color-navbar-bg: #ffffff;  /* Fond de la barre de navigation */

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;

  --radius-sm: 0.25rem;        /* Rayon de bordure standard */
}
```

Les couleurs sont automatiquement adaptées au thème sombre via `prefers-color-scheme`. Pour forcer le mode sombre, appliquer la classe `dark-theme` sur l’élément racine :

```html
<body class="dark-theme">
```

## Points de rupture

Deux media queries ajustent l’espacement global selon la taille de l’écran :

- **Mobile** : largeur ≤ 600 px → `padding: var(--spacing-sm);`
- **Tablette** : 601–1024 px → `padding: var(--spacing-md);`

Le style par défaut utilise `var(--spacing-lg)` pour les écrans plus larges.

## Conventions

- Utiliser les variables déclarées ci‑dessus pour toute nouvelle couleur ou espacement.
- Préférer les media queries existantes pour conserver des points de rupture cohérents.
- Les futures personnalisations de thème devraient modifier uniquement les variables, pas les règles individuelles.
- Respecter les contrastes suffisants (WCAG AA) ; privilégier du texte ≥ 16 px et des contrastes ≥ 4.5:1 pour les éléments interactifs.
- Prévoir des états de focus visibles pour les boutons, liens et champs de formulaire (outline ou border explicite).
- Centraliser les styles communs (boutons, cartes, formulaires) dans des composants réutilisables plutôt que dans des sélecteurs isolés.
