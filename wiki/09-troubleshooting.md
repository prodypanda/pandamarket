# 09 — Troubleshooting

Common problems and their solutions.

---

## Docker Issues

### "Docker daemon is not running"
**Solution:** Open Docker Desktop and wait for it to fully start (the whale icon in the system tray should be stable, not animating).

### "Port 5432 already in use"
Another PostgreSQL is running on your machine.
```powershell
# Find what's using port 5432
netstat -ano | findstr :5432

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F

# Or change the port in docker-compose.yml:
#   ports:
#     - '5433:5432'
# Then update PD_DATABASE_URL to use port 5433
```

### Containers keep restarting
```powershell
# Check logs for the failing container
docker compose logs postgres
docker compose logs redis
```

---

## Node.js / NPM Issues

### "EBADENGINE" warnings during `npm install`
These are **safe to ignore**. They just mean your npm version is slightly different from what's recommended. The project works fine.

### "Cannot find module" errors
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force backend\node_modules
Remove-Item -Recurse -Force frontend\node_modules
npm install
```

### "bcrypt" compilation errors
PandaMarket uses `bcryptjs` (pure JavaScript) instead of native `bcrypt`. If you see bcrypt errors:
```powershell
# Make sure bcryptjs is installed
npm ls bcryptjs -w backend
```

---

## Backend Issues

### Backend crashes on startup with "Database connection failed"
1. Make sure Docker is running: `docker compose ps`
2. Check PostgreSQL is healthy: `docker compose logs postgres`
3. Verify your `.env` file has the correct `PD_DATABASE_URL`
4. Try connecting manually:
```powershell
docker exec -it pd_postgres psql -U pd_user -d pandamarket -c "SELECT 1"
```

### "Redis connection refused"
```powershell
# Check Redis is running
docker compose logs redis

# Restart Redis
docker compose restart redis
```

### Migrations fail
```powershell
# Check the error message carefully
npm run migrate -w backend

# If a migration is partially applied, you may need to fix it manually:
docker exec -it pd_postgres psql -U pd_user -d pandamarket

# Then in psql:
SELECT * FROM pd_migrations;  -- see what's applied
DELETE FROM pd_migrations WHERE id = 'problematic_migration.sql';
\q

# Re-run migrations
npm run migrate -w backend
```

---

## Frontend Issues

### "Module not found" in Next.js
```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force frontend\.next
npm run dev -w frontend
```

### Tailwind styles not applying
Make sure `globals.css` is imported in `layout.tsx`. The `@theme` warning is normal for Tailwind v4.

---

## Production Issues

### Caddy won't start / SSL errors
```bash
# Check Caddy logs
sudo journalctl -u caddy -f

# Verify DNS is pointing to your server
dig pandamarket.tn +short

# Test Caddy config
caddy validate --config /etc/caddy/Caddyfile
```

### Application returns 502 Bad Gateway
The backend or frontend is not running:
```bash
sudo systemctl status pandamarket-backend
sudo systemctl status pandamarket-frontend

# Restart
sudo systemctl restart pandamarket-backend
sudo systemctl restart pandamarket-frontend
```

### Out of memory on VPS
```bash
# Check memory usage
free -h

# Add swap space (if none exists)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Getting Help

If none of these solutions work:

1. Check the error message carefully — it usually tells you exactly what's wrong
2. Search the error message on Google or Stack Overflow
3. Check the GitHub/GitLab issues for similar problems
4. Make sure all Docker containers are running: `docker compose ps`
5. Make sure your `.env` file exists and has all required variables
