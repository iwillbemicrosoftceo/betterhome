# Betterhome portal

The site deploys to Netlify. Its Functions validate the portal and admin passwords on the server and issue signed, HTTP-only session cookies. The build publishes only the public files; `/education.html` is returned by a function after portal authentication.

## Netlify settings

`netlify.toml` sets the build command, publish directory, Functions directory, and protected routes. Add these environment variables in Netlify's site settings, keeping them out of source control:

- `PORTAL_PASSWORD`: the password for opening the education portal.
- `ADMIN_PASSWORD`: the password for the top-bar admin login.
- `SESSION_SECRET`: a randomly generated secret of at least 32 characters.

The admin password is never included in the site files. Since a previous portal password was exposed in browser code, use a new portal password.

Set all three variables in Netlify's environment variable settings and include the **Functions** scope. For local development, Netlify CLI uses the linked site's `dev` or `all` context variables. Generate a signing secret in PowerShell with:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Copy that generated value directly into the `SESSION_SECRET` setting. Do not put passwords or secrets in `netlify.toml` or browser code.

## Commands

Netlify build command: `npm run build`

Publish directory: `dist`

Functions directory: `netlify/functions` (configured in `netlify.toml`).

Local development:

```powershell
npx netlify-cli login
npx netlify-cli link
npm run dev
```

Deploy a production build from the command line after linking the site:

```powershell
npx netlify-cli login
npx netlify-cli link
npm run deploy:prod
```

Node.js 18 or newer is required. The local Netlify server is available at `http://localhost:8888`.