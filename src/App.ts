import { Layout } from './Layout.js';
import { PoCApp } from './poc/PoCApp.js';
import { PrototypeApp } from './prototype/PrototypeApp.js';

/**
 * App - 메인 애플리케이션 클래스 (앱 라우터)
 */
export class App {
  private layout: Layout | null;
  private currentApp: PoCApp | PrototypeApp | null;
  private currentAppType: 'poc' | 'prototype' | null;

  constructor() {
    this.layout = null;
    this.currentApp = null;
    this.currentAppType = null;
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

      // 3. 기본으로 PoC 앱 로드
      await this.loadApp('poc');

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
      this.loadApp('poc');
    });

    // Prototype 메뉴 클릭 핸들러
    this.layout.onMenuClick('prototype', () => {
      this.loadApp('prototype');
    });
  }

  /**
   * 앱 로드
   */
  private async loadApp(appType: 'poc' | 'prototype'): Promise<void> {
    try {
      // 기존 앱 정리
      if (this.currentApp) {
        this.currentApp.cleanup();
        this.currentApp = null;
      }

      // 새 앱 생성 및 초기화
      if (appType === 'poc') {
        this.currentApp = new PoCApp();
        this.currentAppType = 'poc';
        await this.currentApp.initialize();
      } else if (appType === 'prototype') {
        this.currentApp = new PrototypeApp();
        this.currentAppType = 'prototype';
        await this.currentApp.initialize();
      }

      console.log(`[App] ${appType} 앱 로드 완료`);

    } catch (error) {
      console.error(`[App] ${appType} 앱 로드 오류:`, error);
    }
  }

  /**
   * 현재 앱 타입 가져오기
   */
  getCurrentAppType(): 'poc' | 'prototype' | null {
    return this.currentAppType;
  }
}