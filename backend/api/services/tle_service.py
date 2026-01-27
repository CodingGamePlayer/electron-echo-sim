"""
TLE 서비스

TLE의 CRUD 비즈니스 로직을 처리합니다.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List
from datetime import datetime

from api.models.tle import TleModel
from api.schemas.tle import TleCreateRequest, TleUpdateRequest


def create_tle(db: Session, tle_data: TleCreateRequest) -> TleModel:
    """
    TLE 생성
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    tle_data : TleCreateRequest
        생성할 TLE 데이터
    
    Returns:
    --------
    TleModel
        생성된 TLE 모델
    """
    # 데이터베이스 모델 생성
    db_tle = TleModel(
        name=tle_data.name,
        description=tle_data.description,
        tle_data=tle_data.tle_data,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(db_tle)
    db.commit()
    db.refresh(db_tle)
    
    return db_tle


def get_tle(db: Session, tle_id: str) -> TleModel:
    """
    TLE 조회
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    tle_id : str
        TLE ID (UUID)
    
    Returns:
    --------
    TleModel
        조회된 TLE 모델
    
    Raises:
    -------
    HTTPException
        TLE를 찾을 수 없는 경우 404 에러
    """
    tle = db.query(TleModel).filter(TleModel.id == tle_id).first()
    
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE를 찾을 수 없습니다: {tle_id}")
    
    return tle


def get_all_tles(db: Session, skip: int = 0, limit: int = 100) -> tuple[List[TleModel], int]:
    """
    모든 TLE 목록 조회
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    skip : int
        건너뛸 개수 (페이징)
    limit : int
        최대 조회 개수 (페이징)
    
    Returns:
    --------
    tuple[List[TleModel], int]
        (TLE 목록, 전체 개수)
    """
    tles = db.query(TleModel).offset(skip).limit(limit).all()
    total = db.query(TleModel).count()
    
    return tles, total


def update_tle(db: Session, tle_id: str, tle_data: TleUpdateRequest) -> TleModel:
    """
    TLE 업데이트
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    tle_id : str
        TLE ID (UUID)
    tle_data : TleUpdateRequest
        업데이트할 TLE 데이터
    
    Returns:
    --------
    TleModel
        업데이트된 TLE 모델
    
    Raises:
    -------
    HTTPException
        TLE를 찾을 수 없는 경우 404 에러
    """
    db_tle = get_tle(db, tle_id)
    
    # 업데이트할 필드만 추출
    update_data = tle_data.model_dump(exclude_unset=True)
    
    if not update_data:
        return db_tle
    
    # 필드 업데이트
    for field, value in update_data.items():
        setattr(db_tle, field, value)
    
    db_tle.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_tle)
    
    return db_tle


def delete_tle(db: Session, tle_id: str) -> bool:
    """
    TLE 삭제
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    tle_id : str
        TLE ID (UUID)
    
    Returns:
    --------
    bool
        삭제 성공 여부
    
    Raises:
    -------
    HTTPException
        TLE를 찾을 수 없는 경우 404 에러
    """
    db_tle = get_tle(db, tle_id)
    
    db.delete(db_tle)
    db.commit()
    
    return True
