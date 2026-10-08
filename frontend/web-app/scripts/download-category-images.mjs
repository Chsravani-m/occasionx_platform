#!/usr/bin/env node
// One-time (re-run whenever category photo ids change) script to pull
// the curated Unsplash photos used by src/utils/categoryImages.ts down
// into public/images/categories/, so the app serves them from its own
// storage in production instead of hotlinking images.unsplash.com on
// every page load.
//
// Run from frontend/web-app:
//   node scripts/download-category-images.mjs
//
// Requires internet access on the machine running it (this sandbox
// that builds/edits the code doesn't have outbound internet, so this
// can't be run automatically here - run it locally or in CI/deploy).

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_FILE = path.join(__dirname, "../src/utils/categoryImages.ts");
const OUT_DIR = path.join(__dirname, "../public/images/categories");

function extractPhotoIds(source) {
  // Every photo id in categoryImages.ts is a quoted string shaped like
  // "1519741497674-611481863552" (Unsplash's photo-id format).
  const matches = source.match(/"(\d{10,}-[a-f0-9]+)"/g) || [];
  const ids = matches.map((m) => m.slice(1, -1));
  return [...new Set(ids)];
}

function buildUnsplashUrl(photoId) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&h=600&q=80`;
}

async function downloadOne(photoId) {
  const dest = path.join(OUT_DIR, `${photoId}.jpg`);

  if (existsSync(dest)) {
    console.log(`skip  (already have) ${photoId}`);
    return;
  }

  const url = buildUnsplashUrl(photoId);

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`FAIL  ${res.status} ${photoId} - ${url}`);
      return;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`saved (${(buf.length / 1024).toFixed(0)} KB) ${photoId}`);
  } catch (err) {
    console.error(`FAIL  ${photoId} - ${err.message}`);
  }
}

async function main() {
  const source = readFileSync(SRC_FILE, "utf8");
  const photoIds = extractPhotoIds(source);

  console.log(`Found ${photoIds.length} unique photo ids in categoryImages.ts`);

  mkdirSync(OUT_DIR, { recursive: true });

  // Small concurrency cap so we don't hammer Unsplash.
  const CONCURRENCY = 5;
  let i = 0;

  async function worker() {
    while (i < photoIds.length) {
      const photoId = photoIds[i++];
      await downloadOne(photoId);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log("\nDone. Now flip USE_LOCAL_CATEGORY_IMAGES in src/utils/categoryImages.ts to true (if not already) and redeploy.");
}

main();
