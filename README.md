# ChatKit Vercel Demo

A minimal [Next.js](https://nextjs.org/) front end that embeds [OpenAI ChatKit](https://platform.openai.com/docs/guides/chatkit) via the public CDN bundle and fetches a client secret from a serverless API route. The project is ready to deploy on [Vercel](https://vercel.com/)—just provide your `OPENAI_API_KEY`.

## Getting started locally

1. Copy `.env.local.example` to `.env.local` and fill in your credentials.

   ```bash
   cp .env.local.example .env.local
   ```

2. Install dependencies and start the dev server:

   ```bash
   pnpm install  # or npm install / yarn
   pnpm dev      # runs next dev
   ```

Then visit [http://localhost:3000](http://localhost:3000) to chat with the assistant.

> **Why this avoids 403 install errors:** The ChatKit widget is loaded from OpenAI's CDN at runtime,
> so the project no longer depends on preview-only npm packages. A standard `npm install` works with no
> extra authentication.

## Deploying to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. Add an `OPENAI_API_KEY` environment variable in the Vercel dashboard (and `CHATKIT_WORKFLOW_ID` if you use a custom workflow).
3. Deploy the project. Vercel will run `next build` automatically.

## How it works

- `app/api/chatkit/session/route.ts` issues requests to the ChatKit REST API using the server-side API key and returns the resulting client secret to the browser.
- `components/MyChat.tsx` loads the ChatKit web bundle at runtime, requests a client secret, and mounts the widget without any private npm dependencies.
- Static assets and layout live under the `app/` directory, leveraging the Next.js App Router for instant deployment on Vercel.

> **Note:** Remember to configure [CORS origins or assistant instructions](https://platform.openai.com/docs/guides/chatkit/deploy#authorization) in your OpenAI project to match your deployed domain for production use.
