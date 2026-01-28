import { SwathManager } from '../managers/SwathManager.js';
import { SwathGroupManager } from '../managers/SwathGroupManager.js';
import { HeadingCalculator } from './HeadingCalculator.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';
import { PulseStorageManager } from '../managers/PulseStorageManager.js';
import { SARSwathGeometry } from '../types/sar-swath.types.js';
import { SatelliteStateForEcho } from '../types/signal.types.js';
import { getCurrentSatelliteStateForEcho } from '../utils/satellite-state-helper.js';
import { EntityManager } from './EntityManager.js';
import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { convertSwathToTargets } from '../utils/swath-to-target-converter.js';
import { simulateMultipleEchoes } from '../utils/echo-api-client.js';
import { convertSarConfigToRequest } from '../utils/chirp-api-client.js';

/**
 * 실시간 Swath 추적 관리
 */
export class SwathTrackingManager {
  private swathManager: SwathManager;
  private swathGroupManager: SwathGroupManager;
  private headingCalculator: HeadingCalculator;
  private entityManager: SatelliteEntityManager;
  private realtimeSwathId: string | null;
  private headingOffset: number;
  private pulseStorageManager: PulseStorageManager | null;
  private fullEntityManager: EntityManager | null;
  private satelliteManager: SatelliteManager | null;
  private viewer: any;
  private sarConfigGetter: (() => any) | null;
  private batchMode: 'count' | 'time';
  private batchValue: number;
  private batchProcessingCallback: ((result: any) => void) | null;
  private autoProcessEnabled: boolean;  // 자동 배치 처리 활성화 여부
  private autoStopCallback: (() => void) | null;  // 자동 종료 콜백

  constructor(
    swathManager: SwathManager,
    swathGroupManager: SwathGroupManager,
    headingCalculator: HeadingCalculator,
    entityManager: SatelliteEntityManager
  ) {
    this.swathManager = swathManager;
    this.swathGroupManager = swathGroupManager;
    this.headingCalculator = headingCalculator;
    this.entityManager = entityManager;
    this.realtimeSwathId = null;
    this.headingOffset = 0;
    this.pulseStorageManager = null;
    this.fullEntityManager = null;
    this.satelliteManager = null;
    this.viewer = null;
    this.sarConfigGetter = null;
    this.batchMode = 'count';
    this.batchValue = 100;
    this.batchProcessingCallback = null;
    this.autoProcessEnabled = false;  // 기본적으로 자동 처리 비활성화
    this.autoStopCallback = null;
  }

  /**
   * 배치 처리를 위한 의존성 설정
   */
  setBatchProcessingDependencies(
    fullEntityManager: EntityManager,
    satelliteManager: SatelliteManager,
    viewer: any,
    sarConfigGetter: () => any
  ): void {
    this.fullEntityManager = fullEntityManager;
    this.satelliteManager = satelliteManager;
    this.viewer = viewer;
    this.sarConfigGetter = sarConfigGetter;
  }

  /**
   * 배치 처리 콜백 설정
   */
  setBatchProcessingCallback(callback: (result: any) => void): void {
    this.batchProcessingCallback = callback;
  }

  /**
   * 자동 종료 콜백 설정 (100개 도달 시 호출)
   */
  setAutoStopCallback(callback: () => void): void {
    this.autoStopCallback = callback;
  }

  /**
   * 배치 모드 및 값 설정
   */
  setBatchConfig(mode: 'count' | 'time', value: number): void {
    this.batchMode = mode;
    this.batchValue = value;
  }

  /**
   * 자동 처리 활성화/비활성화
   */
  setAutoProcessEnabled(enabled: boolean): void {
    this.autoProcessEnabled = enabled;
  }

  /**
   * Heading 오프셋 설정
   */
  setHeadingOffset(offset: number): void {
    this.headingOffset = offset;
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
    if (this.realtimeSwathId) {
      this.stopRealtimeSwathTracking();
    }

    // PulseStorageManager 초기화
    this.pulseStorageManager = new PulseStorageManager();

    const getSatellitePosition = () => {
      const currentCartesian = this.entityManager.getCurrentCartesian();
      if (!currentCartesian) return null;

      return this.headingCalculator.getSatellitePosition(currentCartesian, this.headingOffset);
    };

    const groupId = this.swathGroupManager.startRealtimeGroup();
    
    // Swath 추가 콜백
    (this.swathManager as any).onSwathAdded = (groupId: string, swathId: string) => {
      this.swathGroupManager.addSwathToGroup(groupId, swathId);
    };

    // Pulse 추가 콜백 설정
    (this.swathManager as any).onPulseAdded = (swathId: string, geometry: SARSwathGeometry) => {
      if (!this.pulseStorageManager || !this.fullEntityManager || !this.satelliteManager || !this.viewer) {
        return;
      }

      // 위성 상태 가져오기
      const satelliteState = getCurrentSatelliteStateForEcho(
        this.fullEntityManager,
        this.satelliteManager,
        this.viewer
      );

      if (satelliteState) {
        // Pulse 데이터 저장
        this.pulseStorageManager.addPulse(swathId, geometry, satelliteState);

        // 자동 처리 활성화 시에만 배치 조건 확인 및 처리
        // 100개가 되면 자동으로 처리 (Signal 결과 패널 열기) 후 종료
        if (this.autoProcessEnabled) {
          const pulseCount = this.pulseStorageManager.getTotalPulseCount();
          if (pulseCount >= 100) {
            // 100개 도달 시 자동 처리 (Signal 결과 패널 열기) 후 종료
            this.processAllPulses(swathParams, true).then(() => {
              // 처리 완료 후 자동 종료
              if (this.autoStopCallback) {
                this.autoStopCallback();
              }
            }).catch(error => {
              console.error('자동 배치 처리 실패:', error);
              // 에러가 발생해도 종료
              if (this.autoStopCallback) {
                this.autoStopCallback();
              }
            });
          }
        }
      }
    };
    
    this.realtimeSwathId = this.swathManager.addRealtimeTrackingSwath(
      getSatellitePosition,
      swathParams,
      options,
      groupId
    );
    
    if (this.realtimeSwathId) {
      this.swathGroupManager.addSwathToGroup(groupId, this.realtimeSwathId);
    }
  }

  /**
   * 배치 조건 확인 및 처리
   */
  private async checkAndProcessBatch(swathParams?: {
    nearRange?: number;
    farRange?: number;
    swathWidth?: number;
    azimuthLength?: number;
  }): Promise<void> {
    if (!this.pulseStorageManager || !this.sarConfigGetter) {
      return;
    }

    const sarConfig = this.sarConfigGetter();
    if (!sarConfig || !sarConfig.prf) {
      return;
    }

    const prf = sarConfig.prf;
    let batchSize = 0;
    let isReady = false;

    // 배치 모드에 따라 배치 크기 계산 및 조건 확인
    if (this.batchMode === 'count') {
      batchSize = this.batchValue;
      isReady = this.pulseStorageManager.isBatchReady(batchSize);
    } else {
      // 시간 모드
      batchSize = this.pulseStorageManager.calculateBatchSize(prf, this.batchValue);
      isReady = this.pulseStorageManager.isBatchReadyByTime(prf, this.batchValue);
    }

    if (!isReady || batchSize === 0) {
      return;
    }

    // 배치 처리
    try {
      await this.processBatch(batchSize, sarConfig, swathParams);
    } catch (error) {
      console.error('배치 처리 실패:', error);
    }
  }

  /**
   * 배치 처리 실행
   */
  private async processBatch(
    batchSize: number,
    sarConfig: any,
    swathParams?: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    }
  ): Promise<any> {
    if (!this.pulseStorageManager) {
      return;
    }

    // 배치 Pulse 데이터 가져오기
    const batchPulses = this.pulseStorageManager.getPulseBatch(batchSize);
    if (batchPulses.length === 0) {
      return null;
    }

    // 합쳐진 Swath 기하 정보 가져오기
    const mergedGeometry = this.pulseStorageManager.getMergedSwathGeometry(batchSize);
    if (!mergedGeometry) {
      return null;
    }

    // 타겟 생성
    const firstPulse = batchPulses[0];
    const targets = convertSwathToTargets(mergedGeometry, {
      rangeResolution: 1000,
      azimuthResolution: 1000,
      defaultReflectivity: 100.0,
      satellitePosition: firstPulse.satelliteState.position as [number, number, number],
      sarConfig: sarConfig
    });

    if (targets.length === 0) {
      console.warn('타겟이 생성되지 않았습니다.');
      return;
    }

    // 위성 상태 배열 추출
    const satelliteStates = batchPulses.map(p => p.satelliteState);

    // SAR 설정을 API 요청 형식으로 변환
    const configRequest = convertSarConfigToRequest(sarConfig);

    // 백엔드 API 호출
    try {
      const echoResult = await simulateMultipleEchoes(configRequest, targets, satelliteStates);
      
      const result = {
        echoResult,
        batchSize: batchPulses.length,
        mergedGeometry,
        targets
      };

      // 결과 처리 (자동 처리 시에만 콜백 호출)
      if (this.autoProcessEnabled && this.batchProcessingCallback) {
        this.batchProcessingCallback(result);
      }

      // 처리 완료된 배치의 Pulse 데이터 제거
      this.pulseStorageManager.clearBatch(batchSize);
      
      return result;
    } catch (error: any) {
      console.error('Echo 시뮬레이션 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 Swath 추적 중지
   * @param processPulses 종료 시 쌓인 Pulse를 처리할지 여부
   * @param swathParams Swath 파라미터 (Pulse 처리 시 필요)
   */
  async stopRealtimeSwathTracking(processPulses: boolean = false, swathParams?: {
    nearRange?: number;
    farRange?: number;
    swathWidth?: number;
    azimuthLength?: number;
  }): Promise<any> {
    let result = null;

    // Pulse 처리 (종료 시)
    if (processPulses && this.pulseStorageManager && this.pulseStorageManager.getTotalPulseCount() > 0) {
      try {
        result = await this.processAllPulses(swathParams, true);
      } catch (error) {
        console.error('종료 시 Pulse 처리 실패:', error);
      }
    }

    if (this.realtimeSwathId) {
      this.swathGroupManager.endRealtimeGroup();
      this.swathManager.removeSwath(this.realtimeSwathId);
      this.realtimeSwathId = null;
    }

    // PulseStorageManager 초기화
    if (this.pulseStorageManager) {
      this.pulseStorageManager.clearPulses();
      this.pulseStorageManager = null;
    }

    return result;
  }

  /**
   * 모든 쌓인 Pulse 처리
   * @param swathParams Swath 파라미터
   * @param showSignalResults Signal 결과 패널을 열지 여부
   */
  async processAllPulses(
    swathParams?: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    },
    showSignalResults: boolean = false
  ): Promise<any> {
    if (!this.pulseStorageManager || !this.sarConfigGetter) {
      return null;
    }

    const totalPulseCount = this.pulseStorageManager.getTotalPulseCount();
    if (totalPulseCount === 0) {
      return null;
    }

    const sarConfig = this.sarConfigGetter();
    if (!sarConfig || !sarConfig.prf) {
      return null;
    }

    // 모든 Pulse 처리
    try {
      const result = await this.processBatch(totalPulseCount, sarConfig, swathParams);
      
      // Signal 결과 패널을 열어야 하는 경우
      if (showSignalResults && this.batchProcessingCallback) {
        this.batchProcessingCallback(result);
      }

      return result;
    } catch (error) {
      console.error('전체 Pulse 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 현재 쌓인 Pulse 개수 가져오기
   */
  getCurrentPulseCount(): number {
    if (!this.pulseStorageManager) {
      return 0;
    }
    return this.pulseStorageManager.getTotalPulseCount();
  }
}
