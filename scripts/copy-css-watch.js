import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcCssFile = path.join(__dirname, '../src/styles.css');
const destCssFile = path.join(__dirname, '../dist/styles.css');
const srcHtmlFile = path.join(__dirname, '../index.html');
const destHtmlFile = path.join(__dirname, '../dist/index.html');

function copyFiles() {
  try {
    // CSS 파일 복사
    if (fs.existsSync(srcCssFile)) {
      fs.copyFileSync(srcCssFile, destCssFile);
      console.log('✓ CSS 파일 복사 완료:', new Date().toLocaleTimeString());
    }
    
    // HTML 파일 복사
    if (fs.existsSync(srcHtmlFile)) {
      fs.copyFileSync(srcHtmlFile, destHtmlFile);
      console.log('✓ HTML 파일 복사 완료:', new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error('✗ 파일 복사 실패:', error.message);
  }
}

// 초기 복사
copyFiles();

// 파일 변경 감지
fs.watch(srcCssFile, { persistent: true }, (eventType) => {
  if (eventType === 'change') {
    copyFiles();
  }
});

fs.watch(srcHtmlFile, { persistent: true }, (eventType) => {
  if (eventType === 'change') {
    copyFiles();
  }
});

console.log('👀 CSS/HTML 파일 변경 감지 시작...');
