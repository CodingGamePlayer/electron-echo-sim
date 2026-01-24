"""
시드 데이터 C5 기본 설정을 사용한 통합 테스트
"""

import numpy as np
import pytest
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.sensor import SarSensorSimulator
from sar_simulator.echo import SarEchoSimulator
from sar_simulator.common.constants import LIGHT_SPEED

# 출력 디렉토리
OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def test_c5_seed_config():
    """C5 기본 설정 (Stripmap) 시드 데이터로 테스트"""
    # C5 기본 설정 값 (seed_configs.py에서)
    config = SarSystemConfig(
        fc=5.41e9,
        bw=150e6,
        fs=250e6,
        taup=11e-6,
        prf=5930,
        swst=47.8e-6,
        swl=45.5e-6,
        orbit_height=561e3,
        antenna_width=3.9,
        antenna_height=1.9,
        antenna_roll_angle=0.0,
        antenna_pitch_angle=0.0,
        antenna_yaw_angle=0.0,
        Pt=3200,
        G_recv=60,
        NF=3.5,
        Loss=2.0,
        Tsys=270,
        adc_bits=12
    )
    
    print("\n=== C5 기본 설정 테스트 ===")
    print(f"Config:")
    print(f"  fc: {config.fc/1e9:.2f} GHz")
    print(f"  bw: {config.bw/1e6:.1f} MHz")
    print(f"  fs: {config.fs/1e6:.1f} MHz")
    print(f"  taup: {config.taup*1e6:.2f} μs")
    print(f"  prf: {config.prf:.0f} Hz")
    print(f"  swst: {config.swst*1e6:.2f} μs")
    print(f"  swl: {config.swl*1e6:.2f} μs")
    print(f"  swet: {(config.swst + config.swl)*1e6:.2f} μs")
    print(f"  orbit_height: {config.orbit_height/1e3:.0f} km")
    
    # Sensor Simulator
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    
    assert chirp_signal.shape == (config.num_samples_in_chirp,)
    assert chirp_signal.dtype == np.complex64
    
    print(f"\nChirp Signal:")
    print(f"  Shape: {chirp_signal.shape}")
    chirp_max = np.max(np.abs(chirp_signal))
    chirp_mean = np.mean(np.abs(chirp_signal))
    print(f"  Max magnitude: {chirp_max:.6f}")
    print(f"  Mean magnitude: {chirp_mean:.6f}")
    
    # 위성 위치: 궤도 높이 561km
    satellite_position = np.array([6378137.0 + 561000.0, 0.0, 0.0])
    satellite_velocity = np.array([0.0, 7266.0, 0.0])
    
    # 타겟 위치: 샘플링 윈도우 내에 있도록 설정
    # swst=47.8μs, swl=45.5μs -> swet=93.3μs
    # 시간 지연이 47.8~93.3μs 사이에 오도록 타겟 거리 계산
    # 타겟을 샘플링 윈도우 중간에 배치
    target_td = (config.swst + config.swl / 2.0)  # 약 70.55 μs
    target_R = target_td * LIGHT_SPEED / 2.0
    
    # 위성에서 타겟 방향으로 target_R만큼 떨어진 위치
    sat_norm = satellite_position / np.linalg.norm(satellite_position)
    target_position = satellite_position - sat_norm * target_R
    
    target = Target(
        position=target_position,
        reflectivity=100.0,  # 반사도 증가
        phase=0.0
    )
    target_list = TargetList([target])
    
    # 중간 계산
    from sar_simulator.common.geometry_utils import (
        calc_distance_to_target,
        calc_time_delay,
        calc_ambiguous_time_delay,
        calc_antenna_gain_simple
    )
    from sar_simulator.common.propagation_model import calc_atmospheric_loss
    from sar_simulator.common.constants import PI
    
    target_array = target_list.to_array()
    R = calc_distance_to_target(target_array[:, 0:3], satellite_position)
    R_2way = 2.0 * R
    td = calc_time_delay(R_2way)
    td_amb = calc_ambiguous_time_delay(td, config.pri)
    
    beam_direction = -satellite_position / np.linalg.norm(satellite_position)
    ant_gain = calc_antenna_gain_simple(
        target_array[:, 0:3],
        satellite_position,
        beam_direction,
        config.beamwidth_el,
        config.beamwidth_az,
        max_gain=1.0
    )
    atmospheric_loss = calc_atmospheric_loss(beam_direction, satellite_position)
    loss_linear = config.get_loss_linear()
    
    c1 = (config.Pt * config.wavelength ** 2 * ant_gain ** 2 /
          ((4.0 * PI) ** 3 * loss_linear * atmospheric_loss))
    c = np.sqrt(c1 * target_array[:, 3] / ((R_2way / 2.0) ** 4))
    noise_threshold = config.get_noise_threshold(num_pulses=1)
    valid_mask = c > noise_threshold
    
    print("\n=== 중간 계산 결과 ===")
    print(f"거리 R: {R[0]:.2f} m = {R[0]/1000:.2f} km")
    print(f"왕복 거리 R_2way: {R_2way[0]:.2f} m = {R_2way[0]/1000:.2f} km")
    print(f"시간 지연 td: {td[0]*1e6:.3f} μs")
    print(f"모호한 시간 지연 td_amb: {td_amb[0]*1e6:.3f} μs")
    print(f"안테나 게인: {ant_gain[0]:.4f}")
    print(f"대기 손실: {atmospheric_loss:.4f}")
    print(f"손실 (linear): {loss_linear:.4f}")
    print(f"c1: {c1[0]:.6e}")
    print(f"신호 계수 c: {c[0]:.6e}")
    print(f"노이즈 임계값: {noise_threshold:.6e}")
    time_valid = (td >= (config.swst - config.taup)) & (td < (config.swst + config.swl))
    print(f"유효한 타겟 (c > threshold): {c[0] > noise_threshold}")
    print(f"유효한 타겟 (시간 조건): {time_valid[0]}")
    print(f"유효한 타겟 (전체): {valid_mask[0]}")
    print(f"swst: {config.swst*1e6:.3f} μs, swet: {(config.swst + config.swl)*1e6:.3f} μs")
    print(f"시간 조건 체크: td >= swst - taup? {td[0] >= config.swst - config.taup} ({td[0]*1e6:.3f} >= {(config.swst - config.taup)*1e6:.3f})")
    print(f"시간 조건 체크: td < swet? {td[0] < config.swst + config.swl} ({td[0]*1e6:.3f} < {(config.swst + config.swl)*1e6:.3f})")
    
    # 샘플 위치 계산
    sample_pos = (td_amb[0] - config.swst) * config.fs
    idx0 = int(np.ceil(sample_pos))
    idx1 = idx0 + len(chirp_signal)
    print(f"\n샘플 위치 계산:")
    print(f"  sample_pos: {sample_pos:.2f}")
    print(f"  idx0: {idx0}, idx1: {idx1}")
    print(f"  num_samples: {config.num_samples}")
    print(f"  범위 체크: idx0 < 0? {idx0 < 0}, idx1 > num_samples? {idx1 > config.num_samples}")
    
    # Echo Simulator
    echo_sim = SarEchoSimulator(config)
    echo_signal = echo_sim.simulate_echo(
        target_list=target_list,
        satellite_position=satellite_position,
        satellite_velocity=satellite_velocity
    )
    
    assert echo_signal.shape == (config.num_samples,)
    assert echo_signal.dtype == np.complex64
    
    # 결과 출력
    print("\n=== 시뮬레이션 결과 ===")
    print(f"Echo 신호:")
    print(f"  Shape: {echo_signal.shape}")
    echo_max = np.max(np.abs(echo_signal))
    echo_mean = np.mean(np.abs(echo_signal))
    print(f"  Max magnitude: {echo_max:.6e}")
    print(f"  Mean magnitude: {echo_mean:.6e}")
    non_zero_count = np.count_nonzero(np.abs(echo_signal))
    print(f"  Non-zero samples: {non_zero_count} / {len(echo_signal)}")
    
    # 실제 Echo 신호 값 확인
    non_zero_indices = np.where(np.abs(echo_signal) > 0)[0]
    if len(non_zero_indices) > 0:
        print(f"  첫 10개 non-zero 샘플:")
        for i in range(min(10, len(non_zero_indices))):
            idx = non_zero_indices[i]
            print(f"    [{idx}]: {echo_signal[idx]:.6e}, magnitude={np.abs(echo_signal[idx]):.6e}")
    else:
        print(f"  ⚠️ 모든 샘플이 0입니다!")
        # idx0~idx1 범위의 실제 값 확인
        if idx0 >= 0 and idx1 <= len(echo_signal):
            print(f"  idx0~idx1 범위 [{idx0}:{idx1}]의 실제 값:")
            print(f"    Max: {np.max(np.abs(echo_signal[idx0:idx1])):.6e}")
            print(f"    Mean: {np.mean(np.abs(echo_signal[idx0:idx1])):.6e}")
            print(f"    첫 5개: {echo_signal[idx0:idx0+5]}")
    
    # 시각화
    fig, axes = plt.subplots(2, 1, figsize=(12, 8))
    
    # 시간 벡터 생성
    dt = 1.0 / config.fs
    t_chirp = np.arange(len(chirp_signal)) * dt * 1e6
    t_echo = np.arange(len(echo_signal)) * dt * 1e6
    
    # Chirp 신호
    axes[0].plot(t_chirp, np.abs(chirp_signal), 'b-', linewidth=1.5, label='Chirp Magnitude')
    axes[0].set_xlabel('Time (μs)')
    axes[0].set_ylabel('Magnitude')
    axes[0].set_title('Chirp Signal - Magnitude')
    axes[0].grid(True, alpha=0.3)
    axes[0].legend()
    
    # Echo 신호
    axes[1].plot(t_echo, np.abs(echo_signal), 'g-', linewidth=1.0, label='Echo Magnitude')
    axes[1].set_xlabel('Time (μs)')
    axes[1].set_ylabel('Magnitude')
    axes[1].set_title('Echo Signal - Magnitude')
    axes[1].grid(True, alpha=0.3)
    axes[1].legend()
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "test_c5_seed_config.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"\n시각화 저장: {output_path}")
    
    # 결과 요약
    print("\n=== 결과 요약 ===")
    if non_zero_count > 0:
        print(f"[SUCCESS] Echo 신호가 정상적으로 생성되었습니다!")
        print(f"   Non-zero 샘플: {non_zero_count} / {len(echo_signal)}")
        print(f"   최대 진폭: {echo_max:.6e}")
    else:
        print(f"[FAIL] Echo 신호가 모두 0입니다!")
        print(f"   가능한 원인:")
        print(f"   1. 타겟이 샘플링 윈도우 범위 밖")
        print(f"   2. 신호가 노이즈 임계값 이하")
        print(f"   3. 샘플 인덱스 계산 오류")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
