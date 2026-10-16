# Diplomasi Ltd — Shop Mac setup (native, no Docker)
# راه‌اندازی مک فروشگاه دیپلوماسی (بدون داﮐﺮ)

Target: an Intel MacBook running **macOS 12 Monterey**. Postgres and Node run
natively; no Docker (current Docker Desktop needs macOS 14).

What runs on the shop Mac:
| Piece        | How                                   | Port |
|--------------|---------------------------------------|------|
| PostgreSQL   | Postgres.app (bundles PG 17)          | 5432 |
| Shop app     | Next.js standalone via launchd        | 3000 |
| Public site  | Cloudflare Tunnel (`deploy/cloudflare`)| —    |
| Backups      | launchd + rclone→R2 (`deploy/backups`) | —    |

---

## 1. Install Postgres.app
1. Download **Postgres.app 2.9.6** (Universal) from https://postgresapp.com/downloads.html
2. Drag it to **Applications**, open it, click **Initialize** to create the default server.
3. Start at login: **System Settings → General → Login Items → + → Postgres**.
4. Add its tools to your shell (they are also used by the scripts):
   ```bash
   echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
   ```

## 2. Install Node 22
- Download the macOS **Intel** installer from https://nodejs.org (LTS 22), or if
  you have Homebrew: `brew install node@22`.
- Verify: `node -v` → `v22.x`.

## 3. Get the app and build it
```bash
git clone https://github.com/Shouaibullah-Sys/parts-managment-system.git ~/parts-managment-system
cd ~/parts-managment-system
npm install --no-audit --no-fund
npm run build          # also assembles .next/standalone (postbuild)
```
> The repo is **private**. If `git clone` asks for credentials, use a GitHub
> **fine-grained personal access token** (read-only, this repo) as the password,
> or clone over SSH (`git@github.com:...`) with an added deploy key. The whole
> `deploy/` kit now ships in the repo; only `deploy/macbook/seed.sql.gz` is
> delivered separately (step 4).

## 4. Create the database and import the data
```bash
# create role + database (choose a strong password)
psql -d postgres -c "CREATE ROLE diplomasi LOGIN PASSWORD 'REPLACE_STRONG_PW';"
psql -d postgres -c "CREATE DATABASE diplomasi OWNER diplomasi;"
```

Then load the shop data — **one of**:

- **Seed file (delivered separately).** `deploy/macbook/seed.sql.gz` is **not in
  git** (it contains real user password hashes), so it is handed over out-of-band
  (USB / secure download). Put it at `deploy/macbook/seed.sql.gz`, then:
  ```bash
  gunzip -c deploy/macbook/seed.sql.gz | psql -U diplomasi -d diplomasi
  ```
- **Fresh dump from the current machine.** Copy the latest `diplomasi-*.sql.gz`
  backup over and restore it (it ships in `deploy/macbook/` too):
  ```bash
  scripts/restore-db.sh /path/to/diplomasi-YYYYMMDD.sql.gz
  ```
- **Empty database.** Run the migrations only (schema, no data):
  ```bash
  npm run db:migrate
  ```

## 5. Configure `.env` (next to the app)
```bash
cat > .env <<'EOF'
DATABASE_URL=postgresql://diplomasi:REPLACE_STRONG_PW@127.0.0.1:5432/diplomasi
NEXT_PUBLIC_REMOTE_HOSTS=diplmasiltd.net,www.diplmasiltd.net
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
EOF
```
Generate a secret: `openssl rand -hex 32`. **Never commit `.env`.**

## 6. Start at boot (launchd)
```bash
# edit SHOPUSER + repo path in the plist first
cp deploy/macbook/com.diplomasi.app.plist ~/Library/LaunchAgents/
launchctl load -w ~/Library/LaunchAgents/com.diplomasi.app.plist
# then open http://localhost:3000
```
Logs: `/tmp/diplomasi-app.out.log` / `.err.log`.

## 7. Publish it (Cloudflare Tunnel + Access)
Follow **`deploy/cloudflare/runbook.md`** (move NS to Cloudflare, run
`setup-tunnel.sh`, then add an Access policy). Load the tunnel at boot with
`deploy/cloudflare/com.diplomasi.cloudflared.plist`.

## 8. Backups + monitoring
Follow **`deploy/backups/runbook.md`** (R2 bucket + rclone + healthchecks.io).
Load the daily backup and 5-minute uptime agents from `deploy/backups/`.

## 9. Keep the Mac awake
On mains power, prevent sleep so the site stays up:
```bash
sudo pmset -a disablesleep 1
sudo pmset -a sleep 0 disksleep 0 womp 1
```
Turn the display off normally; the machine keeps serving.

## 10. Security (do before going public)
- Rotate `JWT_SECRET` (step 5) and the Postgres password (steps 4–5).
- Change the default admin login (`admin@diplomasi.com` / `Admin@123`).
- Enable the macOS firewall; keep the tunnel (outbound) rather than port-forward.
- Add Tailscale for remote admin (see `deploy/backups/runbook.md` §7); do **not**
  expose SSH to the internet.

## Daily use
- The app and tunnel start automatically at login — nothing to click.
- The public URL is **read-only** for everyone; LAN users get full access.
- Restart manually if ever needed: `./deploy/macbook/stop-app.sh` then `start-app.sh`.

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| Site down, LAN fine | Check tunnel: `launchctl list \| grep diplomasi`; re-run `cloudflared tunnel run diplomasi`. |
| App won't start | `tail /tmp/diplomasi-app.err.log`; confirm Postgres.app is running and `.env` is correct. |
| DB connection error | Postgres.app must be running; verify port 5432 and the role/password. |
| Forgot admin password | Restore a backup or reset the user row in `psql`. |

---

## راهنمای فارسی (خلاصه)
۱. **Postgres.app 2.9.6** را نصب و «Initialize» کنید (شروع خودکار در Login Items).
۲. **Node 22** (نسخه Intel) را نصب کنید.
۳. مخزن را بگیرید: `npm install` سپس `npm run build`.
۴. نقش/دیتابیس بسازید و داده را وارد کنید (فایل `seed.sql.gz` جداگانه تحویل داده می‌شود؛ یا از `scripts/restore-db.sh` استفاده کنید).
۵. فایل `.env` با `DATABASE_URL` و `JWT_SECRET` بسازید.
۶. با فایل `com.diplomasi.app.plist` برنامه را در استارت‌آپ اجرا کنید.
۷. اتصال به اینترنت با راهنمای `deploy/cloudflare` (حالت فقط‌خواندنی برای عموم).
۸. پشتیبان‌گیری و هشدارها طبق `deploy/backups`.
۹. با `sudo pmset -a disablesleep 1` از خواب رفتن مک جلوگیری کنید.
۱۰. رمز `JWT_SECRET`، رمز دیتابیس و رمز ادمین پیش‌فرض را عوض کنید.
