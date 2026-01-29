import { SatelliteBusPayloadManager } from '../SatelliteBusPayloadManager/index.js';
import { parsePositionInputs, parseBusDimensionsInputs, parseAntennaDimensionsInputs, parseAntennaGapInput, parseAntennaOrientationInputs } from './input-parser.js';
import { calculateCameraRange } from './entity-creator.js';
import { CAMERA, TIMER } from '../constants.js';
import { setCameraToEntity } from './camera-manager.js';

/**
 * 엔티티 업데이트 유틸리티
 */

/**
 * 엔티티 업데이트 수행
 */
export function updateEntity(
  busPayloadManager: SatelliteBusPayloadManager | null,
  viewer: any
): void {
  if (!busPayloadManager || !viewer) {
    return;
  }

  // 엔티티가 생성되어 있는지 확인
  const busEntity = busPayloadManager.getBusEntity();
  const antennaEntity = busPayloadManager.getAntennaEntity();
  
  if (!busEntity && !antennaEntity) {
    // 엔티티가 없으면 업데이트하지 않음
    return;
  }

  // 이전 추적 상태 저장
  const previousTrackedEntity = viewer.trackedEntity;
  let positionUpdated = false;
  let previousCameraRange: number | null = null;

  try {
    // 위치 정보 업데이트
    const position = parsePositionInputs();
    if (position && busEntity) {
      // 엔티티 위치 업데이트 전의 거리 저장 (현재 줌 레벨 유지)
      const currentBusPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
      if (currentBusPosition) {
        const currentCameraPosition = viewer.camera.position.clone();
        previousCameraRange = Cesium.Cartesian3.distance(currentCameraPosition, currentBusPosition);
      }
      
      // km를 미터로 변환 (Cesium은 미터 단위 사용)
      const altitude = position.altitudeKm * 1000;
      busPayloadManager.updatePosition({
        longitude: position.longitude,
        latitude: position.latitude,
        altitude
      });
      positionUpdated = true;
    }

    // BUS 크기 업데이트
    const busDimensions = parseBusDimensionsInputs();
    if (busDimensions) {
      busPayloadManager.updateBusDimensions(busDimensions);
    }

    // 안테나 크기 업데이트
    const antennaDimensions = parseAntennaDimensionsInputs();
    if (antennaDimensions) {
      busPayloadManager.updateAntennaDimensions(antennaDimensions);
    }

    // 버스-안테나 간격 업데이트
    const antennaGap = parseAntennaGapInput();
    if (antennaGap !== null) {
      busPayloadManager.updateAntennaGap(antennaGap);
    }

    // 안테나 방향 업데이트
    const antennaOrientation = parseAntennaOrientationInputs();
    if (antennaOrientation) {
      busPayloadManager.updateAntennaOrientation(antennaOrientation);
    }
  } catch (error) {
    // 입력값 파싱 오류는 무시 (사용자가 입력 중일 수 있음)
    console.debug('[SatelliteSettings] 엔티티 업데이트 중 오류 (무시됨):', error);
  } finally {
    // 위치가 업데이트된 경우, 카메라를 대각선 시점으로 바로 이동 (애니메이션 없이)
    if (positionUpdated && busEntity) {
      // 엔티티 위치 업데이트 후 약간의 지연을 두고 카메라 이동
      // (엔티티 위치 업데이트가 완전히 반영될 때까지 대기)
      setTimeout(() => {
        // 엔티티 위치 업데이트 전의 거리 사용 (현재 줌 레벨 유지)
        // 또는 기본 줌 레벨 사용 (이전 거리가 없거나 비정상적인 경우)
        let cameraRange: number;
        
        if (previousCameraRange && previousCameraRange > 0 && previousCameraRange < 1000000) {
          // 이전 거리가 유효한 경우 사용 (1m ~ 1000km 범위)
          cameraRange = previousCameraRange;
        } else {
          // 이전 거리가 없거나 비정상적인 경우 기본 줌 레벨 사용
          cameraRange = calculateCameraRange();
        }
        
        // 최소 거리 보장 (너무 가까이 가지 않도록)
        const minRange = 1; // 최소 1m
        cameraRange = Math.max(cameraRange, minRange);
        
        // 카메라 설정
        setCameraToEntity(viewer, busEntity, cameraRange);
      }, TIMER.CAMERA_ANIMATION_CANCEL_DELAY);
    } else if (previousTrackedEntity) {
      // 위치 업데이트가 없었고 이전에 추적 중이었다면 복원
      viewer.trackedEntity = previousTrackedEntity;
    }
  }
}
