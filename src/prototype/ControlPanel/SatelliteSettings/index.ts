import { SatelliteBusPayloadManager } from './SatelliteBusPayloadManager/index.js';
import { renderSatelliteSettingsForm, FormRendererCallbacks } from './_ui/form-renderer.js';
import { updateEntity } from './_util/entity-updater.js';
import { createSatelliteEntity, setupCameraAngle } from './_util/entity-creator.js';
import { getDirectionForInputId } from './_util/direction-mapper.js';

/**
 * SatelliteSettings - Satellite settings tab management class
 */
export class SatelliteSettings {
  private container: HTMLElement | null;
  private viewer: any;
  private busPayloadManager: SatelliteBusPayloadManager | null;
  private updateDebounceTimer: number | null;
  private currentDirectionInputId: string | null;

  constructor() {
    this.container = null;
    this.viewer = null;
    this.busPayloadManager = null;
    this.updateDebounceTimer = null;
    this.currentDirectionInputId = null;
  }

  /**
   * Initialize satellite settings tab
   */
  initialize(container: HTMLElement, viewer?: any): void {
    this.container = container;
    this.viewer = viewer || null;
    if (this.viewer) {
      this.busPayloadManager = new SatelliteBusPayloadManager(this.viewer);
    }
    this.render();
  }

  /**
   * Render satellite settings UI
   */
  private render(): void {
    if (!this.container) return;

    const callbacks: FormRendererCallbacks = {
      onInputFocus: (id: string) => {
        this.showDirectionForInput(id);
      },
      onInputBlur: (id: string) => {
        // 다른 입력 필드로 포커스 이동 시에도 화살표가 유지되도록 함
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement;
          // 활성 요소가 다른 입력 필드가 아니고, 현재 방향 입력 필드도 아니면 화살표 제거
          if (activeElement && activeElement.tagName !== 'INPUT' && activeElement.id !== this.currentDirectionInputId) {
            this.hideDirectionArrows();
          }
        }, 200);
      },
      onInputChange: () => {
        this.updateEntityFromInputs();
      },
      onCreateButtonClick: () => {
        this.createSatelliteEntity();
      },
      onAxisToggleChange: (checked: boolean) => {
        this.setAxisVisible(checked);
      }
    };

    renderSatelliteSettingsForm(this.container, callbacks);
  }

  /**
   * 입력 필드 값으로 엔티티 업데이트 (디바운싱 적용)
   */
  private updateEntityFromInputs(): void {
    // 디바운싱: 입력이 멈춘 후 300ms 후에 업데이트 실행
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
    }
    
    this.updateDebounceTimer = window.setTimeout(() => {
      this.performEntityUpdate();
      this.updateDebounceTimer = null;
    }, 300);
  }

  /**
   * 실제 엔티티 업데이트 수행
   */
  private performEntityUpdate(): void {
    updateEntity(this.busPayloadManager, this.viewer);
    
    // 엔티티 업데이트 후에도 현재 포커스된 입력 필드가 있으면 화살표 다시 표시
    if (this.currentDirectionInputId) {
      const activeElement = document.activeElement as HTMLInputElement;
      if (activeElement && activeElement.id === this.currentDirectionInputId) {
        // 약간의 지연을 두어 엔티티 업데이트가 완료된 후 화살표 표시
        setTimeout(() => {
          // 엔티티가 여전히 존재하는지 확인
          if (this.busPayloadManager && this.busPayloadManager.getBusEntity()) {
            this.showDirectionForInput(this.currentDirectionInputId!);
          }
        }, 100);
      }
    }
  }

  /**
   * 위성 엔티티 생성
   */
  private createSatelliteEntity(): void {
    // 엔티티 생성 전 현재 포커스된 입력 필드 저장
    const activeElement = document.activeElement as HTMLElement;
    const wasInputFocused = activeElement && activeElement.tagName === 'INPUT' && 
                            activeElement.id && activeElement.id.startsWith('prototype');

    // 엔티티 생성 전 입력 필드 상태 로깅
    const allInputsBefore = this.container?.querySelectorAll('input');
    if (allInputsBefore) {
      console.log('[InputDebug] 엔티티 생성 전 입력 필드 상태:', {
        totalInputs: allInputsBefore.length,
        inputs: Array.from(allInputsBefore).map(input => ({
          id: input.id,
          disabled: input.disabled,
          readOnly: input.readOnly,
          value: input.value,
          type: input.type
        }))
      });
    }

    createSatelliteEntity(this.busPayloadManager, this.viewer);

    // 엔티티 생성 후 약간의 지연을 두고 카메라를 BUS에 고정
    setTimeout(() => {
      // 모든 입력 필드의 상태 로깅
      const allInputs = this.container?.querySelectorAll('input');
      if (allInputs) {
        console.log('[InputDebug] 엔티티 생성 후 입력 필드 상태:', {
          totalInputs: allInputs.length,
          activeElement: document.activeElement?.id,
          wasInputFocused,
          inputs: Array.from(allInputs).map(input => ({
            id: input.id,
            disabled: input.disabled,
            readOnly: input.readOnly,
            value: input.value,
            type: input.type,
            isFocused: document.activeElement === input
          }))
        });
      }
      
      const busEntity = this.busPayloadManager?.getBusEntity();
      const antennaEntity = this.busPayloadManager?.getAntennaEntity();
      
      // 엔티티가 생성되었는지 확인
      if (!busEntity && !antennaEntity) {
        console.error('[SatelliteSettings] 엔티티가 생성되지 않았습니다!');
        alert('엔티티 생성에 실패했습니다. 콘솔을 확인하세요.');
        return;
      }

      // 카메라 각도 설정 (항상 동일한 각도로 설정)
      if (busEntity) {
        setupCameraAngle(this.viewer, busEntity);
      }
      
      // Cesium 캔버스가 포커스를 가져가지 않도록 설정
      const cesiumCanvas = this.viewer?.canvas;
      if (cesiumCanvas) {
        cesiumCanvas.setAttribute('tabindex', '-1');
        cesiumCanvas.style.outline = 'none';
      }
      
      // 포커스 복원: 이전에 입력 필드에 포커스가 있었다면 복원
      if (wasInputFocused && activeElement && activeElement.id) {
        // 카메라 조작 후 포커스 복원
        setTimeout(() => {
          const inputToFocus = document.getElementById(activeElement.id) as HTMLInputElement;
          if (inputToFocus && !inputToFocus.disabled && !inputToFocus.readOnly) {
            inputToFocus.focus();
            // 커서를 끝으로 이동
            inputToFocus.setSelectionRange(inputToFocus.value.length, inputToFocus.value.length);
            console.log(`[InputDebug] 카메라 조작 후 포커스 복원: ${activeElement.id}`);
          }
        }, 100);
      }
    }, 300); // 엔티티 생성 완료 대기 시간
  }


  /**
   * 지구로 이동
   */
  private moveSatelliteToEarth(): void {
    if (!this.busPayloadManager || !this.viewer) {
      alert('Cesium 뷰어가 초기화되지 않았습니다.');
      return;
    }

    // 입력된 위치 정보 가져오기 (km를 미터로 변환)
    const longitude = parseFloat((document.getElementById('prototypeSatelliteLongitude') as HTMLInputElement)?.value || '0');
    const latitude = parseFloat((document.getElementById('prototypeSatelliteLatitude') as HTMLInputElement)?.value || '0');
    const altitudeKm = parseFloat((document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value || '591');
    // km를 미터로 변환 (Cesium은 미터 단위 사용)
    const altitude = altitudeKm * 1000;

    // 입력값 검증
    if (longitude < -180 || longitude > 180) {
      alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
      return;
    }
    if (altitudeKm < 0) {
      alert('고도는 0 이상이어야 합니다.');
      return;
    }

    try {
      // 위성 위치 업데이트
      this.busPayloadManager.updatePosition({ longitude, latitude, altitude });

      // 지구로 이동 시 항상 카메라를 엔티티에 고정하고 엔티티 생성 시와 동일한 각도로 설정
      const busEntity = this.busPayloadManager.getBusEntity();
      if (busEntity) {
        // 기존 trackedEntity 해제 (충돌 방지)
        this.viewer.trackedEntity = undefined;
        
        // 엔티티 생성 시와 동일한 카메라 각도 설정
        setTimeout(() => {
          const busPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
          if (busPosition) {
            // BUS 크기 정보로 적절한 거리 계산 (mm를 미터로 변환)
            const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
            const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
            const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');
            const maxBusSize = Math.max(busLengthMm, busWidthMm, busHeightMm) / 1000;
            
            // 대각선에서 바라보는 각도 설정 (엔티티 생성 시와 동일)
            const cameraRange = Math.max(maxBusSize * 3, 20);
            
            // 카메라를 엔티티 생성 시와 동일한 각도로 설정
            this.viewer.camera.lookAt(
              busPosition,
              new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(45), // heading: 대각선 방향
                Cesium.Math.toRadians(0), // pitch: 수평선에 가까운 대각선 뷰
                cameraRange // range: 거리
              )
            );
            
          }
        }, 100);
      }

      alert('위성이 지구로 이동되었습니다.');
    } catch (error) {
      console.error('[SatelliteSettings] 지구로 이동 오류:', error);
      alert('지구로 이동 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  }

  /**
   * XYZ 축 표시/숨김 설정
   */
  private setAxisVisible(visible: boolean): void {
    if (!this.busPayloadManager) {
      return;
    }

    this.busPayloadManager.setAxisVisible(visible);
    console.log(`[SatelliteSettings] XYZ 축 표시: ${visible ? 'ON' : 'OFF'}`);
  }

  /**
   * 입력 필드에 해당하는 방향 화살표 표시
   */
  private showDirectionForInput(inputId: string): void {
    if (!this.busPayloadManager) {
      return;
    }

    // 엔티티가 생성되어 있는지 확인
    const busEntity = this.busPayloadManager.getBusEntity();
    if (!busEntity) {
      // 엔티티가 없으면 나중에 다시 시도할 수 있도록 ID만 저장
      this.currentDirectionInputId = inputId;
      return;
    }

    this.currentDirectionInputId = inputId;

    // 입력 필드 ID에 따라 방향 결정
    const direction = getDirectionForInputId(inputId);

    if (direction) {
      this.busPayloadManager.showDirectionArrows(direction);
    }
  }

  /**
   * 방향 화살표 숨김
   */
  private hideDirectionArrows(): void {
    if (this.busPayloadManager) {
      this.busPayloadManager.removeDirectionArrows();
      this.currentDirectionInputId = null;
    }
  }


  /**
   * Cleanup satellite settings
   */
  cleanup(): void {
    // 디바운스 타이머 정리
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }
    
    // 카메라 고정 해제
    if (this.viewer) {
      this.viewer.trackedEntity = undefined;
    }

    // 방향 화살표 제거
    this.hideDirectionArrows();

    if (this.busPayloadManager) {
      this.busPayloadManager.removeSatellite();
      this.busPayloadManager = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
    this.viewer = null;
    this.currentDirectionInputId = null;
  }
}
