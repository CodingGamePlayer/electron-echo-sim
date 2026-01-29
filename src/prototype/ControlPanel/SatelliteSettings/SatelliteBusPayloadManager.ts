/**
 * SatelliteBusPayloadManager - BUS와 Payload(안테나) 엔티티 관리 클래스
 */
export class SatelliteBusPayloadManager {
  private viewer: any;
  private busEntity: any;
  private antennaEntity: any;
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
  private axisLength: number;
  private axisVisible: boolean;
  private busDimensions: { length: number; width: number; height: number } | null;
  private antennaParams: {
    height: number;
    width: number;
    depth: number;
    rollAngle: number;
    pitchAngle: number;
    yawAngle: number;
    initialElevationAngle: number;
    initialAzimuthAngle: number;
  } | null;

  constructor(viewer: any) {
    this.viewer = viewer;
    this.busEntity = null;
    this.antennaEntity = null;
    this.position = null;
    this.currentCartesian = null;
    this.axisEntities = null;
    this.axisLength = 50000; // 기본값: 50km
    this.axisVisible = true;
    this.busDimensions = null;
    this.antennaParams = null;
  }

  /**
   * BUS와 안테나 엔티티 생성
   */
  createSatellite(
    name: string,
    position: { longitude: number; latitude: number; altitude: number },
    busDimensions: { length: number; width: number; height: number },
    antennaParams: {
      height: number;
      width: number;
      depth: number;
      rollAngle: number;
      pitchAngle: number;
      yawAngle: number;
      initialElevationAngle: number;
      initialAzimuthAngle: number;
    }
  ): void {
    if (!this.viewer) {
      console.error('[SatelliteBusPayloadManager] Viewer가 없습니다.');
      return;
    }

    console.log('[SatelliteBusPayloadManager] 위성 엔티티 생성 시작:', {
      name,
      position,
      busDimensions,
      antennaParams
    });

    // 기존 엔티티 제거
    this.removeSatellite();

    const initialCartesian = Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      position.altitude
    );

    this.position = new Cesium.ConstantPositionProperty(initialCartesian);
    this.currentCartesian = initialCartesian.clone();

    // 파라미터 저장
    this.busDimensions = busDimensions;
    this.antennaParams = antennaParams;

    // BUS 기본 방향 계산
    const busAxes = this.calculateBaseAxes();
    if (!busAxes) {
      console.error('[SatelliteBusPayloadManager] BUS 축 계산 실패');
      return;
    }

    // BUS 방향 쿼터니언 계산 (기본 방향 - 동쪽을 향하도록)
    const busOrientation = Cesium.Transforms.headingPitchRollQuaternion(
      initialCartesian,
      new Cesium.HeadingPitchRoll(0, 0, 0)
    );

    // BUS 엔티티 생성
    try {
      this.busEntity = this.viewer.entities.add({
        name: `${name} - BUS`,
        position: this.position,
        orientation: new Cesium.ConstantProperty(busOrientation),
        box: {
          dimensions: new Cesium.Cartesian3(
            busDimensions.length,
            busDimensions.width,
            busDimensions.height
          ),
          material: Cesium.Color.GRAY.withAlpha(0.8),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        show: true,
      });

      console.log('[SatelliteBusPayloadManager] BUS 엔티티 생성 완료:', this.busEntity);
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] BUS 엔티티 생성 오류:', error);
      return;
    }

    // 안테나 위치 계산 (BUS의 Y축 방향)
    try {
      // BUS의 Y축 방향으로 안테나 위치 설정 (BUS 크기의 절반 + 약간의 간격)
      const antennaOffset = Cesium.Cartesian3.multiplyByScalar(
        busAxes.yAxis,
        busDimensions.width / 2 + antennaParams.depth / 2 + 1,
        new Cesium.Cartesian3()
      );
      const antennaPosition = Cesium.Cartesian3.add(
        this.currentCartesian,
        antennaOffset,
        new Cesium.Cartesian3()
      );
      const antennaPositionProperty = new Cesium.ConstantPositionProperty(antennaPosition);

      // 안테나 방향 계산
      const antennaOrientation = this.calculateAntennaOrientation(
        busAxes,
        antennaParams.rollAngle,
        antennaParams.pitchAngle,
        antennaParams.yawAngle,
        antennaParams.initialElevationAngle,
        antennaParams.initialAzimuthAngle
      );

      // 안테나 엔티티 생성
      this.antennaEntity = this.viewer.entities.add({
        name: `${name} - Antenna`,
        position: antennaPositionProperty,
        orientation: new Cesium.ConstantProperty(antennaOrientation),
        box: {
          dimensions: new Cesium.Cartesian3(
            antennaParams.depth,
            antennaParams.width,
            antennaParams.height
          ),
          material: Cesium.Color.CYAN.withAlpha(0.7),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        show: true,
      });

      console.log('[SatelliteBusPayloadManager] 안테나 엔티티 생성 완료:', this.antennaEntity);
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] 안테나 엔티티 생성 오류:', error);
    }

    // XYZ 축 생성
    try {
      this.createAxisLines();
      console.log('[SatelliteBusPayloadManager] XYZ 축 생성 완료');
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] XYZ 축 생성 오류:', error);
    }
  }

  /**
   * 안테나 방향 계산
   * 안테나의 넓은 면(width x height)이 BUS를 바라보도록 기본 방향 설정
   */
  private calculateAntennaOrientation(
    busAxes: { xAxis: any; yAxis: any; zAxis: any },
    rollAngle: number,
    pitchAngle: number,
    yawAngle: number,
    elevationAngle: number,
    azimuthAngle: number
  ): any {
    // 각도를 라디안으로 변환
    const rollRad = Cesium.Math.toRadians(rollAngle);
    const pitchRad = Cesium.Math.toRadians(pitchAngle);
    const yawRad = Cesium.Math.toRadians(yawAngle);
    const elevationRad = Cesium.Math.toRadians(elevationAngle);
    const azimuthRad = Cesium.Math.toRadians(azimuthAngle);

    // 안테나의 기본 방향: 넓은 면(width x height)이 BUS를 향하도록
    // 안테나의 Y축이 BUS의 -Y축 방향을 향하도록 회전
    // Cesium Box의 dimensions: (depth, width, height) = (X, Y, Z)
    // 넓은 면은 Y-Z 평면이므로, 안테나의 -Y축이 BUS를 향해야 함

    // 1. 기본 방향: 안테나의 -Y축이 BUS의 -Y축 방향을 향하도록
    // BUS의 -Y축 방향 벡터
    const busNegativeYAxis = Cesium.Cartesian3.negate(busAxes.yAxis, new Cesium.Cartesian3());
    
    // 안테나의 기본 Y축 (안테나 로컬 좌표계에서 Y축은 width 방향)
    // 안테나가 BUS의 Y축 방향에 위치하므로, 안테나의 -Y축이 BUS를 향하도록
    // 기본적으로 안테나의 Y축을 BUS의 -Y축과 정렬
    const antennaBaseYAxis = busNegativeYAxis;

    // 안테나의 기본 X축 (depth 방향)은 BUS의 X축과 정렬
    const antennaBaseXAxis = busAxes.xAxis;
    
    // 안테나의 기본 Z축 (height 방향)은 외적으로 계산
    const antennaBaseZAxis = Cesium.Cartesian3.cross(
      antennaBaseXAxis,
      antennaBaseYAxis,
      new Cesium.Cartesian3()
    );
    const antennaBaseZAxisNormalized = Cesium.Cartesian3.normalize(antennaBaseZAxis, new Cesium.Cartesian3());
    
    // X축 재계산 (Y × Z로 정규화 보정)
    const antennaBaseXAxisCorrected = Cesium.Cartesian3.cross(
      antennaBaseYAxis,
      antennaBaseZAxisNormalized,
      new Cesium.Cartesian3()
    );
    const antennaBaseXAxisNormalized = Cesium.Cartesian3.normalize(antennaBaseXAxisCorrected, new Cesium.Cartesian3());

    // 기본 방향 쿼터니언 계산 (로컬 좌표계를 ECEF 좌표계로 변환)
    const baseRotationMatrix = new Cesium.Matrix3(
      antennaBaseXAxisNormalized.x, antennaBaseYAxis.x, antennaBaseZAxisNormalized.x,
      antennaBaseXAxisNormalized.y, antennaBaseYAxis.y, antennaBaseZAxisNormalized.y,
      antennaBaseXAxisNormalized.z, antennaBaseYAxis.z, antennaBaseZAxisNormalized.z
    );
    const baseOrientation = Cesium.Quaternion.fromRotationMatrix(baseRotationMatrix, new Cesium.Quaternion());

    // 2. 안테나의 roll/pitch/yaw 회전 적용
    // 안테나 로컬 좌표계 기준 회전
    const yawQuaternion = Cesium.Quaternion.fromAxisAngle(antennaBaseZAxisNormalized, yawRad, new Cesium.Quaternion());
    const yawMatrix = Cesium.Matrix3.fromQuaternion(yawQuaternion, new Cesium.Matrix3());
    const yAxisAfterYaw = Cesium.Matrix3.multiplyByVector(
      yawMatrix,
      antennaBaseYAxis,
      new Cesium.Cartesian3()
    );

    const pitchQuaternion = Cesium.Quaternion.fromAxisAngle(yAxisAfterYaw, pitchRad, new Cesium.Quaternion());
    const yawPitchQuaternion = Cesium.Quaternion.multiply(
      pitchQuaternion,
      yawQuaternion,
      new Cesium.Quaternion()
    );
    const yawPitchMatrix = Cesium.Matrix3.fromQuaternion(yawPitchQuaternion, new Cesium.Matrix3());
    const xAxisAfterYawPitch = Cesium.Matrix3.multiplyByVector(
      yawPitchMatrix,
      antennaBaseXAxisNormalized,
      new Cesium.Cartesian3()
    );

    const rollQuaternion = Cesium.Quaternion.fromAxisAngle(xAxisAfterYawPitch, rollRad, new Cesium.Quaternion());
    const rollPitchYawQuaternion = Cesium.Quaternion.multiply(
      rollQuaternion,
      yawPitchQuaternion,
      new Cesium.Quaternion()
    );

    // 3. 초기 elevation/azimuth 각도 적용
    // Elevation: Y축 기준 회전
    // Azimuth: Z축 기준 회전
    const elevationQuaternion = Cesium.Quaternion.fromAxisAngle(
      yAxisAfterYaw,
      elevationRad,
      new Cesium.Quaternion()
    );
    const azimuthQuaternion = Cesium.Quaternion.fromAxisAngle(
      antennaBaseZAxisNormalized,
      azimuthRad,
      new Cesium.Quaternion()
    );

    // 최종 회전: Azimuth * Elevation * Roll * Pitch * Yaw * Base
    const elevationAzimuthQuaternion = Cesium.Quaternion.multiply(
      azimuthQuaternion,
      elevationQuaternion,
      new Cesium.Quaternion()
    );

    const finalRotation = Cesium.Quaternion.multiply(
      elevationAzimuthQuaternion,
      rollPitchYawQuaternion,
      new Cesium.Quaternion()
    );

    return Cesium.Quaternion.multiply(
      finalRotation,
      baseOrientation,
      new Cesium.Quaternion()
    );
  }

  /**
   * 위성의 로컬 좌표계 기본 축 계산
   */
  private calculateBaseAxes(): { xAxis: any; yAxis: any; zAxis: any } | null {
    if (!this.currentCartesian) {
      return null;
    }

    // Z축: 지구 중심 방향
    const zAxis = Cesium.Cartesian3.negate(
      Cesium.Cartesian3.normalize(this.currentCartesian, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    // X축: 동쪽 방향 근사
    const cartographic = Cesium.Cartographic.fromCartesian(this.currentCartesian);
    const lon = cartographic.longitude;
    const xAxis = new Cesium.Cartesian3(Math.sin(lon), -Math.cos(lon), 0);
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
        show: this.axisVisible,
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
        show: this.axisVisible,
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
        show: this.axisVisible,
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
        show: this.axisVisible,
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
        show: this.axisVisible,
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
        show: this.axisVisible,
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

    const axes = this.calculateBaseAxes();
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

    const axes = this.calculateBaseAxes();
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
   * 위성 위치 업데이트
   */
  updatePosition(position: { longitude: number; latitude: number; altitude: number }): void {
    if (!this.position || !this.currentCartesian) {
      console.warn('[SatelliteBusPayloadManager] 위치를 업데이트할 엔티티가 없습니다.');
      return;
    }

    if (!this.busDimensions || !this.antennaParams) {
      console.warn('[SatelliteBusPayloadManager] BUS 또는 안테나 파라미터가 없습니다.');
      return;
    }

    const newCartesian = Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      position.altitude
    );

    this.currentCartesian = newCartesian.clone();
    this.position.setValue(newCartesian);

    // BUS 방향 재계산
    const busAxes = this.calculateBaseAxes();
    if (busAxes) {
      const busOrientation = Cesium.Transforms.headingPitchRollQuaternion(
        newCartesian,
        new Cesium.HeadingPitchRoll(0, 0, 0)
      );

      if (this.busEntity) {
        this.busEntity.orientation = new Cesium.ConstantProperty(busOrientation);
      }

      // 안테나 위치 재계산
      if (this.antennaEntity && this.antennaParams) {
        const antennaOffset = Cesium.Cartesian3.multiplyByScalar(
          busAxes.yAxis,
          this.busDimensions.width / 2 + this.antennaParams.depth / 2 + 1,
          new Cesium.Cartesian3()
        );
        const antennaPosition = Cesium.Cartesian3.add(
          this.currentCartesian,
          antennaOffset,
          new Cesium.Cartesian3()
        );
        const antennaPositionProperty = new Cesium.ConstantPositionProperty(antennaPosition);
        this.antennaEntity.position = antennaPositionProperty;

        // 안테나 방향도 재계산
        const antennaOrientation = this.calculateAntennaOrientation(
          busAxes,
          this.antennaParams.rollAngle,
          this.antennaParams.pitchAngle,
          this.antennaParams.yawAngle,
          this.antennaParams.initialElevationAngle,
          this.antennaParams.initialAzimuthAngle
        );
        this.antennaEntity.orientation = new Cesium.ConstantProperty(antennaOrientation);
      }
    }

    console.log('[SatelliteBusPayloadManager] 위치 업데이트 완료:', position);
  }

  /**
   * 위성 엔티티 제거
   */
  removeSatellite(): void {
    if (this.busEntity) {
      this.viewer.entities.remove(this.busEntity);
      this.busEntity = null;
    }
    if (this.antennaEntity) {
      this.viewer.entities.remove(this.antennaEntity);
      this.antennaEntity = null;
    }
    if (this.axisEntities) {
      if (this.axisEntities.xAxis) this.viewer.entities.remove(this.axisEntities.xAxis);
      if (this.axisEntities.yAxis) this.viewer.entities.remove(this.axisEntities.yAxis);
      if (this.axisEntities.zAxis) this.viewer.entities.remove(this.axisEntities.zAxis);
      if (this.axisEntities.xLabel) this.viewer.entities.remove(this.axisEntities.xLabel);
      if (this.axisEntities.yLabel) this.viewer.entities.remove(this.axisEntities.yLabel);
      if (this.axisEntities.zLabel) this.viewer.entities.remove(this.axisEntities.zLabel);
      this.axisEntities = null;
    }
    this.position = null;
    this.currentCartesian = null;
    this.busDimensions = null;
    this.antennaParams = null;
  }

  /**
   * XYZ 축 표시/숨김 설정
   */
  setAxisVisible(visible: boolean): void {
    this.axisVisible = visible;
    if (this.axisEntities) {
      this.axisEntities.xAxis.polyline.show = visible;
      this.axisEntities.yAxis.polyline.show = visible;
      this.axisEntities.zAxis.polyline.show = visible;
      this.axisEntities.xLabel.label.show = visible;
      this.axisEntities.yLabel.label.show = visible;
      this.axisEntities.zLabel.label.show = visible;
    }
  }

  /**
   * 축 길이 설정
   */
  setAxisLength(length: number): void {
    this.axisLength = length;
  }

  /**
   * BUS 엔티티 반환
   */
  getBusEntity(): any {
    return this.busEntity;
  }

  /**
   * 안테나 엔티티 반환
   */
  getAntennaEntity(): any {
    return this.antennaEntity;
  }
}
