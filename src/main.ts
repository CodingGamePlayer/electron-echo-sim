import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database/DatabaseManager.js';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let databaseManager: DatabaseManager | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // 상단 메뉴바 숨기기
    titleBarOverlay: {
      color: '#2a2a2a', // 어두운 배경색
      symbolColor: '#ffffff', // 아이콘 색상 (흰색)
      height: 30 // 타이틀바 높이
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Cesium CDN을 사용하기 위해 필요할 수 있습니다
    }
  });

  // index.html과 styles.css가 같은 dist 폴더에 있으므로 상대 경로 사용
  // loadFile은 HTML 파일의 디렉토리를 기준으로 상대 경로를 해석함
  const htmlPath = path.join(__dirname, 'index.html');
  console.log('[Main] Loading HTML from:', htmlPath);
  console.log('[Main] CSS should be at:', path.join(__dirname, 'styles.css'));
  mainWindow.loadFile(htmlPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 데이터베이스 초기화
  try {
    databaseManager = new DatabaseManager();
    databaseManager.initialize();
    console.log('[Main] 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('[Main] 데이터베이스 초기화 실패:', error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 데이터베이스 연결 종료
  if (databaseManager) {
    databaseManager.close();
    databaseManager = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 애플리케이션 종료 전 정리
app.on('before-quit', () => {
  if (databaseManager) {
    databaseManager.close();
    databaseManager = null;
  }
});
