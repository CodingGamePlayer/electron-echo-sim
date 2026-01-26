import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcCssFile = path.join(__dirname, '../src/styles.css');
const destCssFile = path.join(__dirname, '../dist/styles.css');
const srcHtmlFile = path.join(__dirname, '../index.html');
const destHtmlFile = path.join(__dirname, '../dist/index.html');

// Cesium 파일 경로
const cesiumSourceDir = path.join(__dirname, '../node_modules/cesium/Build/Cesium');
const cesiumDestDir = path.join(__dirname, '../dist/Cesium');

// Satellite.js 파일 경로
const satelliteJsSource = path.join(__dirname, '../node_modules/satellite.js/dist/satellite.min.js');
const satelliteJsDest = path.join(__dirname, '../dist/satellite.min.js');

/**
 * 디렉토리와 모든 하위 파일/폴더를 재귀적으로 복사
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    return; // 소스가 없으면 조용히 반환 (초기 빌드 시에는 없을 수 있음)
  }

  // 대상 디렉토리가 없으면 생성
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

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
    
    // Cesium 파일 복사 (초기 빌드 시에만)
    if (fs.existsSync(cesiumSourceDir)) {
      copyDirectory(cesiumSourceDir, cesiumDestDir);
    }
    
    // Satellite.js 파일 복사 (초기 빌드 시에만)
    if (fs.existsSync(satelliteJsSource)) {
      fs.copyFileSync(satelliteJsSource, satelliteJsDest);
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
