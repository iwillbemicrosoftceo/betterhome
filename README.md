# Betterhome portal

The site uses Netlify Functions for portal and admin authentication. The game catalog is stored in a site-wide Netlify Blobs store, so successful changes are shared with visitors and survive redeploys. Visitors see catalog updates when they load or refresh the dashboard.

## Netlify environment variables

Add these in the Netlify site settings and include the **Functions** scope:

- `PORTAL_PASSWORD`: set this to the portal sign-in password.
- `ADMIN_PASSWORD`: set this to the admin password you chose.
- `SESSION_SECRET`: a randomly generated secret with at least 32 characters.

Generate a secret in PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Copy the output into Netlify's `SESSION_SECRET` setting. Do not put passwords or secrets in source files or `netlify.toml`. Redeploy after changing environment variables.

## Commands

Build command: `npm run build`

Publish directory: `dist`

Functions directory: `netlify/functions` (configured in `netlify.toml`).

Install dependencies and run Netlify locally:

```powershell
npm install
npx netlify-cli login
npx netlify-cli link
npm run dev
```

Deploy the production site:

```powershell
npm run deploy:prod
```

Node.js 18 or newer is required. Netlify Blobs automatically provides the shared store inside deployed functions. Local Netlify Dev uses its local development store, separate from production data.