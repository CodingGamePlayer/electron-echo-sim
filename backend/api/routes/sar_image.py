"""
SAR 이미지 처리 관련 API 라우트
"""

from fastapi import APIRouter, HTTPException
import numpy as np
import base64
from api.schemas.request import SarImageProcessRequest
from api.schemas.response import SarImageResponse, SarImageBothResponse
from sar_simulator.processing.rda_processor import RDAProcessor

router = APIRouter()


def _encode_sar_image(sar_image_db: np.ndarray) -> str:
    """SAR 이미지를 Base64로 인코딩"""
    sar_image_float32 = sar_image_db.astype(np.float32)
    sar_bytes = sar_image_float32.tobytes()
    return base64.b64encode(sar_bytes).decode('utf-8')


def _create_sar_image_dict(
    sar_image_db: np.ndarray,
    range_extent: np.ndarray,
    azimuth_extent: np.ndarray,
    is_full_swath: bool = False
) -> dict:
    """SAR 이미지 딕셔너리 생성"""
    return {
        "shape": list(sar_image_db.shape),
        "data": _encode_sar_image(sar_image_db),
        "range_extent": range_extent.tolist(),
        "azimuth_extent": azimuth_extent.tolist(),
        "max_value": float(np.max(sar_image_db)),
        "min_value": float(np.min(sar_image_db)),
        "is_full_swath": is_full_swath
    }


@router.post("/process")
async def process_sar_image(request: SarImageProcessRequest):
    """
    SAR 이미지 처리 (RDA 알고리즘)
    
    Echo 신호 배열을 RDA 알고리즘으로 처리하여 SAR 이미지를 생성합니다.
    process_both=True인 경우 타겟 영역과 전체 영역 모두 반환합니다.
    """
    try:
        # 시스템 설정 생성
        config = request.config.to_sar_system_config()
        
        # Base64 디코딩
        echo_bytes = base64.b64decode(request.echo_data_base64)
        echo_float32 = np.frombuffer(echo_bytes, dtype=np.float32)
        
        # 복소수로 복원 [real, imag, real, imag, ...] 형태
        echo_data = echo_float32[::2] + 1j * echo_float32[1::2]
        
        # Shape 복원
        num_pulses, num_samples = request.shape
        echo_signals = echo_data.reshape(num_pulses, num_samples).astype(np.complex64)
        
        # 위성 속도 벡터
        satellite_velocity = np.array(request.satellite_velocity)
        
        # RDA Processor 생성
        rda_processor = RDAProcessor(config, satellite_velocity)
        
        # 두 영역 모두 처리하는 경우
        if request.process_both:
            target_result, full_result = rda_processor.process_both(
                echo_signals,
                dynamic_range=request.dynamic_range
            )
            
            target_dict = _create_sar_image_dict(*target_result, is_full_swath=False)
            full_dict = _create_sar_image_dict(*full_result, is_full_swath=True)
            
            return SarImageBothResponse(
                success=True,
                message="SAR 이미지 처리 완료 (타겟 영역 + 전체 영역)",
                target_region=target_dict,
                full_swath=full_dict
            )
        
        # 단일 영역 처리
        sar_image_db, range_extent, azimuth_extent = rda_processor.process(
            echo_signals,
            dynamic_range=request.dynamic_range,
            process_full_swath=request.process_full_swath
        )
        
        return SarImageResponse(
            success=True,
            message="SAR 이미지 처리 완료",
            shape=list(sar_image_db.shape),
            data=_encode_sar_image(sar_image_db),
            range_extent=range_extent.tolist(),
            azimuth_extent=azimuth_extent.tolist(),
            max_value=float(np.max(sar_image_db)),
            min_value=float(np.min(sar_image_db)),
            is_full_swath=request.process_full_swath
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
