/**
 * Layout - 메뉴 사이드바 관리
 */
export class Layout {
  private menuSidebar: HTMLElement | null = null;
  private activeMenuItem: HTMLElement | null = null;
  private menuClickCallbacks: Map<string, () => void> = new Map();

  /**
   * 레이아웃 초기화
   */
  initialize(): void {
    this.createMenuSidebar();
    this.setupMenuEvents();
    this.setupStyles();
  }

  /**
   * 메뉴 사이드바 생성
   */
  private createMenuSidebar(): void {
    // 메뉴 사이드바가 이미 존재하면 제거
    const existingMenuSidebar = document.getElementById('menuSidebar');
    if (existingMenuSidebar) {
      existingMenuSidebar.remove();
    }

    // 메뉴 사이드바 생성
    const menuSidebar = document.createElement('div');
    menuSidebar.id = 'menuSidebar';
    menuSidebar.className = 'menu-sidebar';

    const menuItems = [
      { id: 'menu-satellite', icon: '🛰️', label: '위성', page: 'satellite' },
      { id: 'menu-sar-config', icon: '⚙️', label: 'SAR 설정', page: 'sar-config' },
      { id: 'menu-swath', icon: '📡', label: 'Swath', page: 'swath' },
    ];

    menuItems.forEach((item) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.id = item.id;
      menuItem.setAttribute('data-page', item.page);
      menuItem.innerHTML = `
        <div class="menu-icon">${item.icon}</div>
        <div class="menu-label">${item.label}</div>
      `;
      menuSidebar.appendChild(menuItem);
    });

    document.body.appendChild(menuSidebar);
    this.menuSidebar = menuSidebar;
  }

  /**
   * 메뉴 이벤트 설정
   */
  private setupMenuEvents(): void {
    if (!this.menuSidebar) return;

    const menuItems = this.menuSidebar.querySelectorAll('.menu-item');
    
    menuItems.forEach((item) => {
      item.addEventListener('click', () => {
        const pageId = item.getAttribute('data-page');
        if (pageId) {
          // 활성 메뉴 항목 설정
          this.setActiveMenuItem(item as HTMLElement);
          
          // 등록된 콜백 호출
          const callback = this.menuClickCallbacks.get(pageId);
          if (callback) {
            callback();
          } else {
            // 기본 동작: 콘솔 로그
            console.log(`[Layout] 페이지 이동: ${pageId}`);
          }
        }
      });
    });

    // 첫 번째 메뉴 항목을 기본 활성화
    if (menuItems.length > 0) {
      this.setActiveMenuItem(menuItems[0] as HTMLElement);
    }
  }

  /**
   * 활성 메뉴 항목 설정
   */
  private setActiveMenuItem(item: HTMLElement): void {
    // 기존 활성 항목 제거
    if (this.activeMenuItem) {
      this.activeMenuItem.classList.remove('active');
    }

    // 새 활성 항목 설정
    item.classList.add('active');
    this.activeMenuItem = item;
  }

  /**
   * 스타일 설정
   */
  private setupStyles(): void {
    // 스타일이 이미 추가되었는지 확인
    if (document.getElementById('menuSidebarStyles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'menuSidebarStyles';
    style.textContent = `
      /* 메뉴 사이드바 */
      .menu-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 50px;
        height: 100vh;
        background: rgba(30, 30, 30, 0.95);
        color: white;
        font-family: sans-serif;
        z-index: 1001;
        display: flex;
        flex-direction: column;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
        border-right: 1px solid #555;
        padding-top: 8px;
      }

      .menu-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 8px 4px;
        margin: 3px 4px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        position: relative;
      }

      .menu-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .menu-item.active {
        background: rgba(76, 175, 80, 0.3);
        border: 1px solid rgba(76, 175, 80, 0.5);
      }

      .menu-icon {
        font-size: 18px;
        margin-bottom: 2px;
        line-height: 1;
      }

      .menu-label {
        font-size: 9px;
        text-align: center;
        color: #ccc;
        font-weight: 500;
        line-height: 1.2;
      }

      .menu-item.active .menu-label {
        color: #4CAF50;
        font-weight: bold;
      }

      /* 기존 사이드바 위치 조정 (메뉴 사이드바가 있을 때) */
      #sidebar {
        left: 50px !important;
      }

      #sidebar.collapsed {
        left: 50px !important;
      }

      /* Swath 그룹 사이드바 위치 조정 */
      #swathGroupsSidebar {
        left: 430px !important;
      }

      #sidebar.collapsed ~ #swathGroupsSidebar:not(.collapsed) {
        left: 100px !important;
      }

      /* Signal 결과 사이드바 위치 조정 */
      #signalResultsSidebar {
        left: 730px !important;
      }

      #sidebar.collapsed ~ #swathGroupsSidebar:not(.collapsed) ~ #signalResultsSidebar:not(.collapsed) {
        left: 400px !important;
      }

      #swathGroupsSidebar.collapsed ~ #signalResultsSidebar:not(.collapsed) {
        left: 430px !important;
      }

      #sidebar.collapsed ~ #swathGroupsSidebar.collapsed ~ #signalResultsSidebar:not(.collapsed) {
        left: 100px !important;
      }

    `;

    document.head.appendChild(style);
  }

  /**
   * 메뉴 사이드바 표시/숨김 토글
   */
  toggleMenuSidebar(): void {
    if (!this.menuSidebar) return;
    this.menuSidebar.classList.toggle('hidden');
  }

  /**
   * 메뉴 사이드바 숨기기
   */
  hideMenuSidebar(): void {
    if (!this.menuSidebar) return;
    this.menuSidebar.classList.add('hidden');
  }

  /**
   * 메뉴 사이드바 표시
   */
  showMenuSidebar(): void {
    if (!this.menuSidebar) return;
    this.menuSidebar.classList.remove('hidden');
  }

  /**
   * 메뉴 클릭 콜백 등록
   */
  onMenuClick(pageId: string, callback: () => void): void {
    this.menuClickCallbacks.set(pageId, callback);
  }

  /**
   * 메뉴 클릭 콜백 제거
   */
  removeMenuClickCallback(pageId: string): void {
    this.menuClickCallbacks.delete(pageId);
  }
}