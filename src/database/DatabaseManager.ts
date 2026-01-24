import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * DatabaseManager - SQLite 데이터베이스 연결 관리
 */
export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Electron의 사용자 데이터 디렉토리 사용
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'swath_data.db');
  }

  /**
   * 데이터베이스 초기화 및 연결
   */
  initialize(): void {
    try {
      // 데이터베이스 디렉토리가 없으면 생성
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 데이터베이스 연결
      this.db = new Database(this.dbPath);
      
      // 성능 최적화 설정
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging
      this.db.pragma('synchronous = NORMAL'); // 성능과 안정성의 균형
      this.db.pragma('foreign_keys = ON'); // 외래 키 제약 조건 활성화

      console.log('[DatabaseManager] 데이터베이스 초기화 완료:', this.dbPath);
    } catch (error) {
      console.error('[DatabaseManager] 데이터베이스 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결 반환
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('데이터베이스가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
    }
    return this.db;
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        console.log('[DatabaseManager] 데이터베이스 연결 종료');
      } catch (error) {
        console.error('[DatabaseManager] 데이터베이스 연결 종료 실패:', error);
      }
    }
  }

  /**
   * 테이블 존재 여부 확인
   */
  tableExists(tableName: string): boolean {
    if (!this.db) {
      return false;
    }

    try {
      const result = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);
      return result !== undefined;
    } catch (error) {
      console.error(`[DatabaseManager] 테이블 존재 확인 실패 (${tableName}):`, error);
      return false;
    }
  }

  /**
   * 데이터베이스 경로 반환
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * 데이터베이스 연결 상태 확인
   */
  isConnected(): boolean {
    return this.db !== null;
  }
}
