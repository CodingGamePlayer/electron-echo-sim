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
  private altitudeOffset: number;

  constructor(viewer: any, satelliteManager: SatelliteManager) {
    this.viewer = viewer;
    this.satelliteManager = satelliteManager;
    this.swathManager = new SwathManager(viewer);
    this.swathGroupManager = new SwathGroupManager(this.swathManager);
    this.headingOffset = 0;
    this.altitudeOffset = 0;

    this.satelliteEntityManager = new SatelliteEntityManager(viewer, satelliteManager);
    this.positionUpdateManager = new PositionUpdateManager(viewer, satelliteManager, this.satelliteEntityManager);
    this.predictedPathManager = new PredictedPathManager(viewer, satelliteManager);
    this.headingCalculator = new HeadingCalculator(satelliteManager, viewer);
    this.swathTrackingManager = new SwathTrackingManager(
      this.swathManager,
      this.swathGroupManager,
      this.headingCalculator,
      this.satelliteEntityManager
    );
    this.swathPreviewManager = new SwathPreviewManager(
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
    this.satelliteEntityManager.updatePosition(position, this.altitudeOffset);
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
    this.swathTrackingManager.startRealtimeSwathTracking(swathParams, options);
  }

  /**
   * 실시간 Swath 추적 중지
   */
  stopRealtimeSwathTracking(): void {
    this.swathTrackingManager.stopRealtimeSwathTracking();
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
   * 고도 오프셋 설정
   */
  setAltitudeOffset(offset: number): void {
    this.altitudeOffset = offset;
    this.positionUpdateManager.setAltitudeOffset(offset);
    console.log(`[EntityManager] 고도 오프셋 설정: ${offset}미터`);
    
    if (this.satelliteManager.useTLE) {
      const currentTime = this.viewer.clock.currentTime;
      const position = this.satelliteManager.calculatePosition(currentTime);
      if (position) {
        this.updatePosition(position);
      }
    }
  }

  /**
   * 현재 고도 오프셋 반환
   */
  getAltitudeOffset(): number {
    return this.altitudeOffset;
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
}
