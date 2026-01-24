"""
기하학 계산 유틸리티

위성-타겟 간 거리, 안테나 게인 등의 기하학 계산을 수행합니다.
"""

import numpy as np
from typing import Optional
from sar_simulator.common.constants import LIGHT_SPEED


def calc_distance_to_target(
    target_positions: np.ndarray,
    satellite_position: np.ndarray,
    satellite_position_rx: Optional[np.ndarray] = None
) -> np.ndarray:
    """
    위성에서 타겟까지의 거리 계산
    
    Parameters:
    -----------
    target_positions : np.ndarray
        타겟 위치 배열 (shape: [num_targets, 3], 단위: m)
    satellite_position : np.ndarray
        위성 위치 (shape: [3], 단위: m)
    satellite_position_rx : np.ndarray, optional
        수신기 위치 (shape: [3], 단위: m)
        None인 경우 송신기 위치와 동일
    
    Returns:
    --------
    np.ndarray
        거리 배열 (shape: [num_targets], 단위: m)
    """
    # 타겟과 위성 간 거리 계산
    R = np.linalg.norm(target_positions - satellite_position, axis=1)
    
    # 수신기 위치가 다른 경우 왕복 거리 계산
    if satellite_position_rx is not None:
        R_rx = np.linalg.norm(target_positions - satellite_position_rx, axis=1)
        R = R + R_rx
    
    return R


def calc_2way_range(
    target_positions: np.ndarray,
    satellite_position_tx: np.ndarray,
    satellite_position_rx: np.ndarray
) -> np.ndarray:
    """
    왕복 거리 계산
    
    Parameters:
    -----------
    target_positions : np.ndarray
        타겟 위치 배열 (shape: [num_targets, 3], 단위: m)
    satellite_position_tx : np.ndarray
        송신기 위치 (shape: [3], 단위: m)
    satellite_position_rx : np.ndarray
        수신기 위치 (shape: [3], 단위: m)
    
    Returns:
    --------
    np.ndarray
        왕복 거리 배열 (shape: [num_targets], 단위: m)
    """
    R_tx = np.linalg.norm(target_positions - satellite_position_tx, axis=1)
    R_rx = np.linalg.norm(target_positions - satellite_position_rx, axis=1)
    return R_tx + R_rx


def calc_time_delay(range_2way: np.ndarray) -> np.ndarray:
    """
    시간 지연 계산
    
    Parameters:
    -----------
    range_2way : np.ndarray
        왕복 거리 배열 (shape: [num_targets], 단위: m)
    
    Returns:
    --------
    np.ndarray
        시간 지연 배열 (shape: [num_targets], 단위: s)
    """
    return range_2way / LIGHT_SPEED


def calc_ambiguous_time_delay(
    time_delay: np.ndarray,
    pri: float
) -> np.ndarray:
    """
    모호한 시간 지연 계산 (PRI 모듈로)
    
    Parameters:
    -----------
    time_delay : np.ndarray
        시간 지연 배열 (shape: [num_targets], 단위: s)
    pri : float
        펄스 반복 간격 (단위: s)
    
    Returns:
    --------
    np.ndarray
        모호한 시간 지연 배열 (shape: [num_targets], 단위: s)
    """
    return time_delay % pri


def calc_antenna_gain_simple(
    target_positions: np.ndarray,
    satellite_position: np.ndarray,
    beam_direction: np.ndarray,
    beamwidth_el: float,
    beamwidth_az: float,
    max_gain: float = 1.0
) -> np.ndarray:
    """
    간단한 안테나 게인 계산 (가우시안 빔 모델)
    
    Parameters:
    -----------
    target_positions : np.ndarray
        타겟 위치 배열 (shape: [num_targets, 3], 단위: m)
    satellite_position : np.ndarray
        위성 위치 (shape: [3], 단위: m)
    beam_direction : np.ndarray
        빔 방향 벡터 (shape: [3])
    beamwidth_el : float
        고도 빔폭 (단위: deg)
    beamwidth_az : float
        방위 빔폭 (단위: deg)
    max_gain : float
        최대 게인 (기본값: 1.0)
    
    Returns:
    --------
    np.ndarray
        안테나 게인 배열 (shape: [num_targets])
    """
    # 타겟 방향 벡터 계산
    target_vectors = target_positions - satellite_position
    target_distances = np.linalg.norm(target_vectors, axis=1)
    target_directions = target_vectors / target_distances[:, np.newaxis]
    
    # 빔 방향과의 각도 계산
    cos_angle = np.dot(target_directions, beam_direction)
    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
    
    # 간단한 가우시안 빔 모델
    # TODO: 실제 안테나 패턴을 사용하도록 개선 필요
    gain = max_gain * np.exp(-2.0 * (angle ** 2) / ((np.deg2rad(beamwidth_el) / 2) ** 2))
    
    return gain
