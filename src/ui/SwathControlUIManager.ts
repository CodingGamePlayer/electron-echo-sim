import { EntityManager } from '../entity/EntityManager.js';
import { SARSwathGeometry } from '../types/sar-swath.types.js';

/**
 * Swath 제어 UI 관리
 */
export class SwathControlUIManager {
  private entityManager: EntityManager;
  private realtimeTrackingToggle: HTMLButtonElement | null;
  private realtimeTrackingControls: HTMLDivElement | null;
  private staticModeControls: HTMLDivElement | null;
  private staticAddSwathBtn: HTMLButtonElement | null;
  private isRealtimeTrackingActive: boolean;
  private onGroupListUpdate?: () => void;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    this.realtimeTrackingToggle = null;
    this.realtimeTrackingControls = null;
    this.staticModeControls = null;
    this.staticAddSwathBtn = null;
    this.isRealtimeTrackingActive = false;
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
   * 정적 Swath 추가
   */
  private addStaticSwath(options: any, swathParams: any): void {
    try {
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
      
      if (this.onGroupListUpdate) {
        this.onGroupListUpdate();
      }
    } catch (error: any) {
      console.error('Swath 추가 실패:', error);
      alert('Swath 추가 실패: ' + error.message);
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

    this.staticAddSwathBtn.addEventListener('click', () => {
      this.entityManager.clearSwathPreview();
      
      const swathNearRange = document.getElementById('swathNearRange') as HTMLInputElement;
      const swathWidth = document.getElementById('swathWidth') as HTMLInputElement;
      const swathAzimuthLength = document.getElementById('swathAzimuthLength') as HTMLInputElement;
      const swathColor = document.getElementById('swathColor') as HTMLSelectElement;
      const swathAlpha = document.getElementById('swathAlpha') as HTMLInputElement;

      this.addStaticSwath(
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
      
      this.updateSwathPreview();
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
}
