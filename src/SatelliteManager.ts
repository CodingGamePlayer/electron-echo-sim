/**
 * SatelliteManager - 위성 궤도 계산 및 위치 관리
 */
export class SatelliteManager {
  public tleData: string;
  public useTLE: boolean;

  constructor(defaultTLE?: string) {
    this.tleData = defaultTLE || '';
    this.useTLE = true;
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

    try {
      // TLE 파싱
      const tleLines = this.tleData.trim().split('\n');
      let line1: string, line2: string;
      
      if (tleLines.length === 2) {
        line1 = tleLines[0];
        line2 = tleLines[1];
      } else if (tleLines.length === 3) {
        line1 = tleLines[1];
        line2 = tleLines[2];
      } else {
        throw new Error('TLE 형식이 올바르지 않습니다. 2줄 또는 3줄이 필요합니다.');
      }
      
      // Satellite.js를 사용하여 위치 계산
      const satrec = (window as any).satellite.twoline2satrec(line1, line2);
      
      // 시간을 JavaScript Date로 변환
      const date = Cesium.JulianDate.toDate(time);
      
      // SGP4로 위치 및 속도 계산 (TEME 좌표계)
      const positionAndVelocity = (window as any).satellite.propagate(satrec, date);
      
      if (positionAndVelocity.error) {
        console.error('TLE 계산 오류:', positionAndVelocity.error);
        return null;
      }
      
      const positionEci = positionAndVelocity.position;
      
      // ECI에서 지구 중심 좌표로 변환 (GMST 계산)
      const gmst = (window as any).satellite.gstime(date);
      
      // ECI를 지리 좌표(위도, 경도, 고도)로 직접 변환
      const geodeticCoords = (window as any).satellite.eciToGeodetic(positionEci, gmst);
      
      // 라디안을 도로 변환
      const longitude = (window as any).satellite.degreesLong(geodeticCoords.longitude);
      const latitude = (window as any).satellite.degreesLat(geodeticCoords.latitude);
      const altitude = geodeticCoords.height; // 미터 단위
      
      return {
        longitude: longitude,
        latitude: latitude,
        altitude: altitude
      };
    } catch (error) {
      console.error('TLE 계산 실패:', error);
      return null;
    }
  }
}
