/**
 * Chirp 신호 생성 API 클라이언트
 */

import { ChirpSimulationResponse } from '../types/signal.types.js';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * SAR 시스템 설정 요청 형식 (API용)
 */
export interface SarSystemConfigRequest {
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
  el_angle?: number;
  az_angle?: number;
}

/**
 * SAR 설정을 API 요청 형식으로 변환
 */
export function convertSarConfigToRequest(config: any): SarSystemConfigRequest {
  return {
    fc: config.fc,
    bw: config.bw,
    fs: config.fs,
    taup: config.taup,
    prf: config.prf,
    swst: config.swst,
    swl: config.swl,
    orbit_height: config.orbit_height,
    antenna_width: config.antenna_width,
    antenna_height: config.antenna_height,
    antenna_roll_angle: config.antenna_roll_angle || 0.0,
    antenna_pitch_angle: config.antenna_pitch_angle || 0.0,
    antenna_yaw_angle: config.antenna_yaw_angle || 0.0,
    Pt: config.Pt,
    G_recv: config.G_recv,
    NF: config.NF,
    Loss: config.Loss,
    Tsys: config.Tsys,
    adc_bits: config.adc_bits,
    beam_id: config.beam_id || 'Beam0000',
    el_angle: config.el_angle,
    az_angle: config.az_angle
  };
}

/**
 * Chirp 신호 생성
 * 
 * @param config SAR 시스템 설정
 * @returns Chirp 신호 생성 응답
 */
export async function generateChirpSignal(
  config: SarSystemConfigRequest
): Promise<ChirpSimulationResponse> {
  const response = await fetch(`${API_BASE_URL}/chirp/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}
