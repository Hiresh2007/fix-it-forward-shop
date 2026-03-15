# Fix-It Forward Shop

This is a small storefront project with a plain HTML/CSS/JS front end and a Node server behind it.

The UI lives in:

- [index.html](c:/Users/hires/Downloads/fix-it-forward-shop/index.html)
- [styles.css](c:/Users/hires/Downloads/fix-it-forward-shop/styles.css)
- [app.js](c:/Users/hires/Downloads/fix-it-forward-shop/app.js)

The backend lives in:

- [server.js](c:/Users/hires/Downloads/fix-it-forward-shop/server.js)
- [db.js](c:/Users/hires/Downloads/fix-it-forward-shop/db.js)

## What the server does

The server handles:

- product loading
- login and registration
- cookie-based sessions
- CSRF protection
- order creation
- stock updates after checkout
- request logging
- a small metrics endpoint

Data is stored in SQLite at:

- [store.db](c:/Users/hires/Downloads/fix-it-forward-shop/data/store.db)

The initial product seed file is:

- [products.json](c:/Users/hires/Downloads/fix-it-forward-shop/data/products.json)

## Start the project

From the project folder, run:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:3000
```

## Run tests

```bash
npm test
```

## Main routes

Pages and health:

- `GET /`
- `GET /health`
- `GET /metrics`

API:

- `GET /api/csrf`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/orders`
- `POST /api/orders`

## Notes

- The server uses built-in Node features only. There is no external database service or framework here.
- Product stock is enforced on the server, not just in the browser.
- Logs are written to [server.log](c:/Users/hires/Downloads/fix-it-forward-shop/logs/server.log).
- If the app is already running on port `3000`, restart it after backend changes so the latest routes are loaded.

## Website Demo

Link: https://drive.google.com/drive/folders/1FtTfW3WT7gsgFZvOr-TLStAy7I3d9TYc?usp=sharing
