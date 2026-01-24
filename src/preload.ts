import { contextBridge } from 'electron';

// 필요시 API를 노출할 수 있습니다
contextBridge.exposeInMainWorld('electronAPI', {
  // 예시 API
});
