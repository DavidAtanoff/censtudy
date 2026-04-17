# CenStudy Frontend

React + TypeScript frontend powered by Vite and Tailwind CSS.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```env
VITE_API_URL=http://localhost:3000
```

3. Start the app:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Auth Flow

- The app now uses backend session auth and Microsoft-only sign-in.
- The login page redirects to the backend at `/auth/login`.
- You must configure the Azure variables in `src/backend/.env` before Microsoft login is enabled.

## Build

```bash
npm run build
```

## Notes

- API requests use cookies with `withCredentials: true`.
- Stats, audit logs, files, unit resources, and learning content all depend on an authenticated backend session.
