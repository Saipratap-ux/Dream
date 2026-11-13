# Somnia — Multimodal Dream Journal

A responsive, installable static web app designed for GitHub Pages. It includes a local-first dream journal, browser microphone recording, audio upload preview, reflective archetype-inspired interpretation, symbol follow-up chat, multi-language setting scaffold, dark mode, export/delete controls, insights, and a static admin demo.

## Important: what works in this ZIP

- **Dream writing and local journal:** working; saved in this browser with `localStorage`.
- **Microphone capture:** working in supported browsers on HTTPS or localhost. Browser-native live speech recognition fills the transcript where supported (Chrome-family browsers are the best target); recognition availability and language quality vary by browser. Audio recording remains in the current page session.
- **Audio upload:** local audio preview works; uploaded-file transcription requires a speech-to-text provider.
- **Interpretation and symbol chat:** working as a clearly labelled, rule-based reflective demo. It is not therapy, diagnosis, or a scientifically validated decoding of dreams.
- **Surrealist AI image:** placeholder is shown until an image provider is connected.
- **PWA:** manifest and service worker included; installability requires HTTPS (GitHub Pages provides HTTPS).
- **Admin dashboard:** static demo only. There is no backend, account system, or cross-device sync.

## Run locally

Use a local static server (service workers and microphone access need localhost/HTTPS):

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `somnia-dream-journal`.
2. Extract this ZIP and upload the contents (the `index.html` must be at the repository root).
3. Commit and push to the `main` branch.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
6. Wait for the deployment URL shown by GitHub Pages. Open it over HTTPS and install the PWA from your browser menu.

No build step is required. Relative asset paths support project pages.

## Connecting real AI services (recommended architecture)

Never put private API keys in `app.js`, GitHub Pages, or any client-side environment variable. Deploy a small backend (for example, Cloudflare Workers, Vercel Functions, or your own server) and set:

```js
window.SOMNIA_API_BASE = "https://your-api.example.com";
```

Place that line before `app.js` in `index.html`. Implement:

### `POST /dream/analyze`
Request:
```json
{ "text": "Dream transcript...", "locale": "en" }
```
Response:
```json
{
  "imageUrl": "https://your-cdn.example/dream-art.webp",
  "interpretation": {
    "emotionalTheme": "A threshold between uncertainty and possibility.",
    "archetypalLens": "A Jungian-inspired reading of the threshold motif..."
  }
}
```

The backend should:
1. Receive audio via a separate authenticated multipart endpoint and transcribe it with a speech-to-text model.
2. Generate a concise, privacy-safe surrealist image prompt from the transcript and create the image with an image-generation provider.
3. Return a structured, non-diagnostic reflection with caveats and user-specific questions.
4. Moderate sensitive content, rate-limit requests, validate uploads, and avoid retaining raw audio by default.
5. Keep provider keys in server secrets, not browser code.

For real follow-up chat, add `POST /dream/chat` and call it from the `chat-form` handler. Use the transcript and user-selected symbol as context, but do not claim to diagnose mental health or infer trauma.

## Multi-language roadmap

The language selector includes English, Hindi, Odia, Spanish, and French as starter choices. To fully support a language, localize every interface string, send the chosen BCP-47 locale to transcription and AI endpoints, and test voice recognition/transcription with speakers of that language. Do not claim all Indian languages are supported until each is validated.

## Privacy and safety

Dreams can contain sensitive personal information. This starter stores text locally in the browser only. Anyone with access to the same browser profile may be able to view it. Add a clear consent flow before cloud processing, encryption and account controls if syncing, a delete/export policy, and an explicit retention policy before public launch. Archetypes are interpretive metaphors, not universal meanings or clinical findings.

## Tests

Run:

```bash
npm test
```

The lightweight Node test suite checks core text helpers and local archetype selection. No dependencies are required.
