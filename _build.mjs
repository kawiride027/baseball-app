import { build } from 'vite';
try {
  await build({ root: process.cwd() });
  console.log('BUILD SUCCESS');
} catch (e) {
  console.error('BUILD ERROR:', e.message);
  process.exit(1);
}
