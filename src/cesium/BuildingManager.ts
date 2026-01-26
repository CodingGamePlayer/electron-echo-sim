/**
 * 건물 레이어 관리
 */
export class BuildingManager {
  private viewer: any;

  constructor(viewer: any) {
    this.viewer = viewer;
  }

  /**
   * 건물 레이어 추가
   */
  async addBuildings(): Promise<void> {
    if (!this.viewer) {
      throw new Error('Viewer가 초기화되지 않았습니다.');
    }

    // Ion access token 확인 - 없으면 건물 레이어 추가하지 않음
    const ionToken = Cesium.Ion.defaultAccessToken;
    if (!ionToken || ionToken.trim() === '') {
      console.log('ℹ Ion access token이 없습니다. 건물 레이어 추가를 건너뜁니다.');
      return; // Ion 토큰이 없으면 건물 레이어 추가하지 않음
    }

    try {
      // 네트워크 접근이 제한된 환경에서는 건물 레이어 추가를 건너뜀
      const buildingTileset = await Cesium.createOsmBuildingsAsync();
      this.viewer.scene.primitives.add(buildingTileset);
      console.log('✓ 건물 레이어 추가 완료');
    } catch (error) {
      console.warn('⚠ 건물 레이어 추가 실패 (네트워크 접근 제한):', error);
      // 에러가 발생해도 계속 진행 (건물 레이어 없이도 작동 가능)
    }
  }
}
