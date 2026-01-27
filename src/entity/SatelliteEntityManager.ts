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
  private yaw: number; // Z축 회전 (도)
  private pitch: number; // Y축 회전 (도)
  private roll: number; // X축 회전 (도)
  private useCustomOrientation: boolean; // 커스텀 방향 사용 여부

  constructor(viewer: any, satelliteManager?: any) {
    this.viewer = viewer;
    this.entity = null;
    this.position = null;
    this.currentCartesian = null;
    this.axisEntities = null;
    this.satelliteManager = satelliteManager || null;
    this.axisLength = 50000; // 기본값: 50km
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 47;  // 기본 roll 47도
    this.useCustomOrientation = false;  // 기본으로 커스텀 방향 사용 안 함
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

    // 방향 설정: 커스텀 방향이 활성화되어 있으면 CallbackProperty 사용, 아니면 VelocityOrientationProperty 사용
    const orientationProperty = this.useCustomOrientation
      ? new Cesium.CallbackProperty(() => this.calculateOrientation(), false)
      : new Cesium.VelocityOrientationProperty(this.position);

    this.entity = this.viewer.entities.add({
      name: name,
      position: this.position,
      orientation: orientationProperty,
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
      // altitudeOffset은 더 이상 사용하지 않지만 호환성을 위해 유지
      // position.altitude에 이미 최종 고도가 포함되어 있음
      const cartesian = Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        position.altitude
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
   * Yaw, Pitch, Roll 설정
   * @param yaw Z축 회전 (도) - 좌우로 방향 트는 회전
   * @param pitch Y축 회전 (도) - 위아래로 고개 드는 회전
   * @param roll X축 회전 (도) - 좌우로 기운 회전
   */
  setOrientation(yaw: number, pitch: number, roll: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.roll = roll;
    this.useCustomOrientation = true;
    this.updateOrientationProperty();
  }

  /**
   * Yaw, Pitch, Roll 값 가져오기
   */
  getOrientation(): { yaw: number; pitch: number; roll: number } {
    return {
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
    };
  }

  /**
   * 커스텀 방향 사용 여부 설정
   */
  setUseCustomOrientation(use: boolean): void {
    this.useCustomOrientation = use;
    this.updateOrientationProperty();
  }

  /**
   * 커스텀 방향 사용 여부 가져오기
   */
  getUseCustomOrientation(): boolean {
    return this.useCustomOrientation;
  }

  /**
   * 방향 속성 업데이트
   */
  private updateOrientationProperty(): void {
    if (!this.entity) return;

    if (this.useCustomOrientation) {
      this.entity.orientation = new Cesium.CallbackProperty(() => this.calculateOrientation(), false);
    } else {
      this.entity.orientation = new Cesium.VelocityOrientationProperty(this.position);
    }
  }

  /**
   * Yaw, Pitch, Roll을 적용한 방향 계산
   * 회전 순서: ZYX (Yaw-Pitch-Roll)
   * 
   * SAR 위성 좌표계:
   * - Z축: 지구 중심 방향 (Nadir)
   * - X축: 위성 진행 방향 (Along-track)
   * - Y축: SAR 관측 방향 (Range)
   * 
   * 회전 정의:
   * - Yaw (ψ): Z축 회전 (좌우로 방향 트는 회전)
   * - Pitch (θ): Y축 회전 (위아래로 고개 드는 회전)
   * - Roll (φ): X축 회전 (좌우로 기운 회전)
   */
  private calculateOrientation(): any {
    if (!this.currentCartesian) {
      return Cesium.Quaternion.IDENTITY;
    }

    const axes = this.calculateBaseAxes();
    if (!axes) {
      return Cesium.Quaternion.IDENTITY;
    }

    // 각도를 라디안으로 변환
    const yawRad = Cesium.Math.toRadians(this.yaw);
    const pitchRad = Cesium.Math.toRadians(this.pitch);
    const rollRad = Cesium.Math.toRadians(this.roll);

    // 회전 순서: ZYX (Yaw-Pitch-Roll)
    // 1. Yaw 회전 (Z축 기준)
    const yawQuaternion = Cesium.Quaternion.fromAxisAngle(axes.zAxis, yawRad, new Cesium.Quaternion());
    
    // Yaw 회전 후의 Y축 계산 (Quaternion을 Matrix3로 변환하여 벡터 회전)
    const yawMatrix = Cesium.Matrix3.fromQuaternion(yawQuaternion, new Cesium.Matrix3());
    const yAxisAfterYaw = Cesium.Matrix3.multiplyByVector(
      yawMatrix,
      axes.yAxis,
      new Cesium.Cartesian3()
    );
    
    // 2. Pitch 회전 (Y축 기준, Yaw 회전 후의 Y축)
    const pitchQuaternion = Cesium.Quaternion.fromAxisAngle(yAxisAfterYaw, pitchRad, new Cesium.Quaternion());
    
    // Yaw와 Pitch 회전의 합성
    const yawPitchQuaternion = Cesium.Quaternion.multiply(
      pitchQuaternion,
      yawQuaternion,
      new Cesium.Quaternion()
    );
    
    // Yaw-Pitch 회전 후의 X축 계산
    const yawPitchMatrix = Cesium.Matrix3.fromQuaternion(yawPitchQuaternion, new Cesium.Matrix3());
    const xAxisAfterYawPitch = Cesium.Matrix3.multiplyByVector(
      yawPitchMatrix,
      axes.xAxis,
      new Cesium.Cartesian3()
    );
    
    // 3. Roll 회전 (X축 기준, Yaw-Pitch 회전 후의 X축)
    const rollQuaternion = Cesium.Quaternion.fromAxisAngle(xAxisAfterYawPitch, rollRad, new Cesium.Quaternion());

    // 최종 회전: Roll * Pitch * Yaw (오른쪽에서 왼쪽으로 적용)
    const finalQuaternion = Cesium.Quaternion.multiply(
      rollQuaternion,
      yawPitchQuaternion,
      new Cesium.Quaternion()
    );

    return finalQuaternion;
  }

  /**
   * 위성의 로컬 좌표계 축 계산 (회전 적용 전 기본 축)
   * X: 위성 진행 방향 (속도 벡터)
   * Z: 지구 중심 방향
   * Y: SAR 관측 방향 (X × Z)
   */
  private calculateAxes(): { xAxis: any; yAxis: any; zAxis: any } | null {
    // 회전이 적용된 축을 계산
    if (this.useCustomOrientation && (this.yaw !== 0 || this.pitch !== 0 || this.roll !== 0)) {
      return this.calculateRotatedAxes();
    }
    return this.calculateBaseAxes();
  }

  /**
   * 회전이 적용된 축 계산
   */
  private calculateRotatedAxes(): { xAxis: any; yAxis: any; zAxis: any } | null {
    const baseAxes = this.calculateBaseAxes();
    if (!baseAxes) {
      return null;
    }

    const orientation = this.calculateOrientation();
    
    // 회전 행렬을 사용하여 축 변환
    const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation, new Cesium.Matrix3());
    
    const xAxis = Cesium.Matrix3.multiplyByVector(rotationMatrix, baseAxes.xAxis, new Cesium.Cartesian3());
    const yAxis = Cesium.Matrix3.multiplyByVector(rotationMatrix, baseAxes.yAxis, new Cesium.Cartesian3());
    const zAxis = Cesium.Matrix3.multiplyByVector(rotationMatrix, baseAxes.zAxis, new Cesium.Cartesian3());

    return {
      xAxis: Cesium.Cartesian3.normalize(xAxis, new Cesium.Cartesian3()),
      yAxis: Cesium.Cartesian3.normalize(yAxis, new Cesium.Cartesian3()),
      zAxis: Cesium.Cartesian3.normalize(zAxis, new Cesium.Cartesian3()),
    };
  }

  /**
   * Roll 설정
   */
  setRoll(roll: number): void {
    this.roll = roll;
    this.useCustomOrientation = true;
    this.updateOrientationProperty();
  }

  /**
   * Pitch 설정
   */
  setPitch(pitch: number): void {
    this.pitch = pitch;
    this.useCustomOrientation = true;
    this.updateOrientationProperty();
  }

  /**
   * Yaw 설정
   */
  setYaw(yaw: number): void {
    this.yaw = yaw;
    this.useCustomOrientation = true;
    this.updateOrientationProperty();
  }

  /**
   * 방향 값만 설정 (커스텀 방향 플래그는 변경하지 않음)
   * 미션 방향 설정 시 사용
   */
  setOrientationValues(yaw: number, pitch: number, roll: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.roll = roll;
    // useCustomOrientation 플래그는 변경하지 않음
    // 이미 커스텀 방향이 활성화되어 있으면 방향만 업데이트됨
    if (this.useCustomOrientation) {
      this.updateOrientationProperty();
    }
  }

  /**
   * 위성의 로컬 좌표계 기본 축 계산 (회전 적용 전)
   * X: 위성 진행 방향 (속도 벡터)
   * Z: 지구 중심 방향
   * Y: SAR 관측 방향 (X × Z)
   */
  calculateBaseAxes(): { xAxis: any; yAxis: any; zAxis: any } | null {
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
    } else if (this.satelliteManager && this.satelliteManager.satelliteMode === 'position_velocity') {
      // 위치/속도 기반 모드: 저장된 속도 벡터 사용
      const state = this.satelliteManager.getPositionVelocityState();
      if (state && state.velocity) {
        // 속도 벡터를 ECEF 좌표계로 변환 (이미 ECEF일 수 있음)
        xAxis = new Cesium.Cartesian3(
          state.velocity.vx,
          state.velocity.vy,
          state.velocity.vz
        );
        // 속도 벡터 정규화
        const speed = Math.sqrt(xAxis.x * xAxis.x + xAxis.y * xAxis.y + xAxis.z * xAxis.z);
        if (speed > 1e-6) {
          xAxis = Cesium.Cartesian3.normalize(xAxis, new Cesium.Cartesian3());
        } else {
          xAxis = this.getDefaultVelocityDirection();
        }
      } else {
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
