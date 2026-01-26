/**
 * Pulse 저장 관리자
 * 연속 모드에서 생성되는 각 pulse의 데이터를 저장하고 배치 관리
 */

import { PulseData } from '../types/pulse.types.js';
import { SARSwathGeometry } from '../types/sar-swath.types.js';
import { SatelliteStateForEcho } from '../types/signal.types.js';

export class PulseStorageManager {
  private pulses: PulseData[];
  private nextPulseId: number;

  constructor() {
    this.pulses = [];
    this.nextPulseId = 1;
  }

  /**
   * Pulse 데이터 추가
   */
  addPulse(
    swathId: string,
    geometry: SARSwathGeometry,
    satelliteState: SatelliteStateForEcho
  ): string {
    const pulseId = `pulse_${this.nextPulseId++}`;
    const pulse: PulseData = {
      pulseId,
      timestamp: Date.now(),
      swathId,
      satelliteState,
      geometry
    };
    this.pulses.push(pulse);
    return pulseId;
  }

  /**
   * 배치 크기만큼 Pulse 데이터 반환 (배치 내 Pulse만)
   */
  getPulseBatch(batchSize: number): PulseData[] {
    if (this.pulses.length < batchSize) {
      return [];
    }
    return this.pulses.slice(0, batchSize);
  }

  /**
   * 처리 완료된 배치의 Pulse 데이터 제거
   */
  clearBatch(batchSize: number): void {
    if (this.pulses.length >= batchSize) {
      this.pulses.splice(0, batchSize);
    }
  }

  /**
   * 배치 내 모든 Pulse의 Swath 영역을 합친 기하 정보 반환
   */
  getMergedSwathGeometry(batchSize: number): SARSwathGeometry | null {
    const batch = this.getPulseBatch(batchSize);
    if (batch.length === 0) {
      return null;
    }

    // 모든 Pulse의 nearRange 중 최소값
    const nearRange = Math.min(...batch.map(p => p.geometry.nearRange));
    
    // 모든 Pulse의 farRange 중 최대값
    const farRange = Math.max(...batch.map(p => p.geometry.farRange));
    
    // swathWidth 계산
    const swathWidth = farRange - nearRange;

    // 모든 Pulse의 중심점 평균
    const centerLat = batch.reduce((sum, p) => sum + p.geometry.centerLat, 0) / batch.length;
    const centerLon = batch.reduce((sum, p) => sum + p.geometry.centerLon, 0) / batch.length;

    // 첫 번째와 마지막 Pulse의 중심점 거리 계산
    const firstPulse = batch[0];
    const lastPulse = batch[batch.length - 1];
    
    // 위도/경도 차이를 거리로 변환 (간단한 근사)
    const earthRadius = 6378137.0; // m
    const latDiff = (lastPulse.geometry.centerLat - firstPulse.geometry.centerLat) * Math.PI / 180;
    const lonDiff = (lastPulse.geometry.centerLon - firstPulse.geometry.centerLon) * Math.PI / 180;
    const avgLat = (firstPulse.geometry.centerLat + lastPulse.geometry.centerLat) / 2 * Math.PI / 180;
    
    const distanceLat = latDiff * earthRadius;
    const distanceLon = lonDiff * earthRadius * Math.cos(avgLat);
    const distance = Math.sqrt(distanceLat * distanceLat + distanceLon * distanceLon);

    // 각 Pulse의 azimuthLength 평균
    const avgAzimuthLength = batch.reduce((sum, p) => sum + p.geometry.azimuthLength, 0) / batch.length;
    
    // azimuthLength = 첫 번째와 마지막 Pulse의 거리 + 평균 azimuthLength
    const azimuthLength = distance + avgAzimuthLength;

    // heading은 첫 번째 Pulse의 heading 사용
    const heading = firstPulse.geometry.heading;

    // satelliteAltitude는 첫 번째 Pulse의 값 사용
    const satelliteAltitude = firstPulse.geometry.satelliteAltitude;

    return {
      nearRange,
      farRange,
      swathWidth,
      azimuthLength,
      centerLat,
      centerLon,
      heading,
      satelliteAltitude,
      lookAngle: firstPulse.geometry.lookAngle
    };
  }

  /**
   * PRF와 배치 시간으로 배치 크기 계산
   */
  calculateBatchSize(prf: number, batchTime?: number): number {
    if (batchTime !== undefined) {
      return Math.floor(prf * batchTime);
    }
    return 0;
  }

  /**
   * PRF와 배치 크기로 배치 시간 계산
   */
  calculateBatchTime(prf: number, batchSize: number): number {
    if (prf === 0) {
      return 0;
    }
    return batchSize / prf;
  }

  /**
   * 저장된 Pulse 데이터 초기화
   */
  clearPulses(): void {
    this.pulses = [];
    this.nextPulseId = 1;
  }

  /**
   * 총 Pulse 개수 반환
   */
  getTotalPulseCount(): number {
    return this.pulses.length;
  }

  /**
   * 배치 조건 확인 (개수 모드)
   */
  isBatchReady(batchSize: number): boolean {
    return this.pulses.length >= batchSize;
  }

  /**
   * 배치 조건 확인 (시간 모드)
   */
  isBatchReadyByTime(prf: number, batchTime: number): boolean {
    if (this.pulses.length === 0) {
      return false;
    }
    const firstPulseTime = this.pulses[0].timestamp;
    const currentTime = Date.now();
    const elapsedTime = (currentTime - firstPulseTime) / 1000; // 초 단위
    return elapsedTime >= batchTime;
  }
}
