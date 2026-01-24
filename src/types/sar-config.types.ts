/**
 * SAR 시스템 설정 타입 정의
 * backend/api/schemas/config.py의 SarSystemConfigRequest와 일치
 */
export interface SarSystemConfig {
  // 기본 주파수 파라미터
  fc: number;  // 반송파 주파수 (Hz)
  bw: number;  // 대역폭 (Hz)
  fs: number;  // 샘플링 주파수 (Hz)
  
  // 펄스 파라미터
  taup: number;  // 펄스 폭 (s)
  prf: number;  // 펄스 반복 주파수 (Hz)
  
  // 샘플링 윈도우 파라미터
  swst: number;  // 샘플링 윈도우 시작 시간 (s)
  swl: number;  // 샘플링 윈도우 길이 (s)
  
  // 위성 파라미터
  orbit_height: number;  // 궤도 높이 (m)
  
  // 안테나 파라미터
  antenna_width: number;  // 안테나 폭 (m)
  antenna_height: number;  // 안테나 높이 (m)
  antenna_roll_angle: number;  // 안테나 롤 각도 (deg)
  antenna_pitch_angle: number;  // 안테나 피치 각도 (deg)
  antenna_yaw_angle: number;  // 안테나 요 각도 (deg)
  
  // 전력 및 게인 파라미터
  Pt: number;  // 송신 전력 (W)
  G_recv: number;  // 수신 안테나 게인
  NF: number;  // 노이즈 지수 (dB)
  Loss: number;  // 시스템 손실 (dB)
  Tsys: number;  // 시스템 온도 (K)
  
  // ADC 파라미터
  adc_bits: number;  // ADC 비트 수
  
  // 빔 파라미터
  beam_id: string;  // 빔 ID
}

/**
 * 데이터베이스에 저장되는 SAR 시스템 설정 (메타데이터 포함)
 */
export interface SarSystemConfigRecord extends SarSystemConfig {
  id: string;  // 고유 ID
  name: string;  // 설정 이름 (사용자 지정)
  created_at: number;  // 생성 시간 (Unix timestamp)
  updated_at: number;  // 수정 시간 (Unix timestamp)
}

/**
 * SAR 시스템 설정 저장 요청
 */
export interface SaveSarSystemConfigRequest {
  name: string;
  config: SarSystemConfig;
}
