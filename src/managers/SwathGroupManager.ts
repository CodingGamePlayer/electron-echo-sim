import { SwathGroup, SwathMode } from '../types/sar-swath.types.js';
import { SwathManager } from './SwathManager.js';

/**
 * SwathGroupManager - Swath 그룹 관리
 */
export class SwathGroupManager {
  private groups: Map<string, SwathGroup>;
  private swathManager: SwathManager;
  private nextGroupId: number;
  private currentRealtimeGroupId: string | null;

  constructor(swathManager: SwathManager) {
    this.groups = new Map();
    this.swathManager = swathManager;
    this.nextGroupId = 1;
    this.currentRealtimeGroupId = null;
  }

  /**
   * 새 그룹 생성
   */
  createGroup(mode: SwathMode, name?: string): string {
    const groupId = this.generateGroupId();
    const groupName = name || this.generateGroupName(mode, groupId);
    
    const group: SwathGroup = {
      id: groupId,
      name: groupName,
      mode,
      swathIds: [],
      createdAt: Date.now(),
    };

    this.groups.set(groupId, group);
    return groupId;
  }

  /**
   * 그룹에 Swath 추가
   */
  addSwathToGroup(groupId: string, swathId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) {
      console.warn(`[SwathGroupManager] 그룹 ${groupId}를 찾을 수 없습니다.`);
      return false;
    }

    if (!group.swathIds.includes(swathId)) {
      group.swathIds.push(swathId);
    }
    return true;
  }

  /**
   * SwathManager의 모든 Swath를 확인하여 그룹에 속한 Swath 업데이트
   */
  syncSwathsFromManager(): void {
    const allSwaths = this.swathManager.getAllSwaths();
    
    allSwaths.forEach(swath => {
      const groupId = (swath as any).groupId;
      if (groupId) {
        const group = this.groups.get(groupId);
        if (group && !group.swathIds.includes(swath.id)) {
          group.swathIds.push(swath.id);
        }
      }
    });
  }

  /**
   * 실시간 추적 그룹 시작
   */
  startRealtimeGroup(): string {
    if (this.currentRealtimeGroupId) {
      // 이미 실행 중인 그룹이 있으면 반환
      return this.currentRealtimeGroupId;
    }

    const groupId = this.createGroup(SwathMode.REALTIME_TRACKING, '실시간 추적');
    this.currentRealtimeGroupId = groupId;
    return groupId;
  }

  /**
   * 실시간 추적 그룹 종료
   */
  endRealtimeGroup(): void {
    if (this.currentRealtimeGroupId) {
      const group = this.groups.get(this.currentRealtimeGroupId);
      if (group) {
        group.endedAt = Date.now();
      }
      this.currentRealtimeGroupId = null;
    }
  }

  /**
   * 현재 실시간 추적 그룹 ID 반환
   */
  getCurrentRealtimeGroupId(): string | null {
    return this.currentRealtimeGroupId;
  }

  /**
   * 그룹 제거 (그룹에 속한 모든 Swath도 제거)
   */
  removeGroup(groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) {
      console.warn(`[SwathGroupManager] 그룹 ${groupId}를 찾을 수 없습니다.`);
      return false;
    }

    // 그룹에 속한 모든 Swath 제거
    group.swathIds.forEach(swathId => {
      this.swathManager.removeSwath(swathId);
    });

    // 실시간 추적 그룹이면 현재 그룹 ID 초기화
    if (this.currentRealtimeGroupId === groupId) {
      this.currentRealtimeGroupId = null;
    }

    // 그룹 제거
    this.groups.delete(groupId);
    return true;
  }

  /**
   * 모든 그룹 반환
   */
  getAllGroups(): SwathGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 그룹 ID로 그룹 가져오기
   */
  getGroup(groupId: string): SwathGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * 그룹 ID 생성
   */
  private generateGroupId(): string {
    return `group-${this.nextGroupId++}-${Date.now()}`;
  }

  /**
   * 그룹 이름 생성
   */
  private generateGroupName(mode: SwathMode, groupId: string): string {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    switch (mode) {
      case SwathMode.STATIC:
        return `정적 Swath (${timestamp})`;
      case SwathMode.REALTIME_TRACKING:
        return `실시간 추적 (${timestamp})`;
      case SwathMode.PREDICTED_PATH:
        return `예측 경로 (${timestamp})`;
      case SwathMode.HISTORICAL:
        return `과거 경로 (${timestamp})`;
      case SwathMode.BACKEND_API:
        return `Backend API (${timestamp})`;
      case SwathMode.CUSTOM_GEOMETRY:
        return `사용자 정의 (${timestamp})`;
      default:
        return `Swath 그룹 (${timestamp})`;
    }
  }
}
