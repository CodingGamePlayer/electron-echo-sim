"""
SAR Config 서비스

SAR Config의 CRUD 비즈니스 로직을 처리합니다.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List
from datetime import datetime

from api.models.config import SarConfigModel
from api.schemas.config import SarConfigCreateRequest, SarConfigUpdateRequest
from sar_simulator.common.sar_system_config import SarSystemConfig


def create_config(db: Session, config_data: SarConfigCreateRequest) -> SarConfigModel:
    """
    SAR Config 생성
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    config_data : SarConfigCreateRequest
        생성할 Config 데이터
    
    Returns:
    --------
    SarConfigModel
        생성된 Config 모델
    """
    # Config 유효성 검증
    try:
        config_data.to_sar_system_config()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"설정 검증 실패: {str(e)}")
    
    # 데이터베이스 모델 생성
    db_config = SarConfigModel(
        name=config_data.name,
        description=config_data.description,
        fc=config_data.fc,
        bw=config_data.bw,
        fs=config_data.fs,
        taup=config_data.taup,
        prf=config_data.prf,
        swst=config_data.swst,
        swl=config_data.swl,
        orbit_height=config_data.orbit_height,
        antenna_width=config_data.antenna_width,
        antenna_height=config_data.antenna_height,
        antenna_roll_angle=config_data.antenna_roll_angle,
        antenna_pitch_angle=config_data.antenna_pitch_angle,
        antenna_yaw_angle=config_data.antenna_yaw_angle,
        Pt=config_data.Pt,
        G_recv=config_data.G_recv,
        NF=config_data.NF,
        Loss=config_data.Loss,
        Tsys=config_data.Tsys,
        adc_bits=config_data.adc_bits,
        beam_id=config_data.beam_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    
    return db_config


def get_config(db: Session, config_id: str) -> SarConfigModel:
    """
    SAR Config 조회
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    config_id : str
        Config ID (UUID)
    
    Returns:
    --------
    SarConfigModel
        조회된 Config 모델
    
    Raises:
    -------
    HTTPException
        Config를 찾을 수 없는 경우 404 에러
    """
    config = db.query(SarConfigModel).filter(SarConfigModel.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail=f"Config를 찾을 수 없습니다: {config_id}")
    
    return config


def get_all_configs(db: Session, skip: int = 0, limit: int = 100) -> tuple[List[SarConfigModel], int]:
    """
    모든 SAR Config 목록 조회
    
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
    tuple[List[SarConfigModel], int]
        (Config 목록, 전체 개수)
    """
    configs = db.query(SarConfigModel).offset(skip).limit(limit).all()
    total = db.query(SarConfigModel).count()
    
    return configs, total


def update_config(db: Session, config_id: str, config_data: SarConfigUpdateRequest) -> SarConfigModel:
    """
    SAR Config 업데이트
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    config_id : str
        Config ID (UUID)
    config_data : SarConfigUpdateRequest
        업데이트할 Config 데이터
    
    Returns:
    --------
    SarConfigModel
        업데이트된 Config 모델
    
    Raises:
    -------
    HTTPException
        Config를 찾을 수 없는 경우 404 에러
    """
    db_config = get_config(db, config_id)
    
    # 업데이트할 필드만 추출
    update_data = config_data.model_dump(exclude_unset=True)
    
    if not update_data:
        return db_config
    
    # 업데이트할 데이터로 SarSystemConfig 생성하여 검증
    # 기존 값과 업데이트 값을 병합
    current_values = {
        "fc": db_config.fc,
        "bw": db_config.bw,
        "fs": db_config.fs,
        "taup": db_config.taup,
        "prf": db_config.prf,
        "swst": db_config.swst,
        "swl": db_config.swl,
        "orbit_height": db_config.orbit_height,
        "antenna_width": db_config.antenna_width,
        "antenna_height": db_config.antenna_height,
        "antenna_roll_angle": db_config.antenna_roll_angle,
        "antenna_pitch_angle": db_config.antenna_pitch_angle,
        "antenna_yaw_angle": db_config.antenna_yaw_angle,
        "Pt": db_config.Pt,
        "G_recv": db_config.G_recv,
        "NF": db_config.NF,
        "Loss": db_config.Loss,
        "Tsys": db_config.Tsys,
        "adc_bits": db_config.adc_bits,
        "beam_id": db_config.beam_id,
    }
    current_values.update(update_data)
    
    # Config 파라미터가 업데이트되는 경우 검증
    config_params = {
        "fc", "bw", "fs", "taup", "prf", "swst", "swl", "orbit_height",
        "antenna_width", "antenna_height", "antenna_roll_angle",
        "antenna_pitch_angle", "antenna_yaw_angle", "Pt", "G_recv",
        "NF", "Loss", "Tsys", "adc_bits", "beam_id"
    }
    
    if any(key in update_data for key in config_params):
        try:
            from sar_simulator.common.sar_system_config import SarSystemConfig
            SarSystemConfig(**{k: v for k, v in current_values.items() if k in config_params})
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"설정 검증 실패: {str(e)}")
    
    # 필드 업데이트
    for field, value in update_data.items():
        setattr(db_config, field, value)
    
    db_config.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_config)
    
    return db_config


def delete_config(db: Session, config_id: str) -> bool:
    """
    SAR Config 삭제
    
    Parameters:
    -----------
    db : Session
        데이터베이스 세션
    config_id : str
        Config ID (UUID)
    
    Returns:
    --------
    bool
        삭제 성공 여부
    
    Raises:
    -------
    HTTPException
        Config를 찾을 수 없는 경우 404 에러
    """
    db_config = get_config(db, config_id)
    
    db.delete(db_config)
    db.commit()
    
    return True
