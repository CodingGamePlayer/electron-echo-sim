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

    // 기본 이미지 레이어 제거
    this.viewer.imageryLayers.removeAll();

    // Google Maps 위성 이미지 추가
    const satelliteLayer = await Cesium.ImageryLayer.fromProviderAsync(
      Cesium.IonImageryProvider.fromAssetId(3830182)
    );
    this.viewer.imageryLayers.add(satelliteLayer);
  }
}
