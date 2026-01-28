/**
 * Signal 데이터 처리 유틸리티
 * Base64 디코딩 및 복소수 배열 처리
 */

import { Complex64Array, SignalStatistics } from '../types/signal.types.js';

/**
 * Base64 디코딩 및 복소수 배열 복원
 * 
 * 백엔드에서 전송되는 형식: [real, imag, real, imag, ...] (Float32)
 * 
 * @param base64Data Base64 인코딩된 데이터
 * @param shape 신호 shape (예: [num_samples] 또는 [num_pulses, num_samples])
 * @returns 복소수 배열
 */
export function decodeBase64ComplexData(
  base64Data: string,
  shape: number[]
): Complex64Array {
  // Base64 디코딩
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Float32 배열로 변환
  const float32Array = new Float32Array(bytes.buffer);
  
  // 복소수 배열로 변환 (실수부/허수부 분리)
  const numSamples = shape.length === 1 ? shape[0] : shape[shape.length - 1];
  const real = new Float32Array(numSamples);
  const imag = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    real[i] = float32Array[i * 2];
    imag[i] = float32Array[i * 2 + 1];
  }
  
  return { real, imag };
}

/**
 * 복소수 배열의 크기(Magnitude) 계산
 * 
 * @param complexData 복소수 배열
 * @returns 크기 배열
 */
export function computeMagnitude(complexData: Complex64Array): Float32Array {
  const { real, imag } = complexData;
  const magnitude = new Float32Array(real.length);
  
  for (let i = 0; i < real.length; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  
  return magnitude;
}

/**
 * 복소수 배열의 위상(Phase) 계산
 * 
 * @param complexData 복소수 배열
 * @returns 위상 배열 (라디안)
 */
export function computePhase(complexData: Complex64Array): Float32Array {
  const { real, imag } = complexData;
  const phase = new Float32Array(real.length);
  
  for (let i = 0; i < real.length; i++) {
    phase[i] = Math.atan2(imag[i], real[i]);
  }
  
  return phase;
}

/**
 * 신호 통계 계산
 * 
 * @param complexData 복소수 배열
 * @returns 통계 정보
 */
export function computeStatistics(complexData: Complex64Array): SignalStatistics {
  const magnitude = computeMagnitude(complexData);
  
  let max = -Infinity;
  let min = Infinity;
  let sum = 0;
  let sumSq = 0;
  let nonZeroCount = 0;
  
  for (let i = 0; i < magnitude.length; i++) {
    const val = magnitude[i];
    if (val > max) max = val;
    if (val < min) min = val;
    sum += val;
    sumSq += val * val;
    if (val > 0) nonZeroCount++;
  }
  
  const mean = sum / magnitude.length;
  const variance = (sumSq / magnitude.length) - (mean * mean);
  const std = Math.sqrt(Math.max(0, variance));
  
  return {
    max,
    mean,
    min,
    std,
    nonZeroSamples: nonZeroCount,
    totalSamples: magnitude.length
  };
}

/**
 * Signal 데이터 프로세서 클래스
 */
export class SignalDataProcessor {
  /**
   * Base64 디코딩 및 복소수 배열 복원
   */
  static decodeBase64ComplexData = decodeBase64ComplexData;
  
  /**
   * 크기 계산
   */
  static computeMagnitude = computeMagnitude;
  
  /**
   * 위상 계산
   */
  static computePhase = computePhase;
  
  /**
   * 통계 계산
   */
  static computeStatistics = computeStatistics;
}
