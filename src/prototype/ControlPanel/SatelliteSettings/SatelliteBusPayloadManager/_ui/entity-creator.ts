import { calculateBaseAxes } from '../_util/base-axes-calculator.js';
import { calculateAntennaOrientation } from '../_util/antenna-orientation-calculator.js';

/**
 * BUS 엔티티 생성
 */
export function createBusEntity(
  viewer: any,
  name: string,
  position: any,
  orientation: any,
  dimensions: { length: number; width: number; height: number }
): any {
  return viewer.entities.add({
    name: `${name} - BUS`,
    position: position,
    orientation: new Cesium.ConstantProperty(orientation),
    box: {
      dimensions: new Cesium.Cartesian3(
        dimensions.length,
        dimensions.width,
        dimensions.height
      ),
      material: Cesium.Color.GRAY.withAlpha(0.8),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    show: true,
  });
}

/**
 * 안테나 엔티티 생성
 */
export function createAntennaEntity(
  viewer: any,
  name: string,
  position: any,
  orientation: any,
  dimensions: { depth: number; width: number; height: number }
): any {
  return viewer.entities.add({
    name: `${name} - Antenna`,
    position: position,
    orientation: new Cesium.ConstantProperty(orientation),
    box: {
      dimensions: new Cesium.Cartesian3(
        dimensions.depth,
        dimensions.width,
        dimensions.height
      ),
      material: Cesium.Color.CYAN.withAlpha(0.7),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    show: true,
  });
}

/**
 * BUS 방향 쿼터니언 계산
 */
export function calculateBusOrientation(cartesian: any): any {
  return Cesium.Transforms.headingPitchRollQuaternion(
    cartesian,
    new Cesium.HeadingPitchRoll(0, 0, 0)
  );
}

/**
 * 안테나 방향 계산
 */
export function calculateAntennaOrientationForUI(
  currentCartesian: any,
  rollAngle: number,
  pitchAngle: number,
  yawAngle: number,
  initialElevationAngle: number,
  initialAzimuthAngle: number
): any {
  const busAxes = calculateBaseAxes(currentCartesian);
  if (!busAxes) {
    return null;
  }

  return calculateAntennaOrientation(
    busAxes,
    rollAngle,
    pitchAngle,
    yawAngle,
    initialElevationAngle,
    initialAzimuthAngle
  );
}
