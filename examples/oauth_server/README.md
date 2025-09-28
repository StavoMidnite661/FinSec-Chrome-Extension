Example OAuth server (safe handling)
===================================

Purpose
-------

Small Node/Express example that shows how to exchange an OAuth2 authorization code for tokens on a trusted server. This keeps `client_secret` out of the extension and out of the repository.

Requirements
------------

- Node 14+
- npm

Environment
-----------

Set these environment variables before running:

- GOOGLE_CLIENT_ID - from Google Cloud Console
- GOOGLE_CLIENT_SECRET - from Google Cloud Console (keep secret)
- REDIRECT_URI - the redirect you register with Google (example: `http://localhost:3000/oauth2callback`)

Run
---

Install, then run:

```bash
npm install express node-fetch querystring
GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node server.js
```

Notes
-----

- Do not commit the client secret. Use a secret manager in production.
- The extension should call this endpoint (from a trusted backend) to exchange codes or to perform privileged API calls.
