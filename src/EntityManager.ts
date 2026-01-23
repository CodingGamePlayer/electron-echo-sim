import { SatelliteManager } from './SatelliteManager.js';
import { SARSwathCalculator } from './utils/sar-swath-calculator.js';
import { SARSwathGeometry } from './types/sar-swath.types.js';

/**
 * EntityManager - 엔티티 생성 및 관리
 */
export class EntityManager {
  private viewer: any;
  private satelliteManager: SatelliteManager;
  private entity: any;
  private position: any;
  private currentCartesian: any;
  private postRenderHandler: (() => void) | null;
  private predictedPathEntity: any;
  private swathPrimitives: any[];
  private swathEntities: any[];
  private showSwath: boolean;
  private swathGeometry: SARSwathGeometry | null;
  private lastSwathUpdateTime: number;

  constructor(viewer: any, satelliteManager: SatelliteManager) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.entity = null;
    this.position = null;
    this.currentCartesian = null;
    this.postRenderHandler = null;
    this.swathPrimitives = [];
    this.swathEntities = [];
    this.showSwath = false;
    this.swathGeometry = null;
    this.lastSwathUpdateTime = 0;
  }

  /**
   * 위성 엔티티 생성
   */
  createSatelliteEntity(name: string, initialPosition: { longitude: number; latitude: number; altitude: number }): any {
    const initialCartesian = Cesium.Cartesian3.fromDegrees(
      initialPosition.longitude,
      initialPosition.latitude,
      initialPosition.altitude
    );

    this.position = new Cesium.ConstantPositionProperty(initialCartesian);
    this.currentCartesian = initialCartesian.clone();

    this.entity = this.viewer.entities.add({
      name: name,
      position: this.position,
      orientation: new Cesium.VelocityOrientationProperty(this.position),
      show: true,
      point: {
        pixelSize: 15,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 2.0e7, 0.5),
        translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 2.0e7, 1.0),
      },
      label: {
        text: 'ISS',
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: true,
      },
      path: {
        resolution: 1,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.CYAN,
        }),
        width: 3,
        leadTime: 0,
        trailTime: 3600,
        show: true,
      },
    });

    return this.entity;
  }

  /**
   * 위치 업데이트 루프 시작
   */
  startUpdateLoop(): void {
    this.postRenderHandler = () => {
      if (!this.entity || !this.position || !this.currentCartesian) return;
      
      // 엔티티가 항상 보이도록 보장
      this.entity.show = true;
      
      // TLE 사용 중일 때만 위치 업데이트
      if (this.satelliteManager.useTLE) {
        const currentTime = this.viewer.clock.currentTime;
        const position = this.satelliteManager.calculatePosition(currentTime);
        
        if (position) {
          const newCartesian = Cesium.Cartesian3.fromDegrees(
            position.longitude,
            position.latitude,
            position.altitude
          );
          
          // 부드러운 이동을 위한 선형 보간
          const distance = Cesium.Cartesian3.distance(this.currentCartesian, newCartesian);
          if (distance > 0.1) {
            const lerpFactor = Math.min(0.15, distance / 5000);
            Cesium.Cartesian3.lerp(
              this.currentCartesian,
              newCartesian,
              lerpFactor,
              this.currentCartesian
            );
          } else {
            this.currentCartesian = newCartesian.clone();
          }
          
          // 위치 업데이트
          this.position.setValue(this.currentCartesian);

          // Swath가 활성화되어 있으면 업데이트 (1초마다)
          if (this.showSwath) {
            const now = Date.now();
            if (now - this.lastSwathUpdateTime > 1000) { // 1초마다 업데이트
              this.updateSwathFromSatellitePosition();
              this.lastSwathUpdateTime = now;
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

  /**
   * 엔티티 위치 즉시 업데이트
   */
  updatePosition(position: { longitude: number; latitude: number; altitude: number }): void {
    if (position && this.position) {
      const cartesian = Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        position.altitude
      );
      this.currentCartesian = cartesian.clone();
      this.position.setValue(cartesian);
    }
  }

  /**
   * 엔티티 반환
   */
  getEntity(): any {
    return this.entity;
  }

  /**
   * 예상 경로 그리기 (앞으로 지정된 시간 동안)
   */
  drawPredictedPath(hours: number = 4): void {
    if (!this.satelliteManager.useTLE) {
      return;
    }

    // 기존 예상 경로가 있으면 제거
    if (this.predictedPathEntity) {
      this.viewer.entities.remove(this.predictedPathEntity);
    }

    const startTime = this.viewer.clock.currentTime;
    const endTime = Cesium.JulianDate.addHours(startTime, hours, new Cesium.JulianDate());
    
    // 샘플 포인트 생성 (5분 간격)
    const sampleInterval = 5; // 분
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
      // 예상 경로 엔티티 생성
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

  /**
   * SAR Swath 시각화 설정
   * @param geometry SAR Swath 기하 파라미터
   * @param show 표시 여부
   */
  setSwathGeometry(geometry: SARSwathGeometry, show: boolean = true): void {
    this.swathGeometry = geometry;
    this.showSwath = show;
    
    if (show) {
      // 새로운 Swath 추가 (기존 것은 유지)
      this.updateSwathVisualization();
    } else {
      // 표시 중지 (기존 Swath는 유지, 더 이상 새로 생성하지 않음)
    }
  }

  /**
   * SAR Swath 표시/숨김 토글
   */
  toggleSwath(show?: boolean): void {
    if (show !== undefined) {
      this.showSwath = show;
    } else {
      this.showSwath = !this.showSwath;
    }

    if (this.showSwath) {
      // Swath가 활성화되면 위성 위치 기반으로 새로운 Swath 생성 (기존 것은 유지)
      if (this.currentCartesian && this.entity) {
        this.updateSwathFromSatellitePosition();
      } else {
        // 위성 위치가 아직 준비되지 않았으면 기본 위치로 생성
        const defaultGeometry: SARSwathGeometry = {
          centerLat: 0,
          centerLon: 0,
          heading: 0,
          nearRange: 200000,
          farRange: 800000,
          swathWidth: 50000,
          azimuthLength: 50000, // 더 크게
        };
        this.setSwathGeometry(defaultGeometry, true);
      }
    } else {
      // Swath 숨김 (기존 Swath는 유지하되, 더 이상 새로 생성하지 않음)
      // removeSwathVisualization()을 호출하지 않아서 기존 Swath는 유지됨
    }
  }

  /**
   * SAR Swath 시각화 업데이트 (새로운 Swath 추가, 기존 것은 유지)
   */
  private updateSwathVisualization(): void {
    if (!this.swathGeometry) {
      console.warn('Swath geometry가 없습니다.');
      return;
    }

    // 코너 계산
    const corners = SARSwathCalculator.calculateSwathCorners(this.swathGeometry);
    const positions = SARSwathCalculator.cornersToCartesian(corners);
    
    console.log('SAR Swath 생성:', {
      geometry: this.swathGeometry,
      corners: corners,
      positionsCount: positions.length,
      totalSwaths: this.swathEntities.length + 1
    });

    // Entity 방식 사용 (더 안정적이고 즉시 표시됨)
    const newSwathEntity = this.viewer.entities.add({
      name: `SAR Swath ${this.swathEntities.length + 1}`,
      polygon: {
        hierarchy: positions,
        material: Cesium.Color.CYAN.withAlpha(0.6),
        outline: true,
        outlineColor: Cesium.Color.YELLOW,
        outlineWidth: 3,
        classificationType: Cesium.ClassificationType.TERRAIN, // 지형에 드레이프
        height: 0,
        extrudedHeight: 0,
      },
    });
    this.swathEntities.push(newSwathEntity);
    
    console.log('Entity로 Swath 생성 성공 (총 ' + this.swathEntities.length + '개)', {
      positions: positions.map(p => {
        const carto = Cesium.Cartographic.fromCartesian(p);
        return {
          lon: Cesium.Math.toDegrees(carto.longitude),
          lat: Cesium.Math.toDegrees(carto.latitude)
        };
      })
    });
    
    // GroundPrimitive 방식도 시도 (지형에 더 정확하게 밀착)
    try {
      const newSwathPrimitive = new Cesium.GroundPrimitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(positions),
            perPositionHeight: false, // 지형에 밀착
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              Cesium.Color.CYAN.withAlpha(0.4)
            ),
          },
        }),
        appearance: new Cesium.PerInstanceColorAppearance({
          translucent: true,
          closed: true,
        }),
      });

      this.viewer.scene.primitives.add(newSwathPrimitive);
      this.swathPrimitives.push(newSwathPrimitive);
      
      // GroundPrimitive가 준비될 때까지 대기
      newSwathPrimitive.readyPromise.then(() => {
        console.log('GroundPrimitive 준비 완료 (총 ' + this.swathPrimitives.length + '개)');
      }).catch((error: any) => {
        console.warn('GroundPrimitive 준비 실패:', error);
      });
    } catch (error) {
      console.warn('GroundPrimitive 생성 실패, Entity만 사용:', error);
    }
  }

  /**
   * SAR Swath 시각화 제거 (모든 Swath 제거)
   */
  private removeSwathVisualization(): void {
    // 모든 Primitives 제거
    this.swathPrimitives.forEach(primitive => {
      try {
        this.viewer.scene.primitives.remove(primitive);
      } catch (error) {
        console.warn('Primitive 제거 실패:', error);
      }
    });
    this.swathPrimitives = [];

    // 모든 Entities 제거
    this.swathEntities.forEach(entity => {
      try {
        this.viewer.entities.remove(entity);
      } catch (error) {
        console.warn('Entity 제거 실패:', error);
      }
    });
    this.swathEntities = [];
  }

  /**
   * 모든 Swath 제거 (외부에서 호출 가능)
   */
  clearAllSwaths(): void {
    this.removeSwathVisualization();
  }

  /**
   * 위성 위치 기반 SAR Swath 자동 업데이트
   * 위성의 현재 위치와 속도 벡터를 기반으로 Swath 계산
   */
  updateSwathFromSatellitePosition(
    swathWidth: number = 50000,      // 50km
    nearRange: number = 200000,      // 200km
    farRange: number = 800000,       // 800km
    azimuthLength: number = 50000    // 50km (더 크게 표시)
  ): void {
    if (!this.currentCartesian || !this.entity) {
      console.warn('Swath 업데이트 실패: 위성 위치 또는 엔티티가 없습니다.');
      return;
    }

    // 현재 위치를 위도/경도로 변환
    const cartographic = Cesium.Cartographic.fromCartesian(this.currentCartesian);
    const centerLat = Cesium.Math.toDegrees(cartographic.latitude);
    const centerLon = Cesium.Math.toDegrees(cartographic.longitude);
    const satelliteAltitude = cartographic.height; // 위성 고도 (meters)

    // 속도 벡터로부터 heading 계산
    let heading = 0;
    
    // TLE 기반 속도 벡터 계산 (지표면 좌표 사용)
    if (this.satelliteManager.useTLE) {
      const currentTime = this.viewer.clock.currentTime;
      const position1 = this.satelliteManager.calculatePosition(currentTime);
      const futureTime = Cesium.JulianDate.addSeconds(currentTime, 10, new Cesium.JulianDate()); // 10초 후
      const position2 = this.satelliteManager.calculatePosition(futureTime);
      
      if (position1 && position2) {
        // 위도/경도 차이로부터 heading 계산 (지표면 기준)
        const dLon = (position2.longitude - position1.longitude) * Math.PI / 180;
        const lat1Rad = position1.latitude * Math.PI / 180;
        const lat2Rad = position2.latitude * Math.PI / 180;
        
        // 대권 항법 공식 사용
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        const headingRad = Math.atan2(y, x);
        heading = Cesium.Math.toDegrees(headingRad);
        
        // 0-360도 범위로 정규화
        if (heading < 0) heading += 360;
      }
    } else if (this.entity.orientation && this.entity.orientation.getValue) {
      // Orientation 기반 heading 계산 (대안)
      const orientation = this.entity.orientation.getValue(Cesium.JulianDate.now());
      if (orientation) {
        const matrix = Cesium.Matrix3.fromQuaternion(orientation);
        const forward = Cesium.Matrix3.getColumn(matrix, 0, new Cesium.Cartesian3());
        
        // 지표면에 투영
        const up = Cesium.Cartographic.fromCartesian(this.currentCartesian);
        const upVector = Cesium.Cartesian3.fromRadians(up.longitude, up.latitude, 0);
        const east = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, upVector, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(east, east);
        const north = Cesium.Cartesian3.cross(upVector, east, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(north, north);
        
        const headingRad = Math.atan2(
          Cesium.Cartesian3.dot(forward, east),
          Cesium.Cartesian3.dot(forward, north)
        );
        heading = Cesium.Math.toDegrees(headingRad);
        if (heading < 0) heading += 360;
      }
    }

    // Swath 기하 파라미터 생성
    // SAR는 side-looking이므로, Swath 중심은 위성의 nadir point에서 
    // look direction으로 offset된 위치입니다.
    // 여기서는 간단히 위성의 nadir point를 중심으로 사용하되,
    // 실제로는 look angle과 slant range를 고려해야 합니다.
    const geometry: SARSwathGeometry = {
      centerLat,
      centerLon,
      heading,
      nearRange,
      farRange,
      swathWidth,
      azimuthLength,
      satelliteAltitude: satelliteAltitude,
      lookAngle: 30, // 기본 look angle (degrees), 실제 SAR 시스템에 맞게 조정 가능
    };

    console.log('Swath 기하 파라미터:', geometry);
    this.setSwathGeometry(geometry, this.showSwath);
  }

  /**
   * Swath 표시 여부 반환
   */
  isSwathVisible(): boolean {
    return this.showSwath;
  }
}
