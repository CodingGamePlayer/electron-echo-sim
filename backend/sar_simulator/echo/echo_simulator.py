"""
SAR Echo Simulator

Echo 신호 생성 및 타겟 반사 모델링을 수행하는 메인 시뮬레이터입니다.
"""

import numpy as np
from typing import Optional

from sar_simulator.common.sar_system_config import SarSystemConfig
from sar_simulator.common.target_model import TargetList
from sar_simulator.echo.echo_generator import EchoGenerator
from sar_simulator.sensor.sensor_simulator import SarSensorSimulator


class SarEchoSimulator:
    """
    SAR Echo Simulator 클래스
    
    Sensor Simulator에서 생성한 Chirp 신호를 받아 Echo 신호를 생성합니다.
    """
    
    def __init__(self, config: SarSystemConfig):
        """
        SarEchoSimulator 초기화
        
        Parameters:
        -----------
        config : SarSystemConfig
            SAR 시스템 설정
        """
        self.config = config
        self.sensor_simulator = SarSensorSimulator(config)
        self.echo_generator = EchoGenerator(config)
    
    def simulate_echo(
        self,
        target_list: TargetList,
        satellite_position: np.ndarray,
        satellite_velocity: np.ndarray,
        beam_direction: Optional[np.ndarray] = None,
        chirp_signal: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Echo 신호 시뮬레이션
        
        Parameters:
        -----------
        target_list : TargetList
            타겟 리스트
        satellite_position : np.ndarray
            위성 위치 (shape: [3], 단위: m)
        satellite_velocity : np.ndarray
            위성 속도 (shape: [3], 단위: m/s)
        beam_direction : np.ndarray, optional
            빔 방향 벡터 (shape: [3])
            None인 경우 기본 방향 사용
        chirp_signal : np.ndarray, optional
            Chirp 신호 (shape: [num_samples_in_chirp], dtype: complex64)
            None인 경우 자동 생성
        
        Returns:
        --------
        np.ndarray
            Echo 신호 (shape: [num_samples], dtype: complex64)
        """
        # Chirp 신호 생성 (제공되지 않은 경우)
        if chirp_signal is None:
            chirp_signal = self.sensor_simulator.generate_chirp_signal()
        
        # Echo 신호 생성
        echo_signal = self.echo_generator.generate(
            chirp_signal=chirp_signal,
            target_list=target_list,
            satellite_position=satellite_position,
            satellite_velocity=satellite_velocity,
            beam_direction=beam_direction
        )
        
        return echo_signal
    
    def simulate_multiple_pulses(
        self,
        target_list: TargetList,
        satellite_positions: np.ndarray,
        satellite_velocities: np.ndarray,
        beam_directions: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        여러 펄스에 대한 Echo 신호 시뮬레이션
        
        Parameters:
        -----------
        target_list : TargetList
            타겟 리스트
        satellite_positions : np.ndarray
            위성 위치 배열 (shape: [num_pulses, 3], 단위: m)
        satellite_velocities : np.ndarray
            위성 속도 배열 (shape: [num_pulses, 3], 단위: m/s)
        beam_directions : np.ndarray, optional
            빔 방향 벡터 배열 (shape: [num_pulses, 3])
        
        Returns:
        --------
        np.ndarray
            Echo 신호 배열 (shape: [num_pulses, num_samples], dtype: complex64)
        """
        num_pulses = satellite_positions.shape[0]
        echo_signals = np.zeros((num_pulses, self.config.num_samples), dtype=np.complex64)
        
        chirp_signal = self.sensor_simulator.generate_chirp_signal()
        
        for i in range(num_pulses):
            beam_dir = beam_directions[i] if beam_directions is not None else None
            
            echo_signals[i] = self.simulate_echo(
                target_list=target_list,
                satellite_position=satellite_positions[i],
                satellite_velocity=satellite_velocities[i],
                beam_direction=beam_dir,
                chirp_signal=chirp_signal
            )
        
        return echo_signals
