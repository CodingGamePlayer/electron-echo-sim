import { SatelliteBusPayloadManager } from '../SatelliteBusPayloadManager/index.js';
import { parseSatelliteBasicInfo, parsePositionInputs, parseBusDimensionsInputs, parseAntennaDimensionsInputs, parseAntennaGapInput, parseAntennaOrientationInputs } from './input-parser.js';

/**
 * 엔티티 생성 유틸리티
 */

/**
 * 위성 엔티티 생성
 */
export function createSatelliteEntity(
  busPayloadManager: SatelliteBusPayloadManager | null,
  viewer: any
): void {
  if (!busPayloadManager || !viewer) {
    alert('Cesium 뷰어가 초기화되지 않았습니다.');
    return;
  }

  // 입력값 가져오기
  const { name, id } = parseSatelliteBasicInfo();
  
  const position = parsePositionInputs();
  if (!position) {
    alert('위치 정보를 올바르게 입력해주세요.');
    return;
  }

  // 입력값 검증
  if (position.longitude < -180 || position.longitude > 180) {
    alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
    return;
  }
  if (position.latitude < -90 || position.latitude > 90) {
    alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
    return;
  }
  if (position.altitudeKm < 0) {
    alert('고도는 0 이상이어야 합니다.');
    return;
  }

  const busDimensions = parseBusDimensionsInputs();
  if (!busDimensions) {
    alert('BUS 크기를 올바르게 입력해주세요.');
    return;
  }

  const antennaDimensions = parseAntennaDimensionsInputs();
  if (!antennaDimensions) {
    alert('안테나 크기를 올바르게 입력해주세요.');
    return;
  }

  const antennaGapMm = parseFloat((document.getElementById('prototypeAntennaGap') as HTMLInputElement)?.value || '1');
  const antennaGap = antennaGapMm / 1000;

  const antennaOrientation = parseAntennaOrientationInputs();
  if (!antennaOrientation) {
    alert('안테나 방향 정보를 올바르게 입력해주세요.');
    return;
  }

  // 엔티티 생성 (우주 공간에서 생성 - 지구에서 멀리 떨어진 곳)
  try {
    // 우주 공간에서 생성 (지구에서 멀리 떨어진 위치)
    // 경도/위도는 입력값 사용하되, 고도는 매우 높게 설정하여 지구와 멀리 떨어뜨림
    const spaceAltitude = 50000000; // 50,000km (지구 반지름의 약 8배)

    busPayloadManager.createSatellite(
      name,
      { longitude: position.longitude, latitude: position.latitude, altitude: spaceAltitude },
      busDimensions,
      {
        height: antennaDimensions.height,
        width: antennaDimensions.width,
        depth: antennaDimensions.depth,
        rollAngle: antennaOrientation.rollAngle,
        pitchAngle: antennaOrientation.pitchAngle,
        yawAngle: antennaOrientation.yawAngle,
        initialElevationAngle: antennaOrientation.initialElevationAngle,
        initialAzimuthAngle: antennaOrientation.initialAzimuthAngle,
      },
      antennaGap
    );

    alert('위성 엔티티가 생성되었습니다.');
  } catch (error) {
    console.error('[SatelliteSettings] 위성 엔티티 생성 오류:', error);
    alert('위성 엔티티 생성 중 오류가 발생했습니다: ' + (error as Error).message);
  }
}

/**
 * 카메라 각도 설정
 */
export function setupCameraAngle(
  viewer: any,
  busEntity: any
): void {
  if (!viewer || !busEntity) {
    return;
  }

  const busPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
  if (!busPosition) {
    return;
  }

  // BUS 크기 정보로 적절한 거리 계산 (mm를 미터로 변환)
  const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
  const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
  const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');
  const maxBusSize = Math.max(busLengthMm, busWidthMm, busHeightMm) / 1000;
  
  // 대각선에서 바라보는 각도 설정
  const cameraRange = Math.max(maxBusSize * 3, 20);
  
  // 카메라를 엔티티 생성 시와 동일한 각도로 설정
  viewer.camera.lookAt(
    busPosition,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(45), // heading: 대각선 방향
      Cesium.Math.toRadians(0), // pitch: 수평선에 가까운 대각선 뷰
      cameraRange // range: 거리
    )
  );
}
