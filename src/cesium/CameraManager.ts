/**
 * 카메라 관리
 */
export class CameraManager {
  private viewer: any;
  private isTrackingSatellite: boolean;

  constructor(viewer: any) {
    this.viewer = viewer;
    this.isTrackingSatellite = false;
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
   * 위성 엔티티에 카메라 고정
   */
  trackEntity(entity: any): void {
    if (!this.viewer || !entity) {
      return;
    }
    this.viewer.trackedEntity = entity;
    this.isTrackingSatellite = true;
  }

  /**
   * 카메라 추적 해제
   */
  untrackEntity(): void {
    if (!this.viewer) {
      return;
    }
    this.viewer.trackedEntity = undefined;
    this.isTrackingSatellite = false;
  }

  /**
   * 위성 추적 상태 반환
   */
  isTracking(): boolean {
    return this.isTrackingSatellite;
  }
}
