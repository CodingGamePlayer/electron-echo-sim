export interface SARSwathGeometry {
  nearRange: number;      // meters (ground range)
  farRange: number;       // meters (ground range)
  swathWidth: number;     // meters
  azimuthLength: number;  // meters
  centerLat: number;      // degrees
  centerLon: number;      // degrees
  heading: number;        // degrees (궤도 방향)
  satelliteAltitude?: number;  // meters (위성 고도, 선택적)
  lookAngle?: number;     // degrees (look angle, 선택적, 기본값: 30도)
}

export interface SwathCorners {
  topLeft: [number, number];    // [lon, lat]
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
}
