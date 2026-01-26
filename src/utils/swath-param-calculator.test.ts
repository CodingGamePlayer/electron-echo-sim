/**
 * Swath 파라미터 계산 검증 테스트
 * 
 * C5 기본 설정값으로 rank 추정 및 계산이 올바르게 작동하는지 검증합니다.
 */

import { calculateSwathParamsFromSarConfig, SarSystemConfig } from './swath-param-calculator.js';

// C5 기본 설정값 (검증 스크립트와 동일)
const C5_CONFIG: SarSystemConfig = {
  fc: 5410000000,              // 5.41 GHz
  swst: 0.0000478,            // 47.8 μs
  swl: 0.0000455,             // 45.5 μs
  orbit_height: 561000,       // 561 km
  antenna_width: 3.9,         // 3.9 m
  antenna_height: 1.9,        // 1.9 m
  prf: 5930,                  // 5930 Hz
  taup: 0.000011              // 11 μs
} as const;

/**
 * C5 설정값으로 검증
 */
export function verifyC5Config(): void {
  console.log('=== C5 설정값 검증 ===');
  console.log('설정값:');
  console.log(`  swst: ${C5_CONFIG.swst * 1e6} μs`);
  console.log(`  swl: ${C5_CONFIG.swl * 1e6} μs`);
  console.log(`  taup: ${(C5_CONFIG.taup ?? 0) * 1e6} μs`);
  console.log(`  prf: ${C5_CONFIG.prf} Hz`);
  console.log(`  orbit_height: ${C5_CONFIG.orbit_height / 1000} km`);
  console.log();

  const swathParams = calculateSwathParamsFromSarConfig(C5_CONFIG);

  console.log('계산 결과:');
  console.log(`  Near Range: ${swathParams.nearRange.toFixed(2)} m (${(swathParams.nearRange / 1000).toFixed(2)} km)`);
  console.log(`  Far Range: ${swathParams.farRange.toFixed(2)} m (${(swathParams.farRange / 1000).toFixed(2)} km)`);
  console.log(`  Swath Width: ${swathParams.swathWidth.toFixed(2)} m (${(swathParams.swathWidth / 1000).toFixed(2)} km)`);
  console.log(`  Azimuth Length: ${swathParams.azimuthLength.toFixed(2)} m (${(swathParams.azimuthLength / 1000).toFixed(2)} km)`);
  console.log();

  // 검증: 예상 범위 확인
  const expectedNearRangeMin = 200000;  // 200 km
  const expectedNearRangeMax = 500000;  // 500 km
  const expectedSwathWidthMin = 5000;    // 5 km
  const expectedSwathWidthMax = 15000;  // 15 km

  console.log('검증 결과:');
  const nearRangeValid = swathParams.nearRange >= expectedNearRangeMin && swathParams.nearRange <= expectedNearRangeMax;
  const swathWidthValid = swathParams.swathWidth >= expectedSwathWidthMin && swathParams.swathWidth <= expectedSwathWidthMax;
  
  console.log(`  Near Range 검증: ${nearRangeValid ? '✓ 통과' : '✗ 실패'} (${expectedNearRangeMin / 1000} - ${expectedNearRangeMax / 1000} km 범위)`);
  console.log(`  Swath Width 검증: ${swathWidthValid ? '✓ 통과' : '✗ 실패'} (${expectedSwathWidthMin / 1000} - ${expectedSwathWidthMax / 1000} km 범위)`);
  console.log();

  if (nearRangeValid && swathWidthValid) {
    console.log('✓ 모든 검증 통과!');
  } else {
    console.log('✗ 일부 검증 실패');
  }

  return;
}

// 브라우저 콘솔에서 실행 가능하도록 전역 함수로 등록
if (typeof window !== 'undefined') {
  (window as any).verifyC5Config = verifyC5Config;
}
