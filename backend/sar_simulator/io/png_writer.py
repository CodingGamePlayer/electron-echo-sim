"""
PNG 이미지 저장 모듈

Echo 신호를 그레이스케일 PNG 이미지로 저장하는 기능을 제공합니다.
echo_simulator_cmd와 동일한 형태의 PNG 파일을 생성합니다.
"""

import numpy as np
from pathlib import Path
from typing import Optional
from PIL import Image
from scipy.ndimage import zoom


def save_echo_signals_as_grayscale_png(
    echo_signals: np.ndarray,
    output_path: Path,
    max_amplitude: Optional[float] = None,
    resample_ratio: float = 1.0
) -> None:
    """
    Echo 신호를 그레이스케일 PNG로 저장
    
    echo_simulator_cmd의 save_as_graypng_c_fn과 동일한 결과를 생성합니다.
    
    Parameters:
    -----------
    echo_signals : np.ndarray
        Echo 신호 배열 (shape: [num_pulses, num_samples], dtype: complex64)
    output_path : Path
        출력 PNG 파일 경로
    max_amplitude : float, optional
        최대 진폭 (None인 경우 자동 계산)
        이 값으로 정규화하여 0-255 범위로 변환
    resample_ratio : float
        리샘플링 비율 (기본값: 1.0, 리샘플링 없음)
        1.0보다 작으면 다운샘플링, 1.0보다 크면 업샘플링
    """
    # Magnitude 계산 (echo_simulator_cmd의 abs_store_2d_c_fn과 동일)
    magnitude_2d = np.abs(echo_signals).astype(np.float32)
    
    # 최대 진폭 계산 (제공되지 않은 경우)
    if max_amplitude is None:
        max_amplitude = np.max(magnitude_2d)
    
    # 리샘플링 (resample_ratio가 1.0이 아닌 경우)
    if resample_ratio != 1.0:
        # echo_simulator_cmd의 zoom 방식과 동일 (bilinear interpolation)
        magnitude_2d = zoom(magnitude_2d, resample_ratio, order=1)
    
    # 정규화: 0-255 범위로 변환
    # echo_simulator_cmd의 save_as_graypng_c_fn과 동일한 방식
    if max_amplitude > 0:
        normalized = (magnitude_2d / max_amplitude * 255.0).clip(0, 255)
    else:
        normalized = np.zeros_like(magnitude_2d, dtype=np.uint8)
    
    # uint8로 변환
    image_data = normalized.astype(np.uint8)
    
    # PIL Image로 변환 및 저장
    # echo_simulator_cmd는 (height, width) 순서로 저장하므로 그대로 사용
    image = Image.fromarray(image_data, mode='L')  # 'L' = grayscale
    
    # 출력 디렉토리 생성
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # PNG 저장 (압축 레벨 2, echo_simulator_cmd와 동일)
    image.save(output_path, 'PNG', compress_level=2)
    
    print(f"그레이스케일 PNG 저장 완료: {output_path}")
    print(f"  크기: {image_data.shape[0]} x {image_data.shape[1]} (pulses x samples)")
    print(f"  최대 진폭: {max_amplitude:.6e}")
    print(f"  리샘플링 비율: {resample_ratio}")
