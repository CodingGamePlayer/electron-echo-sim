/**
 * 카메라 관리
 */
export class CameraManager {
  private viewer: any;

  constructor(viewer: any) {
    this.viewer = viewer;
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
}
