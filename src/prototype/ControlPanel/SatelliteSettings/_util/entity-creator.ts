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
  viewer: any,
  showAlert: boolean = true
): boolean {
  if (!busPayloadManager || !viewer) {
    if (showAlert) {
      alert('Cesium 뷰어가 초기화되지 않았습니다.');
    }
    return false;
  }

  // 입력값 가져오기
  const { name, id } = parseSatelliteBasicInfo();
  
  const position = parsePositionInputs();
  if (!position) {
    if (showAlert) {
      alert('위치 정보를 올바르게 입력해주세요.');
    }
    return false;
  }

  // 입력값 검증
  if (position.longitude < -180 || position.longitude > 180) {
    if (showAlert) {
      alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
    }
    return false;
  }
  if (position.latitude < -90 || position.latitude > 90) {
    if (showAlert) {
      alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
    }
    return false;
  }
  if (position.altitudeKm < 0) {
    if (showAlert) {
      alert('고도는 0 이상이어야 합니다.');
    }
    return false;
  }

  const busDimensions = parseBusDimensionsInputs();
  if (!busDimensions) {
    if (showAlert) {
      alert('BUS 크기를 올바르게 입력해주세요.');
    }
    return false;
  }

  const antennaDimensions = parseAntennaDimensionsInputs();
  if (!antennaDimensions) {
    if (showAlert) {
      alert('안테나 크기를 올바르게 입력해주세요.');
    }
    return false;
  }

  const antennaGapMm = parseFloat((document.getElementById('prototypeAntennaGap') as HTMLInputElement)?.value || '1');
  const antennaGap = antennaGapMm / 1000;

  const antennaOrientation = parseAntennaOrientationInputs();
  if (!antennaOrientation) {
    if (showAlert) {
      alert('안테나 방향 정보를 올바르게 입력해주세요.');
    }
    return false;
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

    if (showAlert) {
      alert('위성 엔티티가 생성되었습니다.');
    }
    return true;
  } catch (error) {
    console.error('[SatelliteSettings] 위성 엔티티 생성 오류:', error);
    if (showAlert) {
      alert('위성 엔티티 생성 중 오류가 발생했습니다: ' + (error as Error).message);
    }
    return false;
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
    console.error('[setupCameraAngle] viewer 또는 busEntity가 없습니다.');
    return;
  }

  // trackedEntity 해제 (카메라 이동 방해 방지)
  viewer.trackedEntity = undefined;

  const busPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
  if (!busPosition) {
    console.error('[setupCameraAngle] BUS 위치를 가져올 수 없습니다.');
    return;
  }

  console.log('[setupCameraAngle] BUS 위치:', busPosition);

  // BUS 크기 정보로 적절한 거리 계산 (mm를 미터로 변환)
  const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
  const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
  const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');
  const maxBusSize = Math.max(busLengthMm, busWidthMm, busHeightMm) / 1000;
  
  // 대각선에서 바라보는 각도 설정
  // BUS 크기의 3배 정도 거리에서 보면 적절함 (엔티티가 잘 보이도록)
  const cameraRange = Math.max(maxBusSize * 10, 3); // 최소 3m, 최대 BUS 크기의 3배
  
  console.log('[setupCameraAngle] 카메라 범위:', cameraRange, 'm');
  console.log('[setupCameraAngle] Heading: 45도, Pitch: -45도, Range:', cameraRange, 'm');

  try {
    // 기존 카메라 애니메이션 취소
    if (viewer.camera._flight && viewer.camera._flight.isActive()) {
      console.log('[setupCameraAngle] 기존 카메라 애니메이션 취소');
      viewer.camera.cancelFlight();
    }

    // 약간의 지연 후 카메라 이동 (기존 애니메이션 완전 종료 대기)
    setTimeout(() => {
      // flyTo를 사용하여 부드럽게 이동
      viewer.camera.flyTo({
        destination: busPosition,
        orientation: {
          heading: Cesium.Math.toRadians(45), // 대각선 방향
          pitch: Cesium.Math.toRadians(-45), // 위에서 45도 각도로 내려다보기
          roll: 0.0
        },
        duration: 1.5, // 1.5초 동안 이동
        complete: () => {
          console.log('[setupCameraAngle] 카메라 이동 완료');
          // 이동 후 정확한 거리로 조정
          viewer.camera.lookAt(
            busPosition,
            new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(45), // heading: 대각선 방향
              Cesium.Math.toRadians(-30), // pitch: 위에서 45도 각도로 내려다보기
              cameraRange
            )
          );
        }
      });
    }, 100); // 기존 애니메이션 취소 후 100ms 대기
  } catch (error) {
    console.error('[setupCameraAngle] 카메라 이동 오류:', error);
    // flyTo 실패 시 lookAt으로 폴백
    try {
      viewer.camera.lookAt(
        busPosition,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(30), // heading: 대각선 방향
          Cesium.Math.toRadians(-30), // pitch: 위에서 45도 각도로 내려다보기
          cameraRange
        )
      );
    } catch (fallbackError) {
      console.error('[setupCameraAngle] lookAt 폴백도 실패:', fallbackError);
    }
  }
}
