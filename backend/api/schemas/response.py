"""
응답 스키마

API 응답을 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


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
