"""
타겟 및 위성 상태 스키마

타겟 정보와 위성 상태를 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional


class TargetRequest(BaseModel):
    """타겟 요청 스키마"""
    
    position: List[float] = Field(..., description="타겟 위치 (ECEF 좌표, [x, y, z], 단위: m)", min_length=3, max_length=3)
    reflectivity: float = Field(1.0, description="반사도 (RCS, 단위: m²)", ge=0)
    phase: float = Field(0.0, description="위상 (단위: deg)")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "position": [6378137.0, 0.0, 0.0],
                "reflectivity": 1.0,
                "phase": 0.0
            }
        }
    )


class SatelliteState(BaseModel):
    """위성 상태 스키마"""
    
    position: List[float] = Field(..., description="위성 위치 (ECEF 좌표, [x, y, z], 단위: m)", min_length=3, max_length=3)
    velocity: List[float] = Field(..., description="위성 속도 (ECEF 좌표, [vx, vy, vz], 단위: m/s)", min_length=3, max_length=3)
    beam_direction: Optional[List[float]] = Field(None, description="빔 방향 벡터 ([x, y, z], 정규화된 벡터)", min_length=3, max_length=3)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "position": [6378137.0 + 517000.0, 0.0, 0.0],
                "velocity": [0.0, 7266.0, 0.0],
                "beam_direction": None
            }
        }
    )
