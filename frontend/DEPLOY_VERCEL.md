Deploying the frontend to Vercel
================================

1) Prepare repository

- Push your repo to GitHub (or GitLab).

2) Using Vercel web UI (recommended)

- Go to https://vercel.com and import a new project.
- Select your Git repository and, when prompted, set the **Root Directory** to `frontend`.
- Ensure Environment Variable `NEXT_PUBLIC_API_URL` is set to your backend URL (e.g. `https://api.example.com`).
- Vercel will auto-detect Next.js. Review Build & Output settings (default is fine) and deploy.

3) Using Vercel CLI

```bash
# install CLI (if not installed)
npm i -g vercel

cd frontend
vercel login
# first deploy (interactive) or use --prod to deploy to production
vercel --prod

# set environment variable for production
vercel env add NEXT_PUBLIC_API_URL production https://api.example.com
```

Notes
- The frontend reads API host from `NEXT_PUBLIC_API_URL`. Ensure it points to a reachable backend.
- For quick demos you can deploy only the frontend and mock the API, but a real demo should have a hosted backend (Railway/Render/Cloud Run).
