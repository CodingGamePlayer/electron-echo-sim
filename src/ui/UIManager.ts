import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { EntityManager } from '../entity/EntityManager.js';
import { TLEUIManager } from './TLEUIManager.js';
import { SwathControlUIManager } from './SwathControlUIManager.js';
import { SwathGroupsUIManager } from './SwathGroupsUIManager.js';
import { SarConfigUIManager } from './SarConfigUIManager.js';
import { SignalVisualizationPanel } from './SignalVisualizationPanel.js';
import { SatelliteOrientationUIManager } from './SatelliteOrientationUIManager.js';

/**
 * UIManager - UI 이벤트 처리 통합 관리
 */
export class UIManager {
  private satelliteManager: SatelliteManager;
  private entityManager: EntityManager;
  private viewer: any;
  private tleUIManager: TLEUIManager;
  private swathControlUIManager: SwathControlUIManager;
  private swathGroupsUIManager: SwathGroupsUIManager;
  private sarConfigUIManager: SarConfigUIManager;
  private signalVisualizationPanel: SignalVisualizationPanel;
  private satelliteOrientationUIManager: SatelliteOrientationUIManager;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager, viewer?: any) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.viewer = viewer;
    
    this.tleUIManager = new TLEUIManager(satelliteManager, entityManager);
    this.sarConfigUIManager = new SarConfigUIManager();
    this.swathControlUIManager = new SwathControlUIManager(
      entityManager,
      this.sarConfigUIManager,
      satelliteManager,
      viewer
    );
    this.swathGroupsUIManager = new SwathGroupsUIManager(entityManager);
    
    // Signal 시각화 패널 초기화
    this.signalVisualizationPanel = new SignalVisualizationPanel();
    this.swathControlUIManager.setSignalVisualizationPanel(this.signalVisualizationPanel);
    
    // 위성 방향 제어 UI 초기화
    const satelliteEntityManager = entityManager.getSatelliteEntityManager();
    this.satelliteOrientationUIManager = new SatelliteOrientationUIManager(satelliteEntityManager);
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
    
    // SAR 설정 불러오기 시 Swath 제어 탭에 자동 적용
    this.sarConfigUIManager.initialize(
      (sarConfig) => {
        this.swathControlUIManager.applySarConfigToSwathParams(sarConfig);
      },
      this.satelliteOrientationUIManager
    );
    
    // 위성 방향 제어 UI 초기화
    this.satelliteOrientationUIManager.initialize();
  }

  /**
   * SarConfigUIManager 가져오기
   */
  getSarConfigUIManager(): SarConfigUIManager {
    return this.sarConfigUIManager;
  }
}
