"""
요청 스키마

API 요청을 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from api.schemas.config import SarSystemConfigRequest
from api.schemas.target import TargetRequest, SatelliteState


class EchoSimulateRequest(BaseModel):
    """Echo 시뮬레이션 요청 스키마"""
    
    # 시스템 설정 (인라인 또는 참조)
    config: SarSystemConfigRequest = Field(..., description="SAR 시스템 설정")
    targets: List[TargetRequest] = Field(..., description="타겟 리스트")
    satellite_state: SatelliteState = Field(..., description="위성 상태")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "config": {
                    "fc": 5.4e9,
                    "bw": 150e6,
                    "fs": 250e6,
                    "taup": 10e-6,
                    "prf": 5000,
                    "swst": 10e-6,
                    "swl": 50e-6,
                    "orbit_height": 517e3,
                    "antenna_width": 4.0,
                    "antenna_height": 0.5
                },
                "targets": [{
                    "position": [6378137.0, 0.0, 0.0],
                    "reflectivity": 1.0,
                    "phase": 0.0
                }],
                "satellite_state": {
                    "position": [6378137.0 + 517000.0, 0.0, 0.0],
                    "velocity": [0.0, 7266.0, 0.0],
                    "beam_direction": None
                }
            }
        }
    )


class EchoSimulateMultipleRequest(BaseModel):
    """여러 펄스 Echo 시뮬레이션 요청 스키마"""
    
    config: SarSystemConfigRequest = Field(..., description="SAR 시스템 설정")
    targets: List[TargetRequest] = Field(..., description="타겟 리스트")
    satellite_states: List[SatelliteState] = Field(..., description="위성 상태 배열")


class RawDataSaveRequest(BaseModel):
    """Raw Data 저장 요청 스키마"""
    
    config_request: SarSystemConfigRequest = Field(..., description="SAR 시스템 설정")
    echo_data_base64: str = Field(..., description="Base64 인코딩된 Echo 데이터")
    satellite_states: List[SatelliteState] = Field(..., description="위성 상태 배열")
    filepath: str = Field(..., description="저장할 파일 경로")
    group_name: str = Field("SSG00", description="그룹 이름")


class SarImageProcessRequest(BaseModel):
    """SAR 이미지 처리 요청 스키마"""
    
    config: SarSystemConfigRequest = Field(..., description="SAR 시스템 설정")
    echo_data_base64: str = Field(..., description="Base64 인코딩된 Echo 신호 데이터")
    shape: List[int] = Field(..., description="Echo 신호 shape [num_pulses, num_samples]")
    satellite_velocity: List[float] = Field(..., description="위성 속도 벡터 [vx, vy, vz] (m/s)")
    dynamic_range: float = Field(50.0, description="SAR 이미지 동적 범위 (dB)")
    process_full_swath: bool = Field(False, description="전체 swath 처리 여부 (False: 타겟 영역만, True: 전체 영역)")
    process_both: bool = Field(False, description="타겟 영역과 전체 영역 모두 처리 여부")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "config": {
                    "fc": 5.4e9,
                    "bw": 150e6,
                    "fs": 250e6,
                    "taup": 10e-6,
                    "prf": 5000,
                    "swst": 10e-6,
                    "swl": 50e-6,
                    "orbit_height": 517e3,
                    "antenna_width": 4.0,
                    "antenna_height": 0.5
                },
                "echo_data_base64": "...",
                "shape": [10, 17500],
                "satellite_velocity": [0.0, 7266.0, 0.0],
                "dynamic_range": 50.0
            }
        }
    )


class SatelliteCreateRequest(BaseModel):
    """위성 생성 요청 스키마"""
    
    position: List[float] = Field(..., description="위성 위치 (지리 좌표: [경도, 위도, 고도], 단위: [deg, deg, m])", min_length=3, max_length=3)
    velocity: List[float] = Field(..., description="위성 속도 벡터 (ECEF 좌표: [vx, vy, vz], 단위: m/s)", min_length=3, max_length=3)
    mission_location: List[float] = Field(..., description="미션 위치 (지리 좌표: [경도, 위도], 단위: [deg, deg])", min_length=2, max_length=2)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "position": [128.0, 37.0, 517000.0],
                "velocity": [0.0, 7266.0, 0.0],
                "mission_location": [128.1, 37.1]
            }
        }
    )


class MissionDirectionRequest(BaseModel):
    """미션 방향 계산 요청 스키마"""
    
    satellite_state: SatelliteState = Field(..., description="위성 상태")
    mission_location: List[float] = Field(..., description="미션 위치 (지리 좌표: [경도, 위도], 단위: [deg, deg])", min_length=2, max_length=2)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "satellite_state": {
                    "position": [6378137.0 + 517000.0, 0.0, 0.0],
                    "velocity": [0.0, 7266.0, 0.0],
                    "beam_direction": None
                },
                "mission_location": [128.1, 37.1]
            }
        }
    )
