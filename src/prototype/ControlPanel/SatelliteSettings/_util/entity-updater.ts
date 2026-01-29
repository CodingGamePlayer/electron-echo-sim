import { SatelliteBusPayloadManager } from '../SatelliteBusPayloadManager/index.js';
import { parsePositionInputs, parseBusDimensionsInputs, parseAntennaDimensionsInputs, parseAntennaGapInput, parseAntennaOrientationInputs } from './input-parser.js';

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

  // 엔티티 업데이트 시 카메라 이동 방지
  const previousTrackedEntity = viewer.trackedEntity;
  viewer.trackedEntity = undefined;

  try {
    // 위치 정보 업데이트
    const position = parsePositionInputs();
    if (position) {
      // 위치 수정 시에도 우주 공간(50,000km)에 생성되도록 고도 고정
      const spaceAltitude = 50000000; // 50,000km (지구 반지름의 약 8배)
      busPayloadManager.updatePosition({
        longitude: position.longitude,
        latitude: position.latitude,
        altitude: spaceAltitude
      });
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
    // 이전 trackedEntity 복원
    if (previousTrackedEntity) {
      viewer.trackedEntity = previousTrackedEntity;
    }
  }
}
