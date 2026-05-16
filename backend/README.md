# CollabTask Backend

Production-ready REST API for projects and tasks built with Node.js, Express, PostgreSQL, Prisma ORM, bcrypt password hashing, and JWT authentication.

## Features

- Signup and login with bcrypt password hashing
- JWT authentication and protected routes
- `ADMIN` and `MEMBER` roles
- Project creation, listing, details, and member management
- Task creation, update, delete, assignment, status changes, and overdue task lookup
- Dashboard task statistics, tasks by status, and overdue counts
- Input validation, centralized error handling, and consistent JSON responses
- Prisma schema and migration scripts

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Update `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/collabtask?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:8080"
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Create and apply the first migration:

```bash
npm run prisma:migrate -- --name init
```

6. Start development server:

```bash
npm run dev
```

Production start:

```bash
npm start
```

## API Base URL

```text
http://127.0.0.1:5000/api
```

## Railway Deployment

Use this folder as the Railway backend service root.

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Prisma Client generation: `postinstall` runs `prisma generate --schema prisma/schema.prisma`

Required Railway variables:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
NODE_ENV=production
FRONTEND_URL="https://your-frontend-service.up.railway.app"
```

`FRONTEND_URL` is added to the CORS allowlist along with local development origins.

## Authentication

Send protected requests with:

```http
Authorization: Bearer <token>
```

## Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Signup body:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "ADMIN"
}
```

Login body:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Projects

- `POST /api/projects` ADMIN only
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/members` ADMIN only
- `DELETE /api/projects/:projectId/members/:userId` ADMIN only

Create project body:

```json
{
  "name": "Website Redesign",
  "description": "Launch the new marketing site"
}
```

Add member body:

```json
{
  "userId": "cuid"
}
```

### Tasks

- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `PATCH /api/tasks/:taskId/assign`
- `PATCH /api/tasks/:taskId/status`
- `GET /api/tasks/overdue`

Create task body:

```json
{
  "title": "Draft homepage copy",
  "description": "Prepare first content pass",
  "projectId": "cuid",
  "assignedToId": "cuid",
  "priority": "MEDIUM",
  "status": "TODO",
  "dueDate": "2026-05-30T00:00:00.000Z"
}
```

Assign task body:

```json
{
  "assignedToId": "cuid"
}
```

Change status body:

```json
{
  "status": "IN_PROGRESS"
}
```

### Dashboard

- `GET /api/dashboard`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/tasks-by-status`
- `GET /api/dashboard/overdue-counts`

### Health

- `GET /api/health`

## Response Shape

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": {}
}
```

## Folder Structure

```text
src/
  controllers/
  middleware/
  prisma/
  routes/
  services/
  utils/
```
