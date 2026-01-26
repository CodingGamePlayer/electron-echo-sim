"""
RDA (Range Doppler Algorithm) 프로세서

SAR Echo 신호를 SAR 이미지로 변환하는 RDA 알고리즘을 구현합니다.
echo_sim_cmd의 conn_veri_simple_sarp.py를 기반으로 구현되었습니다.
"""

import numpy as np
from numpy.fft import fftshift, fft, ifft
from scipy.interpolate import interp1d
from numpy import hamming
from typing import Tuple, Optional

from sar_simulator.common.sar_system_config import SarSystemConfig
from sar_simulator.common.constants import LIGHT_SPEED, PI
from sar_simulator.common.math_utils import dB


class RDAProcessor:
    """
    RDA (Range Doppler Algorithm) 프로세서
    
    Echo 신호 배열을 SAR 이미지로 변환합니다.
    """
    
    def __init__(self, config: SarSystemConfig, satellite_velocity: Optional[np.ndarray] = None):
        """
        RDAProcessor 초기화
        
        Parameters:
        -----------
        config : SarSystemConfig
            SAR 시스템 설정
        satellite_velocity : np.ndarray, optional
            위성 속도 벡터 (shape: [3], m/s)
            None인 경우 config에서 계산된 값 사용
        """
        self.config = config
        self.satellite_velocity = satellite_velocity
        
        # 위성 속도 크기 계산
        if satellite_velocity is not None:
            self.V = np.linalg.norm(satellite_velocity)
        else:
            # 기본값: 궤도 속도 근사
            self.V = np.sqrt(398600.4418e9 / (6378137.0 + config.orbit_height))
        
        # 파생 파라미터
        self.wavelength = config.wavelength
        self.fc = config.fc
        self.bw = config.bw
        self.taup = config.taup
        self.fs = config.fs
        self.prf = config.prf
        self.swst = config.swst
        self.swl = config.swl
        self.dt = 1.0 / config.fs
        
        # Chirp rate
        self.Kr = self.bw / self.taup
        
        # Range resolution
        self.dr = LIGHT_SPEED * self.dt / 2.0
        
        # Beamwidth (azimuth 방향, 라디안으로 변환)
        from sar_simulator.common.constants import DEG2RAD
        self.beamwidth_az = config.beamwidth_az * DEG2RAD
    
    def process(
        self,
        echo_signals: np.ndarray,
        dynamic_range: float = 50.0,
        mid_range_index: Optional[int] = None,
        process_full_swath: bool = False
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        전체 RDA 알고리즘 실행
        
        Parameters:
        -----------
        echo_signals : np.ndarray
            Echo 신호 배열 (shape: [num_pulses, num_samples], dtype: complex64)
        dynamic_range : float
            SAR 이미지 동적 범위 (dB)
        mid_range_index : int, optional
            중간 range 인덱스 (None인 경우 자동 계산, process_full_swath=True일 때 무시)
        process_full_swath : bool
            전체 swath 처리 여부 (False: 타겟 영역만, True: 전체 영역)
        
        Returns:
        --------
        sar_image_db : np.ndarray
            SAR 이미지 (dB 스케일, shape: [azimuth_samples, range_samples])
        range_extent : np.ndarray
            Range 범위 [min, max] (m)
        azimuth_extent : np.ndarray
            Azimuth 범위 [min, max] (m)
        """
        num_pulses, num_range_samples = echo_signals.shape
        
        # 1. Pulse Compression
        pulse_compressed = self.pulse_compression(echo_signals)
        
        # 2. Range 계산
        r = LIGHT_SPEED * self.swst / 2.0 + np.arange(pulse_compressed.shape[1]) * self.dr
        
        # 3. 영역 선택
        if process_full_swath:
            # 전체 영역 사용
            r1 = r
        else:
            # 중간 range 선택 (타겟이 있는 영역)
            if mid_range_index is None:
                # 타겟 위치 찾기 (최대값 기준)
                max_pulse_idx = min(20, num_pulses - 1)
                max_index = np.argmax(np.abs(pulse_compressed[max_pulse_idx, :]))
                max_index = max(max_index, 256)
                max_index = min(max_index, pulse_compressed.shape[1] - 256)
                mid_range_index = max_index
            
            # 중간 영역 추출 (512 샘플)
            range_window = 256
            pulse_compressed = pulse_compressed[:, mid_range_index-range_window:mid_range_index+range_window]
            r1 = r[mid_range_index-range_window:mid_range_index+range_window]
        
        # 4. Range-Doppler Map 생성
        rd = self.range_doppler_map(pulse_compressed)
        
        # 5. RCMC (Range Cell Migration Correction)
        rd = self.rcmc(rd, r1)
        
        # 6. Azimuth Compression
        sar_image = self.azimuth_compression(rd, r1)
        
        # 7. dB 변환
        sar_image_db = dB(np.abs(sar_image), scale=20, dynamic_range=dynamic_range)
        
        # 8. Azimuth 범위 계산
        az_fft_length = rd.shape[0]
        az = (np.arange(az_fft_length) - az_fft_length / 2) * self.config.pri * self.V
        
        range_extent = np.array([r1[0], r1[-1]])
        azimuth_extent = np.array([az[0], az[-1]])
        
        return sar_image_db, range_extent, azimuth_extent
    
    def process_both(
        self,
        echo_signals: np.ndarray,
        dynamic_range: float = 50.0
    ) -> Tuple[
        Tuple[np.ndarray, np.ndarray, np.ndarray],
        Tuple[np.ndarray, np.ndarray, np.ndarray]
    ]:
        """
        타겟 영역과 전체 영역 모두 처리
        
        Parameters:
        -----------
        echo_signals : np.ndarray
            Echo 신호 배열 (shape: [num_pulses, num_samples], dtype: complex64)
        dynamic_range : float
            SAR 이미지 동적 범위 (dB)
        
        Returns:
        --------
        target_result : Tuple[np.ndarray, np.ndarray, np.ndarray]
            타겟 영역 SAR 이미지 결과 (sar_image_db, range_extent, azimuth_extent)
        full_result : Tuple[np.ndarray, np.ndarray, np.ndarray]
            전체 영역 SAR 이미지 결과 (sar_image_db, range_extent, azimuth_extent)
        """
        # 타겟 영역 처리
        target_result = self.process(
            echo_signals,
            dynamic_range=dynamic_range,
            process_full_swath=False
        )
        
        # 전체 영역 처리
        full_result = self.process(
            echo_signals,
            dynamic_range=dynamic_range,
            process_full_swath=True
        )
        
        return target_result, full_result
    
    def pulse_compression(self, echo_signals: np.ndarray) -> np.ndarray:
        """
        Pulse Compression (Range 방향 압축)
        
        Parameters:
        -----------
        echo_signals : np.ndarray
            Echo 신호 배열 (shape: [num_pulses, num_samples])
        
        Returns:
        --------
        pulse_compressed : np.ndarray
            압축된 신호 (shape: [num_pulses, fft_len])
        """
        num_pulses, num_range_samples = echo_signals.shape
        
        # Chirp 참조 신호 생성
        t = np.arange(-self.taup/2, self.taup/2, self.dt)
        ref = np.exp(1j * PI * self.Kr * t**2)
        
        # FFT 길이 계산
        fft_len = 2 ** int(np.ceil(np.log2(len(ref) + num_range_samples - 1)))
        
        # 참조 신호의 FFT (conjugate)
        f_ref = np.conj(fft(ref, fft_len))
        
        # 각 pulse에 대해 압축 수행
        pulse_compressed = np.zeros((num_pulses, fft_len), dtype=np.complex64)
        for p in range(num_pulses):
            f_sig = fft(echo_signals[p, :], fft_len)
            pulse_compressed[p, :] = ifft(f_sig * f_ref)
        
        return pulse_compressed
    
    def range_doppler_map(self, pulse_compressed: np.ndarray) -> np.ndarray:
        """
        Range-Doppler Map 생성
        
        Parameters:
        -----------
        pulse_compressed : np.ndarray
            압축된 신호 (shape: [num_pulses, num_range_samples])
        
        Returns:
        --------
        rd : np.ndarray
            Range-Doppler 맵 (shape: [az_fft_length, num_range_samples])
        """
        num_pulses, num_range_samples = pulse_compressed.shape
        
        # Swath width 계산
        swath_width = LIGHT_SPEED * (self.swl - self.taup) / 2.0
        
        # Azimuth 참조 길이 계산
        r_max = LIGHT_SPEED * self.swst / 2.0 + num_range_samples * self.dr
        SAL = r_max * np.sin(self.beamwidth_az)
        SAT = SAL / self.V
        az_ref_length = int(SAT * self.prf)
        
        # Azimuth FFT 길이 계산
        az_fft_length = 2 ** int(np.ceil(np.log2(az_ref_length + num_pulses - 1)))
        
        # Azimuth 방향 FFT
        rd = fft(pulse_compressed, az_fft_length, axis=0)
        
        return rd
    
    def rcmc(self, rd: np.ndarray, r1: np.ndarray) -> np.ndarray:
        """
        RCMC (Range Cell Migration Correction)
        
        Parameters:
        -----------
        rd : np.ndarray
            Range-Doppler 맵 (shape: [az_fft_length, num_range_samples])
        r1 : np.ndarray
            Range 배열 (m)
        
        Returns:
        --------
        rd_corrected : np.ndarray
            RCMC 보정된 Range-Doppler 맵
        """
        az_fft_length, num_range_samples = rd.shape
        
        # Doppler 주파수 배열
        fd = np.concatenate([
            (np.arange(az_fft_length // 2) / az_fft_length * self.prf),
            (np.arange(-az_fft_length // 2, 0) / az_fft_length * self.prf)
        ])
        
        # 각 Doppler 주파수에 대해 RCMC 수행
        rd_corrected = np.zeros_like(rd, dtype=np.complex64)
        for a in range(az_fft_length):
            # Range migration 계산
            ri = r1 / np.sqrt(1 - (fd[a] * self.wavelength / (2 * self.V))**2)
            
            # 보간 수행
            interp_func = interp1d(
                r1, rd[a, :],
                kind='cubic',
                bounds_error=False,
                fill_value=0
            )
            rd_corrected[a, :] = interp_func(ri)
        
        return rd_corrected
    
    def azimuth_compression(self, rd: np.ndarray, r1: np.ndarray) -> np.ndarray:
        """
        Azimuth Compression
        
        Parameters:
        -----------
        rd : np.ndarray
            RCMC 보정된 Range-Doppler 맵 (shape: [az_fft_length, num_range_samples])
        r1 : np.ndarray
            Range 배열 (m)
        
        Returns:
        --------
        sar_image : np.ndarray
            SAR 이미지 (shape: [az_fft_length, num_range_samples])
        """
        az_fft_length, num_range_samples = rd.shape
        
        # Doppler 주파수 배열
        fd = np.concatenate([
            (np.arange(az_fft_length // 2) / az_fft_length * self.prf),
            (np.arange(-az_fft_length // 2, 0) / az_fft_length * self.prf)
        ])
        
        # SAR 이미지 초기화
        sar_image = np.zeros_like(rd, dtype=np.complex64)
        
        # 각 range에 대해 azimuth 압축 수행
        for ri in range(num_range_samples):
            # Doppler rate 계산
            Ka = 2 * self.V**2 / r1[ri] / self.wavelength
            
            # Azimuth 참조 함수
            f_az_ref = np.exp(-1j * PI * fd**2 / Ka)
            
            # 압축 수행
            sar_image[:, ri] = fftshift(ifft(rd[:, ri] * f_az_ref))
        
        return sar_image
