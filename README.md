# GestMat S&C

Skeleton application for managing stage equipment sharing among theatres.

This version includes an equipment management interface with search and creation
forms to help stage managers organise their inventory. Equipments can now be
filtered by name, type and location to quickly find the right items.

## Folders

- `backend` – Express/MongoDB API
- `frontend` – React/Vite application

## Getting Started

1. Copy `backend/.env.example` to `backend/.env` and edit values if needed. Copy
   `frontend/.env.example` to `frontend/.env` as well.
2. Install dependencies and start the API:

   ```bash
   cd backend
   npm install
   npm start
   ```

3. In another terminal, start the frontend for development:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. To build the frontend for production:

   ```bash
   cd frontend
   npm run build
   ```

The React app runs on [http://localhost:3000](http://localhost:3000) and expects the API on port `5000` by default.

## Testing

Run backend tests using Node's built-in test runner:

```bash
cd backend
npm test
```

Frontend tests currently just display a placeholder message:

```bash
cd frontend
npm test
```
