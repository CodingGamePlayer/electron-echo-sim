import { SatelliteManager } from '../satellite/SatelliteManager.js';

/**
 * 예상 경로 관리
 */
export class PredictedPathManager {
  private viewer: any;
  private satelliteManager: SatelliteManager;
  private predictedPathEntity: any;

  constructor(viewer: any, satelliteManager: SatelliteManager) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.predictedPathEntity = null;
  }

  /**
   * 예상 경로 그리기
   */
  drawPredictedPath(hours: number = 4): void {
    if (!this.satelliteManager.useTLE) {
      return;
    }

    if (this.predictedPathEntity) {
      this.viewer.entities.remove(this.predictedPathEntity);
    }

    const startTime = this.viewer.clock.currentTime;
    const sampleInterval = 5;
    const numSamples = Math.floor((hours * 60) / sampleInterval);
    const positions: any[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const sampleTime = Cesium.JulianDate.addMinutes(
        startTime,
        i * sampleInterval,
        new Cesium.JulianDate()
      );
      
      const position = this.satelliteManager.calculatePosition(sampleTime);
      if (position) {
        const cartesian = Cesium.Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          position.altitude
        );
        positions.push(cartesian);
      }
    }

    if (positions.length > 0) {
      this.predictedPathEntity = this.viewer.entities.add({
        name: `예상 경로 (${hours}시간)`,
        polyline: {
          positions: positions,
          width: 4,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.3,
            color: Cesium.Color.ORANGE.withAlpha(0.7),
          }),
          clampToGround: false,
          arcType: Cesium.ArcType.GEODESIC,
          show: true,
        },
      });
    }
  }

  /**
   * 예상 경로 업데이트
   */
  updatePredictedPath(hours: number = 4): void {
    this.drawPredictedPath(hours);
  }

  /**
   * 예상 경로 제거
   */
  removePredictedPath(): void {
    if (this.predictedPathEntity) {
      this.viewer.entities.remove(this.predictedPathEntity);
      this.predictedPathEntity = null;
    }
  }
}
