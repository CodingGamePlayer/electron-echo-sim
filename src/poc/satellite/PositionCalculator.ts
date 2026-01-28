import { TLEParser } from './TLEParser.js';

/**
 * 위성 위치 계산기
 */
export class PositionCalculator {
  private tleParser: TLEParser;

  constructor() {
    this.tleParser = new TLEParser();
  }

  /**
   * TLE에서 위치 계산
   */
  calculatePosition(
    tleData: string,
    time: any,
    headingOffset: number = 0
  ): { longitude: number; latitude: number; altitude: number } | null {
    if (!tleData) {
      return null;
    }

    try {
      const parsed = this.tleParser.parseTLE(tleData);
      if (!parsed) {
        return null;
      }

      const { line1, line2 } = parsed;
      
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
      // satellite.js의 eciToGeodetic는 고도를 킬로미터로 반환하므로 미터로 변환
      const altitude = geodeticCoords.height * 1000; // 킬로미터를 미터로 변환
      
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
