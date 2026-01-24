import { SwathManager } from '../managers/SwathManager.js';
import { SwathGroupManager } from '../managers/SwathGroupManager.js';
import { HeadingCalculator } from './HeadingCalculator.js';
import { SatelliteEntityManager } from './SatelliteEntityManager.js';

/**
 * 실시간 Swath 추적 관리
 */
export class SwathTrackingManager {
  private swathManager: SwathManager;
  private swathGroupManager: SwathGroupManager;
  private headingCalculator: HeadingCalculator;
  private entityManager: SatelliteEntityManager;
  private realtimeSwathId: string | null;
  private headingOffset: number;

  constructor(
    swathManager: SwathManager,
    swathGroupManager: SwathGroupManager,
    headingCalculator: HeadingCalculator,
    entityManager: SatelliteEntityManager
  ) {
    this.swathManager = swathManager;
    this.swathGroupManager = swathGroupManager;
    this.headingCalculator = headingCalculator;
    this.entityManager = entityManager;
    this.realtimeSwathId = null;
    this.headingOffset = 0;
  }

  /**
   * Heading 오프셋 설정
   */
  setHeadingOffset(offset: number): void {
    this.headingOffset = offset;
  }

  /**
   * 실시간 Swath 추적 시작
   */
  startRealtimeSwathTracking(
    swathParams?: {
      nearRange?: number;
      farRange?: number;
      swathWidth?: number;
      azimuthLength?: number;
    },
    options?: any
  ): void {
    if (this.realtimeSwathId) {
      this.stopRealtimeSwathTracking();
    }

    const getSatellitePosition = () => {
      const currentCartesian = this.entityManager.getCurrentCartesian();
      if (!currentCartesian) return null;

      return this.headingCalculator.getSatellitePosition(currentCartesian, this.headingOffset);
    };

    const groupId = this.swathGroupManager.startRealtimeGroup();
    
    (this.swathManager as any).onSwathAdded = (groupId: string, swathId: string) => {
      this.swathGroupManager.addSwathToGroup(groupId, swathId);
    };
    
    this.realtimeSwathId = this.swathManager.addRealtimeTrackingSwath(
      getSatellitePosition,
      swathParams,
      options,
      groupId
    );
    
    if (this.realtimeSwathId) {
      this.swathGroupManager.addSwathToGroup(groupId, this.realtimeSwathId);
    }

    console.log('[SwathTrackingManager] 실시간 Swath 추적 시작:', this.realtimeSwathId, '그룹:', groupId);
  }

  /**
   * 실시간 Swath 추적 중지
   */
  stopRealtimeSwathTracking(): void {
    if (this.realtimeSwathId) {
      this.swathGroupManager.endRealtimeGroup();
      this.swathManager.removeSwath(this.realtimeSwathId);
      this.realtimeSwathId = null;
      console.log('[SwathTrackingManager] 실시간 Swath 추적 중지');
    }
  }
}
