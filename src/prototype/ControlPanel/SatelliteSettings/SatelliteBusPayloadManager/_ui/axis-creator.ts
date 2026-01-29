import { getAxisLinePositions, getAxisEndPosition } from '../_util/axis-position-calculator.js';

/**
 * XYZ 축 엔티티 생성
 */
export function createAxisEntities(
  viewer: any,
  currentCartesian: any,
  axisLength: number,
  axisVisible: boolean
): {
  xAxis: any;
  yAxis: any;
  zAxis: any;
  xLabel: any;
  yLabel: any;
  zLabel: any;
} {
  // X축 (위성 진행 방향) - 빨간색
  const xAxisEntity = viewer.entities.add({
    name: 'X-Axis (Satellite Velocity)',
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        return getAxisLinePositions(currentCartesian, 'x', axisLength);
      }, false),
      width: 3,
      material: Cesium.Color.RED,
      clampToGround: false,
      show: axisVisible,
    },
  });

  // Y축 (SAR 관측 방향) - 초록색
  const yAxisEntity = viewer.entities.add({
    name: 'Y-Axis (SAR Look Direction)',
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        return getAxisLinePositions(currentCartesian, 'y', axisLength);
      }, false),
      width: 3,
      material: Cesium.Color.GREEN,
      clampToGround: false,
      show: axisVisible,
    },
  });

  // Z축 (지구 중심 방향) - 파란색
  const zAxisEntity = viewer.entities.add({
    name: 'Z-Axis (Earth Center Direction)',
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        return getAxisLinePositions(currentCartesian, 'z', axisLength);
      }, false),
      width: 3,
      material: Cesium.Color.BLUE,
      clampToGround: false,
      show: axisVisible,
    },
  });

  // X축 레이블
  const xLabelEntity = viewer.entities.add({
    name: 'X-Axis Label',
    position: new Cesium.CallbackProperty(() => {
      return getAxisEndPosition(currentCartesian, 'x', axisLength);
    }, false),
    label: {
      text: 'X',
      font: '20px sans-serif',
      fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 5.0e6, 0.0),
      translucencyByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 5.0e6, 1.0),
      show: axisVisible,
    },
  });

  // Y축 레이블
  const yLabelEntity = viewer.entities.add({
    name: 'Y-Axis Label',
    position: new Cesium.CallbackProperty(() => {
      return getAxisEndPosition(currentCartesian, 'y', axisLength);
    }, false),
    label: {
      text: 'Y',
      font: '20px sans-serif',
      fillColor: Cesium.Color.GREEN,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 5.0e6, 0.0),
      translucencyByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 5.0e6, 1.0),
      show: axisVisible,
    },
  });

  // Z축 레이블
  const zLabelEntity = viewer.entities.add({
    name: 'Z-Axis Label',
    position: new Cesium.CallbackProperty(() => {
      return getAxisEndPosition(currentCartesian, 'z', axisLength);
    }, false),
    label: {
      text: 'Z',
      font: '20px sans-serif',
      fillColor: Cesium.Color.BLUE,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 5.0e6, 0.0),
      translucencyByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 5.0e6, 1.0),
      show: axisVisible,
    },
  });

  return {
    xAxis: xAxisEntity,
    yAxis: yAxisEntity,
    zAxis: zAxisEntity,
    xLabel: xLabelEntity,
    yLabel: yLabelEntity,
    zLabel: zLabelEntity,
  };
}
