# Deployment Guide

## Project Structure
This is a monorepo with three workspaces:
- `client/` - React frontend (deployed to Netlify)
- `server/` - Node.js + Socket.IO backend (deployed to Render)
- `shared/` - Shared TypeScript types

## Development Setup

### Install Dependencies
```bash
npm install
```

### Run Full Stack Locally
```bash
npm run dev
```

This runs both client (port 5173) and server (port 3001) concurrently.

### Run Individual Workspaces
```bash
# Server only
npm run dev:server

# Client only
npm run dev:client
```

## Netlify Deployment (Client)

### Build Command
```bash
npm run build:client
```

### Publish Directory
```
client/dist
```

### Environment Variables
None required

## Render Deployment (Server)

### Root Directory
Leave empty (deploy from repo root)

### Build Command
```bash
npm install -ws --include-workspace-root && npm run build:server
```

### Start Command
```bash
npm run start:server
```

### Environment Variables
- `PORT` - Auto-set by Render
- `CORS_ORIGIN` (optional) - Your Netlify URL (e.g., `https://your-app.netlify.app`)

## Post-Deployment

### Update Client API URL
After deploying the server to Render, update the Socket.IO connection URL in the client:

In `client/src/game/useGameSocket.ts`, replace the socket connection URL with your Render server URL.

### Test Connection
1. Open your Netlify client URL
2. Check browser console for Socket.IO connection status
3. Verify server logs in Render dashboard

## Troubleshooting

### Server won't start on Render
- Verify the build succeeded
- Check that `server/dist/index.js` exists in build logs
- Ensure `PORT` environment variable is set (Render does this automatically)

### Client can't connect to server
- Check CORS settings on server
- Verify Socket.IO URL in client matches your Render URL
- Check Render service is running

### Build fails
- Run `npm run build` locally to test
- Check for TypeScript errors
- Ensure all dependencies are in correct workspace package.json files
