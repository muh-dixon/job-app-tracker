# CareerTrack Dashboard

CareerTrack Dashboard is an authenticated full-stack job application tracker built with Next.js, Supabase Auth, protected API routes, and persistent PostgreSQL storage. Users can manage their own job applications through a responsive dashboard while application data is scoped to the signed-in account.

## Features

- User signup, login, and logout with Supabase Auth
- User-specific job application management
- Add, edit, and delete applications
- Search and filter applications
- Duplicate detection per user
- Dashboard statistics
- Modal editing
- Protected API routes
- Persistent Supabase/PostgreSQL storage
- Responsive UI with Tailwind CSS
- Vercel deployment support

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- PostgreSQL
- Supabase
- Vercel

## Architecture / How It Works

CareerTrack uses a protected request/response flow. The browser keeps track of the Supabase Auth session, then sends the current access token to the Next.js API routes. The API verifies the user, scopes database queries by `user_id`, talks to Supabase/PostgreSQL, and returns data back to the React UI.

```text
Frontend UI
-> Supabase Auth session
-> Next.js API routes
-> Supabase/PostgreSQL
-> Response
-> React state update
```

API routes:

- `GET /api/applications`: Verifies the access token, fetches only the signed-in user's applications, and returns them ordered by newest first.
- `POST /api/applications`: Verifies the access token, validates required fields, checks for duplicate company/role pairs for that user, inserts a new row with `user_id`, and returns the created application.
- `PUT /api/applications/:id`: Verifies the access token, confirms the application belongs to the signed-in user, validates updates, checks duplicates for that user, and returns the updated application.
- `DELETE /api/applications/:id`: Verifies the access token and deletes the application only when both `id` and `user_id` match.

After successful API responses, the dashboard updates React state so the UI reflects the latest application data without a full page reload.

## Authentication & Security

Supabase Auth handles user signup, login, logout, and session persistence. The frontend uses the Supabase browser client with a publishable key to read the current session and send the user's access token to the API.

The API routes verify each access token before reading or changing application data. Application rows are scoped by `user_id`, so each user can only access their own records through the app's API.

The `applications` table also has Row Level Security policies using `auth.uid()`. RLS adds database-level protection so authenticated users can only select, insert, update, and delete rows that belong to them.

Environment key handling:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to browser code.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is safe for browser usage and is used by the Supabase Auth client.
- The service role client remains isolated in server-side API code.

Middleware also provides route-level protection for the dashboard experience, but API route checks and RLS are still required because users can call API endpoints directly.

## Database Schema

Table: `applications`

| Column | Purpose |
| --- | --- |
| `id` | Unique application id |
| `user_id` | Supabase Auth user id that owns the row |
| `company` | Company name |
| `role` | Job title or role |
| `location` | Job location |
| `salary` | Salary range or notes |
| `jobLink` | Link to the job posting |
| `status` | Current status: Saved, Applied, Interview, Offer, or Rejected |
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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is public-safe and used by Supabase Auth in the browser.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be imported into client components.
- `.env.local` should not be committed to Git.
- Vercel needs the same environment variables configured in Project Settings.

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

## Deployment

CareerTrack is designed for deployment on Vercel.

Before deploying, add these environment variables in Vercel Project Settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Redeploy the project after adding or changing environment variables. After deployment, test signup/login and the application CRUD flow to confirm Vercel can communicate with Supabase.

## What I Learned

- Building authenticated full-stack apps
- Request/response architecture
- API route protection
- User-specific data modeling
- Supabase/PostgreSQL integration
- Environment variable security
- Auth session management
- CRUD architecture
- Deployment and debugging

## Future Improvements

- Application reminders
- CSV export
- Sorting options
- AI-powered job insights
- Analytics dashboard
- Email notifications

## Author

Built by Shabil as a portfolio project.
