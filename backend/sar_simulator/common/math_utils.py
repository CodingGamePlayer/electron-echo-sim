"""
수학 유틸리티 함수

SAR 시뮬레이션에서 사용하는 수학 함수들을 제공합니다.
"""

import numpy as np
import sys


def dB(x, scale=20, dynamic_range=80, normalize=False):
    """
    신호를 dB 스케일로 변환
    
    echo_sim_cmd의 sardip_lib/math_util.py와 동일한 기능을 제공합니다.
    
    Parameters:
    -----------
    x : np.ndarray
        입력 신호 배열
    scale : float
        스케일 계수 (10: power, 20: amplitude)
    dynamic_range : float
        동적 범위 (dB)
    normalize : bool
        정규화 여부 (최대값을 0 dB로 설정)
    
    Returns:
    --------
    np.ndarray
        dB 스케일로 변환된 신호
    """
    # 0 또는 매우 작은 값 처리
    x = np.array(x, dtype=np.float64)
    x[x < sys.float_info.min] = sys.float_info.min
    
    # dB 변환
    out = scale * np.log10(x)
    max_v = np.max(out)
    
    # 동적 범위 제한
    if dynamic_range > 0:
        out[out < (max_v - dynamic_range)] = max_v - dynamic_range
    
    # 정규화
    if normalize:
        out = out - max_v
    
    return out


def dB10(x):
    """Power를 dB로 변환 (10*log10)"""
    return 10 * np.log10(x)


def dB20(x):
    """Amplitude를 dB로 변환 (20*log10)"""
    return dB10(x) * 2


def dB2Linear10(x):
    """dB를 linear power로 변환"""
    return 10 ** (x / 10)


def dB2Linear20(x):
    """dB를 linear amplitude로 변환"""
    return 10 ** (x / 20)
