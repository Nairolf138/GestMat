# GestMat S&C Backend

This is the backend API for GestMat S&C built with Express and MongoDB.

## Development

Install dependencies and start the server:

```bash
npm install
npm start
```

Environment variables are defined in `.env.example`.

To enable email notifications, set `SMTP_URL` in `.env` with a valid SMTP
connection string and optionally `NOTIFY_EMAIL` for the recipient address.

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
