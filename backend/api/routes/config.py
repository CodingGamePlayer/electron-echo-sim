"""
시스템 설정 관련 API 라우트
"""

from fastapi import APIRouter, HTTPException
from api.schemas.config import SarSystemConfigRequest, SarSystemConfigResponse
from sar_simulator.common.sar_system_config import SarSystemConfig

router = APIRouter()


@router.post("/validate", response_model=SarSystemConfigResponse)
async def validate_config(config_request: SarSystemConfigRequest):
    """
    시스템 설정 검증
    
    SAR 시스템 설정 파라미터의 유효성을 검증합니다.
    """
    try:
        # Pydantic 스키마를 SarSystemConfig로 변환
        config = config_request.to_sar_system_config()
        
        # 검증 성공 (SarSystemConfig 생성 시 자동 검증됨)
        return SarSystemConfigResponse(
            valid=True,
            message="설정이 유효합니다.",
            config=config_request
        )
    except ValueError as e:
        # 검증 실패
        return SarSystemConfigResponse(
            valid=False,
            message=str(e),
            config=config_request
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
