import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';

/**
 * 위치 업데이트 루프 관리
 */
export class PositionUpdateManager {
  private viewer: any;
  private satelliteManager: SatelliteManager;
  private entityManager: SatelliteEntityManager;
  private postRenderHandler: (() => void) | null;
  private altitudeOffset: number;
  private onPreviewUpdate?: (params: any, options?: any) => void;

  constructor(
    viewer: any,
    satelliteManager: SatelliteManager,
    entityManager: SatelliteEntityManager
  ) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.postRenderHandler = null;
    this.altitudeOffset = 0;
  }

  /**
   * 고도 오프셋 설정
   */
  setAltitudeOffset(offset: number): void {
    this.altitudeOffset = offset;
  }

  /**
   * 미리보기 업데이트 콜백 설정
   */
  setPreviewUpdateCallback(callback: (params: any, options?: any) => void): void {
    this.onPreviewUpdate = callback;
  }

  /**
   * 위치 업데이트 루프 시작
   */
  startUpdateLoop(): void {
    this.postRenderHandler = () => {
      const entity = this.entityManager.getEntity();
      const position = this.entityManager.getPosition();
      const currentCartesian = this.entityManager.getCurrentCartesian();
      
      if (!entity || !position || !currentCartesian) return;
      
      entity.show = true;
      
      if (this.satelliteManager.useTLE) {
        const currentTime = this.viewer.clock.currentTime;
        const positionData = this.satelliteManager.calculatePosition(currentTime);
        
        if (positionData) {
          const adjustedAltitude = positionData.altitude + this.altitudeOffset;
          const newCartesian = Cesium.Cartesian3.fromDegrees(
            positionData.longitude,
            positionData.latitude,
            adjustedAltitude
          );
          
          const distance = Cesium.Cartesian3.distance(currentCartesian, newCartesian);
          if (distance > 0.1) {
            const lerpFactor = Math.min(0.15, distance / 5000);
            const updatedCartesian = currentCartesian.clone();
            Cesium.Cartesian3.lerp(
              currentCartesian,
              newCartesian,
              lerpFactor,
              updatedCartesian
            );
            this.entityManager.setCurrentCartesian(updatedCartesian);
            position.setValue(updatedCartesian);
          } else {
            this.entityManager.setCurrentCartesian(newCartesian.clone());
            position.setValue(newCartesian);
          }

          if (this.onPreviewUpdate) {
            this.onPreviewUpdate({}, {});
          }
        }
      }
    };

    this.viewer.scene.postRender.addEventListener(this.postRenderHandler);
  }

  /**
   * 위치 업데이트 루프 중지
   */
  stopUpdateLoop(): void {
    if (this.postRenderHandler) {
      this.viewer.scene.postRender.removeEventListener(this.postRenderHandler);
      this.postRenderHandler = null;
    }
  }
}
