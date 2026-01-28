import { EntityManager } from '../entity/EntityManager.js';

/**
 * Swath 그룹 사이드바 UI 관리
 */
export class SwathGroupsUIManager {
  private entityManager: EntityManager;
  private swathGroupsToggleFromTab: HTMLButtonElement | null;
  private selectedGroupId: string | null;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    this.swathGroupsToggleFromTab = null;
    this.selectedGroupId = null;
  }

  /**
   * Swath 그룹 사이드바 초기화
   */
  initialize(): void {
    this.swathGroupsToggleFromTab = document.getElementById('swathGroupsToggleFromTab') as HTMLButtonElement;
    this.setupSwathGroupsSidebar();
  }

  /**
   * Swath 그룹 사이드바 설정
   */
  private setupSwathGroupsSidebar(): void {
    const swathGroupsSidebar = document.getElementById('swathGroupsSidebar');
    const swathGroupsCloseBtn = document.getElementById('swathGroupsCloseBtn') as HTMLButtonElement;
    
    if (this.swathGroupsToggleFromTab) {
      this.swathGroupsToggleFromTab.addEventListener('click', () => {
        if (swathGroupsSidebar) {
          swathGroupsSidebar.classList.toggle('collapsed');
          this.updateSwathGroupsToggleButton();
        }
      });
    }
    
    if (swathGroupsCloseBtn) {
      swathGroupsCloseBtn.addEventListener('click', () => {
        if (swathGroupsSidebar) {
          swathGroupsSidebar.classList.add('collapsed');
          this.updateSwathGroupsToggleButton();
        }
      });
    }
    
    this.updateSwathGroupsToggleButton();
    this.updateSwathGroupsList();
    
    setInterval(() => {
      this.updateSwathGroupsList();
    }, 1000);
  }

  /**
   * Swath 그룹 사이드바 토글 버튼 상태 업데이트
   */
  private updateSwathGroupsToggleButton(): void {
    const swathGroupsSidebar = document.getElementById('swathGroupsSidebar');
    if (this.swathGroupsToggleFromTab && swathGroupsSidebar) {
      const isCollapsed = swathGroupsSidebar.classList.contains('collapsed');
      this.swathGroupsToggleFromTab.textContent = isCollapsed ? '펼치기' : '접기';
    }
  }

  /**
   * Swath 그룹 목록 업데이트
   */
  updateSwathGroupsList(): void {
    const swathGroupsList = document.getElementById('swathGroupsList');
    if (!swathGroupsList) return;

    const groupManager = this.entityManager.getSwathGroupManager();
    const groups = groupManager.getAllGroups();
    
    groupManager.syncSwathsFromManager();
    this.entityManager.showSwathsByGroupId(this.selectedGroupId);

    if (groups.length === 0) {
      swathGroupsList.innerHTML = '<div class="info" style="text-align: center; color: #888; padding: 20px;">생성된 그룹이 없습니다.</div>';
      return;
    }

    swathGroupsList.innerHTML = groups.map((group: any) => {
      const createdAt = new Date(group.createdAt).toLocaleString('ko-KR');
      const endedAt = group.endedAt ? new Date(group.endedAt).toLocaleString('ko-KR') : null;
      const isInProgress = !group.endedAt;
      const duration = isInProgress
        ? '(진행 중)'
        : `(${Math.round((group.endedAt! - group.createdAt) / 1000)}초)`;
      
      const isSelected = this.selectedGroupId === group.id;
      return `
        <div class="swath-group-item ${isInProgress ? 'in-progress' : ''} ${isSelected ? 'selected' : ''}" data-group-id="${group.id}">
          <div class="swath-group-header">
            <div>
              <div class="swath-group-name">
                ${group.name}
                ${isInProgress ? '<span class="swath-group-badge">진행 중</span>' : ''}
              </div>
              <div class="swath-group-count">${group.swathIds.length}개 Swath</div>
            </div>
            <button class="swath-group-remove" data-group-id="${group.id}">삭제</button>
          </div>
          <div class="swath-group-time">
            생성: ${createdAt} ${duration}
          </div>
        </div>
      `;
    }).join('');

    swathGroupsList.querySelectorAll('.swath-group-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('swath-group-remove')) {
          return;
        }
        
        const groupId = (item as HTMLElement).getAttribute('data-group-id');
        if (groupId) {
          if (this.selectedGroupId === groupId) {
            this.selectedGroupId = null;
          } else {
            this.selectedGroupId = groupId;
          }
          
          this.entityManager.showSwathsByGroupId(this.selectedGroupId);
          this.updateSwathGroupsList();
        }
      });
    });

    swathGroupsList.querySelectorAll('.swath-group-remove').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const groupId = (e.target as HTMLElement).getAttribute('data-group-id');
        if (groupId) {
          if (this.selectedGroupId === groupId) {
            this.selectedGroupId = null;
          }
          
          const groupManager = this.entityManager.getSwathGroupManager();
          groupManager.removeGroup(groupId);
          
          this.entityManager.showSwathsByGroupId(this.selectedGroupId);
          this.updateSwathGroupsList();
        }
      });
    });
  }

  /**
   * 선택된 그룹 ID 반환
   */
  getSelectedGroupId(): string | null {
    return this.selectedGroupId;
  }
}
