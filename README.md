# LearnPulse — Online Course Platform

Self-hosted course platform with admin management, PDF learning modules, multiple-choice tests, and instant results.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js 14 (App Router)                        │
│                                                 │
│  /              → Login (ID number + password)   │
│  /admin         → Admin dashboard                │
│  /learner       → Learner dashboard              │
│                                                 │
│  /api/auth      → JWT auth (cookie-based)        │
│  /api/learners  → Learner CRUD                   │
│  /api/courses   → Course CRUD                    │
│  /api/modules   → Module CRUD + PDF upload       │
│  /api/tests     → Test builder (questions+answers)│
│  /api/results   → Submit + view test results     │
├─────────────────────────────────────────────────┤
│  Prisma ORM → SQLite (swap to Postgres/Supabase) │
├─────────────────────────────────────────────────┤
│  PDF Storage: /public/uploads/                   │
│  Served statically by Next.js at /uploads/*.pdf  │
└─────────────────────────────────────────────────┘
```

## PDF Storage

PDFs are stored as files on the server filesystem at `./public/uploads/`. Each uploaded PDF gets a UUID filename (e.g., `a1b2c3d4.pdf`) and is served statically by Next.js. The database stores the relative path (`/uploads/a1b2c3d4.pdf`) and original filename.

**For production deployment:**
- **Vercel**: Use an external storage provider (S3, Cloudflare R2, Supabase Storage) since Vercel's filesystem is ephemeral. Swap the upload handler to use the provider SDK.
- **VPS / Railway / Fly.io**: The filesystem persists — `./public/uploads/` works as-is. Mount a persistent volume for the uploads directory.
- **Supabase Storage**: Replace the file write in `/api/modules/route.js` with Supabase Storage SDK calls.

## Quick Start

```bash
# 1. Install
npm install

# 2. Push schema + seed admin user
npx prisma db push
npm run db:seed

# 3. Run
npm run dev
```

Open http://localhost:3000

**Default admin login:** ID `admin` / Password `admin123`

## Database

Uses SQLite by default (zero config). To switch to Postgres:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/learnpulse"
   ```

3. Run `npx prisma db push`

## Data Model

| Table      | Purpose                                        |
|------------|------------------------------------------------|
| User       | Learners + admin. ID number as username.       |
| Course     | Course container with title/description.       |
| Module     | Learning unit within a course. Has PDF path.   |
| Test       | One test per module.                           |
| Question   | MCQ with 4 options (A–D) and correct answer.   |
| Result     | Learner test submission with score/percentage. |

## Features

### Admin
- Create/delete courses
- Add modules with PDF upload
- Build multiple-choice tests with correct answer marking
- Manage learners (add, delete, reset password)
- View all test results with scores and timestamps

### Learner
- Browse courses and modules
- View PDF learning material inline
- Take multiple-choice tests
- Instant score feedback
- Track progress with completion indicators
- View personal results history

## Environment Variables

| Variable     | Default              | Description               |
|-------------|----------------------|---------------------------|
| DATABASE_URL | file:./dev.db        | Prisma database URL       |
| JWT_SECRET   | (change in prod!)    | JWT signing secret        |
| UPLOAD_DIR   | ./public/uploads     | PDF upload directory      |

## Production Deployment

```bash
npm run build    # generates Prisma client + pushes schema + builds Next.js
npm start        # starts production server
```

Remember to:
1. Set a strong `JWT_SECRET`
2. Configure persistent storage for `/public/uploads/`
3. Switch to Postgres for multi-instance deployments
