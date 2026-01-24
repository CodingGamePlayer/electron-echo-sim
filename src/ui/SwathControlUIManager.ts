import { EntityManager } from '../entity/EntityManager.js';
import { SARSwathGeometry } from '../types/sar-swath.types.js';
import { calculateSwathParamsFromSarConfig, validateSarConfig, SarSystemConfig, SwathParams } from '../utils/swath-param-calculator.js';
import { SarConfigUIManager } from './SarConfigUIManager.js';
import { SignalVisualizationPanel } from './SignalVisualizationPanel.js';
import { convertSwathToTargets } from '../utils/swath-to-target-converter.js';
import { getCurrentSatelliteStateForEcho } from '../utils/satellite-state-helper.js';
import { generateChirpSignal, convertSarConfigToRequest, SarSystemConfigRequest } from '../utils/chirp-api-client.js';
import { simulateEcho } from '../utils/echo-api-client.js';
import { SignalDataProcessor } from '../utils/signal-data-processor.js';
import { ChirpSimulationResponse, EchoSimulationResponse } from '../types/signal.types.js';
import { SatelliteManager } from '../satellite/SatelliteManager.js';

/**
 * Swath 제어 UI 관리
 */
export class SwathControlUIManager {
  private entityManager: EntityManager;
  private satelliteManager?: SatelliteManager;
  private sarConfigUIManager?: SarConfigUIManager;
  private signalVisualizationPanel?: SignalVisualizationPanel;
  private viewer?: any;
  private realtimeTrackingToggle: HTMLButtonElement | null;
  private realtimeTrackingControls: HTMLDivElement | null;
  private staticModeControls: HTMLDivElement | null;
  private staticAddSwathBtn: HTMLButtonElement | null;
  private isRealtimeTrackingActive: boolean;
  private onGroupListUpdate?: () => void;

  constructor(
    entityManager: EntityManager,
    sarConfigUIManager?: SarConfigUIManager,
    satelliteManager?: SatelliteManager,
    viewer?: any
  ) {
    this.entityManager = entityManager;
    this.sarConfigUIManager = sarConfigUIManager;
    this.satelliteManager = satelliteManager;
    this.viewer = viewer;
    this.realtimeTrackingToggle = null;
    this.realtimeTrackingControls = null;
    this.staticModeControls = null;
    this.staticAddSwathBtn = null;
    this.isRealtimeTrackingActive = false;
  }

  /**
   * Signal 시각화 패널 설정
   */
  setSignalVisualizationPanel(panel: SignalVisualizationPanel): void {
    this.signalVisualizationPanel = panel;
  }

  /**
   * Swath 제어 UI 초기화
   */
  initialize(onGroupListUpdate?: () => void): void {
    this.onGroupListUpdate = onGroupListUpdate;
    this.realtimeTrackingToggle = document.getElementById('realtimeTrackingToggle') as HTMLButtonElement;
    this.realtimeTrackingControls = document.getElementById('realtimeTrackingControls') as HTMLDivElement;
    this.staticModeControls = document.getElementById('staticModeControls') as HTMLDivElement;
    this.staticAddSwathBtn = document.getElementById('staticAddSwathBtn') as HTMLButtonElement;

    this.setupSwathControlHandlers();
    this.setupRealtimeTrackingButton();
    this.setupStaticModeButton();
    this.updateSwathPreview();
  }

  /**
   * Swath 제어 패널 핸들러 설정
   */
  private setupSwathControlHandlers(): void {
    const swathMode = document.getElementById('swathMode') as HTMLSelectElement;
    const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
    const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;
    const swathMaxCount = document.getElementById('swathMaxCount') as HTMLInputElement;
    const swathUpdateInterval = document.getElementById('swathUpdateInterval') as HTMLInputElement;
    const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
    const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
    const swathHeadingOffset = document.getElementById('swathHeadingOffset') as HTMLInputElement;
    const alphaValue = document.getElementById('alphaValue') as HTMLSpanElement;

    if (!swathMode) {
      return;
    }

    // 투명도 슬라이더 업데이트
    if (swathAlpha && alphaValue) {
      swathAlpha.addEventListener('input', () => {
        alphaValue.textContent = swathAlpha.value;
        this.applyRealtimeTrackingOptionsIfActive();
      });
    }

    // Heading 오프셋 변경 시 즉시 적용 및 미리보기 업데이트
    if (swathHeadingOffset) {
      swathHeadingOffset.addEventListener('change', () => {
        const offset = parseFloat(swathHeadingOffset.value || '0');
        this.entityManager.setHeadingOffset(offset);
        this.applyRealtimeTrackingOptionsIfActive();
        this.updateSwathPreview();
      });
      swathHeadingOffset.addEventListener('input', () => {
        const offset = parseFloat(swathHeadingOffset.value || '0');
        this.entityManager.setHeadingOffset(offset);
        this.applyRealtimeTrackingOptionsIfActive();
        this.updateSwathPreview();
      });
    }

    // 옵션 변경 시 실시간 추적이 실행 중이면 즉시 적용 및 미리보기 업데이트
    const optionInputs = [
      swathColor, swathAlpha, swathMaxCount, swathNearRange, swathWidth, swathAzimuthLength, swathUpdateInterval
    ];

    optionInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => {
          this.applyRealtimeTrackingOptionsIfActive();
          this.updateSwathPreview();
        });
        // 숫자 입력 필드는 input 이벤트도 감지
        if (input.type === 'number') {
          input.addEventListener('input', () => {
            this.applyRealtimeTrackingOptionsIfActive();
            this.updateSwathPreview();
          });
        }
      }
    });

    // 모드 변경 시 버튼 표시 제어
    swathMode.addEventListener('change', () => {
      if (swathMode.value === 'realtime_tracking') {
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'block';
        }
        if (this.staticModeControls) {
          this.staticModeControls.style.display = 'none';
        }
        
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
          this.updateRealtimeTrackingButton();
        }
      } else if (swathMode.value === 'static') {
        if (this.staticModeControls) {
          this.staticModeControls.style.display = 'block';
        }
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'none';
        }
        
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
        }
      } else {
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'none';
        }
        if (this.staticModeControls) {
          this.staticModeControls.style.display = 'none';
        }
        
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
        }
      }
      
      this.updateSwathPreview();
      if (this.onGroupListUpdate) {
        this.onGroupListUpdate();
      }
    });
    
    // 초기 모드에 따라 컨트롤 표시/숨김 설정
    if (swathMode.value === 'realtime_tracking') {
      if (this.realtimeTrackingControls) {
        this.realtimeTrackingControls.style.display = 'block';
      }
      if (this.staticModeControls) {
        this.staticModeControls.style.display = 'none';
      }
    } else if (swathMode.value === 'static') {
      if (this.staticModeControls) {
        this.staticModeControls.style.display = 'block';
      }
      if (this.realtimeTrackingControls) {
        this.realtimeTrackingControls.style.display = 'none';
      }
    } else {
      if (this.realtimeTrackingControls) {
        this.realtimeTrackingControls.style.display = 'none';
      }
      if (this.staticModeControls) {
        this.staticModeControls.style.display = 'none';
      }
    }
    
    this.updateSwathPreview();
  }

  /**
   * 정적 Swath 추가 (Signal 생성 포함)
   */
  private async addStaticSwath(options: any, swathParams: any): Promise<void> {
    try {
      // 1. 현재 SAR 설정 확인
      const sarConfig = this.sarConfigUIManager?.getCurrentSarConfig();
      if (!sarConfig) {
        alert('먼저 SAR 설정을 불러오세요.');
        return;
      }

      // 2. 현재 위성 위치 확인
      const currentPosition = this.entityManager.getCurrentSatellitePosition();
      if (!currentPosition) {
        alert('위성 위치를 가져올 수 없습니다. TLE가 활성화되어 있는지 확인하세요.');
        return;
      }

      // 3. Swath 기하 정보 생성
      const geometry: SARSwathGeometry = {
        centerLat: currentPosition.latitude,
        centerLon: currentPosition.longitude,
        heading: currentPosition.heading,
        nearRange: swathParams.nearRange,
        farRange: swathParams.farRange,
        swathWidth: swathParams.swathWidth,
        azimuthLength: swathParams.azimuthLength,
        satelliteAltitude: currentPosition.altitude,
      };

      // 4. Swath 추가 (기존 로직)
      const swathId = this.entityManager.addStaticSwath(geometry, options);
      
      if (this.onGroupListUpdate) {
        this.onGroupListUpdate();
      }

      // 5. Signal 생성 및 시각화
      try {
        await this.generateAndDisplaySignals(geometry, sarConfig);
      } catch (signalError: any) {
        console.error('Signal 생성 실패:', signalError);
        // Signal 생성 실패해도 Swath는 추가됨
        const errorMessage = signalError.message || '알 수 없는 오류가 발생했습니다.';
        alert(`Signal 생성 실패\n\n${errorMessage}\n\nSwath는 추가되었지만 Signal 결과를 표시할 수 없습니다.`);
      }
    } catch (error: any) {
      console.error('Swath 추가 실패:', error);
      alert('Swath 추가 실패: ' + error.message);
    }
  }

  /**
   * SAR 설정 검증
   */
  private validateSarConfig(sarConfig: any): void {
    // 기본 검증만 유지
    if (sarConfig.fs <= 0 || sarConfig.bw <= 0) {
      throw new Error('샘플링 주파수(fs)와 대역폭(bw)은 0보다 커야 합니다.');
    }

    if (sarConfig.fs <= sarConfig.bw) {
      throw new Error('샘플링 주파수(fs)는 대역폭(bw)보다 커야 합니다.');
    }
    
    // 나이키스트 샘플링 검증 제거 (백엔드에서 경고로 처리)
  }

  /**
   * Signal 생성 및 표시
   */
  private async generateAndDisplaySignals(
    geometry: SARSwathGeometry,
    sarConfig: any
  ): Promise<void> {
    if (!this.satelliteManager || !this.viewer) {
      throw new Error('SatelliteManager 또는 Viewer가 설정되지 않았습니다.');
    }

    // SAR 설정 검증
    try {
      this.validateSarConfig(sarConfig);
    } catch (validationError: any) {
      throw new Error(`SAR 설정 검증 실패: ${validationError.message}`);
    }

    // SAR 설정을 API 요청 형식으로 변환
    const configRequest = convertSarConfigToRequest(sarConfig);

    // 1. SAR Signal (Chirp) 생성
    let chirpResult: ChirpSimulationResponse;
    try {
      chirpResult = await generateChirpSignal(configRequest);
    } catch (error: any) {
      throw new Error(`Chirp 신호 생성 실패: ${error.message}`);
    }

    // 2. 위성 상태 가져오기 (타겟 생성 전에 필요)
    const satelliteState = getCurrentSatelliteStateForEcho(
      this.entityManager,
      this.satelliteManager,
      this.viewer
    );
    if (!satelliteState) {
      throw new Error('위성 위치를 가져올 수 없습니다.');
    }

    // 3. Swath → 타겟 변환 (샘플링 윈도우 내에 배치)
    const targets = convertSwathToTargets(geometry, {
      rangeResolution: 1000,    // 1km 해상도
      azimuthResolution: 1000,
      defaultReflectivity: 100.0,  // 반사도 증가 (백엔드 테스트와 동일하게)
      satellitePosition: satelliteState.position as [number, number, number],
      sarConfig: sarConfig
    });

    if (targets.length === 0) {
      throw new Error('타겟이 생성되지 않았습니다.');
    }

    console.log('타겟 생성 완료:', {
      targetCount: targets.length,
      firstTarget: targets[0],
      geometry: geometry
    });

    console.log('위성 상태:', {
      position: satelliteState.position,
      velocity: satelliteState.velocity,
      beamDirection: satelliteState.beam_direction
    });

    // 4. Echo Signal 생성
    let echoResult: EchoSimulationResponse;
    try {
      console.log('Echo API 호출 시작...', {
        config: configRequest,
        targetCount: targets.length,
        satelliteState: satelliteState
      });
      echoResult = await simulateEcho(configRequest, targets, satelliteState);
      console.log('Echo API 응답:', {
        num_samples: echoResult.num_samples,
        shape: echoResult.shape,
        dataLength: echoResult.data.length
      });
    } catch (error: any) {
      console.error('Echo API 오류 상세:', error);
      throw new Error(`Echo 신호 생성 실패: ${error.message}`);
    }

      // 5. 결과 시각화
      console.log('Signal 생성 완료:', {
        chirpSamples: chirpResult.num_samples,
        echoSamples: echoResult.num_samples,
        chirpShape: chirpResult.shape,
        echoShape: echoResult.shape
      });
      this.displaySignalResults(chirpResult, echoResult, sarConfig);
  }

  /**
   * Signal 결과 표시
   */
  private displaySignalResults(
    chirpResult: ChirpSimulationResponse,
    echoResult: EchoSimulationResponse,
    config: any
  ): void {
    if (!this.signalVisualizationPanel) {
      console.warn('Signal 시각화 패널이 설정되지 않았습니다.');
      return;
    }

    try {
      // 데이터 디코딩
      const chirpData = SignalDataProcessor.decodeBase64ComplexData(
        chirpResult.data,
        chirpResult.shape
      );
      const echoData = SignalDataProcessor.decodeBase64ComplexData(
        echoResult.data,
        echoResult.shape
      );

      // 통계 계산
      const chirpStats = SignalDataProcessor.computeStatistics(chirpData);
      const echoStats = SignalDataProcessor.computeStatistics(echoData);

      // 시각화
      console.log('Signal 데이터 디코딩 완료:', {
        chirpSamples: chirpData.real.length,
        echoSamples: echoData.real.length,
        chirpMax: chirpStats.max,
        echoMax: echoStats.max
      });
      
      // 사이드바를 먼저 열고, 그 다음에 Canvas를 그립니다
      if (!this.signalVisualizationPanel) {
        console.warn('Signal 시각화 패널이 설정되지 않았습니다.');
        return;
      }
      
      this.signalVisualizationPanel.show();
      
      // 사이드바가 완전히 렌더링된 후 Canvas 그리기
      setTimeout(() => {
        if (this.signalVisualizationPanel) {
      this.signalVisualizationPanel.displayChirpSignal(chirpData, config, { normalize: false });
      // Echo Signal은 값이 매우 작으므로 정규화하여 표시 (최대값으로 나누어 0~1 범위로)
      this.signalVisualizationPanel.displayEchoSignal(echoData, config, { normalize: true });
      this.signalVisualizationPanel.displayStatistics(chirpStats, echoStats);
          console.log('Signal 패널 표시 완료');
        }
      }, 100);
    } catch (error: any) {
      console.error('Signal 시각화 실패:', error);
      throw new Error(`Signal 시각화 실패: ${error.message}`);
    }
  }

  /**
   * 실시간 추적이 실행 중일 때 옵션 변경 시 즉시 적용
   */
  private applyRealtimeTrackingOptionsIfActive(): void {
    if (!this.isRealtimeTrackingActive) {
      return;
    }

    const swathMode = document.getElementById('swathMode') as HTMLSelectElement;
    if (!swathMode || swathMode.value !== 'realtime_tracking') {
      return;
    }

    const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
    const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
    const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
    const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;
    const swathMaxCount = document.getElementById('swathMaxCount') as HTMLInputElement;
    const swathUpdateInterval = document.getElementById('swathUpdateInterval') as HTMLInputElement;

    this.entityManager.stopRealtimeSwathTracking();

    this.entityManager.startRealtimeSwathTracking(
      {
        nearRange: parseFloat(swathNearRange?.value || '200000'),
        farRange: this.calculateFarRange(),
        swathWidth: parseFloat(swathWidth?.value || '50000'),
        azimuthLength: parseFloat(swathAzimuthLength?.value || '50000'),
      },
      {
        color: swathColor?.value || 'CYAN',
        alpha: parseFloat(swathAlpha?.value || '0.05'),
        outlineColor: 'YELLOW',
        outlineWidth: 2,
        showLabel: false,
        maxSwaths: parseInt(swathMaxCount?.value || '50'),
        updateInterval: parseInt(swathUpdateInterval?.value || '200'),
      }
    );
    
    if (this.onGroupListUpdate) {
      this.onGroupListUpdate();
    }
  }

  /**
   * 실시간 추적 버튼 설정
   */
  private setupRealtimeTrackingButton(): void {
    if (!this.realtimeTrackingToggle) {
      return;
    }

    this.realtimeTrackingToggle.addEventListener('click', () => {
      if (this.isRealtimeTrackingActive) {
        this.entityManager.stopRealtimeSwathTracking();
        this.isRealtimeTrackingActive = false;
      } else {
        const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
        const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
        const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
        const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
        const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;
        const swathMaxCount = document.getElementById('swathMaxCount') as HTMLInputElement;
        const swathUpdateInterval = document.getElementById('swathUpdateInterval') as HTMLInputElement;

        this.entityManager.startRealtimeSwathTracking(
          {
            nearRange: parseFloat(swathNearRange?.value || '200000'),
            farRange: this.calculateFarRange(),
            swathWidth: parseFloat(swathWidth?.value || '400000'),
            azimuthLength: parseFloat(swathAzimuthLength?.value || '50000'),
          },
          {
            color: swathColor?.value || 'PURPLE',
            alpha: parseFloat(swathAlpha?.value || '0.05'),
            maxSwaths: parseInt(swathMaxCount?.value || '1000'),
            updateInterval: parseInt(swathUpdateInterval?.value || '200'),
          }
        );
        this.isRealtimeTrackingActive = true;
      }
      
      this.updateRealtimeTrackingButton();
      if (this.onGroupListUpdate) {
        this.onGroupListUpdate();
      }
    });
  }

  /**
   * 실시간 추적 버튼 상태 업데이트
   */
  private updateRealtimeTrackingButton(): void {
    if (this.realtimeTrackingToggle) {
      if (this.isRealtimeTrackingActive) {
        this.realtimeTrackingToggle.textContent = '종료';
        this.realtimeTrackingToggle.style.background = '#f44336';
      } else {
        this.realtimeTrackingToggle.textContent = '시작';
        this.realtimeTrackingToggle.style.background = '#4CAF50';
      }
    }
  }

  /**
   * 정적 모드 버튼 설정
   */
  private setupStaticModeButton(): void {
    if (!this.staticAddSwathBtn) {
      return;
    }

    this.staticAddSwathBtn.addEventListener('click', async () => {
      this.entityManager.clearSwathPreview();
      
      const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
      const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
      const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
      const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
      const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;

      // 로딩 표시
      if (!this.staticAddSwathBtn) {
        return;
      }
      
      const originalText = this.staticAddSwathBtn.textContent;
      this.staticAddSwathBtn.textContent = '처리 중...';
      this.staticAddSwathBtn.disabled = true;

      try {
        await this.addStaticSwath(
          {
            color: swathColor?.value || 'PURPLE',
            alpha: parseFloat(swathAlpha?.value || '0.001'),
            maxSwaths: 1000,
          },
          {
            nearRange: parseFloat(swathNearRange?.value || '200000'),
            farRange: this.calculateFarRange(),
            swathWidth: parseFloat(swathWidth?.value || '400000'),
            azimuthLength: parseFloat(swathAzimuthLength?.value || '50000'),
          }
        );
      } finally {
        // 버튼 복원
        if (this.staticAddSwathBtn) {
          this.staticAddSwathBtn.textContent = originalText;
          this.staticAddSwathBtn.disabled = false;
        }
        this.updateSwathPreview();
      }
    });
  }

  /**
   * Far Range 계산 (Near Range + Swath Width)
   */
  private calculateFarRange(): number {
    const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
    const nearRange = parseFloat(swathNearRange?.value || '200000');
    const swathWidthValue = parseFloat(swathWidth?.value || '400000');
    return nearRange + swathWidthValue;
  }

  /**
   * Swath 미리보기 업데이트
   */
  private updateSwathPreview(): void {
    const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
    const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
    const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
    const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;

    this.entityManager.updateSwathPreview(
      {
        nearRange: parseFloat(swathNearRange?.value || '200000'),
        farRange: this.calculateFarRange(),
        swathWidth: parseFloat(swathWidth?.value || '50000'),
        azimuthLength: parseFloat(swathAzimuthLength?.value || '50000'),
      },
      {
        color: swathColor?.value || 'YELLOW',
        alpha: parseFloat(swathAlpha?.value || '0.3'),
      }
    );
  }

  /**
   * SAR 설정에서 계산된 Swath 파라미터를 UI에 적용
   * 
   * @param sarConfig SAR 시스템 설정
   */
  applySarConfigToSwathParams(sarConfig: SarSystemConfig): void {
    try {
      // SAR 설정 값 검증
      validateSarConfig(sarConfig);
      
      // Swath 파라미터 계산
      const swathParams = calculateSwathParamsFromSarConfig(sarConfig);
      
      // UI 입력 필드 업데이트
      const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
      const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
      const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
      
      if (swathNearRange) {
        swathNearRange.value = Math.round(swathParams.nearRange).toString();
      }
      if (swathWidth) {
        swathWidth.value = Math.round(swathParams.swathWidth).toString();
      }
      if (swathAzimuthLength) {
        swathAzimuthLength.value = Math.round(swathParams.azimuthLength).toString();
      }
      
      // 실시간 추적이 실행 중이면 옵션 재적용
      this.applyRealtimeTrackingOptionsIfActive();
      
      // 미리보기 업데이트
      this.updateSwathPreview();
    } catch (error: any) {
      console.error('SAR 설정에서 Swath 파라미터 계산 실패:', error);
      alert('SAR 설정 적용 실패: ' + error.message);
    }
  }
}
