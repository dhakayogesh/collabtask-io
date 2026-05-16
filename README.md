# CollabTask IO

Full-stack task collaboration app with a Vite frontend in the repository root and an Express/Prisma backend in `backend/`.

## Railway Deployment

Deploy this repository as two Railway services.

### Backend Service

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Prisma generate: runs automatically on install via `postinstall`

Required environment variables:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
NODE_ENV=production
FRONTEND_URL="https://your-frontend-service.up.railway.app"
```

Notes:

- `DATABASE_URL` should point to Railway Postgres.
- `FRONTEND_URL` is used by backend CORS.
- In production, the backend binds to `0.0.0.0` so Railway can route traffic to it.

### Frontend Service

- Root directory: `/`
- Build command: `npm run build`
- Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`

Required environment variables:

```env
VITE_API_BASE_URL="https://your-backend-service.up.railway.app"
```

For local development, `VITE_API_BASE_URL` is optional and falls back to:

```text
http://127.0.0.1:5000
```

## Local Development

Backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

Frontend:

```bash
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:8080`
- Backend: `http://127.0.0.1:5000`
