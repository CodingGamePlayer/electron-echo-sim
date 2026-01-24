/**
 * Signal 관련 타입 정의
 */

/**
 * 복소수 배열 (실수부/허수부 분리)
 */
export interface Complex64Array {
  real: Float32Array;
  imag: Float32Array;
}

/**
 * 타겟 요청 (Echo Simulator API용)
 */
export interface TargetRequest {
  position: [number, number, number];  // ECEF 좌표 [x, y, z] (m)
  reflectivity: number;                 // 반사도 (RCS, m²)
  phase: number;                        // 위상 (deg)
}

/**
 * 위성 상태 (Echo Simulator API용)
 */
export interface SatelliteStateForEcho {
  position: [number, number, number];   // ECEF 좌표 [x, y, z] (m)
  velocity: [number, number, number];  // ECEF 속도 [vx, vy, vz] (m/s)
  beam_direction?: [number, number, number];  // 빔 방향 벡터 (정규화)
}

/**
 * Chirp 신호 생성 응답
 */
export interface ChirpSimulationResponse {
  success: boolean;
  message: string;
  shape: number[];
  dtype: string;
  data: string;  // Base64 인코딩된 데이터
  num_samples: number;
}

/**
 * Echo 시뮬레이션 응답
 */
export interface EchoSimulationResponse {
  success: boolean;
  message: string;
  shape: number[];
  dtype: string;
  data: string;  // Base64 인코딩된 데이터
  num_samples: number;
  max_amplitude: number;
  mean_amplitude: number;
}

/**
 * Signal 통계 정보
 */
export interface SignalStatistics {
  max: number;
  mean: number;
  min?: number;
  std?: number;
  nonZeroSamples?: number;
  totalSamples?: number;
}
