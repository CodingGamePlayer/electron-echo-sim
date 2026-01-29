import { calculateBaseAxes } from '../_util/base-axes-calculator.js';

/**
 * 방향 화살표 생성
 */
export function createDirectionArrows(
  viewer: any,
  currentCartesian: any,
  direction: string
): {
  positive: any;
  negative: any;
  positiveLabel: any;
  negativeLabel: any;
} | null {
  const busAxes = calculateBaseAxes(currentCartesian);
  if (!busAxes) {
    return null;
  }

  const arrowLength = 2; // 화살표 길이 (미터)
  const centerPosition = currentCartesian;
  let directionVector: any;
  let labelText = '';

  // 방향에 따라 벡터 결정
  switch (direction) {
    case 'bus_length':
      directionVector = busAxes.xAxis;
      labelText = 'BUS 길이';
      break;
    case 'bus_width':
      directionVector = busAxes.yAxis;
      labelText = 'BUS 너비';
      break;
    case 'bus_height':
      directionVector = busAxes.zAxis;
      labelText = 'BUS 높이';
      break;
    case 'antenna_height':
      directionVector = busAxes.zAxis;
      labelText = '안테나 높이';
      break;
    case 'antenna_width':
      directionVector = busAxes.yAxis;
      labelText = '안테나 너비';
      break;
    case 'antenna_depth':
      directionVector = busAxes.xAxis;
      labelText = '안테나 두께';
      break;
    case 'antenna_gap':
      directionVector = busAxes.yAxis;
      labelText = '안테나 간격';
      break;
    case 'antenna_roll':
      directionVector = busAxes.xAxis;
      labelText = 'Roll (X축 회전)';
      break;
    case 'antenna_pitch':
      directionVector = busAxes.yAxis;
      labelText = 'Pitch (Y축 회전)';
      break;
    case 'antenna_yaw':
      directionVector = busAxes.zAxis;
      labelText = 'Yaw (Z축 회전)';
      break;
    case 'antenna_elevation':
      // Elevation은 yaw 적용 후의 y축 기준 회전
      directionVector = busAxes.yAxis;
      labelText = 'Elevation (Y축 회전)';
      break;
    case 'antenna_azimuth':
      // Azimuth는 기본 z축 기준 회전
      directionVector = busAxes.zAxis;
      labelText = 'Azimuth (Z축 회전)';
      break;
    default:
      return null;
  }

  // 방향 벡터 정규화
  const normalized = Cesium.Cartesian3.normalize(directionVector, new Cesium.Cartesian3());
  
  // + 방향 화살표
  const positiveScaled = Cesium.Cartesian3.multiplyByScalar(normalized, arrowLength, new Cesium.Cartesian3());
  const positiveEnd = Cesium.Cartesian3.add(centerPosition, positiveScaled, new Cesium.Cartesian3());
  
  // - 방향 화살표
  const negativeScaled = Cesium.Cartesian3.multiplyByScalar(normalized, -arrowLength, new Cesium.Cartesian3());
  const negativeEnd = Cesium.Cartesian3.add(centerPosition, negativeScaled, new Cesium.Cartesian3());

  // + 방향 화살표 엔티티 생성
  const positiveArrow = viewer.entities.add({
    name: 'Positive Direction Arrow',
    polyline: {
      positions: [centerPosition, positiveEnd],
      width: 5,
      material: Cesium.Color.GREEN,
      clampToGround: false,
      show: true,
    },
  });

  // - 방향 화살표 엔티티 생성
  const negativeArrow = viewer.entities.add({
    name: 'Negative Direction Arrow',
    polyline: {
      positions: [centerPosition, negativeEnd],
      width: 5,
      material: Cesium.Color.RED,
      clampToGround: false,
      show: true,
    },
  });

  // + 레이블
  const positiveLabel = viewer.entities.add({
    name: 'Positive Label',
    position: positiveEnd,
    label: {
      text: `+ ${labelText}`,
      font: '16px sans-serif',
      fillColor: Cesium.Color.GREEN,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      show: true,
    },
  });

  // - 레이블
  const negativeLabel = viewer.entities.add({
    name: 'Negative Label',
    position: negativeEnd,
    label: {
      text: `- ${labelText}`,
      font: '16px sans-serif',
      fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      show: true,
    },
  });

  return {
    positive: positiveArrow,
    negative: negativeArrow,
    positiveLabel: positiveLabel,
    negativeLabel: negativeLabel,
  };
}
