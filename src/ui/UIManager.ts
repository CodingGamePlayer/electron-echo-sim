import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { EntityManager } from '../entity/EntityManager.js';
import { TLEUIManager } from './TLEUIManager.js';
import { SwathControlUIManager } from './SwathControlUIManager.js';
import { SwathGroupsUIManager } from './SwathGroupsUIManager.js';
import { SarConfigUIManager } from './SarConfigUIManager.js';

/**
 * UIManager - UI 이벤트 처리 통합 관리
 */
export class UIManager {
  private satelliteManager: SatelliteManager;
  private entityManager: EntityManager;
  private tleUIManager: TLEUIManager;
  private swathControlUIManager: SwathControlUIManager;
  private swathGroupsUIManager: SwathGroupsUIManager;
  private sarConfigUIManager: SarConfigUIManager;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    
    this.tleUIManager = new TLEUIManager(satelliteManager, entityManager);
    this.swathControlUIManager = new SwathControlUIManager(entityManager);
    this.swathGroupsUIManager = new SwathGroupsUIManager(entityManager);
    this.sarConfigUIManager = new SarConfigUIManager();
  }

  /**
   * UI 초기화
   */
  initialize(defaultTLE: string): void {
    this.tleUIManager.initialize(defaultTLE);
    this.swathControlUIManager.initialize(() => {
      this.swathGroupsUIManager.updateSwathGroupsList();
      const selectedGroupId = this.swathGroupsUIManager.getSelectedGroupId();
      this.entityManager.showSwathsByGroupId(selectedGroupId);
    });
    this.swathGroupsUIManager.initialize();
    this.sarConfigUIManager.initialize();
  }
}
