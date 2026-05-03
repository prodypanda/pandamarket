# PandaMarket — Secrets Management Guide

> **Version:** 1.0 | **Date:** May 2026

---

## Overview

PandaMarket supports **file-based secrets** for production deployments. This eliminates
the need to pass sensitive values as plain environment variables, which can leak via
`/proc`, `docker inspect`, CI logs, or process listings.

### How It Works

For any environment variable `PD_XYZ`, the backend config loader checks:

1. **`PD_XYZ_FILE`** — If this env var exists and points to a file, the file contents are read and used as the value.
2. **`PD_XYZ`** — Falls back to the plain environment variable.
3. **Fallback** — Uses the hardcoded default (dev only).

This is compatible with:
- **Docker Secrets** (Swarm mode) — mounted at `/run/secrets/`
- **Docker Compose secrets** (file-based) — mounted at `/run/secrets/`
- **Kubernetes Secrets** — mounted as volume files
- **Vault Agent** — injected as files via sidecar
- **Doppler** — can export to files via `doppler run`

---

## Quick Start (Docker Compose)

### 1. Generate Secrets

```bash
chmod +x scripts/init-secrets.sh
./scripts/init-secrets.sh
```

This creates `./secrets/` with random values for all required secrets.

### 2. Edit Payment & AI Keys

Replace placeholder values in:
- `secrets/pd_flouci_app_token.txt`
- `secrets/pd_flouci_app_secret.txt`
- `secrets/pd_konnect_api_key.txt`
- `secrets/pd_konnect_receiver_wallet.txt`
- `secrets/pd_gemini_api_key.txt`

### 3. Deploy

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Secret Files Reference

| File | Maps To | Description |
|:---|:---|:---|
| `pd_jwt_secret.txt` | `PD_JWT_SECRET` | JWT signing key (128 hex chars) |
| `pd_cookie_secret.txt` | `PD_COOKIE_SECRET` | Cookie encryption key |
| `pd_encryption_key.txt` | `PD_ENCRYPTION_KEY` | AES-256-GCM key for vendor payment config (64 hex chars) |
| `pd_db_password.txt` | PostgreSQL password | Database user password |
| `pd_meili_master_key.txt` | `PD_MEILI_MASTER_KEY` | Meilisearch admin API key |
| `pd_minio_root_user.txt` | MinIO root user | S3-compatible storage username |
| `pd_minio_root_password.txt` | MinIO root password | S3-compatible storage password |
| `pd_flouci_app_token.txt` | `PD_FLOUCI_APP_TOKEN` | Flouci payment gateway app token |
| `pd_flouci_app_secret.txt` | `PD_FLOUCI_APP_SECRET` | Flouci payment gateway app secret |
| `pd_konnect_api_key.txt` | `PD_KONNECT_API_KEY` | Konnect payment gateway API key |
| `pd_konnect_receiver_wallet.txt` | `PD_KONNECT_RECEIVER_WALLET` | Konnect receiver wallet ID |
| `pd_gemini_api_key.txt` | `PD_GEMINI_API_KEY` | Google Gemini Pro API key |

---

## Security Best Practices

### File Permissions

```bash
chmod 700 ./secrets/
chmod 600 ./secrets/*.txt
```

### .gitignore

The `secrets/` directory is already in `.gitignore`. **Never commit secret files.**

### Rotation

To rotate a secret:

1. Generate a new value: `openssl rand -hex 64 > secrets/pd_jwt_secret.txt`
2. Restart the backend: `docker compose -f docker-compose.prod.yml restart backend`
3. For JWT secrets: all existing tokens are invalidated (users must re-login)
4. For encryption keys: **do NOT rotate** without re-encrypting all vendor payment configs

### Backup

- Store secret files in an encrypted backup (e.g., `gpg`, encrypted USB)
- Use a password manager (1Password, Bitwarden) for team access
- Never send secrets via email, Slack, or unencrypted channels

---

## Docker Swarm Mode

For Docker Swarm deployments, create secrets via CLI instead of files:

```bash
echo "your_jwt_secret" | docker secret create pd_jwt_secret -
echo "your_cookie_secret" | docker secret create pd_cookie_secret -
# ... repeat for all secrets
```

Then update `docker-compose.prod.yml` secrets section:

```yaml
secrets:
  pd_jwt_secret:
    external: true  # instead of file:
  pd_cookie_secret:
    external: true
```

---

## Kubernetes

Mount secrets as files in the pod spec:

```yaml
volumes:
  - name: pd-secrets
    secret:
      secretName: pandamarket-secrets
containers:
  - name: backend
    volumeMounts:
      - name: pd-secrets
        mountPath: /run/secrets
        readOnly: true
    env:
      - name: PD_JWT_SECRET_FILE
        value: /run/secrets/pd_jwt_secret
```

---

## Vault Integration

With HashiCorp Vault Agent sidecar:

```hcl
template {
  destination = "/run/secrets/pd_jwt_secret"
  contents    = "{{ with secret \"secret/data/pandamarket\" }}{{ .Data.data.jwt_secret }}{{ end }}"
}
```

The backend config loader will automatically read from the file path specified in `PD_JWT_SECRET_FILE`.
