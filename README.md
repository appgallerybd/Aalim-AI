# Aalim AI — Multi-Model Workspace

A polished, mobile-responsive AI chat workspace powered by the Helyx AI OpenAI-compatible API.

## Features
- Connect/disconnect a Helyx AI API key from the top-right button.
- Connection indicator with green status light.
- Fetches available models dynamically from `/v1/models`, with starter model fallbacks.
- Select one, multiple, or all models and send one prompt to them in parallel.
- Separate response tabs for each selected model.
- Recent conversations, copy response, dark/light theme, responsive mobile navigation.
- API key is stored in browser localStorage on the current device.

## Run locally
Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

## Deploy
This is a Vite static frontend and can be deployed through GitHub Pages, Vercel, or Netlify. Build command: `npm run build`; output directory: `dist`.

## API configuration
The app uses:
- Base URL: `https://helyxai.space/v1`
- Models: `GET /models`
- Chat: `POST /chat/completions`

Model IDs are loaded from the API where available. Starter IDs are only a fallback for when the model list endpoint cannot be reached. The API provider must allow browser CORS requests for direct frontend calls to work.

## Security note
For this personal-key workflow, the key is saved in localStorage and sent from the browser to Helyx AI. Do not use this setup on a shared device or expose it to untrusted users. For a public multi-user product, route API calls through a backend, add authentication and rate limits, and keep provider credentials on the server.
