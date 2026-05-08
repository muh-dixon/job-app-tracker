# CareerTrack Dashboard

## Overview

CareerTrack Dashboard is an authenticated full-stack job application tracker for managing job opportunities, statuses, notes, and related details. It supports user-specific application management with protected API routes, persistent Supabase/PostgreSQL storage, middleware-based route protection, and deployment on Vercel.

The app is built as a production-style portfolio project using Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth, and Next.js API Routes.

## Features

- User authentication with Supabase Auth
- Persistent login sessions
- Protected dashboard routes
- Add, edit, and delete applications
- Search and filter applications
- Duplicate detection scoped per user
- Dashboard statistics
- Modal editing workflow
- Protected API routes
- Supabase/PostgreSQL persistence
- Responsive UI
- Middleware-based route protection
- Row Level Security (RLS)

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase/PostgreSQL
- Vercel

## Architecture

CareerTrack uses a protected request/response flow. The frontend reads the active Supabase Auth session, middleware protects dashboard navigation, API routes verify access tokens, and Supabase/PostgreSQL stores application data.

```text
Frontend UI
-> Supabase Auth session
-> Middleware protection
-> Next.js API routes
-> Supabase/PostgreSQL
-> Response
-> React state update
```

API routes:

- `GET /api/applications`: Verifies the access token, selects only applications where `user_id` matches the authenticated user, and returns the user's applications ordered by newest first.
- `POST /api/applications`: Verifies the access token, validates required fields, checks for duplicate company/role pairs for that user, inserts a new application with `user_id`, and returns the created row.
- `PUT /api/applications/:id`: Verifies the access token, confirms the application belongs to the authenticated user, validates updates, checks duplicates for that user, and returns the updated row.
- `DELETE /api/applications/:id`: Verifies the access token and deletes the application only when both `id` and `user_id` match.

After successful API responses, the React UI updates local state so the dashboard reflects the latest data without a full page reload.

## Authentication & Security

Supabase Auth handles signup, login, logout, and session persistence. The browser uses a Supabase publishable key to create the client-side auth session and retrieve the current access token.

Middleware protects dashboard navigation by checking the Supabase session before allowing access to the main dashboard route. This improves the user experience by redirecting unauthenticated visitors to the auth screen.

API routes provide the main server-side protection. Each CRUD route reads the `Authorization` header, verifies the Supabase access token, and scopes database operations by `user_id`.

The `applications` table also uses Row Level Security policies. RLS protects rows at the database level by allowing authenticated users to select, insert, update, and delete only rows where `auth.uid()` matches `user_id`.

Key handling:

- `SUPABASE_SERVICE_ROLE_KEY` stays server-side only and is never imported into client components.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is browser-safe and used for Supabase Auth in the frontend.
- Middleware, API route checks, and RLS work together as layered protection. Middleware alone is not enough because API endpoints can be called directly.

## Database Schema

Table: `applications`

| Column | Description |
| --- | --- |
| `id` | Unique application id |
| `user_id` | Supabase Auth user id that owns the application |
| `company` | Company name |
| `role` | Job title or role |
| `location` | Job location |
| `salary` | Salary range or compensation notes |
| `jobLink` | Link to the job posting |
| `status` | Application status: Saved, Applied, Interview, Offer, or Rejected |
| `notes` | Additional notes |
| `createdAt` | Timestamp for when the application was created |

## Environment Variables

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Environment variable notes:

- `NEXT_PUBLIC_SUPABASE_URL` is public-safe and points to the Supabase project.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is public-safe and can be used by browser code.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the browser.
- `.env.local` should not be committed to Git.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

## Deployment

CareerTrack Dashboard is deployed on Vercel.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

After adding or changing environment variables in Vercel Project Settings, redeploy the project so the new values are available to the app.

## What I Learned

- Building authenticated full-stack apps
- Request/response architecture
- API route protection
- Middleware protection
- User-specific data modeling
- Supabase/PostgreSQL integration
- Environment variable security
- Auth session management
- CRUD architecture
- Deployment and debugging
- Layered security concepts

## Future Improvements

- CSV export
- Sorting options
- Reminders and deadlines
- AI-powered job insights
- Analytics dashboard
- Email notifications
