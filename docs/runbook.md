# PandaMarket — Incident Response Runbook

> **Version:** 1.0 | **Last updated:** 2026-05-03

---

## 1. Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1** | Platform down, payments broken, data loss | < 15 min | DB crash, payment double-charge, SSL expired |
| **SEV-2** | Major feature broken, degraded for many users | < 1 hour | Search down, checkout failing, worker crash |
| **SEV-3** | Minor feature broken, workaround exists | < 4 hours | AI tools failing, CSV export broken, theme rendering issue |
| **SEV-4** | Cosmetic, low impact | Next business day | UI glitch, typo, non-critical log noise |

---

## 2. First Response Checklist

```
□ Acknowledge the incident
□ Check /health and /ready endpoints
□ Check Sentry for error spikes
□ Check Prometheus /metrics for anomalies
□ Check Docker container status: docker compose ps
□ Check application logs: docker compose logs -f --tail=100 backend
□ Identify affected component (DB, Redis, Meilisearch, S3, backend, frontend)
□ Communicate status to team
```

---

## 3. Common Incidents

### 3.1 Backend Not Responding

**Symptoms:** 502/503 from Caddy, /health returns error or timeout

**Steps:**
```bash
# Check if backend container is running
docker compose ps backend

# Check backend logs
docker compose logs --tail=200 backend

# Restart backend
docker compose restart backend

# If OOM killed, check memory
docker stats --no-stream

# Nuclear option: full restart
docker compose down && docker compose up -d
```

### 3.2 Database Connection Errors

**Symptoms:** 500 errors, /ready shows postgres: error

**Steps:**
```bash
# Check PostgreSQL status
docker compose ps postgres
docker compose logs --tail=50 postgres

# Check connection count
docker compose exec postgres psql -U pd_user -d pandamarket -c "SELECT count(*) FROM pg_stat_activity;"

# If pool exhausted, restart backend (releases connections)
docker compose restart backend

# If DB crashed, restart it
docker compose restart postgres
# Wait for it to be ready, then restart backend
sleep 10 && docker compose restart backend
```

### 3.3 Redis Down

**Symptoms:** Auth failures (refresh tokens), BullMQ workers stalled, rate limiting broken

**Steps:**
```bash
# Check Redis
docker compose ps redis
docker compose exec redis redis-cli ping

# Restart Redis
docker compose restart redis

# Restart workers (they reconnect automatically, but just in case)
docker compose restart backend
```

### 3.4 Payment Processing Failure

**Symptoms:** Checkout fails, webhook errors in logs, wallet not credited

**Steps:**
```bash
# Check payment webhook logs
docker compose logs backend | grep -i "webhook\|payment\|flouci\|konnect"

# Check pd_payment_event table for stuck events
docker compose exec postgres psql -U pd_user -d pandamarket \
  -c "SELECT * FROM pd_payment_event ORDER BY created_at DESC LIMIT 20;"

# Check for orders stuck in payment_required
docker compose exec postgres psql -U pd_user -d pandamarket \
  -c "SELECT id, payment_status, created_at FROM pd_order WHERE payment_status = 'payment_required' ORDER BY created_at DESC LIMIT 20;"

# If a specific order needs manual capture:
# Use admin panel → Mandats queue, or directly update via SQL (last resort)
```

### 3.5 Meilisearch Down

**Symptoms:** Search returns errors, hub search bar broken

**Steps:**
```bash
# Check Meilisearch health
curl http://localhost:7700/health

# Restart Meilisearch
docker compose restart meilisearch

# If index is corrupted, trigger full reindex
# (The search worker runs daily at 03:00 UTC, or trigger manually)
curl -X POST http://localhost:9000/api/pd/internal/reindex \
  -H "Authorization: Bearer <admin-token>"
```

### 3.6 S3/MinIO Storage Issues

**Symptoms:** Image uploads fail, presigned URLs return 403, product images broken

**Steps:**
```bash
# Check MinIO health
curl http://localhost:9100/minio/health/live

# Check MinIO console
# Open http://localhost:9101 (minioadmin/minioadmin)

# Restart MinIO
docker compose restart minio

# Verify buckets exist
docker compose exec minio mc ls local/
```

### 3.7 SSL Certificate Issues

**Symptoms:** HTTPS errors, browser security warnings

**Steps:**
```bash
# Check Caddy logs
docker compose logs caddy

# Force certificate renewal
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Check if /api/pd/internal/tls-allowed is responding
curl http://localhost:9000/api/pd/internal/tls-allowed?domain=pandamarket.tn
```

### 3.8 BullMQ Workers Stalled

**Symptoms:** AI jobs stuck, emails not sending, payouts not processing

**Steps:**
```bash
# Check worker logs
docker compose logs backend | grep -i "worker\|bullmq\|queue"

# Check Redis for queue status
docker compose exec redis redis-cli KEYS "bull:*"

# Check stalled jobs
docker compose exec redis redis-cli LLEN "bull:pd-ai-queue:stalled"
docker compose exec redis redis-cli LLEN "bull:pd-email-queue:stalled"

# Restart workers (they're part of the backend process)
docker compose restart backend
```

---

## 4. Backup & Recovery

### 4.1 Restore from Backup

```bash
# List available backups
ls -la backups/postgres/

# Restore PostgreSQL
./scripts/restore.sh --db-only --file backups/postgres/pandamarket_20260503_020000.sql.gz

# Restore everything
./scripts/restore.sh --file backups/postgres/pandamarket_20260503_020000.sql.gz
```

### 4.2 Emergency Database Operations

```bash
# Connect to database
docker compose exec postgres psql -U pd_user -d pandamarket

# Suspend a problematic vendor
UPDATE pd_store SET status = 'suspended' WHERE id = 'store_id_here';

# Manually approve a stuck mandat
UPDATE pd_mandat_proof SET status = 'approved', reviewed_at = NOW() WHERE id = 'proof_id';

# Check recent orders
SELECT id, customer_id, total, payment_status, created_at
FROM pd_order ORDER BY created_at DESC LIMIT 20;
```

---

## 5. Monitoring Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Liveness check | `{ "status": "ok" }` |
| `GET /ready` | Readiness (all deps) | `{ "status": "ready", "checks": {...} }` |
| `GET /metrics` | Prometheus metrics | Text format metrics |
| `GET http://localhost:7700/health` | Meilisearch | `{ "status": "available" }` |
| `GET http://localhost:9100/minio/health/live` | MinIO | 200 OK |

---

## 6. Escalation

| Step | Action | Who |
|------|--------|-----|
| 1 | Check runbook, attempt fix | On-call engineer |
| 2 | If not resolved in 30 min (SEV-1) or 2h (SEV-2) | Escalate to tech lead |
| 3 | If data loss or financial impact | Escalate to CTO + notify affected vendors |
| 4 | Post-incident | Write post-mortem within 48h |

---

## 7. Post-Incident Template

```markdown
## Incident Report: [Title]

**Date:** YYYY-MM-DD
**Severity:** SEV-X
**Duration:** X hours Y minutes
**Impact:** [Who was affected and how]

### Timeline
- HH:MM — Incident detected via [monitoring/user report]
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Incident resolved

### Root Cause
[What caused the incident]

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
```
