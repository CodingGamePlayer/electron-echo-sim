import { CesiumViewerManager } from '../poc/cesium/CesiumViewerManager.js';
import { ControlPanelManager } from './ControlPanel/index.js';

/**
 * PrototypePage - Prototype 전용 페이지 클래스
 */
export class PrototypePage {
  private viewerManager: CesiumViewerManager | null;
  private viewer: any;
  private controlPanelManager: ControlPanelManager | null;

  constructor() {
    this.viewerManager = null;
    this.viewer = null;
    this.controlPanelManager = null;
  }

  /**
   * Prototype 페이지 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 기존 Cesium 뷰어 정리
      this.cleanupCesiumViewer();

      // 1. Cesium 뷰어 초기화
      this.viewerManager = new CesiumViewerManager('cesiumContainer');
      this.viewer = await this.viewerManager.initialize();

      // 2. 이미지 레이어 설정
      await this.viewerManager.setupImagery();

      // 3. 건물 레이어 추가
      await this.viewerManager.addBuildings();

      // 4. 카메라 설정
      this.viewerManager.setupCamera(
        Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
        {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-90.0),
        },
        2.0
      );

      // 5. 제어 패널 초기화
      this.controlPanelManager = new ControlPanelManager();
      this.controlPanelManager.initialize(this.viewer);
      
    } catch (error) {
      console.error('[PrototypePage] 초기화 오류:', error);
    }
  }

  /**
   * 기존 Cesium 뷰어 정리
   */
  private cleanupCesiumViewer(): void {
    const container = document.getElementById('cesiumContainer');
    if (container) {
      // 기존 뷰어가 있으면 제거
      const existingViewer = (window as any).cesiumViewer;
      if (existingViewer && existingViewer.destroy) {
        existingViewer.destroy();
      }
      // 컨테이너 내용 비우기
      container.innerHTML = '';
    }
  }

  /**
   * Prototype 페이지 정리
   */
  cleanup(): void {
    // 제어 패널 정리
    if (this.controlPanelManager) {
      this.controlPanelManager.cleanup();
      this.controlPanelManager = null;
    }

    // Cesium 뷰어 정리
    if (this.viewer) {
      try {
        this.viewer.destroy();
      } catch (error) {
        console.warn('[PrototypePage] 뷰어 정리 중 오류:', error);
      }
      this.viewer = null;
    }
    this.viewerManager = null;
    console.log('[PrototypePage] Prototype 페이지 정리 완료');
  }
}