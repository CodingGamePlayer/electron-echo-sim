import { SatelliteManager } from '../SatelliteManager.js';
import { EntityManager } from '../EntityManager.js';

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
        this.updatePositionIfNeeded();
      });
      altitudeOffsetInput.addEventListener('input', () => {
        const offset = parseFloat(altitudeOffsetInput.value || '0');
        this.entityManager.setAltitudeOffset(offset);
        this.updatePositionIfNeeded();
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
