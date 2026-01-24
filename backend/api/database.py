"""
데이터베이스 설정 및 연결 관리

SQLite 데이터베이스 연결을 관리합니다.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import os

# 데이터베이스 파일 경로
DB_DIR = Path(__file__).parent.parent / "data"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "sar_configs.db"

# SQLite 데이터베이스 URL
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLAlchemy 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite용 설정
    echo=False  # SQL 쿼리 로깅 (개발 시 True로 설정 가능)
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 (모델 상속용)
Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성
    
    FastAPI의 의존성 주입에서 사용합니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    데이터베이스 초기화
    
    모든 테이블을 생성합니다.
    """
    from api.models.config import SarConfigModel  # noqa: F401
    
    Base.metadata.create_all(bind=engine)
    print(f"데이터베이스 초기화 완료: {DB_PATH}")
