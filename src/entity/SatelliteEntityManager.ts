/**
 * 위성 엔티티 관리
 */
export class SatelliteEntityManager {
  private viewer: any;
  private entity: any;
  private position: any;
  private currentCartesian: any;

  constructor(viewer: any) {
    this.viewer = viewer;
    this.entity = null;
    this.position = null;
    this.currentCartesian = null;
  }

  /**
   * 위성 엔티티 생성
   */
  createSatelliteEntity(name: string, initialPosition: { longitude: number; latitude: number; altitude: number }): any {
    const initialCartesian = Cesium.Cartesian3.fromDegrees(
      initialPosition.longitude,
      initialPosition.latitude,
      initialPosition.altitude
    );

    this.position = new Cesium.ConstantPositionProperty(initialCartesian);
    this.currentCartesian = initialCartesian.clone();

    this.entity = this.viewer.entities.add({
      name: name,
      position: this.position,
      orientation: new Cesium.VelocityOrientationProperty(this.position),
      show: true,
      point: {
        pixelSize: 15,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 2.0e7, 0.5),
        translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 2.0e7, 1.0),
      },
      label: {
        text: 'ISS',
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: true,
      },
      path: {
        resolution: 1,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.CYAN,
        }),
        width: 3,
        leadTime: 0,
        trailTime: 3600,
        show: true,
      },
    });

    return this.entity;
  }

  /**
   * 엔티티 위치 즉시 업데이트
   */
  updatePosition(position: { longitude: number; latitude: number; altitude: number }, altitudeOffset: number = 0): void {
    if (position && this.position) {
      const adjustedAltitude = position.altitude + altitudeOffset;
      const cartesian = Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        adjustedAltitude
      );
      this.currentCartesian = cartesian.clone();
      this.position.setValue(cartesian);
    }
  }

  /**
   * 엔티티 반환
   */
  getEntity(): any {
    return this.entity;
  }

  /**
   * 현재 Cartesian 좌표 반환
   */
  getCurrentCartesian(): any {
    return this.currentCartesian;
  }

  /**
   * 현재 Cartesian 좌표 설정
   */
  setCurrentCartesian(cartesian: any): void {
    this.currentCartesian = cartesian;
  }

  /**
   * Position Property 반환
   */
  getPosition(): any {
    return this.position;
  }
}
