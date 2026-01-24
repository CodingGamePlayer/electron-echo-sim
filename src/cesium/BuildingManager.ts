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

    const buildingTileset = await Cesium.createOsmBuildingsAsync();
    this.viewer.scene.primitives.add(buildingTileset);
  }
}
