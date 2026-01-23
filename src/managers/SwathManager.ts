import { 
  SARSwathGeometry, 
  SwathMode, 
  SwathVisualizationOptions,
  SwathDataSource,
  SwathInstance,
  SwathCorners
} from '../types/sar-swath.types.js';
import { SARSwathCalculator } from '../utils/sar-swath-calculator.js';

/**
 * SwathManager - SAR Swath 생성 및 관리 (다중 케이스 지원)
 */
export class SwathManager {
  private viewer: any;
  private swaths: Map<string, SwathInstance>;
  private nextSwathId: number;
  private updateHandlers: Map<string, (() => void)>;

  private static readonly DEFAULT_OPTIONS: SwathVisualizationOptions = {
    mode: SwathMode.STATIC,
    color: 'CYAN',
    alpha: 0.4,
    outlineColor: 'YELLOW',
    outlineWidth: 2,
    showLabel: false,
    maxSwaths: 50,
    updateInterval: 200, // 200ms (0.2초) - 더 빠른 업데이트
    useGroundPrimitive: true,
    useEntity: true,
  };

  constructor(viewer: any) {
    this.viewer = viewer;
    this.swaths = new Map();
    this.nextSwathId = 1;
    this.updateHandlers = new Map();
  }

  /**
   * ✅ Case 1: 정적 Swath 추가 (고정 위치/파라미터)
   */
  addStaticSwath(
    geometry: SARSwathGeometry,
    options?: Partial<SwathVisualizationOptions>
  ): string {
    const opts = { ...SwathManager.DEFAULT_OPTIONS, ...options, mode: SwathMode.STATIC };
    const swathId = this.generateSwathId();

    const instance = this.createSwathInstance(swathId, geometry, opts);
    this.swaths.set(swathId, instance);

    console.log(`[SwathManager] 정적 Swath 생성: ${swathId}`, geometry);
    return swathId;
  }

  /**
   * ✅ Case 2: 실시간 위성 추적 Swath
   */
  addRealtimeTrackingSwath(
    satellitePositionGetter: () => { latitude: number; longitude: number; altitude: number; heading: number } | null,
    swathParams: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    } = {},
    options?: Partial<SwathVisualizationOptions>
  ): string {
    const opts = { 
      ...SwathManager.DEFAULT_OPTIONS, 
      ...options, 
      mode: SwathMode.REALTIME_TRACKING 
    };
    const swathId = this.generateSwathId();

    // 기본 파라미터
    const {
      nearRange = 200000,
      farRange = 800000,
      swathWidth = 50000,
      azimuthLength = 50000,
    } = swathParams;

    // 초기 Swath 생성
    const initialPosition = satellitePositionGetter();
    if (!initialPosition) {
      console.warn('[SwathManager] 초기 위성 위치를 가져올 수 없습니다.');
      return '';
    }

    const initialGeometry: SARSwathGeometry = {
      centerLat: initialPosition.latitude,
      centerLon: initialPosition.longitude,
      heading: initialPosition.heading,
      nearRange,
      farRange,
      swathWidth,
      azimuthLength,
      satelliteAltitude: initialPosition.altitude,
    };

    const instance = this.createSwathInstance(swathId, initialGeometry, opts);
    this.swaths.set(swathId, instance);

    // 실시간 업데이트 루프 시작
    const updateHandler = () => {
      const position = satellitePositionGetter();
      if (position) {
        const updatedGeometry: SARSwathGeometry = {
          centerLat: position.latitude,
          centerLon: position.longitude,
          heading: position.heading,
          nearRange,
          farRange,
          swathWidth,
          azimuthLength,
          satelliteAltitude: position.altitude,
        };

        // 새로운 Swath 생성 (기존 것은 유지, 누적)
        const newSwathId = this.generateSwathId();
        const newInstance = this.createSwathInstance(newSwathId, updatedGeometry, opts);
        this.swaths.set(newSwathId, newInstance);
      }
    };

    const intervalId = setInterval(updateHandler, opts.updateInterval);
    this.updateHandlers.set(swathId, () => clearInterval(intervalId));

    console.log(`[SwathManager] 실시간 추적 Swath 시작: ${swathId}`);
    return swathId;
  }

  /**
   * ✅ Case 3: 예측 경로 기반 Swath (미래 경로)
   */
  addPredictedPathSwath(
    predictedPositions: Array<{
      time: number;
      latitude: number;
      longitude: number;
      altitude: number;
      heading: number;
    }>,
    swathParams: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    } = {},
    options?: Partial<SwathVisualizationOptions>
  ): string[] {
    const opts = { 
      ...SwathManager.DEFAULT_OPTIONS, 
      ...options, 
      mode: SwathMode.PREDICTED_PATH 
    };
    
    const {
      nearRange = 200000,
      farRange = 800000,
      swathWidth = 50000,
      azimuthLength = 50000,
    } = swathParams;

    const swathIds: string[] = [];

    // 각 위치마다 Swath 생성
    predictedPositions.forEach((position, index) => {
      const swathId = this.generateSwathId();
      const geometry: SARSwathGeometry = {
        centerLat: position.latitude,
        centerLon: position.longitude,
        heading: position.heading,
        nearRange,
        farRange,
        swathWidth,
        azimuthLength,
        satelliteAltitude: position.altitude,
      };

      // 색상 그라데이션 (시간에 따라)
      const alpha = opts.alpha! * (0.3 + 0.7 * (index / predictedPositions.length));
      const customOpts = { ...opts, alpha, labelText: `T+${index * 5}min` };

      const instance = this.createSwathInstance(swathId, geometry, customOpts);
      this.swaths.set(swathId, instance);
      swathIds.push(swathId);
    });

    console.log(`[SwathManager] 예측 경로 Swath 생성: ${swathIds.length}개`);
    return swathIds;
  }

  /**
   * ✅ Case 4: 과거 경로 Swath (이력)
   */
  addHistoricalSwath(
    historicalPositions: Array<{
      time: number;
      latitude: number;
      longitude: number;
      altitude: number;
      heading: number;
    }>,
    swathParams: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    } = {},
    options?: Partial<SwathVisualizationOptions>
  ): string[] {
    const opts = { 
      ...SwathManager.DEFAULT_OPTIONS, 
      ...options, 
      mode: SwathMode.HISTORICAL,
      color: 'GRAY', // 과거 데이터는 회색
      alpha: 0.2,
    };

    // 예측 경로와 동일한 로직 사용
    return this.addPredictedPathSwath(historicalPositions, swathParams, opts);
  }

  /**
   * ✅ Case 5: Backend API 기반 Swath (시뮬레이션 결과)
   */
  async addBackendAPISwath(
    apiEndpoint: string,
    simulationId: string,
    options?: Partial<SwathVisualizationOptions>
  ): Promise<string[]> {
    const opts = { 
      ...SwathManager.DEFAULT_OPTIONS, 
      ...options, 
      mode: SwathMode.BACKEND_API 
    };

    try {
      // Backend API 호출
      const response = await fetch(`${apiEndpoint}/api/simulation/${simulationId}/swath`);
      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.statusText}`);
      }

      const data = await response.json();
      const swathIds: string[] = [];

      // API 응답 형식 가정: { swaths: SARSwathGeometry[] }
      if (data.swaths && Array.isArray(data.swaths)) {
        data.swaths.forEach((geometry: SARSwathGeometry, index: number) => {
          const swathId = this.generateSwathId();
          const customOpts = { ...opts, labelText: `API Swath ${index + 1}` };
          
          const instance = this.createSwathInstance(swathId, geometry, customOpts);
          this.swaths.set(swathId, instance);
          swathIds.push(swathId);
        });
      }

      console.log(`[SwathManager] Backend API Swath 생성: ${swathIds.length}개`);
      return swathIds;
    } catch (error) {
      console.error('[SwathManager] Backend API 호출 오류:', error);
      return [];
    }
  }

  /**
   * ✅ Case 6: 사용자 정의 기하 Swath
   */
  addCustomGeometrySwath(
    corners: SwathCorners,
    options?: Partial<SwathVisualizationOptions>
  ): string {
    const opts = { 
      ...SwathManager.DEFAULT_OPTIONS, 
      ...options, 
      mode: SwathMode.CUSTOM_GEOMETRY 
    };
    const swathId = this.generateSwathId();

    // SwathCorners를 직접 사용하여 시각화 (SARSwathGeometry 변환 불필요)
    const positions = [
      Cesium.Cartesian3.fromDegrees(corners.topLeft[0], corners.topLeft[1]),
      Cesium.Cartesian3.fromDegrees(corners.topRight[0], corners.topRight[1]),
      Cesium.Cartesian3.fromDegrees(corners.bottomRight[0], corners.bottomRight[1]),
      Cesium.Cartesian3.fromDegrees(corners.bottomLeft[0], corners.bottomLeft[1]),
    ];

    const instance: SwathInstance = {
      id: swathId,
      mode: opts.mode,
      geometry: this.cornersToGeometry(corners), // 메타데이터용
      createdAt: Date.now(),
      options: opts,
    };

    // 시각화
    if (opts.useEntity) {
      instance.entity = this.createSwathEntity(swathId, positions, opts);
    }
    if (opts.useGroundPrimitive) {
      instance.primitive = this.createSwathPrimitive(positions, opts);
    }

    this.swaths.set(swathId, instance);
    console.log(`[SwathManager] 사용자 정의 Swath 생성: ${swathId}`);
    return swathId;
  }

  /**
   * Swath 인스턴스 생성 (공통 로직)
   */
  private createSwathInstance(
    swathId: string,
    geometry: SARSwathGeometry,
    options: SwathVisualizationOptions
  ): SwathInstance {
    // 코너 계산
    const corners = SARSwathCalculator.calculateSwathCorners(geometry);
    const positions = SARSwathCalculator.cornersToCartesian(corners);

    const instance: SwathInstance = {
      id: swathId,
      mode: options.mode,
      geometry,
      createdAt: Date.now(),
      options,
    };

    // Entity 생성
    if (options.useEntity) {
      instance.entity = this.createSwathEntity(swathId, positions, options);
    }

    // GroundPrimitive 생성
    if (options.useGroundPrimitive) {
      instance.primitive = this.createSwathPrimitive(positions, options);
    }

    // 라벨 생성 (선택적)
    if (options.showLabel && options.labelText) {
      const centerPosition = Cesium.Cartesian3.fromDegrees(
        geometry.centerLon,
        geometry.centerLat,
        geometry.satelliteAltitude || 0
      );
      instance.label = this.viewer.entities.add({
        name: `${swathId}-label`,
        position: centerPosition,
        label: {
          text: options.labelText,
          font: '12px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });
    }

    // 최대 개수 제한 체크
    this.enforceMaxSwaths(options.maxSwaths!);

    return instance;
  }

  /**
   * Swath Entity 생성
   */
  private createSwathEntity(
    swathId: string,
    positions: any[],
    options: SwathVisualizationOptions
  ): any {
    const color = this.getCesiumColor(options.color!, options.alpha!);
    const outlineColor = this.getCesiumColor(options.outlineColor!);

    return this.viewer.entities.add({
      name: swathId,
      polygon: {
        hierarchy: positions,
        material: color,
        outline: true,
        outlineColor: outlineColor,
        outlineWidth: options.outlineWidth,
        classificationType: Cesium.ClassificationType.TERRAIN,
        height: 0,
        extrudedHeight: 0,
      },
    });
  }

  /**
   * Swath GroundPrimitive 생성
   */
  private createSwathPrimitive(
    positions: any[],
    options: SwathVisualizationOptions
  ): any {
    const color = this.getCesiumColor(options.color!, options.alpha!);

    try {
      const primitive = new Cesium.GroundPrimitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(positions),
            perPositionHeight: false,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
          },
        }),
        appearance: new Cesium.PerInstanceColorAppearance({
          translucent: true,
          closed: true,
        }),
      });

      this.viewer.scene.primitives.add(primitive);
      return primitive;
    } catch (error) {
      console.warn('[SwathManager] GroundPrimitive 생성 실패:', error);
      return null;
    }
  }

  /**
   * Swath 제거
   */
  removeSwath(swathId: string): boolean {
    const instance = this.swaths.get(swathId);
    if (!instance) {
      console.warn(`[SwathManager] Swath ${swathId}를 찾을 수 없습니다.`);
      return false;
    }

    this.removeSwathVisualization(swathId);
    this.swaths.delete(swathId);

    // 업데이트 핸들러 정리
    const updateHandler = this.updateHandlers.get(swathId);
    if (updateHandler) {
      updateHandler();
      this.updateHandlers.delete(swathId);
    }

    console.log(`[SwathManager] Swath 제거: ${swathId}`);
    return true;
  }

  /**
   * Swath 시각화 제거 (Entity + Primitive + Label)
   */
  private removeSwathVisualization(swathId: string): void {
    const instance = this.swaths.get(swathId);
    if (!instance) return;

    // Entity 제거
    if (instance.entity) {
      try {
        this.viewer.entities.remove(instance.entity);
      } catch (error) {
        console.warn('[SwathManager] Entity 제거 실패:', error);
      }
    }

    // Primitive 제거
    if (instance.primitive) {
      try {
        this.viewer.scene.primitives.remove(instance.primitive);
      } catch (error) {
        console.warn('[SwathManager] Primitive 제거 실패:', error);
      }
    }

    // Label 제거
    if (instance.label) {
      try {
        this.viewer.entities.remove(instance.label);
      } catch (error) {
        console.warn('[SwathManager] Label 제거 실패:', error);
      }
    }
  }

  /**
   * 모든 Swath 제거
   */
  clearAllSwaths(): void {
    const swathIds = Array.from(this.swaths.keys());
    swathIds.forEach(id => this.removeSwath(id));
    console.log('[SwathManager] 모든 Swath 제거 완료');
  }

  /**
   * 특정 모드의 Swath만 제거
   */
  clearSwathsByMode(mode: SwathMode): void {
    const swathIds = Array.from(this.swaths.values())
      .filter(instance => instance.mode === mode)
      .map(instance => instance.id);
    
    swathIds.forEach(id => this.removeSwath(id));
    console.log(`[SwathManager] ${mode} 모드 Swath 제거: ${swathIds.length}개`);
  }

  /**
   * 최대 개수 제한 적용 (오래된 것부터 자동 삭제)
   */
  private enforceMaxSwaths(maxSwaths: number): void {
    if (this.swaths.size <= maxSwaths) return;

    // 생성 시간 기준 정렬
    const sortedSwaths = Array.from(this.swaths.values())
      .sort((a, b) => a.createdAt - b.createdAt);

    // 오래된 것부터 삭제
    const toRemove = sortedSwaths.slice(0, this.swaths.size - maxSwaths);
    toRemove.forEach(instance => this.removeSwath(instance.id));

    console.log(`[SwathManager] 최대 개수 초과, ${toRemove.length}개 자동 삭제`);
  }

  /**
   * Swath ID 생성
   */
  private generateSwathId(): string {
    return `swath-${this.nextSwathId++}-${Date.now()}`;
  }

  /**
   * Cesium Color 객체 생성
   */
  private getCesiumColor(colorName: string, alpha: number = 1.0): any {
    const colorMap: { [key: string]: any } = {
      CYAN: Cesium.Color.CYAN,
      YELLOW: Cesium.Color.YELLOW,
      RED: Cesium.Color.RED,
      GREEN: Cesium.Color.GREEN,
      BLUE: Cesium.Color.BLUE,
      ORANGE: Cesium.Color.ORANGE,
      PURPLE: Cesium.Color.PURPLE,
      GRAY: Cesium.Color.GRAY,
      WHITE: Cesium.Color.WHITE,
    };

    const color = colorMap[colorName.toUpperCase()] || Cesium.Color.CYAN;
    return color.withAlpha(alpha);
  }

  /**
   * SwathCorners를 SARSwathGeometry로 변환 (메타데이터용)
   */
  private cornersToGeometry(corners: SwathCorners): SARSwathGeometry {
    // 중심 좌표 계산
    const centerLon = (corners.topLeft[0] + corners.bottomRight[0]) / 2;
    const centerLat = (corners.topLeft[1] + corners.bottomRight[1]) / 2;

    // 간단한 추정 (실제로는 더 정확한 계산 필요)
    return {
      centerLat,
      centerLon,
      heading: 0,
      nearRange: 0,
      farRange: 0,
      swathWidth: 0,
      azimuthLength: 0,
    };
  }

  /**
   * 현재 Swath 개수 반환
   */
  getSwathCount(): number {
    return this.swaths.size;
  }

  /**
   * 특정 모드의 Swath 개수 반환
   */
  getSwathCountByMode(mode: SwathMode): number {
    return Array.from(this.swaths.values())
      .filter(instance => instance.mode === mode)
      .length;
  }

  /**
   * 모든 Swath 인스턴스 반환
   */
  getAllSwaths(): SwathInstance[] {
    return Array.from(this.swaths.values());
  }
}
