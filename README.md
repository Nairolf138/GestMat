# GestMat S&C

Skeleton application for managing stage equipment sharing among theatres.

## Folders

- `backend` – Express/MongoDB API
- `frontend` – React/Vite application

## Getting Started

1. Make sure MongoDB is running locally (e.g. `docker run -p 27017:27017 mongo`).
2. Copy `backend/.env.example` to `backend/.env` and edit values if needed.
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
