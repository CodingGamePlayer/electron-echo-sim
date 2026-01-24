"""
API 통합 테스트

모든 API 엔드포인트가 제대로 작동하는지 테스트합니다.
"""

import pytest
import numpy as np
import base64
import tempfile
import os
from pathlib import Path
from fastapi.testclient import TestClient
from api.main import app

# 테스트 클라이언트
client = TestClient(app)

# 공통 테스트 데이터
# 나이키스트 샘플링 조건: fs >= 2 * bw
TEST_CONFIG = {
    "fc": 5.4e9,
    "bw": 150e6,
    "fs": 350e6,  # 2 * bw (300e6)보다 크게 설정
    "taup": 10e-6,
    "prf": 5000,
    "swst": 10e-6,
    "swl": 50e-6,
    "orbit_height": 517e3,
    "antenna_width": 4.0,
    "antenna_height": 0.5
}

TEST_TARGET = {
    "position": [6378137.0, 0.0, 0.0],
    "reflectivity": 1.0,
    "phase": 0.0
}

TEST_SATELLITE_STATE = {
    "position": [6378137.0 + 517000.0, 0.0, 0.0],
    "velocity": [0.0, 7266.0, 0.0],
    "beam_direction": None
}


class TestHealthCheck:
    """헬스 체크 테스트"""
    
    def test_health_check(self):
        """헬스 체크 엔드포인트 테스트"""
        response = client.get("/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "SAR Simulator API"
        assert data["version"] == "1.0.0"
    
    def test_root_endpoint(self):
        """루트 엔드포인트 테스트"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "docs" in data
        assert "health" in data


class TestConfigValidation:
    """시스템 설정 검증 테스트"""
    
    def test_valid_config(self):
        """유효한 설정 검증 테스트"""
        response = client.post("/api/config/validate", json=TEST_CONFIG)
        assert response.status_code == 200
        
        data = response.json()
        if not data["valid"]:
            print(f"검증 실패 메시지: {data['message']}")
            print(f"응답 데이터: {data}")
        assert data["valid"] is True
        assert "설정이 유효합니다" in data["message"]
        assert data["config"] is not None
    
    def test_invalid_config_missing_field(self):
        """필수 필드 누락 테스트"""
        invalid_config = TEST_CONFIG.copy()
        del invalid_config["fc"]
        
        response = client.post("/api/config/validate", json=invalid_config)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_config_negative_value(self):
        """음수 값 테스트"""
        invalid_config = TEST_CONFIG.copy()
        invalid_config["fc"] = -1.0
        
        response = client.post("/api/config/validate", json=invalid_config)
        # Pydantic이 필드 레벨에서 검증하므로 422 에러가 발생
        assert response.status_code == 422  # Validation error
        
        # 또는 gt=0 조건이 없어서 통과하는 경우
        if response.status_code == 200:
            data = response.json()
            assert data["valid"] is False
    
    def test_invalid_config_nyquist_violation(self):
        """나이키스트 샘플링 위반 테스트"""
        invalid_config = TEST_CONFIG.copy()
        invalid_config["fs"] = 100e6  # bw (150e6) * 2보다 작음
        
        response = client.post("/api/config/validate", json=invalid_config)
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] is False
        assert "나이키스트" in data["message"] or "샘플링" in data["message"]


class TestChirpGeneration:
    """Chirp 신호 생성 테스트"""
    
    def test_generate_chirp(self):
        """Chirp 신호 생성 테스트"""
        response = client.post("/api/chirp/generate", json=TEST_CONFIG)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "생성 완료" in data["message"]
        assert "shape" in data
        assert "dtype" in data
        assert "data" in data
        assert "num_samples" in data
        assert data["num_samples"] > 0
        
        # Base64 데이터 디코딩 테스트
        chirp_bytes = base64.b64decode(data["data"])
        chirp_float32 = np.frombuffer(chirp_bytes, dtype=np.float32)
        
        # 실수/허수 분리된 형태 확인
        assert len(chirp_float32) == data["num_samples"] * 2
        
        # 복소수로 복원
        chirp_signal = chirp_float32[::2] + 1j * chirp_float32[1::2]
        assert len(chirp_signal) == data["num_samples"]
        assert chirp_signal.dtype == np.complex64
    
    def test_generate_chirp_invalid_config(self):
        """잘못된 설정으로 Chirp 생성 테스트"""
        invalid_config = TEST_CONFIG.copy()
        invalid_config["fs"] = 100e6  # 나이키스트 위반
        
        response = client.post("/api/chirp/generate", json=invalid_config)
        assert response.status_code == 400


class TestEchoSimulation:
    """Echo 시뮬레이션 테스트"""
    
    def test_simulate_echo_single(self):
        """단일 펄스 Echo 시뮬레이션 테스트"""
        request_data = {
            "config": TEST_CONFIG,
            "targets": [TEST_TARGET],
            "satellite_state": TEST_SATELLITE_STATE
        }
        
        response = client.post("/api/echo/simulate", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "시뮬레이션 완료" in data["message"]
        assert "shape" in data
        assert "dtype" in data
        assert "data" in data
        assert "num_samples" in data
        assert "max_amplitude" in data
        assert "mean_amplitude" in data
        assert data["num_samples"] > 0
        assert data["max_amplitude"] >= 0
        assert data["mean_amplitude"] >= 0
        
        # Base64 데이터 디코딩 테스트
        echo_bytes = base64.b64decode(data["data"])
        echo_float32 = np.frombuffer(echo_bytes, dtype=np.float32)
        
        # 실수/허수 분리된 형태 확인
        assert len(echo_float32) == data["num_samples"] * 2
        
        # 복소수로 복원
        echo_signal = echo_float32[::2] + 1j * echo_float32[1::2]
        assert len(echo_signal) == data["num_samples"]
        assert echo_signal.dtype == np.complex64
        
        # 진폭 확인
        max_amp = float(np.max(np.abs(echo_signal)))
        mean_amp = float(np.mean(np.abs(echo_signal)))
        assert abs(max_amp - data["max_amplitude"]) < 1e-6
        assert abs(mean_amp - data["mean_amplitude"]) < 1e-6
    
    def test_simulate_echo_multiple_targets(self):
        """여러 타겟 Echo 시뮬레이션 테스트"""
        targets = [
            TEST_TARGET,
            {
                "position": [6378137.0 + 1000.0, 0.0, 0.0],
                "reflectivity": 0.5,
                "phase": 0.0
            }
        ]
        
        request_data = {
            "config": TEST_CONFIG,
            "targets": targets,
            "satellite_state": TEST_SATELLITE_STATE
        }
        
        response = client.post("/api/echo/simulate", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_simulate_echo_multiple_pulses(self):
        """여러 펄스 Echo 시뮬레이션 테스트"""
        num_pulses = 5
        satellite_states = [
            {
                "position": [6378137.0 + 517000.0 + i * 1000.0, 0.0, 0.0],
                "velocity": [0.0, 7266.0, 0.0],
                "beam_direction": None
            }
            for i in range(num_pulses)
        ]
        
        request_data = {
            "config": TEST_CONFIG,
            "targets": [TEST_TARGET],
            "satellite_states": satellite_states
        }
        
        response = client.post("/api/echo/simulate-multiple", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "시뮬레이션 완료" in data["message"]
        assert data["num_pulses"] == num_pulses
        assert data["num_samples"] > 0
        assert len(data["shape"]) == 2
        assert data["shape"][0] == num_pulses
        
        # Base64 데이터 디코딩 테스트
        echo_bytes = base64.b64decode(data["data"])
        echo_float32 = np.frombuffer(echo_bytes, dtype=np.float32)
        
        # 복소수로 복원
        echo_signals = (echo_float32[::2] + 1j * echo_float32[1::2]).reshape(num_pulses, data["num_samples"])
        assert echo_signals.shape == (num_pulses, data["num_samples"])
    
    def test_simulate_echo_invalid_config(self):
        """잘못된 설정으로 Echo 시뮬레이션 테스트"""
        invalid_config = TEST_CONFIG.copy()
        invalid_config["fs"] = 100e6
        
        request_data = {
            "config": invalid_config,
            "targets": [TEST_TARGET],
            "satellite_state": TEST_SATELLITE_STATE
        }
        
        response = client.post("/api/echo/simulate", json=request_data)
        assert response.status_code == 400


class TestRawDataSave:
    """Raw Data 저장 테스트"""
    
    def test_save_raw_data(self):
        """Raw Data 저장 테스트"""
        # 먼저 Echo 신호 생성
        request_data = {
            "config": TEST_CONFIG,
            "targets": [TEST_TARGET],
            "satellite_state": TEST_SATELLITE_STATE
        }
        
        echo_response = client.post("/api/echo/simulate", json=request_data)
        assert echo_response.status_code == 200
        echo_data = echo_response.json()
        
        # Raw Data 저장 요청
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test_output.h5")
            
            save_request = {
                "config_request": TEST_CONFIG,
                "echo_data_base64": echo_data["data"],
                "satellite_states": [TEST_SATELLITE_STATE],
                "filepath": filepath,
                "group_name": "SSG00"
            }
            
            response = client.post("/api/raw-data/save", json=save_request)
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] is True
            assert "저장 완료" in data["message"]
            assert data["filepath"] is not None
            assert data["group_name"] == "SSG00"
            assert data["num_pulses"] == 1
            assert data["num_samples"] > 0
            
            # 파일이 실제로 생성되었는지 확인
            assert os.path.exists(filepath)
            
            # HDF5 파일 읽기 테스트
            import h5py
            with h5py.File(filepath, 'r') as f:
                assert "SSG00" in f
                assert "B000" in f["SSG00"]
    
    def test_save_raw_data_multiple_pulses(self):
        """여러 펄스 Raw Data 저장 테스트"""
        # 여러 펄스 Echo 신호 생성
        num_pulses = 3
        satellite_states = [
            {
                "position": [6378137.0 + 517000.0 + i * 1000.0, 0.0, 0.0],
                "velocity": [0.0, 7266.0, 0.0],
                "beam_direction": None
            }
            for i in range(num_pulses)
        ]
        
        request_data = {
            "config": TEST_CONFIG,
            "targets": [TEST_TARGET],
            "satellite_states": satellite_states
        }
        
        echo_response = client.post("/api/echo/simulate-multiple", json=request_data)
        assert echo_response.status_code == 200
        echo_data = echo_response.json()
        
        # Raw Data 저장
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test_output_multiple.h5")
            
            save_request = {
                "config_request": TEST_CONFIG,
                "echo_data_base64": echo_data["data"],
                "satellite_states": satellite_states,
                "filepath": filepath,
                "group_name": "SSG00"
            }
            
            response = client.post("/api/raw-data/save", json=save_request)
            assert response.status_code == 200
            
            data = response.json()
            assert data["num_pulses"] == num_pulses
            
            # 파일 확인
            assert os.path.exists(filepath)
            
            # HDF5 파일 읽기 테스트
            import h5py
            with h5py.File(filepath, 'r') as f:
                assert "SSG00" in f
                dataset = f["SSG00/B000"]
                assert dataset.shape[0] == num_pulses


class TestEndToEnd:
    """End-to-End 통합 테스트"""
    
    def test_full_workflow(self):
        """전체 워크플로우 테스트: 설정 검증 → Chirp 생성 → Echo 시뮬레이션 → 저장"""
        # 1. 설정 검증
        config_response = client.post("/api/config/validate", json=TEST_CONFIG)
        assert config_response.status_code == 200
        assert config_response.json()["valid"] is True
        
        # 2. Chirp 신호 생성
        chirp_response = client.post("/api/chirp/generate", json=TEST_CONFIG)
        assert chirp_response.status_code == 200
        chirp_data = chirp_response.json()
        assert chirp_data["success"] is True
        
        # 3. Echo 시뮬레이션
        echo_request = {
            "config": TEST_CONFIG,
            "targets": [TEST_TARGET],
            "satellite_state": TEST_SATELLITE_STATE
        }
        echo_response = client.post("/api/echo/simulate", json=echo_request)
        assert echo_response.status_code == 200
        echo_data = echo_response.json()
        assert echo_data["success"] is True
        
        # 4. Raw Data 저장
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "e2e_test.h5")
            save_request = {
                "config_request": TEST_CONFIG,
                "echo_data_base64": echo_data["data"],
                "satellite_states": [TEST_SATELLITE_STATE],
                "filepath": filepath,
                "group_name": "SSG00"
            }
            
            save_response = client.post("/api/raw-data/save", json=save_request)
            assert save_response.status_code == 200
            save_data = save_response.json()
            assert save_data["success"] is True
            assert os.path.exists(filepath)
            
            # HDF5 파일 검증
            import h5py
            with h5py.File(filepath, 'r') as f:
                assert "SSG00" in f
                assert "B000" in f["SSG00"]
                dataset = f["SSG00/B000"]
                assert dataset.shape[0] == 1
                assert dataset.shape[1] == echo_data["num_samples"]
                assert dataset.shape[2] == 2  # 실수/허수
