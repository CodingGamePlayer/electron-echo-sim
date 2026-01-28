import { SARSwathGeometry, SwathCorners } from '../types/sar-swath.types.js';

export class SARSwathCalculator {
  /**
   * Ground range를 각도 오프셋으로 변환 (지구 곡률 고려)
   * @param groundRange 지표면 거리 (meters)
   * @param earthRadius 지구 반경 (meters)
   * @returns 각도 오프셋 (라디안)
   */
  private static groundRangeToAngularOffset(groundRange: number, earthRadius: number): number {
    // 지구 곡률을 고려한 각도 계산
    // groundRange = earthRadius * angularOffset
    return groundRange / earthRadius;
  }

  /**
   * SAR Swath의 4개 코너 좌표를 계산 (Echo 시뮬레이터용)
   * @param geometry SAR Swath 기하 파라미터
   * @returns 4개의 코너 좌표 (경도, 위도)
   */
  static calculateSwathCorners(geometry: SARSwathGeometry): SwathCorners {
    const { centerLat, centerLon, heading, nearRange, farRange, swathWidth, azimuthLength } = geometry;
    
    // farRange가 우선순위가 높음. farRange가 없으면 swathWidth로 계산
    // swathWidth가 제공되면 farRange를 재계산 (swathWidth = farRange - nearRange)
    const effectiveFarRange = farRange || (nearRange + (swathWidth || 0));

    // Heading을 라디안으로 변환
    const headingRad = Cesium.Math.toRadians(heading);
    
    // Cross-track 방향 (위성 궤도에 수직, Swath의 range 방향)
    // SAR는 side-looking이므로 heading에서 90도 회전
    const crossTrackAngle = headingRad + Math.PI / 2;

    // 지구 반경 (WGS84)
    const earthRadius = 6378137; // meters

    // Ground range를 각도 오프셋으로 변환
    const nearRangeRad = this.groundRangeToAngularOffset(nearRange, earthRadius);
    const farRangeRad = this.groundRangeToAngularOffset(effectiveFarRange, earthRadius);
    const azimuthHalfRad = this.groundRangeToAngularOffset(azimuthLength / 2, earthRadius);

    // 중심 위치를 라디안으로 변환
    const centerLatRad = Cesium.Math.toRadians(centerLat);
    const centerLonRad = Cesium.Math.toRadians(centerLon);

    // 위도/경도 오프셋 계산 (대권 항법 사용)
    // Range 방향 (cross-track) 오프셋
    const nearRangeLatOffset = nearRangeRad * Math.cos(crossTrackAngle);
    const nearRangeLonOffset = nearRangeRad * Math.sin(crossTrackAngle) / Math.cos(centerLatRad);
    
    const farRangeLatOffset = farRangeRad * Math.cos(crossTrackAngle);
    const farRangeLonOffset = farRangeRad * Math.sin(crossTrackAngle) / Math.cos(centerLatRad);

    // Azimuth 방향 (along-track) 오프셋
    const azimuthLatOffset = azimuthHalfRad * Math.cos(headingRad);
    const azimuthLonOffset = azimuthHalfRad * Math.sin(headingRad) / Math.cos(centerLatRad);

    // 4개의 코너 계산
    // topLeft: near range, -azimuth
    // topRight: near range, +azimuth
    // bottomRight: far range, +azimuth
    // bottomLeft: far range, -azimuth
    const corners: SwathCorners = {
      topLeft: [
        Cesium.Math.toDegrees(centerLonRad + nearRangeLonOffset - azimuthLonOffset),
        Cesium.Math.toDegrees(centerLatRad + nearRangeLatOffset - azimuthLatOffset)
      ],
      topRight: [
        Cesium.Math.toDegrees(centerLonRad + nearRangeLonOffset + azimuthLonOffset),
        Cesium.Math.toDegrees(centerLatRad + nearRangeLatOffset + azimuthLatOffset)
      ],
      bottomRight: [
        Cesium.Math.toDegrees(centerLonRad + farRangeLonOffset + azimuthLonOffset),
        Cesium.Math.toDegrees(centerLatRad + farRangeLatOffset + azimuthLatOffset)
      ],
      bottomLeft: [
        Cesium.Math.toDegrees(centerLonRad + farRangeLonOffset - azimuthLonOffset),
        Cesium.Math.toDegrees(centerLatRad + farRangeLatOffset - azimuthLatOffset)
      ]
    };

    return corners;
  }

  /**
   * Cesium Cartesian3 좌표 배열로 변환
   */
  static cornersToCartesian(corners: SwathCorners): Cesium.Cartesian3[] {
    try {
      const positions: Cesium.Cartesian3[] = [];
      
      // 각 corner를 Cartesian3로 변환
      const cornerKeys: Array<keyof SwathCorners> = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
      for (const key of cornerKeys) {
        const corner = corners[key];
        if (!Array.isArray(corner) || corner.length < 2) {
          throw new Error(`Invalid corner: ${key}`);
        }
        const lon = corner[0];
        const lat = corner[1];
        if (typeof lon !== 'number' || typeof lat !== 'number' || isNaN(lon) || isNaN(lat)) {
          throw new Error(`Invalid corner coordinates: ${key}`);
        }
        const cartesian = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
        if (!cartesian || isNaN(cartesian.x) || isNaN(cartesian.y) || isNaN(cartesian.z)) {
          throw new Error(`Failed to create Cartesian3 for corner: ${key}`);
        }
        positions.push(cartesian);
      }
      
      if (positions.length !== 4) {
        throw new Error(`Expected 4 positions, got ${positions.length}`);
      }
      
      return positions;
    } catch (error) {
      console.error('[SARSwathCalculator] cornersToCartesian 오류:', error);
      // 기본값 반환
      return [
        Cesium.Cartesian3.fromDegrees(0, 0, 0),
        Cesium.Cartesian3.fromDegrees(0.001, 0, 0),
        Cesium.Cartesian3.fromDegrees(0.001, 0.001, 0),
        Cesium.Cartesian3.fromDegrees(0, 0.001, 0)
      ];
    }
  }
}
