import { CesiumViewerManager } from './poc/cesium/CesiumViewerManager.js';
import { SatelliteManager } from './poc/satellite/SatelliteManager.js';
import { EntityManager } from './poc/entity/EntityManager.js';
import { UIManager } from './poc/ui/UIManager.js';
import { Layout } from './Layout.js';

/**
 * App - 메인 애플리케이션 클래스
 */
export class App {
  private viewerManager: CesiumViewerManager | null;
  private satelliteManager: SatelliteManager | null;
  private entityManager: EntityManager | null;
  private uiManager: UIManager | null;
  private layout: Layout | null;
  private defaultTLE: string;

  constructor() {
    this.viewerManager = null;
    this.satelliteManager = null;
    this.entityManager = null;
    this.uiManager = null;
    this.layout = null;
    this.defaultTLE = `ISS (ZARYA)
1 25544U 98067A   26012.17690827  .00009276  00000-0  17471-3 0  9998
2 25544  51.6333 351.7881 0007723   8.9804 351.1321 15.49250518547578`;
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 1. Cesium 뷰어 초기화
      this.viewerManager = new CesiumViewerManager('cesiumContainer');
      const viewer = await this.viewerManager.initialize();

      // 2. 이미지 레이어 설정
      await this.viewerManager.setupImagery();

      // 3. 건물 레이어 추가
      await this.viewerManager.addBuildings();

      // 4. 위성 매니저 초기화
      this.satelliteManager = new SatelliteManager(this.defaultTLE);

      // 5. 엔티티 매니저 초기화 및 엔티티 생성
      this.entityManager = new EntityManager(viewer, this.satelliteManager);
      
      // 초기 위치 계산
      const startTime = Cesium.JulianDate.now();
      let initialPosition = this.satelliteManager.calculatePosition(startTime);
      
      if (!initialPosition) {
        // 폴백: 기본 위치
        initialPosition = {
          longitude: 0,
          latitude: 0,
          altitude: 400000
        };
      }

      this.entityManager.createSatelliteEntity('ISS (International Space Station)', initialPosition);
      this.entityManager.startUpdateLoop();

      // 8. 예상 경로 그리기 (4시간)
      setTimeout(() => {
        this.entityManager?.drawPredictedPath(4);
      }, 1000); // 초기화 후 1초 뒤에 경로 그리기

      // 6. 레이아웃 초기화 (메뉴 사이드바)
      this.layout = new Layout();
      this.layout.initialize();

      // 7. UI 매니저 초기화
      this.uiManager = new UIManager(this.satelliteManager, this.entityManager, viewer, this.viewerManager);
      this.uiManager.initialize(this.defaultTLE);

      // 8. 카메라 설정
      this.viewerManager.setupCamera(
        Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
        {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-90.0),
        },
        2.0
      );

    } catch (error) {
      console.error('Cesium 초기화 오류:', error);
    }
  }
}
