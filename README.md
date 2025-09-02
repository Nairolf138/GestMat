# GestMat S&C

Skeleton application for managing stage equipment sharing among theatres.

This version includes an equipment management interface with search and creation
forms to help stage managers organise their inventory. Equipments can now be
filtered by name, type and location to quickly find the right items.

Additional routes allow creating loan requests, accepting or refusing them and
retrieving basic statistics. Email notifications can be sent if `SMTP_URL` is
configured in the backend environment; the recipient address can be overridden
with `NOTIFY_EMAIL`.

## Folders

- `backend` – Express/MongoDB API
- `frontend` – React/Vite application

## Documentation

Des informations sur l’architecture, les rôles et le processus de prêt sont disponibles dans [docs/README.md](docs/README.md). Le planning des évolutions figure dans [docs/ROADMAP.md](docs/ROADMAP.md).

## Getting Started

This project requires **Node 22** or newer. Vite relies on modern Node.js
features like `crypto.hash`, so older runtimes are not supported.

1. Copy `backend/.env.example` to `backend/.env` and edit values if needed.
   **Make sure to set `JWT_SECRET`** or the API will refuse to start.
   Copy `frontend/.env.example` to `frontend/.env` as well.
   Set `SMTP_URL` and optionally `NOTIFY_EMAIL` if you want email notifications.
   Use `CORS_ORIGIN` to specify one or more allowed origins separated by commas.
   `RATE_LIMIT_MAX` controls requests per 15-minute window (default `100`); raise this value in development if needed.
2. Install dependencies and start the API (TypeScript runs via ts-node):

```bash
cd backend
npm install
npm start
```

To build the API:

```bash
npm run build
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

## Using MongoDB Atlas

The API uses a local MongoDB instance by default. To run against a remote Atlas
cluster:

1. Create a cluster on [MongoDB Atlas](https://cloud.mongodb.com), whitelist
   your IP in **Network Access** and create a database user.
2. Copy the connection string and append the database name, for example
   `gestmat`.
3. Set that URI in `backend/.env`:

   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/gestmat
   ```

4. Check connectivity before starting the app:

   ```bash
   mongosh "mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/gestmat"
   ```

## Testing

Before running tests, make sure you have installed dependencies in both the
`backend` and `frontend` folders using `npm install`.

Run backend tests using Node's built-in test runner:

```bash
cd backend
npm test
```

Frontend tests run using Vitest:

```bash
cd frontend
npm test
```

### Manual check for AddEquipment

To verify number fields work correctly, start both backend and frontend,
open the Equipments page and create a new item. The `Quantité totale` and
`Quantité disponible` inputs should accept numbers only and after
submission the form resets with 0 in those fields.

## Monitoring

The backend exposes Prometheus metrics at `/metrics`. You can scrape this
endpoint from Prometheus and visualise data in Grafana. Default Node.js metrics
are enabled using `prom-client`.

## Internationalisation

The React frontend now uses `react-i18next`. Translations are provided for
French and English and additional languages can be added in `frontend/src/locales`.
