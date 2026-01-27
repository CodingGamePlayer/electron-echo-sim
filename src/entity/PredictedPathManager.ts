import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';

/**
 * 예상 경로 관리
 */
export class PredictedPathManager {
  private viewer: any;
  private satelliteManager: SatelliteManager;
  private satelliteEntityManager: SatelliteEntityManager | null;
  private predictedPathEntity: any;

  constructor(viewer: any, satelliteManager: SatelliteManager, satelliteEntityManager?: SatelliteEntityManager) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.satelliteEntityManager = satelliteEntityManager || null;
    this.predictedPathEntity = null;
  }

  /**
   * 예상 경로 그리기 (과거 30분 + 미래 30분)
   */
  drawPredictedPath(hours: number = 4): void {
    // 위치/속도 기반 모드에서는 간단한 속도 기반 전파 사용
    if (!this.satelliteManager.useTLE && this.satelliteManager.satelliteMode !== 'position_velocity') {
      return;
    }

    if (this.predictedPathEntity) {
      this.viewer.entities.remove(this.predictedPathEntity);
    }

    const currentTime = this.viewer.clock.currentTime;
    const sampleInterval = 5;
    
    // 과거 1시간과 미래 1시간 (총 2시간)
    const pastMinutes = 60;
    const futureMinutes = 60;
    const pastSamples = Math.floor(pastMinutes / sampleInterval);
    const futureSamples = Math.floor(futureMinutes / sampleInterval);

    // 과거 위치들을 계산 (고정된 위치)
    const pastPositions: any[] = [];
    for (let i = pastSamples; i >= 1; i--) {
      const sampleTime = Cesium.JulianDate.addMinutes(
        currentTime,
        -i * sampleInterval,
        new Cesium.JulianDate()
      );
      
      let position = null;
      if (this.satelliteManager.useTLE) {
        position = this.satelliteManager.calculatePosition(sampleTime);
      } else if (this.satelliteManager.satelliteMode === 'position_velocity') {
        // 위치/속도 기반 모드: 속도 벡터를 사용하여 간단한 전파
        const state = this.satelliteManager.getPositionVelocityState();
        if (state && state.velocity) {
          const currentPos = this.satelliteManager.calculatePosition(currentTime);
          if (currentPos) {
            // 시간 차이 (초)
            const dt = -i * sampleInterval * 60; // 과거로 가므로 음수
            // 간단한 선형 전파 (ECEF 좌표계에서)
            const currentCartesian = Cesium.Cartesian3.fromDegrees(
              currentPos.longitude,
              currentPos.latitude,
              currentPos.altitude
            );
            const velocityCartesian = new Cesium.Cartesian3(
              state.velocity.vx,
              state.velocity.vy,
              state.velocity.vz
            );
            const propagatedCartesian = Cesium.Cartesian3.add(
              currentCartesian,
              Cesium.Cartesian3.multiplyByScalar(velocityCartesian, dt, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            );
            const cartographic = Cesium.Cartographic.fromCartesian(propagatedCartesian);
            position = {
              longitude: Cesium.Math.toDegrees(cartographic.longitude),
              latitude: Cesium.Math.toDegrees(cartographic.latitude),
              altitude: cartographic.height
            };
          }
        }
      }
      
      if (position) {
        const cartesian = Cesium.Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          position.altitude
        );
        pastPositions.push(cartesian);
      }
    }

    // 미래 위치들을 계산 (고정된 위치)
    const futurePositions: any[] = [];
    for (let i = 1; i <= futureSamples; i++) {
      const sampleTime = Cesium.JulianDate.addMinutes(
        currentTime,
        i * sampleInterval,
        new Cesium.JulianDate()
      );
      
      let position = null;
      if (this.satelliteManager.useTLE) {
        position = this.satelliteManager.calculatePosition(sampleTime);
      } else if (this.satelliteManager.satelliteMode === 'position_velocity') {
        // 위치/속도 기반 모드: 속도 벡터를 사용하여 간단한 전파
        const state = this.satelliteManager.getPositionVelocityState();
        if (state && state.velocity) {
          const currentPos = this.satelliteManager.calculatePosition(currentTime);
          if (currentPos) {
            // 시간 차이 (초)
            const dt = i * sampleInterval * 60; // 미래로 가므로 양수
            // 간단한 선형 전파 (ECEF 좌표계에서)
            const currentCartesian = Cesium.Cartesian3.fromDegrees(
              currentPos.longitude,
              currentPos.latitude,
              currentPos.altitude
            );
            const velocityCartesian = new Cesium.Cartesian3(
              state.velocity.vx,
              state.velocity.vy,
              state.velocity.vz
            );
            const propagatedCartesian = Cesium.Cartesian3.add(
              currentCartesian,
              Cesium.Cartesian3.multiplyByScalar(velocityCartesian, dt, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            );
            const cartographic = Cesium.Cartographic.fromCartesian(propagatedCartesian);
            position = {
              longitude: Cesium.Math.toDegrees(cartographic.longitude),
              latitude: Cesium.Math.toDegrees(cartographic.latitude),
              altitude: cartographic.height
            };
          }
        }
      }
      
      if (position) {
        const cartesian = Cesium.Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          position.altitude
        );
        futurePositions.push(cartesian);
      }
    }

    // 전체 positions 배열을 CallbackProperty로 만들어서 중간 점(현재 위치)이 항상 위성의 현재 위치를 반영하도록 함
    const positions = new Cesium.CallbackProperty(() => {
      const positionsArray: any[] = [];

      // 과거 위치들 추가
      positionsArray.push(...pastPositions);

      // 중간 점: 위성의 현재 실제 위치 (동적 업데이트)
      if (this.satelliteEntityManager) {
        const currentCartesian = this.satelliteEntityManager.getCurrentCartesian();
        if (currentCartesian && currentCartesian.x !== undefined && currentCartesian.y !== undefined && currentCartesian.z !== undefined) {
          if (!isNaN(currentCartesian.x) && !isNaN(currentCartesian.y) && !isNaN(currentCartesian.z)) {
            positionsArray.push(currentCartesian.clone());
          } else {
            // 유효하지 않은 경우 TLE로 계산
            const now = this.viewer.clock.currentTime;
            const currentPosition = this.satelliteManager.calculatePosition(now);
            if (currentPosition) {
              positionsArray.push(Cesium.Cartesian3.fromDegrees(
                currentPosition.longitude,
                currentPosition.latitude,
                currentPosition.altitude
              ));
            }
          }
        } else {
          // Cartesian가 없는 경우 TLE로 계산
          const now = this.viewer.clock.currentTime;
          const currentPosition = this.satelliteManager.calculatePosition(now);
          if (currentPosition) {
            positionsArray.push(Cesium.Cartesian3.fromDegrees(
              currentPosition.longitude,
              currentPosition.latitude,
              currentPosition.altitude
            ));
          }
        }
      } else {
        // SatelliteEntityManager가 없는 경우 TLE로 계산
        const now = this.viewer.clock.currentTime;
        const currentPosition = this.satelliteManager.calculatePosition(now);
        if (currentPosition) {
          positionsArray.push(Cesium.Cartesian3.fromDegrees(
            currentPosition.longitude,
            currentPosition.latitude,
            currentPosition.altitude
          ));
        }
      }

      // 미래 위치들 추가
      positionsArray.push(...futurePositions);

      return positionsArray;
    }, false);

    this.predictedPathEntity = this.viewer.entities.add({
      name: `궤적 (과거 1시간 + 미래 1시간)`,
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
