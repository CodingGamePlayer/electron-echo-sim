"""
Chirp 신호 생성기

LFM (Linear Frequency Modulated) Chirp 신호를 생성하는 모듈입니다.
"""

import numpy as np
from typing import Optional
from sar_simulator.common.constants import PI


class ChirpGenerator:
    """
    Chirp 신호 생성기 클래스
    
    LFM Chirp 신호를 생성하며, 보간을 위한 Chirp 세트도 생성할 수 있습니다.
    """
    
    def __init__(self):
        """ChirpGenerator 초기화"""
        self.chirp_set: Optional[np.ndarray] = None
        self.chirp_set_size: int = 64
    
    def generate(
        self,
        bw: float,
        taup: float,
        fs: float,
        num_chirps: int = 1
    ) -> np.ndarray:
        """
        Chirp 신호 세트 생성
        
        Parameters:
        -----------
        bw : float
            대역폭 (Hz)
        taup : float
            펄스 폭 (s)
        fs : float
            샘플링 주파수 (Hz)
        num_chirps : int, optional
            생성할 Chirp 개수 (보간용, 기본값: 1)
        
        Returns:
        --------
        np.ndarray
            Chirp 신호 세트 (shape: [num_chirps, num_samples_in_pulse], dtype: complex64)
        """
        # Chirp rate 계산
        chirp_rate = bw / taup
        
        # 샘플링 간격 계산
        dt = 1.0 / fs / num_chirps
        
        # 펄스 내 샘플 수
        num_samples_in_pulse = int(taup * fs)
        
        # 전체 샘플 수
        n = num_samples_in_pulse * num_chirps
        
        # 시간 벡터 생성 (중심을 0으로)
        t = (np.arange(n) - n / 2) * dt
        
        # Chirp 신호 생성 (baseband)
        # s(t) = exp(j * π * Kr * t²)
        s = np.exp(1j * PI * chirp_rate * t ** 2).astype(np.complex64)
        
        # Chirp 세트로 재구성
        chirps = np.reshape(s, (num_chirps, num_samples_in_pulse))
        
        # C-contiguous 배열로 변환 (성능 최적화)
        if not chirps.flags['C_CONTIGUOUS']:
            chirps = np.ascontiguousarray(chirps)
        
        return chirps
    
    def generate_set(
        self,
        bw: float,
        taup: float,
        fs: float,
        chirp_set_size: int = 64
    ) -> np.ndarray:
        """
        보간을 위한 Chirp 세트 생성
        
        Parameters:
        -----------
        bw : float
            대역폭 (Hz)
        taup : float
            펄스 폭 (s)
        fs : float
            샘플링 주파수 (Hz)
        chirp_set_size : int, optional
            Chirp 세트 크기 (기본값: 64)
        
        Returns:
        --------
        np.ndarray
            Chirp 신호 세트 (shape: [chirp_set_size, num_samples_in_pulse], dtype: complex64)
        """
        self.chirp_set_size = chirp_set_size
        self.chirp_set = self.generate(bw, taup, fs, chirp_set_size)
        return self.chirp_set
    
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
            Chirp 신호 (shape: [num_samples_in_pulse], dtype: complex64)
        
        Raises:
        -------
        ValueError
            인덱스가 범위를 벗어난 경우
        """
        if self.chirp_set is None:
            raise ValueError("Chirp 세트가 초기화되지 않았습니다. generate_set()을 먼저 호출하세요.")
        
        if index < 0 or index >= len(self.chirp_set):
            raise ValueError(f"인덱스 {index}가 범위 [0, {len(self.chirp_set)})를 벗어났습니다.")
        
        return self.chirp_set[index]
    
    def reset(self):
        """Chirp 세트 초기화"""
        self.chirp_set = None
        self.chirp_set_size = 64
