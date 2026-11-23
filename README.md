# EduSync --- Student, Group & Assignment Management System

A role-based academic collaboration platform where professors publish
assignments and monitor group progress, while students collaborate in
groups and confirm their submissions.

> **Full Stack Developer Internship --- JoinEazy, Task 1**

## Table of contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology stack](#technology-stack)
-   [Project structure](#project-structure)
-   [Getting started with
    Docker](#getting-started-with-docker-recommended)
-   [Run locally without Docker](#run-locally-without-docker)
-   [Environment variables](#environment-variables)
-   [Demo accounts](#demo-accounts)
-   [Application workflow](#application-workflow)
-   [API overview](#api-overview)
-   [Database design](#database-design)
-   [Architecture](#architecture)
-   [Security](#security)
-   [Testing](#testing)
-   [Deployment](#deployment)
-   [Limitations and assumptions](#limitations-and-assumptions)

------------------------------------------------------------------------

## Overview

Group assignments are often managed through separate messages, shared
links, and spreadsheets. This makes it difficult for professors to know
which groups have submitted their work and which students still need to
confirm.

EduSync provides one place to manage groups, distribute assignments, and
track submission confirmations.

A professor creates an assignment and provides a OneDrive upload link.
Students open that link, upload their work to OneDrive, return to
EduSync, and complete a two-step submission confirmation. The
application records each student's confirmation and calculates group
progress.

**Important:** EduSync records students' submission confirmations. It
does not connect to OneDrive or independently verify that a file was
uploaded.

## Features

### Student

-   Register and log in securely.
-   Create a group and become its leader.
-   Invite classmates using their email address or student ID.
-   Accept or reject group invitations.
-   View group members and manage group membership.
-   View assignments assigned to all students or to their group.
-   Open the professor-provided OneDrive link.
-   Confirm a submission through a two-step confirmation flow.
-   Track group progress and see which members have confirmed.
-   View and update profile information.

### Admin / Professor

-   Log in through the seeded administrator account.
-   View a dashboard with assignment, group, student, and submission
    statistics.
-   Create, edit, and delete assignments.
-   Assign an assignment to all students or selected groups.
-   Monitor assignment progress group-wise and student-wise.
-   Inspect individual member confirmations and timestamps.
-   View group, student, assignment, and submission monitoring pages.
-   Review analytics and charts.

### Platform

-   Role-based access for Student and Admin.
-   Protected frontend routes and server-side authorization.
-   Responsive React interface.
-   Form validation, loading states, error feedback, and toast
    notifications.
-   Relational PostgreSQL database with migrations, constraints, and
    indexes.

## Technology stack

  -----------------------------------------------------------------------
  Layer                               Technologies
  ----------------------------------- -----------------------------------
  Frontend                            React 18, JavaScript (ES6+), Vite,
                                      Tailwind CSS

  Routing and API                     React Router DOM, Axios

  UI and charts                       Lucide React, Recharts

  Backend                             Node.js, Express.js, REST API

  Authentication                      JWT, httpOnly cookies, bcryptjs

  Database                            PostgreSQL

  Validation and security             express-validator, Helmet, CORS,
                                      express-rate-limit

  DevOps                              Docker, Docker Compose, Nginx
  -----------------------------------------------------------------------

## Project structure

``` text
EduSync/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment and database configuration
│   │   ├── controllers/     # Request/response handling
│   │   ├── database/        # Migration, seed and admin scripts
│   │   ├── middleware/      # Authentication, validation and errors
│   │   ├── models/          # Database queries
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Application/business logic
│   │   ├── utils/
│   │   └── server.js
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── migrations/
│   │   └── 001_init.sql
│   └── ER_DIAGRAM.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── test/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Getting started with Docker (recommended)

Docker Compose starts the frontend, backend, and PostgreSQL database
together. You do **not** need to install Node.js or PostgreSQL
separately to use this method.

### Prerequisites

-   Windows 10/11 with WSL 2 enabled, macOS, or Linux.
-   Docker Desktop (Windows/macOS) or Docker Engine with the Compose
    plugin (Linux).

### 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd EduSync
```

If you downloaded the ZIP instead, extract it and open a terminal in the
folder containing `docker-compose.yml`.

### 2. Create the environment file

**Windows PowerShell:**

``` powershell
Copy-Item .env.example .env
notepad .env
```

**macOS / Linux:**

``` bash
cp .env.example .env
```

Open `.env` and set values for `POSTGRES_PASSWORD`, `JWT_SECRET`, and
`ADMIN_PASSWORD`. Use your own strong values. For a local demonstration,
you may keep the demo account settings described below.

### 3. Build and start the application

Make sure Docker Desktop is running, then execute:

``` bash
docker compose up --build
```

The first build can take a few minutes. Keep the terminal open while
running in the foreground.

To run in the background instead:

``` bash
docker compose up -d --build
```

### 4. Open the application

  Service                         Local address
  ------------------------------- ----------------------------------
  EduSync frontend                http://localhost:3000
  Backend health check            http://localhost:5000/api/health
  PostgreSQL from your computer   `localhost:5433`

The database is available to the backend inside Docker on port `5432`.
Port `5433` is exposed on the host to avoid clashing with a locally
installed PostgreSQL server.

### 5. Useful Docker commands

``` bash
# View running services
docker compose ps

# Follow all service logs
docker compose logs -f

# Follow only backend logs
docker compose logs -f backend

# Stop containers (database data is preserved)
docker compose down

# Restart and rebuild after code changes
docker compose up -d --build
```

To **permanently delete the local database volume and its data**, use:

``` bash
docker compose down -v
```

Do not run `down -v` unless you intentionally want to reset the
database.

## Run locally without Docker

This method requires Node.js (18 or newer; Node.js 20 LTS recommended)
and PostgreSQL.

1.  Create a PostgreSQL database and user using the credentials
    configured in `.env`.
2.  Copy `.env.example` to `.env` in the repository root and configure
    the database password and JWT secret.
3.  Install backend dependencies and initialize the database:

``` bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

The API runs at `http://localhost:5000`.

4.  Open a second terminal and start the frontend:

``` bash
cd frontend
npm install
npm run dev
```

The Vite development server runs at `http://localhost:5173` and proxies
API requests to the backend.

## Environment variables

The root `.env.example` file documents the configuration used by Docker
Compose and the backend.

  -----------------------------------------------------------------------
  Variable                            Purpose
  ----------------------------------- -----------------------------------
  `POSTGRES_USER`                     PostgreSQL username

  `POSTGRES_PASSWORD`                 PostgreSQL password

  `POSTGRES_DB`                       Database name

  `DB_HOST`, `DB_PORT`                Database host and port for local
                                      backend execution

  `JWT_SECRET`                        Secret used to sign JWTs; set a
                                      long, random value

  `JWT_EXPIRES_HOURS`                 JWT session lifetime

  `ADMIN_NAME`, `ADMIN_EMAIL`,        Initial professor/admin account
  `ADMIN_PASSWORD`                    

  `DEMO_STUDENT_PASSWORD`             Password assigned to seeded demo
                                      students

  `SEED_ON_START`                     Whether demo data is seeded on an
                                      empty database during startup

  `GROUP_MAX_SIZE`                    Maximum group size

  `COOKIE_SECURE`, `COOKIE_SAMESITE`  Authentication cookie settings

  `CORS_ORIGIN`                       Allowed frontend origin

  `DB_SSL` / `DATABASE_URL`           Optional settings for a hosted
                                      PostgreSQL database
  -----------------------------------------------------------------------

Never commit `.env` or real credentials to GitHub. Keep `.env.example`
populated with placeholders, not secrets.

## Demo accounts

The seed data includes demo users and groups. These credentials are for
local demonstration only.

  Role                Email                                 Password
  ------------------- ------------------------------------- -----------------
  Professor / Admin   `admin@edusync.demo`                  `Admin@12345`
  Student             `aarav.sharma@student.edusync.demo`   `Student@12345`
  Student             `ananya.iyer@student.edusync.demo`    `Student@12345`

Other seeded students use the same `Student@12345` password. The seed
data includes sample groups, invitations, assignments, and different
confirmation states to demonstrate progress tracking.

**Demo data note:** OneDrive URLs in the seed data are labelled
placeholders. They are not real assignment upload destinations.

## Application workflow

### Student submission flow

1.  The professor creates an assignment and adds a OneDrive upload link.
2.  The assignment is made available to all students or selected groups.
3.  A student opens the assignment and follows the OneDrive link to
    upload their work.
4.  The student returns to EduSync and selects **"Yes, I have
    submitted"**.
5.  The student reviews and confirms the second confirmation step.
6.  EduSync stores the student's confirmation and timestamp.
7.  Group progress is recalculated from the current group members'
    confirmations.

For example, if 3 out of 4 group members have confirmed, progress is
displayed as 75%. A group is fully confirmed only when all current
members have confirmed.

### Group workflow

A student creates a group and becomes its leader. The leader can invite
students using email or student ID. Invited students can accept or
reject the invitation. Group membership rules are enforced by the
backend.

## API overview

The API base path is `/api`. Successful and failed responses use a
consistent JSON response structure.

  ----------------------------------------------------------------------------------
  Method            Endpoint                     Access            Purpose
  ----------------- ---------------------------- ----------------- -----------------
  `POST`            `/auth/register`             Public            Register a
                                                                   student

  `POST`            `/auth/login`                Public            Log in

  `POST`            `/auth/logout`               Signed in         Log out

  `GET`             `/auth/me`                   Signed in         Get current user

  `PATCH`           `/auth/profile`              Signed in         Update profile

  `POST`            `/auth/change-password`      Signed in         Change password

  `POST`            `/groups`                    Student           Create a group

  `GET`             `/groups`                    Signed in         List accessible
                                                                   groups

  `GET`             `/groups/me`                 Student           Get own group

  `POST`            `/groups/:id/invitations`    Group leader      Invite a student

  `GET`             `/invitations`               Student           List received
                                                                   invitations

  `POST`            `/invitations/:id/accept`    Invited student   Accept invitation

  `POST`            `/invitations/:id/reject`    Invited student   Reject invitation

  `GET`             `/assignments`               Signed in         List accessible
                                                                   assignments

  `POST`            `/assignments`               Admin             Create assignment

  `PUT`             `/assignments/:id`           Admin             Update assignment

  `DELETE`          `/assignments/:id`           Admin             Delete assignment

  `GET`             `/submissions`               Signed in         List accessible
                                                                   submissions

  `POST`            `/submissions/:id/confirm`   Group student     Confirm own
                                                                   submission

  `GET`             `/analytics/admin`           Admin             Admin dashboard
                                                                   analytics

  `GET`             `/analytics/student`         Student           Student dashboard
                                                                   analytics

  `GET`             `/health`                    Public            API health check
  ----------------------------------------------------------------------------------

Additional group, assignment, submission, monitoring, and analytics
routes are implemented in `backend/src/routes/index.js`.

## Database design

EduSync uses PostgreSQL with a versioned SQL migration in
`database/migrations/001_init.sql`.

  -----------------------------------------------------------------------
  Table / view                        Responsibility
  ----------------------------------- -----------------------------------
  `users`                             Student and admin account details

  `groups`                            Group records and creator

  `group_members`                     Group membership and member role

  `group_invitations`                 Invitations and their status

  `assignments`                       Assignment details, due date,
                                      OneDrive link, and target type

  `assignment_groups`                 Groups selected for an assignment

  `submissions`                       Group-level submission tracking for
                                      an assignment

  `submission_confirmations`          Individual student confirmation and
                                      timestamp

  `submission_progress` (view)        Derived group progress and
                                      confirmation status
  -----------------------------------------------------------------------

The schema uses primary keys, foreign keys, unique constraints, indexes,
and database transactions to maintain data integrity. The detailed
Mermaid ER diagram is available in
[`database/ER_DIAGRAM.md`](database/ER_DIAGRAM.md).

## Architecture

``` text
React frontend (Vite in development / Nginx in Docker)
        |
        | HTTP requests through Axios (/api)
        v
Express REST API
        |
        +--> Authentication and role middleware
        |
        +--> Routes and controllers
        |
        +--> Services (business rules)
        |
        +--> Models (parameterized SQL queries)
        |
        v
PostgreSQL database
```

In Docker, Nginx serves the production frontend and proxies `/api`
requests to the backend service. Docker Compose provides the private
network between the frontend, backend, and database.

## Security

-   Passwords are hashed with `bcryptjs`; plaintext passwords are not
    stored.
-   JWT authentication is stored in an httpOnly cookie.
-   Backend middleware checks authentication and role permissions.
-   Public registration creates student accounts; admin accounts are
    provisioned separately.
-   Database queries use parameterized SQL.
-   Request data is validated on the server.
-   Helmet, CORS configuration, and rate limiting are included in the
    backend.

## Testing

Test scripts are included in the repository:

``` bash
# Backend API tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Frontend production build
npm run build
```

The backend integration tests require a configured PostgreSQL test
database. The frontend tests are integration-style tests that expect the
application API and database to be available. Review the test setup
before running them against any database containing data you need to
keep.

**Verification note:** The Docker Compose launch and Dockerfiles should
be tested on the machine used for the demo. The project build notes
indicate that Docker Engine and a graphical browser were not available
in the original build environment, so do not describe the Docker run as
independently verified until you have run it successfully.

## Deployment

This repository contains Docker configuration for local execution. A
public production deployment is not included by default.

For a hosted deployment, use: - A managed PostgreSQL database. - A
Node.js hosting service for the Express API. - A static hosting service
or web server for the built React frontend.

Configure production environment variables, HTTPS, secure cookies, CORS
origins, database TLS, and non-demo administrator credentials before
exposing the application publicly. Add your actual deployed URL to the
project documentation only after deployment is complete.

## Limitations and assumptions

-   Submission status is based on student confirmation; OneDrive file
    uploads are not verified by the application.
-   Seeded OneDrive links are placeholders for demonstration.
-   Email verification and password-reset flows are not included.
-   The app does not provide live push updates; data refreshes through
    normal page loads and user actions.
-   Demo credentials must be changed before any real deployment.

------------------------------------------------------------------------

## Assignment deliverables checklist

Before submitting the task, prepare the following items separately:

-   [ ] Push the complete source code to a public or reviewer-accessible
    GitHub repository.
-   [ ] Keep frontend and backend in separate folders.
-   [ ] Include this README with setup instructions, API overview,
    database design, architecture, and design decisions.
-   [ ] Run the application and record a working demo video.
-   [ ] Deploy the application if you are providing a platform link; use
    the actual live URL.
-   [ ] Create a PDF containing the GitHub repository link, working demo
    video link, and platform link.
-   [ ] Name the PDF using the required `FullName-TaskNo.pdf`
    convention.
-   [ ] Submit the PDF using the Google Form specified in the
    assignment.
