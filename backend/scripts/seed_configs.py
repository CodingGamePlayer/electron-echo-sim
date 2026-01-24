"""
SAR Config Seed 데이터 생성 스크립트

SSP 파일에서 추출한 기본 설정값들을 데이터베이스에 삽입합니다.
"""

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from api.database import SessionLocal, init_db
from api.models.config import SarConfigModel
from datetime import datetime
import uuid


def seed_configs():
    """기본 Config 데이터 삽입"""
    db = SessionLocal()
    try:
        # 기존 데이터 확인
        existing = db.query(SarConfigModel).count()
        if existing > 0:
            print(f"이미 {existing}개의 Config가 존재합니다. Seed 데이터를 건너뜁니다.")
            return
        
        # Seed 데이터 정의
        seed_data = [
            {
                "name": "C5 기본 설정 (Stripmap)",
                "description": "C5 시스템 기본 설정 - Stripmap 모드 (7_system_def_param_ex_c5.ssp + strmp_type2_1tgt.ssp)",
                "fc": 5.41e9,
                "bw": 150e6,
                "fs": 250e6,
                "taup": 11e-6,
                "prf": 5930,
                "swst": 47.8e-6,
                "swl": 45.5e-6,
                "orbit_height": 561e3,
                "antenna_width": 3.9,
                "antenna_height": 1.9,
                "antenna_roll_angle": 0.0,
                "antenna_pitch_angle": 0.0,
                "antenna_yaw_angle": 0.0,
                "Pt": 3200,
                "G_recv": 60,
                "NF": 3.5,
                "Loss": 2.0,
                "Tsys": 270,
                "adc_bits": 12,
                "beam_id": "Beam0000"
            },
            {
                "name": "C5 Mission 20251202",
                "description": "C5 시스템 - Mission 20251202 설정",
                "fc": 5.49e9,
                "bw": 150e6,
                "fs": 187.5e6,
                "taup": 25e-6,
                "prf": 4000,
                "swst": 180e-6,
                "swl": 50e-6,
                "orbit_height": 561e3,
                "antenna_width": 3.9,
                "antenna_height": 1.9,
                "antenna_roll_angle": 0.0,
                "antenna_pitch_angle": 0.0,
                "antenna_yaw_angle": 0.0,
                "Pt": 3200,
                "G_recv": 60,
                "NF": 3.5,
                "Loss": 2.0,
                "Tsys": 270,
                "adc_bits": 12,
                "beam_id": "Beam0000"
            },
            {
                "name": "C5 Spotlight 모드",
                "description": "C5 시스템 - Spotlight 모드 (sptl_type4.ssp)",
                "fc": 9.66e9,
                "bw": 1200e6,
                "fs": 1500e6,
                "taup": 5e-6,
                "prf": 9300,
                "swst": 44.8e-6,
                "swl": 38.356409519815204e-6,
                "orbit_height": 561e3,
                "antenna_width": 3.9,
                "antenna_height": 1.9,
                "antenna_roll_angle": 0.0,
                "antenna_pitch_angle": 0.0,
                "antenna_yaw_angle": 0.0,
                "Pt": 3200,
                "G_recv": 60,
                "NF": 3.5,
                "Loss": 2.0,
                "Tsys": 270,
                "adc_bits": 12,
                "beam_id": "Beam0000"
            },
            {
                "name": "CATIS 기본 설정 (Stripmap)",
                "description": "CATIS 시스템 기본 설정 - Stripmap 모드 (7_system_def_param_ex_catis.ssp)",
                "fc": 5.4e9,
                "bw": 150e6,
                "fs": 250e6,
                "taup": 10e-6,
                "prf": 5000,
                "swst": 10e-6,
                "swl": 50e-6,
                "orbit_height": 517e3,
                "antenna_width": 3.9,
                "antenna_height": 1.9,
                "antenna_roll_angle": 0.0,
                "antenna_pitch_angle": 0.0,
                "antenna_yaw_angle": 0.0,
                "Pt": 3200,
                "G_recv": 60,
                "NF": 3.5,
                "Loss": 2.0,
                "Tsys": 270,
                "adc_bits": 12,
                "beam_id": "Beam0000"
            },
            {
                "name": "기본 테스트 설정",
                "description": "기본 SAR 시스템 테스트 설정 (문서 예제)",
                "fc": 5.4e9,
                "bw": 150e6,
                "fs": 250e6,
                "taup": 10e-6,
                "prf": 5000,
                "swst": 10e-6,
                "swl": 50e-6,
                "orbit_height": 517e3,
                "antenna_width": 4.0,
                "antenna_height": 0.5,
                "antenna_roll_angle": 0.0,
                "antenna_pitch_angle": 0.0,
                "antenna_yaw_angle": 0.0,
                "Pt": 1000,
                "G_recv": 1.0,
                "NF": 3.0,
                "Loss": 2.0,
                "Tsys": 290,
                "adc_bits": 12,
                "beam_id": "Beam0000"
            }
        ]
        
        # 데이터 삽입
        for config_data in seed_data:
            config = SarConfigModel(
                id=str(uuid.uuid4()),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **config_data
            )
            db.add(config)
        
        db.commit()
        print(f"Seed 데이터 {len(seed_data)}개 삽입 완료!")
        
        # 삽입된 데이터 출력
        configs = db.query(SarConfigModel).all()
        print("\n삽입된 Config 목록:")
        for config in configs:
            print(f"  - {config.name} (ID: {config.id})")
        
    except Exception as e:
        print(f"Seed 데이터 삽입 실패: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # 데이터베이스 초기화 확인
    init_db()
    
    # Seed 데이터 삽입
    seed_configs()
