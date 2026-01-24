/**
 * 위성 엔티티 관리
 */
export class SatelliteEntityManager {
  private viewer: any;
  private entity: any;
  private position: any;
  private currentCartesian: any;
  private axisEntities: {
    xAxis: any;
    yAxis: any;
    zAxis: any;
    xLabel: any;
    yLabel: any;
    zLabel: any;
  } | null;
  private satelliteManager: any;
  private axisLength: number; // 축 길이 (미터)

  constructor(viewer: any, satelliteManager?: any) {
    this.viewer = viewer;
    this.entity = null;
    this.position = null;
    this.currentCartesian = null;
    this.axisEntities = null;
    this.satelliteManager = satelliteManager || null;
    this.axisLength = 50000; // 기본값: 50km
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

    // XYZ 축 방향선 생성
    this.createAxisLines();

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

  /**
   * 위성 매니저 설정
   */
  setSatelliteManager(satelliteManager: any): void {
    this.satelliteManager = satelliteManager;
  }

  /**
   * 축 길이 설정
   */
  setAxisLength(length: number): void {
    this.axisLength = length;
    this.updateAxisLines();
  }

  /**
   * XYZ 축 방향선 생성
   */
  private createAxisLines(): void {
    if (!this.viewer || !this.position) return;

    // X축 (위성 진행 방향) - 빨간색
    const xAxisEntity = this.viewer.entities.add({
      name: 'X-Axis (Satellite Velocity)',
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.getAxisLinePositions('x');
        }, false),
        width: 3,
        material: Cesium.Color.RED,
        clampToGround: false,
        show: true,
      },
    });

    // Y축 (SAR 관측 방향) - 초록색
    const yAxisEntity = this.viewer.entities.add({
      name: 'Y-Axis (SAR Look Direction)',
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.getAxisLinePositions('y');
        }, false),
        width: 3,
        material: Cesium.Color.GREEN,
        clampToGround: false,
        show: true,
      },
    });

    // Z축 (지구 중심 방향) - 파란색
    const zAxisEntity = this.viewer.entities.add({
      name: 'Z-Axis (Earth Center Direction)',
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.getAxisLinePositions('z');
        }, false),
        width: 3,
        material: Cesium.Color.BLUE,
        clampToGround: false,
        show: true,
      },
    });

    // X축 레이블
    const xLabelEntity = this.viewer.entities.add({
      name: 'X-Axis Label',
      position: new Cesium.CallbackProperty(() => {
        return this.getAxisEndPosition('x');
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
        show: true,
      },
    });

    // Y축 레이블
    const yLabelEntity = this.viewer.entities.add({
      name: 'Y-Axis Label',
      position: new Cesium.CallbackProperty(() => {
        return this.getAxisEndPosition('y');
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
        show: true,
      },
    });

    // Z축 레이블
    const zLabelEntity = this.viewer.entities.add({
      name: 'Z-Axis Label',
      position: new Cesium.CallbackProperty(() => {
        return this.getAxisEndPosition('z');
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
        show: true,
      },
    });

    this.axisEntities = {
      xAxis: xAxisEntity,
      yAxis: yAxisEntity,
      zAxis: zAxisEntity,
      xLabel: xLabelEntity,
      yLabel: yLabelEntity,
      zLabel: zLabelEntity,
    };
  }

  /**
   * 축 방향선 위치 계산
   */
  private getAxisLinePositions(axis: 'x' | 'y' | 'z'): any[] {
    if (!this.currentCartesian) {
      return [];
    }

    const axes = this.calculateAxes();
    if (!axes) {
      return [];
    }

    const start = this.currentCartesian;
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
      this.axisLength,
      new Cesium.Cartesian3()
    );

    // 끝점 계산
    const end = Cesium.Cartesian3.add(start, scaled, new Cesium.Cartesian3());

    return [start, end];
  }

  /**
   * 축 끝점 위치 계산 (레이블용)
   */
  private getAxisEndPosition(axis: 'x' | 'y' | 'z'): any | undefined {
    if (!this.currentCartesian) {
      return undefined;
    }

    const axes = this.calculateAxes();
    if (!axes) {
      return undefined;
    }

    const start = this.currentCartesian;
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
      this.axisLength,
      new Cesium.Cartesian3()
    );

    // 끝점 계산
    return Cesium.Cartesian3.add(start, scaled, new Cesium.Cartesian3());
  }

  /**
   * 위성의 로컬 좌표계 축 계산
   * X: 위성 진행 방향 (속도 벡터)
   * Z: 지구 중심 방향
   * Y: SAR 관측 방향 (X × Z)
   */
  private calculateAxes(): { xAxis: any; yAxis: any; zAxis: any } | null {
    if (!this.currentCartesian || !this.viewer) {
      return null;
    }

    // Z축: 지구 중심 방향 (위성 위치에서 지구 중심으로)
    // 지구 중심은 원점 (0, 0, 0)
    const zAxis = Cesium.Cartesian3.negate(
      Cesium.Cartesian3.normalize(this.currentCartesian, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    // X축: 위성 진행 방향 (속도 벡터)
    let xAxis: any;

    if (this.satelliteManager && this.satelliteManager.useTLE) {
      // TLE 기반 속도 계산
      try {
        const currentTime = this.viewer.clock.currentTime;
        const futureTime = Cesium.JulianDate.addSeconds(currentTime, 1.0, new Cesium.JulianDate());

        const pos1 = this.satelliteManager.calculatePosition(currentTime);
        const pos2 = this.satelliteManager.calculatePosition(futureTime);

        if (pos1 && pos2) {
          const cart1 = Cesium.Cartesian3.fromDegrees(
            pos1.longitude,
            pos1.latitude,
            pos1.altitude
          );
          const cart2 = Cesium.Cartesian3.fromDegrees(
            pos2.longitude,
            pos2.latitude,
            pos2.altitude
          );

          // 속도 벡터 (ECEF 좌표계) - X축은 위성 진행 방향이므로 미래-현재
          // 반대 방향이 필요하므로 현재-미래로 계산
          xAxis = Cesium.Cartesian3.subtract(cart1, cart2, new Cesium.Cartesian3());
        } else {
          // 폴백: 동쪽 방향 근사
          xAxis = this.getDefaultVelocityDirection();
        }
      } catch (error) {
        console.warn('속도 계산 실패, 기본값 사용:', error);
        xAxis = this.getDefaultVelocityDirection();
      }
    } else {
      // 기본값: 동쪽 방향 근사
      xAxis = this.getDefaultVelocityDirection();
    }

    // X축 정규화
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

  /**
   * 기본 속도 방향 계산 (동쪽 방향 근사)
   */
  private getDefaultVelocityDirection(): any {
    if (!this.currentCartesian) {
      return new Cesium.Cartesian3(1, 0, 0);
    }

    // 위성 위치를 지리 좌표로 변환
    const cartographic = Cesium.Cartographic.fromCartesian(this.currentCartesian);
    const lon = cartographic.longitude;

    // 동쪽 방향 벡터 (ECEF 좌표계)
    // 경도 방향의 접선 벡터 (반대 방향)
    const x = Math.sin(lon);
    const y = -Math.cos(lon);
    const z = 0;

    return new Cesium.Cartesian3(x, y, z);
  }

  /**
   * 축 방향선 업데이트
   */
  private updateAxisLines(): void {
    // CallbackProperty를 사용하므로 자동으로 업데이트됨
    // 필요시 추가 로직 구현 가능
  }

  /**
   * 축 방향선 표시/숨김 설정
   */
  setAxisLinesVisible(visible: boolean): void {
    if (this.axisEntities) {
      this.axisEntities.xAxis.polyline.show = visible;
      this.axisEntities.yAxis.polyline.show = visible;
      this.axisEntities.zAxis.polyline.show = visible;
      this.axisEntities.xLabel.label.show = visible;
      this.axisEntities.yLabel.label.show = visible;
      this.axisEntities.zLabel.label.show = visible;
    }
  }
}
