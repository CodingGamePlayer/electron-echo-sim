"""
통합 테스트

전체 시스템의 통합 동작을 테스트합니다.
"""

import numpy as np
import pytest
from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.sensor import SarSensorSimulator
from sar_simulator.echo import SarEchoSimulator


def test_end_to_end_simulation():
    """전체 시뮬레이션 파이프라인 테스트"""
    # 설정
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
    
    # Sensor Simulator
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    
    assert chirp_signal.shape == (config.num_samples_in_chirp,)
    assert chirp_signal.dtype == np.complex64
    
    # 타겟 정의
    satellite_position = np.array([6378137.0 + 517000.0, 0.0, 0.0])
    satellite_velocity = np.array([0.0, 7266.0, 0.0])
    target_position = np.array([6378137.0, 0.0, 0.0])
    
    target = Target(
        position=target_position,
        reflectivity=1.0,
        phase=0.0
    )
    target_list = TargetList([target])
    
    # Echo Simulator
    echo_sim = SarEchoSimulator(config)
    echo_signal = echo_sim.simulate_echo(
        target_list=target_list,
        satellite_position=satellite_position,
        satellite_velocity=satellite_velocity
    )
    
    assert echo_signal.shape == (config.num_samples,)
    assert echo_signal.dtype == np.complex64
    assert np.any(np.abs(echo_signal) > 0)  # 일부 신호가 있어야 함


def test_multiple_pulses():
    """여러 펄스 시뮬레이션 테스트"""
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
    
    # 타겟 정의
    target = Target(
        position=np.array([6378137.0, 0.0, 0.0]),
        reflectivity=1.0
    )
    target_list = TargetList([target])
    
    # 여러 위성 위치
    num_pulses = 10
    satellite_positions = np.tile(
        np.array([6378137.0 + 517000.0, 0.0, 0.0]),
        (num_pulses, 1)
    )
    satellite_velocities = np.tile(
        np.array([0.0, 7266.0, 0.0]),
        (num_pulses, 1)
    )
    
    # Echo Simulator
    echo_sim = SarEchoSimulator(config)
    echo_signals = echo_sim.simulate_multiple_pulses(
        target_list=target_list,
        satellite_positions=satellite_positions,
        satellite_velocities=satellite_velocities
    )
    
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64


if __name__ == "__main__":
    pytest.main([__file__])
