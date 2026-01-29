/**
 * 위성의 로컬 좌표계 기본 축 계산 유틸리티
 */

export interface VelocityDirectionOptions {
  velocityAzimuthDeg?: number;
  velocityElevationDeg?: number;
}

/**
 * 위성의 로컬 좌표계 기본 축 계산
 * @param cartesian 위성의 ECEF 좌표 (Cartesian3)
 * @param options 속도 방향(along-track)을 임의 값으로 줄 때 사용. 없으면 X=동쪽 근사
 * @returns 위성의 로컬 좌표계 기본 축 (xAxis, yAxis, zAxis)
 */
export function calculateBaseAxes(
  cartesian: any,
  options?: VelocityDirectionOptions
): { xAxis: any; yAxis: any; zAxis: any } | null {
  if (!cartesian) {
    return null;
  }

  const az = options?.velocityAzimuthDeg;
  const el = options?.velocityElevationDeg;
  const useVelocity =
    az !== undefined && el !== undefined && !Number.isNaN(az) && !Number.isNaN(el);

  // Z축: 지구 중심 방향 (nadir)
  const zAxis = Cesium.Cartesian3.negate(
    Cesium.Cartesian3.normalize(cartesian, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = cartographic.longitude;
  const lat = cartographic.latitude;

  if (useVelocity) {
    // 로컬 East: ECEF에서 동쪽 단위 벡터 (접평면 내)
    const east = new Cesium.Cartesian3(-Math.sin(lon), Math.cos(lon), 0);
    const eastNorm = Cesium.Cartesian3.normalize(east, new Cesium.Cartesian3());
    // Up: 지구 밖 방향
    const up = Cesium.Cartesian3.normalize(cartesian.clone(), new Cesium.Cartesian3());
    // North: Up × East (오른손 ENU)
    const north = Cesium.Cartesian3.cross(up, eastNorm, new Cesium.Cartesian3());
    const northNorm = Cesium.Cartesian3.normalize(north, new Cesium.Cartesian3());

    const azRad = (az * Math.PI) / 180;
    const elRad = (el * Math.PI) / 180;
    // 접평면 내 속도 방향
    const dirHorizontal = new Cesium.Cartesian3(
      Math.cos(azRad) * eastNorm.x + Math.sin(azRad) * northNorm.x,
      Math.cos(azRad) * eastNorm.y + Math.sin(azRad) * northNorm.y,
      Math.cos(azRad) * eastNorm.z + Math.sin(azRad) * northNorm.z
    );
    // 고도각 반영
    const velocityDir = new Cesium.Cartesian3(
      Math.cos(elRad) * dirHorizontal.x + Math.sin(elRad) * up.x,
      Math.cos(elRad) * dirHorizontal.y + Math.sin(elRad) * up.y,
      Math.cos(elRad) * dirHorizontal.z + Math.sin(elRad) * up.z
    );
    const xAxis = Cesium.Cartesian3.normalize(velocityDir, new Cesium.Cartesian3());
    // Y축: 오른손 좌표계 (Z × X)
    const yAxis = Cesium.Cartesian3.cross(zAxis, xAxis, new Cesium.Cartesian3());
    const yAxisNorm = Cesium.Cartesian3.normalize(yAxis, new Cesium.Cartesian3());

    return {
      xAxis,
      yAxis: yAxisNorm,
      zAxis,
    };
  }

  // 기존 동작: X = 동쪽 근사
  const xAxis = new Cesium.Cartesian3(Math.sin(lon), -Math.cos(lon), 0);
  const xAxisNormalized = Cesium.Cartesian3.normalize(xAxis, new Cesium.Cartesian3());

  const yAxis = Cesium.Cartesian3.cross(
    xAxisNormalized,
    zAxis,
    new Cesium.Cartesian3()
  );
  const yAxisNormalized = Cesium.Cartesian3.normalize(yAxis, new Cesium.Cartesian3());

  const xAxisCorrected = Cesium.Cartesian3.cross(
    yAxisNormalized,
    zAxis,
    new Cesium.Cartesian3()
  );
  const xAxisFinal = Cesium.Cartesian3.normalize(xAxisCorrected, new Cesium.Cartesian3());

  return {
    xAxis: xAxisFinal,
    yAxis: yAxisNormalized,
    zAxis: zAxis,
  };
}
