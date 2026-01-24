"""
시스템 설정 관련 API 라우트
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from api.database import get_db
from api.schemas.config import (
    SarSystemConfigRequest,
    SarSystemConfigResponse,
    SarConfigCreateRequest,
    SarConfigUpdateRequest,
    SarConfigDetail,
    SarConfigListResponse,
    SarConfigItem
)
from api.services.config_service import (
    create_config,
    get_config,
    get_all_configs,
    update_config,
    delete_config
)
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


@router.post("", response_model=SarConfigDetail, status_code=201)
async def create_config_endpoint(
    config_data: SarConfigCreateRequest,
    db: Session = Depends(get_db)
):
    """
    SAR Config 생성
    
    새로운 SAR 시스템 설정을 생성합니다.
    """
    config = create_config(db, config_data)
    return config


@router.get("", response_model=SarConfigListResponse)
async def get_all_configs_endpoint(
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 조회 개수"),
    db: Session = Depends(get_db)
):
    """
    모든 SAR Config 목록 조회
    
    저장된 모든 SAR 시스템 설정 목록을 조회합니다.
    """
    configs, total = get_all_configs(db, skip=skip, limit=limit)
    return SarConfigListResponse(
        configs=configs,
        total=total
    )


@router.get("/{config_id}", response_model=SarConfigDetail)
async def get_config_endpoint(
    config_id: str,
    db: Session = Depends(get_db)
):
    """
    특정 SAR Config 조회
    
    Config ID로 특정 SAR 시스템 설정을 조회합니다.
    """
    config = get_config(db, config_id)
    return config


@router.put("/{config_id}", response_model=SarConfigDetail)
async def update_config_endpoint(
    config_id: str,
    config_data: SarConfigUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    SAR Config 업데이트
    
    기존 SAR 시스템 설정을 업데이트합니다.
    """
    config = update_config(db, config_id, config_data)
    return config


@router.delete("/{config_id}", status_code=204)
async def delete_config_endpoint(
    config_id: str,
    db: Session = Depends(get_db)
):
    """
    SAR Config 삭제
    
    SAR 시스템 설정을 삭제합니다.
    """
    delete_config(db, config_id)
    return None
