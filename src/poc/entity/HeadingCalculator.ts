import { SatelliteManager } from '../satellite/SatelliteManager.js';

/**
 * Heading 계산기
 */
export class HeadingCalculator {
  private satelliteManager: SatelliteManager;
  private viewer: any;

  constructor(satelliteManager: SatelliteManager, viewer: any) {
    this.satelliteManager = satelliteManager;
    this.viewer = viewer;
  }

  /**
   * 현재 위치에서 Heading 계산
   */
  calculateHeading(currentCartesian: any, headingOffset: number = 0): number {
    let heading = 0;
    
    if (this.satelliteManager.useTLE) {
      const currentTime = this.viewer.clock.currentTime;
      const position1 = this.satelliteManager.calculatePosition(currentTime);
      const futureTime = Cesium.JulianDate.addSeconds(currentTime, 10, new Cesium.JulianDate());
      const position2 = this.satelliteManager.calculatePosition(futureTime);
      
      if (position1 && position2) {
        const dLon = (position2.longitude - position1.longitude) * Math.PI / 180;
        const lat1Rad = position1.latitude * Math.PI / 180;
        const lat2Rad = position2.latitude * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        heading = Cesium.Math.toDegrees(Math.atan2(y, x));
        if (heading < 0) heading += 360;
      }
    } else if (currentCartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(currentCartesian);
      heading = 0;
    }

    heading = (heading + headingOffset) % 360;
    if (heading < 0) heading += 360;

    return heading;
  }

  /**
   * 위성 위치 정보 가져오기
   */
  getSatellitePosition(currentCartesian: any, headingOffset: number = 0): { latitude: number; longitude: number; altitude: number; heading: number } | null {
    if (!currentCartesian) {
      return null;
    }

    const cartographic = Cesium.Cartographic.fromCartesian(currentCartesian);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const altitude = cartographic.height;
    const heading = this.calculateHeading(currentCartesian, headingOffset);

    return { latitude, longitude, altitude, heading };
  }
}
