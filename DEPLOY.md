# Deployment Guide

## Recommended: Railway (5 min setup)

Railway gives you a persistent filesystem (needed for SQLite + PDF uploads) and auto-deploys from GitHub.

### 1. Push to GitHub
```bash
cd ~/Desktop/course-platform
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:ArcticEng/learnpulse.git
git push -u origin main
```

### 2. Create Railway project
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the `learnpulse` repo
3. Railway auto-detects Next.js via Nixpacks

### 3. Add a persistent volume (critical for SQLite + uploads)
1. In your Railway service → **Settings** → **Volumes** → **+ New Volume**
2. Mount path: `/app/data`
3. Save (this gives you persistent disk for the database)
4. Add another volume mounted at `/app/public/uploads` for the PDF files

### 4. Set environment variables
In the **Variables** tab:
```
DATABASE_URL=file:/app/data/prod.db
JWT_SECRET=<run: openssl rand -hex 32>
NODE_ENV=production
```

### 5. Generate a public domain
**Settings** → **Networking** → **Generate Domain**

### 6. Seed the admin user (one-time)
Open the Railway shell on your service and run:
```bash
npm run db:seed
```

Login at `https://your-app.up.railway.app` with `admin` / `admin123`. **Change the password immediately** by adding a learner with a strong one and updating the seed script, or by editing the user in Prisma Studio.

---

## Alternative: Vercel (requires code changes)

Vercel's filesystem is ephemeral — SQLite and `/public/uploads/` won't persist across deploys. You'll need:

### 1. Switch to a hosted database
- **[Neon](https://neon.tech)** (Postgres, free tier) — recommended
- Or Supabase Postgres, or Railway Postgres

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Switch PDF storage to object storage
Pick one:
- **Supabase Storage** — easy, free tier, S3-compatible
- **Cloudflare R2** — cheap, no egress fees
- **AWS S3** / **UploadThing** / **Vercel Blob**

Update `src/app/api/modules/route.js`:
- Replace `writeFile()` with the storage SDK upload
- Store the public URL in `pdfPath` instead of `/uploads/...`

### 3. Deploy
```bash
npm i -g vercel
vercel
```
Set the env vars in Vercel dashboard. Done.

---

## Alternative: Fly.io (also persistent)

Similar to Railway, supports persistent volumes:
```bash
brew install flyctl
fly launch
fly volumes create data --size 1
# Mount at /app/data in fly.toml
fly deploy
```

---

## Production checklist

- [ ] Strong `JWT_SECRET` (32+ random bytes)
- [ ] Change default admin password
- [ ] HTTPS enabled (auto on Railway/Vercel/Fly)
- [ ] Backup strategy for `/app/data/prod.db` (or use Postgres)
- [ ] Set max upload size in Next.js if PDFs may be large
- [ ] Enable email notifications (optional, requires Resend/SendGrid)
- [ ] Custom domain via DNS CNAME

---

## Cost estimate

| Platform | Cost / month | Notes |
|----------|--------------|-------|
| Railway  | ~$5          | Hobby plan, includes volume |
| Vercel + Neon + R2 | ~$0-5 | Free tiers cover small usage |
| Fly.io   | ~$0-5        | Free tier: 3 small VMs + 3GB volume |
| VPS (Hetzner)  | ~$5    | Most control, most setup work |
