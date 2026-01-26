import { SwathManager } from '../managers/SwathManager.js';
import { SARSwathGeometry, SwathMode, SwathCorners } from '../types/sar-swath.types.js';
import { HeadingCalculator } from './HeadingCalculator.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';
import { SARSwathCalculator } from '../utils/sar-swath-calculator.js';

/**
 * Swath 미리보기 관리
 */
export class SwathPreviewManager {
  private viewer: any;
  private swathManager: SwathManager;
  private headingCalculator: HeadingCalculator;
  private entityManager: SatelliteEntityManager;
  private previewSwathId: string | null;
  private previewSwathEntity: any;  // Swath preview Entity 직접 관리
  private previewSwathParams: {
    nearRange?: number;
    farRange?: number;
    swathWidth?: number;
    azimuthLength?: number;
  } | null;
  private previewSwathOptions: Partial<any> | undefined;
  private lastPreviewUpdateTime: number;
  private beamDirectionLines: any[];  // 빔 방향 선 Entity 배열
  private currentHeadingOffset: number;  // 현재 heading offset 저장

  constructor(
    viewer: any,
    swathManager: SwathManager,
    headingCalculator: HeadingCalculator,
    entityManager: SatelliteEntityManager
  ) {
    this.viewer = viewer;
    this.swathManager = swathManager;
    this.headingCalculator = headingCalculator;
    this.entityManager = entityManager;
    this.previewSwathId = null;
    this.previewSwathEntity = null;
    this.previewSwathParams = null;
    this.previewSwathOptions = undefined;
    this.lastPreviewUpdateTime = 0;
    this.beamDirectionLines = [];
    this.currentHeadingOffset = 0;
  }

  /**
   * Swath 미리보기 업데이트
   */
  updateSwathPreview(
    swathParams: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    } = {},
    options?: Partial<any>,
    headingOffset: number = 0
  ): void {
    this.previewSwathParams = swathParams;
    this.previewSwathOptions = options;
    this.currentHeadingOffset = headingOffset;  // heading offset 저장

    const currentCartesian = this.entityManager.getCurrentCartesian();
    if (!currentCartesian) {
      return;
    }

    const currentPosition = this.headingCalculator.getSatellitePosition(currentCartesian, headingOffset);
    if (!currentPosition) {
      return;
    }

    const {
      nearRange = 200000,
      farRange = 800000,
      swathWidth = 400000,
      azimuthLength = 50000,
    } = swathParams;

    // Swath preview Entity가 없으면 생성 (CallbackProperty 사용)
    if (!this.previewSwathEntity) {
      // 초기 기본값 생성
      const defaultPositions = [
        Cesium.Cartesian3.fromDegrees(0, 0, 0),
        Cesium.Cartesian3.fromDegrees(0.001, 0, 0),
        Cesium.Cartesian3.fromDegrees(0.001, 0.001, 0),
        Cesium.Cartesian3.fromDegrees(0, 0.001, 0)
      ];

      this.previewSwathEntity = this.viewer.entities.add({
        name: 'SwathPreview',
        polygon: {
          hierarchy: new Cesium.CallbackProperty(() => {
            let positions: any[];
            
            try {
              const currentCartesian = this.entityManager.getCurrentCartesian();
              if (!currentCartesian) {
                positions = defaultPositions;
              } else {
                // 현재 geometry로 모서리 재계산
                const currentPosition = this.headingCalculator.getSatellitePosition(currentCartesian, this.currentHeadingOffset);
                if (!currentPosition) {
                  positions = defaultPositions;
                } else {
                  // 현재 파라미터로 geometry 재생성
                  const currentParams = this.previewSwathParams || {};
                  const currentGeometry: SARSwathGeometry = {
                    centerLat: currentPosition.latitude,
                    centerLon: currentPosition.longitude,
                    heading: currentPosition.heading,
                    nearRange: currentParams.nearRange || 200000,
                    farRange: currentParams.farRange || 800000,
                    swathWidth: currentParams.swathWidth || 400000,
                    azimuthLength: currentParams.azimuthLength || 50000,
                    satelliteAltitude: currentPosition.altitude,
                  };

                  const corners = SARSwathCalculator.calculateSwathCorners(currentGeometry);
                  
                  // corners 유효성 검사
                  if (!corners || 
                      !corners.topLeft || !corners.topRight || 
                      !corners.bottomRight || !corners.bottomLeft) {
                    positions = defaultPositions;
                  } else {
                    // 각 corner의 좌표 유효성 검사
                    const cornerKeys: Array<keyof typeof corners> = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
                    let isValid = true;
                    for (const key of cornerKeys) {
                      const corner = corners[key];
                      if (!Array.isArray(corner) || corner.length < 2 || 
                          typeof corner[0] !== 'number' || typeof corner[1] !== 'number' ||
                          isNaN(corner[0]) || isNaN(corner[1])) {
                        isValid = false;
                        break;
                      }
                    }
                    
                    if (!isValid) {
                      positions = defaultPositions;
                    } else {
                      const calculatedPositions = SARSwathCalculator.cornersToCartesian(corners);
                      
                      // positions 배열 유효성 검사
                      if (!Array.isArray(calculatedPositions) || calculatedPositions.length < 4) {
                        positions = defaultPositions;
                      } else {
                        // 각 position이 유효한 Cartesian3인지 확인
                        let allValid = true;
                        for (let i = 0; i < calculatedPositions.length; i++) {
                          if (!calculatedPositions[i] || !(calculatedPositions[i] instanceof Cesium.Cartesian3)) {
                            allValid = false;
                            break;
                          }
                          // Cartesian3의 값이 유효한지 확인
                          if (isNaN(calculatedPositions[i].x) || isNaN(calculatedPositions[i].y) || isNaN(calculatedPositions[i].z)) {
                            allValid = false;
                            break;
                          }
                        }
                        positions = allValid ? calculatedPositions : defaultPositions;
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('[SwathPreviewManager] hierarchy 계산 오류:', error);
              positions = defaultPositions;
            }
            
            // 항상 유효한 배열 반환 보장
            if (!positions || !Array.isArray(positions) || positions.length < 4) {
              positions = defaultPositions;
            }
            
            // PolygonHierarchy 객체로 반환 (더 안전함)
            return new Cesium.PolygonHierarchy(positions);
          }, false),
          outline: true,
          outlineColor: Cesium.Color.YELLOW.withAlpha(0.8),
          outlineWidth: 3,
          material: Cesium.Color.TRANSPARENT,
          fill: false,
          classificationType: Cesium.ClassificationType.TERRAIN,
          height: 0,
          extrudedHeight: 0,
        },
      });
    }

    // 빔 방향 선 업데이트 (위성 위치에서 swath 모서리로)
    this.updateBeamDirectionLines();

    this.lastPreviewUpdateTime = Date.now();
  }

  /**
   * Swath 미리보기 제거
   */
  clearSwathPreview(): void {
    // SwathManager의 swath 제거 (기존 방식)
    if (this.previewSwathId) {
      this.swathManager.removeSwath(this.previewSwathId);
      this.previewSwathId = null;
    }
    
    // 직접 관리하는 preview entity 제거
    if (this.previewSwathEntity) {
      this.viewer.entities.remove(this.previewSwathEntity);
      this.previewSwathEntity = null;
    }
    
    // 빔 방향 선 제거
    this.clearBeamDirectionLines();
  }

  /**
   * 빔 방향 선 업데이트 (위성 위치에서 swath 모서리로)
   * CallbackProperty를 사용하여 부드럽게 업데이트
   */
  private updateBeamDirectionLines(): void {
    // 기존 선이 없으면 새로 생성
    if (this.beamDirectionLines.length === 0) {
      // 각 모서리에 대해 위성 위치에서 모서리로 선 그리기
      // CallbackProperty를 사용하여 실시간으로 업데이트
      const cornerKeys: Array<keyof SwathCorners> = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
      
      cornerKeys.forEach((cornerKey, index) => {
        const lineEntity = this.viewer.entities.add({
          name: `BeamDirectionLine_${index}`,
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const currentCartesian = this.entityManager.getCurrentCartesian();
              if (!currentCartesian) {
                return [];
              }

              // 현재 geometry로 모서리 재계산
              const currentPosition = this.headingCalculator.getSatellitePosition(currentCartesian, this.currentHeadingOffset);
              if (!currentPosition) {
                return [];
              }

              // 현재 파라미터로 geometry 재생성
              const currentParams = this.previewSwathParams || {};
              const currentGeometry: SARSwathGeometry = {
                centerLat: currentPosition.latitude,
                centerLon: currentPosition.longitude,
                heading: currentPosition.heading,
                nearRange: currentParams.nearRange || 200000,
                farRange: currentParams.farRange || 800000,
                swathWidth: currentParams.swathWidth || 400000,
                azimuthLength: currentParams.azimuthLength || 50000,
                satelliteAltitude: currentPosition.altitude,
              };

              const currentCorners = SARSwathCalculator.calculateSwathCorners(currentGeometry);
              const corner = currentCorners[cornerKey];
              const cornerPosition = Cesium.Cartesian3.fromDegrees(corner[0], corner[1], 0);

              return [currentCartesian, cornerPosition];
            }, false),
            width: 0.5,
            material: Cesium.Color.YELLOW.withAlpha(0.8),
            clampToGround: false,
            arcType: Cesium.ArcType.GEODESIC,
          },
        });

        this.beamDirectionLines.push(lineEntity);
      });
    }
  }

  /**
   * 빔 방향 선 제거
   */
  private clearBeamDirectionLines(): void {
    this.beamDirectionLines.forEach(lineEntity => {
      this.viewer.entities.remove(lineEntity);
    });
    this.beamDirectionLines = [];
  }

  /**
   * 미리보기 파라미터 반환
   */
  getPreviewParams(): { params: any; options?: any } | null {
    if (!this.previewSwathParams) {
      return null;
    }
    return {
      params: this.previewSwathParams,
      options: this.previewSwathOptions
    };
  }

  /**
   * 마지막 업데이트 시간 반환
   */
  getLastUpdateTime(): number {
    return this.lastPreviewUpdateTime;
  }

  /**
   * 미리보기 Swath ID 반환
   */
  getPreviewSwathId(): string | null {
    return this.previewSwathId;
  }
}
