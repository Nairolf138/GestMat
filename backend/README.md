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
| `CORS_ORIGIN`    | Comma-separated list of allowed origins for CORS. Each entry must be an absolute URL (scheme + host) or `*`. If unset, the API reflects the requester origin. When a whitelist is provided, the production frontend `https://gestmat.nairolfconcept.fr` is automatically appended to the list. |
| `API_PREFIX`     | Path prefix for mounting API routes. Defaults to `/api`; set to an empty string to serve at the domain root. |
| `API_URL`        | Public base URL of the API, including the prefix. Defaults to `http://localhost:<PORT><API_PREFIX>`. The cookie `secure` flag follows the protocol of this URL (`https` → `secure=true`). |
| `COOKIE_SAME_SITE` | SameSite policy for authentication cookies. Accepts `lax`, `strict` or `none`; defaults to `lax`. Use `none` for cross-domain or webview/mobile clients and combine it with an HTTPS `API_URL` so browsers accept the cookie. |
| `SMTP_URL`       | SMTP connection string to enable email notifications and derive a default sender.             |
| `NOTIFY_EMAIL`   | Optional sender/recipient address for notification emails (overrides the derived sender).     |
| `RATE_LIMIT_MAX` | Maximum requests allowed per 15 minutes. Defaults to `100`; increase for development.         |
| `LOAN_REMINDER_OFFSET_HOURS` | Hours before the start or end date to trigger reminder emails. Defaults to `24`. |
| `LOAN_REMINDER_DAILY_SCHEDULE_ENABLED` | When `true` (default), runs reminder checks every day at 9:00 local time. |
| `LOAN_REMINDER_INTERVAL_MINUTES` | Interval used for reminder retries when the fallback scheduler is enabled. Defaults to `60`. |
| `LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED` | Enable interval-based reminder retries alongside or instead of the daily 9:00 schedule. Defaults to `false`. |
| `LOAN_ARCHIVE_MIN_AGE_DAYS` | Age in days before a finished loan is eligible for archiving. Defaults to `365`. |
| `LOAN_ARCHIVE_INTERVAL_DAYS` | Interval in days between archive jobs. Defaults to `1` (daily). |
| `LOAN_ARCHIVE_BATCH_SIZE` | Maximum number of loans processed per archive run. Defaults to `100`. |
| `REPORT_CHECK_INTERVAL_HOURS` | Interval in hours between checks for the annual report job (default: `24`). |

If `CORS_ORIGIN` is left unset, the API now reflects the caller's origin while still allowing credentials. Set `CORS_ORIGIN`
to a comma-separated whitelist to lock the API down to trusted origins. The server always normalizes `Access-Control-Allow-Origin`
to a single value even when upstream infrastructure appends its own headers.

All example routes below assume the default `API_PREFIX` of `/api`. If you set `API_PREFIX=''`, drop the `/api` prefix from each path.

JWT tokens returned by the `POST <API_PREFIX>/auth/login` endpoint now include an expiry
time of one hour.

To obtain a new token when the current one expires, send a `POST` request to
`<API_PREFIX>/auth/refresh`. The endpoint expects a secure refresh token (for example
stored in an HTTP-only cookie) and responds with `{ token }` containing a fresh
JWT.

### Authorization scopes

Some permissions are marked as structure-scoped, meaning they compare the requesting
user's `structure` to the structure provided in the request body or query string.
When the target structure is omitted, the rule falls back to role-based access
only; when a structure is supplied, it must match the user's structure for the
permission to be granted.

### Authentication cookie configuration

- **Secure flag**: The `secure` attribute is enabled automatically when `API_URL` starts with `https://`. When the API is served over plain HTTP (local development), cookies are sent without the `secure` flag so browsers will accept them.
- **SameSite policy**: `COOKIE_SAME_SITE` defaults to `lax`. Set it to `none` when the frontend and backend use different domains or when embedding the app inside a mobile/webview context where cross-site requests must carry authentication cookies.
- **Recommended cross-domain/mobile setup**: Serve the API over HTTPS, set `API_URL` to its public HTTPS URL and set `COOKIE_SAME_SITE=none`. Also ensure `CORS_ORIGIN` lists the consuming origins and that requests are sent with credentials enabled so refresh tokens are transmitted.

To enable email notifications, set `SMTP_URL` in `.env` with a valid SMTP
connection string. When `NOTIFY_EMAIL` is provided, it becomes the sender and
recipient by default; otherwise the sender falls back to `no-reply@<SMTP host>`
derived from the configured SMTP URL.

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

## Loan retention and archives

Completed loans remain in the main `loanrequests` collection for day-to-day
operations. A background archive job runs every `LOAN_ARCHIVE_INTERVAL_DAYS`
days (daily by default) and moves any loan whose `endDate` is older than
`LOAN_ARCHIVE_MIN_AGE_DAYS` (default one year) into `loanrequests_archive`. Each
archived document is marked with `archived: true`, an `archivedAt` timestamp and
its `originalId`, then removed from the source collection inside a single
transaction to prevent partial moves.

Current loan listings exclude archives automatically. To show the archive in the
History view, call `GET /loans?includeArchived=true`, which returns documents
from the archive collection. Archived loans can also be fetched individually by
their original identifier.

## Statistics endpoints

The API provides aggregated statistics related to loans and equipment. All of
these routes require authentication.

- `GET <API_PREFIX>/stats/loans` – count loan requests grouped by status.
- `GET <API_PREFIX>/stats/loans/monthly` – count loan requests grouped by month of the
  `startDate` field.
- `GET <API_PREFIX>/stats/equipments/top?limit=5` – list the most requested equipment
  sorted by total quantity, limited by the optional `limit` query parameter
  (default: `5`).

## Annual structure reports

An automated job checks every `REPORT_CHECK_INTERVAL_HOURS` (default daily) and
generates a yearly PDF report for each structure after 31 August covering the
previous 12 months. Reports aggregate outgoing and incoming loans (including
archived documents), status counts, average durations and the most requested
equipment. Generated PDFs are stored in the `reports` collection, emailed to the
structure contacts and can be downloaded via the secured routes under
`<API_PREFIX>/reports`.

Dependencies used for this feature:

- [`pdfkit`](https://github.com/foliojs/pdfkit) to render the PDF summary.

## Health check

The server exposes a simple health check endpoint to verify that both the API
and the MongoDB database are reachable.

- `GET /health` – pings the database and responds with `{ status: 'ok' }` when
  the connection succeeds.
