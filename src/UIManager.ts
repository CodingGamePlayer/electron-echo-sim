import { SatelliteManager } from './SatelliteManager.js';
import { EntityManager } from './EntityManager.js';
import { SwathMode, SARSwathGeometry } from './types/sar-swath.types.js';

/**
 * UIManager - UI 이벤트 처리
 */
export class UIManager {
  private satelliteManager: SatelliteManager;
  private entityManager: EntityManager;
  private tleInput: HTMLTextAreaElement | null;
  private useTLECheckbox: HTMLInputElement | null;
  private applyTLEButton: HTMLButtonElement | null;
  private realtimeTrackingToggle: HTMLButtonElement | null;
  private realtimeTrackingControls: HTMLDivElement | null;
  private isRealtimeTrackingActive: boolean;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.tleInput = null;
    this.useTLECheckbox = null;
    this.applyTLEButton = null;
    this.realtimeTrackingToggle = null;
    this.realtimeTrackingControls = null;
    this.isRealtimeTrackingActive = false;
  }

  /**
   * UI 초기화
   */
  initialize(defaultTLE: string): void {
    this.tleInput = document.getElementById('tleInput') as HTMLTextAreaElement;
    this.useTLECheckbox = document.getElementById('useTLE') as HTMLInputElement;
    this.applyTLEButton = document.getElementById('applyTLE') as HTMLButtonElement;
    this.realtimeTrackingToggle = document.getElementById('realtimeTrackingToggle') as HTMLButtonElement;
    this.realtimeTrackingControls = document.getElementById('realtimeTrackingControls') as HTMLDivElement;

    if (this.tleInput) {
      this.tleInput.value = defaultTLE;
    }

    if (this.useTLECheckbox) {
      this.useTLECheckbox.checked = true;
    }

    this.setupTLEHandlers();
    this.setupSwathControlHandlers();
    this.setupRealtimeTrackingButton();
    this.updateSwathInfo();
  }

  /**
   * TLE 입력 이벤트 핸들러 설정
   */
  setupTLEHandlers(): void {
    if (!this.applyTLEButton || !this.tleInput || !this.useTLECheckbox) {
      return;
    }

    // TLE 적용 버튼
    this.applyTLEButton.addEventListener('click', () => {
      const tleText = this.tleInput!.value.trim();
      if (!tleText) {
        alert('TLE 데이터를 입력하세요.');
        return;
      }
      
      try {
        // TLE 유효성 검사
        const testTime = Cesium.JulianDate.now();
        const tempManager = new SatelliteManager(tleText);
        const testPosition = tempManager.calculatePosition(testTime);
        
        if (!testPosition) {
          alert('TLE 데이터가 올바르지 않습니다.');
          return;
        }
        
        // TLE 데이터 저장
        this.satelliteManager.setTLE(tleText);
        
        // 초기 위치 계산 및 업데이트
        const startTime = Cesium.JulianDate.now();
        const initialPos = this.satelliteManager.calculatePosition(startTime);
        if (initialPos) {
          this.entityManager.updatePosition(initialPos);
        }
        
        // 예상 경로 다시 그리기
        this.entityManager.updatePredictedPath(4);
        
        alert('TLE가 적용되었습니다.');
      } catch (error: any) {
        alert('TLE 적용 실패: ' + error.message);
        console.error(error);
      }
    });

    // TLE 사용 체크박스
    this.useTLECheckbox.addEventListener('change', () => {
      const useTLE = this.useTLECheckbox!.checked;
      this.satelliteManager.setUseTLE(useTLE);
      
      if (!useTLE) {
        alert('TLE 사용이 비활성화되었습니다. TLE를 계속 사용하려면 체크박스를 다시 활성화하세요.');
      }
    });

    // 위성 고도 오프셋 조정
    const altitudeOffsetInput = document.getElementById('satelliteAltitudeOffset') as HTMLInputElement;
    if (altitudeOffsetInput) {
      altitudeOffsetInput.addEventListener('change', () => {
        const offset = parseFloat(altitudeOffsetInput.value || '0');
        this.entityManager.setAltitudeOffset(offset);
        
        // TLE가 활성화되어 있으면 위치 업데이트
        if (this.satelliteManager.useTLE) {
          const currentTime = Cesium.JulianDate.now();
          const position = this.satelliteManager.calculatePosition(currentTime);
          if (position) {
            this.entityManager.updatePosition(position);
          }
        }
        
        // 실시간 추적이 실행 중이면 재시작하여 변경사항 반영
        this.applyRealtimeTrackingOptionsIfActive();
      });
      altitudeOffsetInput.addEventListener('input', () => {
        const offset = parseFloat(altitudeOffsetInput.value || '0');
        this.entityManager.setAltitudeOffset(offset);
        
        // TLE가 활성화되어 있으면 위치 업데이트
        if (this.satelliteManager.useTLE) {
          const currentTime = Cesium.JulianDate.now();
          const position = this.satelliteManager.calculatePosition(currentTime);
          if (position) {
            this.entityManager.updatePosition(position);
          }
        }
        
        // 실시간 추적이 실행 중이면 재시작하여 변경사항 반영
        this.applyRealtimeTrackingOptionsIfActive();
      });
    }
  }


  /**
   * ✅ Swath 제어 패널 핸들러 설정
   */
  setupSwathControlHandlers(): void {
    const swathMode = document.getElementById('swathMode') as HTMLSelectElement;
    const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
    const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;
    const swathMaxCount = document.getElementById('swathMaxCount') as HTMLInputElement;
    const swathUpdateInterval = document.getElementById('swathUpdateInterval') as HTMLInputElement;
    const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
    const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
    const swathHeadingOffset = document.getElementById('swathHeadingOffset') as HTMLInputElement;
    const addSwathBtn = document.getElementById('addSwathBtn') as HTMLButtonElement;
    const clearAllSwathsBtn = document.getElementById('clearAllSwathsBtn') as HTMLButtonElement;
    const modeSpecificOptions = document.getElementById('modeSpecificOptions') as HTMLDivElement;
    const alphaValue = document.getElementById('alphaValue') as HTMLSpanElement;

    if (!swathMode || !addSwathBtn) {
      return;
    }

    // 투명도 슬라이더 업데이트
    if (swathAlpha && alphaValue) {
      swathAlpha.addEventListener('input', () => {
        alphaValue.textContent = swathAlpha.value;
        // 실시간 추적이 실행 중이면 옵션 적용
        this.applyRealtimeTrackingOptionsIfActive();
      });
    }

    // Heading 오프셋 변경 시 즉시 적용 및 미리보기 업데이트
    if (swathHeadingOffset) {
      swathHeadingOffset.addEventListener('change', () => {
        const offset = parseFloat(swathHeadingOffset.value || '0');
        this.entityManager.setHeadingOffset(offset);
        // 실시간 추적이 실행 중이면 재시작하여 변경사항 적용
        this.applyRealtimeTrackingOptionsIfActive();
        this.updateSwathPreview();
      });
      swathHeadingOffset.addEventListener('input', () => {
        const offset = parseFloat(swathHeadingOffset.value || '0');
        this.entityManager.setHeadingOffset(offset);
        // 실시간 추적이 실행 중이면 재시작하여 변경사항 적용
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

    // 모드 변경 시 모드별 옵션 업데이트 및 버튼/체크박스 표시 제어
    swathMode.addEventListener('change', () => {
      this.updateModeSpecificOptions(swathMode.value, modeSpecificOptions);
      
      // 실시간 추적 모드일 때
      if (swathMode.value === 'realtime_tracking') {
        // 실시간 추적 컨트롤 표시
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'block';
        }
        
        // 실시간 추적이 실행 중이면 중지
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
          this.updateRealtimeTrackingButton();
        }
      } else {
        // 다른 모드일 때는 실시간 추적 컨트롤 숨김
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'none';
        }
        
        // 실시간 추적이 실행 중이면 중지
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
        }
      }
      
      // 미리보기 업데이트
      this.updateSwathPreview();
    });
    
    // 초기 모드에 따라 컨트롤 표시/숨김 설정
    if (swathMode.value === 'realtime_tracking') {
      if (this.realtimeTrackingControls) {
        this.realtimeTrackingControls.style.display = 'block';
      }
    } else {
      if (this.realtimeTrackingControls) {
        this.realtimeTrackingControls.style.display = 'none';
      }
    }
    this.updateModeSpecificOptions(swathMode.value, modeSpecificOptions);
    
    // 초기 미리보기 표시
    this.updateSwathPreview();

    // Swath 추가 버튼
    addSwathBtn.addEventListener('click', () => {
      // 미리보기 제거 (실제 Swath 추가 시)
      this.entityManager.clearSwathPreview();
      
      // 실시간 추적 모드일 때는 시작 버튼 클릭과 동일하게 동작
      if (swathMode.value === 'realtime_tracking') {
        if (!this.isRealtimeTrackingActive && this.realtimeTrackingToggle) {
          this.realtimeTrackingToggle.click();
        }
      } else {
        // 다른 모드일 때는 직접 추가
        this.addSwathByMode(
          swathMode.value,
          {
            color: swathColor?.value || 'PURPLE',
            alpha: parseFloat(swathAlpha?.value || '0.001'),
            maxSwaths: parseInt(swathMaxCount?.value || '1000'),
          },
          {
            nearRange: parseFloat(swathNearRange?.value || '200000'),
              farRange: this.calculateFarRange(),
            swathWidth: parseFloat(swathWidth?.value || '400000'),
            azimuthLength: parseFloat(swathAzimuthLength?.value || '50000'),
          }
        );
        this.updateSwathInfo();
        
        // 미리보기 다시 표시
        this.updateSwathPreview();
      }
    });

    // Swath 초기화 버튼
    if (clearAllSwathsBtn) {
      clearAllSwathsBtn.addEventListener('click', () => {
        // 실시간 추적이 실행 중인지 확인
        const wasRealtimeTrackingActive = this.isRealtimeTrackingActive && 
          swathMode.value === 'realtime_tracking';
        
        // 실시간 추적이 실행 중이었다면 중지
        if (wasRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
        }
        
        // 모든 Swath 제거
        this.entityManager.clearAllSwaths();
        this.updateSwathInfo();
        
        // 실시간 추적이 실행 중이었다면 다시 시작
        if (wasRealtimeTrackingActive) {
          // 제어 패널의 설정값 사용
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
              outlineColor: 'YELLOW',
              outlineWidth: 2,
              showLabel: false,
              maxSwaths: parseInt(swathMaxCount?.value || '1000'),
              updateInterval: parseInt(swathUpdateInterval?.value || '200'),
            }
          );
          this.isRealtimeTrackingActive = true;
          this.updateRealtimeTrackingButton();
        }
      });
    }

    // 주기적으로 Swath 정보 업데이트
    setInterval(() => {
      this.updateSwathInfo();
    }, 1000);
  }

  /**
   * 모드별 옵션 업데이트
   */
  private updateModeSpecificOptions(mode: string, container: HTMLDivElement | null): void {
    if (!container) return;

    container.innerHTML = '';

    switch (mode) {
      case 'static':
        container.innerHTML = '<div class="info">정적 Swath: 고정 위치와 파라미터로 생성됩니다.</div>';
        break;
      case 'realtime_tracking':
        container.innerHTML = '<div class="info">실시간 추적: 위성 위치를 실시간으로 추적하여 Swath를 생성합니다.</div>';
        break;
      case 'predicted_path':
        container.innerHTML = `
          <label>
            예측 시간 (시간):
            <input type="number" id="predictedHours" value="4" min="1" max="24">
          </label>
        `;
        break;
      case 'historical':
        container.innerHTML = '<div class="info">과거 경로: 과거 위성 경로를 기반으로 Swath를 생성합니다.</div>';
        break;
      case 'backend_api':
        container.innerHTML = `
          <label>
            API Endpoint:
            <input type="text" id="apiEndpoint" value="http://localhost:8000" placeholder="http://localhost:8000">
          </label>
          <label>
            Simulation ID:
            <input type="text" id="simulationId" value="" placeholder="simulation-123">
          </label>
        `;
        break;
      case 'custom_geometry':
        container.innerHTML = `
          <div class="info">사용자 정의 기하: 4개의 코너 좌표를 직접 입력하세요.</div>
          <label>
            Top Left (lon, lat):
            <input type="text" id="customTopLeft" value="127.0, 37.5" placeholder="127.0, 37.5">
          </label>
          <label>
            Top Right (lon, lat):
            <input type="text" id="customTopRight" value="128.0, 37.5" placeholder="128.0, 37.5">
          </label>
          <label>
            Bottom Right (lon, lat):
            <input type="text" id="customBottomRight" value="128.0, 36.5" placeholder="128.0, 36.5">
          </label>
          <label>
            Bottom Left (lon, lat):
            <input type="text" id="customBottomLeft" value="127.0, 36.5" placeholder="127.0, 36.5">
          </label>
        `;
        break;
    }
  }

  /**
   * 모드에 따라 Swath 추가
   */
  private async addSwathByMode(
    mode: string,
    options: any,
    swathParams: any
  ): Promise<void> {
    try {
      switch (mode) {
        case 'static': {
          // 현재 위성 위치 기반으로 Swath 생성
          const currentPosition = this.entityManager.getCurrentSatellitePosition();
          if (!currentPosition) {
            alert('위성 위치를 가져올 수 없습니다. TLE가 활성화되어 있는지 확인하세요.');
            return;
          }

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
          this.entityManager.addStaticSwath(geometry, options);
          break;
        }
        case 'realtime_tracking':
          this.entityManager.startRealtimeSwathTracking(swathParams, options);
          break;
        case 'predicted_path': {
          const hoursInput = document.getElementById('predictedHours') as HTMLInputElement;
          const hours = parseFloat(hoursInput?.value || '4');
          this.entityManager.addPredictedSwathPath(hours);
          break;
        }
        case 'historical':
          // 과거 경로는 예측 경로와 동일한 방식으로 처리
          console.warn('과거 경로 기능은 아직 구현되지 않았습니다.');
          break;
        case 'backend_api': {
          const apiEndpoint = (document.getElementById('apiEndpoint') as HTMLInputElement)?.value || 'http://localhost:8000';
          const simulationId = (document.getElementById('simulationId') as HTMLInputElement)?.value || '';
          if (!simulationId) {
            alert('Simulation ID를 입력하세요.');
            return;
          }
          await this.entityManager.addBackendAPISwath(apiEndpoint, simulationId, options);
          break;
        }
        case 'custom_geometry': {
          const topLeft = (document.getElementById('customTopLeft') as HTMLInputElement)?.value.split(',').map(v => parseFloat(v.trim()));
          const topRight = (document.getElementById('customTopRight') as HTMLInputElement)?.value.split(',').map(v => parseFloat(v.trim()));
          const bottomRight = (document.getElementById('customBottomRight') as HTMLInputElement)?.value.split(',').map(v => parseFloat(v.trim()));
          const bottomLeft = (document.getElementById('customBottomLeft') as HTMLInputElement)?.value.split(',').map(v => parseFloat(v.trim()));
          
          if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
            alert('모든 코너 좌표를 입력하세요.');
            return;
          }

          const swathManager = this.entityManager.getSwathManager();
          swathManager.addCustomGeometrySwath(
            {
              topLeft: [topLeft[0], topLeft[1]],
              topRight: [topRight[0], topRight[1]],
              bottomRight: [bottomRight[0], bottomRight[1]],
              bottomLeft: [bottomLeft[0], bottomLeft[1]],
            },
            options
          );
          break;
        }
      }
    } catch (error: any) {
      console.error('Swath 추가 실패:', error);
      alert('Swath 추가 실패: ' + error.message);
    }
  }

  /**
   * 문자열을 SwathMode enum으로 변환
   */
  private getSwathModeFromString(mode: string): SwathMode {
    switch (mode) {
      case 'static': return SwathMode.STATIC;
      case 'realtime_tracking': return SwathMode.REALTIME_TRACKING;
      case 'predicted_path': return SwathMode.PREDICTED_PATH;
      case 'historical': return SwathMode.HISTORICAL;
      case 'backend_api': return SwathMode.BACKEND_API;
      case 'custom_geometry': return SwathMode.CUSTOM_GEOMETRY;
      default: return SwathMode.STATIC;
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

    // 실시간 추적이 실행 중이면 중지하고 새 옵션으로 재시작
    const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
    const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
    const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
    const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;
    const swathMaxCount = document.getElementById('swathMaxCount') as HTMLInputElement;
    const swathUpdateInterval = document.getElementById('swathUpdateInterval') as HTMLInputElement;

    // 기존 실시간 추적 중지
    this.entityManager.stopRealtimeSwathTracking();

    // 새 옵션으로 재시작
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
        // 실시간 추적 중지
        this.entityManager.stopRealtimeSwathTracking();
        this.isRealtimeTrackingActive = false;
      } else {
        // 실시간 추적 시작
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
   * Swath 정보 업데이트
   */
  private updateSwathInfo(): void {
    const swathInfo = document.getElementById('swathInfo');
    if (!swathInfo) return;

    const swathManager = this.entityManager.getSwathManager();
    const totalCount = swathManager.getSwathCount();
    const modeCounts = [
      { mode: SwathMode.STATIC, name: '정적' },
      { mode: SwathMode.REALTIME_TRACKING, name: '실시간' },
      { mode: SwathMode.PREDICTED_PATH, name: '예측' },
      { mode: SwathMode.HISTORICAL, name: '과거' },
      { mode: SwathMode.BACKEND_API, name: 'API' },
      { mode: SwathMode.CUSTOM_GEOMETRY, name: '사용자정의' },
    ];

    const counts = modeCounts
      .map(({ mode, name }) => {
        const count = swathManager.getSwathCountByMode(mode);
        return count > 0 ? `${name}: ${count}` : null;
      })
      .filter(Boolean)
      .join(', ');

    swathInfo.textContent = `Swath 개수: ${totalCount}${counts ? ` (${counts})` : ''}`;
  }
}
