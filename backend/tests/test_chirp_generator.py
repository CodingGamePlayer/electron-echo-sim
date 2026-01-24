"""
ChirpGenerator 테스트

Chirp 신호 생성기의 동작을 테스트합니다.
"""

import numpy as np
import pytest
from sar_simulator.sensor.chirp_generator import ChirpGenerator


def test_chirp_generator_basic():
    """기본 Chirp 생성 테스트"""
    generator = ChirpGenerator()
    
    bw = 150e6  # 150 MHz
    taup = 10e-6  # 10 μs
    fs = 250e6  # 250 MHz
    
    chirp = generator.generate(bw, taup, fs, num_chirps=1)
    
    assert chirp.shape == (1, int(taup * fs))
    assert chirp.dtype == np.complex64
    assert np.allclose(np.abs(chirp), 1.0)  # 진폭이 1이어야 함


def test_chirp_generator_set():
    """Chirp 세트 생성 테스트"""
    generator = ChirpGenerator()
    
    bw = 150e6
    taup = 10e-6
    fs = 250e6
    chirp_set_size = 64
    
    chirp_set = generator.generate_set(bw, taup, fs, chirp_set_size)
    
    assert chirp_set.shape == (chirp_set_size, int(taup * fs))
    assert chirp_set.dtype == np.complex64
    assert chirp_set.flags['C_CONTIGUOUS']  # C-contiguous 배열이어야 함


def test_chirp_generator_get_chirp():
    """특정 인덱스 Chirp 가져오기 테스트"""
    generator = ChirpGenerator()
    
    bw = 150e6
    taup = 10e-6
    fs = 250e6
    chirp_set_size = 64
    
    generator.generate_set(bw, taup, fs, chirp_set_size)
    
    chirp0 = generator.get_chirp(0)
    chirp32 = generator.get_chirp(32)
    
    assert chirp0.shape == (int(taup * fs),)
    assert chirp32.shape == (int(taup * fs),)
    assert not np.array_equal(chirp0, chirp32)  # 다른 Chirp여야 함


def test_chirp_generator_invalid_index():
    """잘못된 인덱스 테스트"""
    generator = ChirpGenerator()
    
    bw = 150e6
    taup = 10e-6
    fs = 250e6
    
    generator.generate_set(bw, taup, fs, 64)
    
    with pytest.raises(ValueError):
        generator.get_chirp(64)  # 범위를 벗어난 인덱스
    
    with pytest.raises(ValueError):
        generator.get_chirp(-1)  # 음수 인덱스


if __name__ == "__main__":
    pytest.main([__file__])
