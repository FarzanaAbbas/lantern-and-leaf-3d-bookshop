# Lantern & Leaf — 3D walk-in bookshop

A bookshop you can walk through in the browser. Scroll (or W/S, or swipe) to walk the aisles, click any spine to pull the book off the shelf, and add it to your trolley.

Built with React + Vite, three.js via @react-three/fiber, and Motion for the UI animation.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo. The settings are read from `vercel.json` (Vite, `npm run build`, output `dist`).
3. Deploy. Add the client's domain under **Settings → Domains**.

Or from the terminal: `npx vercel` (preview) then `npx vercel --prod`.
