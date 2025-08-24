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

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. Defaults to `mongodb://localhost/gestmat`. |
| `JWT_SECRET` | **Required.** Secret key used to sign JSON Web Tokens. |
| `PORT` | Port for the HTTP server. Defaults to `5000`. |
| `CORS_ORIGIN` | Comma-separated list of allowed origins for CORS. If unset, cross-origin requests are denied. |
| `API_URL` | Public base URL of the API. Defaults to `http://localhost:<PORT>/api`. |
| `SMTP_URL` | SMTP connection string to enable email notifications. |
| `NOTIFY_EMAIL` | Optional recipient address for notification emails. |

If `CORS_ORIGIN` is left unset, the API denies cross-origin requests.

JWT tokens returned by the `/api/auth/login` endpoint now include an expiry
time of one hour.

To obtain a new token when the current one expires, send a `POST` request to
`/api/auth/refresh`. The endpoint expects a secure refresh token (for example
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

All roles can view every equipment type in the catalogue. Creation and updates, however, are restricted by role:

| Role | Equipment types |
| --- | --- |
| Administrateur | all types |
| Régisseur(se) Général(e) | all types |
| Régisseur(se) Son | Son, Vidéo, Autre |
| Régisseur(se) Lumière | Lumière, Vidéo, Autre |
| Régisseur(se) Plateau | Plateau, Vidéo, Autre |
| Autre | all types |

Users created without an explicit role are assigned to `Autre`.

## Indexes

On startup the API creates a compound index on the `equipments` collection:
`{ name: 1, type: 1, location: 1, structure: 1 }`. This index accelerates
queries that filter or sort by these fields, which reduces response times for
equipment searches. The trade-off is additional overhead when inserting or
updating equipment documents as MongoDB must maintain the index entries.
