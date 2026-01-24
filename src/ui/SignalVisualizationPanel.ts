/**
 * Signal 시각화 패널
 * SAR Signal (Chirp) 및 Echo Signal 시각화
 */

import { Complex64Array, SignalStatistics } from '../types/signal.types.js';
import { SignalDataProcessor } from '../utils/signal-data-processor.js';

/**
 * Signal 시각화 옵션
 */
export interface SignalVisualizationOptions {
  showReal?: boolean;
  showImag?: boolean;
  showMagnitude?: boolean;
  showPhase?: boolean;
  normalize?: boolean;
  logScale?: boolean;
}

export class SignalVisualizationPanel {
  private sidebar: HTMLElement;
  private chirpCanvas: HTMLCanvasElement | null;
  private echoCanvas: HTMLCanvasElement | null;
  private chirpStatisticsDiv: HTMLElement | null;
  private echoStatisticsDiv: HTMLElement | null;
  private modal: HTMLElement | null;
  private modalCanvas: HTMLCanvasElement | null;
  private modalTitle: HTMLElement | null;
  private modalCloseBtn: HTMLButtonElement | null;
  private currentChirpData: Complex64Array | null = null;
  private currentEchoData: Complex64Array | null = null;
  private currentConfig: any = null;

  constructor() {
    this.sidebar = document.getElementById('signalResultsSidebar') as HTMLElement;
    if (!this.sidebar) {
      throw new Error('Signal 결과 사이드바를 찾을 수 없습니다.');
    }

    this.chirpCanvas = document.getElementById('chirpSignalCanvas') as HTMLCanvasElement;
    this.echoCanvas = document.getElementById('echoSignalCanvas') as HTMLCanvasElement;
    this.chirpStatisticsDiv = document.getElementById('chirpStatistics') as HTMLElement;
    this.echoStatisticsDiv = document.getElementById('echoStatistics') as HTMLElement;

    // 모달 요소
    this.modal = document.getElementById('canvasModal') as HTMLElement;
    this.modalCanvas = document.getElementById('canvasModalCanvas') as HTMLCanvasElement;
    this.modalTitle = document.getElementById('canvasModalTitle') as HTMLElement;
    this.modalCloseBtn = document.getElementById('canvasModalClose') as HTMLButtonElement;

    // 닫기 버튼 이벤트 설정
    this.setupCloseButton();
    
    // Canvas 클릭 이벤트 설정
    this.setupCanvasClickHandlers();
  }

  /**
   * 닫기 버튼 설정
   */
  private setupCloseButton(): void {
    const closeBtn = document.getElementById('signalResultsCloseBtn') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }
    
    // 모달 닫기 버튼
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }
    
    // 모달 배경 클릭 시 닫기
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
        this.closeModal();
      }
    });
  }

  /**
   * Canvas 클릭 이벤트 설정
   */
  private setupCanvasClickHandlers(): void {
    if (this.chirpCanvas) {
      this.chirpCanvas.style.cursor = 'pointer';
      this.chirpCanvas.addEventListener('click', () => {
        this.openModal('Chirp Signal', 'chirp');
      });
    }
    
    if (this.echoCanvas) {
      this.echoCanvas.style.cursor = 'pointer';
      this.echoCanvas.addEventListener('click', () => {
        this.openModal('Echo Signal', 'echo');
      });
    }
  }

  /**
   * 모달 열기
   */
  private openModal(title: string, signalType: 'chirp' | 'echo'): void {
    if (!this.modal || !this.modalCanvas || !this.modalTitle) return;
    
    this.modalTitle.textContent = title;
    this.modal.style.display = 'flex';
    
    // 모달 Canvas 크기 설정 (더 크게)
    const modalWidth = Math.min(window.innerWidth * 0.9, 1200);
    const modalHeight = Math.min(window.innerHeight * 0.8, 800);
    this.modalCanvas.width = modalWidth;
    this.modalCanvas.height = modalHeight;
    
    // 신호 다시 그리기
    if (signalType === 'chirp' && this.currentChirpData && this.currentConfig) {
      this.drawSignalOnModal(this.modalCanvas, this.currentChirpData, this.currentConfig, signalType);
    } else if (signalType === 'echo' && this.currentEchoData && this.currentConfig) {
      this.drawSignalOnModal(this.modalCanvas, this.currentEchoData, this.currentConfig, signalType);
    }
  }

  /**
   * 모달 닫기
   */
  private closeModal(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  /**
   * 모달 Canvas에 신호 그리기
   */
  private drawSignalOnModal(
    canvas: HTMLCanvasElement,
    signalData: Complex64Array,
    config: any,
    signalType: 'chirp' | 'echo'
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    // 배경 지우기
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    const numSamples = signalData.real.length;
    if (numSamples === 0) return;

    // 시간 벡터 생성
    const dt = 1.0 / config.fs;
    const timeUs: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      timeUs.push(i * dt * 1e6);
    }

    // 데이터 준비
    const real = Array.from(signalData.real);
    const imag = Array.from(signalData.imag);
    const magnitude = Array.from(SignalDataProcessor.computeMagnitude(signalData));

    // 정규화 (Echo Signal인 경우)
    const normalize = signalType === 'echo';
    if (normalize) {
      const maxMag = Math.max(...magnitude);
      if (maxMag > 0) {
        for (let i = 0; i < real.length; i++) {
          real[i] /= maxMag;
          imag[i] /= maxMag;
          magnitude[i] /= maxMag;
        }
      }
    }

    // 스케일 계산
    const timeMin = Math.min(...timeUs);
    const timeMax = Math.max(...timeUs);
    const timeRange = timeMax - timeMin;

    const plotHeight = height - 2 * padding;
    const plotWidth = width - 2 * padding;

    // 그리드 그리기
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const y = padding + (plotHeight / 20) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // 시간 축 그리기
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const x = padding + (plotWidth / 20) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      
      // X축 눈금 값 표시 (5개 간격으로)
      if (i % 4 === 0) {
        const timeValue = timeMin + (timeRange / 20) * i;
        ctx.fillStyle = '#aaa';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeValue.toFixed(1), x, height - padding + 18);
      }
    }

    // Y축 눈금 값 표시
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    // Real/Imaginary용 Y축 (중간 기준)
    const maxAmplitude = Math.max(
      Math.max(...real.map(Math.abs)),
      Math.max(...imag.map(Math.abs))
    );
    for (let i = 0; i <= 20; i += 4) {
      const y = padding + (plotHeight / 20) * i;
      const value = maxAmplitude * (1 - (i / 20) * 2); // -maxAmplitude ~ +maxAmplitude
      ctx.fillText(value.toFixed(2), padding - 8, y + 5);
    }
    // 신호 그리기
    const scaleX = plotWidth / timeRange;
    const scaleY = plotHeight / 2;

    // 실수부
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < numSamples; i++) {
      const x = padding + (timeUs[i] - timeMin) * scaleX;
      const y = padding + plotHeight / 2 - real[i] * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 허수부
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < numSamples; i++) {
      const x = padding + (timeUs[i] - timeMin) * scaleX;
      const y = padding + plotHeight / 2 - imag[i] * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 크기
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < numSamples; i++) {
      const x = padding + (timeUs[i] - timeMin) * scaleX;
      const y = padding + plotHeight - magnitude[i] * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Echo Signal인 경우 최대값 표시
    if (signalType === 'echo') {
      const maxIdx = magnitude.indexOf(Math.max(...magnitude));
      if (maxIdx >= 0) {
        const maxX = padding + (timeUs[maxIdx] - timeMin) * scaleX;
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(maxX, padding);
        ctx.lineTo(maxX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 레이블
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (μs)', width / 2, height - 20);

    ctx.save();
    ctx.translate(25, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amplitude', 0, 0);
    ctx.restore();

    // 제목
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${signalType === 'chirp' ? 'Chirp' : 'Echo'} Signal - Time Domain`, padding, padding - 15);

    // 범례
    const legendY = padding + 30;
    ctx.strokeStyle = '#4CAF50';
    ctx.beginPath();
    ctx.moveTo(padding + 20, legendY);
    ctx.lineTo(padding + 50, legendY);
    ctx.stroke();
    ctx.fillStyle = '#4CAF50';
    ctx.font = '14px sans-serif';
    ctx.fillText('Real', padding + 55, legendY + 5);

    ctx.strokeStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(padding + 120, legendY);
    ctx.lineTo(padding + 150, legendY);
    ctx.stroke();
    ctx.fillStyle = '#FF9800';
    ctx.fillText('Imaginary', padding + 155, legendY + 5);

    ctx.strokeStyle = '#2196F3';
    ctx.beginPath();
    ctx.moveTo(padding + 260, legendY);
    ctx.lineTo(padding + 290, legendY);
    ctx.stroke();
    ctx.fillStyle = '#2196F3';
    ctx.fillText('Magnitude', padding + 295, legendY + 5);
  }

  /**
   * 사이드바 표시
   */
  show(): void {
    if (this.sidebar) {
      this.sidebar.classList.remove('collapsed');
      // 사이드바가 완전히 렌더링될 때까지 약간의 지연
      // 이렇게 하면 Canvas 크기 계산이 정확해집니다
    }
  }

  /**
   * 사이드바 숨기기
   */
  hide(): void {
    if (this.sidebar) {
      this.sidebar.classList.add('collapsed');
    }
  }

  /**
   * Chirp 신호 시각화
   */
  displayChirpSignal(
    chirpData: Complex64Array,
    config: any,
    options: SignalVisualizationOptions = {}
  ): void {
    // 데이터 저장 (모달에서 사용)
    this.currentChirpData = chirpData;
    this.currentConfig = config;
    if (!this.chirpCanvas) return;

    const {
      showReal = true,
      showImag = true,
      showMagnitude = true,
      normalize = false
    } = options;

    // 사이드바가 열린 후 Canvas 크기 계산을 위해 약간의 지연
    // requestAnimationFrame을 두 번 사용하여 사이드바 렌더링 완료 보장
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ctx = this.chirpCanvas!.getContext('2d');
        if (!ctx) return;

        // Canvas 실제 크기 가져오기 (CSS 크기에 맞춤)
        const rect = this.chirpCanvas!.getBoundingClientRect();
        let width = Math.floor(rect.width);
        let height = Math.floor(rect.height * 0.75);
        
        // 사이드바가 아직 열리지 않았거나 크기가 0이면 기본값 사용
        if (width === 0 || height === 0) {
          width = 370;
          height = 300;
        }
      
      this.chirpCanvas!.width = width;
      this.chirpCanvas!.height = height;
      const padding = 40;

      // 배경 지우기
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, width, height);

      const numSamples = chirpData.real.length;
      if (numSamples === 0) return;

      // 시간 벡터 생성 (마이크로초)
      const dt = 1.0 / config.fs;
      const timeUs: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        timeUs.push(i * dt * 1e6);
      }

      // 데이터 준비
      const real = Array.from(chirpData.real);
      const imag = Array.from(chirpData.imag);
      const magnitude = Array.from(SignalDataProcessor.computeMagnitude(chirpData));

      // 정규화
      if (normalize) {
        const maxMag = Math.max(...magnitude);
        if (maxMag > 0) {
          for (let i = 0; i < real.length; i++) {
            real[i] /= maxMag;
            imag[i] /= maxMag;
            magnitude[i] /= maxMag;
          }
        }
      }

      // 스케일 계산
      const timeMin = Math.min(...timeUs);
      const timeMax = Math.max(...timeUs);
      const timeRange = timeMax - timeMin;

      const plotHeight = height - 2 * padding;
      const plotWidth = width - 2 * padding;

      // 그리드 그리기
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = padding + (plotHeight / 10) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // 시간 축 그리기
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = padding + (plotWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // X축 눈금 값 표시
        const timeValue = timeMin + (timeRange / 10) * i;
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeValue.toFixed(1), x, height - padding + 15);
      }

      // Y축 눈금 값 표시
      ctx.fillStyle = '#aaa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      // Real/Imaginary용 Y축 (중간 기준)
      const maxAmplitude = Math.max(
        Math.max(...real.map(Math.abs)),
        Math.max(...imag.map(Math.abs))
      );
      for (let i = 0; i <= 10; i++) {
        const y = padding + (plotHeight / 10) * i;
        const value = maxAmplitude * (1 - (i / 10) * 2); // -maxAmplitude ~ +maxAmplitude
        ctx.fillText(value.toFixed(2), padding - 5, y + 4);
      }
      // 신호 그리기
      const scaleX = plotWidth / timeRange;
      const scaleY = plotHeight / 2;

      // 실수부
      if (showReal) {
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const x = padding + (timeUs[i] - timeMin) * scaleX;
          const y = padding + plotHeight / 2 - real[i] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 허수부
      if (showImag) {
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const x = padding + (timeUs[i] - timeMin) * scaleX;
          const y = padding + plotHeight / 2 - imag[i] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 크기
      if (showMagnitude) {
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const x = padding + (timeUs[i] - timeMin) * scaleX;
          const y = padding + plotHeight - magnitude[i] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 레이블
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time (μs)', width / 2, height - 10);

      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Amplitude', 0, 0);
      ctx.restore();

      // 제목
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Chirp Signal - Time Domain', padding, padding - 10);

      // 범례
      const legendY = padding + 20;
      if (showReal) {
        ctx.strokeStyle = '#4CAF50';
        ctx.beginPath();
        ctx.moveTo(padding + 10, legendY);
        ctx.lineTo(padding + 30, legendY);
        ctx.stroke();
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('Real', padding + 35, legendY + 4);
      }
      if (showImag) {
        ctx.strokeStyle = '#FF9800';
        ctx.beginPath();
        ctx.moveTo(padding + 80, legendY);
        ctx.lineTo(padding + 100, legendY);
        ctx.stroke();
        ctx.fillStyle = '#FF9800';
        ctx.fillText('Imaginary', padding + 105, legendY + 4);
      }
      if (showMagnitude) {
        ctx.strokeStyle = '#2196F3';
        ctx.beginPath();
        ctx.moveTo(padding + 180, legendY);
        ctx.lineTo(padding + 200, legendY);
        ctx.stroke();
        ctx.fillStyle = '#2196F3';
        ctx.fillText('Magnitude', padding + 205, legendY + 4);
      }
      });
    });
  }

  /**
   * Echo 신호 시각화
   */
  displayEchoSignal(
    echoData: Complex64Array,
    config: any,
    options: SignalVisualizationOptions = {}
  ): void {
    // 데이터 저장 (모달에서 사용)
    this.currentEchoData = echoData;
    this.currentConfig = config;
    if (!this.echoCanvas) return;

    const {
      showReal = true,
      showImag = true,
      showMagnitude = true,
      normalize = false
    } = options;

    // 사이드바가 열린 후 Canvas 크기 계산을 위해 약간의 지연
    // requestAnimationFrame을 두 번 사용하여 사이드바 렌더링 완료 보장
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ctx = this.echoCanvas!.getContext('2d');
        if (!ctx) return;

        // Canvas 실제 크기 가져오기 (CSS 크기에 맞춤)
        const rect = this.echoCanvas!.getBoundingClientRect();
        let width = Math.floor(rect.width);
        let height = Math.floor(rect.height * 0.75);
        
        // 사이드바가 아직 열리지 않았거나 크기가 0이면 기본값 사용
        if (width === 0 || height === 0) {
          width = 370;
          height = 250;
        }
      
      this.echoCanvas!.width = width;
      this.echoCanvas!.height = height;
      const padding = 40;

      // 배경 지우기
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, width, height);

      const numSamples = echoData.real.length;
      if (numSamples === 0) return;

      // 시간 벡터 생성 (마이크로초)
      const dt = 1.0 / config.fs;
      const timeUs: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        timeUs.push(i * dt * 1e6);
      }

      // 데이터 준비
      const real = Array.from(echoData.real);
      const imag = Array.from(echoData.imag);
      const magnitude = Array.from(SignalDataProcessor.computeMagnitude(echoData));

      // 정규화
      if (normalize) {
        const maxMag = Math.max(...magnitude);
        if (maxMag > 0) {
          for (let i = 0; i < real.length; i++) {
            real[i] /= maxMag;
            imag[i] /= maxMag;
            magnitude[i] /= maxMag;
          }
        }
      }

      // 스케일 계산
      const timeMin = Math.min(...timeUs);
      const timeMax = Math.max(...timeUs);
      const timeRange = timeMax - timeMin;

      const plotHeight = height - 2 * padding;
      const plotWidth = width - 2 * padding;

      // 그리드 그리기
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = padding + (plotHeight / 10) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // 시간 축 그리기
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = padding + (plotWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // X축 눈금 값 표시
        const timeValue = timeMin + (timeRange / 10) * i;
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeValue.toFixed(1), x, height - padding + 15);
      }

      // Y축 눈금 값 표시
      ctx.fillStyle = '#aaa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      // Real/Imaginary용 Y축 (중간 기준)
      const maxAmplitude = Math.max(
        Math.max(...real.map(Math.abs)),
        Math.max(...imag.map(Math.abs))
      );
      for (let i = 0; i <= 10; i++) {
        const y = padding + (plotHeight / 10) * i;
        const value = maxAmplitude * (1 - (i / 10) * 2); // -maxAmplitude ~ +maxAmplitude
        ctx.fillText(value.toFixed(2), padding - 5, y + 4);
      }
      // 신호 그리기
      const scaleX = plotWidth / timeRange;
      const scaleY = plotHeight / 2;

      // 실수부
      if (showReal) {
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const x = padding + (timeUs[i] - timeMin) * scaleX;
          const y = padding + plotHeight / 2 - real[i] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 허수부
      if (showImag) {
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const x = padding + (timeUs[i] - timeMin) * scaleX;
          const y = padding + plotHeight / 2 - imag[i] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 크기
      if (showMagnitude) {
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const x = padding + (timeUs[i] - timeMin) * scaleX;
          const y = padding + plotHeight - magnitude[i] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 최대값 표시
      const maxIdx = magnitude.indexOf(Math.max(...magnitude));
      if (maxIdx >= 0) {
        const maxX = padding + (timeUs[maxIdx] - timeMin) * scaleX;
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(maxX, padding);
        ctx.lineTo(maxX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 레이블
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time (μs)', width / 2, height - 10);

      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Amplitude', 0, 0);
      ctx.restore();

      // 제목
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Echo Signal - Time Domain', padding, padding - 10);

      // 범례
      const legendY = padding + 20;
      if (showReal) {
        ctx.strokeStyle = '#4CAF50';
        ctx.beginPath();
        ctx.moveTo(padding + 10, legendY);
        ctx.lineTo(padding + 30, legendY);
        ctx.stroke();
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('Real', padding + 35, legendY + 4);
      }
      if (showImag) {
        ctx.strokeStyle = '#FF9800';
        ctx.beginPath();
        ctx.moveTo(padding + 80, legendY);
        ctx.lineTo(padding + 100, legendY);
        ctx.stroke();
        ctx.fillStyle = '#FF9800';
        ctx.fillText('Imaginary', padding + 105, legendY + 4);
      }
      if (showMagnitude) {
        ctx.strokeStyle = '#2196F3';
        ctx.beginPath();
        ctx.moveTo(padding + 180, legendY);
        ctx.lineTo(padding + 200, legendY);
        ctx.stroke();
        ctx.fillStyle = '#2196F3';
        ctx.fillText('Magnitude', padding + 205, legendY + 4);
      }
      });
    });
  }

  /**
   * 통계 정보 표시
   */
  displayStatistics(
    chirpStats: SignalStatistics | null,
    echoStats: SignalStatistics | null
  ): void {
    // Chirp 통계
    if (this.chirpStatisticsDiv && chirpStats) {
      this.chirpStatisticsDiv.innerHTML = `
        <div style="font-size: 12px; color: #ccc; margin-top: 10px;">
          <strong>Chirp Signal 통계:</strong><br>
          최대 진폭: ${chirpStats.max.toExponential(3)}<br>
          평균 진폭: ${chirpStats.mean.toExponential(3)}<br>
          ${chirpStats.min !== undefined ? `최소 진폭: ${chirpStats.min.toExponential(3)}<br>` : ''}
          샘플 수: ${chirpStats.totalSamples || 0}
        </div>
      `;
    }

    // Echo 통계
    if (this.echoStatisticsDiv && echoStats) {
      this.echoStatisticsDiv.innerHTML = `
        <div style="font-size: 12px; color: #ccc; margin-top: 10px;">
          <strong>Echo Signal 통계:</strong><br>
          최대 진폭: ${echoStats.max.toExponential(3)}<br>
          평균 진폭: ${echoStats.mean.toExponential(3)}<br>
          ${echoStats.min !== undefined ? `최소 진폭: ${echoStats.min.toExponential(3)}<br>` : ''}
          Non-zero 샘플: ${echoStats.nonZeroSamples || 0} / ${echoStats.totalSamples || 0}
        </div>
      `;
    }
  }
}
