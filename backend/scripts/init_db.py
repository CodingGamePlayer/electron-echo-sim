"""
데이터베이스 초기화 스크립트

데이터베이스 테이블을 생성하고 초기 데이터를 삽입합니다.
"""

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from api.database import init_db, engine
from api.models.config import SarConfigModel
from api.database import SessionLocal
from datetime import datetime


def init_database():
    """데이터베이스 초기화"""
    print("데이터베이스 초기화 중...")
    init_db()
    print("데이터베이스 초기화 완료!")


def insert_sample_data():
    """샘플 데이터 삽입 (선택적)"""
    db = SessionLocal()
    try:
        # 기존 데이터 확인
        existing = db.query(SarConfigModel).count()
        if existing > 0:
            print(f"이미 {existing}개의 Config가 존재합니다. 샘플 데이터를 건너뜁니다.")
            return
        
        # 샘플 Config 생성
        sample_config = SarConfigModel(
            id=str(datetime.utcnow().timestamp()),  # 간단한 ID 생성
            name="기본 설정",
            description="기본 SAR 시스템 설정 (샘플)",
            fc=5.4e9,
            bw=150e6,
            fs=250e6,
            taup=10e-6,
            prf=5000,
            swst=10e-6,
            swl=50e-6,
            orbit_height=517e3,
            antenna_width=4.0,
            antenna_height=0.5,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(sample_config)
        db.commit()
        print("샘플 데이터 삽입 완료!")
    except Exception as e:
        print(f"샘플 데이터 삽입 실패: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="데이터베이스 초기화 스크립트")
    parser.add_argument(
        "--with-sample-data",
        action="store_true",
        help="샘플 데이터도 함께 삽입"
    )
    
    args = parser.parse_args()
    
    init_database()
    
    if args.with_sample_data:
        insert_sample_data()
