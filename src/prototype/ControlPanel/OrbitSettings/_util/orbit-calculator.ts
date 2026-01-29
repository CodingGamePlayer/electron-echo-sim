/**
 * 궤도 6요소로부터 위성 위치 계산 유틸리티
 */

// 지구 상수
const EARTH_RADIUS_KM = 6378.137; // WGS84 장반경 (km)
const EARTH_GM = 3.986004418e14; // 지구 중력 상수 (m³/s²)
const EARTH_GM_KM = 3.986004418e5; // 지구 중력 상수 (km³/s²)
const EARTH_ROTATION_RATE_RAD_PER_SEC = 7.292115e-5; // 지구 자전 속도 (rad/s)

/**
 * 궤도 6요소 타입 정의
 */
export interface OrbitalElements {
  /** 긴반지름 (km) */
  semiMajorAxis: number;
  /** 이심률 */
  eccentricity: number;
  /** 궤도 경사각 (deg) */
  inclination: number;
  /** 승교점 적경 (deg) */
  raan: number;
  /** 근지점 편각 (deg) */
  argumentOfPerigee: number;
  /** 진근점이각 또는 평균근점이각 (deg) */
  trueAnomaly?: number;
  meanAnomaly?: number;
}

/**
 * 평균 근점 이각(M)을 진근점 이각(ν)으로 변환
 */
function meanAnomalyToTrueAnomaly(meanAnomaly: number, eccentricity: number): number {
  // 케플러 방정식: M = E - e*sin(E)
  // E: 이심이상 (Eccentric Anomaly)
  // 반복법으로 E 계산
  let E = meanAnomaly;
  const tolerance = 1e-8;
  const maxIterations = 50;
  
  for (let i = 0; i < maxIterations; i++) {
    const ENew = meanAnomaly + eccentricity * Math.sin(E);
    if (Math.abs(ENew - E) < tolerance) {
      E = ENew;
      break;
    }
    E = ENew;
  }
  
  // 진근점 이각 계산: tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
  const tanNuHalf = Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(E / 2);
  const trueAnomaly = 2 * Math.atan(tanNuHalf);
  
  return trueAnomaly;
}

/**
 * 진근점 이각(ν)을 평균 근점 이각(M)으로 변환
 */
function trueAnomalyToMeanAnomaly(trueAnomaly: number, eccentricity: number): number {
  // 진근점 이각에서 이심이상 계산
  const tanEHalf = Math.sqrt((1 - eccentricity) / (1 + eccentricity)) * Math.tan(trueAnomaly / 2);
  const E = 2 * Math.atan(tanEHalf);
  
  // 평균 근점 이각 계산: M = E - e*sin(E)
  const meanAnomaly = E - eccentricity * Math.sin(E);
  
  return meanAnomaly;
}

/**
 * 궤도 6요소로부터 특정 시간의 위성 위치 계산 (ECI 좌표계)
 */
function calculatePositionFromOrbitalElements(
  elements: OrbitalElements,
  timeSinceEpoch: number // 초 단위
): { x: number; y: number; z: number } {
  const a = elements.semiMajorAxis; // km
  const e = elements.eccentricity;
  const i = Cesium.Math.toRadians(elements.inclination);
  const raan = Cesium.Math.toRadians(elements.raan);
  const omega = Cesium.Math.toRadians(elements.argumentOfPerigee);
  
  // 진근점 이각 계산
  let trueAnomaly: number;
  const n = Math.sqrt(EARTH_GM_KM / (a * a * a)); // 평균 운동 (rad/s)
  
  if (elements.trueAnomaly !== undefined) {
    // 진근점이각을 사용하는 경우도 시간에 따라 업데이트
    const trueAnomalyRad = Cesium.Math.toRadians(elements.trueAnomaly);
    
    // 1. 진근점이각 → 평균근점이각 변환
    const meanAnomalyInitial = trueAnomalyToMeanAnomaly(trueAnomalyRad, e);
    
    // 2. 시간에 따른 평균 근점 이각 업데이트
    const meanAnomalyAtTime = meanAnomalyInitial + n * timeSinceEpoch;
    
    // 3. 다시 진근점이각으로 변환
    trueAnomaly = meanAnomalyToTrueAnomaly(meanAnomalyAtTime, e);
  } else if (elements.meanAnomaly !== undefined) {
    // 평균 근점 이각을 진근점 이각으로 변환
    const meanAnomalyRad = Cesium.Math.toRadians(elements.meanAnomaly);
    // 시간에 따른 평균 근점 이각 업데이트
    const meanAnomalyAtTime = meanAnomalyRad + n * timeSinceEpoch;
    trueAnomaly = meanAnomalyToTrueAnomaly(meanAnomalyAtTime, e);
  } else {
    throw new Error('진근점이각 또는 평균근점이각이 필요합니다.');
  }
  
  // 궤도 반지름 계산: r = a(1 - e²) / (1 + e*cos(ν))
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));
  
  // 궤도면 좌표계에서의 위치 (perifocal coordinate system)
  const xPerifocal = r * Math.cos(trueAnomaly);
  const yPerifocal = r * Math.sin(trueAnomaly);
  
  // 회전 행렬을 사용하여 ECI 좌표계로 변환
  // Python 코드를 참고한 정확한 회전 행렬 적용
  const cosOmega = Math.cos(raan);  // Ω (RAAN)
  const sinOmega = Math.sin(raan);
  const cosI = Math.cos(i);          // i (inclination)
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);      // ω (argument of perigee)
  const sinW = Math.sin(omega);
  
  // 회전 행렬 적용 (Python 코드와 동일한 방식)
  // x = (cos_omega * cos_w - sin_omega * sin_w * cos_i) * x_orb + 
  //     (-cos_omega * sin_w - sin_omega * cos_w * cos_i) * y_orb
  const x = (cosOmega * cosW - sinOmega * sinW * cosI) * xPerifocal +
            (-cosOmega * sinW - sinOmega * cosW * cosI) * yPerifocal;
  
  // y = (sin_omega * cos_w + cos_omega * sin_w * cos_i) * x_orb + 
  //     (-sin_omega * sin_w + cos_omega * cos_w * cos_i) * y_orb
  const y = (sinOmega * cosW + cosOmega * sinW * cosI) * xPerifocal +
            (-sinOmega * sinW + cosOmega * cosW * cosI) * yPerifocal;
  
  // z = (sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb
  const z = (sinW * sinI) * xPerifocal + (cosW * sinI) * yPerifocal;
  
  return { x: x * 1000, y: y * 1000, z: z * 1000 }; // km를 m로 변환
}

/**
 * ECI 좌표를 지리 좌표(위도, 경도, 고도)로 변환
 * Python 코드를 참고하여 지구 자전 각도를 직접 계산하는 방식 사용
 */
function eciToGeodetic(
  eciX: number,
  eciY: number,
  eciZ: number,
  time: Cesium.JulianDate,
  earthRotationAngleDegrees: number
): { longitude: number; latitude: number; altitude: number } {
  // Python 코드 방식: 지구 자전 각도를 직접 사용
  // 도를 라디안으로 변환하고 0~2π 범위로 정규화
  const rotationRad = ((earthRotationAngleDegrees % 360) * Math.PI / 180.0 + 2 * Math.PI) % (2 * Math.PI);
  
  // Python 코드 방식: 지구 자전 보정
  // x_rot = x * cos(rotation) + y * sin(rotation)
  // y_rot = -x * sin(rotation) + y * cos(rotation)
  // z_rot = z
  const cosRot = Math.cos(rotationRad);
  const sinRot = Math.sin(rotationRad);
  const ecefX = eciX * cosRot + eciY * sinRot;
  const ecefY = -eciX * sinRot + eciY * cosRot;
  const ecefZ = eciZ;
  
  // ECEF를 지리 좌표로 변환
  const cartesian = new Cesium.Cartesian3(ecefX, ecefY, ecefZ);
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  
  return {
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    altitude: cartographic.height
  };
}

/**
 * 궤도 6요소로부터 시간에 따른 위치 배열 계산
 * Python 코드를 참고하여 지구 자전을 고려한 정확한 계산
 */
export function calculateOrbitPath(
  elements: OrbitalElements,
  startTime: Cesium.JulianDate,
  durationHours: number,
  sampleIntervalMinutes: number = 1
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  const sampleIntervalSeconds = sampleIntervalMinutes * 60;
  const totalSamples = Math.floor((durationHours * 3600) / sampleIntervalSeconds);
  
  // epoch 시간 (현재 시간)
  const epochTime = startTime;
  
  // 지구 자전 속도 (도/분) - Python 코드와 동일
  const earthRotationRateDegPerMin = 360.0 / (24 * 60); // 약 0.25도/분
  
  // 디버깅: 첫 번째와 마지막 점의 지구 자전 각도 로그 출력
  let firstEarthRotationAngle: number | null = null;
  let lastEarthRotationAngle: number | null = null;
  
  for (let i = 0; i <= totalSamples; i++) {
    const timeSinceEpoch = i * sampleIntervalSeconds;
    const timeMinutes = timeSinceEpoch / 60;
    const currentTime = Cesium.JulianDate.addSeconds(epochTime, timeSinceEpoch, new Cesium.JulianDate());
    
    try {
      // ECI 좌표 계산 (calculatePositionFromOrbitalElements가 시간에 따라 진근점이각을 자동 업데이트)
      const eciPos = calculatePositionFromOrbitalElements(elements, timeSinceEpoch);
      
      // Python 코드 방식: 지구 자전 각도 계산 (도/분)
      // 지구 자전 속도: 360도 / (24시간 * 60분) = 0.25도/분
      const earthRotationAngleDegrees = earthRotationRateDegPerMin * timeMinutes;
      
      // 첫 번째와 마지막 점의 지구 자전 각도 저장
      if (i === 0) {
        firstEarthRotationAngle = earthRotationAngleDegrees;
      }
      if (i === totalSamples) {
        lastEarthRotationAngle = earthRotationAngleDegrees;
      }
      
      // ECI를 지리 좌표로 변환 (지구 자전 각도 사용)
      const geodetic = eciToGeodetic(eciPos.x, eciPos.y, eciPos.z, currentTime, earthRotationAngleDegrees);
      
      // Cesium Cartesian3로 변환
      const cartesian = Cesium.Cartesian3.fromDegrees(
        geodetic.longitude,
        geodetic.latitude,
        geodetic.altitude
      );
      
      positions.push(cartesian);
    } catch (error) {
      console.warn(`궤도 위치 계산 실패 (시간: ${timeSinceEpoch}s):`, error);
    }
  }
  
  // 지구 자전 각도 로그 출력
  if (firstEarthRotationAngle !== null && lastEarthRotationAngle !== null) {
    console.log(`[OrbitCalculator] 지구 자전 각도:`);
    console.log(`  시작 시점: ${firstEarthRotationAngle.toFixed(4)}도 (시간: 0분)`);
    console.log(`  종료 시점: ${lastEarthRotationAngle.toFixed(4)}도 (시간: ${(durationHours * 60).toFixed(1)}분)`);
    console.log(`  총 자전 각도: ${(lastEarthRotationAngle - firstEarthRotationAngle).toFixed(4)}도`);
    console.log(`  지구 자전 속도: ${earthRotationRateDegPerMin.toFixed(6)}도/분 (${(earthRotationRateDegPerMin * 60).toFixed(4)}도/시간)`);
  }
  
  return positions;
}

/**
 * 궤도 주기 계산 (케플러 제3법칙)
 */
export function calculateOrbitalPeriod(semiMajorAxisKm: number): number {
  // T = 2π * sqrt(a³ / GM)
  const a = semiMajorAxisKm * 1000; // m로 변환
  const periodSeconds = 2 * Math.PI * Math.sqrt((a * a * a) / EARTH_GM);
  return periodSeconds / 3600; // 시간 단위로 반환
}
