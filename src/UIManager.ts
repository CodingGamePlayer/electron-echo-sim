import { SatelliteManager } from './SatelliteManager.js';
import { EntityManager } from './EntityManager.js';
import { SARSwathGeometry } from './types/sar-swath.types.js';

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
  private staticModeControls: HTMLDivElement | null;
  private staticAddSwathBtn: HTMLButtonElement | null;
  private isRealtimeTrackingActive: boolean;
  private swathGroupsToggleFromTab: HTMLButtonElement | null;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.tleInput = null;
    this.useTLECheckbox = null;
    this.applyTLEButton = null;
    this.realtimeTrackingToggle = null;
    this.realtimeTrackingControls = null;
    this.staticModeControls = null;
    this.staticAddSwathBtn = null;
    this.isRealtimeTrackingActive = false;
    this.swathGroupsToggleFromTab = null;
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
    this.staticModeControls = document.getElementById('staticModeControls') as HTMLDivElement;
    this.staticAddSwathBtn = document.getElementById('staticAddSwathBtn') as HTMLButtonElement;

    if (this.tleInput) {
      this.tleInput.value = defaultTLE;
    }

    if (this.useTLECheckbox) {
      this.useTLECheckbox.checked = true;
    }

    this.setupTLEHandlers();
    this.setupSwathControlHandlers();
    this.setupRealtimeTrackingButton();
    this.setupStaticModeButton();
    this.setupSwathGroupsSidebar();
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
    const alphaValue = document.getElementById('alphaValue') as HTMLSpanElement;

    if (!swathMode) {
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

    // 모드 변경 시 버튼 표시 제어
    swathMode.addEventListener('change', () => {
      // 실시간 추적 모드일 때
      if (swathMode.value === 'realtime_tracking') {
        // 실시간 추적 컨트롤 표시
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'block';
        }
        // 정적 모드 컨트롤 숨김
        if (this.staticModeControls) {
          this.staticModeControls.style.display = 'none';
        }
        
        // 실시간 추적이 실행 중이면 중지
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
          this.updateRealtimeTrackingButton();
        }
      } else if (swathMode.value === 'static') {
        // 정적 모드일 때는 정적 모드 컨트롤 표시
        if (this.staticModeControls) {
          this.staticModeControls.style.display = 'block';
        }
        // 실시간 추적 컨트롤 숨김
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'none';
        }
        
        // 실시간 추적이 실행 중이면 중지
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
        }
      } else {
        // 다른 모드일 때는 모든 컨트롤 숨김
        if (this.realtimeTrackingControls) {
          this.realtimeTrackingControls.style.display = 'none';
        }
        if (this.staticModeControls) {
          this.staticModeControls.style.display = 'none';
        }
        
        // 실시간 추적이 실행 중이면 중지
        if (this.isRealtimeTrackingActive) {
          this.entityManager.stopRealtimeSwathTracking();
          this.isRealtimeTrackingActive = false;
        }
      }
      
      // 미리보기 업데이트
      this.updateSwathPreview();
      // 그룹 목록 업데이트
      this.updateSwathGroupsList();
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
    
    // 초기 미리보기 표시
    this.updateSwathPreview();
  }


  /**
   * 정적 Swath 추가
   */
  private addStaticSwath(
    options: any,
    swathParams: any
  ): void {
    try {
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
    // 그룹 목록 업데이트
    this.updateSwathGroupsList();
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
      // 그룹 목록 업데이트
      this.updateSwathGroupsList();
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
      // 미리보기 제거 (실제 Swath 추가 시)
      this.entityManager.clearSwathPreview();
      
      // 정적 Swath 추가
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
          
          // 그룹 목록 업데이트
          this.updateSwathGroupsList();
      
      // 미리보기 다시 표시
      this.updateSwathPreview();
      
      // 그룹 목록 업데이트
      this.updateSwathGroupsList();
    });
  }

  /**
   * Swath 그룹 사이드바 설정
   */
  private setupSwathGroupsSidebar(): void {
    const swathGroupsSidebar = document.getElementById('swathGroupsSidebar');
    this.swathGroupsToggleFromTab = document.getElementById('swathGroupsToggleFromTab') as HTMLButtonElement;
    
    if (this.swathGroupsToggleFromTab) {
      this.swathGroupsToggleFromTab.addEventListener('click', () => {
        if (swathGroupsSidebar) {
          swathGroupsSidebar.classList.toggle('collapsed');
          this.updateSwathGroupsToggleButton();
        }
      });
    }
    
    // 초기 버튼 상태 업데이트
    this.updateSwathGroupsToggleButton();
    
    // 초기 그룹 목록 업데이트
    this.updateSwathGroupsList();
    
    // 주기적으로 그룹 목록 업데이트
    setInterval(() => {
      this.updateSwathGroupsList();
    }, 1000);
  }

  /**
   * Swath 그룹 사이드바 토글 버튼 상태 업데이트
   */
  private updateSwathGroupsToggleButton(): void {
    const swathGroupsSidebar = document.getElementById('swathGroupsSidebar');
    if (this.swathGroupsToggleFromTab && swathGroupsSidebar) {
      const isCollapsed = swathGroupsSidebar.classList.contains('collapsed');
      this.swathGroupsToggleFromTab.textContent = isCollapsed ? '펼치기' : '접기';
    }
  }

  /**
   * Swath 그룹 목록 업데이트
   */
  private updateSwathGroupsList(): void {
    const swathGroupsList = document.getElementById('swathGroupsList');
    if (!swathGroupsList) return;

    const groupManager = this.entityManager.getSwathGroupManager();
    const groups = groupManager.getAllGroups();
    
    // 실시간 추적 그룹의 Swath 동기화
    groupManager.syncSwathsFromManager();

    if (groups.length === 0) {
      swathGroupsList.innerHTML = '<div class="info" style="text-align: center; color: #888; padding: 20px;">생성된 그룹이 없습니다.</div>';
      return;
    }

    swathGroupsList.innerHTML = groups.map(group => {
      const createdAt = new Date(group.createdAt).toLocaleString('ko-KR');
      const endedAt = group.endedAt ? new Date(group.endedAt).toLocaleString('ko-KR') : null;
      const duration = group.endedAt 
        ? `(${Math.round((group.endedAt - group.createdAt) / 1000)}초)`
        : '(진행 중)';
      
      return `
        <div class="swath-group-item" data-group-id="${group.id}">
          <div class="swath-group-header">
            <div>
              <div class="swath-group-name">${group.name}</div>
              <div class="swath-group-count">${group.swathIds.length}개 Swath</div>
            </div>
            <button class="swath-group-remove" data-group-id="${group.id}">삭제</button>
          </div>
          <div class="swath-group-time">
            생성: ${createdAt} ${duration}
          </div>
        </div>
      `;
    }).join('');

    // 삭제 버튼 이벤트 리스너 추가
    swathGroupsList.querySelectorAll('.swath-group-remove').forEach(button => {
      button.addEventListener('click', (e) => {
        const groupId = (e.target as HTMLElement).getAttribute('data-group-id');
        if (groupId) {
          const groupManager = this.entityManager.getSwathGroupManager();
          groupManager.removeGroup(groupId);
          this.updateSwathGroupsList();
        }
      });
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
