/**
 * Echo Simulator API 클라이언트
 */

import { EchoSimulationResponse, EchoMultipleResponse, TargetRequest, SatelliteStateForEcho } from '../types/signal.types.js';
import { SarSystemConfigRequest, convertSarConfigToRequest } from './chirp-api-client.js';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Echo 시뮬레이션 요청
 */
export interface EchoSimulationRequest {
  config: SarSystemConfigRequest;
  targets: TargetRequest[];
  satellite_state: SatelliteStateForEcho;
}

/**
 * 여러 펄스 Echo 시뮬레이션 요청
 */
export interface EchoMultipleSimulationRequest {
  config: SarSystemConfigRequest;
  targets: TargetRequest[];
  satellite_states: SatelliteStateForEcho[];
}

/**
 * Echo 신호 시뮬레이션
 * 
 * @param config SAR 시스템 설정
 * @param targets 타겟 리스트
 * @param satelliteState 위성 상태
 * @returns Echo 시뮬레이션 응답
 */
export async function simulateEcho(
  config: SarSystemConfigRequest,
  targets: TargetRequest[],
  satelliteState: SatelliteStateForEcho
): Promise<EchoSimulationResponse> {
  const request: EchoSimulationRequest = {
    config,
    targets,
    satellite_state: satelliteState
  };

  const response = await fetch(`${API_BASE_URL}/echo/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * 여러 펄스 Echo 신호 시뮬레이션
 * 
 * @param config SAR 시스템 설정
 * @param targets 타겟 리스트
 * @param satelliteStates 위성 상태 배열
 * @returns 여러 펄스 Echo 시뮬레이션 응답
 */
export async function simulateMultipleEchoes(
  config: SarSystemConfigRequest,
  targets: TargetRequest[],
  satelliteStates: SatelliteStateForEcho[]
): Promise<EchoMultipleResponse> {
  const request: EchoMultipleSimulationRequest = {
    config,
    targets,
    satellite_states: satelliteStates
  };

  const response = await fetch(`${API_BASE_URL}/echo/simulate-multiple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}
