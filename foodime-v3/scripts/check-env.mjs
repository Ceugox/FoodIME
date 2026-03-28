import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^"(.*)"$/, '$1')];
      }),
  );
}

const requiredVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'GOOGLE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'EMAIL_FROM',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
];

const fileVars = parseEnvFile(envPath);
const mergedVars = { ...fileVars, ...process.env };

const missing = requiredVars.filter((key) => !mergedVars[key]);

if (missing.length > 0) {
  console.error('Missing required env vars for FoodIME V3:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log('FoodIME V3 env check passed.');
