"""
TLE 관련 API 라우트

TLE 데이터의 CRUD 작업을 처리합니다.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from api.database import get_db
from api.schemas.tle import (
    TleCreateRequest,
    TleUpdateRequest,
    TleResponse,
    TleListResponse
)
from api.services.tle_service import (
    create_tle,
    get_tle,
    get_all_tles,
    update_tle,
    delete_tle
)

router = APIRouter()


@router.post("", response_model=TleResponse, status_code=201)
async def create_tle_endpoint(
    tle_data: TleCreateRequest,
    db: Session = Depends(get_db)
):
    """
    TLE 생성
    
    새로운 TLE 데이터를 생성합니다.
    """
    try:
        tle = create_tle(db, tle_data)
        return tle
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.get("", response_model=TleListResponse)
async def get_all_tles_endpoint(
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 조회 개수"),
    db: Session = Depends(get_db)
):
    """
    모든 TLE 목록 조회
    
    저장된 모든 TLE 데이터 목록을 조회합니다.
    """
    tles, total = get_all_tles(db, skip=skip, limit=limit)
    return TleListResponse(
        tles=tles,
        total=total
    )


@router.get("/{tle_id}", response_model=TleResponse)
async def get_tle_endpoint(
    tle_id: str,
    db: Session = Depends(get_db)
):
    """
    특정 TLE 조회
    
    TLE ID로 특정 TLE 데이터를 조회합니다.
    """
    tle = get_tle(db, tle_id)
    return tle


@router.put("/{tle_id}", response_model=TleResponse)
async def update_tle_endpoint(
    tle_id: str,
    tle_data: TleUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    TLE 업데이트
    
    기존 TLE 데이터를 업데이트합니다.
    """
    try:
        tle = update_tle(db, tle_id, tle_data)
        return tle
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.delete("/{tle_id}", status_code=204)
async def delete_tle_endpoint(
    tle_id: str,
    db: Session = Depends(get_db)
):
    """
    TLE 삭제
    
    TLE 데이터를 삭제합니다.
    """
    delete_tle(db, tle_id)
    return None
