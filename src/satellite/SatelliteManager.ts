import { PositionCalculator } from './PositionCalculator.js';

/**
 * SatelliteManager - 위성 궤도 계산 및 위치 관리
 */
export class SatelliteManager {
  public tleData: string;
  public useTLE: boolean;
  private positionCalculator: PositionCalculator;

  constructor(defaultTLE?: string) {
    this.tleData = defaultTLE || '';
    this.useTLE = true;
    this.positionCalculator = new PositionCalculator();
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
   * TLE에서 위치 계산
   */
  calculatePosition(time: any): { longitude: number; latitude: number; altitude: number } | null {
    if (!this.useTLE || !this.tleData) {
      return null;
    }

    return this.positionCalculator.calculatePosition(this.tleData, time);
  }
}
