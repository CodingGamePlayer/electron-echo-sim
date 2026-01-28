/**
 * 위성 상태를 Echo Simulator API 형식으로 변환하는 유틸리티
 */

import { EntityManager } from '../entity/EntityManager.js';
import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { SatelliteStateForEcho } from '../types/signal.types.js';

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
 * 위성 속도 계산 (TLE 기반 또는 기본값)
 */
function calculateSatelliteVelocity(
  satelliteManager: SatelliteManager,
  currentPosition: { latitude: number; longitude: number; altitude: number },
  viewer: any
): [number, number, number] {
  if (satelliteManager.useTLE && satelliteManager.tleData) {
    try {
      const currentTime = viewer.clock.currentTime;
      const futureTime = Cesium.JulianDate.addSeconds(currentTime, 1.0, new Cesium.JulianDate());
      
      const pos1 = satelliteManager.calculatePosition(currentTime);
      const pos2 = satelliteManager.calculatePosition(futureTime);
      
      if (pos1 && pos2) {
        // 위도/경도 차이를 거리로 변환
        const lat1Rad = pos1.latitude * Math.PI / 180;
        const lat2Rad = pos2.latitude * Math.PI / 180;
        const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
        const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
        
        // 평균 위도
        const avgLat = (lat1Rad + lat2Rad) / 2;
        
        // 거리 계산 (간단한 평면 근사)
        const earthRadius = 6378137.0;
        const dx = dLon * earthRadius * Math.cos(avgLat);
        const dy = dLat * earthRadius;
        const dz = (pos2.altitude - pos1.altitude);
        
        // 속도 (m/s)
        const dt = 1.0;  // 1초
        const vx = dx / dt;
        const vy = dy / dt;
        const vz = dz / dt;
        
        // ECEF 좌표계로 변환 (간단한 근사)
        // 실제로는 더 정확한 변환이 필요하지만, 작은 시간 간격에서는 근사치로 충분
        const lonRad = currentPosition.longitude * Math.PI / 180;
        const latRad = currentPosition.latitude * Math.PI / 180;
        
        // 로컬 좌표계에서 ECEF로 변환
        const vx_ecef = -vx * Math.sin(lonRad) - vy * Math.sin(latRad) * Math.cos(lonRad);
        const vy_ecef = vx * Math.cos(lonRad) - vy * Math.sin(latRad) * Math.sin(lonRad);
        const vz_ecef = vy * Math.cos(latRad);
        
        return [vx_ecef, vy_ecef, vz_ecef];
      }
    } catch (error) {
      console.warn('TLE 기반 속도 계산 실패, 기본값 사용:', error);
    }
  }
  
  // 기본값: 위성 궤도 속도 (약 7.66 km/s)
  // 위성 위치에서 지구 중심 방향으로 수직인 방향으로 속도 가정
  const ecef = llhToEcef(currentPosition.latitude, currentPosition.longitude, currentPosition.altitude);
  const norm = Math.sqrt(ecef[0] * ecef[0] + ecef[1] * ecef[1] + ecef[2] * ecef[2]);
  
  // 지구 중심에서 수직인 방향 (동쪽 방향 근사)
  const defaultSpeed = 7660;  // m/s
  const lonRad = currentPosition.longitude * Math.PI / 180;
  const latRad = currentPosition.latitude * Math.PI / 180;
  
  // 동쪽 방향 벡터 (ECEF)
  const vx = -defaultSpeed * Math.sin(lonRad);
  const vy = defaultSpeed * Math.cos(lonRad);
  const vz = 0;
  
  return [vx, vy, vz];
}

/**
 * 현재 위성 상태를 Echo Simulator API 형식으로 변환
 * 
 * @param entityManager EntityManager 인스턴스
 * @param satelliteManager SatelliteManager 인스턴스
 * @param viewer Cesium Viewer (속도 계산용)
 * @returns 위성 상태 또는 null
 */
export function getCurrentSatelliteStateForEcho(
  entityManager: EntityManager,
  satelliteManager: SatelliteManager,
  viewer: any
): SatelliteStateForEcho | null {
  // 현재 위성 위치 가져오기
  const position = entityManager.getCurrentSatellitePosition();
  if (!position) {
    return null;
  }
  
  // ECEF 좌표로 변환
  const ecefPosition = llhToEcef(position.latitude, position.longitude, position.altitude);
  
  // 위성 속도 계산
  const ecefVelocity = calculateSatelliteVelocity(satelliteManager, position, viewer);
  
  // 빔 방향 계산 (기본값: 지구 중심 방향, 즉 nadir)
  const norm = Math.sqrt(ecefPosition[0] * ecefPosition[0] + 
                         ecefPosition[1] * ecefPosition[1] + 
                         ecefPosition[2] * ecefPosition[2]);
  const beamDirection: [number, number, number] = [
    -ecefPosition[0] / norm,
    -ecefPosition[1] / norm,
    -ecefPosition[2] / norm
  ];
  
  return {
    position: ecefPosition,
    velocity: ecefVelocity,
    beam_direction: beamDirection
  };
}
