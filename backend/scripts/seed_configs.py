"""
SAR Config Seed 데이터 생성 스크립트

SSP 파일에서 추출한 기본 설정값들을 데이터베이스에 삽입합니다.
"""

import sys
from pathlib import Path
import yaml

# 프로젝트 루트를 Python 경로에 추가
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from api.database import SessionLocal, init_db
from api.models.config import SarConfigModel
from datetime import datetime
import uuid


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


def find_beam_in_objects(obj, beam_id: str = None):
    """
    중첩된 Objects 구조에서 빔 정보를 재귀적으로 찾습니다.
    
    Parameters:
    -----------
    obj : dict or list
        파싱된 YAML 객체
    beam_id : str, optional
        찾을 빔 ID (None이면 첫 번째 빔 반환)
    
    Returns:
    --------
    dict or None
        빔 정보 딕셔너리 또는 None
    """
    if isinstance(obj, dict):
        # beam_id 키가 있으면 빔 정보
        if 'beam_id' in obj:
            if beam_id is None or obj.get('beam_id') == beam_id:
                return obj
        # Objects 키가 있으면 재귀 탐색
        if 'Objects' in obj:
            result = find_beam_in_objects(obj['Objects'], beam_id)
            if result:
                return result
        # 다른 키들도 탐색
        for key, value in obj.items():
            if key != 'Objects':
                result = find_beam_in_objects(value, beam_id)
                if result:
                    return result
    elif isinstance(obj, list):
        for item in obj:
            result = find_beam_in_objects(item, beam_id)
            if result:
                return result
    return None


def parse_mission_ssp(ssp_file_path: Path) -> dict:
    """
    Mission SSP 파일을 파싱하여 SAR Config 데이터를 추출합니다.
    
    Parameters:
    -----------
    ssp_file_path : Path
        Mission SSP 파일 경로
    
    Returns:
    --------
    dict
        SarConfigModel에 필요한 필드들을 포함한 딕셔너리
    """
    try:
        if not ssp_file_path.exists():
            print(f"경고: SSP 파일을 찾을 수 없습니다: {ssp_file_path}")
            return None
        
        with open(ssp_file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        # 빔 정보 찾기 (첫 번째 빔 사용)
        beam_data = find_beam_in_objects(data)
        if not beam_data:
            print(f"경고: SSP 파일에서 빔 정보를 찾을 수 없습니다: {ssp_file_path}")
            return None
        
        # 기본값 설정
        defaults = {
            "orbit_height": 561e3,  # 기본 궤도 높이 (m)
            "antenna_width": 3.9,   # 기본 안테나 폭 (m)
            "antenna_height": 1.9,   # 기본 안테나 높이 (m)
            "Pt": 3200,             # 기본 송신 전력 (W)
            "G_recv": 60,            # 기본 수신 게인
            "NF": 3.5,               # 기본 노이즈 지수 (dB)
            "Loss": 2.0,             # 기본 시스템 손실 (dB)
            "Tsys": 270,             # 기본 시스템 온도 (K)
            "adc_bits": 12,          # 기본 ADC 비트 수
        }
        
        # 빔 정보에서 추출
        config_data = {
            "fc": beam_data.get("fc", 0.0),
            "bw": beam_data.get("bw", 0.0),
            "fs": beam_data.get("fs", 0.0),
            "taup": beam_data.get("taup", 0.0),
            "prf": beam_data.get("prf", 0.0),
            "swst": beam_data.get("swst", 0.0),
            "swl": beam_data.get("swl", 0.0),
            "beam_id": beam_data.get("beam_id", "Beam0000"),
            # SSP 파일 추가 파라미터
            "chirp_set_size": beam_data.get("chirp_set_size"),
            "echo_generator": beam_data.get("echo_generator"),
            "num_pulses": beam_data.get("num_pulses"),
            "pulse_num": beam_data.get("pulse_num"),
        }
        
        # 미션 레벨 정보에서 추출
        # bus_roll_angle 등은 별도 필드로 저장하고, antenna_roll_angle은 기본값 사용
        config_data["bus_roll_angle"] = data.get("bus_roll_angle")
        config_data["bus_pitch_angle"] = data.get("bus_pitch_angle")
        config_data["bus_yaw_angle"] = data.get("bus_yaw_angle")
        
        # antenna_roll_angle 등은 bus 값이 있으면 사용, 없으면 기본값 0.0
        config_data["antenna_roll_angle"] = data.get("bus_roll_angle", 0.0)
        config_data["antenna_pitch_angle"] = data.get("bus_pitch_angle", 0.0)
        config_data["antenna_yaw_angle"] = data.get("bus_yaw_angle", 0.0)
        
        # 미션 레벨 추가 파라미터
        begin_time_str = data.get("begin_time")
        if begin_time_str:
            try:
                from datetime import datetime
                config_data["begin_time"] = datetime.fromisoformat(begin_time_str.replace("'", ""))
            except Exception as e:
                print(f"경고: begin_time 파싱 실패: {begin_time_str}, {e}")
        
        config_data["bus_roll_rate"] = data.get("bus_roll_rate")
        config_data["bus_pitch_rate"] = data.get("bus_pitch_rate")
        config_data["bus_yaw_rate"] = data.get("bus_yaw_rate")
        config_data["mode"] = data.get("mode")
        config_data["num_repeats"] = data.get("num_repeats")
        
        # 기본값 적용
        for key, value in defaults.items():
            if key not in config_data:
                config_data[key] = value
        
        # 필수 필드 검증
        required_fields = ["fc", "bw", "fs", "taup", "prf", "swst", "swl"]
        missing_fields = [field for field in required_fields if config_data.get(field, 0.0) == 0.0]
        if missing_fields:
            print(f"경고: 필수 필드가 누락되었습니다: {missing_fields}")
        
        return config_data
        
    except Exception as e:
        print(f"경고: Mission SSP 파일 파싱 실패 ({ssp_file_path}): {e}")
        import traceback
        traceback.print_exc()
        return None


def seed_configs():
    """기본 Config 데이터 삽입"""
    db = SessionLocal()
    try:
        # 기존 데이터 확인 및 삭제
        existing = db.query(SarConfigModel).count()
        if existing > 0:
            print(f"기존 {existing}개의 Config 데이터를 삭제합니다...")
            db.query(SarConfigModel).delete()
            db.commit()
            print(f"기존 데이터 삭제 완료!")
        
        # SSP 파일 경로 설정
        project_root = Path(__file__).parent.parent.parent
        mission_dir = project_root / "echo_sim_cmd_2026_0109_정해찬"
        beam_def_file = mission_dir / "6_beam_def_ex.ssp"
        
        # Mission SSP 파일 목록
        mission_ssp_files = [
            ("mission.ssp", "Mission 기본 설정"),
            ("mission_20251027.ssp", "Mission 2025-10-27 설정"),
            ("mission_20251031.ssp", "Mission 2025-10-31 설정"),
            ("mission_20251202.ssp", "Mission 2025-12-02 설정"),
        ]
        
        # Mission SSP 파일에서 시드 데이터 생성
        mission_seed_data = []
        for filename, description_prefix in mission_ssp_files:
            ssp_path = mission_dir / filename
            if ssp_path.exists():
                parsed_data = parse_mission_ssp(ssp_path)
                if parsed_data:
                    # 파일명에서 날짜 추출 (있는 경우)
                    date_str = ""
                    if "2025" in filename:
                        # mission_20251027.ssp -> 2025-10-27
                        parts = filename.replace(".ssp", "").split("_")
                        if len(parts) > 1 and len(parts[-1]) == 8:  # YYYYMMDD 형식
                            date_part = parts[-1]
                            date_str = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"
                    
                    name = f"{description_prefix}"
                    if date_str:
                        name = f"{description_prefix} ({date_str})"
                    
                    parsed_data["name"] = name
                    parsed_data["description"] = f"{description_prefix} - {filename} 파일에서 추출"
                    mission_seed_data.append(parsed_data)
                    print(f"Mission SSP 파일 파싱 완료: {filename}")
                else:
                    print(f"경고: {filename} 파싱 실패")
            else:
                print(f"경고: {filename} 파일을 찾을 수 없습니다: {ssp_path}")
        
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
        
        # Mission SSP 파일에서 추출한 데이터 추가
        seed_data.extend(mission_seed_data)
        
        # 데이터 삽입
        for config_data in seed_data:
            # SSP 파일에서 el_angle, az_angle 추출
            beam_id = config_data.get("beam_id", "Beam0000")
            el_angle, az_angle = parse_beam_def_from_ssp(beam_def_file, beam_id)
            
            # el_angle, az_angle 추가
            config_data["el_angle"] = el_angle
            config_data["az_angle"] = az_angle
            
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
