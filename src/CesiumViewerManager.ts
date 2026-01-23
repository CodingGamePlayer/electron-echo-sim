/**
 * CesiumViewerManager - Cesium 뷰어 초기화 및 설정
 */
export class CesiumViewerManager {
  private containerId: string;
  private viewer: any;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.viewer = null;
  }

  /**
   * 뷰어 초기화
   */
  async initialize(): Promise<any> {
    this.viewer = new Cesium.Viewer(this.containerId, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      animation: false, // 시간 속도 컨트롤러 숨기기
      timeline: false,  // 타임라인 컨트롤러 숨기기
      vrButton: false, // VR 버튼 숨기기
      geocoder: false, // 지오코더 숨기기
      homeButton: false, // 홈 버튼 숨기기
      infoBox: false,   // 정보 박스 숨기기
      sceneModePicker: false, // 씬 모드 선택기 숨기기
      selectionIndicator: false, // 선택 표시기 숨기기
      baseLayerPicker: false, // 기본 레이어 선택기 숨기기
      navigationHelpButton: false, // 네비게이션 도움말 버튼 숨기기
      fullscreenButton: false, // 전체화면 버튼 숨기기
    });

    // 클럭 설정
    this.viewer.clock.shouldAnimate = true;
    this.viewer.clock.multiplier = 1.0;
    this.viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
    
    // 깊이 테스트 비활성화
    this.viewer.scene.globe.depthTestAgainstTerrain = false;

    return this.viewer;
  }

  /**
   * 이미지 레이어 설정
   */
  async setupImagery(): Promise<void> {
    if (!this.viewer) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }

    // 기본 이미지 레이어 제거
    this.viewer.imageryLayers.removeAll();

    // Google Maps 위성 이미지 추가
    const satelliteLayer = await Cesium.ImageryLayer.fromProviderAsync(
      Cesium.IonImageryProvider.fromAssetId(3830182)
    );
    this.viewer.imageryLayers.add(satelliteLayer);
  }

  /**
   * 건물 레이어 추가
   */
  async addBuildings(): Promise<void> {
    if (!this.viewer) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }

    const buildingTileset = await Cesium.createOsmBuildingsAsync();
    this.viewer.scene.primitives.add(buildingTileset);
  }

  /**
   * 카메라 설정
   */
  setupCamera(destination: any, orientation: { heading: number; pitch: number }, duration: number = 2.0): void {
    if (!this.viewer) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }

    this.viewer.camera.flyTo({
      destination: destination,
      orientation: orientation,
      duration: duration
    });
  }

  /**
   * 뷰어 인스턴스 반환
   */
  getViewer(): any {
    return this.viewer;
  }
}
