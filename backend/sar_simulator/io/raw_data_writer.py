"""
SAR Raw Data Writer

SAR Raw Data를 HDF5 형식으로 저장하는 모듈입니다.
"""

import h5py
import numpy as np
from typing import Optional, Dict, Any
from pathlib import Path

from sar_simulator.common.sar_system_config import SarSystemConfig


class RawDataWriter:
    """
    SAR Raw Data Writer 클래스
    
    Echo 신호를 HDF5 형식으로 저장합니다.
    """
    
    def __init__(self, filepath: str, config: SarSystemConfig):
        """
        RawDataWriter 초기화
        
        Parameters:
        -----------
        filepath : str
            저장할 HDF5 파일 경로
        config : SarSystemConfig
            SAR 시스템 설정
        """
        self.filepath = Path(filepath)
        self.config = config
        self.hdf_file: Optional[h5py.File] = None
        
        # 파일이 이미 존재하면 삭제
        if self.filepath.exists():
            self.filepath.unlink()
    
    def open(self):
        """HDF5 파일 열기"""
        if self.hdf_file is None:
            self.hdf_file = h5py.File(self.filepath, 'w')
            self._write_root_attributes()
    
    def close(self):
        """HDF5 파일 닫기"""
        if self.hdf_file is not None:
            self.hdf_file.close()
            self.hdf_file = None
    
    def __enter__(self):
        """Context manager 진입"""
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager 종료"""
        self.close()
    
    def _write_root_attributes(self):
        """루트 레벨 속성 작성"""
        if self.hdf_file is None:
            raise ValueError("HDF5 파일이 열려있지 않습니다. open()을 먼저 호출하세요.")
        
        # 기본 속성들
        self.hdf_file.attrs['Light Speed'] = 299792458.0
        self.hdf_file.attrs['Ellipsoid Designator'] = 'WGS84'
        self.hdf_file.attrs['Ellipsoid Semimajor Axis'] = 6378137.0
        self.hdf_file.attrs['Ellipsoid Semiminor Axis'] = 6356752.314245
        self.hdf_file.attrs['Product Type'] = 'SAR_RAW_DATA'
        self.hdf_file.attrs['Satellite Height'] = self.config.orbit_height
    
    def write_burst(
        self,
        group_name: str,
        echo_data: np.ndarray,
        satellite_positions: Optional[np.ndarray] = None,
        satellite_velocities: Optional[np.ndarray] = None,
        timestamps: Optional[np.ndarray] = None,
        **kwargs
    ):
        """
        Burst 데이터 작성
        
        Parameters:
        -----------
        group_name : str
            그룹 이름 (예: 'SSG00')
        echo_data : np.ndarray
            Echo 데이터 (shape: [num_pulses, num_samples], dtype: complex64)
        satellite_positions : np.ndarray, optional
            위성 위치 배열 (shape: [num_pulses, 3], 단위: m)
        satellite_velocities : np.ndarray, optional
            위성 속도 배열 (shape: [num_pulses, 3], 단위: m/s)
        timestamps : np.ndarray, optional
            타임스탬프 배열 (shape: [num_pulses], 단위: s)
        **kwargs
            추가 속성들
        """
        if self.hdf_file is None:
            raise ValueError("HDF5 파일이 열려있지 않습니다. open()을 먼저 호출하세요.")
        
        # 그룹 생성
        if group_name not in self.hdf_file:
            group = self.hdf_file.create_group(group_name)
            self._write_group_attributes(group)
        else:
            group = self.hdf_file[group_name]
        
        # Burst 이름
        burst_name = f"{group_name}/B000"
        
        # 데이터셋 생성 (복소수를 실수/허수로 분리)
        if echo_data.dtype == np.complex64:
            data_shape = (echo_data.shape[0], echo_data.shape[1], 2)
            dataset = group.create_dataset(
                'B000',
                shape=data_shape,
                dtype=np.float32
            )
            dataset[:, :, 0] = echo_data.real
            dataset[:, :, 1] = echo_data.imag
        else:
            dataset = group.create_dataset('B000', data=echo_data)
        
        # Burst 속성 작성
        self._write_burst_attributes(group, burst_name, echo_data.shape[0])
        
        # ADX 데이터 작성 (위성 상태 벡터 등)
        if satellite_positions is not None or satellite_velocities is not None or timestamps is not None:
            num_pulses = echo_data.shape[0]
            adx_data = np.zeros((num_pulses, 15), dtype=np.float64)
            
            if timestamps is not None:
                adx_data[:, 0] = timestamps
                adx_data[:, 1] = timestamps + (self.config.swst)
            
            if satellite_positions is not None:
                adx_data[:, 2:5] = satellite_positions
            
            if satellite_velocities is not None:
                adx_data[:, 5:8] = satellite_velocities
            
            # 자세 및 각속도는 0으로 설정 (필요시 추가)
            # adx_data[:, 8:12] = attitude quaternions
            # adx_data[:, 12:15] = angular velocity
            
            group.create_dataset('B000_adx', data=adx_data)
    
    def _write_group_attributes(self, group: h5py.Group):
        """그룹 속성 작성"""
        group.attrs['Beam ID'] = self.config.beam_id
        group.attrs['Radar Frequency'] = self.config.fc
        group.attrs['Radar Wavelength'] = self.config.wavelength
        group.attrs['PRF'] = self.config.prf
        group.attrs['Sampling Rate'] = self.config.fs
        group.attrs['Range Chirp Length'] = self.config.taup
        group.attrs['Range Chirp Rate'] = self.config.chirp_rate
        group.attrs['Echo Sampling Window Length'] = self.config.num_samples
    
    def _write_burst_attributes(self, group: h5py.Group, burst_name: str, num_pulses: int):
        """Burst 속성 작성"""
        burst = group[burst_name.split('/')[-1]]
        burst.attrs['Lines per Burst'] = num_pulses
        burst.attrs['Range Chirp Samples'] = self.config.num_samples_in_chirp
