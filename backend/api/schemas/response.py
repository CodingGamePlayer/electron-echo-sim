"""
응답 스키마

API 응답을 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any


class ChirpResponse(BaseModel):
    """Chirp 신호 생성 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    shape: List[int] = Field(..., description="신호 shape")
    dtype: str = Field(..., description="데이터 타입")
    data: str = Field(..., description="Base64 인코딩된 신호 데이터")
    num_samples: int = Field(..., description="샘플 수")


class EchoResponse(BaseModel):
    """Echo 시뮬레이션 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    shape: List[int] = Field(..., description="신호 shape")
    dtype: str = Field(..., description="데이터 타입")
    data: str = Field(..., description="Base64 인코딩된 신호 데이터")
    num_samples: int = Field(..., description="샘플 수")
    max_amplitude: float = Field(..., description="최대 진폭")
    mean_amplitude: float = Field(..., description="평균 진폭")


class EchoMultipleResponse(BaseModel):
    """여러 펄스 Echo 시뮬레이션 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    shape: List[int] = Field(..., description="신호 shape [num_pulses, num_samples]")
    dtype: str = Field(..., description="데이터 타입")
    data: str = Field(..., description="Base64 인코딩된 신호 데이터")
    num_pulses: int = Field(..., description="펄스 개수")
    num_samples: int = Field(..., description="샘플 수")


class RawDataSaveResponse(BaseModel):
    """Raw Data 저장 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    filepath: str = Field(..., description="저장된 파일 경로")
    group_name: str = Field(..., description="그룹 이름")
    num_pulses: int = Field(..., description="펄스 개수")
    num_samples: int = Field(..., description="샘플 수")


class SarImageResponse(BaseModel):
    """SAR 이미지 처리 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    shape: List[int] = Field(..., description="SAR 이미지 shape [azimuth_samples, range_samples]")
    data: str = Field(..., description="Base64 인코딩된 SAR 이미지 데이터 (dB 스케일, float32)")
    range_extent: List[float] = Field(..., description="Range 범위 [min, max] (m)")
    azimuth_extent: List[float] = Field(..., description="Azimuth 범위 [min, max] (m)")
    max_value: float = Field(..., description="최대 값 (dB)")
    min_value: float = Field(..., description="최소 값 (dB)")
    is_full_swath: bool = Field(False, description="전체 swath 여부")


class SarImageBothResponse(BaseModel):
    """SAR 이미지 처리 응답 스키마 (타겟 영역 + 전체 영역)"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    target_region: dict = Field(..., description="타겟 영역 SAR 이미지")
    full_swath: dict = Field(..., description="전체 영역 SAR 이미지")


class SatelliteCreateResponse(BaseModel):
    """위성 생성 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    satellite_state: dict = Field(..., description="위성 상태 (ECEF 좌표)")
    mission_direction: dict = Field(..., description="미션 방향 정보")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "위성 생성 완료",
                "satellite_state": {
                    "position": [6378137.0 + 517000.0, 0.0, 0.0],
                    "velocity": [0.0, 7266.0, 0.0]
                },
                "mission_direction": {
                    "beam_direction": [0.0, 0.0, -1.0],
                    "heading": 0.0
                }
            }
        }
    )


class MissionDirectionResponse(BaseModel):
    """미션 방향 계산 응답 스키마"""
    
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    beam_direction: List[float] = Field(..., description="빔 방향 벡터 (ECEF 좌표, 정규화된 벡터)", min_length=3, max_length=3)
    heading: float = Field(..., description="Heading 각도 (단위: deg, 0-360)")
    crossing_point: Optional[List[float]] = Field(None, description="빔과 지구 교차점 (지리 좌표: [경도, 위도, 고도])")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "미션 방향 계산 완료",
                "beam_direction": [0.0, 0.0, -1.0],
                "heading": 0.0,
                "crossing_point": [128.1, 37.1, 0.0]
            }
        }
    )
