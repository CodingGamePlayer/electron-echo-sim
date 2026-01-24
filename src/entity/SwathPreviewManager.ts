import { SwathManager } from '../managers/SwathManager.js';
import { SARSwathGeometry, SwathMode } from '../types/sar-swath.types.js';
import { HeadingCalculator } from './HeadingCalculator.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';

/**
 * Swath 미리보기 관리
 */
export class SwathPreviewManager {
  private swathManager: SwathManager;
  private headingCalculator: HeadingCalculator;
  private entityManager: SatelliteEntityManager;
  private previewSwathId: string | null;
  private previewSwathParams: {
    nearRange?: number;
    farRange?: number;
    swathWidth?: number;
    azimuthLength?: number;
  } | null;
  private previewSwathOptions: Partial<any> | undefined;
  private lastPreviewUpdateTime: number;

  constructor(
    swathManager: SwathManager,
    headingCalculator: HeadingCalculator,
    entityManager: SatelliteEntityManager
  ) {
    this.swathManager = swathManager;
    this.headingCalculator = headingCalculator;
    this.entityManager = entityManager;
    this.previewSwathId = null;
    this.previewSwathParams = null;
    this.previewSwathOptions = undefined;
    this.lastPreviewUpdateTime = 0;
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

    this.clearSwathPreview();

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

    const geometry: SARSwathGeometry = {
      centerLat: currentPosition.latitude,
      centerLon: currentPosition.longitude,
      heading: currentPosition.heading,
      nearRange,
      farRange,
      swathWidth,
      azimuthLength,
      satelliteAltitude: currentPosition.altitude,
    };

    const previewOptions = {
      color: options?.color || 'YELLOW',
      alpha: options?.alpha || 0.3,
      outlineColor: 'YELLOW',
      outlineWidth: 3,
      showLabel: false,
      mode: SwathMode.STATIC,
    };

    this.previewSwathId = this.swathManager.addStaticSwath(geometry, previewOptions);
    
    if (this.previewSwathId) {
      const allSwaths = this.swathManager.getAllSwaths();
      const swathInstance = allSwaths.find(s => s.id === this.previewSwathId);
      if (swathInstance && swathInstance.entity) {
        swathInstance.entity.polygon.outline = true;
        swathInstance.entity.polygon.outlineColor = Cesium.Color.YELLOW.withAlpha(0.8);
        swathInstance.entity.polygon.outlineWidth = 3;
        swathInstance.entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.2);
      }
    }

    this.lastPreviewUpdateTime = Date.now();
  }

  /**
   * Swath 미리보기 제거
   */
  clearSwathPreview(): void {
    if (this.previewSwathId) {
      this.swathManager.removeSwath(this.previewSwathId);
      this.previewSwathId = null;
    }
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
