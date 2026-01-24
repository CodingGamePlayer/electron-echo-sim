import { SatelliteManager } from './SatelliteManager.js';
import { SARSwathGeometry, SwathMode } from './types/sar-swath.types.js';
import { SwathManager } from './managers/SwathManager.js';
import { SwathGroupManager } from './managers/SwathGroupManager.js';

/**
 * EntityManager - 엔티티 생성 및 관리
 */
export class EntityManager {
  private viewer: any;
  private satelliteManager: SatelliteManager;
  private swathManager: SwathManager;
  private swathGroupManager: SwathGroupManager;
  private entity: any;
  private position: any;
  private currentCartesian: any;
  private postRenderHandler: (() => void) | null;
  private predictedPathEntity: any;
  private lastSwathUpdateTime: number;
  private realtimeSwathId: string | null;
  private headingOffset: number; // Swath 방향 조정을 위한 heading 오프셋 (도)
  private altitudeOffset: number; // 위성 고도 조정을 위한 고도 오프셋 (미터)
  private previewSwathId: string | null; // 미리보기 Swath ID
  private previewSwathParams: {
    nearRange?: number;
    farRange?: number;
    swathWidth?: number;
    azimuthLength?: number;
  } | null; // 미리보기 파라미터 저장
  private previewSwathOptions: Partial<any> | undefined; // 미리보기 옵션 저장
  private lastPreviewUpdateTime: number; // 마지막 미리보기 업데이트 시간

  constructor(viewer: any, satelliteManager: SatelliteManager) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.swathManager = new SwathManager(viewer);
    this.swathGroupManager = new SwathGroupManager(this.swathManager);
    this.entity = null;
    this.position = null;
    this.currentCartesian = null;
    this.postRenderHandler = null;
    this.lastSwathUpdateTime = 0;
    this.realtimeSwathId = null;
    this.headingOffset = 0; // 기본값: 오프셋 없음
    this.altitudeOffset = 0; // 기본값: 오프셋 없음
    this.previewSwathId = null; // 미리보기 Swath ID 초기화
    this.previewSwathParams = null; // 미리보기 파라미터 초기화
    this.previewSwathOptions = undefined; // 미리보기 옵션 초기화
    this.lastPreviewUpdateTime = 0; // 마지막 업데이트 시간 초기화
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
          // 고도 오프셋 적용
          const adjustedAltitude = position.altitude + this.altitudeOffset;
          const newCartesian = Cesium.Cartesian3.fromDegrees(
            position.longitude,
            position.latitude,
            adjustedAltitude
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

          // 미리보기가 활성화되어 있으면 위치에 따라 업데이트 (최대 1초에 한 번)
          const now = Date.now();
          if (this.previewSwathId && this.previewSwathParams && (now - this.lastPreviewUpdateTime) > 1000) {
            this.updateSwathPreview(this.previewSwathParams, this.previewSwathOptions || undefined);
            this.lastPreviewUpdateTime = now;
          }

          // SwathManager가 실시간 추적을 처리하므로 여기서는 제거
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
      // 고도 오프셋 적용
      const adjustedAltitude = position.altitude + this.altitudeOffset;
      const cartesian = Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        adjustedAltitude
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
   * 모든 Swath 제거 (외부에서 호출 가능)
   */
  clearAllSwaths(): void {
    this.swathManager.clearAllSwaths();
  }

  /**
   * ✅ 실시간 Swath 추적 시작
   */
  startRealtimeSwathTracking(
    swathParams?: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    },
    options?: any
  ): void {
    // 이미 실행 중이면 중지
    if (this.realtimeSwathId) {
      this.stopRealtimeSwathTracking();
    }

    // 위성 위치 getter 함수
    const getSatellitePosition = () => {
      if (!this.currentCartesian) return null;

      const cartographic = Cesium.Cartographic.fromCartesian(this.currentCartesian);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude);
      const altitude = cartographic.height;

      // Heading 계산
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
      }

      // Heading 오프셋 적용
      heading = (heading + this.headingOffset) % 360;
      if (heading < 0) heading += 360;

      return { latitude, longitude, altitude, heading };
    };

    // 실시간 추적 그룹 시작
    const groupId = this.swathGroupManager.startRealtimeGroup();
    
    // SwathManager에 그룹 추가 콜백 설정
    (this.swathManager as any).onSwathAdded = (groupId: string, swathId: string) => {
      this.swathGroupManager.addSwathToGroup(groupId, swathId);
    };
    
    // 실시간 추적 시작
    this.realtimeSwathId = this.swathManager.addRealtimeTrackingSwath(
      getSatellitePosition,
      swathParams,
      options,
      groupId  // 그룹 ID 전달
    );
    
    // 초기 Swath를 그룹에 추가
    if (this.realtimeSwathId) {
      this.swathGroupManager.addSwathToGroup(groupId, this.realtimeSwathId);
    }

    console.log('[EntityManager] 실시간 Swath 추적 시작:', this.realtimeSwathId, '그룹:', groupId);
  }

  /**
   * ✅ 실시간 Swath 추적 중지
   */
  stopRealtimeSwathTracking(): void {
    if (this.realtimeSwathId) {
      // 실시간 추적 그룹 종료
      this.swathGroupManager.endRealtimeGroup();
      
      this.swathManager.removeSwath(this.realtimeSwathId);
      this.realtimeSwathId = null;
      console.log('[EntityManager] 실시간 Swath 추적 중지');
    }
  }

  /**
   * ✅ 정적 Swath 추가 (그룹 생성)
   */
  addStaticSwath(geometry: SARSwathGeometry, options?: any): string {
    // 정적 모드에서는 매번 새 그룹 생성
    const groupId = this.swathGroupManager.createGroup(SwathMode.STATIC);
    const swathId = this.swathManager.addStaticSwath(geometry, options);
    this.swathGroupManager.addSwathToGroup(groupId, swathId);
    return swathId;
  }

  /**
   * ✅ 예측 경로 Swath 추가
   */
  addPredictedSwathPath(hours: number = 4): string[] {
    if (!this.satelliteManager.useTLE) {
      console.warn('[EntityManager] TLE가 없어 예측 경로를 생성할 수 없습니다.');
      return [];
    }

    const startTime = this.viewer.clock.currentTime;
    const sampleInterval = 5; // 5분
    const numSamples = Math.floor((hours * 60) / sampleInterval);
    const predictedPositions: any[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const sampleTime = Cesium.JulianDate.addMinutes(
        startTime,
        i * sampleInterval,
        new Cesium.JulianDate()
      );
      
      const position = this.satelliteManager.calculatePosition(sampleTime);
      if (position) {
        // Heading 계산 (다음 포인트와 비교)
        let heading = 0;
        if (i < numSamples) {
          const nextTime = Cesium.JulianDate.addMinutes(
            startTime,
            (i + 1) * sampleInterval,
            new Cesium.JulianDate()
          );
          const nextPosition = this.satelliteManager.calculatePosition(nextTime);
          
          if (nextPosition) {
            const dLon = (nextPosition.longitude - position.longitude) * Math.PI / 180;
            const lat1Rad = position.latitude * Math.PI / 180;
            const lat2Rad = nextPosition.latitude * Math.PI / 180;
            
            const y = Math.sin(dLon) * Math.cos(lat2Rad);
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
            
            heading = Cesium.Math.toDegrees(Math.atan2(y, x));
            if (heading < 0) heading += 360;
          }
        }

        // Heading 오프셋 적용
        heading = (heading + this.headingOffset) % 360;
        if (heading < 0) heading += 360;

        predictedPositions.push({
          time: Cesium.JulianDate.toDate(sampleTime).getTime(),
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude,
          heading,
        });
      }
    }

    return this.swathManager.addPredictedPathSwath(predictedPositions);
  }

  /**
   * ✅ Backend API Swath 추가
   */
  async addBackendAPISwath(apiEndpoint: string, simulationId: string, options?: any): Promise<string[]> {
    return await this.swathManager.addBackendAPISwath(apiEndpoint, simulationId, options);
  }

  /**
   * ✅ 특정 모드 Swath 제거
   */
  clearSwathsByMode(mode: SwathMode): void {
    this.swathManager.clearSwathsByMode(mode);
  }

  /**
   * SwathManager 접근
   */
  getSwathManager(): SwathManager {
    return this.swathManager;
  }

  /**
   * SwathGroupManager 접근
   */
  getSwathGroupManager(): SwathGroupManager {
    return this.swathGroupManager;
  }


  /**
   * ✅ 현재 위성 위치와 heading 반환
   */
  getCurrentSatellitePosition(): { latitude: number; longitude: number; altitude: number; heading: number } | null {
    if (!this.currentCartesian) {
      return null;
    }

    // 현재 위치를 위도/경도로 변환
    const cartographic = Cesium.Cartographic.fromCartesian(this.currentCartesian);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    // 고도 오프셋 적용 (currentCartesian에는 이미 적용되어 있음)
    const altitude = cartographic.height;

    // Heading 계산
    let heading = 0;
    
    // TLE 기반 속도 벡터 계산 (지표면 좌표 사용)
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
    } else if (this.entity && this.entity.orientation && this.entity.orientation.getValue) {
      // Orientation 기반 heading 계산 (대안)
      const orientation = this.entity.orientation.getValue(Cesium.JulianDate.now());
      if (orientation) {
        const matrix = Cesium.Matrix3.fromQuaternion(orientation);
        const forward = Cesium.Matrix3.getColumn(matrix, 0, new Cesium.Cartesian3());
        
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

    // Heading 오프셋 적용
    heading = (heading + this.headingOffset) % 360;
    if (heading < 0) heading += 360;

    return { latitude, longitude, altitude, heading };
  }

  /**
   * ✅ Swath 방향 조정을 위한 heading 오프셋 설정 (도)
   */
  setHeadingOffset(offset: number): void {
    this.headingOffset = offset;
    console.log(`[EntityManager] Heading 오프셋 설정: ${offset}도`);
    
    // 실시간 추적이 실행 중이면 재시작하여 변경사항 적용
    if (this.realtimeSwathId) {
      // 현재 설정값을 가져와서 재시작해야 하는데, 이는 UIManager에서 처리
      // 여기서는 오프셋만 설정
    }
  }

  /**
   * ✅ 현재 heading 오프셋 반환
   */
  getHeadingOffset(): number {
    return this.headingOffset;
  }

  /**
   * ✅ 위성 고도 조정을 위한 고도 오프셋 설정 (미터)
   */
  setAltitudeOffset(offset: number): void {
    this.altitudeOffset = offset;
    console.log(`[EntityManager] 고도 오프셋 설정: ${offset}미터`);
    
    // 현재 위치를 다시 업데이트하여 오프셋 적용
    if (this.satelliteManager.useTLE) {
      const currentTime = this.viewer.clock.currentTime;
      const position = this.satelliteManager.calculatePosition(currentTime);
      if (position) {
        this.updatePosition(position);
      }
    }
  }

  /**
   * ✅ 현재 고도 오프셋 반환
   */
  getAltitudeOffset(): number {
    return this.altitudeOffset;
  }

  /**
   * ✅ Swath 미리보기 업데이트 (현재 설정으로 미리보기 표시)
   */
  updateSwathPreview(
    swathParams: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    } = {},
    options?: Partial<any>
  ): void {
    // 파라미터 저장 (위성 위치 변경 시 재사용)
    this.previewSwathParams = swathParams;
    this.previewSwathOptions = options;

    // 기존 미리보기 제거
    this.clearSwathPreview();

    // 현재 위성 위치 가져오기
    const currentPosition = this.getCurrentSatellitePosition();
    if (!currentPosition) {
      console.warn('[EntityManager] 미리보기 생성 실패: 위성 위치를 가져올 수 없습니다.');
      return;
    }

    // 기본 파라미터
    const {
      nearRange = 200000,
      farRange = 800000,
      swathWidth = 400000,
      azimuthLength = 50000,
    } = swathParams;

    // 미리보기용 기하 파라미터 생성
    const geometry: SARSwathGeometry = {
      centerLat: currentPosition.latitude,
      centerLon: currentPosition.longitude,
      heading: currentPosition.heading,
      nearRange,
      farRange,
      swathWidth,
      azimuthLength,
      satelliteAltitude: currentPosition.altitude,
    };

    // 미리보기 옵션 (실제 Swath와 구분되도록 다른 스타일)
    const previewOptions = {
      color: options?.color || 'YELLOW',
      alpha: options?.alpha || 0.3, // 미리보기는 더 진하게
      outlineColor: 'YELLOW',
      outlineWidth: 3, // 두꺼운 테두리
      showLabel: false,
      mode: SwathMode.STATIC,
    };

    // 미리보기 Swath 생성
    this.previewSwathId = this.swathManager.addStaticSwath(geometry, previewOptions);
    
    // 미리보기 Swath에 점선 스타일 적용
    if (this.previewSwathId) {
      // SwathManager의 getAllSwaths를 통해 접근
      const allSwaths = this.swathManager.getAllSwaths();
      const swathInstance = allSwaths.find(s => s.id === this.previewSwathId);
      if (swathInstance && swathInstance.entity) {
        // 점선 테두리 추가
        swathInstance.entity.polygon.outline = true;
        swathInstance.entity.polygon.outlineColor = Cesium.Color.YELLOW.withAlpha(0.8);
        swathInstance.entity.polygon.outlineWidth = 3;
        // 미리보기임을 표시하기 위해 material 변경
        swathInstance.entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.2);
      }
    }

    this.lastPreviewUpdateTime = Date.now();
    console.log('[EntityManager] Swath 미리보기 업데이트:', this.previewSwathId);
  }

  /**
   * ✅ Swath 미리보기 제거
   */
  clearSwathPreview(): void {
    if (this.previewSwathId) {
      this.swathManager.removeSwath(this.previewSwathId);
      this.previewSwathId = null;
      // 파라미터는 유지 (옵션 변경 시 재사용)
      // this.previewSwathParams = null;
      // this.previewSwathOptions = null;
      console.log('[EntityManager] Swath 미리보기 제거');
    }
  }
}
