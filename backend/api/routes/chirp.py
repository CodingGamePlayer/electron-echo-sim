"""
Chirp 신호 생성 관련 API 라우트
"""

from fastapi import APIRouter, HTTPException
import numpy as np
import base64
from api.schemas.config import SarSystemConfigRequest
from api.schemas.response import ChirpResponse
from sar_simulator.sensor.sensor_simulator import SarSensorSimulator

router = APIRouter()


@router.post("/generate", response_model=ChirpResponse)
async def generate_chirp(config_request: SarSystemConfigRequest):
    """
    Chirp 신호 생성
    
    시스템 설정을 기반으로 LFM Chirp 신호를 생성합니다.
    """
    try:
        # 시스템 설정 생성
        config = config_request.to_sar_system_config()
        
        # Sensor Simulator 생성 및 Chirp 신호 생성
        sensor_sim = SarSensorSimulator(config)
        chirp_signal = sensor_sim.generate_chirp_signal()
        
        # NumPy 배열을 Base64로 인코딩
        # 복소수를 실수/허수로 분리하여 저장
        chirp_data = np.stack([chirp_signal.real, chirp_signal.imag], axis=-1)
        chirp_bytes = chirp_data.astype(np.float32).tobytes()
        chirp_base64 = base64.b64encode(chirp_bytes).decode('utf-8')
        
        return ChirpResponse(
            success=True,
            message="Chirp 신호 생성 완료",
            shape=list(chirp_signal.shape),
            dtype=str(chirp_signal.dtype),
            data=chirp_base64,
            num_samples=len(chirp_signal)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
