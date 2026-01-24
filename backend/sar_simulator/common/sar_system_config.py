"""
SAR 시스템 설정

SAR 시스템의 파라미터를 관리하는 클래스입니다.
"""

from dataclasses import dataclass
from typing import Optional
from sar_simulator.common.constants import LIGHT_SPEED


@dataclass
class SarSystemConfig:
    """
    SAR 시스템 설정 클래스
    
    SAR 시스템의 모든 파라미터를 포함합니다.
    """
    
    # 기본 주파수 파라미터
    fc: float  # 반송파 주파수 (Hz)
    bw: float  # 대역폭 (Hz)
    fs: float  # 샘플링 주파수 (Hz)
    
    # 펄스 파라미터
    taup: float  # 펄스 폭 (s)
    prf: float  # 펄스 반복 주파수 (Hz)
    
    # 샘플링 윈도우 파라미터
    swst: float  # 샘플링 윈도우 시작 시간 (s)
    swl: float  # 샘플링 윈도우 길이 (s)
    
    # 위성 파라미터
    orbit_height: float  # 궤도 높이 (m)
    
    # 안테나 파라미터
    antenna_width: float  # 안테나 폭 (m)
    antenna_height: float  # 안테나 높이 (m)
    antenna_roll_angle: float = 0.0  # 안테나 롤 각도 (deg)
    antenna_pitch_angle: float = 0.0  # 안테나 피치 각도 (deg)
    antenna_yaw_angle: float = 0.0  # 안테나 요 각도 (deg)
    
    # 전력 및 게인 파라미터
    Pt: float = 1000.0  # 송신 전력 (W)
    G_recv: float = 1.0  # 수신 안테나 게인
    NF: float = 3.0  # 노이즈 지수 (dB)
    Loss: float = 2.0  # 시스템 손실 (dB)
    Tsys: float = 290.0  # 시스템 온도 (K)
    
    # ADC 파라미터
    adc_bits: int = 12  # ADC 비트 수
    
    # 빔 파라미터
    beam_id: str = "Beam0000"  # 빔 ID
    
    def __post_init__(self):
        """초기화 후 검증 및 계산된 값 설정"""
        self._validate()
        self._calculate_derived_params()
    
    def _validate(self):
        """파라미터 유효성 검증"""
        if self.fc <= 0:
            raise ValueError("fc (반송파 주파수)는 0보다 커야 합니다.")
        if self.bw <= 0:
            raise ValueError("bw (대역폭)는 0보다 커야 합니다.")
        if self.fs <= 0:
            raise ValueError("fs (샘플링 주파수)는 0보다 커야 합니다.")
        if self.taup <= 0:
            raise ValueError("taup (펄스 폭)는 0보다 커야 합니다.")
        if self.prf <= 0:
            raise ValueError("prf (펄스 반복 주파수)는 0보다 커야 합니다.")
        if self.swl <= 0:
            raise ValueError("swl (샘플링 윈도우 길이)는 0보다 커야 합니다.")
        if self.orbit_height <= 0:
            raise ValueError("orbit_height (궤도 높이)는 0보다 커야 합니다.")
        
        # 나이키스트 샘플링 검증
        if self.fs < 2 * self.bw:
            raise ValueError(f"샘플링 주파수(fs={self.fs})는 나이키스트율(2*bw={2*self.bw}) 이상이어야 합니다.")
    
    def _calculate_derived_params(self):
        """파생 파라미터 계산"""
        # 파장 계산
        self.wavelength: float = LIGHT_SPEED / self.fc
        
        # PRI 계산
        self.pri: float = 1.0 / self.prf
        
        # Chirp rate 계산
        self.chirp_rate: float = self.bw / self.taup
        
        # 샘플링 간격 계산
        self.dt: float = 1.0 / self.fs
        
        # 샘플 수 계산
        self.num_samples_in_chirp: int = int(self.taup * self.fs)
        self.num_samples: int = int(self.swl * self.fs)
        
        # 샘플링 윈도우 종료 시간
        self.swet: float = self.swst + self.swl
        
        # 빔폭 계산 (안테나 크기 기반)
        from sar_simulator.common.constants import RAD2DEG
        self.beamwidth_az: float = (self.wavelength / self.antenna_width) * RAD2DEG
        self.beamwidth_el: float = (self.wavelength / self.antenna_height) * RAD2DEG
    
    def get_loss_linear(self) -> float:
        """손실을 선형 스케일로 변환"""
        import numpy as np
        return 10.0 ** ((self.NF + self.Loss) / 10.0)
    
    def get_noise_threshold(self, num_pulses: int) -> float:
        """노이즈 임계값 계산"""
        import numpy as np
        from sar_simulator.common.constants import BOLZMAN_CONST
        return np.sqrt(BOLZMAN_CONST * self.Tsys / self.num_samples / num_pulses)
