Google OAuth for Chrome extensions
=================================

Summary
-------

This document explains the minimal pieces you need in the extension (`manifest.json`) and how to create credentials in Google Cloud for an extension that uses OAuth.

What goes in `manifest.json`
----------------------------

- `oauth2.client_id`: the OAuth client ID (public) you register in Google Cloud.
- `oauth2.scopes`: the scopes your extension needs, for example `openid`, `email`, `profile`.

What must NOT go in `manifest.json`
-----------------------------------

- `client_secret`, `auth_uri`, `token_uri`, or the entire downloaded JSON file. These are sensitive and belong on a trusted server or a secure storage.

Choosing credential type in Google Cloud
---------------------------------------

1. Create a new OAuth 2.0 Client ID in the Google Cloud Console.
2. For Chrome extensions you can use "Web application" credentials and register the extension's OAuth redirect URI(s). If using the Chrome Identity APIs, register an OAuth client and ensure the redirect URI matches the extension flow (for `chrome.identity.launchWebAuthFlow`).

Redirect URIs
-------------

- For local testing you can use `http://localhost:3000/oauth2callback` (server-side example).
- For extension flows with `chrome.identity`, the redirect URI will be a special `https://{app-id}.chromiumapp.org/` URI provided by Chrome. See Google docs on "OAuth 2.0 for Chrome extensions".

Recommended flows
-----------------

- Client-only (no client_secret required): Use `chrome.identity` (launchWebAuthFlow or getAuthToken) which can handle user sign-in without exposing a secret.
- Server-side: Use the extension to get an authorization code, send that code to your backend, and exchange it for tokens server-side. Keep the secret on the server.

Rotation and revocation
-----------------------

- If a secret is ever exposed, rotate the credential in the Cloud Console immediately and revoke tokens if possible.

References
----------

- Google OAuth docs: <https://developers.google.com/identity>
- Chrome Identity API docs: <https://developer.chrome.com/docs/extensions/reference/identity/>
