import { SatelliteManager } from './SatelliteManager.js';
import { EntityManager } from './EntityManager.js';
import { SARSwathGeometry } from './types/sar-swath.types.js';
import { SarSystemConfig, SarSystemConfigRecord } from './types/sar-config.types.js';

// Electron API 타입 선언
declare global {
  interface Window {
    electronAPI?: {
      sarConfig: {
        save: (request: { name: string; config: SarSystemConfig }) => Promise<SarSystemConfigRecord>;
        getAll: () => Promise<SarSystemConfigRecord[]>;
        getById: (id: string) => Promise<SarSystemConfigRecord>;
        delete: (id: string) => Promise<boolean>;
      };
    };
  }
}

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
  private selectedGroupId: string | null;

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
    this.selectedGroupId = null;
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
    this.setupSarConfigHandlers();
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
      
      // 선택된 그룹 상태 유지
      this.entityManager.showSwathsByGroupId(this.selectedGroupId);
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
      
      // 그룹 목록 업데이트
      this.updateSwathGroupsList();
      
      // 선택된 그룹이 있으면 해당 그룹의 Swath만 표시 (새로 추가된 Swath도 포함)
      if (this.selectedGroupId) {
        this.entityManager.showSwathsByGroupId(this.selectedGroupId);
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
    
    // 선택된 그룹이 있으면 해당 그룹의 Swath만 표시
    if (this.selectedGroupId) {
      this.entityManager.showSwathsByGroupId(this.selectedGroupId);
    } else {
      // 선택된 그룹이 없으면 모든 Swath 표시
      this.entityManager.showSwathsByGroupId(null);
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
      
      // 선택된 그룹이 있으면 해당 그룹의 Swath만 표시
      if (this.selectedGroupId) {
        this.entityManager.showSwathsByGroupId(this.selectedGroupId);
      } else {
        // 선택된 그룹이 없으면 모든 Swath 표시
        this.entityManager.showSwathsByGroupId(null);
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
          
      // 미리보기 다시 표시
      this.updateSwathPreview();
    });
  }

  /**
   * Swath 그룹 사이드바 설정
   */
  private setupSwathGroupsSidebar(): void {
    const swathGroupsSidebar = document.getElementById('swathGroupsSidebar');
    this.swathGroupsToggleFromTab = document.getElementById('swathGroupsToggleFromTab') as HTMLButtonElement;
    const swathGroupsCloseBtn = document.getElementById('swathGroupsCloseBtn') as HTMLButtonElement;
    
    if (this.swathGroupsToggleFromTab) {
      this.swathGroupsToggleFromTab.addEventListener('click', () => {
        if (swathGroupsSidebar) {
          swathGroupsSidebar.classList.toggle('collapsed');
          this.updateSwathGroupsToggleButton();
        }
      });
    }
    
    // 헤더 닫기 버튼 이벤트 리스너
    if (swathGroupsCloseBtn) {
      swathGroupsCloseBtn.addEventListener('click', () => {
        if (swathGroupsSidebar) {
          swathGroupsSidebar.classList.add('collapsed');
          this.updateSwathGroupsToggleButton();
        }
      });
    }
    
    // 초기 버튼 상태 업데이트
    this.updateSwathGroupsToggleButton();
    
    // 초기 그룹 목록 업데이트
    this.updateSwathGroupsList();
    
    // 주기적으로 그룹 목록 업데이트 (선택된 그룹 상태 유지)
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
    
    // 선택된 그룹이 있으면 해당 그룹의 Swath만 표시, 없으면 모든 Swath 표시
    this.entityManager.showSwathsByGroupId(this.selectedGroupId);

    if (groups.length === 0) {
      swathGroupsList.innerHTML = '<div class="info" style="text-align: center; color: #888; padding: 20px;">생성된 그룹이 없습니다.</div>';
      return;
    }

    swathGroupsList.innerHTML = groups.map(group => {
      const createdAt = new Date(group.createdAt).toLocaleString('ko-KR');
      const endedAt = group.endedAt ? new Date(group.endedAt).toLocaleString('ko-KR') : null;
      const isInProgress = !group.endedAt;
      const duration = isInProgress
        ? '(진행 중)'
        : `(${Math.round((group.endedAt! - group.createdAt) / 1000)}초)`;
      
      const isSelected = this.selectedGroupId === group.id;
      return `
        <div class="swath-group-item ${isInProgress ? 'in-progress' : ''} ${isSelected ? 'selected' : ''}" data-group-id="${group.id}">
          <div class="swath-group-header">
            <div>
              <div class="swath-group-name">
                ${group.name}
                ${isInProgress ? '<span class="swath-group-badge">진행 중</span>' : ''}
              </div>
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

    // 그룹 아이템 클릭 이벤트 리스너 추가 (선택/해제)
    swathGroupsList.querySelectorAll('.swath-group-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // 삭제 버튼 클릭 시에는 선택하지 않음
        if ((e.target as HTMLElement).classList.contains('swath-group-remove')) {
          return;
        }
        
        const groupId = (item as HTMLElement).getAttribute('data-group-id');
        if (groupId) {
          // 같은 그룹을 클릭하면 선택 해제, 다른 그룹을 클릭하면 선택
          if (this.selectedGroupId === groupId) {
            this.selectedGroupId = null;
          } else {
            this.selectedGroupId = groupId;
          }
          
          // Swath 표시 업데이트
          this.entityManager.showSwathsByGroupId(this.selectedGroupId);
          
          // 그룹 목록 업데이트 (선택 상태 반영)
          this.updateSwathGroupsList();
        }
      });
    });

    // 삭제 버튼 이벤트 리스너 추가
    swathGroupsList.querySelectorAll('.swath-group-remove').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // 그룹 아이템 클릭 이벤트 전파 방지
        
        const groupId = (e.target as HTMLElement).getAttribute('data-group-id');
        if (groupId) {
          // 선택된 그룹이 삭제되면 선택 해제
          if (this.selectedGroupId === groupId) {
            this.selectedGroupId = null;
          }
          
          const groupManager = this.entityManager.getSwathGroupManager();
          groupManager.removeGroup(groupId);
          
          // Swath 표시 업데이트
          this.entityManager.showSwathsByGroupId(this.selectedGroupId);
          
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

  /**
   * SAR 시스템 설정 핸들러 설정
   */
  private setupSarConfigHandlers(): void {
    const saveBtn = document.getElementById('sarConfigSaveBtn') as HTMLButtonElement;
    const loadBtn = document.getElementById('sarConfigLoadBtn') as HTMLButtonElement;
    const deleteBtn = document.getElementById('sarConfigDeleteBtn') as HTMLButtonElement;
    const configList = document.getElementById('sarConfigList') as HTMLSelectElement;

    if (!saveBtn || !loadBtn || !deleteBtn || !configList) {
      return;
    }

    // 저장된 설정 목록 로드
    this.loadSarConfigList();

    // 설정 저장
    saveBtn.addEventListener('click', async () => {
      try {
        const nameInput = document.getElementById('sarConfigName') as HTMLInputElement;
        if (!nameInput || !nameInput.value.trim()) {
          alert('설정 이름을 입력하세요.');
          return;
        }

        const config = this.getSarConfigFromForm();
        if (!config) {
          return;
        }

        if (!window.electronAPI?.sarConfig) {
          alert('Electron API가 사용할 수 없습니다.');
          return;
        }

        await window.electronAPI.sarConfig.save({
          name: nameInput.value.trim(),
          config: config
        });

        alert('설정이 저장되었습니다.');
        nameInput.value = '';
        this.clearSarConfigForm();
        this.loadSarConfigList();
      } catch (error: any) {
        console.error('SAR 설정 저장 실패:', error);
        alert('설정 저장 실패: ' + error.message);
      }
    });

    // 설정 불러오기
    loadBtn.addEventListener('click', async () => {
      try {
        const selectedId = configList.value;
        if (!selectedId) {
          alert('불러올 설정을 선택하세요.');
          return;
        }

        if (!window.electronAPI?.sarConfig) {
          alert('Electron API가 사용할 수 없습니다.');
          return;
        }

        const record = await window.electronAPI.sarConfig.getById(selectedId);
        this.fillSarConfigForm(record);
        
        const nameInput = document.getElementById('sarConfigName') as HTMLInputElement;
        if (nameInput) {
          nameInput.value = record.name;
        }

        alert('설정을 불러왔습니다.');
      } catch (error: any) {
        console.error('SAR 설정 불러오기 실패:', error);
        alert('설정 불러오기 실패: ' + error.message);
      }
    });

    // 설정 삭제
    deleteBtn.addEventListener('click', async () => {
      try {
        const selectedId = configList.value;
        if (!selectedId) {
          alert('삭제할 설정을 선택하세요.');
          return;
        }

        if (!confirm('정말 이 설정을 삭제하시겠습니까?')) {
          return;
        }

        if (!window.electronAPI?.sarConfig) {
          alert('Electron API가 사용할 수 없습니다.');
          return;
        }

        await window.electronAPI.sarConfig.delete(selectedId);
        alert('설정이 삭제되었습니다.');
        this.loadSarConfigList();
      } catch (error: any) {
        console.error('SAR 설정 삭제 실패:', error);
        alert('설정 삭제 실패: ' + error.message);
      }
    });
  }

  /**
   * 폼에서 SAR 설정 읽기
   */
  private getSarConfigFromForm(): SarSystemConfig | null {
    try {
      return {
        fc: parseFloat((document.getElementById('sarConfigFc') as HTMLInputElement)?.value || '0'),
        bw: parseFloat((document.getElementById('sarConfigBw') as HTMLInputElement)?.value || '0'),
        fs: parseFloat((document.getElementById('sarConfigFs') as HTMLInputElement)?.value || '0'),
        taup: parseFloat((document.getElementById('sarConfigTaup') as HTMLInputElement)?.value || '0'),
        prf: parseFloat((document.getElementById('sarConfigPrf') as HTMLInputElement)?.value || '0'),
        swst: parseFloat((document.getElementById('sarConfigSwst') as HTMLInputElement)?.value || '0'),
        swl: parseFloat((document.getElementById('sarConfigSwl') as HTMLInputElement)?.value || '0'),
        orbit_height: parseFloat((document.getElementById('sarConfigOrbitHeight') as HTMLInputElement)?.value || '0'),
        antenna_width: parseFloat((document.getElementById('sarConfigAntennaWidth') as HTMLInputElement)?.value || '0'),
        antenna_height: parseFloat((document.getElementById('sarConfigAntennaHeight') as HTMLInputElement)?.value || '0'),
        antenna_roll_angle: parseFloat((document.getElementById('sarConfigAntennaRollAngle') as HTMLInputElement)?.value || '0'),
        antenna_pitch_angle: parseFloat((document.getElementById('sarConfigAntennaPitchAngle') as HTMLInputElement)?.value || '0'),
        antenna_yaw_angle: parseFloat((document.getElementById('sarConfigAntennaYawAngle') as HTMLInputElement)?.value || '0'),
        Pt: parseFloat((document.getElementById('sarConfigPt') as HTMLInputElement)?.value || '0'),
        G_recv: parseFloat((document.getElementById('sarConfigGRecv') as HTMLInputElement)?.value || '0'),
        NF: parseFloat((document.getElementById('sarConfigNF') as HTMLInputElement)?.value || '0'),
        Loss: parseFloat((document.getElementById('sarConfigLoss') as HTMLInputElement)?.value || '0'),
        Tsys: parseFloat((document.getElementById('sarConfigTsys') as HTMLInputElement)?.value || '0'),
        adc_bits: parseInt((document.getElementById('sarConfigAdcBits') as HTMLInputElement)?.value || '0'),
        beam_id: (document.getElementById('sarConfigBeamId') as HTMLInputElement)?.value || 'Beam0000'
      };
    } catch (error) {
      console.error('SAR 설정 폼 읽기 실패:', error);
      return null;
    }
  }

  /**
   * 폼에 SAR 설정 채우기
   */
  private fillSarConfigForm(record: SarSystemConfigRecord): void {
    (document.getElementById('sarConfigFc') as HTMLInputElement).value = record.fc.toString();
    (document.getElementById('sarConfigBw') as HTMLInputElement).value = record.bw.toString();
    (document.getElementById('sarConfigFs') as HTMLInputElement).value = record.fs.toString();
    (document.getElementById('sarConfigTaup') as HTMLInputElement).value = record.taup.toString();
    (document.getElementById('sarConfigPrf') as HTMLInputElement).value = record.prf.toString();
    (document.getElementById('sarConfigSwst') as HTMLInputElement).value = record.swst.toString();
    (document.getElementById('sarConfigSwl') as HTMLInputElement).value = record.swl.toString();
    (document.getElementById('sarConfigOrbitHeight') as HTMLInputElement).value = record.orbit_height.toString();
    (document.getElementById('sarConfigAntennaWidth') as HTMLInputElement).value = record.antenna_width.toString();
    (document.getElementById('sarConfigAntennaHeight') as HTMLInputElement).value = record.antenna_height.toString();
    (document.getElementById('sarConfigAntennaRollAngle') as HTMLInputElement).value = record.antenna_roll_angle.toString();
    (document.getElementById('sarConfigAntennaPitchAngle') as HTMLInputElement).value = record.antenna_pitch_angle.toString();
    (document.getElementById('sarConfigAntennaYawAngle') as HTMLInputElement).value = record.antenna_yaw_angle.toString();
    (document.getElementById('sarConfigPt') as HTMLInputElement).value = record.Pt.toString();
    (document.getElementById('sarConfigGRecv') as HTMLInputElement).value = record.G_recv.toString();
    (document.getElementById('sarConfigNF') as HTMLInputElement).value = record.NF.toString();
    (document.getElementById('sarConfigLoss') as HTMLInputElement).value = record.Loss.toString();
    (document.getElementById('sarConfigTsys') as HTMLInputElement).value = record.Tsys.toString();
    (document.getElementById('sarConfigAdcBits') as HTMLInputElement).value = record.adc_bits.toString();
    (document.getElementById('sarConfigBeamId') as HTMLInputElement).value = record.beam_id;
  }

  /**
   * SAR 설정 폼 초기화
   */
  private clearSarConfigForm(): void {
    (document.getElementById('sarConfigFc') as HTMLInputElement).value = '5.4e9';
    (document.getElementById('sarConfigBw') as HTMLInputElement).value = '150e6';
    (document.getElementById('sarConfigFs') as HTMLInputElement).value = '250e6';
    (document.getElementById('sarConfigTaup') as HTMLInputElement).value = '10e-6';
    (document.getElementById('sarConfigPrf') as HTMLInputElement).value = '5000';
    (document.getElementById('sarConfigSwst') as HTMLInputElement).value = '10e-6';
    (document.getElementById('sarConfigSwl') as HTMLInputElement).value = '50e-6';
    (document.getElementById('sarConfigOrbitHeight') as HTMLInputElement).value = '517e3';
    (document.getElementById('sarConfigAntennaWidth') as HTMLInputElement).value = '4.0';
    (document.getElementById('sarConfigAntennaHeight') as HTMLInputElement).value = '0.5';
    (document.getElementById('sarConfigAntennaRollAngle') as HTMLInputElement).value = '0.0';
    (document.getElementById('sarConfigAntennaPitchAngle') as HTMLInputElement).value = '0.0';
    (document.getElementById('sarConfigAntennaYawAngle') as HTMLInputElement).value = '0.0';
    (document.getElementById('sarConfigPt') as HTMLInputElement).value = '1000.0';
    (document.getElementById('sarConfigGRecv') as HTMLInputElement).value = '1.0';
    (document.getElementById('sarConfigNF') as HTMLInputElement).value = '3.0';
    (document.getElementById('sarConfigLoss') as HTMLInputElement).value = '2.0';
    (document.getElementById('sarConfigTsys') as HTMLInputElement).value = '290.0';
    (document.getElementById('sarConfigAdcBits') as HTMLInputElement).value = '12';
    (document.getElementById('sarConfigBeamId') as HTMLInputElement).value = 'Beam0000';
  }

  /**
   * 저장된 SAR 설정 목록 로드
   */
  private async loadSarConfigList(): Promise<void> {
    const configList = document.getElementById('sarConfigList') as HTMLSelectElement;
    if (!configList) {
      return;
    }

    try {
      if (!window.electronAPI?.sarConfig) {
        configList.innerHTML = '<option>Electron API 사용 불가</option>';
        return;
      }

      const configs = await window.electronAPI.sarConfig.getAll();
      configList.innerHTML = '';

      if (configs.length === 0) {
        configList.innerHTML = '<option>저장된 설정이 없습니다</option>';
        return;
      }

      configs.forEach(config => {
        const option = document.createElement('option');
        option.value = config.id;
        option.textContent = `${config.name} (${new Date(config.updated_at).toLocaleString()})`;
        configList.appendChild(option);
      });
    } catch (error: any) {
      console.error('SAR 설정 목록 로드 실패:', error);
      configList.innerHTML = '<option>로드 실패</option>';
    }
  }

}
