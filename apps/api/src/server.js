import express from "express";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { createClient } from "redis";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

/* =========================
   CORS
========================= */

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* =========================
   PostgreSQL
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/* =========================
   Redis
   IMPORTANT:
   Do NOT await redis.connect()
   during application startup.
========================= */

const redis = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379"
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("ready", () => {
  console.log("Redis connected");
});

redis.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redis.connect()
  .catch((err) => {
    console.error("Redis connection failed:", err.message);
  });

/* =========================
   MinIO / S3
========================= */

const s3Options = {
  region: process.env.S3_REGION || "us-east-1"
};

if (process.env.S3_ENDPOINT) {
  s3Options.endpoint = process.env.S3_ENDPOINT;
  s3Options.forcePathStyle = true;
}

if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
  s3Options.credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  };
}

const s3 = new S3Client(s3Options);

const bucket = process.env.S3_BUCKET || "streamflix";

/* =========================
   Multer
========================= */

const upload = multer({
  dest: "/tmp/streamflix",
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024
  }
});

/* =========================
   JWT
========================= */

function sign(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h"
    }
  );
}

/* =========================
   Authentication
========================= */

function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    req.user = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET
    );

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      error: "Admin only"
    });
  }

  next();
}

/* =========================
   Redis helpers
========================= */

async function cacheJson(key, value, seconds = 30) {
  if (!redis.isReady) {
    return;
  }

  try {
    await redis.set(
      key,
      JSON.stringify(value),
      { EX: seconds }
    );
  } catch (err) {
    console.error("Redis set error:", err.message);
  }
}

async function getCache(key) {
  if (!redis.isReady) {
    return null;
  }

  try {
    const value = await redis.get(key);

    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("Redis get error:", err.message);
    return null;
  }
}

/* =========================
   Seed users
========================= */

async function seedUsers() {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM users"
  );

  if (result.rows[0].count > 0) {
    return;
  }

  console.log("Seeding demo users...");

  const adminHash = await bcrypt.hash(
    "Admin@123",
    10
  );

  const userHash = await bcrypt.hash(
    "User@123",
    10
  );

  await pool.query(
    `INSERT INTO users
      (email, password_hash, name, role)
     VALUES
      ($1, $2, $3, 'ADMIN'),
      ($4, $5, $6, 'USER')`,
    [
      "admin@streamflix.local",
      adminHash,
      "StreamFlix Admin",
      "user@streamflix.local",
      userHash,
      "Demo User"
    ]
  );

  const user = await pool.query(
    "SELECT id FROM users WHERE email=$1",
    ["user@streamflix.local"]
  );

  await pool.query(
    `INSERT INTO subscriptions
      (user_id, plan, status)
     VALUES
      ($1, 'FREE', 'ACTIVE')
     ON CONFLICT DO NOTHING`,
    [user.rows[0].id]
  );

  console.log("Demo users seeded");
}

/* =========================
   Health
========================= */

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    await s3.send(
      new HeadBucketCommand({
        Bucket: bucket
      })
    );

    res.json({
      status: "ok",
      services: [
        "postgres",
        "redis",
        "minio"
      ],
      redisReady: redis.isReady
    });

  } catch (err) {
    res.status(503).json({
      status: "degraded",
      error: err.message,
      redisReady: redis.isReady
    });
  }
});

/* =========================
   Register
========================= */

app.post("/api/auth/register", async (req, res) => {
  const {
    email,
    password,
    name
  } = req.body;

  if (
    !email ||
    !password ||
    !name ||
    password.length < 8
  ) {
    return res.status(400).json({
      error:
        "name, email and password (8+ chars) are required"
    });
  }

  try {
    const hash = await bcrypt.hash(
      password,
      10
    );

    const result = await pool.query(
      `INSERT INTO users
        (email, password_hash, name)
       VALUES
        ($1, $2, $3)
       RETURNING id, email, name, role`,
      [
        email.toLowerCase(),
        hash,
        name
      ]
    );

    await pool.query(
      `INSERT INTO subscriptions(user_id)
       VALUES($1)`,
      [result.rows[0].id]
    );

    res.status(201).json({
      token: sign(result.rows[0]),
      user: result.rows[0]
    });

  } catch (err) {
    console.error("Register error:", err.message);

    res.status(409).json({
      error: "Email already registered"
    });
  }
});

/* =========================
   Login
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [
        String(email || "").toLowerCase()
      ]
    );

    if (
      !result.rowCount ||
      !(await bcrypt.compare(
        password || "",
        result.rows[0].password_hash
      ))
    ) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const {
      id,
      email: userEmail,
      name,
      role
    } = result.rows[0];

    const user = {
      id,
      email: userEmail,
      name,
      role
    };

    res.json({
      token: sign(user),
      user
    });

  } catch (err) {
    console.error("Login error:", err.message);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

/* =========================
   Current user
========================= */

app.get(
  "/api/auth/me",
  auth,
  async (req, res) => {
    const result = await pool.query(
      `SELECT
        id,
        email,
        name,
        role,
        created_at
       FROM users
       WHERE id=$1`,
      [req.user.sub]
    );

    res.json(result.rows[0]);
  }
);

/* =========================
   Movies
========================= */

app.get("/api/movies", async (req, res) => {
  try {
    const q = String(
      req.query.q || ""
    ).trim();

    const genre = String(
      req.query.genre || ""
    ).trim();

    const key = `movies:${q}:${genre}`;

    const cached = await getCache(key);

    if (cached) {
      return res.json(cached);
    }

    const params = [];

    const where = [
      "published=true",
      "status='READY'"
    ];

    if (q) {
      params.push(`%${q}%`);

      where.push(
        `(title ILIKE $${params.length}
        OR description ILIKE $${params.length})`
      );
    }

    if (genre) {
      params.push(genre);

      where.push(
        `genre=$${params.length}`
      );
    }

    const result = await pool.query(
      `SELECT
        id,
        title,
        description,
        genre,
        year,
        duration_seconds,
        status,
        published,
        thumbnail_key,
        created_at
       FROM movies
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC`,
      params
    );

    await cacheJson(
      key,
      result.rows,
      20
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Movies error:", err.message);

    res.status(500).json({
      error: "Failed to load movies"
    });
  }
});

/* =========================
   Admin - all movies
========================= */

app.get(
  "/api/movies/all",
  auth,
  admin,
  async (_req, res) => {
    const result = await pool.query(
      "SELECT * FROM movies ORDER BY created_at DESC"
    );

    res.json(result.rows);
  }
);

/* =========================
   Movie details
========================= */

app.get(
  "/api/movies/:id",
  async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM movies WHERE id=$1",
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "Movie not found"
      });
    }

    res.json(result.rows[0]);
  }
);

/* =========================
   Admin - upload movie
========================= */

app.post(
  "/api/movies",
  auth,
  admin,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  async (req, res) => {
    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    try {
      if (!videoFile) {
        return res.status(400).json({ error: "Video file is required" });
      }
      if (!thumbnailFile) {
        return res.status(400).json({ error: "Thumbnail image is required" });
      }
      if (!thumbnailFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "Thumbnail must be an image" });
      }

      const { title, description = "", genre = "Drama", year = 2026 } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const id = crypto.randomUUID();
      const videoExt = path.extname(videoFile.originalname).toLowerCase() || ".mp4";
      const thumbnailExt = path.extname(thumbnailFile.originalname).toLowerCase() || ".jpg";
      const sourceKey = `raw/${id}/source${videoExt}`;
      const thumbnailKey = `thumbnails/${id}/poster${thumbnailExt}`;

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
        Body: fs.createReadStream(videoFile.path),
        ContentType: videoFile.mimetype
      }));

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: fs.createReadStream(thumbnailFile.path),
        ContentType: thumbnailFile.mimetype
      }));

      const result = await pool.query(
        `INSERT INTO movies
          (id, title, description, genre, year, status, published, source_key, thumbnail_key)
         VALUES ($1, $2, $3, $4, $5, 'PROCESSING', false, $6, $7)
         RETURNING *`,
        [id, title, description, genre, Number(year), sourceKey, thumbnailKey]
      );

      fs.unlink(videoFile.path, () => {});
      fs.unlink(thumbnailFile.path, () => {});

      if (redis.isReady) {
        try { await redis.del("movies::"); } catch {}
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Movie upload error:", err.message);
      if (videoFile?.path) fs.unlink(videoFile.path, () => {});
      if (thumbnailFile?.path) fs.unlink(thumbnailFile.path, () => {});
      res.status(500).json({ error: "Movie upload failed" });
    }
  }
);

/* =========================
   Movie thumbnail
========================= */

app.get("/api/movies/:id/thumbnail", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT thumbnail_key FROM movies WHERE id=$1",
      [req.params.id]
    );

    if (!result.rowCount || !result.rows[0].thumbnail_key) {
      return res.status(404).json({ error: "Thumbnail not found" });
    }

    const publicBase = process.env.MEDIA_PUBLIC_BASE_URL;
    if (publicBase) {
      return res.redirect(`${publicBase.replace(/\/$/, "")}/${result.rows[0].thumbnail_key}`);
    }

    const localBase = (process.env.S3_ENDPOINT || "http://localhost:9000")
      .replace("minio:9000", "localhost:9000");
    res.redirect(`${localBase}/${bucket}/${result.rows[0].thumbnail_key}`);
  } catch (err) {
    console.error("Thumbnail error:", err.message);
    res.status(500).json({ error: "Failed to load thumbnail" });
  }
});

/* =========================
   Admin - publish
========================= */

app.post(
  "/api/movies/:id/publish",
  auth,
  admin,
  async (req, res) => {

    const result = await pool.query(
      `UPDATE movies
       SET published=true
       WHERE id=$1
       AND status='READY'
       RETURNING *`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(400).json({
        error:
          "Movie must be READY before publishing"
      });
    }

    res.json(result.rows[0]);
  }
);

/* =========================
   Movie stream
========================= */

app.get(
  "/api/movies/:id/stream",
  async (req, res) => {

    const result = await pool.query(
      `SELECT
        hls_key,
        status,
        published
       FROM movies
       WHERE id=$1`,
      [req.params.id]
    );

    if (
      !result.rowCount ||
      result.rows[0].status !== "READY" ||
      !result.rows[0].published
    ) {
      return res.status(404).json({
        error: "Stream not ready"
      });
    }

    const publicBase = process.env.MEDIA_PUBLIC_BASE_URL;
    if (publicBase) {
      return res.json({
        url: `${publicBase.replace(/\/$/, "")}/${result.rows[0].hls_key}`
      });
    }

    const localBase = (process.env.S3_ENDPOINT || "http://localhost:9000")
      .replace("minio:9000", "localhost:9000");

    res.json({
      url: `${localBase}/${bucket}/${result.rows[0].hls_key}`
    });
  }
);

/* =========================
   Continue watching
========================= */

app.get(
  "/api/progress",
  auth,
  async (req, res) => {

    const result = await pool.query(
      `SELECT
        p.movie_id,
        p.position_seconds,
        p.updated_at,
        m.title,
        m.description,
        m.genre,
        m.year,
        m.thumbnail_key
       FROM watch_progress p
       JOIN movies m
         ON m.id=p.movie_id
       WHERE p.user_id=$1
       ORDER BY p.updated_at DESC`,
      [req.user.sub]
    );

    res.json(result.rows);
  }
);

app.put(
  "/api/progress/:movieId",
  auth,
  async (req, res) => {

    const position = Math.max(
      0,
      Math.floor(
        Number(
          req.body.positionSeconds || 0
        )
      )
    );

    const result = await pool.query(
      `INSERT INTO watch_progress
        (
          user_id,
          movie_id,
          position_seconds
        )
       VALUES
        ($1, $2, $3)
       ON CONFLICT(user_id,movie_id)
       DO UPDATE SET
        position_seconds=$3,
        updated_at=now()
       RETURNING *`,
      [
        req.user.sub,
        req.params.movieId,
        position
      ]
    );

    res.json(result.rows[0]);
  }
);

/* =========================
   Subscription
========================= */

app.get(
  "/api/subscription",
  auth,
  async (req, res) => {

    const result = await pool.query(
      `SELECT *
       FROM subscriptions
       WHERE user_id=$1`,
      [req.user.sub]
    );

    res.json(result.rows[0]);
  }
);

app.post(
  "/api/subscription",
  auth,
  async (req, res) => {

    const plan = [
      "FREE",
      "BASIC",
      "PREMIUM"
    ].includes(req.body.plan)
      ? req.body.plan
      : "PREMIUM";

    const result = await pool.query(
      `INSERT INTO subscriptions
        (user_id, plan, status)
       VALUES
        ($1, $2, 'ACTIVE')
       ON CONFLICT(user_id)
       DO UPDATE SET
        plan=$2,
        status='ACTIVE',
        started_at=now()
       RETURNING *`,
      [
        req.user.sub,
        plan
      ]
    );

    res.json(result.rows[0]);
  }
);

/* =========================
   START SERVER
========================= */

async function startServer() {
  try {
    await seedUsers();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `StreamFlix API listening on port ${PORT}`
        );
      }
    );

  } catch (err) {
    console.error(
      "API startup error:",
      err
    );

    process.exit(1);
  }
}

startServer();