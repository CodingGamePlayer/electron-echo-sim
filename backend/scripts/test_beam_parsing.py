"""
SSP 파일 파싱 테스트 스크립트
"""

import sys
from pathlib import Path
import yaml

# 프로젝트 루트를 Python 경로에 추가
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

project_root = backend_path.parent
beam_def_file = project_root / "echo_sim_cmd_2026_0109_정해찬" / "6_beam_def_ex.ssp"

print(f"SSP 파일 경로: {beam_def_file}")
print(f"파일 존재 여부: {beam_def_file.exists()}\n")

if beam_def_file.exists():
    with open(beam_def_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    beam_def = data.get('beam_def', {})
    
    # 여러 빔 ID 테스트
    test_beams = ['Beam0000', 'Beam0100', 'Beam0200', 'Beam0300']
    
    for beam_id in test_beams:
        if beam_id in beam_def:
            beam_data = beam_def[beam_id]
            el_angle = beam_data.get('el_angle', 0.0)
            az_angle = beam_data.get('az_angle', 0.0)
            print(f"{beam_id}: el_angle={el_angle}, az_angle={az_angle}")
        else:
            print(f"{beam_id}: 찾을 수 없음")
