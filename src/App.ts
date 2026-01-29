import { Layout } from './Layout.js';
import { PoCPage } from './poc/PoCPage.js';
import { PrototypePage } from './prototype/PrototypePage.js';

/**
 * App - 메인 애플리케이션 클래스 (앱 라우터)
 */
export class App {
  private layout: Layout | null;
  private currentPage: PoCPage | PrototypePage | null;
  private currentPageType: 'poc' | 'prototype' | null;

  constructor() {
    this.layout = null;
    this.currentPage = null;
    this.currentPageType = null;
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 1. 레이아웃 초기화 (메뉴 사이드바)
      this.layout = new Layout();
      this.layout.initialize();

      // 2. 메뉴 클릭 이벤트 등록
      this.setupMenuHandlers();

      // 3. 기본으로 Prototype 페이지 로드
      await this.loadPage('prototype');

    } catch (error) {
      console.error('[App] 초기화 오류:', error);
    }
  }

  /**
   * 메뉴 핸들러 설정
   */
  private setupMenuHandlers(): void {
    if (!this.layout) return;

    // PoC 메뉴 클릭 핸들러
    this.layout.onMenuClick('poc', () => {
      this.loadPage('poc');
    });

    // Prototype 메뉴 클릭 핸들러
    this.layout.onMenuClick('prototype', () => {
      this.loadPage('prototype');
    });
  }

  /**
   * 페이지 로드
   */
  private async loadPage(pageType: 'poc' | 'prototype'): Promise<void> {
    try {
      // 기존 페이지 정리
      if (this.currentPage) {
        this.currentPage.cleanup();
        this.currentPage = null;
      }

      // 새 페이지 생성 및 초기화
      if (pageType === 'poc') {
        this.currentPage = new PoCPage();
        this.currentPageType = 'poc';
        await this.currentPage.initialize();
        // 카메라 고정 버튼 표시
        this.showCameraTrackButton();
      } else if (pageType === 'prototype') {
        this.currentPage = new PrototypePage();
        this.currentPageType = 'prototype';
        await this.currentPage.initialize();
        // 카메라 고정 버튼 숨김
        this.hideCameraTrackButton();
      }

    } catch (error) {
      console.error(`[App] ${pageType} 페이지 로드 오류:`, error);
    }
  }


  /**
   * 현재 페이지 타입 가져오기
   */
  getCurrentPageType(): 'poc' | 'prototype' | null {
    return this.currentPageType;
  }

  /**
   * 카메라 고정 버튼 표시
   */
  private showCameraTrackButton(): void {
    const button = document.getElementById('cameraTrackButton');
    if (button) {
      button.style.display = 'block';
    }
  }

  /**
   * 카메라 고정 버튼 숨김
   */
  private hideCameraTrackButton(): void {
    const button = document.getElementById('cameraTrackButton');
    if (button) {
      button.style.display = 'none';
    }
  }
}