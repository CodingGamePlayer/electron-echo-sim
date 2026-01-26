import { ViewerInitializer } from './ViewerInitializer.js';
import { ImageryManager } from './ImageryManager.js';
import { BuildingManager } from './BuildingManager.js';
import { CameraManager } from './CameraManager.js';

/**
 * CesiumViewerManager - Cesium 뷰어 통합 관리
 */
export class CesiumViewerManager {
  private containerId: string;
  private viewer: any;
  private viewerInitializer: ViewerInitializer;
  private imageryManager: ImageryManager | null;
  private buildingManager: BuildingManager | null;
  private cameraManager: CameraManager | null;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.viewer = null;
    this.viewerInitializer = new ViewerInitializer();
    this.imageryManager = null;
    this.buildingManager = null;
    this.cameraManager = null;
  }

  /**
   * 뷰어 초기화
   */
  async initialize(): Promise<any> {
    this.viewer = await this.viewerInitializer.initialize(this.containerId);
    this.imageryManager = new ImageryManager(this.viewer);
    this.buildingManager = new BuildingManager(this.viewer);
    this.cameraManager = new CameraManager(this.viewer);
    return this.viewer;
  }

  /**
   * 이미지 레이어 설정
   */
  async setupImagery(): Promise<void> {
    if (!this.imageryManager) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }
    await this.imageryManager.setupImagery();
  }

  /**
   * 건물 레이어 추가
   */
  async addBuildings(): Promise<void> {
    if (!this.buildingManager) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }
    await this.buildingManager.addBuildings();
  }

  /**
   * 카메라 설정
   */
  setupCamera(destination: any, orientation: { heading: number; pitch: number }, duration: number = 2.0): void {
    if (!this.cameraManager) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }
    this.cameraManager.setupCamera(destination, orientation, duration);
  }

  /**
   * 위성 엔티티에 카메라 고정
   */
  trackEntity(entity: any): void {
    if (!this.cameraManager) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }
    this.cameraManager.trackEntity(entity);
  }

  /**
   * 카메라 추적 해제
   */
  untrackEntity(): void {
    if (!this.cameraManager) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }
    this.cameraManager.untrackEntity();
  }

  /**
   * 위성 추적 상태 반환
   */
  isTracking(): boolean {
    if (!this.cameraManager) {
      return false;
    }
    return this.cameraManager.isTracking();
  }

  /**
   * 뷰어 인스턴스 반환
   */
  getViewer(): any {
    return this.viewer;
  }
}
