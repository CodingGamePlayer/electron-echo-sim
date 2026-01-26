import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { SARSwathGeometry, SwathMode } from '../types/sar-swath.types.js';
import { SwathManager } from '../managers/SwathManager.js';
import { SwathGroupManager } from '../managers/SwathGroupManager.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';
import { PositionUpdateManager } from './PositionUpdateManager.js';
import { PredictedPathManager } from './PredictedPathManager.js';
import { HeadingCalculator } from './HeadingCalculator.js';
import { SwathTrackingManager } from './SwathTrackingManager.js';
import { SwathPreviewManager } from './SwathPreviewManager.js';

/**
 * EntityManager - 엔티티 생성 및 관리 통합 클래스
 */
export class EntityManager {
  private viewer: any;
  private satelliteManager: SatelliteManager;
  private swathManager: SwathManager;
  private swathGroupManager: SwathGroupManager;
  private satelliteEntityManager: SatelliteEntityManager;
  private positionUpdateManager: PositionUpdateManager;
  private predictedPathManager: PredictedPathManager;
  private headingCalculator: HeadingCalculator;
  private swathTrackingManager: SwathTrackingManager;
  private swathPreviewManager: SwathPreviewManager;
  private headingOffset: number;
  private customAltitude: number | null;  // null이면 TLE 고도 사용, 값이 있으면 해당 고도 사용

  constructor(viewer: any, satelliteManager: SatelliteManager) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.swathManager = new SwathManager(viewer);
    this.swathGroupManager = new SwathGroupManager(this.swathManager);
    this.headingOffset = 0;
    this.customAltitude = null;

    this.satelliteEntityManager = new SatelliteEntityManager(viewer, satelliteManager);
    this.positionUpdateManager = new PositionUpdateManager(viewer, satelliteManager, this.satelliteEntityManager);
    this.predictedPathManager = new PredictedPathManager(viewer, satelliteManager, this.satelliteEntityManager);
    this.headingCalculator = new HeadingCalculator(satelliteManager, viewer);
    this.swathTrackingManager = new SwathTrackingManager(
      this.swathManager,
      this.swathGroupManager,
      this.headingCalculator,
      this.satelliteEntityManager
    );
    this.swathPreviewManager = new SwathPreviewManager(
      viewer,
      this.swathManager,
      this.headingCalculator,
      this.satelliteEntityManager
    );

    // 미리보기 업데이트 콜백 설정
    this.positionUpdateManager.setPreviewUpdateCallback((params, options) => {
      const previewData = this.swathPreviewManager.getPreviewParams();
      if (previewData) {
        const now = Date.now();
        if (now - this.swathPreviewManager.getLastUpdateTime() > 1000) {
          this.swathPreviewManager.updateSwathPreview(
            previewData.params,
            previewData.options,
            this.headingOffset
          );
        }
      }
    });
  }

  /**
   * 위성 엔티티 생성
   */
  createSatelliteEntity(name: string, initialPosition: { longitude: number; latitude: number; altitude: number }): any {
    return this.satelliteEntityManager.createSatelliteEntity(name, initialPosition);
  }

  /**
   * 위치 업데이트 루프 시작
   */
  startUpdateLoop(): void {
    this.positionUpdateManager.startUpdateLoop();
  }

  /**
   * 위치 업데이트 루프 중지
   */
  stopUpdateLoop(): void {
    this.positionUpdateManager.stopUpdateLoop();
  }

  /**
   * 엔티티 위치 즉시 업데이트
   */
  updatePosition(position: { longitude: number; latitude: number; altitude: number }): void {
    // 커스텀 고도가 설정되어 있으면 사용, 없으면 TLE로 계산된 고도 사용
    const finalAltitude = this.customAltitude !== null ? this.customAltitude : position.altitude;
    this.satelliteEntityManager.updatePosition(
      { ...position, altitude: finalAltitude },
      0  // 오프셋은 더 이상 사용하지 않음
    );
  }

  /**
   * 엔티티 반환
   */
  getEntity(): any {
    return this.satelliteEntityManager.getEntity();
  }

  /**
   * 예상 경로 그리기
   */
  drawPredictedPath(hours: number = 4): void {
    this.predictedPathManager.drawPredictedPath(hours);
  }

  /**
   * 예상 경로 업데이트
   */
  updatePredictedPath(hours: number = 4): void {
    this.predictedPathManager.updatePredictedPath(hours);
  }

  /**
   * 예상 경로 제거
   */
  removePredictedPath(): void {
    this.predictedPathManager.removePredictedPath();
  }

  /**
   * 모든 Swath 제거
   */
  clearAllSwaths(): void {
    this.swathManager.clearAllSwaths();
  }

  /**
   * 실시간 Swath 추적 시작
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
    this.swathTrackingManager.setHeadingOffset(this.headingOffset);
    
    // 배치 처리를 위한 의존성 설정 (필요한 경우)
    // 실제로는 SwathControlUIManager에서 설정하도록 함
    
    this.swathTrackingManager.startRealtimeSwathTracking(swathParams, options);
  }

  /**
   * SwathTrackingManager의 배치 처리 의존성 설정
   */
  setSwathTrackingBatchDependencies(
    satelliteManager: SatelliteManager,
    sarConfigGetter: () => any,
    batchProcessingCallback?: (result: any) => void
  ): void {
    this.swathTrackingManager.setBatchProcessingDependencies(
      this,
      satelliteManager,
      this.viewer,
      sarConfigGetter
    );
    
    if (batchProcessingCallback) {
      this.swathTrackingManager.setBatchProcessingCallback(batchProcessingCallback);
    }
  }

  /**
   * SwathTrackingManager의 배치 설정
   */
  setSwathTrackingBatchConfig(mode: 'count' | 'time', value: number): void {
    this.swathTrackingManager.setBatchConfig(mode, value);
  }

  /**
   * SwathTrackingManager의 자동 처리 활성화/비활성화
   */
  setSwathTrackingAutoProcess(enabled: boolean): void {
    this.swathTrackingManager.setAutoProcessEnabled(enabled);
  }

  /**
   * SwathTrackingManager의 자동 종료 콜백 설정
   */
  setSwathTrackingAutoStopCallback(callback: () => void): void {
    this.swathTrackingManager.setAutoStopCallback(callback);
  }

  /**
   * 현재 쌓인 Pulse 개수 가져오기
   */
  getCurrentPulseCount(): number {
    return this.swathTrackingManager.getCurrentPulseCount();
  }

  /**
   * 실시간 Swath 추적 중지
   * @param processPulses 종료 시 쌓인 Pulse를 처리할지 여부
   * @param swathParams Swath 파라미터 (Pulse 처리 시 필요)
   */
  async stopRealtimeSwathTracking(
    processPulses: boolean = false,
    swathParams?: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    }
  ): Promise<any> {
    return await this.swathTrackingManager.stopRealtimeSwathTracking(processPulses, swathParams);
  }

  /**
   * 정적 Swath 추가
   */
  addStaticSwath(geometry: SARSwathGeometry, options?: any): string {
    const groupId = this.swathGroupManager.createGroup(SwathMode.STATIC);
    const swathId = this.swathManager.addStaticSwath(geometry, options, groupId);
    this.swathGroupManager.addSwathToGroup(groupId, swathId);
    this.swathGroupManager.endGroup(groupId);
    return swathId;
  }

  /**
   * 예측 경로 Swath 추가
   */
  addPredictedSwathPath(hours: number = 4): string[] {
    if (!this.satelliteManager.useTLE) {
      console.warn('[EntityManager] TLE가 없어 예측 경로를 생성할 수 없습니다.');
      return [];
    }

    const startTime = this.viewer.clock.currentTime;
    const sampleInterval = 5;
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
   * Backend API Swath 추가
   */
  async addBackendAPISwath(apiEndpoint: string, simulationId: string, options?: any): Promise<string[]> {
    return await this.swathManager.addBackendAPISwath(apiEndpoint, simulationId, options);
  }

  /**
   * 특정 모드 Swath 제거
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
   * 특정 그룹의 Swath만 표시
   */
  showSwathsByGroupId(groupId: string | null): void {
    const previewSwathId = this.swathPreviewManager.getPreviewSwathId();
    this.swathManager.showSwathsByGroupId(groupId, previewSwathId);
  }

  /**
   * 현재 위성 위치와 heading 반환
   */
  getCurrentSatellitePosition(): { latitude: number; longitude: number; altitude: number; heading: number } | null {
    const currentCartesian = this.satelliteEntityManager.getCurrentCartesian();
    return this.headingCalculator.getSatellitePosition(currentCartesian, this.headingOffset);
  }

  /**
   * Heading 오프셋 설정
   */
  setHeadingOffset(offset: number): void {
    this.headingOffset = offset;
    this.swathTrackingManager.setHeadingOffset(offset);
    console.log(`[EntityManager] Heading 오프셋 설정: ${offset}도`);
  }

  /**
   * 현재 heading 오프셋 반환
   */
  getHeadingOffset(): number {
    return this.headingOffset;
  }

  /**
   * 커스텀 고도 설정
   * @param altitude 고도 (m), null이면 TLE로 계산된 고도 사용
   */
  setCustomAltitude(altitude: number | null): void {
    this.customAltitude = altitude;
    this.positionUpdateManager.setCustomAltitude(altitude);
    console.log(`[EntityManager] 커스텀 고도 설정: ${altitude !== null ? altitude + '미터' : 'TLE 고도 사용'}`);
    
    if (this.satelliteManager.useTLE) {
      const currentTime = this.viewer.clock.currentTime;
      const position = this.satelliteManager.calculatePosition(currentTime);
      if (position) {
        this.updatePosition(position);
      }
    }
  }

  /**
   * 현재 커스텀 고도 반환
   */
  getCustomAltitude(): number | null {
    return this.customAltitude;
  }

  /**
   * Swath 미리보기 업데이트
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
    this.swathPreviewManager.updateSwathPreview(swathParams, options, this.headingOffset);
  }

  /**
   * Swath 미리보기 제거
   */
  clearSwathPreview(): void {
    this.swathPreviewManager.clearSwathPreview();
  }

  /**
   * 축 방향선 표시/숨김 설정
   */
  setAxisLinesVisible(visible: boolean): void {
    this.satelliteEntityManager.setAxisLinesVisible(visible);
  }

  /**
   * 축 길이 설정
   */
  setAxisLength(length: number): void {
    this.satelliteEntityManager.setAxisLength(length);
  }

  /**
   * SatelliteEntityManager 가져오기
   */
  getSatelliteEntityManager(): SatelliteEntityManager {
    return this.satelliteEntityManager;
  }
}
