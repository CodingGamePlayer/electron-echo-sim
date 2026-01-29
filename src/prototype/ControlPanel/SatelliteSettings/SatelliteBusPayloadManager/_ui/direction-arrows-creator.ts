import { calculateBaseAxes } from '../_util/base-axes-calculator.js';

/**
 * 방향 화살표 생성
 * @param viewer Cesium viewer
 * @param currentCartesian 중심 위치 (BUS 또는 안테나)
 * @param direction 방향 문자열
 * @param antennaPosition 선택적: 안테나 위치 (안테나 관련 방향일 때 사용)
 */
export function createDirectionArrows(
  viewer: any,
  currentCartesian: any,
  direction: string,
  antennaPosition?: any
): {
  positive: any;
  negative: any;
  positiveLabel: any;
  negativeLabel: any;
} | null {
  // 안테나 관련 방향이고 안테나 위치가 제공된 경우 안테나 위치 사용
  const isAntennaDirection = direction.startsWith('antenna_');
  const centerPosition = (isAntennaDirection && antennaPosition) ? antennaPosition : currentCartesian;
  
  const busAxes = calculateBaseAxes(centerPosition);
  if (!busAxes) {
    return null;
  }

  const arrowLength = 2; // 화살표 길이 (미터)

  // 방향에 따라 레이블 텍스트 결정
  const getLabelText = (dir: string): string => {
    switch (dir) {
      case 'bus_length': return 'BUS 길이';
      case 'bus_width': return 'BUS 너비';
      case 'bus_height': return 'BUS 높이';
      case 'antenna_height': return '안테나 높이';
      case 'antenna_width': return '안테나 너비';
      case 'antenna_depth': return '안테나 두께';
      case 'antenna_gap': return '안테나 간격';
      case 'antenna_roll': return 'Roll (X축 회전)';
      case 'antenna_pitch': return 'Pitch (Y축 회전)';
      case 'antenna_yaw': return 'Yaw (Z축 회전)';
      case 'antenna_elevation': return 'Elevation (Y축 회전)';
      case 'antenna_azimuth': return 'Azimuth (Z축 회전)';
      default: return '';
    }
  };

  const labelText = getLabelText(direction);

  // 방향에 따라 벡터 결정 함수
  const getDirectionVector = (axes: { xAxis: any; yAxis: any; zAxis: any }) => {
    switch (direction) {
      case 'bus_length':
      case 'antenna_depth':
      case 'antenna_roll':
        return axes.xAxis;
      case 'bus_width':
      case 'antenna_width':
      case 'antenna_gap':
      case 'antenna_pitch':
      case 'antenna_elevation':
        return axes.yAxis;
      case 'bus_height':
      case 'antenna_height':
      case 'antenna_yaw':
      case 'antenna_azimuth':
        return axes.zAxis;
      default:
        return null;
    }
  };

  // 초기 방향 벡터 계산
  const initialDirectionVector = getDirectionVector(busAxes);
  if (!initialDirectionVector) {
    return null;
  }

  // 방향 벡터 정규화
  const normalized = Cesium.Cartesian3.normalize(initialDirectionVector, new Cesium.Cartesian3());
  
  // + 방향 화살표
  const positiveScaled = Cesium.Cartesian3.multiplyByScalar(normalized, arrowLength, new Cesium.Cartesian3());
  const positiveEnd = Cesium.Cartesian3.add(centerPosition, positiveScaled, new Cesium.Cartesian3());
  
  // - 방향 화살표
  const negativeScaled = Cesium.Cartesian3.multiplyByScalar(normalized, -arrowLength, new Cesium.Cartesian3());
  const negativeEnd = Cesium.Cartesian3.add(centerPosition, negativeScaled, new Cesium.Cartesian3());

  // 안테나 관련 방향이고 안테나 위치가 동적으로 변경될 수 있는 경우 CallbackProperty 사용
  const useCallback = isAntennaDirection && antennaPosition !== undefined;
  
  // + 방향 화살표 엔티티 생성
  const positiveArrow = viewer.entities.add({
    name: 'Positive Direction Arrow',
    polyline: {
      positions: useCallback
        ? new Cesium.CallbackProperty(() => {
            const currentCenter = antennaPosition?.getValue?.(viewer.clock.currentTime) || centerPosition;
            const currentAxes = calculateBaseAxes(currentCenter);
            if (!currentAxes) return [];
            const currentDirectionVector = getDirectionVector(currentAxes);
            if (!currentDirectionVector) return [];
            const normalized = Cesium.Cartesian3.normalize(currentDirectionVector, new Cesium.Cartesian3());
            const positiveScaled = Cesium.Cartesian3.multiplyByScalar(normalized, arrowLength, new Cesium.Cartesian3());
            const positiveEnd = Cesium.Cartesian3.add(currentCenter, positiveScaled, new Cesium.Cartesian3());
            return [currentCenter, positiveEnd];
          }, false)
        : [centerPosition, positiveEnd],
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
      positions: useCallback
        ? new Cesium.CallbackProperty(() => {
            const currentCenter = antennaPosition?.getValue?.(viewer.clock.currentTime) || centerPosition;
            const currentAxes = calculateBaseAxes(currentCenter);
            if (!currentAxes) return [];
            const currentDirectionVector = getDirectionVector(currentAxes);
            if (!currentDirectionVector) return [];
            const normalized = Cesium.Cartesian3.normalize(currentDirectionVector, new Cesium.Cartesian3());
            const negativeScaled = Cesium.Cartesian3.multiplyByScalar(normalized, -arrowLength, new Cesium.Cartesian3());
            const negativeEnd = Cesium.Cartesian3.add(currentCenter, negativeScaled, new Cesium.Cartesian3());
            return [currentCenter, negativeEnd];
          }, false)
        : [centerPosition, negativeEnd],
      width: 5,
      material: Cesium.Color.RED,
      clampToGround: false,
      show: true,
    },
  });

  // + 레이블
  const positiveLabel = viewer.entities.add({
    name: 'Positive Label',
    position: useCallback
      ? new Cesium.CallbackProperty(() => {
          const currentCenter = antennaPosition?.getValue?.(viewer.clock.currentTime) || centerPosition;
          const currentAxes = calculateBaseAxes(currentCenter);
          if (!currentAxes) return undefined;
            const currentDirectionVector = getDirectionVector(currentAxes);
            if (!currentDirectionVector) return undefined;
          const normalized = Cesium.Cartesian3.normalize(currentDirectionVector, new Cesium.Cartesian3());
          const positiveScaled = Cesium.Cartesian3.multiplyByScalar(normalized, arrowLength, new Cesium.Cartesian3());
          return Cesium.Cartesian3.add(currentCenter, positiveScaled, new Cesium.Cartesian3());
        }, false)
      : positiveEnd,
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
    position: useCallback
      ? new Cesium.CallbackProperty(() => {
          const currentCenter = antennaPosition?.getValue?.(viewer.clock.currentTime) || centerPosition;
          const currentAxes = calculateBaseAxes(currentCenter);
          if (!currentAxes) return undefined;
            const currentDirectionVector = getDirectionVector(currentAxes);
            if (!currentDirectionVector) return undefined;
          const normalized = Cesium.Cartesian3.normalize(currentDirectionVector, new Cesium.Cartesian3());
          const negativeScaled = Cesium.Cartesian3.multiplyByScalar(normalized, -arrowLength, new Cesium.Cartesian3());
          return Cesium.Cartesian3.add(currentCenter, negativeScaled, new Cesium.Cartesian3());
        }, false)
      : negativeEnd,
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
