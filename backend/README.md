# GestMat S&C Backend

This is the backend API for GestMat S&C built with Express and MongoDB.

## Development

Install dependencies and start the server (TypeScript is run with ts-node):

```bash
npm install
npm start
```

Build the project:

```bash
npm run build
```

Environment variables are defined in `.env.example`.

## Environment variables

The API reads its configuration from the following variables:

| Variable         | Description                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `MONGODB_URI`    | MongoDB connection string. Defaults to `mongodb://localhost/gestmat`.                         |
| `JWT_SECRET`     | **Required.** Secret key used to sign JSON Web Tokens.                                        |
| `PORT`           | Port for the HTTP server. Defaults to `5000`.                                                 |
| `CORS_ORIGIN`    | Comma-separated list of allowed origins for CORS. If unset, the API reflects the requester origin. |
| `API_PREFIX`     | Path prefix for mounting API routes. Defaults to `/api`; set to an empty string to serve at the domain root. |
| `API_URL`        | Public base URL of the API, including the prefix. Defaults to `http://localhost:<PORT><API_PREFIX>`. |
| `SMTP_URL`       | SMTP connection string to enable email notifications.                                         |
| `NOTIFY_EMAIL`   | Optional recipient address for notification emails.                                           |
| `RATE_LIMIT_MAX` | Maximum requests allowed per 15 minutes. Defaults to `100`; increase for development.         |

If `CORS_ORIGIN` is left unset, the API now reflects the caller's origin while still allowing credentials. Set `CORS_ORIGIN`
to a comma-separated whitelist to lock the API down to trusted origins.

All example routes below assume the default `API_PREFIX` of `/api`. If you set `API_PREFIX=''`, drop the `/api` prefix from each path.

JWT tokens returned by the `POST <API_PREFIX>/auth/login` endpoint now include an expiry
time of one hour.

To obtain a new token when the current one expires, send a `POST` request to
`<API_PREFIX>/auth/refresh`. The endpoint expects a secure refresh token (for example
stored in an HTTP-only cookie) and responds with `{ token }` containing a fresh
JWT.

To enable email notifications, set `SMTP_URL` in `.env` with a valid SMTP
connection string and optionally `NOTIFY_EMAIL` for the recipient address.

## Initial administrator account

Create the first admin user directly in the database using:

```bash
npm run create-admin -- <username> <password>
```

The script connects to the configured MongoDB instance and inserts an
`Administrateur` account.

## Initial structures

Insert one or more structures before registering the first user so they can
select their structure during sign-up:

```bash
npm run create-structures -- <name1> [name2 ...]
```

Each provided name is inserted into the `structures` collection.

## Initial roles

Insert the predefined roles before the first user registration:

```bash
npm run create-roles
```

The script seeds the `roles` collection with the built-in roles.

### MongoDB Atlas

To connect the API to MongoDB Atlas instead of a local server:

1. Whitelist your machine's IP in the Atlas dashboard and create a database user.
2. Copy the connection string and include the desired database name (e.g. `gestmat`).
3. Update `.env` with the remote URI:

   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/gestmat
   ```

Verify the connection before starting the server:

```bash
mongosh "mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/gestmat"
```

## Roles and equipment access

All roles can view the catalogue of other structures. The `Autre` role may accept or refuse requests for its structure but can only create, modify or cancel its own requests. Creation and updates are restricted by role:

| Role             | Equipment types       |
| ---------------- | --------------------- |
| Administrateur   | all types             |
| Régisseur(se) Général(e) | all types            |
| Régisseur(se) Son    | Son, Vidéo, Autre     |
| Régisseur(se) Lumière | Lumière, Vidéo, Autre |
| Régisseur(se) Plateau | Plateau, Vidéo, Autre |
| Autre            | none                  |

Users created without an explicit role are assigned to `Autre`.

### Loan permissions

| Role             | Outgoing loans | Incoming loans |
| ---------------- | ------------- | -------------- |
| Administrateur   | create, modify and cancel any request | accept or refuse any request |
| Régisseur(se) Général(e) | manage all requests for their structure | accept or refuse requests for their structure |
| Régisseur(se) Son    | create and cancel requests for Son, Vidéo and Autre equipment | accept or refuse requests for these equipment types |
| Régisseur(se) Lumière | create and cancel requests for Lumière, Vidéo and Autre equipment | accept or refuse requests for these equipment types |
| Régisseur(se) Plateau | create and cancel requests for Plateau, Vidéo and Autre equipment | accept or refuse requests for these equipment types |
| Autre            | create, modify and cancel own requests | accept or refuse requests for their structure |

## Indexes

On startup the API ensures several indexes to optimize common lookups:

- **Equipments**: compound index `{ name: 1, type: 1, location: 1, structure: 1 }`
  speeds up catalogue searches at the cost of extra insert/update overhead.
- **Loan requests**: single-field indexes on `status`, `startDate` and
  `items.equipment` support filtering by request status, retrieving loans by
  their scheduled start date and querying by contained equipment items.

## Statistics endpoints

The API provides aggregated statistics related to loans and equipment. All of
these routes require authentication.

- `GET <API_PREFIX>/stats/loans` – count loan requests grouped by status.
- `GET <API_PREFIX>/stats/loans/monthly` – count loan requests grouped by month of the
  `startDate` field.
- `GET <API_PREFIX>/stats/equipments/top?limit=5` – list the most requested equipment
  sorted by total quantity, limited by the optional `limit` query parameter
  (default: `5`).

## Health check

The server exposes a simple health check endpoint to verify that both the API
and the MongoDB database are reachable.

- `GET /health` – pings the database and responds with `{ status: 'ok' }` when
  the connection succeeds.
