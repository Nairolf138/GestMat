# GestMat S&C

Demo application for managing stage equipment sharing among theatres.
It provides an inventory search and tracks open loan requests to help stage managers.

## Folders

- `backend` – Express/MongoDB API
- `frontend` – React/Vite application

## Features

- Search equipment by name or type
- List open loan requests

## Getting Started

1. Make sure MongoDB is running locally (e.g. `docker run -p 27017:27017 mongo`).
2. Copy `backend/.env.example` to `backend/.env` and edit values if needed.
   Optionally copy `frontend/.env.example` to `frontend/.env` if the API runs on
   another host.
3. Install dependencies and start the API:

   ```bash
   cd backend
   npm install
   npm start
   ```

4. In another terminal, start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The React app runs on [http://localhost:3000](http://localhost:3000) and expects the API on port `5000` by default.

## Running Tests

Both parts of the project use Node's built-in test runner. To execute the backend and frontend tests run:

```bash
npm test --prefix backend
npm test --prefix frontend
```

To build the frontend for production:

```bash
npm run build --prefix frontend
```
