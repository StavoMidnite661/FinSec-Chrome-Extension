SECURITY GUIDELINES
===================

Short guidance for Google OAuth client secrets and this Chrome extension.

- Never commit `client_secret` files (the JSON downloaded from Google) into source control.
- Browser extensions and client-side code are public: do not embed secrets in `manifest.json`, `background.js`, or any frontend file.
- The `oauth2` block in `manifest.json` may contain only `client_id` and `scopes` for Chrome extension flows.
- If you need to exchange authorization codes or perform server-to-server API calls using a client secret, perform those actions on a trusted server that stores secrets in environment variables or a secret manager.

Quick remediation steps if you accidentally committed a client secret:

1. Rotate the OAuth client in Google Cloud Console immediately (create a new client ID/secret and delete the compromised one).
2. Remove the secret from your git history using `git filter-repo` or `git filter-branch` and then force-push.
3. Revoke any tokens that may have been issued using the compromised secret.

Small example and guidance live in `examples/oauth_server/`.
