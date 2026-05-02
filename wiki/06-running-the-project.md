# 06 — Running the Project

## Daily Development Workflow

### 1. Start Docker (if not already running)
Make sure Docker Desktop is open, then:
```powershell
docker compose up -d
```

### 2. Start the Dev Servers
```powershell
# Both backend + frontend at once
npm run dev
```

Or separately:
```powershell
# Terminal 1: Backend (port 9000)
npm run dev -w backend

# Terminal 2: Frontend (port 3000)
npm run dev -w frontend
```

### 3. Open in Browser

| URL | Page |
|-----|------|
| http://localhost:3000 | Hub Homepage |
| http://localhost:3000/hub/dashboard | Vendor Dashboard |
| http://localhost:3000/hub/checkout | Checkout Page |
| http://localhost:9000/health | API Health Check |

## Background Workers

Workers process asynchronous tasks (image compression, email sending). Start them in separate terminals:

```powershell
# AI worker (image compression, SEO generation)
npm run worker:ai -w backend

# Email worker
npm run worker:email -w backend
```

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both backend + frontend |
| `npm run build` | Build for production |
| `npm run lint` | Check code for errors |
| `npm run format` | Auto-format all code with Prettier |
| `npm run type-check -w backend` | Check TypeScript types without building |
| `npm run test -w backend` | Run backend tests |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:logs` | View Docker logs (live) |
| `npm run docker:reset` | Delete all data and restart fresh |

## Stopping Everything

```powershell
# Stop the dev servers: press Ctrl+C in the terminal

# Stop Docker services
docker compose down

# Stop AND delete all data (fresh start)
docker compose down -v
```
