# Interval Snacks (front end)

Requires Node.js 18+ (20 recommended).

    cp .env.example .env     # then edit the values
    npm install
    npm run dev              # http://localhost:5173/?screen=2&seat=F12
    npm run build            # output in dist/

Settings live in `.env` (WhatsApp number, theater name). Restart `npm run dev` after changing it.
Variables must start with `VITE_`. They are baked into the build, so never put secrets here;
the WhatsApp API token belongs in the backend's own environment, not the front end.
The menu items are in `src/config.js`.
