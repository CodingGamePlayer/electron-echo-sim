import { PositionCalculator } from './PositionCalculator.js';

/**
 * 위성 생성 모드
 */
export enum SatelliteMode {
  TLE = 'tle',
  POSITION_VELOCITY = 'position_velocity'
}

/**
 * 위성 위치/속도 상태
 */
export interface SatellitePositionVelocity {
  position: { longitude: number; latitude: number; altitude: number };
  velocity: { vx: number; vy: number; vz: number };
  missionDirection?: {
    beamDirection: [number, number, number];
    heading: number;
    crossingPoint?: [number, number, number] | null;
  };
}

/**
 * SatelliteManager - 위성 궤도 계산 및 위치 관리
 */
export class SatelliteManager {
  public tleData: string;
  public useTLE: boolean;
  public satelliteMode: SatelliteMode;
  private positionCalculator: PositionCalculator;
  private positionVelocityState: SatellitePositionVelocity | null;

  constructor(defaultTLE?: string) {
    this.tleData = defaultTLE || '';
    this.useTLE = true;
    this.satelliteMode = SatelliteMode.TLE;
    this.positionCalculator = new PositionCalculator();
    this.positionVelocityState = null;
  }

  /**
   * TLE 데이터 설정
   */
  setTLE(tle: string): void {
    this.tleData = tle;
  }

  /**
   * TLE 사용 여부 설정
   */
  setUseTLE(use: boolean): void {
    this.useTLE = use;
  }

  /**
   * 위성 생성 모드 설정
   */
  setSatelliteMode(mode: SatelliteMode): void {
    this.satelliteMode = mode;
    if (mode === SatelliteMode.TLE) {
      this.useTLE = true;
    } else {
      this.useTLE = false;
    }
  }

  /**
   * 위치/속도 기반 위성 상태 설정
   */
  setPositionVelocityState(state: SatellitePositionVelocity): void {
    this.positionVelocityState = state;
    this.satelliteMode = SatelliteMode.POSITION_VELOCITY;
    this.useTLE = false;
  }

  /**
   * 위치/속도 기반 위성 상태 가져오기
   */
  getPositionVelocityState(): SatellitePositionVelocity | null {
    return this.positionVelocityState;
  }

  /**
   * TLE에서 위치 계산
   */
  calculatePosition(time: any): { longitude: number; latitude: number; altitude: number } | null {
    if (this.satelliteMode === SatelliteMode.POSITION_VELOCITY) {
      // 위치/속도 기반 모드: 현재 위치 반환 (시간에 따른 전파는 추후 구현)
      if (this.positionVelocityState) {
        return this.positionVelocityState.position;
      }
      return null;
    }

    if (!this.useTLE || !this.tleData) {
      return null;
    }

    return this.positionCalculator.calculatePosition(this.tleData, time);
  }

  /**
   * 현재 위성 속도 가져오기 (ECEF 좌표)
   */
  getVelocity(): { vx: number; vy: number; vz: number } | null {
    if (this.satelliteMode === SatelliteMode.POSITION_VELOCITY && this.positionVelocityState) {
      return this.positionVelocityState.velocity;
    }
    return null;
  }

  /**
   * 미션 방향 정보 가져오기
   */
  getMissionDirection(): {
    beamDirection: [number, number, number];
    heading: number;
    crossingPoint?: [number, number, number] | null;
  } | null {
    if (this.satelliteMode === SatelliteMode.POSITION_VELOCITY && this.positionVelocityState?.missionDirection) {
      return this.positionVelocityState.missionDirection;
    }
    return null;
  }
}
