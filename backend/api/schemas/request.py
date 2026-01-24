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
