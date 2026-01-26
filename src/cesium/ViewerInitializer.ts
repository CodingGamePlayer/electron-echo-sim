/**
 * Cesium 뷰어 초기화
 */
export class ViewerInitializer {
  /**
   * 뷰어 초기화
   */
  async initialize(containerId: string): Promise<any> {
    // Cesium 공식 오프라인 가이드에 따라 Natural Earth II 이미지 사용
    // Cesium에 포함된 저해상도 전세계 이미지를 사용하여 네트워크 없이도 작동
    let baseLayer;
    try {
      baseLayer = await Cesium.ImageryLayer.fromProviderAsync(
        Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
        )
      );
      console.log('✓ Natural Earth II 이미지 레이어 로드 성공');
    } catch (error) {
      console.warn('⚠ Natural Earth II 이미지 로드 실패, 기본 색상 레이어 사용:', error);
      // 폴백: 기본 색상 이미지 제공자 생성
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context를 생성할 수 없습니다.');
      }
      
      const gradient = ctx.createLinearGradient(0, 0, 256, 256);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(0.5, '#3b82f6');
      gradient.addColorStop(1, '#60a5fa');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      
      baseLayer = new Cesium.ImageryLayer(
        new Cesium.SingleTileImageryProvider({
          url: canvas.toDataURL('image/png'),
          rectangle: Cesium.Rectangle.MAX_VALUE
        })
      );
      console.log('✓ 기본 색상 이미지 레이어 생성 완료');
    }
    
    // Viewer 생성 시 기본 이미지 레이어를 명시적으로 설정하여 Ion 호출 방지
    const viewer = new Cesium.Viewer(containerId, {
      baseLayer: baseLayer, // Cesium 공식 오프라인 가이드 방식 사용
      terrainProvider: new Cesium.EllipsoidTerrainProvider(), // 단순 타원체 지형
      animation: false,
      timeline: false,
      vrButton: false,
      geocoder: false, // 주소 검색 비활성화 (온라인 API 사용)
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      baseLayerPicker: false, // 베이스 레이어 선택기 비활성화
      navigationHelpButton: false,
      fullscreenButton: false,
    });
    
    console.log('✓ 오프라인 모드로 Viewer 생성 완료');
    console.log('현재 이미지 레이어 개수:', viewer.imageryLayers.length);

    // 지구본 기본 설정
    viewer.scene.globe.show = true;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.globe.showWaterEffect = false;
    
    console.log('최종 이미지 레이어 개수:', viewer.imageryLayers.length);
    console.log('지구본 표시 상태:', viewer.scene.globe.show);
    
    // Attribution/Credit 컨테이너 숨기기
    if (viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
      viewer.cesiumWidget.creditContainer.style.display = 'none';
    }

    // 클럭 설정
    viewer.clock.shouldAnimate = true;
    viewer.clock.multiplier = 1.0;
    viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
    
    // 깊이 테스트 비활성화
    viewer.scene.globe.depthTestAgainstTerrain = false;

    return viewer;
  }
}
