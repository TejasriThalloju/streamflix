# StreamFlix thumbnail upload update

Replaces apps/api/src/server.js and apps/web/src/main.jsx.

Features:
- Upload video + JPG/PNG/WebP thumbnail from Admin
- Thumbnail stored at thumbnails/<movie-id>/poster.<ext>
- thumbnail_key stored in PostgreSQL
- Thumbnail endpoint: GET /api/movies/:id/thumbnail
- Home movie cards show thumbnails
- Admin library shows thumbnails

Run:
  docker compose up -d --build api web

Open:
  http://localhost:3000
