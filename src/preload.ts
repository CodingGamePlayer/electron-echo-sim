import { contextBridge, ipcRenderer } from 'electron';

// IPC 응답 타입
interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// SAR 설정 타입 (런타임용)
interface SarSystemConfig {
  fc: number;
  bw: number;
  fs: number;
  taup: number;
  prf: number;
  swst: number;
  swl: number;
  orbit_height: number;
  antenna_width: number;
  antenna_height: number;
  antenna_roll_angle: number;
  antenna_pitch_angle: number;
  antenna_yaw_angle: number;
  Pt: number;
  G_recv: number;
  NF: number;
  Loss: number;
  Tsys: number;
  adc_bits: number;
  beam_id: string;
}

interface SarSystemConfigRecord extends SarSystemConfig {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface SaveSarSystemConfigRequest {
  name: string;
  config: SarSystemConfig;
}

// SAR 설정 API
const sarConfigAPI = {
  save: async (request: SaveSarSystemConfigRequest): Promise<SarSystemConfigRecord> => {
    const response = await ipcRenderer.invoke('sar-config:save', request) as IpcResponse<SarSystemConfigRecord>;
    if (!response.success) {
      throw new Error(response.error || '설정 저장 실패');
    }
    return response.data!;
  },
  update: async (id: string, request: SaveSarSystemConfigRequest): Promise<SarSystemConfigRecord> => {
    const response = await ipcRenderer.invoke('sar-config:update', id, request) as IpcResponse<SarSystemConfigRecord>;
    if (!response.success) {
      throw new Error(response.error || '설정 업데이트 실패');
    }
    return response.data!;
  },
  getAll: async (): Promise<SarSystemConfigRecord[]> => {
    const response = await ipcRenderer.invoke('sar-config:getAll') as IpcResponse<SarSystemConfigRecord[]>;
    if (!response.success) {
      throw new Error(response.error || '설정 목록 조회 실패');
    }
    return response.data || [];
  },
  getById: async (id: string): Promise<SarSystemConfigRecord> => {
    const response = await ipcRenderer.invoke('sar-config:getById', id) as IpcResponse<SarSystemConfigRecord>;
    if (!response.success) {
      throw new Error(response.error || '설정 조회 실패');
    }
    return response.data!;
  },
  delete: async (id: string): Promise<boolean> => {
    const response = await ipcRenderer.invoke('sar-config:delete', id) as IpcResponse<boolean>;
    if (!response.success) {
      throw new Error(response.error || '설정 삭제 실패');
    }
    return response.success;
  }
};

// Electron API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  sarConfig: sarConfigAPI
});
