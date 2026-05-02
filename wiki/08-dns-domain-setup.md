# 08 — DNS & Domain Setup

## Domain Structure

PandaMarket uses the following domain architecture:

| Domain | Purpose |
|--------|---------|
| `pandamarket.tn` | Central Hub (customers browse) |
| `www.pandamarket.tn` | Redirects to hub |
| `admin.pandamarket.tn` | Admin panel |
| `api.pandamarket.tn` | Backend REST API |
| `search.pandamarket.tn` | Meilisearch (public) |
| `*.pandamarket.tn` | Vendor subdomains (e.g., `shoes.pandamarket.tn`) |
| `vendorcustom.com` | Vendor custom domain (on-demand TLS) |

## Step 1: Purchase Domain

Buy `pandamarket.tn` from a Tunisian registrar (ATI, or use Cloudflare/Namecheap for international TLDs).

## Step 2: Configure DNS Records

In your DNS provider, add these records pointing to your server IP:

```
Type    Name     Value              TTL
A       @        YOUR_SERVER_IP     300
A       www      YOUR_SERVER_IP     300
A       admin    YOUR_SERVER_IP     300
A       api      YOUR_SERVER_IP     300
A       search   YOUR_SERVER_IP     300
A       *        YOUR_SERVER_IP     300    ← Wildcard for vendor subdomains
```

## Step 3: Verify DNS

```bash
# Check main domain
dig pandamarket.tn +short
# Should show YOUR_SERVER_IP

# Check wildcard
dig test.pandamarket.tn +short
# Should also show YOUR_SERVER_IP
```

## Step 4: Caddy Handles SSL Automatically

Once DNS is pointing to your server, Caddy (already configured in step 9 of the deployment guide) will automatically request SSL certificates from Let's Encrypt. No manual certificate setup needed.

## Vendor Custom Domains

When a vendor wants to use their own domain (e.g., `myshop.com`):

1. The vendor adds a **CNAME** or **A record** in their DNS:
   ```
   Type    Name    Value
   A       @       YOUR_SERVER_IP
   CNAME   www     pandamarket.tn
   ```

2. The vendor enters their domain in the PandaMarket dashboard

3. Caddy's `on_demand` TLS block automatically provisions an SSL certificate

4. The `Caddyfile` `:443` catch-all block handles the request

## Local Development (Subdomain Testing)

To test subdomains locally on Windows:

1. Open Notepad **as Administrator**
2. Open file: `C:\Windows\System32\drivers\etc\hosts`
3. Add these lines at the bottom:

```
127.0.0.1   pandamarket.local
127.0.0.1   demo.pandamarket.local
127.0.0.1   shoes.pandamarket.local
127.0.0.1   admin.pandamarket.local
```

4. Save the file
5. Now visit `http://demo.pandamarket.local:3000` in your browser
