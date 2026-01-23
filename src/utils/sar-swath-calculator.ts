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
    const { centerLat, centerLon, heading, nearRange, farRange, azimuthLength } = geometry;

    // Heading을 라디안으로 변환
    const headingRad = Cesium.Math.toRadians(heading);
    
    // Cross-track 방향 (위성 궤도에 수직, Swath의 range 방향)
    // SAR는 side-looking이므로 heading에서 90도 회전
    const crossTrackAngle = headingRad + Math.PI / 2;

    // 지구 반경 (WGS84)
    const earthRadius = 6378137; // meters

    // Ground range를 각도 오프셋으로 변환
    const nearRangeRad = this.groundRangeToAngularOffset(nearRange, earthRadius);
    const farRangeRad = this.groundRangeToAngularOffset(farRange, earthRadius);
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
  static cornersToCartesian(corners: SwathCorners): any[] {
    return [
      Cesium.Cartesian3.fromDegrees(corners.topLeft[0], corners.topLeft[1]),
      Cesium.Cartesian3.fromDegrees(corners.topRight[0], corners.topRight[1]),
      Cesium.Cartesian3.fromDegrees(corners.bottomRight[0], corners.bottomRight[1]),
      Cesium.Cartesian3.fromDegrees(corners.bottomLeft[0], corners.bottomLeft[1])
    ];
  }
}
