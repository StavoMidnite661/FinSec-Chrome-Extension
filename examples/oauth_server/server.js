// Minimal example: exchange OAuth2 authorization code on a trusted server.
// Run this server separately from the extension. Store CLIENT_ID and CLIENT_SECRET
// in environment variables; never commit them.

const express = require('express');
const fetch = require('node-fetch');
const qs = require('querystring');

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. Set env vars before running.');
}

// POST /exchange-token { code }
app.post('/exchange-token', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'missing code' });

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) return res.status(500).json({ error: 'token exchange failed', details: data });

    // Return tokens to a trusted caller (or store securely server-side)
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.listen(3000, () => console.log('OAuth example server listening on http://localhost:3000'));
