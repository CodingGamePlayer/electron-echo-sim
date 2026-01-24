import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcCssFile = path.join(__dirname, '../src/styles.css');
const destCssFile = path.join(__dirname, '../dist/styles.css');
const srcHtmlFile = path.join(__dirname, '../index.html');
const destHtmlFile = path.join(__dirname, '../dist/index.html');

try {
  // CSS 파일 복사
  fs.copyFileSync(srcCssFile, destCssFile);
  console.log('✓ CSS 파일 복사 완료: src/styles.css -> dist/styles.css');
  
  // HTML 파일 복사
  fs.copyFileSync(srcHtmlFile, destHtmlFile);
  console.log('✓ HTML 파일 복사 완료: index.html -> dist/index.html');
} catch (error) {
  console.error('✗ 파일 복사 실패:', error.message);
  process.exit(1);
}
