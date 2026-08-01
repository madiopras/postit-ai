import { randomBytes } from 'node:crypto';
import { copyFile, readFile, writeFile } from 'node:fs/promises';

const target = '.env';
const template = '.env.example';

try {
  await readFile(target, 'utf8');
  console.log('.env already exists; leaving it unchanged');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  await copyFile(template, target);
  let contents = await readFile(target, 'utf8');
  contents = contents.replace(/^JWT_SECRET=$/m, `JWT_SECRET=${randomBytes(32).toString('hex')}`);
  contents = contents.replace(
    /^CONFIG_ENCRYPTION_KEY=$/m,
    `CONFIG_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`
  );
  await writeFile(target, contents, { mode: 0o600 });
  console.log('Created .env with generated JWT and configuration-encryption secrets');
}
