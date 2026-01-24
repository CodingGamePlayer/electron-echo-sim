import Database from 'better-sqlite3';
import { DatabaseManager } from './DatabaseManager.js';
import { SarSystemConfig, SarSystemConfigRecord, SaveSarSystemConfigRequest } from '../types/sar-config.types.js';
import { randomUUID } from 'crypto';

/**
 * SAR 시스템 설정 저장/로드 서비스
 */
export class SarConfigService {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * SAR 시스템 설정 저장
   */
  saveConfig(request: SaveSarSystemConfigRequest): SarSystemConfigRecord {
    const db = this.dbManager.getDatabase();
    const now = Date.now();
    const id = randomUUID();

    const stmt = db.prepare(`
      INSERT INTO sar_system_configs (
        id, name, fc, bw, fs, taup, prf, swst, swl,
        orbit_height, antenna_width, antenna_height,
        antenna_roll_angle, antenna_pitch_angle, antenna_yaw_angle,
        Pt, G_recv, NF, Loss, Tsys, adc_bits, beam_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      request.name,
      request.config.fc,
      request.config.bw,
      request.config.fs,
      request.config.taup,
      request.config.prf,
      request.config.swst,
      request.config.swl,
      request.config.orbit_height,
      request.config.antenna_width,
      request.config.antenna_height,
      request.config.antenna_roll_angle,
      request.config.antenna_pitch_angle,
      request.config.antenna_yaw_angle,
      request.config.Pt,
      request.config.G_recv,
      request.config.NF,
      request.config.Loss,
      request.config.Tsys,
      request.config.adc_bits,
      request.config.beam_id,
      now,
      now
    );

    return this.getConfigById(id)!;
  }

  /**
   * SAR 시스템 설정 업데이트
   */
  updateConfig(id: string, request: SaveSarSystemConfigRequest): SarSystemConfigRecord | null {
    const db = this.dbManager.getDatabase();
    const now = Date.now();

    const stmt = db.prepare(`
      UPDATE sar_system_configs SET
        name = ?, fc = ?, bw = ?, fs = ?, taup = ?, prf = ?, swst = ?, swl = ?,
        orbit_height = ?, antenna_width = ?, antenna_height = ?,
        antenna_roll_angle = ?, antenna_pitch_angle = ?, antenna_yaw_angle = ?,
        Pt = ?, G_recv = ?, NF = ?, Loss = ?, Tsys = ?, adc_bits = ?, beam_id = ?,
        updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      request.name,
      request.config.fc,
      request.config.bw,
      request.config.fs,
      request.config.taup,
      request.config.prf,
      request.config.swst,
      request.config.swl,
      request.config.orbit_height,
      request.config.antenna_width,
      request.config.antenna_height,
      request.config.antenna_roll_angle,
      request.config.antenna_pitch_angle,
      request.config.antenna_yaw_angle,
      request.config.Pt,
      request.config.G_recv,
      request.config.NF,
      request.config.Loss,
      request.config.Tsys,
      request.config.adc_bits,
      request.config.beam_id,
      now,
      id
    );

    if (result.changes === 0) {
      return null;
    }

    return this.getConfigById(id);
  }

  /**
   * ID로 SAR 시스템 설정 조회
   */
  getConfigById(id: string): SarSystemConfigRecord | null {
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare('SELECT * FROM sar_system_configs WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToRecord(row);
  }

  /**
   * 모든 SAR 시스템 설정 목록 조회
   */
  getAllConfigs(): SarSystemConfigRecord[] {
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare('SELECT * FROM sar_system_configs ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToRecord(row));
  }

  /**
   * SAR 시스템 설정 삭제
   */
  deleteConfig(id: string): boolean {
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare('DELETE FROM sar_system_configs WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * 데이터베이스 행을 SarSystemConfigRecord로 변환
   */
  private mapRowToRecord(row: any): SarSystemConfigRecord {
    return {
      id: row.id,
      name: row.name,
      fc: row.fc,
      bw: row.bw,
      fs: row.fs,
      taup: row.taup,
      prf: row.prf,
      swst: row.swst,
      swl: row.swl,
      orbit_height: row.orbit_height,
      antenna_width: row.antenna_width,
      antenna_height: row.antenna_height,
      antenna_roll_angle: row.antenna_roll_angle,
      antenna_pitch_angle: row.antenna_pitch_angle,
      antenna_yaw_angle: row.antenna_yaw_angle,
      Pt: row.Pt,
      G_recv: row.G_recv,
      NF: row.NF,
      Loss: row.Loss,
      Tsys: row.Tsys,
      adc_bits: row.adc_bits,
      beam_id: row.beam_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
