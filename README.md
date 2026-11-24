# Hidden Gems

**Uncover Kathmandu’s Best-Kept Secrets.**

Hidden Gems is a community-powered Kathmandu discovery app. Explorers can
discover places on an OpenStreetMap-powered map, submit hidden gems for review,
save favorites, upvote places, and leave reviews. Curator applications and
admin moderation are role-protected.

Explorers can also create private named bucket lists. Approved curators can
request management of a community-listed gem; an administrator must approve
the claim before the curator can publish business updates. Curator dashboards
show detail-page views, upvotes, and saves. Explorer badges and landing-page
community figures are calculated from approved database records, not fixed
marketing numbers.

## Architecture

- `frontend/`: React 19, Vite, Tailwind CSS, React Router, Leaflet, and Axios.
- `backend/`: Express REST API, Mongoose models, cookie-based JWT auth, and
  resource-specific controllers and routes.
- `compose.yaml`: single-host Docker deployment for the frontend, API, and
  persistent MongoDB service.
- The frontend uses same-origin `/api` requests in the Docker deployment. In
  local development, it calls the API on port 5001.
- User registration always creates an explorer account. Curator access is
  granted only after an administrator approves an application. Admin users are
  created by the protected seed script, never by public registration.

## Project layout

```text
hidden-gems/
├── backend/
│   ├── Dockerfile
│   ├── scripts/seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── test/
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── data/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── styles.css
│   └── nginx.conf
├── compose.yaml
├── DEPLOYMENT.md
├── package.json
└── package-lock.json
```

## Requirements

- Node.js 20+ and npm.
- Internet access on the first development run to download the local MongoDB binary.
- Cloudinary credentials for direct photo uploads; other app features work without uploads.

## Local development

Install dependencies and create private environment files:

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

With the example files unchanged, development automatically starts a
persistent local MongoDB server and generates a private JWT secret. Database
files and the secret are stored under the ignored `backend/.local/` directory.
The first run downloads the MongoDB binary and needs internet access. To use
MongoDB Community or Atlas instead, set `MONGODB_URI` in `backend/.env`. Keep
Cloudinary credentials in the backend environment only. The `.env` files are
ignored by Git. Production always requires a real `MONGODB_URI` and a
32-byte-or-longer `JWT_SECRET`.

Start both apps from the repository root:

```bash
npm run dev
```

- Web app: http://localhost:5173
- API health: http://localhost:5001/api/health

If an explicitly configured MongoDB server is unreachable, the API reports a
degraded health status and database-backed writes are unavailable until it
connects. With no `MONGODB_URI`, the local persistent development database is
started automatically.

## Demo administrator and fictional sample gems

Set these values in `backend/.env` before seeding:

```dotenv
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=replace-with-a-unique-password-of-at-least-12-characters
SEED_ADMIN_NAME=Hidden Gems Admin
```

Then run:

```bash
npm run seed
```

The script creates the administrator only if the account does not already
exist, and adds three explicitly fictional Kathmandu demo listings. It is
safe to re-run and refuses to promote an existing non-admin account.

## Checks

```bash
npm test
npm audit
```

`npm test` runs backend unit and MongoDB-backed feature-flow tests and builds
the frontend. The first feature-test run may download the local MongoDB binary.
`npm run test:backend` and `npm run build` can be run separately.

## Community feature APIs

- `GET/POST /api/bucket-lists`, `GET/PATCH/DELETE /api/bucket-lists/:id`, and
  `PUT/DELETE /api/bucket-lists/:id/gems/:gemId` manage owner-only personal
  lists. Lists are limited to 50 per user and 100 approved gems per list.
- `POST /api/curators/claims` submits an ownership claim. Admins review claims
  at `GET /api/admin/claims` and `PATCH /api/admin/claims/:id`.
- `POST /api/curators/gems/:gemId/updates` records verified curator notes and
  opening-hour changes. `GET /api/curators/me/metrics` reports total managed
  gems, detail-page requests, upvotes, and saves. Views count detail-page
  requests and are not unique visitors.
- `GET /api/public/stats` supplies database-backed homepage counts, curator
  highlights, and recent community reviews.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker Compose setup, environment
secrets, health checks, and managed-host guidance. Before deployment, replace
all example credentials, configure MongoDB and Cloudinary, and terminate HTTPS
at the hosting provider or a trusted reverse proxy.
