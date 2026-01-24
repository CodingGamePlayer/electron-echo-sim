import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database/DatabaseManager.js';
import { SarConfigService } from './database/SarConfigService.js';
import { SaveSarSystemConfigRequest } from './types/sar-config.types.js';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let databaseManager: DatabaseManager | null = null;
let sarConfigService: SarConfigService | null = null;

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
    sarConfigService = new SarConfigService(databaseManager);
    console.log('[Main] 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('[Main] 데이터베이스 초기화 실패:', error);
  }

  // IPC 핸들러 설정
  setupIpcHandlers();

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
  sarConfigService = null;
});

/**
 * IPC 핸들러 설정
 */
function setupIpcHandlers() {
  // SAR 시스템 설정 저장
  ipcMain.handle('sar-config:save', async (_event, request: SaveSarSystemConfigRequest) => {
    try {
      if (!sarConfigService) {
        throw new Error('SAR 설정 서비스가 초기화되지 않았습니다.');
      }
      const result = sarConfigService.saveConfig(request);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[Main] SAR 설정 저장 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // SAR 시스템 설정 업데이트
  ipcMain.handle('sar-config:update', async (_event, id: string, request: SaveSarSystemConfigRequest) => {
    try {
      if (!sarConfigService) {
        throw new Error('SAR 설정 서비스가 초기화되지 않았습니다.');
      }
      const result = sarConfigService.updateConfig(id, request);
      if (!result) {
        return { success: false, error: '설정을 찾을 수 없습니다.' };
      }
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[Main] SAR 설정 업데이트 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // SAR 시스템 설정 목록 조회
  ipcMain.handle('sar-config:getAll', async () => {
    try {
      if (!sarConfigService) {
        throw new Error('SAR 설정 서비스가 초기화되지 않았습니다.');
      }
      const result = sarConfigService.getAllConfigs();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[Main] SAR 설정 목록 조회 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // SAR 시스템 설정 조회 (ID)
  ipcMain.handle('sar-config:getById', async (_event, id: string) => {
    try {
      if (!sarConfigService) {
        throw new Error('SAR 설정 서비스가 초기화되지 않았습니다.');
      }
      const result = sarConfigService.getConfigById(id);
      if (!result) {
        return { success: false, error: '설정을 찾을 수 없습니다.' };
      }
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[Main] SAR 설정 조회 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // SAR 시스템 설정 삭제
  ipcMain.handle('sar-config:delete', async (_event, id: string) => {
    try {
      if (!sarConfigService) {
        throw new Error('SAR 설정 서비스가 초기화되지 않았습니다.');
      }
      const result = sarConfigService.deleteConfig(id);
      return { success: result };
    } catch (error: any) {
      console.error('[Main] SAR 설정 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  });
}
