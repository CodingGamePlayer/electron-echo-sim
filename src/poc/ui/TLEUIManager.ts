import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { EntityManager } from '../entity/EntityManager.js';

/**
 * TLE 입력 UI 관리
 */
export class TLEUIManager {
  private satelliteManager: SatelliteManager;
  private entityManager: EntityManager;
  private tleInput: HTMLTextAreaElement | null;
  private useTLECheckbox: HTMLInputElement | null;
  private applyTLEButton: HTMLButtonElement | null;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.tleInput = null;
    this.useTLECheckbox = null;
    this.applyTLEButton = null;
  }

  /**
   * TLE UI 초기화
   */
  initialize(defaultTLE: string): void {
    this.tleInput = document.getElementById('tleInput') as HTMLTextAreaElement;
    this.useTLECheckbox = document.getElementById('useTLE') as HTMLInputElement;
    this.applyTLEButton = document.getElementById('applyTLE') as HTMLButtonElement;

    if (this.tleInput) {
      this.tleInput.value = defaultTLE;
    }

    if (this.useTLECheckbox) {
      this.useTLECheckbox.checked = true;
    }

    this.setupHandlers();
    
    // 초기 TLE가 있으면 고도 계산 및 표시
    if (defaultTLE && defaultTLE.trim()) {
      this.calculateAndDisplayAltitude(defaultTLE);
    }
  }

  /**
   * TLE로부터 고도 계산 및 UI에 표시 (km 단위)
   */
  private calculateAndDisplayAltitude(tleText: string): void {
    try {
      // TLE 텍스트로 직접 계산 (satelliteManager가 아직 초기화되지 않았을 수 있음)
      if (!tleText || !tleText.trim()) {
        console.warn('[TLEUIManager] TLE 텍스트가 비어있습니다.');
        return;
      }
      
      const currentTime = Cesium.JulianDate.now();
      const tempManager = new SatelliteManager(tleText);
      const position = tempManager.calculatePosition(currentTime);
      
      if (position) {
        if (position.altitude !== undefined && position.altitude !== null && !isNaN(position.altitude)) {
          const altitudeInput = document.getElementById('satelliteAltitude') as HTMLInputElement;
          if (altitudeInput) {
            // 미터를 킬로미터로 변환하여 표시
            const altitudeKm = position.altitude / 1000;
            altitudeInput.value = altitudeKm.toFixed(2);
            console.log(`[TLEUIManager] 초기 고도 계산: ${altitudeKm.toFixed(2)}km (${Math.round(position.altitude)}m) - 위도: ${position.latitude.toFixed(4)}°, 경도: ${position.longitude.toFixed(4)}°`);
          } else {
            console.warn('[TLEUIManager] 고도 입력 필드를 찾을 수 없습니다.');
          }
        } else {
          console.warn('[TLEUIManager] 계산된 위치에 고도 정보가 없거나 유효하지 않습니다:', position.altitude);
        }
      } else {
        console.warn('[TLEUIManager] TLE 위치 계산 결과가 null입니다.');
      }
    } catch (error) {
      console.error('[TLEUIManager] 초기 고도 계산 실패:', error);
    }
  }

  /**
   * TLE 입력 이벤트 핸들러 설정
   */
  private setupHandlers(): void {
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
          // 계산된 고도를 UI에 표시 (km 단위)
          const altitudeInput = document.getElementById('satelliteAltitude') as HTMLInputElement;
          if (altitudeInput && initialPos.altitude) {
            // 미터를 킬로미터로 변환하여 표시
            const altitudeKm = initialPos.altitude / 1000;
            altitudeInput.value = altitudeKm.toFixed(2);
            console.log(`[TLEUIManager] TLE 적용 - 계산된 고도: ${altitudeKm.toFixed(2)}km (${Math.round(initialPos.altitude)}m)`);
          }
          
          // 커스텀 고도 초기화 (TLE 고도 사용)
          this.entityManager.setCustomAltitude(null);
          
          this.entityManager.updatePosition(initialPos);
        } else {
          console.error('[TLEUIManager] TLE 위치 계산 실패');
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

    // 위성 고도 설정 (km 단위 입력을 미터로 변환)
    const altitudeInput = document.getElementById('satelliteAltitude') as HTMLInputElement;
    if (altitudeInput) {
      altitudeInput.addEventListener('change', () => {
        const altitudeKm = parseFloat(altitudeInput.value || '0');
        if (altitudeKm >= 0) {
          // km를 미터로 변환하여 저장
          const altitudeM = altitudeKm * 1000;
          this.entityManager.setCustomAltitude(altitudeM);
          this.updatePositionIfNeeded();
        }
      });
      altitudeInput.addEventListener('input', () => {
        const altitudeKm = parseFloat(altitudeInput.value || '0');
        if (altitudeKm >= 0) {
          // km를 미터로 변환하여 저장
          const altitudeM = altitudeKm * 1000;
          this.entityManager.setCustomAltitude(altitudeM);
          this.updatePositionIfNeeded();
        }
      });
    }
  }

  /**
   * 필요시 위치 업데이트
   */
  private updatePositionIfNeeded(): void {
    if (this.satelliteManager.useTLE) {
      const currentTime = Cesium.JulianDate.now();
      const position = this.satelliteManager.calculatePosition(currentTime);
      if (position) {
        this.entityManager.updatePosition(position);
      }
    }
  }
}
