# CollabTask IO — Team Task Manager

![Status](https://img.shields.io/badge/status-live-success)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green)
![Database](https://img.shields.io/badge/database-PostgreSQL-purple)
![Deployment](https://img.shields.io/badge/deployed%20on-Railway-black)

CollabTask IO is a full-stack team task management application where users can create projects, assign tasks, manage teams, track progress, and monitor productivity through a clean dashboard.

The application includes authentication, role-based access control, project management, task assignment, team management, profile management, and Railway deployment.

---

## Live Demo

**Live Website:**  
https://frontend-production-a3da2.up.railway.app/

**GitHub Repository:**  
https://github.com/dhakayogesh/collabtask-io/

---

## Features

### Authentication

- User signup and login
- JWT-based authentication
- Secure password hashing
- Protected routes
- Persistent login session
- Admin and Member role support
- Admin signup protected with admin passcode

### Role-Based Access Control

#### Admin

Admins can:

- Create and manage projects
- Create, update, assign, and delete tasks
- Assign tasks to individual members or the whole team
- View and manage all team members
- Delete users with safety checks
- Access dashboard-wide statistics

#### Member

Members can:

- View assigned tasks
- View whole-team tasks
- Update their own profile
- Track personal work progress
- Access team workspace based on permissions

### Project Management

- Create projects
- View project details
- Manage project tasks
- Track project progress
- Loading skeletons for smooth user experience
- Dynamic backend-connected project data

### Task Management

- Create tasks inside projects
- Assign tasks to:
  - Individual members
  - Whole team
  - Unassigned state
- Update task status
- Mark tasks as completed
- Set task priority
- Add due dates
- View tasks based on role and assignment
- Member-specific task visibility

### Dashboard

- Dynamic dashboard connected to backend data
- Total tasks
- Completed tasks
- In-progress tasks
- Overdue tasks
- Active projects
- Progress metrics
- Personalized user greeting
- Loading skeletons to prevent blank screens
- Dashboard updates after project/task changes

### Team Management

- View all registered users
- Team page connected to backend users
- Admin user management
- Delete team members with safeguards
- Task assignment dropdown uses real team members
- Team list updates dynamically

### Profile Management

Users can update:

- Name
- Phone number
- Address
- Blood group

Additional profile features:

- Indian phone number placeholder
- Optional fields handled safely
- Updated profile data reflects across dashboard and team section
- Password and role cannot be changed from profile page

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Axios
- Tailwind CSS
- Radix UI
- Lucide React
- Sonner Toasts

### Backend

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JSON Web Tokens
- bcrypt
- CORS middleware

### Database

- PostgreSQL
- Prisma schema with relationships between:
  - Users
  - Projects
  - Tasks
  - Project members

### Deployment

- Railway frontend service
- Railway backend service
- Railway PostgreSQL database
- GitHub-based deployment workflow

---

## Project Architecture

```text
CollabTask IO
│
├── Frontend: React + Vite
│   └── Communicates with backend using Axios
│
├── Backend: Express + Node.js
│   └── Handles auth, APIs, validation, and authorization
│
└── Database: PostgreSQL
    └── Accessed through Prisma ORM
