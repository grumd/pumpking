# Switching off the Python backend

How to move prod from the legacy Python backend (piu-top) to the pumpking services and
delete Python. Run on the server as `piutop` (`ssh piutop@api.pumpking.top`).

Port 5000 stays because the piu-spy agents at the arcades have
`https://api.pumpking.top:5000` in their local config. nginx's `location /` on that port
only proxies to Python (`127.0.0.1:5001`); nothing else runs behind it. Once Python is
gone, it proxies to ingest (`127.0.0.1:3002`) instead.

## Before you start

PR #45 is merged and deployed: `pm2 ls` shows `pumpking-ingest` and `pumpking-bot`
online.

## Steps

1. **nginx**: in `/etc/nginx/sites-available/api.pumpking.top`, point `location /` at
   ingest and block ingest's internal routes, which only the API may call:

   ```
   location /internal/ {
       return 404;
   }

   location / {
       proxy_pass http://127.0.0.1:3002;
       # keep the existing proxy_set_header and timeout lines
   }
   ```

   Then `sudo nginx -t && sudo systemctl reload nginx`. Watch `pm2 logs pumpking-ingest`,
   new results and purgatory.

2. **Bot**: a token allows one bot at a time, so stop the Python one first:
   `pm2 delete rivals-bot`. Then put the bot env into `~/pumpking/shared/bot.env`
   (the keys are in `packages/bot/.env.example`, the values in
   `~/piu-top-git/run_rivals_bot_stage.sh`; the token is its `--tg-token`), and
   `pm2 reload pumpking-bot`. Check with `hi` and `/rivals` in Telegram.

3. **Stop the legacy apps**: `pm2 delete pumpking-python-backend owji-bot && pm2 save`.
   owji-bot gets its data from Python, so it goes too.

4. **Admins**: the two people still using the desktop admin tool move to the web admin.

5. **Code cleanup** (a PR):
   - drop the REST `result-added-effect` route, which only Python called;
   - remove `LEGACY_API_URL` from `~/pumpking/shared/api.env` (unused since PR #45);
   - remove the legacy Python mentions from `CLAUDE.md`.

6. **Delete `~/piu-top-git`** once everything has run fine for a while. Keep `~/uploads`:
   ingest writes the agents' uploads there, and the API serves screenshots from it. No
   cron job uses the piu-top checkout.

## Going back

Until step 6, Python can come back: point `location /` at `127.0.0.1:5001` again (and
remove the `/internal/` block), reload nginx, remove `TELEGRAM_BOT_TOKEN` from
`bot.env`, reload pumpking-bot, then start the legacy apps from `~/piu-top-git`
(`run_python_backend.sh`, `run_rivals_bot_stage.sh`, `run_owjibot.sh`) under pm2.

## What stops working

- **owji-bot**: disabled for now, agreed with the other admin on 2026-10-01. A group
  chat still checked location 15 with it most days. It calls Python's
  `/agent/:id/lastPlayers/`, which ingest doesn't serve; bringing it back means serving
  that route again, or a plugin in the TS bot (`plugins/locations/activity.ts` has the
  data).
- **Stream mode** (`/results/stream/submit` and `/validate`): not ported. It was last
  used on 2026-09-21.
- **Test mode** (`/results/test/submit`) and the dev-only `/test/*` routes: not needed.
