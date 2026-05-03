#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# PandaMarket — Initialize Docker Secrets for Production
# ─────────────────────────────────────────────────────────────────
# Usage:
#   chmod +x scripts/init-secrets.sh
#   ./scripts/init-secrets.sh
#
# This script creates the ./secrets/ directory with random values
# for all required secrets. Edit the generated files before deploying.
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

SECRETS_DIR="./secrets"

echo "🐼 PandaMarket — Secrets Initializer"
echo "======================================"

if [ -d "$SECRETS_DIR" ]; then
  echo "⚠️  Directory $SECRETS_DIR already exists."
  read -p "Overwrite existing secrets? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

mkdir -p "$SECRETS_DIR"

# Generate cryptographically secure random strings
gen_hex() { openssl rand -hex "$1"; }
gen_base64() { openssl rand -base64 "$1" | tr -d '\n'; }

echo ""
echo "Generating secrets..."

# JWT Secret (64 bytes hex = 128 chars)
gen_hex 64 > "$SECRETS_DIR/pd_jwt_secret.txt"
echo "  ✅ pd_jwt_secret.txt"

# Cookie Secret (32 bytes hex)
gen_hex 32 > "$SECRETS_DIR/pd_cookie_secret.txt"
echo "  ✅ pd_cookie_secret.txt"

# AES-256 Encryption Key (32 bytes = 64 hex chars)
gen_hex 32 > "$SECRETS_DIR/pd_encryption_key.txt"
echo "  ✅ pd_encryption_key.txt"

# Database Password (24 bytes base64)
gen_base64 24 > "$SECRETS_DIR/pd_db_password.txt"
echo "  ✅ pd_db_password.txt"

# Meilisearch Master Key (32 bytes hex)
gen_hex 32 > "$SECRETS_DIR/pd_meili_master_key.txt"
echo "  ✅ pd_meili_master_key.txt"

# MinIO credentials
echo "pandamarket_s3_admin" > "$SECRETS_DIR/pd_minio_root_user.txt"
gen_base64 32 > "$SECRETS_DIR/pd_minio_root_password.txt"
echo "  ✅ pd_minio_root_user.txt"
echo "  ✅ pd_minio_root_password.txt"

# Payment gateway placeholders (replace with real keys)
echo "REPLACE_WITH_FLOUCI_APP_TOKEN" > "$SECRETS_DIR/pd_flouci_app_token.txt"
echo "REPLACE_WITH_FLOUCI_APP_SECRET" > "$SECRETS_DIR/pd_flouci_app_secret.txt"
echo "REPLACE_WITH_KONNECT_API_KEY" > "$SECRETS_DIR/pd_konnect_api_key.txt"
echo "REPLACE_WITH_KONNECT_RECEIVER_WALLET" > "$SECRETS_DIR/pd_konnect_receiver_wallet.txt"
echo "  ⚠️  pd_flouci_*.txt — REPLACE with real Flouci credentials"
echo "  ⚠️  pd_konnect_*.txt — REPLACE with real Konnect credentials"

# Gemini API key placeholder
echo "REPLACE_WITH_GEMINI_API_KEY" > "$SECRETS_DIR/pd_gemini_api_key.txt"
echo "  ⚠️  pd_gemini_api_key.txt — REPLACE with real Gemini API key"

# Set restrictive permissions (owner read-only)
chmod 600 "$SECRETS_DIR"/*.txt
chmod 700 "$SECRETS_DIR"

echo ""
echo "======================================"
echo "✅ All secrets generated in $SECRETS_DIR/"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Replace placeholder values for Flouci, Konnect, and Gemini"
echo "  2. The secrets/ directory is in .gitignore — NEVER commit it"
echo "  3. Back up these files securely (encrypted USB, password manager)"
echo "  4. Run: docker compose -f docker-compose.prod.yml up -d"
echo ""
