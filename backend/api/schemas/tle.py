"""
TLE API 스키마

TLE API 요청 및 응답을 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime


class TleCreateRequest(BaseModel):
    """TLE 생성 요청 스키마"""
    
    name: str = Field(..., description="위성 이름 또는 TLE 이름", min_length=1)
    description: Optional[str] = Field(None, description="설명")
    tle_data: str = Field(..., description="TLE 전체 텍스트 (2줄 또는 3줄 형식)", min_length=1)
    
    @field_validator('tle_data')
    @classmethod
    def validate_tle_format(cls, v: str) -> str:
        """TLE 형식 검증 (2줄 또는 3줄)"""
        lines = v.strip().split('\n')
        line_count = len([line for line in lines if line.strip()])
        
        if line_count not in [2, 3]:
            raise ValueError('TLE 데이터는 2줄 또는 3줄 형식이어야 합니다.')
        
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "ISS (ZARYA)",
                "description": "국제우주정거장",
                "tle_data": "1 25544U 98067A   24001.12345678  .00001234  00000+0  12345-4 0  9999\n2 25544  51.6400 123.4567 0001234   0.0000   0.0000 15.12345678901234"
            }
        }
    )


class TleUpdateRequest(BaseModel):
    """TLE 수정 요청 스키마"""
    
    name: Optional[str] = Field(None, description="위성 이름 또는 TLE 이름", min_length=1)
    description: Optional[str] = Field(None, description="설명")
    tle_data: Optional[str] = Field(None, description="TLE 전체 텍스트 (2줄 또는 3줄 형식)", min_length=1)
    
    @field_validator('tle_data')
    @classmethod
    def validate_tle_format(cls, v: Optional[str]) -> Optional[str]:
        """TLE 형식 검증 (2줄 또는 3줄)"""
        if v is None:
            return v
        
        lines = v.strip().split('\n')
        line_count = len([line for line in lines if line.strip()])
        
        if line_count not in [2, 3]:
            raise ValueError('TLE 데이터는 2줄 또는 3줄 형식이어야 합니다.')
        
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "ISS (ZARYA) Updated",
                "description": "국제우주정거장 (업데이트됨)",
                "tle_data": "1 25544U 98067A   24001.12345678  .00001234  00000+0  12345-4 0  9999\n2 25544  51.6400 123.4567 0001234   0.0000   0.0000 15.12345678901234"
            }
        }
    )


class TleResponse(BaseModel):
    """TLE 응답 스키마"""
    
    id: str = Field(..., description="TLE ID")
    name: str = Field(..., description="위성 이름 또는 TLE 이름")
    description: Optional[str] = Field(None, description="설명")
    tle_data: str = Field(..., description="TLE 전체 텍스트")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="수정 시간")
    
    model_config = ConfigDict(from_attributes=True)


class TleListResponse(BaseModel):
    """TLE 목록 응답 스키마"""
    
    tles: List[TleResponse] = Field(..., description="TLE 목록")
    total: int = Field(..., description="전체 개수")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tles": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "ISS (ZARYA)",
                        "description": "국제우주정거장",
                        "tle_data": "1 25544U 98067A   24001.12345678  .00001234  00000+0  12345-4 0  9999\n2 25544  51.6400 123.4567 0001234   0.0000   0.0000 15.12345678901234",
                        "created_at": "2024-01-01T00:00:00",
                        "updated_at": "2024-01-01T00:00:00"
                    }
                ],
                "total": 1
            }
        }
    )
