# Interval Snacks — integrated local demo

This version connects the existing React/Vite frontend to FastAPI and PostgreSQL.
It keeps the existing PostgreSQL schema and volume; it does not include or recreate database data.

## Requirements
- Docker Desktop running, with your existing `cinema` PostgreSQL container and `cinema-data` volume
- Python 3.10+ (use the same Python environment that already works for your backend)
- Node.js LTS

## 1. Start the existing database
In PowerShell:
```powershell
docker start cinema
docker ps
```
Do not run `docker rm`, `docker volume rm`, or `docker compose down -v`.

## 2. Start FastAPI
Open PowerShell in `backend`:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
If you already have your working `.venv`, activate it instead of creating another one. Defaults are for the current local learning setup (`localhost:5432`, database `db`, user `user`, password `pass`). For a different local configuration, set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in your shell before starting Uvicorn. Do not commit secrets.

Test:
- http://localhost:8000/
- http://localhost:8000/snacks
- http://localhost:8000/docs

The existing database should have `snacks`, `orders`, and `order_items` tables. This project does not run schema migrations automatically.

## 3. Start React
Open a second PowerShell window in `frontend`:
```powershell
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

Optional: copy `.env.example` to `.env` and set:
- `VITE_WHATSAPP_NUMBER` to the business WhatsApp number in international digits only
- `VITE_THEATER_NAME` to the theater name
- `VITE_API_URL` if the API is not at `http://localhost:8000`

Restart Vite after changing `.env`.

## Features
- Menu fetched from PostgreSQL via `GET /snacks`
- Checkout posts an order to `POST /orders`; backend calculates prices from database records
- Orders and items are persisted in PostgreSQL
- Staff counter fetches shared orders from `GET /orders` and updates status using `PATCH /orders/{id}/status`
- Staff/customer order views refresh about every five seconds
- WhatsApp opens a pre-filled message after the order is saved (it does not send automatically)

## Demo limitations / before public deployment
- No authentication/authorization is implemented. The staff counter is not protected; do not expose this demo publicly as-is.
- Customer order filtering uses browser localStorage to remember order IDs. This is for a single-browser demo, not secure customer identity.
- The API CORS allowlist is for localhost development only.
- WhatsApp integration opens a prefilled message. Automatic notifications require an official WhatsApp Business Platform/API integration.
- For a real deployment, use secrets management, HTTPS, authentication, database backups, and proper migrations.
- Keep the current `cinema-data` volume. Do not recreate the database or run a second PostgreSQL container against the same volume at the same time.
