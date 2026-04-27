# CareerTrack Dashboard

A job application tracker that helps users manage, organize, and track applications in a clean dashboard-style interface.

CareerTrack Dashboard is built with Next.js, React, TypeScript, and Tailwind CSS. It focuses on a simple local workflow: users can add applications, update them in a modal, search and filter their list, and keep data saved in the browser with `localStorage`.

## Live Demo

Coming soon.

## Screenshot

Coming soon.

## Features

- Add, edit, and delete job applications
- Track company, role, location, salary, job link, status, and notes
- Status options: Saved, Applied, Interview, Offer, and Rejected
- Search applications by company or role
- Filter applications by status
- Dashboard stats for total applications, applied roles, interviews, and offers
- Modal-based editing for updating full application details
- Duplicate detection to prevent adding the same company and role twice
- Browser persistence using `localStorage`
- Responsive dashboard UI built with Tailwind CSS

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

## How It Works

Applications are stored in React state and rendered into dashboard cards. The add form creates new applications, while the edit modal updates existing applications without leaving the page.

The app saves the applications list to `localStorage`, so data stays available after refreshing the browser. This project does not use a backend or database yet.

Duplicate detection checks the company and role before adding a new application. Both values are trimmed and converted to lowercase, so entries like `Google`, ` google `, and `GOOGLE` are treated as the same company.

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

## Project Structure

```text
src/
  app/
    page.tsx       Main dashboard component and application logic
    layout.tsx     App layout
    globals.css    Global styles
public/            Static assets
```

## Key Design Decisions

- `localStorage` is used for persistence to keep the project simple and frontend-focused.
- Editing happens in a modal so users can update an application without losing context.
- Duplicate detection was added to prevent accidental repeat entries for the same company and role.
- Status badges use different colors to make application progress easier to scan.
- The UI is responsive and uses Tailwind utility classes for consistent styling without extra dependencies.

## What I Learned

- Managing form state and list updates in React
- Building reusable state logic for adding, editing, deleting, searching, and filtering
- Persisting client-side data with `localStorage`
- Avoiding hydration issues when using browser-only APIs in a Next.js app
- Using TypeScript interfaces to keep application data structured
- Improving UI hierarchy with spacing, button styles, cards, and status badges

## Future Improvements

- Add user authentication
- Store applications in a real database
- Add sort options by date, company, or status
- Add confirmation before deleting an application
- Add application deadlines or reminders
- Export applications to CSV
- Add deployment and a live demo link

## Author

Built by Shabil as a portfolio project.
