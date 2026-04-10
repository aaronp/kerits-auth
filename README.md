# kerits-auth

Example site demonstrating authentication with the [Kerits](https://github.com/aaronp/kv4) identity wallet.

Users configure proof requirements (membership, credentials) and authenticate via their self-hosted identity wallet.

## Quick start

```bash
# Clone and install
git clone https://github.com/aaronp/kerits-auth.git
cd kerits-auth
npm install    # or: bun install

# Run dev server
npm run dev    # opens on http://localhost:5174
```

## Configuration

Set environment variables in `.env` or `.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WALLET_URL` | `http://localhost:5173/auth` | Default wallet URL |
| `VITE_AUDIENCE` | `window.location.origin` | Audience for auth requests |

## Deploy

This repo includes a GitHub Actions workflow that deploys to GitHub Pages on push to `main`.

To deploy manually:

```bash
npm run build
# Upload contents of dist/ to your host
```

## Customizing

This is a template — fork it and adapt:

- **Requirements**: Edit `src/routes/Login.tsx` to change default proof requirements
- **Styling**: Edit `src/styles.css`
- **Issuer logic**: Edit `src/routes/Issue.tsx` for delegation approval flows

## Dependencies

This project uses packages from the [`@kerits` npm registry](https://www.npmjs.com/org/kerits). The `.npmrc` file configures this automatically.
