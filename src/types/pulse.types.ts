/**
 * Pulse 데이터 타입 정의
 */

import { SARSwathGeometry } from './sar-swath.types.js';
import { SatelliteStateForEcho } from './signal.types.js';

/**
 * Pulse 데이터
 */
export interface PulseData {
  pulseId: string;              // 고유 ID
  timestamp: number;            // Unix timestamp (ms)
  swathId: string;             // 연결된 Swath ID
  satelliteState: SatelliteStateForEcho;  // 위성 상태
  geometry: SARSwathGeometry;   // Swath 기하 정보
}

/**
 * Pulse 배치
 */
export interface PulseBatch {
  pulses: PulseData[];
  targets: any[];              // TargetRequest[] (공통 타겟 리스트)
  sarConfig: any;              // SarSystemConfigRequest
}
