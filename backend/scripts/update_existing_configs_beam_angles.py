"""
기존 Config 데이터의 el_angle, az_angle 업데이트 스크립트

SSP 파일에서 빔 정의를 파싱하여 기존 데이터를 업데이트합니다.
"""

import sys
from pathlib import Path
import yaml

# 프로젝트 루트를 Python 경로에 추가
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from api.database import SessionLocal
from api.models.config import SarConfigModel


def parse_beam_def_from_ssp(ssp_file_path: Path, beam_id: str) -> tuple[float, float]:
    """
    SSP 파일에서 빔 정의를 파싱하여 el_angle, az_angle을 추출
    
    Parameters:
    -----------
    ssp_file_path : Path
        SSP 파일 경로
    beam_id : str
        빔 ID (예: "Beam0000")
    
    Returns:
    --------
    tuple[float, float]
        (el_angle, az_angle) - 기본값 (0.0, 0.0) 반환
    """
    try:
        if not ssp_file_path.exists():
            print(f"경고: SSP 파일을 찾을 수 없습니다: {ssp_file_path}")
            return (0.0, 0.0)
        
        with open(ssp_file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        if 'beam_def' not in data:
            print(f"경고: SSP 파일에 beam_def가 없습니다: {ssp_file_path}")
            return (0.0, 0.0)
        
        beam_def = data['beam_def']
        
        if beam_id not in beam_def:
            print(f"경고: 빔 ID '{beam_id}'를 찾을 수 없습니다. 기본값 사용.")
            return (0.0, 0.0)
        
        beam_data = beam_def[beam_id]
        el_angle = beam_data.get('el_angle', 0.0)
        az_angle = beam_data.get('az_angle', 0.0)
        
        return (el_angle, az_angle)
        
    except Exception as e:
        print(f"경고: SSP 파일 파싱 실패 ({ssp_file_path}): {e}")
        return (0.0, 0.0)


def update_existing_configs():
    """기존 Config 데이터의 el_angle, az_angle 업데이트"""
    db = SessionLocal()
    try:
        # SSP 파일 경로 설정
        project_root = Path(__file__).parent.parent.parent
        beam_def_file = project_root / "echo_sim_cmd_2026_0109_정해찬" / "6_beam_def_ex.ssp"
        
        # 모든 Config 조회
        configs = db.query(SarConfigModel).all()
        
        if len(configs) == 0:
            print("업데이트할 Config가 없습니다.")
            return
        
        print(f"총 {len(configs)}개의 Config를 업데이트합니다.\n")
        
        updated_count = 0
        for config in configs:
            # SSP 파일에서 el_angle, az_angle 추출
            beam_id = config.beam_id or "Beam0000"
            el_angle, az_angle = parse_beam_def_from_ssp(beam_def_file, beam_id)
            
            # 값이 변경된 경우에만 업데이트
            if config.el_angle != el_angle or config.az_angle != az_angle:
                config.el_angle = el_angle
                config.az_angle = az_angle
                updated_count += 1
                print(f"  - {config.name} (beam_id: {beam_id}): el_angle={el_angle}, az_angle={az_angle}")
            else:
                print(f"  - {config.name} (beam_id: {beam_id}): 이미 올바른 값 (el_angle={el_angle}, az_angle={az_angle})")
        
        db.commit()
        print(f"\n총 {updated_count}개의 Config가 업데이트되었습니다.")
        
    except Exception as e:
        print(f"업데이트 실패: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    update_existing_configs()
