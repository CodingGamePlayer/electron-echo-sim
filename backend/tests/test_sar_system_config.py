"""
SarSystemConfig 테스트

SAR 시스템 설정의 유효성 검증을 테스트합니다.
"""

import pytest
from sar_simulator.common.sar_system_config import SarSystemConfig
from sar_simulator.common.constants import LIGHT_SPEED


def test_valid_config():
    """유효한 설정 테스트"""
    config = SarSystemConfig(
        fc=5.4e9,
        bw=150e6,
        taup=10e-6,
        fs=250e6,
        prf=5000,
        swst=10e-6,
        swl=50e-6,
        orbit_height=517e3,
        antenna_width=4.0,
        antenna_height=0.5
    )
    
    assert config.wavelength == LIGHT_SPEED / config.fc
    assert config.pri == 1.0 / config.prf
    assert config.chirp_rate == config.bw / config.taup
    assert config.dt == 1.0 / config.fs
    assert config.swet == config.swst + config.swl


def test_invalid_fc():
    """잘못된 중심 주파수 테스트"""
    with pytest.raises(ValueError):
        SarSystemConfig(
            fc=0,  # 잘못된 값
            bw=150e6,
            taup=10e-6,
            fs=250e6,
            prf=5000,
            swst=10e-6,
            swl=50e-6,
            orbit_height=517e3,
            antenna_width=4.0,
            antenna_height=0.5
        )


def test_nyquist_violation():
    """나이키스트 샘플링 위반 테스트"""
    with pytest.raises(ValueError):
        SarSystemConfig(
            fc=5.4e9,
            bw=150e6,
            taup=10e-6,
            fs=100e6,  # 나이키스트율 미만
            prf=5000,
            swst=10e-6,
            swl=50e-6,
            orbit_height=517e3,
            antenna_width=4.0,
            antenna_height=0.5
        )


if __name__ == "__main__":
    pytest.main([__file__])
