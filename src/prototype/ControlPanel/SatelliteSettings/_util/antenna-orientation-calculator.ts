import { calculateBaseAxes } from './base-axes-calculator.js';

/**
 * 안테나 방향 계산 유틸리티
 */

/**
 * 안테나 방향 계산
 * 안테나의 바닥면(depth x width)이 BUS를 바라보도록 기본 방향 설정
 * yaw 90도가 0도일 때 정상 위치가 되도록 설정
 * 
 * @param busAxes BUS의 로컬 좌표계 기본 축
 * @param rollAngle Roll 각도 (도)
 * @param pitchAngle Pitch 각도 (도)
 * @param yawAngle Yaw 각도 (도)
 * @param elevationAngle Elevation 각도 (도)
 * @param azimuthAngle Azimuth 각도 (도)
 * @returns 안테나 방향 쿼터니언
 */
export function calculateAntennaOrientation(
  busAxes: { xAxis: any; yAxis: any; zAxis: any },
  rollAngle: number,
  pitchAngle: number,
  yawAngle: number,
  elevationAngle: number,
  azimuthAngle: number
): any {
  // 각도를 라디안으로 변환
  // yaw 90도가 0도가 되도록 하기 위해 yaw에 90도를 더함
  const rollRad = Cesium.Math.toRadians(rollAngle);
  const pitchRad = Cesium.Math.toRadians(pitchAngle + 90);
  const yawRad = Cesium.Math.toRadians(yawAngle + 90); // yaw 90도가 0도가 되도록
  const elevationRad = Cesium.Math.toRadians(elevationAngle);
  const azimuthRad = Cesium.Math.toRadians(azimuthAngle);

  // 안테나의 기본 방향: 바닥면(depth x width, X-Y 평면)이 BUS를 향하도록
  // 안테나의 -Z축이 BUS의 -Y축 방향을 향하도록 설정
  // Cesium Box의 dimensions: (depth, width, height) = (X, Y, Z)
  // 바닥면은 X-Y 평면이므로, 안테나의 -Z축이 BUS를 향해야 함

  // 1. 기본 방향: 안테나의 -Z축이 BUS의 -Y축 방향을 향하도록
  // BUS의 -Y축 방향 벡터
  const busNegativeYAxis = Cesium.Cartesian3.negate(busAxes.yAxis, new Cesium.Cartesian3());
  
  // 안테나의 기본 -Z축 (안테나 로컬 좌표계에서 -Z축은 height의 반대 방향)
  // 안테나가 BUS의 Y축 방향에 위치하므로, 안테나의 -Z축이 BUS를 향하도록
  // 기본적으로 안테나의 -Z축을 BUS의 -Y축과 정렬
  const antennaBaseNegativeZAxis = busNegativeYAxis;

  // 안테나의 기본 X축 (depth 방향)은 BUS의 X축과 정렬
  const antennaBaseXAxis = busAxes.xAxis;
  
  // 안테나의 기본 Y축 (width 방향)은 외적으로 계산 (Z × X)
  const antennaBaseZAxis = Cesium.Cartesian3.negate(antennaBaseNegativeZAxis, new Cesium.Cartesian3());
  const antennaBaseYAxis = Cesium.Cartesian3.cross(
    antennaBaseZAxis,
    antennaBaseXAxis,
    new Cesium.Cartesian3()
  );
  const antennaBaseYAxisNormalized = Cesium.Cartesian3.normalize(antennaBaseYAxis, new Cesium.Cartesian3());
  
  // X축 재계산 (Y × Z로 정규화 보정)
  const antennaBaseXAxisCorrected = Cesium.Cartesian3.cross(
    antennaBaseYAxisNormalized,
    antennaBaseZAxis,
    new Cesium.Cartesian3()
  );
  const antennaBaseXAxisNormalized = Cesium.Cartesian3.normalize(antennaBaseXAxisCorrected, new Cesium.Cartesian3());
  
  const antennaBaseZAxisNormalized = Cesium.Cartesian3.normalize(antennaBaseZAxis, new Cesium.Cartesian3());

  // 기본 방향 쿼터니언 계산 (로컬 좌표계를 ECEF 좌표계로 변환)
  const baseRotationMatrix = new Cesium.Matrix3(
    antennaBaseXAxisNormalized.x, antennaBaseYAxisNormalized.x, antennaBaseZAxisNormalized.x,
    antennaBaseXAxisNormalized.y, antennaBaseYAxisNormalized.y, antennaBaseZAxisNormalized.y,
    antennaBaseXAxisNormalized.z, antennaBaseYAxisNormalized.z, antennaBaseZAxisNormalized.z
  );
  const baseOrientation = Cesium.Quaternion.fromRotationMatrix(baseRotationMatrix, new Cesium.Quaternion());

  // 2. 안테나의 roll/pitch/yaw 회전 적용
  // 안테나 로컬 좌표계 기준 회전
  const yawQuaternion = Cesium.Quaternion.fromAxisAngle(antennaBaseZAxisNormalized, yawRad, new Cesium.Quaternion());
  const yawMatrix = Cesium.Matrix3.fromQuaternion(yawQuaternion, new Cesium.Matrix3());
  const yAxisAfterYaw = Cesium.Matrix3.multiplyByVector(
    yawMatrix,
    antennaBaseYAxisNormalized,
    new Cesium.Cartesian3()
  );

  const pitchQuaternion = Cesium.Quaternion.fromAxisAngle(yAxisAfterYaw, pitchRad, new Cesium.Quaternion());
  const yawPitchQuaternion = Cesium.Quaternion.multiply(
    pitchQuaternion,
    yawQuaternion,
    new Cesium.Quaternion()
  );
  const yawPitchMatrix = Cesium.Matrix3.fromQuaternion(yawPitchQuaternion, new Cesium.Matrix3());
  const xAxisAfterYawPitch = Cesium.Matrix3.multiplyByVector(
    yawPitchMatrix,
    antennaBaseXAxisNormalized,
    new Cesium.Cartesian3()
  );

  const rollQuaternion = Cesium.Quaternion.fromAxisAngle(xAxisAfterYawPitch, rollRad, new Cesium.Quaternion());
  const rollPitchYawQuaternion = Cesium.Quaternion.multiply(
    rollQuaternion,
    yawPitchQuaternion,
    new Cesium.Quaternion()
  );

  // 3. 초기 elevation/azimuth 각도 적용
  // Elevation: Y축 기준 회전 (yaw 적용 후 Y축)
  // Azimuth: Z축 기준 회전 (기본 Z축)
  const elevationQuaternion = Cesium.Quaternion.fromAxisAngle(
    yAxisAfterYaw,
    elevationRad,
    new Cesium.Quaternion()
  );
  const azimuthQuaternion = Cesium.Quaternion.fromAxisAngle(
    antennaBaseZAxisNormalized,
    azimuthRad,
    new Cesium.Quaternion()
  );

  // 최종 회전: Azimuth * Elevation * Roll * Pitch * Yaw * Base
  const elevationAzimuthQuaternion = Cesium.Quaternion.multiply(
    azimuthQuaternion,
    elevationQuaternion,
    new Cesium.Quaternion()
  );

  const finalRotation = Cesium.Quaternion.multiply(
    elevationAzimuthQuaternion,
    rollPitchYawQuaternion,
    new Cesium.Quaternion()
  );

  return Cesium.Quaternion.multiply(
    finalRotation,
    baseOrientation,
    new Cesium.Quaternion()
  );
}
