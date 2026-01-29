import { SatelliteSettings } from './SatelliteSettings/index.js';
import { OrbitSettings } from './OrbitSettings/index.js';
import { TargetSettings } from './TargetSettings/index.js';

/**
 * ControlPanelManager - Prototype 제어 패널 관리자
 */
export class ControlPanelManager {
  private sidebar: HTMLElement | null;
  private sidebarContent: HTMLElement | null;
  private satelliteSettings: SatelliteSettings | null;
  private orbitSettings: OrbitSettings | null;
  private targetSettings: TargetSettings | null;

  constructor() {
    this.sidebar = null;
    this.sidebarContent = null;
    this.satelliteSettings = null;
    this.orbitSettings = null;
    this.targetSettings = null;
  }

  /**
   * 제어 패널 초기화
   */
  initialize(viewer?: any): void {
    this.createControlPanel(viewer);
    this.setupStyles();
  }

  /**
   * 제어 패널 생성
   */
  private createControlPanel(viewer?: any): void {
    // 기존 사이드바 확인
    this.sidebar = document.getElementById('sidebar');
    
    if (!this.sidebar) {
      console.warn('[ControlPanelManager] 사이드바를 찾을 수 없습니다.');
      return;
    }

    // 사이드바 콘텐츠
    this.sidebarContent = this.sidebar.querySelector('#sidebarContent');
    if (!this.sidebarContent) {
      console.warn('[ControlPanelManager] 사이드바 콘텐츠를 찾을 수 없습니다.');
      return;
    }

    // 기존 콘텐츠 제거
    this.sidebarContent.innerHTML = '';

    // 탭 컨테이너 생성
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab-container';

    // 탭 버튼 생성
    const tabButtons = document.createElement('div');
    tabButtons.className = 'tab-buttons';

    // 위성 설정 탭 버튼
    const satelliteTabButton = document.createElement('button');
    satelliteTabButton.className = 'tab-button active';
    satelliteTabButton.setAttribute('data-tab', 'satellite');
    satelliteTabButton.textContent = '위성 설정';
    tabButtons.appendChild(satelliteTabButton);

    // 궤도 설정 탭 버튼
    const orbitTabButton = document.createElement('button');
    orbitTabButton.className = 'tab-button';
    orbitTabButton.setAttribute('data-tab', 'orbit');
    orbitTabButton.textContent = '궤도 설정';
    tabButtons.appendChild(orbitTabButton);

    // 타겟 설정 탭 버튼
    const targetTabButton = document.createElement('button');
    targetTabButton.className = 'tab-button';
    targetTabButton.setAttribute('data-tab', 'target');
    targetTabButton.textContent = '타겟 설정';
    tabButtons.appendChild(targetTabButton);

    tabContainer.appendChild(tabButtons);

    // 위성 설정 탭 콘텐츠
    const satelliteTabContent = document.createElement('div');
    satelliteTabContent.id = 'satelliteTab';
    satelliteTabContent.className = 'tab-content active';
    tabContainer.appendChild(satelliteTabContent);

    // 궤도 설정 탭 콘텐츠
    const orbitTabContent = document.createElement('div');
    orbitTabContent.id = 'orbitTab';
    orbitTabContent.className = 'tab-content';
    tabContainer.appendChild(orbitTabContent);

    // 타겟 설정 탭 콘텐츠
    const targetTabContent = document.createElement('div');
    targetTabContent.id = 'targetTab';
    targetTabContent.className = 'tab-content';
    tabContainer.appendChild(targetTabContent);

    this.sidebarContent.appendChild(tabContainer);

    // 각 설정 클래스 초기화
    this.satelliteSettings = new SatelliteSettings();
    this.satelliteSettings.initialize(satelliteTabContent, viewer);

    this.orbitSettings = new OrbitSettings();
    this.orbitSettings.initialize(orbitTabContent);

    this.targetSettings = new TargetSettings();
    this.targetSettings.initialize(targetTabContent);

    // 탭 전환 이벤트 설정
    this.setupTabEvents();
  }

  /**
   * 탭 이벤트 설정
   */
  private setupTabEvents(): void {
    const tabButtons = this.sidebarContent?.querySelectorAll('.tab-button');
    const tabContents = this.sidebarContent?.querySelectorAll('.tab-content');

    if (!tabButtons || !tabContents) return;

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        // 모든 탭 버튼과 콘텐츠에서 active 클래스 제거
        tabButtons.forEach((btn) => btn.classList.remove('active'));
        tabContents.forEach((content) => content.classList.remove('active'));

        // 클릭한 탭 버튼과 해당 콘텐츠에 active 클래스 추가
        button.classList.add('active');
        const targetContent = this.sidebarContent?.querySelector(`#${targetTab}Tab`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  /**
   * 스타일 설정
   */
  private setupStyles(): void {
    // 필요한 경우 추가 스타일 설정
  }

  /**
   * 제어 패널 정리
   */
  cleanup(): void {
    if (this.satelliteSettings) {
      this.satelliteSettings.cleanup();
      this.satelliteSettings = null;
    }
    if (this.orbitSettings) {
      this.orbitSettings.cleanup();
      this.orbitSettings = null;
    }
    if (this.targetSettings) {
      this.targetSettings.cleanup();
      this.targetSettings = null;
    }
    if (this.sidebarContent) {
      this.sidebarContent.innerHTML = '';
    }
  }
}