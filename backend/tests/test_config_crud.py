"""
SAR Config CRUD 통합 테스트

데이터베이스를 사용한 CRUD 엔드포인트 테스트입니다.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import tempfile
import os

from api.main import app
from api.database import Base, get_db
from api.models.config import SarConfigModel


# 테스트용 임시 데이터베이스
TEST_DB_PATH = tempfile.mktemp(suffix=".db")
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

# 테스트용 엔진 및 세션
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """테스트용 데이터베이스 세션"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_db():
    """테스트 데이터베이스 설정"""
    # 테이블 생성
    Base.metadata.create_all(bind=test_engine)
    
    # 의존성 오버라이드
    app.dependency_overrides[get_db] = override_get_db
    
    yield
    
    # 정리
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture
def client(test_db):
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_config_data():
    """샘플 Config 데이터"""
    return {
        "name": "테스트 설정",
        "description": "테스트용 SAR 시스템 설정",
        "fc": 5.4e9,
        "bw": 150e6,
        "fs": 250e6,
        "taup": 10e-6,
        "prf": 5000,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 517e3,
        "antenna_width": 4.0,
        "antenna_height": 0.5
    }


class TestConfigCRUD:
    """SAR Config CRUD 테스트"""
    
    def test_create_config(self, client, sample_config_data):
        """Config 생성 테스트"""
        response = client.post("/api/config", json=sample_config_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_config_data["name"]
        assert data["description"] == sample_config_data["description"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
    
    def test_create_config_invalid(self, client):
        """유효하지 않은 Config 생성 테스트"""
        invalid_data = {
            "name": "잘못된 설정",
            "fc": -1,  # 음수는 유효하지 않음
            "bw": 150e6,
            "fs": 250e6,
            "taup": 10e-6,
            "prf": 5000,
            "swst": 10e-6,
            "swl": 50e-6,
            "orbit_height": 517e3,
            "antenna_width": 4.0,
            "antenna_height": 0.5
        }
        
        response = client.post("/api/config", json=invalid_data)
        assert response.status_code == 400
    
    def test_get_all_configs(self, client, sample_config_data):
        """모든 Config 목록 조회 테스트"""
        # Config 생성
        client.post("/api/config", json=sample_config_data)
        
        # 목록 조회
        response = client.get("/api/config")
        
        assert response.status_code == 200
        data = response.json()
        assert "configs" in data
        assert "total" in data
        assert len(data["configs"]) == 1
        assert data["total"] == 1
    
    def test_get_config(self, client, sample_config_data):
        """특정 Config 조회 테스트"""
        # Config 생성
        create_response = client.post("/api/config", json=sample_config_data)
        config_id = create_response.json()["id"]
        
        # Config 조회
        response = client.get(f"/api/config/{config_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == config_id
        assert data["name"] == sample_config_data["name"]
    
    def test_get_config_not_found(self, client):
        """존재하지 않는 Config 조회 테스트"""
        response = client.get("/api/config/non-existent-id")
        assert response.status_code == 404
    
    def test_update_config(self, client, sample_config_data):
        """Config 업데이트 테스트"""
        # Config 생성
        create_response = client.post("/api/config", json=sample_config_data)
        config_id = create_response.json()["id"]
        
        # Config 업데이트
        update_data = {
            "name": "업데이트된 설정",
            "description": "업데이트된 설명"
        }
        response = client.put(f"/api/config/{config_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "업데이트된 설정"
        assert data["description"] == "업데이트된 설명"
    
    def test_update_config_partial(self, client, sample_config_data):
        """부분 업데이트 테스트"""
        # Config 생성
        create_response = client.post("/api/config", json=sample_config_data)
        config_id = create_response.json()["id"]
        
        # 일부 필드만 업데이트
        update_data = {
            "name": "부분 업데이트"
        }
        response = client.put(f"/api/config/{config_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "부분 업데이트"
        # 다른 필드는 변경되지 않아야 함
        assert data["fc"] == sample_config_data["fc"]
    
    def test_update_config_not_found(self, client):
        """존재하지 않는 Config 업데이트 테스트"""
        update_data = {"name": "업데이트"}
        response = client.put("/api/config/non-existent-id", json=update_data)
        assert response.status_code == 404
    
    def test_delete_config(self, client, sample_config_data):
        """Config 삭제 테스트"""
        # Config 생성
        create_response = client.post("/api/config", json=sample_config_data)
        config_id = create_response.json()["id"]
        
        # Config 삭제
        response = client.delete(f"/api/config/{config_id}")
        assert response.status_code == 204
        
        # 삭제 확인
        get_response = client.get(f"/api/config/{config_id}")
        assert get_response.status_code == 404
    
    def test_delete_config_not_found(self, client):
        """존재하지 않는 Config 삭제 테스트"""
        response = client.delete("/api/config/non-existent-id")
        assert response.status_code == 404
    
    def test_config_list_pagination(self, client, sample_config_data):
        """Config 목록 페이징 테스트"""
        # 여러 Config 생성
        for i in range(5):
            config_data = sample_config_data.copy()
            config_data["name"] = f"설정 {i+1}"
            client.post("/api/config", json=config_data)
        
        # 페이징 조회
        response = client.get("/api/config?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["configs"]) == 2
        assert data["total"] == 5
        
        # 다음 페이지 조회
        response = client.get("/api/config?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["configs"]) == 2
