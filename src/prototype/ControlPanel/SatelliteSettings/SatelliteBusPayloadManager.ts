import { calculateBaseAxes } from './_util/base-axes-calculator.js';
import { calculateAntennaOrientation } from './_util/antenna-orientation-calculator.js';
import { getAxisLinePositions, getAxisEndPosition } from './_util/axis-position-calculator.js';

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
    const busAxes = calculateBaseAxes(this.currentCartesian);
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
      const antennaOrientation = calculateAntennaOrientation(
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
   * XYZ 축 방향선 생성
   */
  private createAxisLines(): void {
    if (!this.viewer || !this.position) return;

    // X축 (위성 진행 방향) - 빨간색
    const xAxisEntity = this.viewer.entities.add({
      name: 'X-Axis (Satellite Velocity)',
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return getAxisLinePositions(this.currentCartesian, 'x', this.axisLength);
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
          return getAxisLinePositions(this.currentCartesian, 'y', this.axisLength);
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
          return getAxisLinePositions(this.currentCartesian, 'z', this.axisLength);
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
        return getAxisEndPosition(this.currentCartesian, 'x', this.axisLength);
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
        return getAxisEndPosition(this.currentCartesian, 'y', this.axisLength);
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
        return getAxisEndPosition(this.currentCartesian, 'z', this.axisLength);
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

    try {
      const newCartesian = Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        position.altitude
      );

      this.currentCartesian = newCartesian.clone();
      this.position.setValue(newCartesian);

      // BUS 방향 재계산
      const busAxes = calculateBaseAxes(this.currentCartesian);
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
          const antennaOrientation = calculateAntennaOrientation(
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
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] 위치 업데이트 오류:', error);
    }
  }

  /**
   * BUS 크기 업데이트
   */
  updateBusDimensions(dimensions: { length: number; width: number; height: number }): void {
    if (!this.busEntity) {
      return;
    }

    try {
      this.busDimensions = dimensions;

      if (this.busEntity.box) {
        this.busEntity.box.dimensions = new Cesium.Cartesian3(
          dimensions.length,
          dimensions.width,
          dimensions.height
        );
      }

      // 안테나 위치도 재계산 (BUS 크기가 변경되면 안테나 위치도 변경됨)
      if (this.antennaEntity && this.antennaParams && this.currentCartesian) {
        const busAxes = calculateBaseAxes(this.currentCartesian);
        if (busAxes) {
          const antennaOffset = Cesium.Cartesian3.multiplyByScalar(
            busAxes.yAxis,
            dimensions.width / 2 + this.antennaParams.depth / 2 + 1,
            new Cesium.Cartesian3()
          );
          const antennaPosition = Cesium.Cartesian3.add(
            this.currentCartesian,
            antennaOffset,
            new Cesium.Cartesian3()
          );
          const antennaPositionProperty = new Cesium.ConstantPositionProperty(antennaPosition);
          this.antennaEntity.position = antennaPositionProperty;
        }
      }

      console.log('[SatelliteBusPayloadManager] BUS 크기 업데이트 완료:', dimensions);
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] BUS 크기 업데이트 오류:', error);
    }
  }

  /**
   * 안테나 크기 업데이트
   */
  updateAntennaDimensions(dimensions: { height: number; width: number; depth: number }): void {
    if (!this.antennaEntity || !this.antennaParams) {
      return;
    }

    try {
      this.antennaParams.height = dimensions.height;
      this.antennaParams.width = dimensions.width;
      this.antennaParams.depth = dimensions.depth;

      if (this.antennaEntity.box) {
        this.antennaEntity.box.dimensions = new Cesium.Cartesian3(
          dimensions.depth,
          dimensions.width,
          dimensions.height
        );
      }

      // 안테나 위치도 재계산 (안테나 depth가 변경되면 위치도 변경됨)
      if (this.busDimensions && this.currentCartesian) {
        const busAxes = calculateBaseAxes(this.currentCartesian);
        if (busAxes) {
          const antennaOffset = Cesium.Cartesian3.multiplyByScalar(
            busAxes.yAxis,
            this.busDimensions.width / 2 + dimensions.depth / 2 + 1,
            new Cesium.Cartesian3()
          );
          const antennaPosition = Cesium.Cartesian3.add(
            this.currentCartesian,
            antennaOffset,
            new Cesium.Cartesian3()
          );
          const antennaPositionProperty = new Cesium.ConstantPositionProperty(antennaPosition);
          this.antennaEntity.position = antennaPositionProperty;
        }
      }

      console.log('[SatelliteBusPayloadManager] 안테나 크기 업데이트 완료:', dimensions);
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] 안테나 크기 업데이트 오류:', error);
    }
  }

  /**
   * 안테나 방향 업데이트
   */
  updateAntennaOrientation(orientation: {
    rollAngle: number;
    pitchAngle: number;
    yawAngle: number;
    initialElevationAngle: number;
    initialAzimuthAngle: number;
  }): void {
    if (!this.antennaEntity || !this.antennaParams || !this.currentCartesian) {
      return;
    }

    try {
      this.antennaParams.rollAngle = orientation.rollAngle;
      this.antennaParams.pitchAngle = orientation.pitchAngle;
      this.antennaParams.yawAngle = orientation.yawAngle;
      this.antennaParams.initialElevationAngle = orientation.initialElevationAngle;
      this.antennaParams.initialAzimuthAngle = orientation.initialAzimuthAngle;

      const busAxes = calculateBaseAxes(this.currentCartesian);
      if (busAxes) {
        const antennaOrientation = calculateAntennaOrientation(
          busAxes,
          orientation.rollAngle,
          orientation.pitchAngle,
          orientation.yawAngle,
          orientation.initialElevationAngle,
          orientation.initialAzimuthAngle
        );
        this.antennaEntity.orientation = new Cesium.ConstantProperty(antennaOrientation);
      }

      console.log('[SatelliteBusPayloadManager] 안테나 방향 업데이트 완료:', orientation);
    } catch (error) {
      console.error('[SatelliteBusPayloadManager] 안테나 방향 업데이트 오류:', error);
    }
  }

  /**
   * 모든 파라미터 업데이트 (편의 메서드)
   */
  updateAll(params: {
    position?: { longitude: number; latitude: number; altitude: number };
    busDimensions?: { length: number; width: number; height: number };
    antennaDimensions?: { height: number; width: number; depth: number };
    antennaOrientation?: {
      rollAngle: number;
      pitchAngle: number;
      yawAngle: number;
      initialElevationAngle: number;
      initialAzimuthAngle: number;
    };
  }): void {
    if (params.position) {
      this.updatePosition(params.position);
    }
    if (params.busDimensions) {
      this.updateBusDimensions(params.busDimensions);
    }
    if (params.antennaDimensions) {
      this.updateAntennaDimensions(params.antennaDimensions);
    }
    if (params.antennaOrientation) {
      this.updateAntennaOrientation(params.antennaOrientation);
    }
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
