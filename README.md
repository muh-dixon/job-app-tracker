# CareerTrack Dashboard

A full-stack job application tracker for managing job applications, statuses, notes, and job details with persistent Supabase/PostgreSQL storage.

CareerTrack Dashboard started as a frontend job application tracker and now uses Next.js API routes with Supabase/PostgreSQL for database-backed CRUD operations. The app is deployed on Vercel and uses environment variables for secure backend configuration.

## Live Demo

Deployed on Vercel.

## Features

- Add, edit, and delete job applications
- Search by company or role
- Filter by status
- Track statuses: Saved, Applied, Interview, Offer, Rejected
- Duplicate detection for company + role
- Modal-based editing
- Dashboard stats
- Status badges
- Persistent database storage with Supabase/PostgreSQL
- API-based CRUD operations using Next.js API routes
- Responsive UI with Tailwind CSS

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Vercel

## How It Works

The frontend does not communicate with Supabase directly. Instead, the React UI calls Next.js API routes, and those server-side routes communicate with Supabase/PostgreSQL.

```text
Frontend UI -> Next.js API Routes -> Supabase/PostgreSQL -> Response -> React state update
```

API routes:

- `GET /api/applications`: Fetches all job applications from Supabase and returns them to the frontend.
- `POST /api/applications`: Creates a new job application after validating required fields and checking for duplicates.
- `PUT /api/applications/:id`: Updates an existing job application by its `id`.
- `DELETE /api/applications/:id`: Deletes an existing job application by its `id`.

After each successful API response, the frontend updates React state so the dashboard reflects the latest data.

## Environment Variables

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
```

Environment variable notes:

- `NEXT_PUBLIC_SUPABASE_URL` is the Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in client code.
- `.env.local` should not be committed to Git.
- Vercel also needs these environment variables set in Project Settings.

The service role key is powerful because it can access the database from trusted server-side code. In this project, it is used only inside API route logic and must not be imported into client components.

## Database Schema

Supabase table name: `applications`

Fields:

- `id`
- `company`
- `role`
- `location`
- `salary`
- `jobLink`
- `status`
- `notes`
- `createdAt`

Expected schema:

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  location text,
  salary text,
  "jobLink" text,
  status text not null,
  notes text,
  "createdAt" timestamptz default now()
);
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the app in your browser:

```text
http://localhost:3000
```

You can also test the API directly:

```text
http://localhost:3000/api/applications
```

## Project Structure

```text
src/
  app/
    api/
      applications/
        route.ts          GET and POST application routes
        [id]/
          route.ts        PUT and DELETE application routes
        store.ts          Shared application types and helpers
    page.tsx              Main dashboard UI
    layout.tsx            App layout
    globals.css           Global styles
  lib/
    supabase.ts           Server-side Supabase client helper
public/                   Static assets
```

## Deployment Notes

- Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel Project Settings.
- Redeploy the project after adding or changing environment variables.
- Test `/api/applications` after deployment to confirm the API can reach Supabase.
- Keep the service role key out of client components and public code.

## What I Learned

- Building API routes in Next.js
- Handling full CRUD flow
- Connecting frontend to backend routes
- Persisting data with Supabase/PostgreSQL
- Managing environment variables securely
- Debugging production API errors
- Understanding request/response flow

## Future Improvements

- User authentication
- Per-user application data
- Confirmation modal before delete
- Sorting by date/status/company
- CSV export
- Application reminders
- AI-powered job description analysis

## Author

Built by Shabil as a portfolio project.
