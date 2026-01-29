import { calculateBaseAxes } from './base-axes-calculator.js';

/**
 * 축 위치 계산 유틸리티
 */

/**
 * 축 방향선 위치 계산
 * @param cartesian 위성의 ECEF 좌표 (Cartesian3)
 * @param axis 축 종류 ('x' | 'y' | 'z')
 * @param axisLength 축 길이
 * @returns 축 방향선의 시작점과 끝점 배열
 */
export function getAxisLinePositions(
  cartesian: any,
  axis: 'x' | 'y' | 'z',
  axisLength: number
): any[] {
  if (!cartesian) {
    return [];
  }

  const axes = calculateBaseAxes(cartesian);
  if (!axes) {
    return [];
  }

  const start = cartesian;
  let direction: any;

  switch (axis) {
    case 'x':
      direction = axes.xAxis;
      break;
    case 'y':
      direction = axes.yAxis;
      break;
    case 'z':
      direction = axes.zAxis;
      break;
    default:
      return [];
  }

  // 방향 벡터 정규화 및 스케일링
  const normalized = Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3());
  const scaled = Cesium.Cartesian3.multiplyByScalar(
    normalized,
    axisLength,
    new Cesium.Cartesian3()
  );

  // 끝점 계산
  const end = Cesium.Cartesian3.add(start, scaled, new Cesium.Cartesian3());

  return [start, end];
}

/**
 * 축 끝점 위치 계산 (레이블용)
 * @param cartesian 위성의 ECEF 좌표 (Cartesian3)
 * @param axis 축 종류 ('x' | 'y' | 'z')
 * @param axisLength 축 길이
 * @returns 축 끝점 위치 (Cartesian3)
 */
export function getAxisEndPosition(
  cartesian: any,
  axis: 'x' | 'y' | 'z',
  axisLength: number
): any | undefined {
  if (!cartesian) {
    return undefined;
  }

  const axes = calculateBaseAxes(cartesian);
  if (!axes) {
    return undefined;
  }

  const start = cartesian;
  let direction: any;

  switch (axis) {
    case 'x':
      direction = axes.xAxis;
      break;
    case 'y':
      direction = axes.yAxis;
      break;
    case 'z':
      direction = axes.zAxis;
      break;
    default:
      return undefined;
  }

  // 방향 벡터 정규화 및 스케일링
  const normalized = Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3());
  const scaled = Cesium.Cartesian3.multiplyByScalar(
    normalized,
    axisLength,
    new Cesium.Cartesian3()
  );

  // 끝점 계산
  return Cesium.Cartesian3.add(start, scaled, new Cesium.Cartesian3());
}
