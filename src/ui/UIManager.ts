import { SatelliteManager } from '../satellite/SatelliteManager.js';
import { EntityManager } from '../entity/EntityManager.js';
import { CesiumViewerManager } from '../cesium/CesiumViewerManager.js';
import { SatelliteUIManager } from './SatelliteUIManager.js';
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
  private viewerManager: CesiumViewerManager | null;
  private satelliteUIManager: SatelliteUIManager;
  private swathControlUIManager: SwathControlUIManager;
  private swathGroupsUIManager: SwathGroupsUIManager;
  private sarConfigUIManager: SarConfigUIManager;
  private signalVisualizationPanel: SignalVisualizationPanel;
  private satelliteOrientationUIManager: SatelliteOrientationUIManager;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager, viewer?: any, viewerManager?: CesiumViewerManager) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.viewer = viewer;
    this.viewerManager = viewerManager || null;
    
    this.satelliteUIManager = new SatelliteUIManager(satelliteManager, entityManager);
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
    this.satelliteUIManager.initialize(defaultTLE);
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
    
    // 카메라 추적 버튼 초기화
    this.initializeCameraTrackingButton();
  }

  /**
   * 카메라 추적 버튼 초기화
   */
  private initializeCameraTrackingButton(): void {
    const button = document.getElementById('cameraTrackButton');
    if (!button) {
      return;
    }

    button.addEventListener('click', () => {
      if (!this.viewerManager) {
        console.warn('[UIManager] ViewerManager가 없어 카메라 추적을 사용할 수 없습니다.');
        return;
      }

      const isTracking = this.viewerManager.isTracking();
      const satelliteEntity = this.entityManager.getEntity();

      if (!satelliteEntity) {
        console.warn('[UIManager] 위성 엔티티가 없어 카메라 추적을 사용할 수 없습니다.');
        return;
      }

      if (isTracking) {
        // 추적 해제
        this.viewerManager.untrackEntity();
        button.textContent = '카메라 고정';
        button.classList.remove('active');
      } else {
        // 추적 시작
        this.viewerManager.trackEntity(satelliteEntity);
        button.textContent = '추적 중';
        button.classList.add('active');
      }
    });
  }

  /**
   * SarConfigUIManager 가져오기
   */
  getSarConfigUIManager(): SarConfigUIManager {
    return this.sarConfigUIManager;
  }
}
