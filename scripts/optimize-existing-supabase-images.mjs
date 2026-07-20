import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const ENV_PATH = new URL('../.env.local', import.meta.url);
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff']);
const DEFAULT_BUCKETS = ['book-covers', 'images', 'avatars'];
const CACHE_CONTROL_SECONDS = '31536000';

function parseArgs(argv) {
  const args = {
    apply: false,
    yes: false,
    buckets: DEFAULT_BUCKETS,
    prefix: '',
    limit: Number.POSITIVE_INFINITY,
    force: false,
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg === '--yes') args.yes = true;
    else if (arg === '--force') args.force = true;
    else if (arg.startsWith('--bucket=')) args.buckets = arg.slice('--bucket='.length).split(',').filter(Boolean);
    else if (arg.startsWith('--prefix=')) args.prefix = arg.slice('--prefix='.length);
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length));
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = Number.POSITIVE_INFINITY;
  return args;
}

async function loadEnv() {
  const raw = await readFile(ENV_PATH, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!process.env[key]) {
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
}

function extensionOf(path) {
  const cleanPath = path.split('?')[0].toLowerCase();
  const index = cleanPath.lastIndexOf('.');
  return index >= 0 ? cleanPath.slice(index) : '';
}

function isSupportedImage(path) {
  return SUPPORTED_EXTENSIONS.has(extensionOf(path));
}

function targetFor(bucket, objectPath) {
  if (bucket === 'avatars') {
    return { maxBytes: 0.1 * 1024 * 1024, maxDimension: 500, quality: 75 };
  }

  if (bucket === 'book-covers') {
    return { maxBytes: 0.35 * 1024 * 1024, maxDimension: 1200, quality: 75 };
  }

  if (bucket === 'images') {
    if (objectPath.startsWith('categories/')) {
      return { maxBytes: 0.25 * 1024 * 1024, maxDimension: 900, quality: 75 };
    }
    if (objectPath.startsWith('events/')) {
      return { maxBytes: 0.6 * 1024 * 1024, maxDimension: 1600, quality: 75 };
    }
    if (objectPath.startsWith('panolar/')) {
      return { maxBytes: 0.35 * 1024 * 1024, maxDimension: 1200, quality: 75 };
    }
    return { maxBytes: 0.5 * 1024 * 1024, maxDimension: 1400, quality: 75 };
  }

  return { maxBytes: 0.35 * 1024 * 1024, maxDimension: 1200, quality: 75 };
}

function metadataSize(file) {
  const value = file?.metadata?.size;
  return Number.isFinite(value) ? value : null;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '?';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function listFiles(supabase, bucket, prefix = '') {
  const files = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        files.push({ bucket, path: objectPath, size: metadataSize(item) });
      } else {
        files.push(...await listFiles(supabase, bucket, objectPath));
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function optimizeBuffer(input, target) {
  const sourceMetadata = await sharp(input, { animated: false, failOnError: false }).metadata();
  if (!sourceMetadata.width && !sourceMetadata.height) {
    throw new Error('image dimensions unavailable');
  }

  let maxDimension = target.maxDimension;
  let quality = target.quality;
  let output = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    output = await sharp(input, { animated: false, failOnError: false })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (output.length <= target.maxBytes) break;

    if (quality > 52) {
      quality -= 8;
    } else {
      maxDimension = Math.max(500, Math.floor(maxDimension * 0.9));
    }
  }

  return output;
}

async function processFile(supabase, file, apply) {
  const target = targetFor(file.bucket, file.path);
  const { data, error } = await supabase.storage.from(file.bucket).download(file.path);
  if (error) throw new Error(error.message);

  const input = Buffer.from(await data.arrayBuffer());
  const output = await optimizeBuffer(input, target);

  if (apply) {
    const { error: uploadError } = await supabase.storage.from(file.bucket).upload(file.path, output, {
      cacheControl: CACHE_CONTROL_SECONDS,
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);
  }

  return { before: input.length, after: output.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply && !args.yes) {
    throw new Error('Refusing to write without --yes. Use --apply --yes after checking the dry-run report.');
  }

  await loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const allFiles = [];
  for (const bucket of args.buckets) {
    allFiles.push(...await listFiles(supabase, bucket, args.prefix));
  }

  const candidates = allFiles
    .filter((file) => isSupportedImage(file.path))
    .filter((file) => {
      if (args.force) return true;
      const target = targetFor(file.bucket, file.path);
      return file.size == null || file.size > target.maxBytes;
    })
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, args.limit);

  const skipped = allFiles.length - candidates.length;

  console.log(`${args.apply ? 'APPLY' : 'DRY RUN'}: ${candidates.length} candidate(s), ${skipped} skipped.`);
  console.log(`Buckets: ${args.buckets.join(', ')}`);
  console.log('');

  if (!args.apply) {
    const totalBefore = candidates.reduce((sum, file) => sum + (file.size || 0), 0);
    const estimatedAfterCap = candidates.reduce((sum, file) => {
      const target = targetFor(file.bucket, file.path);
      return sum + Math.min(file.size || target.maxBytes, target.maxBytes);
    }, 0);

    console.log(`Known candidate size: ${formatBytes(totalBefore)}`);
    console.log(`Estimated upper target: ${formatBytes(estimatedAfterCap)}`);
    console.log('');
    for (const file of candidates.slice(0, 30)) {
      const target = targetFor(file.bucket, file.path);
      console.log(`${file.bucket}/${file.path} ${formatBytes(file.size)} -> <= ${formatBytes(target.maxBytes)}`);
    }
    if (candidates.length > 30) console.log(`...and ${candidates.length - 30} more`);
    return;
  }

  let beforeTotal = 0;
  let afterTotal = 0;
  let processed = 0;
  let failed = 0;

  for (const file of candidates) {
    try {
      const result = await processFile(supabase, file, true);
      processed += 1;
      beforeTotal += result.before;
      afterTotal += result.after;
      console.log(`ok ${file.bucket}/${file.path} ${formatBytes(result.before)} -> ${formatBytes(result.after)}`);
    } catch (error) {
      failed += 1;
      console.log(`fail ${file.bucket}/${file.path}: ${error.message}`);
    }
  }

  console.log('');
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Before: ${formatBytes(beforeTotal)}`);
  console.log(`After: ${formatBytes(afterTotal)}`);
  console.log(`Saved: ${formatBytes(beforeTotal - afterTotal)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
