import { Pool } from "pg";
import {
  S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { pipeline } from "stream/promises";

const exec = promisify(execFile);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const bucket = process.env.S3_BUCKET || "streamflix";
const s3Options = { region: process.env.S3_REGION || "us-east-1" };
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

async function download(key, target) {
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await pipeline(out.Body, fs.createWriteStream(target));
}

async function uploadDir(dir, prefix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await uploadDir(p, `${prefix}/${e.name}`);
    else {
      const ext = path.extname(e.name).toLowerCase();
      const type = ext === ".m3u8" ? "application/vnd.apple.mpegurl" :
                   ext === ".ts" ? "video/mp2t" : "application/octet-stream";
      await s3.send(new PutObjectCommand({
        Bucket: bucket, Key: `${prefix}/${e.name}`, Body: fs.createReadStream(p), ContentType: type
      }));
    }
  }
}

async function processMovie(movie) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "streamflix-"));
  try {
    const source = path.join(work, "source");
    const out = path.join(work, "hls");
    fs.mkdirSync(out);
    await download(movie.source_key, source);

    // Scale filters preserve aspect ratio. FFmpeg will create HLS playlists and segments.
    const variants = [
      { name: "1080p", height: 1080, bitrate: "5000k" },
      { name: "720p", height: 720, bitrate: "3000k" },
      { name: "480p", height: 480, bitrate: "1200k" }
    ];

    for (const v of variants) {
      const dir = path.join(out, v.name);
      fs.mkdirSync(dir);
      await exec("ffmpeg", [
        "-y","-i",source,
        "-vf",`scale=-2:${v.height}`,
        "-c:v","libx264","-preset","veryfast","-crf","23",
        "-c:a","aac","-b:a","128k",
        "-hls_time","6","-hls_playlist_type","vod",
        "-hls_segment_filename",path.join(dir,"segment_%05d.ts"),
        path.join(dir,"index.m3u8")
      ]);
    }

    const master = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5200000,RESOLUTION=1920x1080
1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3128000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1328000,RESOLUTION=854x480
480p/index.m3u8
`;
    fs.writeFileSync(path.join(out, "master.m3u8"), master);
    const prefix = `hls/${movie.id}`;
    await uploadDir(out, prefix);

    const r = await exec("ffprobe", [
      "-v","error","-show_entries","format=duration",
      "-of","default=noprint_wrappers=1:nokey=1", source
    ]);
    const duration = Math.floor(Number(r.stdout.trim()) || 0);

    await pool.query(
      "UPDATE movies SET status='READY',hls_key=$1,duration_seconds=$2 WHERE id=$3",
      [`${prefix}/master.m3u8`, duration, movie.id]
    );
    console.log("Processed", movie.id, movie.title);
  } catch (e) {
    console.error("Processing failed", movie.id, e.message);
    await pool.query("UPDATE movies SET status='FAILED' WHERE id=$1", [movie.id]);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

async function loop() {
  while (true) {
    const r = await pool.query(
      "SELECT * FROM movies WHERE status='PROCESSING' ORDER BY created_at LIMIT 1"
    );
    if (r.rowCount) await processMovie(r.rows[0]);
    else await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
loop();
