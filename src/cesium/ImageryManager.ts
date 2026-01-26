/**
 * 이미지 레이어 관리
 */
export class ImageryManager {
  private viewer: any;

  constructor(viewer: any) {
    this.viewer = viewer;
  }

  /**
   * 이미지 레이어 설정
   */
  async setupImagery(): Promise<void> {
    if (!this.viewer) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }

    // Ion access token 확인 - 없으면 Ion API 호출하지 않음
    const ionToken = Cesium.Ion.defaultAccessToken;
    if (!ionToken || ionToken.trim() === '') {
      console.log('ℹ Ion access token이 없습니다. 오프라인 모드로 기본 레이어 유지');
      console.log('최종 이미지 레이어 개수:', this.viewer.imageryLayers.length);
      return; // Ion 토큰이 없으면 네트워크 요청 없이 기본 레이어 유지
    }

    try {
      // 새 레이어를 먼저 추가한 후, 성공하면 기존 레이어 제거
      let newLayerAdded = false;

      // Google Maps 위성 이미지 추가 시도 (Ion 토큰이 있을 때만)
      try {
        const satelliteLayer = await Cesium.ImageryLayer.fromProviderAsync(
          Cesium.IonImageryProvider.fromAssetId(3830182)
        );
        // 새 레이어를 기존 레이어 위에 추가
        this.viewer.imageryLayers.add(satelliteLayer);
        newLayerAdded = true;
        console.log('✓ Ion 위성 이미지 레이어 로드 성공');
        
        // 성공적으로 추가된 후에만 기존 레이어 제거 (첫 번째 레이어는 기본 색상 레이어)
        if (this.viewer.imageryLayers.length > 1) {
          this.viewer.imageryLayers.remove(this.viewer.imageryLayers.get(0));
        }
      } catch (ionError) {
        console.warn('⚠ Ion 이미지 레이어 로드 실패, OpenStreetMap 시도:', ionError);
        // Ion 실패 시 기본 OpenStreetMap 레이어 사용 (네트워크 필요하지만 공개 서비스)
        try {
          const osmLayer = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/'
          });
          this.viewer.imageryLayers.addImageryProvider(osmLayer);
          newLayerAdded = true;
          console.log('✓ OpenStreetMap 레이어 로드 성공');
          
          // 성공적으로 추가된 후에만 기존 레이어 제거
          if (this.viewer.imageryLayers.length > 1) {
            this.viewer.imageryLayers.remove(this.viewer.imageryLayers.get(0));
          }
        } catch (osmError) {
          console.warn('⚠ OpenStreetMap 레이어도 실패, 기본 레이어 유지:', osmError);
          // 모든 레이어 실패 시 기본 레이어 유지 (제거하지 않음)
          // (ViewerInitializer에서 이미 추가된 기본 레이어가 유지됨)
        }
      }
      
      // 최종 확인: 레이어가 없으면 기본 색상 레이어 생성 및 추가
      if (this.viewer.imageryLayers.length === 0) {
        console.warn('⚠ 이미지 레이어가 없습니다. 기본 색상 레이어를 생성합니다.');
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 256, 256);
          gradient.addColorStop(0, '#1e3a8a');
          gradient.addColorStop(0.5, '#3b82f6');
          gradient.addColorStop(1, '#60a5fa');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 256, 256);
          
          const colorImageryProvider = new Cesium.SingleTileImageryProvider({
            url: canvas.toDataURL('image/png'),
            rectangle: Cesium.Rectangle.MAX_VALUE
          });
          
          this.viewer.imageryLayers.addImageryProvider(colorImageryProvider);
          console.log('✓ 기본 색상 레이어 재생성 완료');
        }
      }
      
      console.log('최종 이미지 레이어 개수:', this.viewer.imageryLayers.length);
    } catch (error) {
      console.error('✗ 이미지 레이어 설정 실패:', error);
      // 에러가 발생해도 기본 색상 레이어는 유지됨
      
      // 에러 발생 시에도 레이어가 있는지 확인
      if (this.viewer.imageryLayers.length === 0) {
        console.warn('⚠ 에러 후 이미지 레이어가 없습니다. 기본 색상 레이어를 생성합니다.');
        // 기본 색상 레이어 생성 코드 (위와 동일)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 256, 256);
          gradient.addColorStop(0, '#1e3a8a');
          gradient.addColorStop(0.5, '#3b82f6');
          gradient.addColorStop(1, '#60a5fa');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 256, 256);
          
          const colorImageryProvider = new Cesium.SingleTileImageryProvider({
            url: canvas.toDataURL('image/png'),
            rectangle: Cesium.Rectangle.MAX_VALUE
          });
          
          this.viewer.imageryLayers.addImageryProvider(colorImageryProvider);
        }
      }
    }
  }
}
