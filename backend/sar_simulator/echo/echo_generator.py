"""
Echo 신호 생성기

Chirp 신호와 타겟 정보를 기반으로 Echo 신호를 생성합니다.
"""

import numpy as np
from typing import Optional
from math import sqrt, pi

from sar_simulator.common.constants import LIGHT_SPEED, BOLZMAN_CONST, PI
from sar_simulator.common.sar_system_config import SarSystemConfig
from sar_simulator.common.target_model import TargetList
from sar_simulator.common.geometry_utils import (
    calc_distance_to_target,
    calc_2way_range,
    calc_time_delay,
    calc_ambiguous_time_delay,
    calc_antenna_gain_simple
)
from sar_simulator.common.propagation_model import (
    calc_atmospheric_loss,
    calc_path_loss
)


class EchoGenerator:
    """
    Echo 신호 생성기 클래스
    
    Chirp 신호를 받아 타겟에서 반사된 Echo 신호를 생성합니다.
    """
    
    def __init__(self, config: SarSystemConfig):
        """
        EchoGenerator 초기화
        
        Parameters:
        -----------
        config : SarSystemConfig
            SAR 시스템 설정
        """
        self.config = config
    
    def generate(
        self,
        chirp_signal: np.ndarray,
        target_list: TargetList,
        satellite_position: np.ndarray,
        satellite_velocity: np.ndarray,
        beam_direction: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Echo 신호 생성
        
        Parameters:
        -----------
        chirp_signal : np.ndarray
            Chirp 신호 (shape: [num_samples_in_chirp], dtype: complex64)
        target_list : TargetList
            타겟 리스트
        satellite_position : np.ndarray
            위성 위치 (shape: [3], 단위: m)
        satellite_velocity : np.ndarray
            위성 속도 (shape: [3], 단위: m/s)
        beam_direction : np.ndarray, optional
            빔 방향 벡터 (shape: [3])
            None인 경우 기본 방향 사용
        
        Returns:
        --------
        np.ndarray
            Echo 신호 (shape: [num_samples], dtype: complex64)
        """
        if len(target_list) == 0:
            # 타겟이 없으면 제로 신호 반환
            return np.zeros(self.config.num_samples, dtype=np.complex64)
        
        # 타겟 배열로 변환
        target_array = target_list.to_array()
        num_targets = len(target_list)
        
        # 거리 계산
        R = calc_distance_to_target(
            target_array[:, 0:3],
            satellite_position
        )
        
        # 왕복 거리 (송수신 동일 위치 가정)
        R_2way = 2.0 * R
        
        # 시간 지연 계산
        td = calc_time_delay(R_2way)
        td_amb = calc_ambiguous_time_delay(td, self.config.pri)
        
        # 안테나 게인 계산
        if beam_direction is None:
            # 기본 빔 방향 (지구 중심 방향)
            beam_direction = -satellite_position / np.linalg.norm(satellite_position)
        
        ant_gain = calc_antenna_gain_simple(
            target_array[:, 0:3],
            satellite_position,
            beam_direction,
            self.config.beamwidth_el,
            self.config.beamwidth_az,
            max_gain=1.0
        )
        
        # 대기 손실
        atmospheric_loss = calc_atmospheric_loss(beam_direction, satellite_position)
        
        # 신호 세기 계수 계산
        # c1 = Pt * λ² * G² / ((4π)³ * loss * atmospheric_loss)
        loss_linear = self.config.get_loss_linear()
        c1 = (self.config.Pt * self.config.wavelength ** 2 * ant_gain ** 2 /
              ((4.0 * PI) ** 3 * loss_linear * atmospheric_loss))
        
        # 타겟별 계수
        # c = sqrt(c1 * σ / (R_2way/2)⁴)
        c = np.sqrt(c1 * target_array[:, 3] / ((R_2way / 2.0) ** 4))
        
        # 노이즈 임계값
        noise_threshold = self.config.get_noise_threshold(num_pulses=1)
        
        # 유효한 타겟만 선택 (노이즈 임계값 이상)
        valid_mask = c > noise_threshold
        valid_indices = np.where(valid_mask)[0]
        
        if len(valid_indices) == 0:
            return np.zeros(self.config.num_samples, dtype=np.complex64)
        
        # Echo 신호 초기화
        echo_signal = np.zeros(self.config.num_samples, dtype=np.complex64)
        
        # 각 타겟에 대해 Echo 신호 생성
        for idx in valid_indices:
            # 최종 계수
            # coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
            coeff = (c[idx] * np.exp(-1j * 2.0 * PI * self.config.fc * td[idx]) *
                     sqrt(self.config.G_recv))
            
            # 샘플 위치 계산
            sample_pos = (td_amb[idx] - self.config.swst) * self.config.fs
            idx0 = int(np.ceil(sample_pos))
            idx1 = idx0 + len(chirp_signal)
            
            # Chirp 신호를 Echo 신호에 추가
            if idx1 <= 0 or idx0 >= self.config.num_samples:
                continue
            
            if idx0 < 0:
                # Chirp의 일부만 사용
                echo_signal[0:idx1] += chirp_signal[-idx0:] * coeff
            elif idx1 > self.config.num_samples:
                # Chirp의 일부만 사용
                echo_signal[idx0:] += chirp_signal[:self.config.num_samples - idx0] * coeff
            else:
                # 전체 Chirp 사용
                echo_signal[idx0:idx1] += chirp_signal * coeff
        
        return echo_signal
