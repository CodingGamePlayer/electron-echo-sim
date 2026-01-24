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
