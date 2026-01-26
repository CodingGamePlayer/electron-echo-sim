"""
데이터베이스 마이그레이션 스크립트

el_angle, az_angle 필드를 추가합니다.
"""

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from api.database import SessionLocal, engine
from sqlalchemy import text
from api.models.config import SarConfigModel


def migrate_add_beam_angles():
    """el_angle, az_angle 필드 추가 마이그레이션"""
    db = SessionLocal()
    try:
        # 기존 테이블에 필드가 있는지 확인
        result = db.execute(text("PRAGMA table_info(sar_configs)"))
        columns = [row[1] for row in result]
        
        print("현재 테이블 컬럼:", columns)
        
        # el_angle 필드 추가 (없는 경우만)
        if 'el_angle' not in columns:
            print("el_angle 필드 추가 중...")
            db.execute(text("ALTER TABLE sar_configs ADD COLUMN el_angle REAL DEFAULT 0.0"))
            db.commit()
            print("el_angle 필드 추가 완료")
        else:
            print("el_angle 필드가 이미 존재합니다.")
        
        # az_angle 필드 추가 (없는 경우만)
        if 'az_angle' not in columns:
            print("az_angle 필드 추가 중...")
            db.execute(text("ALTER TABLE sar_configs ADD COLUMN az_angle REAL DEFAULT 0.0"))
            db.commit()
            print("az_angle 필드 추가 완료")
        else:
            print("az_angle 필드가 이미 존재합니다.")
        
        # 업데이트된 테이블 구조 확인
        result = db.execute(text("PRAGMA table_info(sar_configs)"))
        columns = [row[1] for row in result]
        print("\n업데이트된 테이블 컬럼:", columns)
        
        # 기존 데이터 확인
        count = db.query(SarConfigModel).count()
        print(f"\n기존 데이터 개수: {count}개")
        
        if count > 0:
            # el_angle, az_angle이 NULL인 경우 기본값으로 업데이트
            db.execute(text("UPDATE sar_configs SET el_angle = 0.0 WHERE el_angle IS NULL"))
            db.execute(text("UPDATE sar_configs SET az_angle = 0.0 WHERE az_angle IS NULL"))
            db.commit()
            print("기존 데이터의 el_angle, az_angle을 기본값(0.0)으로 업데이트 완료")
        
        print("\n마이그레이션 완료!")
        
    except Exception as e:
        print(f"마이그레이션 실패: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    migrate_add_beam_angles()
