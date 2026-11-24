# Deployment

The repository includes Dockerfiles for the API and static frontend, plus a
single-host Docker Compose deployment with a persistent MongoDB volume. Docker
is not required for local development.

## Run the deployment stack

Install Docker Engine with Docker Compose v2, then from the repository root:

```bash
cp .env.example .env
openssl rand -hex 32
```

Use the generated value to replace the MongoDB password placeholder in both
`MONGO_INITDB_ROOT_PASSWORD` and the password portion of `MONGODB_URI`. Generate
a different long random value for `JWT_SECRET`. Keep `.env` private; it is
ignored by Git and Docker build contexts.

Validate the configuration and start the services:

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs -f backend frontend
```

The frontend is served at http://localhost:8080. The backend and MongoDB are
available only on the private Compose network; MongoDB data persists in the
`mongo-data` volume. The frontend reverse-proxies `/api` to the backend, so the
browser uses a same-origin API URL.

## Production environment

- Set `CLIENT_URL` to the exact public frontend origin if the frontend and API
  are hosted on separate origins.
- Set a unique `JWT_SECRET`, a strong MongoDB credential, and a production
  `MONGODB_URI` using the host's secret manager. URL-encode special characters
  in MongoDB credentials.
- Configure Cloudinary credentials for image upload. Never put API secrets in
  frontend variables; `VITE_*` values are shipped to browsers.
- Terminate HTTPS at the hosting provider or a trusted reverse proxy. Restrict
  public access to HTTPS and do not expose MongoDB to the internet.
- Configure database backups, monitoring, log retention, and a restore test
  before using real user data. The included single-host Compose setup is a
  deployment starter, not a highly available production cluster.

For managed services, build `backend/Dockerfile` and `frontend/Dockerfile`
separately, provide the environment variables above through the platform's
secret settings, and point `MONGODB_URI` at a managed MongoDB deployment.
Configure the frontend build argument `VITE_API_URL` to the public API path;
the default `/api` expects a same-origin reverse proxy.

## Health check and shutdown

```bash
curl http://localhost:8080/api/health
docker compose down
```

`docker compose down` keeps the named database volume. Removing persisted
database data requires an explicit volume deletion; back up first.
