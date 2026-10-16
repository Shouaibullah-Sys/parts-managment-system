# Runbook — Phase 4: backups, off-site copies, monitoring, remote admin

Goal: never lose data, know when something breaks, and reach the shop machine
for admin without opening ports.

- **Local dumps:** `scripts/backup-db.sh` → `backups/db-<stamp>.sql.gz`, newest 14 kept.
- **Off-site:** the same script uploads to Cloudflare R2 via `rclone` (newest 60 days kept).
- **Monitoring:** healthchecks.io heartbeats for the backup (also catches the machine being off) and the public site.
- **Admin:** Tailscale SSH (tailnet only, no public exposure).

```
          scripts/backup-db.sh
                 │  pg_dump ─► backups/…(14 kept)
                 │  rclone  ─► R2: diplomasi-backups/db/…(60d kept)
                 └─ ping ───► healthchecks.io  (daily)
scripts/uptime-check.sh ─ curl https://diplmasiltd.net ─► healthchecks.io (every 5m)
```

---

## 1. Cloudflare R2 bucket + token

1. Cloudflare dashboard → **R2** → **Create bucket** → name `diplomasi-backups`
   (region: automatic). R2 has a free tier; enable billing if prompted.
2. **R2 → Manage R2 API Tokens → Create API token**:
   - Permissions: **Object Read & Write**
   - Scope: bucket `diplomasi-backups`
   - Copy the **Access Key ID** and **Secret Access Key** (shown once).
3. Note your **Account ID** (R2 Overview page, right side).

## 2. Install + configure rclone

```bash
# macOS
brew install rclone
# Linux (Debian/Ubuntu)
curl https://rclone.org/install.sh | sudo bash
```

Add the remote (or paste `rclone-r2.conf` into `~/.config/rclone/rclone.conf`):

```bash
rclone config create r2diplomasi s3 provider=Cloudflare \
  access_key_id=<KEY> secret_access_key=<SECRET> \
  endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com acl=private
rclone lsd r2diplomasi:      # should list diplomasi-backups
```

## 3. Configure and test the backup

```bash
cp deploy/backups/backup.env.example ~/.diplomasi-backup.env
$EDITOR ~/.diplomasi-backup.env        # fill R2_* and healthchecks URLs
./scripts/backup-db.sh                 # run manually; watch for "Off-site copy OK."
rclone ls r2diplomasi:diplomasi-backups/db | tail
```

## 4. Healthchecks.io

Create a free account at https://healthchecks.io and two checks:

| Check          | Period | Grace | Pinged by             |
|----------------|--------|-------|-----------------------|
| Daily backup   | 1 day  | 1 h   | `scripts/backup-db.sh`|
| Public uptime  | 5 min  | 5 min | `scripts/uptime-check.sh` |

Copy each check's **Ping URL** into `~/.diplomasi-backup.env`
(`HEALTHCHECK_URL`, `UPTIME_HEALTHCHECK_URL`). Add an alert channel
(Email / Telegram) under **Integrations**. Then run each script once and
confirm the checks go green.

> The backup check doubles as a "machine is alive" alarm: if the shop Mac is
> off at 02:30, it won't ping and healthchecks.io will alert.

## 5. Schedule it

**macOS (shop Mac):**
```bash
cp deploy/backups/com.diplomasi.backup.plist ~/Library/LaunchAgents/
cp deploy/backups/com.diplomasi.uptime.plist  ~/Library/LaunchAgents/
# edit SHOPUSER / repo path in both, then:
launchctl load -w ~/Library/LaunchAgents/com.diplomasi.backup.plist
launchctl load -w ~/Library/LaunchAgents/com.diplomasi.uptime.plist
```

**Linux (dev/other host):**
```bash
sudo cp deploy/backups/diplomasi-{backup,uptime}.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now diplomasi-backup.timer diplomasi-uptime.timer
```

## 6. Restore drill (do this once, now)

```bash
# Restore into a scratch DB first, then into the real one only if needed.
RESTORE_DATABASE_URL=postgres://diplomasi:PASS@127.0.0.1:5438/diplomasi_test \
  ./scripts/restore-db.sh backups/db-<stamp>.sql.gz --yes
```
A backup you haven't restored is not a backup. Confirm row counts match.

## 7. Tailscale SSH (remote admin)

The app is read-only remotely; to actually administer the Mac, use Tailscale
(tailnet-only, no router changes):

```bash
# On the shop Mac and on your admin device:
brew install --cask tailscale        # or the App Store / Linux package
# sign in to the same tailnet on both, then on the Mac:
sudo tailscale up --ssh --hostname=diplomasi-shop
```
Then `ssh SHOPUSER@diplomasi-shop` from anywhere in your tailnet. Restrict who
can connect via the Tailscale ACLs. Tailscale Funnel is **not** used for the
website (it can't serve a custom domain) — the Cloudflare Tunnel handles that.

## 8. Verification checklist

- [ ] `./scripts/backup-db.sh` exits 0 and prints "Off-site copy OK."
- [ ] `rclone ls r2diplomasi:diplomasi-backups/db` shows today's dump.
- [ ] Backup + uptime checks are **green** on healthchecks.io.
- [ ] Restore drill into a scratch DB matches row counts (19 tables / 1,394 rows).
- [ ] Timers/LaunchAgents are loaded and will run at 02:30 / every 5 min.
- [ ] `ssh SHOPUSER@diplomasi-shop` works over Tailscale; SSH is not open publicly.
- [ ] Alert channel (email/Telegram) received a test notification.

## Notes

- Secrets live in `~/.diplomasi-backup.env` (not in the repo). `/deploy/` is git-ignored.
- Retention: local 14 archives; R2 60 days. Tune with `BACKUP_RETAIN` / `R2_RETAIN_DAYS`.
- The dump is plain SQL gzip — restore with `scripts/restore-db.sh`.
- `scripts/backup-db.sh` still works with **no** R2/healthchecks config (local-only).
