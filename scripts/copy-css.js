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
    throw new Error(`소스 디렉토리가 존재하지 않습니다: ${src}`);
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

try {
  // CSS 파일 복사
  fs.copyFileSync(srcCssFile, destCssFile);
  console.log('✓ CSS 파일 복사 완료: src/styles.css -> dist/styles.css');
  
  // HTML 파일 복사
  fs.copyFileSync(srcHtmlFile, destHtmlFile);
  console.log('✓ HTML 파일 복사 완료: index.html -> dist/index.html');
  
  // Cesium 파일 복사
  if (fs.existsSync(cesiumSourceDir)) {
    copyDirectory(cesiumSourceDir, cesiumDestDir);
    console.log('✓ Cesium 파일 복사 완료: node_modules/cesium/Build/Cesium -> dist/Cesium');
  } else {
    console.warn('⚠ Cesium 소스 디렉토리를 찾을 수 없습니다. npm install을 실행했는지 확인하세요.');
  }
  
  // Satellite.js 파일 복사
  if (fs.existsSync(satelliteJsSource)) {
    fs.copyFileSync(satelliteJsSource, satelliteJsDest);
    console.log('✓ Satellite.js 파일 복사 완료: node_modules/satellite.js/dist/satellite.min.js -> dist/satellite.min.js');
  } else {
    console.warn('⚠ Satellite.js 소스 파일을 찾을 수 없습니다. npm install을 실행했는지 확인하세요.');
  }
} catch (error) {
  console.error('✗ 파일 복사 실패:', error.message);
  process.exit(1);
}
