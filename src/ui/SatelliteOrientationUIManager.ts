import { SatelliteEntityManager } from '../entity/SatelliteEntityManager.js';

/**
 * 위성 방향 제어 UI 관리
 * Yaw, Pitch, Roll 컨트롤러
 */
export class SatelliteOrientationUIManager {
  private satelliteEntityManager: SatelliteEntityManager;
  private yawInput: HTMLInputElement | null;
  private pitchInput: HTMLInputElement | null;
  private rollInput: HTMLInputElement | null;
  private yawValue: HTMLSpanElement | null;
  private pitchValue: HTMLSpanElement | null;
  private rollValue: HTMLSpanElement | null;
  private useCustomOrientationCheckbox: HTMLInputElement | null;
  private resetButton: HTMLButtonElement | null;

  constructor(satelliteEntityManager: SatelliteEntityManager) {
    this.satelliteEntityManager = satelliteEntityManager;
    this.yawInput = null;
    this.pitchInput = null;
    this.rollInput = null;
    this.yawValue = null;
    this.pitchValue = null;
    this.rollValue = null;
    this.useCustomOrientationCheckbox = null;
    this.resetButton = null;
  }

  /**
   * UI 초기화
   */
  initialize(): void {
    // UI 요소 가져오기
    this.yawInput = document.getElementById('satelliteYaw') as HTMLInputElement;
    this.pitchInput = document.getElementById('satellitePitch') as HTMLInputElement;
    this.rollInput = document.getElementById('satelliteRoll') as HTMLInputElement;
    this.yawValue = document.getElementById('satelliteYawValue') as HTMLSpanElement;
    this.pitchValue = document.getElementById('satellitePitchValue') as HTMLSpanElement;
    this.rollValue = document.getElementById('satelliteRollValue') as HTMLSpanElement;
    this.useCustomOrientationCheckbox = document.getElementById('useCustomOrientation') as HTMLInputElement;
    this.resetButton = document.getElementById('resetOrientation') as HTMLButtonElement;

    if (!this.yawInput || !this.pitchInput || !this.rollInput) {
      console.warn('위성 방향 제어 UI 요소를 찾을 수 없습니다.');
      return;
    }

    // 초기값 설정
    const currentOrientation = this.satelliteEntityManager.getOrientation();
    this.yawInput.value = currentOrientation.yaw.toString();
    this.pitchInput.value = currentOrientation.pitch.toString();
    this.rollInput.value = currentOrientation.roll.toString();

    // 값 표시 업데이트
    this.updateValueDisplays();

    // 이벤트 리스너 설정
    this.setupEventListeners();

    // 커스텀 방향 사용 여부 초기화
    if (this.useCustomOrientationCheckbox) {
      this.useCustomOrientationCheckbox.checked = this.satelliteEntityManager.getUseCustomOrientation();
      this.updateOrientationControlsState();
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // Yaw 슬라이더
    if (this.yawInput) {
      this.yawInput.addEventListener('input', () => {
        this.updateOrientation();
        this.updateValueDisplays();
      });
      this.yawInput.addEventListener('change', () => {
        this.updateOrientation();
        this.updateValueDisplays();
      });
    }

    // Pitch 슬라이더
    if (this.pitchInput) {
      this.pitchInput.addEventListener('input', () => {
        this.updateOrientation();
        this.updateValueDisplays();
      });
      this.pitchInput.addEventListener('change', () => {
        this.updateOrientation();
        this.updateValueDisplays();
      });
    }

    // Roll 슬라이더
    if (this.rollInput) {
      this.rollInput.addEventListener('input', () => {
        this.updateOrientation();
        this.updateValueDisplays();
      });
      this.rollInput.addEventListener('change', () => {
        this.updateOrientation();
        this.updateValueDisplays();
      });
    }

    // 커스텀 방향 사용 체크박스
    if (this.useCustomOrientationCheckbox) {
      this.useCustomOrientationCheckbox.addEventListener('change', () => {
        const useCustom = this.useCustomOrientationCheckbox?.checked || false;
        this.satelliteEntityManager.setUseCustomOrientation(useCustom);
        this.updateOrientationControlsState();
      });
    }

    // 리셋 버튼
    if (this.resetButton) {
      this.resetButton.addEventListener('click', () => {
        this.resetOrientation();
      });
    }
  }

  /**
   * 방향 업데이트
   */
  private updateOrientation(): void {
    const yaw = parseFloat(this.yawInput?.value || '0');
    const pitch = parseFloat(this.pitchInput?.value || '0');
    const roll = parseFloat(this.rollInput?.value || '0');

    this.satelliteEntityManager.setOrientation(yaw, pitch, roll);
  }

  /**
   * 값 표시 업데이트
   */
  private updateValueDisplays(): void {
    if (this.yawValue && this.yawInput) {
      this.yawValue.textContent = `${parseFloat(this.yawInput.value).toFixed(1)}°`;
    }
    if (this.pitchValue && this.pitchInput) {
      this.pitchValue.textContent = `${parseFloat(this.pitchInput.value).toFixed(1)}°`;
    }
    if (this.rollValue && this.rollInput) {
      this.rollValue.textContent = `${parseFloat(this.rollInput.value).toFixed(1)}°`;
    }
  }

  /**
   * 방향 제어 UI 상태 업데이트
   */
  private updateOrientationControlsState(): void {
    const useCustom = this.useCustomOrientationCheckbox?.checked || false;
    const disabled = !useCustom;

    if (this.yawInput) {
      this.yawInput.disabled = disabled;
    }
    if (this.pitchInput) {
      this.pitchInput.disabled = disabled;
    }
    if (this.rollInput) {
      this.rollInput.disabled = disabled;
    }
    if (this.resetButton) {
      this.resetButton.disabled = disabled;
    }
  }

  /**
   * 방향 리셋
   */
  private resetOrientation(): void {
    if (this.yawInput) {
      this.yawInput.value = '0';
    }
    if (this.pitchInput) {
      this.pitchInput.value = '0';
    }
    if (this.rollInput) {
      this.rollInput.value = '0';
    }

    this.satelliteEntityManager.setOrientation(0, 0, 0);
    this.updateValueDisplays();
  }

  /**
   * 현재 방향 값 가져오기
   */
  getCurrentOrientation(): { yaw: number; pitch: number; roll: number } {
    return this.satelliteEntityManager.getOrientation();
  }
}
