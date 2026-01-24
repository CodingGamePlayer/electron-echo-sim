"""
기본 사용 예제

SAR Simulator의 기본 사용 방법을 보여줍니다.
"""

import numpy as np
from sar_simulator.common import SarSystemConfig
from sar_simulator.common.target_model import Target, TargetList
from sar_simulator.sensor import SarSensorSimulator
from sar_simulator.echo import SarEchoSimulator


def main():
    """기본 사용 예제"""
    
    # SAR 시스템 설정
    config = SarSystemConfig(
        fc=5.4e9,           # 중심 주파수: 5.4 GHz
        bw=150e6,           # 대역폭: 150 MHz
        taup=10e-6,         # 펄스 폭: 10 μs
        fs=250e6,           # 샘플링 주파수: 250 MHz
        prf=5000,           # PRF: 5000 Hz
        swst=10e-6,         # 샘플링 윈도우 시작 시간: 10 μs
        swl=50e-6,          # 샘플링 윈도우 길이: 50 μs
        orbit_height=517e3, # 궤도 높이: 517 km
        antenna_width=4.0,  # 안테나 폭: 4 m
        antenna_height=0.5  # 안테나 높이: 0.5 m
    )
    
    print("SAR 시스템 설정:")
    print(f"  중심 주파수: {config.fc/1e9:.2f} GHz")
    print(f"  대역폭: {config.bw/1e6:.1f} MHz")
    print(f"  펄스 폭: {config.taup*1e6:.2f} μs")
    print(f"  샘플링 주파수: {config.fs/1e6:.1f} MHz")
    print(f"  PRF: {config.prf:.0f} Hz")
    print(f"  파장: {config.wavelength*100:.2f} cm")
    print()
    
    # Sensor Simulator 생성
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    print(f"Chirp 신호 생성 완료: shape={chirp_signal.shape}, dtype={chirp_signal.dtype}")
    print()
    
    # 타겟 정의 (예: 지구 표면의 한 점)
    # 위성 위치 (예: 517km 고도, 적도 상공)
    satellite_position = np.array([6378137.0 + 517000.0, 0.0, 0.0])  # ECEF 좌표
    satellite_velocity = np.array([0.0, 7266.0, 0.0])  # 약 7.3 km/s
    
    # 타겟 위치 (지구 표면, 위성 바로 아래)
    target_position = np.array([6378137.0, 0.0, 0.0])  # ECEF 좌표
    
    target = Target(
        position=target_position,
        reflectivity=1.0,  # 반사도: 1.0
        phase=0.0          # 위상: 0 deg
    )
    
    target_list = TargetList([target])
    print(f"타겟 정의 완료: {len(target_list)}개")
    print()
    
    # Echo Simulator 생성
    echo_sim = SarEchoSimulator(config)
    
    # Echo 신호 생성
    echo_signal = echo_sim.simulate_echo(
        target_list=target_list,
        satellite_position=satellite_position,
        satellite_velocity=satellite_velocity
    )
    
    print(f"Echo 신호 생성 완료: shape={echo_signal.shape}, dtype={echo_signal.dtype}")
    print(f"  최대 진폭: {np.max(np.abs(echo_signal)):.6f}")
    print(f"  평균 진폭: {np.mean(np.abs(echo_signal)):.6f}")
    print()
    
    print("시뮬레이션 완료!")


if __name__ == "__main__":
    main()
