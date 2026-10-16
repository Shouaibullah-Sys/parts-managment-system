# Runbook — publish the local server on `diplmasiltd.net` (Cloudflare Tunnel)

Goal: the shop machine runs the app + Postgres locally; `diplmasiltd.net` is a
**read-only** view reached through a free Cloudflare Tunnel. No Neon, no Vercel,
no port-forwarding.

```
browser ─► Cloudflare (DNS + TLS + Access) ─► cloudflared (outbound only)
                                                   └─► local app (localhost:3000) ─► local Postgres
```

---

## 0. Once, in the app

- `NEXT_PUBLIC_REMOTE_HOSTS=diplmasiltd.net,www.diplmasiltd.net` in `.env`
  (already set). Any host in this list is **read-only**; the LAN keeps write access.
- The app must be running and reachable at `http://localhost:3000` **on the host
  machine** (the tunnel talks to localhost, so the app and tunnel must be on the
  same machine).
- **Run the standalone server, not `next start`.** The build uses
  `output: "standalone"`, so `next start` prints a warning and is unsupported.
  Assemble and run:
  ```bash
  cp -r .next/static .next/standalone/.next/static
  cp -r public     .next/standalone/public
  PORT=3000 HOSTNAME=127.0.0.1 node .next/standalone/server.js
  ```
  (Verified end-to-end: the public tunnel returned 200 / 401 / read-only 403.)

## 1. Put the domain on Cloudflare

The domain is registered at Hostinger; today its nameservers are Vercel's
(`ns1/ns2.vercel-dns.com`). You must repoint them to Cloudflare.

1. Create a free account at https://dash.cloudflare.com → **Add a site** →
   enter `diplmasiltd.net` → choose the **Free** plan.
2. Cloudflare shows two nameservers, e.g. `xxx.ns.cloudflare.com` /
   `yyy.ns.cloudflare.com`.
3. At **Hostinger → Domains → diplmasiltd.net → DNS / Nameservers**, replace
   the existing nameservers with the two Cloudflare ones.
4. Wait for Cloudflare to show the site as **Active** (minutes to a few hours).
   Existing DNS records are imported automatically; verify the ones you need are
   present. You can keep the old Vercel records until you cut over.

> Keep the Vercel deployment running during the transition so the site never
> goes dark. Cut over only after the tunnel works (step 4).

## 2. Create the tunnel

On the machine that runs the app:

```bash
cd deploy/cloudflare
./setup-tunnel.sh          # logs in, creates the tunnel, writes config, creates DNS
```

Then start it:

```bash
cloudflared tunnel run diplomasi
```

Open `https://diplmasiltd.net` — you should get the login page, and after
signing in a red/amber **«حالت مشاهده»** (read-only) banner.

> DNS caveat: the tunnel needs the hostname to point at it. `setup-tunnel.sh`
> runs `cloudflared tunnel route dns`, which creates the CNAME automatically.
> If an old A/CNAME already exists at Cloudflare for the root, delete it first.

**Test on a subdomain first (recommended):** add to `config.yml`

```yaml
  - hostname: report.diplmasiltd.net
    service: http://localhost:3000
```

then `cloudflared tunnel route dns diplomasi report.diplmasiltd.net`. Verify on
`https://report.diplmasiltd.net` before touching the apex.

## 3. Protect it with Cloudflare Access (free, ≤50 users)

Even though it's read-only, keep strangers out.

1. Cloudflare dashboard → **Zero Trust → Access → Applications → Add an
   application → Self-hosted**.
2. Application domain: `diplmasiltd.net` (add `www` too, or use a wildcard).
3. Policy: **Allow** — Rule: **Emails** → add the owner's / staff emails, or
   **Emails ending in `@yourdomain`**. (Or set up a Google/OTP login.)
4. Save. Now reaching the site requires an Access login before the app login.

## 4. Run the app + tunnel at boot

- macOS: copy `com.diplomasi.cloudflared.plist` to
  `~/Library/LaunchAgents/` (edit `SHOPUSER` and the `cloudflared` path first),
  then `launchctl load -w ~/Library/LaunchAgents/com.diplomasi.cloudflared.plist`.
- Linux: `sudo cp cloudflared-tunnel.service /etc/systemd/system/` then
  `sudo systemctl enable --now cloudflared-tunnel`.
- Also ensure the app itself starts at boot (see the Mac setup steps).

## 5. Cut over and retire Vercel

Once `https://diplmasiltd.net` works through the tunnel:

1. In Vercel, remove `diplmasiltd.net` / `www` from the project's domains
   (or delete the project) so nothing competes for the hostname.
2. Confirm Cloudflare DNS for `diplmasiltd.net` + `www` is the tunnel CNAME
   (proxied/orange-cloud). No A record to Vercel should remain.
3. Hard-refresh the site; verify the read-only banner appears.

## 6. Verify checklist

- [ ] `https://diplmasiltd.net` loads and requires Access + app login.
- [ ] Signed in remotely: **read-only banner** shows; write menu items hidden.
- [ ] A write attempt from the public host returns **403** (read-only message).
- [ ] On the LAN (shop IP): full read/write, no banner.
- [ ] PDF download works over the tunnel.
- [ ] `cloudflared` and the app restart automatically after a reboot.
- [ ] Nightly DB backup runs (see `deploy/macbook/backup.sh` / `scripts/backup-db.sh`).

## 7. Rollback

- Point the Cloudflare DNS record back to Vercel (or re-add the domain in
  Vercel and change nameservers back to `ns1/ns2.vercel-dns.com`).
- The Neon URL is still in `.env` (commented) — the app can be pointed back at
  it by uncommenting and removing the local `DATABASE_URL`.

## Notes / gotchas

- The tunnel is **outbound-only** — no router ports need opening.
- `cloudflared` credentials (`~/.cloudflared/*.json`) are secrets; never commit
  them. `/deploy/` is git-ignored.
- On macOS Monterey, do **not** use Docker Desktop (current versions require
  macOS 14). Use native Postgres.app + Node 22.
