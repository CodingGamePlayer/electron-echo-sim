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
  private container: HTMLElement;
  private chirpCanvas: HTMLCanvasElement | null;
  private echoCanvas: HTMLCanvasElement | null;
  private chirpStatisticsDiv: HTMLElement | null;
  private echoStatisticsDiv: HTMLElement | null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container element not found: ${containerId}`);
    }

    this.chirpCanvas = document.getElementById('chirpSignalCanvas') as HTMLCanvasElement;
    this.echoCanvas = document.getElementById('echoSignalCanvas') as HTMLCanvasElement;
    this.chirpStatisticsDiv = document.getElementById('chirpStatistics') as HTMLElement;
    this.echoStatisticsDiv = document.getElementById('echoStatistics') as HTMLElement;
  }

  /**
   * 패널 표시
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * 패널 숨기기
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
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
    if (!this.chirpCanvas) return;

    const {
      showReal = true,
      showImag = true,
      showMagnitude = true,
      normalize = false
    } = options;

    const ctx = this.chirpCanvas.getContext('2d');
    if (!ctx) return;

    const width = this.chirpCanvas.width;
    const height = this.chirpCanvas.height;
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
  }

  /**
   * Echo 신호 시각화
   */
  displayEchoSignal(
    echoData: Complex64Array,
    config: any,
    options: SignalVisualizationOptions = {}
  ): void {
    if (!this.echoCanvas) return;

    const {
      showReal = true,
      showImag = true,
      showMagnitude = true,
      normalize = false
    } = options;

    const ctx = this.echoCanvas.getContext('2d');
    if (!ctx) return;

    const width = this.echoCanvas.width;
    const height = this.echoCanvas.height;
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
