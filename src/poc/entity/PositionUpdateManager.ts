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
  private customAltitude: number | null;  // null이면 TLE 고도 사용, 값이 있으면 해당 고도 사용
  private onPreviewUpdate?: (params: any, options?: any) => void;
  private lastUpdateTime: any;  // 위치/속도 기반 모드에서 시간 차이 계산용

  constructor(
    viewer: any,
    satelliteManager: SatelliteManager,
    entityManager: SatelliteEntityManager
  ) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.postRenderHandler = null;
    this.customAltitude = null;
    this.lastUpdateTime = null;
  }

  /**
   * 커스텀 고도 설정
   * @param altitude 고도 (m), null이면 TLE로 계산된 고도 사용
   */
  setCustomAltitude(altitude: number | null): void {
    this.customAltitude = altitude;
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
    // 초기 시간 저장 (위치/속도 기반 모드에서 시간 차이 계산용)
    this.lastUpdateTime = null;
    
    this.postRenderHandler = () => {
      const entity = this.entityManager.getEntity();
      const position = this.entityManager.getPosition();
      const currentCartesian = this.entityManager.getCurrentCartesian();
      
      if (!entity || !position || !currentCartesian) return;
      
      entity.show = true;
      
      const currentTime = this.viewer.clock.currentTime;
      
      if (this.satelliteManager.useTLE) {
        // TLE 기반 모드
        const positionData = this.satelliteManager.calculatePosition(currentTime);
        
        if (positionData) {
          // 커스텀 고도가 설정되어 있으면 사용, 없으면 TLE로 계산된 고도 사용
          const finalAltitude = this.customAltitude !== null ? this.customAltitude : positionData.altitude;
          const newCartesian = Cesium.Cartesian3.fromDegrees(
            positionData.longitude,
            positionData.latitude,
            finalAltitude
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
      } else if (this.satelliteManager.satelliteMode === 'position_velocity') {
        // 위치/속도 기반 모드: 속도 벡터를 사용하여 시간에 따라 위치 업데이트
        const state = this.satelliteManager.getPositionVelocityState();
        const velocity = this.satelliteManager.getVelocity();
        
        if (state && velocity) {
          // 초기 시간 설정
          if (!this.lastUpdateTime) {
            this.lastUpdateTime = currentTime.clone();
            return;
          }
          
          // 시간 차이 계산 (초)
          // JulianDate를 Date로 변환하여 시간 차이 계산
          const currentDate = Cesium.JulianDate.toDate(currentTime);
          const lastDate = Cesium.JulianDate.toDate(this.lastUpdateTime);
          const deltaTimeSeconds = (currentDate.getTime() - lastDate.getTime()) / 1000;
          
          if (deltaTimeSeconds > 0) {
            // 속도 벡터 (ECEF 좌표계, m/s)
            const velocityVector = new Cesium.Cartesian3(velocity.vx, velocity.vy, velocity.vz);
            
            // 시간에 따른 위치 변화 계산
            const deltaPosition = Cesium.Cartesian3.multiplyByScalar(
              velocityVector,
              deltaTimeSeconds,
              new Cesium.Cartesian3()
            );
            
            // 새로운 위치 계산
            const newCartesian = Cesium.Cartesian3.add(
              currentCartesian,
              deltaPosition,
              new Cesium.Cartesian3()
            );
            
            // 위치 업데이트
            this.entityManager.setCurrentCartesian(newCartesian.clone());
            position.setValue(newCartesian);
            
            // 상태 업데이트 (위치만, 속도는 유지)
            const cartographic = Cesium.Cartographic.fromCartesian(newCartesian);
            state.position.longitude = Cesium.Math.toDegrees(cartographic.longitude);
            state.position.latitude = Cesium.Math.toDegrees(cartographic.latitude);
            state.position.altitude = cartographic.height;
            
            // 마지막 업데이트 시간 저장
            this.lastUpdateTime = currentTime.clone();
            
            if (this.onPreviewUpdate) {
              this.onPreviewUpdate({}, {});
            }
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
