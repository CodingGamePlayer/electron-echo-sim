/**
 * Swath 파라미터 계산 유틸리티
 * 
 * SAR 시스템 설정 파라미터에서 Swath 시각화 파라미터를 계산합니다.
 * 상세한 계산 방법은 docs/swath-param-calculation.md 문서를 참조하세요.
 */

// 물리 상수
const LIGHT_SPEED = 299792458; // 빛의 속도 (m/s)
const EARTH_RADIUS = 6378137; // 지구 반경 (m) - WGS84)

// SAR 시스템 설정 인터페이스
export interface SarSystemConfig {
  fc: number;              // 반송파 주파수 (Hz)
  swst: number;            // 샘플링 윈도우 시작 시간 (s)
  swl: number;              // 샘플링 윈도우 길이 (s)
  orbit_height: number;    // 궤도 높이 (m)
  antenna_width: number;   // 안테나 폭 (m)
  antenna_height: number;  // 안테나 높이 (m)
  prf?: number;            // 펄스 반복 주파수 (Hz) - rank 계산에 필요
  taup?: number;            // 펄스 폭 (s) - rank 계산에 필요
  el_angle?: number;       // Elevation angle (deg) - rank 계산에 사용 (있으면 더 정확)
  az_angle?: number;       // Azimuth angle (deg) - rank 계산에 사용
}

// Swath 파라미터 인터페이스
export interface SwathParams {
  nearRange: number;       // 최근접 그라운드 레인지 (m)
  farRange: number;        // 최원거리 그라운드 레인지 (m)
  swathWidth: number;       // Swath 폭 (m)
  azimuthLength: number;   // Azimuth 방향 길이 (m)
}

/**
 * Rank 추정
 * 
 * el_angle이 있으면 사용하고, 없으면 Look angle을 기본값(30도)으로 가정하여 rank를 추정합니다.
 * rank는 레이더 모호성(ambiguity)을 나타내는 펄스 번호입니다.
 * 
 * @param swst 샘플링 윈도우 시작 시간 (s)
 * @param prf 펄스 반복 주파수 (Hz)
 * @param orbitHeight 궤도 높이 (m)
 * @param elAngleDeg Elevation angle (deg, 있으면 사용, 없으면 기본값 30도)
 * @returns 추정된 rank
 */
function estimateRank(
  swst: number,
  prf: number,
  orbitHeight: number,
  elAngleDeg?: number
): number {
  // el_angle이 있고 0이 아니면 사용, 없거나 0이면 기본값 30도 사용
  // el_angle=0.0은 유효하지 않은 look angle일 수 있으므로 기본값 사용
  // el_angle은 빔의 기본 방향이므로 look angle의 근사값으로 사용 가능
  const lookAngleDeg = (elAngleDeg !== undefined && elAngleDeg !== 0) ? elAngleDeg : 30;
  
  // Look angle을 라디안으로 변환
  const lookAngleRad = (lookAngleDeg * Math.PI) / 180;
  
  // 최소 거리 = orbit_height / cos(look_angle)
  // Look angle이 클수록 최소 거리가 증가합니다.
  const minRange = orbitHeight / Math.cos(lookAngleRad);
  
  // 최소 시간 = 2 * min_range / c (왕복 거리)
  const minTime = (2 * minRange) / LIGHT_SPEED;
  
  // rank = ceil((min_time - swst) * prf)
  // swst는 샘플링 시작 시간이므로, 전체 시간에서 swst를 빼고
  // PRF로 나누어 몇 번째 펄스인지 계산합니다.
  const rank = Math.ceil((minTime - swst) * prf);
  
  return Math.max(0, rank); // rank는 0 이상이어야 함
}

/**
 * 슬랜트 레인지를 그라운드 레인지로 변환
 * 
 * 지구 곡률을 고려하여 위성에서 타겟까지의 직선 거리(슬랜트 레인지)를
 * 지표면을 따라 측정된 거리(그라운드 레인지)로 변환합니다.
 * 
 * @param slantRange 슬랜트 레인지 (m)
 * @param orbitHeight 위성 궤도 높이 (m)
 * @returns 그라운드 레인지 (m)
 */
function slantToGroundRange(slantRange: number, orbitHeight: number): number {
  const satelliteRadius = EARTH_RADIUS + orbitHeight;
  
  // 슬랜트 레인지가 위성 반경보다 작거나 같으면 물리적으로 불가능
  // 이 경우 swst가 실제 레인지가 아닌 샘플링 시작 시간일 수 있으므로
  // 평면 근사를 사용합니다.
  if (slantRange <= satelliteRadius) {
    // swst는 레이더 신호 처리에서의 샘플링 시작 시간이므로,
    // 실제 레인지와 직접 연결되지 않을 수 있습니다.
    // 하지만 일반적으로 swst는 최근접 레인지에 해당하는 시간이므로,
    // 지구 곡률을 고려하지 않고 평면 근사를 사용합니다.
    
    // 평면 근사: 지구를 평면으로 가정하고 피타고라스 정리 사용
    // R_slant² = orbitHeight² + R_ground²
    // R_ground = sqrt(R_slant² - orbitHeight²)
    const groundRangeSquared = slantRange * slantRange - orbitHeight * orbitHeight;
    
    if (groundRangeSquared > 0) {
      // 평면 근사로 계산
      return Math.sqrt(groundRangeSquared);
    } else {
      // 물리적으로 불가능한 경우 (슬랜트 레인지가 궤도 높이보다 작음)
      // swst가 다른 의미일 수 있으므로, 슬랜트 레인지를 그대로 사용
      // 실제로는 swst가 레이더 신호 처리에서의 샘플링 시작 시간이므로
      // 실제 레인지와 직접 연결되지 않을 수 있음
      // 하지만 UI에 의미 있는 값을 표시하기 위해 슬랜트 레인지를 그대로 반환
      console.warn(`Slant range (${slantRange}m) is less than orbit height (${orbitHeight}m). Using slant range directly. This may indicate that swst is not a direct range measurement.`);
      return slantRange;
    }
  }
  
  // 코사인 법칙을 사용하여 각도 계산
  // R_slant² = R_earth² + R_sat² - 2 × R_earth × R_sat × cos(θ)
  // cos(θ) = (R_earth² + R_sat² - R_slant²) / (2 × R_earth × R_sat)
  const cosAngle = (EARTH_RADIUS * EARTH_RADIUS + 
                    satelliteRadius * satelliteRadius - 
                    slantRange * slantRange) / 
                   (2 * EARTH_RADIUS * satelliteRadius);
  
  // cosAngle이 1보다 크면 물리적으로 불가능 (수치 오차일 수 있음)
  // cosAngle이 -1보다 작으면 물리적으로 불가능
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  
  // 각도 계산 (0 ~ π 범위)
  const angle = Math.acos(clampedCosAngle);
  
  // 그라운드 레인지 = 지구 반경 × 각도
  const groundRange = EARTH_RADIUS * angle;
  
  return groundRange;
}

/**
 * SAR 시스템 설정에서 Swath 파라미터를 계산
 * 
 * @param sarConfig SAR 시스템 설정
 * @returns 계산된 Swath 파라미터
 */
export function calculateSwathParamsFromSarConfig(sarConfig: SarSystemConfig): SwathParams {
  // prf와 taup이 제공되지 않은 경우, 기본값 사용 또는 경고
  const prf = sarConfig.prf;
  const taup = sarConfig.taup ?? 0; // taup이 없으면 0으로 가정 (영향 최소화)
  
  if (!prf) {
    // prf가 없으면 기존 방식으로 폴백 (호환성 유지)
    console.warn('PRF가 제공되지 않아 rank 추정을 사용할 수 없습니다. 기본 계산 방식을 사용합니다.');
    return calculateSwathParamsLegacy(sarConfig);
  }
  
  // 1. Rank 추정 (el_angle이 있으면 사용, 없으면 기본값 30도)
  const rank = estimateRank(sarConfig.swst, prf, sarConfig.orbit_height, sarConfig.el_angle);
  
  // 2. Near Range 계산 (rank 기반)
  // min_dist_swst = 0.5 * c * (rank / prf + swst)
  const nearSlantRange = 0.5 * LIGHT_SPEED * (rank / prf + sarConfig.swst);
  const nearRange = slantToGroundRange(nearSlantRange, sarConfig.orbit_height);
  
  // 3. Far Range 계산 (rank 기반)
  // max_dist_swet = 0.5 * c * (rank / prf + swst + swl - taup)
  const farSlantRange = 0.5 * LIGHT_SPEED * (rank / prf + sarConfig.swst + sarConfig.swl - taup);
  const farRange = slantToGroundRange(farSlantRange, sarConfig.orbit_height);
  
  // 4. Swath Width 계산
  const swathWidth = farRange - nearRange;
  
  // 5. Azimuth Length 계산
  // 파장 = c / fc
  const wavelength = LIGHT_SPEED / sarConfig.fc;
  
  // Azimuth 빔폭 (라디안) = λ / antenna_width
  const beamwidthAzRad = wavelength / sarConfig.antenna_width;
  
  // Azimuth Length = orbit_height × tan(beamwidth_az) × 2
  const azimuthLength = sarConfig.orbit_height * Math.tan(beamwidthAzRad) * 2;
  
  return {
    nearRange,
    farRange,
    swathWidth,
    azimuthLength
  };
}

/**
 * 레거시 방식으로 Swath 파라미터 계산 (prf가 없는 경우 호환성 유지)
 * 
 * @param sarConfig SAR 시스템 설정
 * @returns 계산된 Swath 파라미터
 */
function calculateSwathParamsLegacy(sarConfig: SarSystemConfig): SwathParams {
  // 1. Near Range 계산
  // 슬랜트 레인지 = swst × c / 2
  const nearSlantRange = sarConfig.swst * LIGHT_SPEED / 2;
  const nearRange = slantToGroundRange(nearSlantRange, sarConfig.orbit_height);
  
  // 2. Far Range 계산
  // 슬랜트 레인지 = (swst + swl) × c / 2
  const farSlantRange = (sarConfig.swst + sarConfig.swl) * LIGHT_SPEED / 2;
  const farRange = slantToGroundRange(farSlantRange, sarConfig.orbit_height);
  
  // 3. Swath Width 계산
  const swathWidth = farRange - nearRange;
  
  // 4. Azimuth Length 계산
  // 파장 = c / fc
  const wavelength = LIGHT_SPEED / sarConfig.fc;
  
  // Azimuth 빔폭 (라디안) = λ / antenna_width
  const beamwidthAzRad = wavelength / sarConfig.antenna_width;
  
  // Azimuth Length = orbit_height × tan(beamwidth_az) × 2
  const azimuthLength = sarConfig.orbit_height * Math.tan(beamwidthAzRad) * 2;
  
  return {
    nearRange,
    farRange,
    swathWidth,
    azimuthLength
  };
}

/**
 * SAR 설정 값 검증
 * 
 * @param sarConfig SAR 시스템 설정
 * @throws Error 유효하지 않은 값이 있는 경우
 */
export function validateSarConfig(sarConfig: SarSystemConfig): void {
  if (sarConfig.fc <= 0) {
    throw new Error('반송파 주파수(fc)는 0보다 커야 합니다.');
  }
  if (sarConfig.swst < 0) {
    throw new Error('샘플링 윈도우 시작 시간(swst)은 0 이상이어야 합니다.');
  }
  if (sarConfig.swl <= 0) {
    throw new Error('샘플링 윈도우 길이(swl)는 0보다 커야 합니다.');
  }
  if (sarConfig.orbit_height <= 0) {
    throw new Error('궤도 높이(orbit_height)는 0보다 커야 합니다.');
  }
  if (sarConfig.antenna_width <= 0) {
    throw new Error('안테나 폭(antenna_width)은 0보다 커야 합니다.');
  }
  if (sarConfig.antenna_height <= 0) {
    throw new Error('안테나 높이(antenna_height)는 0보다 커야 합니다.');
  }
  
  // 슬랜트 레인지가 위성 반경보다 작으면 물리적으로 불가능
  const satelliteRadius = EARTH_RADIUS + sarConfig.orbit_height;
  const nearSlantRange = sarConfig.swst * LIGHT_SPEED / 2;
  if (nearSlantRange < satelliteRadius) {
    // 경고: 일반적으로 슬랜트 레인지는 위성 반경보다 커야 하지만,
    // 지구 곡률로 인해 그라운드 레인지가 계산 가능한 경우가 있으므로 경고만
    console.warn('Near slant range가 위성 반경보다 작습니다. 계산 결과를 확인하세요.');
  }
}
