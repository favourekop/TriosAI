# TriosAI

**Your Intelligent AI Companion**  
*The future of workflow and technology.*

TriosAI is an AI-powered workspace for chat, creative tools, file analysis, activity tracking and subscription plans. This repository is an active early-development foundation, not yet a production-ready service.

## Current implementation

- React 19 + TypeScript + Vite workspace interface
- Responsive Overview, AI Chat, AI Studio, Activity, Plans and Settings sections
- Express API with health and plan endpoints
- OpenAI Responses API integration point (server-side key only)
- Supabase browser client and Google OAuth sign-in flow
- Supabase SQL schema with user profile trigger and row-level security policies
- GitHub Actions build workflow

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

The Vite frontend runs on port 5173 and proxies `/api` to the Express API on port 3001.

## Supabase and Google sign-in

1. Create a Supabase project.
2. In Authentication → Providers, enable Google and configure the Google OAuth client credentials.
3. Add your local and production app URLs to Supabase Authentication URL Configuration.
4. In the Supabase SQL Editor, run `db/schema.sql`.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the frontend.
6. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the API server.
7. Never expose the Supabase service-role key in browser code.

The AI chat endpoint validates the signed-in user's Supabase access token. The Google provider cannot complete sign-in until the Supabase and Google provider settings are supplied.

## AI configuration

Set `OPENAI_API_KEY` on the server only. Optionally set `OPENAI_MODEL`. Do not add secrets to Git or any `VITE_*` variable.

## Build and checks

```bash
npm run build
npm run check
```

GitHub Actions runs the production build on pushes and pull requests to `main`.

## Deployment notes

The project can be deployed as one Render web service:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Configure environment variables in the hosting dashboard, not in source control.

## Not yet production-enabled

- Persistent conversation and activity storage
- Secure file upload, malware scanning and document extraction
- Image, video and audio generation providers
- Paystack initialization, signed webhook verification and subscription lifecycle
- Admin role management and reporting
- End-to-end tests, accessibility audit and production deployment verification

Plan pricing remains unset until reviewed and approved. No payment is currently accepted.
