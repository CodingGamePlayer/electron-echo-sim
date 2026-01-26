/**
 * Swath 영역을 타겟 그리드로 변환하는 유틸리티
 */

import { SARSwathGeometry } from '../types/sar-swath.types.js';
import { TargetRequest } from '../types/signal.types.js';

/**
 * Swath → 타겟 변환 옵션
 */
export interface SwathToTargetOptions {
  rangeResolution?: number;    // Range 방향 해상도 (m)
  azimuthResolution?: number;  // Azimuth 방향 해상도 (m)
  defaultReflectivity?: number; // 기본 반사도
  satellitePosition?: [number, number, number]; // 위성 ECEF 위치 (샘플링 윈도우 계산용)
  sarConfig?: any; // SAR 설정 (swst, swl, prf 등)
}

/**
 * 위도/경도/고도를 ECEF 좌표로 변환
 * WGS84 타원체 사용
 */
function llhToEcef(lat: number, lon: number, height: number): [number, number, number] {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  
  // WGS84 파라미터
  const a = 6378137.0;  // 장반경 (m)
  const e2 = 0.00669437999014;  // 제1 이심률 제곱
  
  // 곡률 반경
  const sinLat = Math.sin(latRad);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  
  // ECEF 좌표 계산
  const x = (N + height) * Math.cos(latRad) * Math.cos(lonRad);
  const y = (N + height) * Math.cos(latRad) * Math.sin(lonRad);
  const z = (N * (1 - e2) + height) * sinLat;
  
  return [x, y, z];
}

/**
 * Swath 영역을 타겟 그리드로 변환
 * 
 * @param swathGeometry Swath 기하 정보
 * @param options 변환 옵션
 * @returns 타겟 리스트
 */
export function convertSwathToTargets(
  swathGeometry: SARSwathGeometry,
  options: SwathToTargetOptions = {}
): TargetRequest[] {
  const {
    rangeResolution = 1000,      // 기본 1km 해상도
    azimuthResolution = 1000,
    defaultReflectivity = 1.0,
    satellitePosition,
    sarConfig
  } = options;
  
  const LIGHT_SPEED = 299792458.0; // m/s
  
  // 위성 위치와 SAR 설정이 있으면 샘플링 윈도우 내에 타겟 배치
  if (satellitePosition && sarConfig && sarConfig.swst && sarConfig.swl) {
    return convertSwathToTargetsInSamplingWindow(
      swathGeometry,
      satellitePosition,
      sarConfig,
      { rangeResolution, azimuthResolution, defaultReflectivity }
    );
  }
  
  // 기존 방식: Swath 중심 기준 그리드 생성
  const numRange = Math.max(1, Math.floor(swathGeometry.swathWidth / rangeResolution));
  const numAzimuth = Math.max(1, Math.floor(swathGeometry.azimuthLength / azimuthResolution));
  
  const targets: TargetRequest[] = [];
  const centerLat = swathGeometry.centerLat;
  const centerLon = swathGeometry.centerLon;
  const height = 0;
  const earthRadius = 6378137.0;
  const headingRad = swathGeometry.heading * Math.PI / 180;
  const crossTrackAngle = headingRad + Math.PI / 2;
  
  for (let r = 0; r < numRange; r++) {
    for (let a = 0; a < numAzimuth; a++) {
      const rangeOffset = (r - (numRange - 1) / 2) * rangeResolution;
      const azimuthOffset = (a - (numAzimuth - 1) / 2) * azimuthResolution;
      
      const rangeOffsetRad = rangeOffset / earthRadius;
      const azimuthOffsetRad = azimuthOffset / earthRadius;
      
      const centerLatRad = centerLat * Math.PI / 180;
      const centerLonRad = centerLon * Math.PI / 180;
      
      const rangeLatOffset = rangeOffsetRad * Math.cos(crossTrackAngle);
      const rangeLonOffset = rangeOffsetRad * Math.sin(crossTrackAngle) / Math.cos(centerLatRad);
      
      const azimuthLatOffset = azimuthOffsetRad * Math.cos(headingRad);
      const azimuthLonOffset = azimuthOffsetRad * Math.sin(headingRad) / Math.cos(centerLatRad);
      
      const targetLat = (centerLatRad + rangeLatOffset + azimuthLatOffset) * 180 / Math.PI;
      const targetLon = (centerLonRad + rangeLonOffset + azimuthLonOffset) * 180 / Math.PI;
      
      const ecef = llhToEcef(targetLat, targetLon, height);
      
      targets.push({
        position: ecef,
        reflectivity: defaultReflectivity,
        phase: 0.0
      });
    }
  }
  
  return targets;
}

/**
 * 샘플링 윈도우 내에 타겟을 배치하는 함수
 */
function convertSwathToTargetsInSamplingWindow(
  swathGeometry: SARSwathGeometry,
  satellitePosition: [number, number, number],
  sarConfig: any,
  options: { rangeResolution: number; azimuthResolution: number; defaultReflectivity: number }
): TargetRequest[] {
  const { rangeResolution, azimuthResolution, defaultReflectivity } = options;
  const LIGHT_SPEED = 299792458.0; // m/s
  
  // 위성 위치 벡터
  const satPos = satellitePosition;
  const satNorm = Math.sqrt(satPos[0] * satPos[0] + satPos[1] * satPos[1] + satPos[2] * satPos[2]);
  const satDir = [satPos[0] / satNorm, satPos[1] / satNorm, satPos[2] / satNorm];
  
  // 샘플링 윈도우 시간 범위
  const swst = sarConfig.swst; // 샘플링 윈도우 시작 시간 (s)
  const swl = sarConfig.swl;   // 샘플링 윈도우 길이 (s)
  const taup = sarConfig.taup || 0; // 펄스 폭
  
  // 타겟을 샘플링 윈도우 중간에 배치 (백엔드 테스트와 동일)
  const targetTd = swst + swl / 2.0; // 시간 지연 (s)
  const targetR = targetTd * LIGHT_SPEED / 2.0; // 거리 (m)
  
  // 그리드 개수 계산
  const numRange = Math.max(1, Math.floor(swathGeometry.swathWidth / rangeResolution));
  const numAzimuth = Math.max(1, Math.floor(swathGeometry.azimuthLength / azimuthResolution));
  
  const targets: TargetRequest[] = [];
  
  // 중심 타겟 위치 (위성에서 지구 중심 방향으로 targetR만큼 떨어진 위치)
  const centerTargetPos: [number, number, number] = [
    satPos[0] - satDir[0] * targetR,
    satPos[1] - satDir[1] * targetR,
    satPos[2] - satDir[2] * targetR
  ];
  
  // 중심 타겟을 LLH로 변환
  const centerLLH = ecefToLlh(centerTargetPos);
  
  // Heading을 라디안으로 변환
  const headingRad = swathGeometry.heading * Math.PI / 180;
  const crossTrackAngle = headingRad + Math.PI / 2;
  
  const earthRadius = 6378137.0;
  
  // 그리드 생성 (중심 타겟 주변)
  for (let r = 0; r < numRange; r++) {
    for (let a = 0; a < numAzimuth; a++) {
      const rangeOffset = (r - (numRange - 1) / 2) * rangeResolution;
      const azimuthOffset = (a - (numAzimuth - 1) / 2) * azimuthResolution;
      
      const rangeOffsetRad = rangeOffset / earthRadius;
      const azimuthOffsetRad = azimuthOffset / earthRadius;
      
      const centerLatRad = centerLLH[0] * Math.PI / 180;
      const centerLonRad = centerLLH[1] * Math.PI / 180;
      
      const rangeLatOffset = rangeOffsetRad * Math.cos(crossTrackAngle);
      const rangeLonOffset = rangeOffsetRad * Math.sin(crossTrackAngle) / Math.cos(centerLatRad);
      
      const azimuthLatOffset = azimuthOffsetRad * Math.cos(headingRad);
      const azimuthLonOffset = azimuthOffsetRad * Math.sin(headingRad) / Math.cos(centerLatRad);
      
      const targetLat = (centerLatRad + rangeLatOffset + azimuthLatOffset) * 180 / Math.PI;
      const targetLon = (centerLonRad + rangeLonOffset + azimuthLonOffset) * 180 / Math.PI;
      const targetHeight = centerLLH[2];
      
      const ecef = llhToEcef(targetLat, targetLon, targetHeight);
      
      targets.push({
        position: ecef,
        reflectivity: defaultReflectivity,
        phase: 0.0
      });
    }
  }
  
  return targets;
}

/**
 * ECEF 좌표를 LLH로 변환
 */
function ecefToLlh(ecef: [number, number, number]): [number, number, number] {
  const x = ecef[0];
  const y = ecef[1];
  const z = ecef[2];
  
  const a = 6378137.0;  // WGS84 장반경
  const e2 = 0.00669437999014;  // 제1 이심률 제곱
  
  const lon = Math.atan2(y, x);
  const p = Math.sqrt(x * x + y * y);
  
  // 위도 계산 (반복법)
  let lat = Math.atan2(z, p * (1.0 - e2));
  for (let i = 0; i < 6; i++) {
    const sinLat = Math.sin(lat);
    const N = a / Math.sqrt(1.0 - e2 * sinLat * sinLat);
    const h = p / Math.cos(lat) - N;
    lat = Math.atan2(z, p * (1.0 - e2 * (N / (N + h))));
  }
  
  // 최종 고도 계산
  const sinLat = Math.sin(lat);
  const N = a / Math.sqrt(1.0 - e2 * sinLat * sinLat);
  const h = p / Math.cos(lat) - N;
  
  return [
    lat * 180 / Math.PI,
    lon * 180 / Math.PI,
    h
  ];
}
