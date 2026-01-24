"""
Raw Data 저장 관련 API 라우트
"""

from fastapi import APIRouter, HTTPException
import numpy as np
import base64
from pathlib import Path
from api.schemas.request import RawDataSaveRequest
from api.schemas.response import RawDataSaveResponse
from sar_simulator.io.raw_data_writer import RawDataWriter

router = APIRouter()


@router.post("/save", response_model=RawDataSaveResponse)
async def save_raw_data(request: RawDataSaveRequest):
    """
    Raw Data 저장
    
    Echo 신호 데이터를 HDF5 파일로 저장합니다.
    """
    try:
        # 시스템 설정 생성
        config = request.config_request.to_sar_system_config()
        
        # Base64 디코딩
        echo_bytes = base64.b64decode(request.echo_data_base64)
        # 실수/허수로 분리된 float32 데이터를 복원
        echo_float32 = np.frombuffer(echo_bytes, dtype=np.float32)
        # [real, imag, real, imag, ...] 형태를 복소수로 변환
        echo_data = echo_float32[::2] + 1j * echo_float32[1::2]
        
        # Echo 데이터 shape 복원
        num_pulses = len(request.satellite_states)
        num_samples = len(echo_data) // num_pulses if num_pulses > 0 else len(echo_data)
        echo_data = echo_data.reshape(num_pulses, num_samples).astype(np.complex64)
        
        # 위성 상태 배열 준비
        satellite_positions = np.array([s.position for s in request.satellite_states])
        satellite_velocities = np.array([s.velocity for s in request.satellite_states])
        
        # 파일 경로 검증
        output_path = Path(request.filepath)
        if not output_path.parent.exists():
            output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Raw Data 저장
        with RawDataWriter(str(output_path), config) as writer:
            writer.write_burst(
                group_name=request.group_name,
                echo_data=echo_data,
                satellite_positions=satellite_positions,
                satellite_velocities=satellite_velocities
            )
        
        return RawDataSaveResponse(
            success=True,
            message="Raw Data 저장 완료",
            filepath=str(output_path.absolute()),
            group_name=request.group_name,
            num_pulses=num_pulses,
            num_samples=num_samples
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
