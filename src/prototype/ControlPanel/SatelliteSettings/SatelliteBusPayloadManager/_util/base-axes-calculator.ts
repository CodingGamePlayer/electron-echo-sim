/**
 * 위성의 로컬 좌표계 기본 축 계산 유틸리티
 */

/**
 * 위성의 로컬 좌표계 기본 축 계산
 * @param cartesian 위성의 ECEF 좌표 (Cartesian3)
 * @returns 위성의 로컬 좌표계 기본 축 (xAxis, yAxis, zAxis)
 */
export function calculateBaseAxes(cartesian: any): { xAxis: any; yAxis: any; zAxis: any } | null {
  if (!cartesian) {
    return null;
  }

  // Z축: 지구 중심 방향
  const zAxis = Cesium.Cartesian3.negate(
    Cesium.Cartesian3.normalize(cartesian, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  // X축: 동쪽 방향 근사
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = cartographic.longitude;
  const xAxis = new Cesium.Cartesian3(Math.sin(lon), -Math.cos(lon), 0);
  const xAxisNormalized = Cesium.Cartesian3.normalize(xAxis, new Cesium.Cartesian3());

  // Y축: X × Z (외적)
  const yAxis = Cesium.Cartesian3.cross(
    xAxisNormalized,
    zAxis,
    new Cesium.Cartesian3()
  );
  const yAxisNormalized = Cesium.Cartesian3.normalize(yAxis, new Cesium.Cartesian3());

  // X축 재계산 (Y × Z로 정규화 보정)
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
