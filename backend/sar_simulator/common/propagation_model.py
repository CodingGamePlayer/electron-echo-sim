"""
전파 모델

전파 손실 및 대기 손실을 계산하는 모듈입니다.
"""

import numpy as np
from typing import Optional


def calc_atmospheric_loss(
    beam_vector: Optional[np.ndarray] = None,
    satellite_position: Optional[np.ndarray] = None
) -> float:
    """
    대기 손실 계산
    
    현재는 간단한 모델로 1.0 (손실 없음)을 반환합니다.
    향후 대기 모델을 추가할 수 있습니다.
    
    Parameters:
    -----------
    beam_vector : np.ndarray, optional
        빔 벡터 (shape: [3])
    satellite_position : np.ndarray, optional
        위성 위치 (shape: [3], 단위: m)
    
    Returns:
    --------
    float
        대기 손실 (기본값: 1.0, 손실 없음)
    """
    # TODO: 실제 대기 손실 모델 구현
    return 1.0


def calc_path_loss(
    range_2way: np.ndarray,
    wavelength: float
) -> np.ndarray:
    """
    경로 손실 계산 (자유 공간 전파 손실)
    
    Parameters:
    -----------
    range_2way : np.ndarray
        왕복 거리 배열 (shape: [num_targets], 단위: m)
    wavelength : float
        파장 (단위: m)
    
    Returns:
    --------
    np.ndarray
        경로 손실 배열 (shape: [num_targets])
    """
    # 자유 공간 경로 손실: (4πR/λ)²
    # 여기서는 역수 (손실 계수)를 반환
    return (wavelength / (4.0 * np.pi * (range_2way / 2.0))) ** 2
