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
    defaultReflectivity = 1.0
  } = options;
  
  // 그리드 개수 계산
  const numRange = Math.max(1, Math.floor(swathGeometry.swathWidth / rangeResolution));
  const numAzimuth = Math.max(1, Math.floor(swathGeometry.azimuthLength / azimuthResolution));
  
  // 타겟 리스트 생성
  const targets: TargetRequest[] = [];
  
  // 중심 위치 (위도/경도)
  const centerLat = swathGeometry.centerLat;
  const centerLon = swathGeometry.centerLon;
  const height = 0;  // 기본 고도 (지표면)
  
  // 지구 반경 (WGS84)
  const earthRadius = 6378137.0;  // m
  
  // 그리드 간격 (미터 → 각도 변환)
  const rangeStepRad = rangeResolution / earthRadius;  // 라디안
  const azimuthStepRad = azimuthResolution / earthRadius;  // 라디안
  
  // Heading을 라디안으로 변환
  const headingRad = swathGeometry.heading * Math.PI / 180;
  
  // Cross-track 방향 (Range 방향, heading에서 90도 회전)
  const crossTrackAngle = headingRad + Math.PI / 2;
  
  // 그리드 생성
  for (let r = 0; r < numRange; r++) {
    for (let a = 0; a < numAzimuth; a++) {
      // 그리드 포인트 위치 (중심에서 오프셋, 미터 단위)
      const rangeOffset = (r - (numRange - 1) / 2) * rangeResolution;
      const azimuthOffset = (a - (numAzimuth - 1) / 2) * azimuthResolution;
      
      // 각도 오프셋으로 변환
      const rangeOffsetRad = rangeOffset / earthRadius;
      const azimuthOffsetRad = azimuthOffset / earthRadius;
      
      // 중심 위치를 라디안으로 변환
      const centerLatRad = centerLat * Math.PI / 180;
      const centerLonRad = centerLon * Math.PI / 180;
      
      // Range 방향 (cross-track) 오프셋
      const rangeLatOffset = rangeOffsetRad * Math.cos(crossTrackAngle);
      const rangeLonOffset = rangeOffsetRad * Math.sin(crossTrackAngle) / Math.cos(centerLatRad);
      
      // Azimuth 방향 (along-track) 오프셋
      const azimuthLatOffset = azimuthOffsetRad * Math.cos(headingRad);
      const azimuthLonOffset = azimuthOffsetRad * Math.sin(headingRad) / Math.cos(centerLatRad);
      
      // 최종 위도/경도
      const targetLat = (centerLatRad + rangeLatOffset + azimuthLatOffset) * 180 / Math.PI;
      const targetLon = (centerLonRad + rangeLonOffset + azimuthLonOffset) * 180 / Math.PI;
      
      // ECEF 좌표로 변환
      const ecef = llhToEcef(targetLat, targetLon, height);
      
      // 타겟 추가
      targets.push({
        position: ecef,
        reflectivity: defaultReflectivity,
        phase: 0.0
      });
    }
  }
  
  return targets;
}
