"""
SAR Sensor Simulator

위성에서 Chirp 신호를 생성하고 송신하는 시뮬레이터입니다.
"""

from typing import Optional
import numpy as np
from sar_simulator.sensor.chirp_generator import ChirpGenerator
from sar_simulator.common.sar_system_config import SarSystemConfig


class SarSensorSimulator:
    """
    SAR Sensor Simulator 클래스
    
    위성에서 Chirp 신호를 생성하고 송신 신호를 시뮬레이션합니다.
    """
    
    def __init__(self, config: SarSystemConfig):
        """
        SarSensorSimulator 초기화
        
        Parameters:
        -----------
        config : SarSystemConfig
            SAR 시스템 설정
        """
        self.config = config
        self.chirp_generator = ChirpGenerator()
        
        # Chirp 세트 초기화
        self.chirp_generator.generate_set(
            bw=config.bw,
            taup=config.taup,
            fs=config.fs,
            chirp_set_size=64  # 기본값
        )
    
    def generate_chirp_signal(self) -> np.ndarray:
        """
        Chirp 신호 생성
        
        Returns:
        --------
        np.ndarray
            Chirp 신호 (shape: [num_samples_in_chirp], dtype: complex64)
        """
        return self.chirp_generator.get_chirp(0)
    
    def generate_chirp_set(self, chirp_set_size: int = 64) -> np.ndarray:
        """
        Chirp 세트 생성 (보간용)
        
        Parameters:
        -----------
        chirp_set_size : int, optional
            Chirp 세트 크기 (기본값: 64)
        
        Returns:
        --------
        np.ndarray
            Chirp 신호 세트 (shape: [chirp_set_size, num_samples_in_chirp], dtype: complex64)
        """
        return self.chirp_generator.generate_set(
            bw=self.config.bw,
            taup=self.config.taup,
            fs=self.config.fs,
            chirp_set_size=chirp_set_size
        )
    
    def get_chirp(self, index: int) -> np.ndarray:
        """
        특정 인덱스의 Chirp 신호 가져오기
        
        Parameters:
        -----------
        index : int
            Chirp 인덱스
        
        Returns:
        --------
        np.ndarray
            Chirp 신호
        """
        return self.chirp_generator.get_chirp(index)
