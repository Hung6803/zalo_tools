# Zalo Marketing Desktop App

Desktop application for Zalo Marketing automation.

## Architecture

```
┌─────────────────────────────────────┐
│   User's Computer (Home IP)        │
│  ┌──────────────────────────────┐  │
│  │  Desktop App                 │  │
│  │  - Electron UI               │  │
│  │  - Local Worker (port 3001)  │  │
│  │  - SQLite Database           │  │
│  │  - Zalo Client (User's IP)   │  │
│  └────────┬─────────────────────┘  │
└───────────┼─────────────────────────┘
            │ Sync data ↑
            ↓ Fetch data ↓
┌───────────────────────────────────────┐
│   Backend Server (Cloud)             │
│   - User Management                  │
│   - Data Storage                     │
│   - Analytics                        │
└───────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
BACKEND_URL=https://your-backend.com
AGENT_API_KEY=your-agent-api-key
WORKER_PORT=3001
NODE_ENV=development
```

To get `AGENT_API_KEY`:
1. Register account on backend
2. Backend will return `agentId` and `apiKey`
3. Copy `apiKey` to `.env`

### 3. Development

Run in development mode:

```bash
npm run dev
```

This will start:
- Worker (local API server on port 3001)
- Renderer (React app on port 3000)
- Electron (desktop window)

### 4. Build

Build for production:

```bash
# Build all components
npm run build

# Build Windows installer
npm run build:win
```

Output: `dist-build/Zalo-Marketing-Setup-1.0.0.exe`

## Project Structure

```
desktop-app/
├── electron/           # Electron main process
│   ├── main.ts        # Main window & worker launcher
│   └── preload.ts     # IPC bridge
├── worker/            # Local backend worker
│   ├── api-server.ts  # Express API server
│   ├── zalo-client.ts # Zalo operations (User's IP)
│   ├── local-db.ts    # SQLite database
│   └── sync-service.ts # Sync to cloud backend
├── renderer/          # React frontend (create separately)
│   └── src/
│       ├── pages/
│       └── services/
├── data/              # Runtime data (local)
│   ├── app.db        # SQLite database
│   ├── sessions/     # Zalo sessions
│   └── browser_profiles/ # Playwright profiles
└── package.json
```

## API Endpoints

### Local Worker API (localhost:3001)

**Zalo Operations:**
- `POST /local/login` - Login with QR code
- `POST /local/complete-login` - Complete login after QR scan
- `POST /local/logout` - Logout
- `GET /local/account-info/:accountId` - Get account info
- `POST /local/send-message` - Send message (User's IP → Zalo)
- `POST /local/scrape-group` - Scrape group members (User's IP → Zalo)
- `POST /local/send-friend-request` - Send friend request
- `POST /local/find-user` - Find user by phone

**Local Data:**
- `GET /local/messages/:accountId` - Get message history
- `GET /local/contacts/:accountId` - Get contacts
- `GET /local/group-members/:accountId/:groupId` - Get group members
- `GET /local/accounts` - Get all accounts

**Sync:**
- `POST /local/sync/manual` - Trigger manual sync
- `GET /local/sync/status` - Get sync status

## Data Flow

### Sending Message

```
1. User clicks "Send" in UI
2. React → POST http://localhost:3001/local/send-message
3. Worker → Zalo API (User's IP)
4. Worker → Save to SQLite (synced=0)
5. Worker → Background sync to cloud backend
6. Cloud backend → Save to PostgreSQL
```

### Viewing Contacts

```
1. User opens Contacts page
2. React → GET https://backend.com/api/contacts
3. Backend → Return contacts from PostgreSQL
4. React → Display in UI
```

## Features

- ✅ Multi-account Zalo management
- ✅ Send messages with User's IP (safe from blocks)
- ✅ Scrape group members
- ✅ Local database with auto-sync
- ✅ Offline-capable
- ✅ Desktop notifications
- ✅ Auto-update support

## Troubleshooting

**Worker not starting:**
- Check port 3001 is not in use
- Check `data/` directory exists and is writable

**Sync not working:**
- Verify `AGENT_API_KEY` and `BACKEND_URL` in `.env`
- Check backend is accessible
- Check worker logs for errors

**Zalo login fails:**
- Ensure Playwright browsers are installed: `npx playwright install`
- Check browser automation is not blocked by antivirus

## License

MIT
