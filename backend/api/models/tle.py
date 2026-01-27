"""
TLE 데이터베이스 모델

TLE (Two-Line Element) 데이터를 저장하는 데이터베이스 모델입니다.
"""

from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
import uuid

from api.database import Base


class TleModel(Base):
    """
    TLE 데이터베이스 모델
    
    TLE 데이터를 영구 저장합니다.
    """
    __tablename__ = "tles"
    
    # 기본 필드
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    tle_data = Column(Text, nullable=False)  # TLE 전체 텍스트 (2줄 또는 3줄)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<TleModel(id={self.id}, name={self.name})>"
