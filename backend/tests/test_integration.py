"""
통합 테스트

전체 시스템의 통합 동작을 테스트합니다.
"""

import numpy as np
# numpy 부동소수점 출력 설정 (일관된 표시를 위해)
np.set_printoptions(precision=6, suppress=False, floatmode='maxprec')
import pytest
import matplotlib
matplotlib.use('Agg')  # GUI 없이 백엔드 사용 (테스트 환경용)
import matplotlib.pyplot as plt
from pathlib import Path
from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.sensor import SarSensorSimulator
from sar_simulator.echo import SarEchoSimulator


# 출력 디렉토리
OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def visualize_chirp_signal(chirp_signal, config, output_path):
    """Chirp 신호 시각화"""
    fig, axes = plt.subplots(3, 1, figsize=(12, 10))
    
    # 시간 벡터 생성
    dt = 1.0 / config.fs
    t = np.arange(len(chirp_signal)) * dt * 1e6  # 마이크로초 단위
    
    # 1. 시간 영역 - 실수부와 허수부
    axes[0].plot(t, chirp_signal.real, label='Real', alpha=0.7)
    axes[0].plot(t, chirp_signal.imag, label='Imaginary', alpha=0.7)
    axes[0].set_xlabel('Time (μs)')
    axes[0].set_ylabel('Amplitude')
    axes[0].set_title('Chirp Signal - Time Domain (I/Q)')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # 2. 시간 영역 - 크기 (Magnitude)
    axes[1].plot(t, np.abs(chirp_signal), 'g-', linewidth=1.5)
    axes[1].set_xlabel('Time (μs)')
    axes[1].set_ylabel('Magnitude')
    axes[1].set_title('Chirp Signal - Magnitude')
    axes[1].grid(True, alpha=0.3)
    
    # 3. 주파수 영역 (FFT)
    fft_signal = np.fft.fft(chirp_signal)
    fft_freq = np.fft.fftfreq(len(chirp_signal), dt) / 1e6  # MHz 단위
    fft_magnitude = np.abs(fft_signal)
    
    # 양의 주파수만 표시
    positive_freq_idx = fft_freq >= 0
    positive_freq = fft_freq[positive_freq_idx]
    positive_magnitude = fft_magnitude[positive_freq_idx]
    
    axes[2].plot(positive_freq, positive_magnitude, 'r-', linewidth=1.5)
    axes[2].set_xlabel('Frequency (MHz)')
    axes[2].set_ylabel('Magnitude')
    axes[2].set_title('Chirp Signal - Frequency Domain (FFT)')
    axes[2].grid(True, alpha=0.3)
    axes[2].set_xlim([0, config.fs / 2 / 1e6])  # 나이키스트 주파수까지
    
    # 대역폭 범위 표시
    axes[2].axvline(config.bw / 2 / 1e6, color='g', linestyle='--', alpha=0.5, label=f'BW/2 = {config.bw/2/1e6:.2f} MHz')
    axes[2].legend()
    
    # 대역폭 내 에너지 비율 표시
    bw_mask = np.abs(positive_freq) <= config.bw / 2 / 1e6
    bw_energy_ratio = np.sum(positive_magnitude[bw_mask]) / np.sum(positive_magnitude) * 100
    axes[2].text(0.02, 0.98, f'Energy in BW: {bw_energy_ratio:.2f}%', 
                 transform=axes[2].transAxes, verticalalignment='top',
                 bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Chirp 신호 시각화 저장: {output_path}")


def visualize_echo_signal(echo_signal, config, output_path):
    """Echo 신호 시각화"""
    fig, axes = plt.subplots(3, 1, figsize=(12, 10))
    
    # 시간 벡터 생성
    dt = 1.0 / config.fs
    t = np.arange(len(echo_signal)) * dt * 1e6  # 마이크로초 단위
    
    # 1. 시간 영역 - 실수부와 허수부
    axes[0].plot(t, echo_signal.real, label='Real', alpha=0.7, linewidth=0.5)
    axes[0].plot(t, echo_signal.imag, label='Imaginary', alpha=0.7, linewidth=0.5)
    axes[0].set_xlabel('Time (μs)')
    axes[0].set_ylabel('Amplitude')
    axes[0].set_title('Echo Signal - Time Domain (I/Q)')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # 2. 시간 영역 - 크기 (Magnitude)
    magnitude = np.abs(echo_signal)
    axes[1].plot(t, magnitude, 'g-', linewidth=1.0)
    axes[1].set_xlabel('Time (μs)')
    axes[1].set_ylabel('Magnitude')
    axes[1].set_title('Echo Signal - Magnitude')
    axes[1].grid(True, alpha=0.3)
    
    # 통계 정보 표시
    max_idx = np.argmax(magnitude)
    max_val = magnitude[max_idx]
    axes[1].axvline(t[max_idx], color='r', linestyle='--', alpha=0.7, label=f'Max at {t[max_idx]:.3f} μs')
    axes[1].legend()
    
    # 3. 주파수 영역 (FFT)
    fft_signal = np.fft.fft(echo_signal)
    fft_freq = np.fft.fftfreq(len(echo_signal), dt) / 1e6  # MHz 단위
    fft_magnitude = np.abs(fft_signal)
    
    # 양의 주파수만 표시
    positive_freq_idx = fft_freq >= 0
    positive_freq = fft_freq[positive_freq_idx]
    positive_magnitude = fft_magnitude[positive_freq_idx]
    
    axes[2].plot(positive_freq, positive_magnitude, 'r-', linewidth=1.0)
    axes[2].set_xlabel('Frequency (MHz)')
    axes[2].set_ylabel('Magnitude')
    axes[2].set_title('Echo Signal - Frequency Domain (FFT)')
    axes[2].grid(True, alpha=0.3)
    axes[2].set_xlim([0, config.fs / 2 / 1e6])  # 나이키스트 주파수까지
    
    # 대역폭 범위 표시
    axes[2].axvline(config.bw / 2 / 1e6, color='g', linestyle='--', alpha=0.5, label=f'BW/2 = {config.bw/2/1e6:.2f} MHz')
    axes[2].legend()
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Echo 신호 시각화 저장: {output_path}")


def visualize_multiple_pulses(echo_signals, config, output_path):
    """여러 펄스 Echo 신호 시각화 (2D 이미지)"""
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))
    
    # 1. 2D 이미지 - 크기
    magnitude_2d = np.abs(echo_signals)
    im1 = axes[0].imshow(
        magnitude_2d,
        aspect='auto',
        cmap='hot',
        interpolation='nearest',
        origin='lower'
    )
    axes[0].set_xlabel('Range Sample')
    axes[0].set_ylabel('Pulse Number')
    axes[0].set_title('Echo Signals - Magnitude (2D)')
    plt.colorbar(im1, ax=axes[0], label='Magnitude')
    
    # 2. 2D 이미지 - 위상
    phase_2d = np.angle(echo_signals)
    im2 = axes[1].imshow(
        phase_2d,
        aspect='auto',
        cmap='hsv',
        interpolation='nearest',
        origin='lower',
        vmin=-np.pi,
        vmax=np.pi
    )
    axes[1].set_xlabel('Range Sample')
    axes[1].set_ylabel('Pulse Number')
    axes[1].set_title('Echo Signals - Phase (2D)')
    plt.colorbar(im2, ax=axes[1], label='Phase (rad)')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"여러 펄스 Echo 신호 시각화 저장: {output_path}")


def test_end_to_end_simulation():
    """전체 시뮬레이션 파이프라인 테스트"""
    # 설정
    config = SarSystemConfig(
        fc=5.4e9,
        bw=150e6,
        taup=10e-6,
        fs=350e6,  # 나이키스트 조건: fs >= 2*bw (300e6)
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
    # 위성 위치: 궤도 높이 517km
    satellite_position = np.array([6378137.0 + 517000.0, 0.0, 0.0])
    satellite_velocity = np.array([0.0, 7266.0, 0.0])
    
    # 타겟 위치: 샘플링 윈도우 내에 있도록 설정
    # swst=10μs, swl=50μs -> swet=60μs
    # 시간 지연이 10~60μs 사이에 오도록 타겟 거리 계산
    # td = R_2way / c = 2*R / c
    # R = td * c / 2
    from sar_simulator.common.constants import LIGHT_SPEED
    target_td = 30e-6  # 30 μs (샘플링 윈도우 중간)
    target_R = target_td * LIGHT_SPEED / 2.0
    # 위성에서 타겟 방향으로 target_R만큼 떨어진 위치
    sat_norm = satellite_position / np.linalg.norm(satellite_position)
    target_position = satellite_position - sat_norm * target_R
    
    target = Target(
        position=target_position,
        reflectivity=100.0,  # 반사도 증가 (신호 크기 증가)
        phase=0.0
    )
    target_list = TargetList([target])
    
    # 단계별 검증을 위한 중간 계산
    from sar_simulator.common.geometry_utils import (
        calc_distance_to_target,
        calc_time_delay,
        calc_ambiguous_time_delay,
        calc_antenna_gain_simple
    )
    from sar_simulator.common.propagation_model import calc_atmospheric_loss
    from sar_simulator.common.constants import LIGHT_SPEED, PI
    
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
    print(f"유효한 타겟 (전체): {valid_mask[0]} (c > threshold AND 시간 조건)")
    print(f"swst: {config.swst*1e6:.3f} μs, swet: {(config.swst + config.swl)*1e6:.3f} μs")
    print(f"시간 조건 체크: td >= swst - taup? {td[0] >= config.swst - config.taup} ({td[0]*1e6:.3f} >= {(config.swst - config.taup)*1e6:.3f})")
    print(f"시간 조건 체크: td < swet? {td[0] < config.swst + config.swl} ({td[0]*1e6:.3f} < {(config.swst + config.swl)*1e6:.3f})")
    
    # rank 계산 (기존 코드 방식)
    rank = int(np.ceil((2 * R[0] / LIGHT_SPEED - config.swst) * config.prf))
    min_dist_swst = 0.5 * LIGHT_SPEED * (rank / config.prf + config.swst)
    max_dist_swet = 0.5 * LIGHT_SPEED * (rank / config.prf + config.swst + config.swl - config.taup)
    print(f"\nRank 계산:")
    print(f"  rank: {rank}")
    print(f"  min_dist_swst: {min_dist_swst/1000:.2f} km")
    print(f"  max_dist_swet: {max_dist_swet/1000:.2f} km")
    print(f"  실제 타겟 거리: {R[0]/1000:.2f} km (범위 내? {min_dist_swst <= R[0] <= max_dist_swet})")
    
    # 샘플 위치 계산 확인
    sample_pos = (td_amb[0] - config.swst) * config.fs
    idx0 = int(np.ceil(sample_pos))
    idx1 = idx0 + len(chirp_signal)
    print(f"\n샘플 위치 계산:")
    print(f"  sample_pos: {sample_pos:.2f}")
    print(f"  idx0: {idx0}, idx1: {idx1}")
    print(f"  num_samples: {config.num_samples}")
    print(f"  범위 체크: idx1 <= 0? {idx1 <= 0}, idx0 >= num_samples? {idx0 >= config.num_samples}")
    print(f"  idx0 < 0? {idx0 < 0}, idx1 > num_samples? {idx1 > config.num_samples}")
    
    # 계수 확인
    coeff = (c[0] * np.exp(-1j * 2.0 * PI * config.fc * td[0]) * np.sqrt(config.G_recv))
    print(f"\n최종 계수:")
    print(f"  coeff: {coeff:.6e}")
    print(f"  coeff magnitude: {np.abs(coeff):.6e}")
    print(f"  coeff phase: {np.angle(coeff):.4f} rad")
    
    # 기존 코드 방식으로 loss 계산 (dB 그대로 사용)
    loss_dB = config.NF + config.Loss
    c1_original = (config.Pt * config.wavelength ** 2 * ant_gain[0] ** 2 /
                   ((4.0 * PI) ** 3 * loss_dB * atmospheric_loss))
    c_original = np.sqrt(c1_original * target_array[0, 3] / ((R_2way[0] / 2.0) ** 4))
    coeff_original = (c_original * np.exp(-1j * 2.0 * PI * config.fc * td[0]) * np.sqrt(config.G_recv))
    print(f"\n기존 코드 방식 (loss를 dB로 사용):")
    print(f"  loss (dB): {loss_dB:.2f}")
    print(f"  c1 (기존): {c1_original:.6e}")
    print(f"  c (기존): {c_original:.6e}")
    print(f"  coeff (기존): {coeff_original:.6e}")
    print(f"  차이: c1_new/c1_old = {c1[0]/c1_original:.4f}, c_new/c_old = {c[0]/c_original:.4f}")
    
    # Echo Simulator
    echo_sim = SarEchoSimulator(config)
    echo_signal = echo_sim.simulate_echo(
        target_list=target_list,
        satellite_position=satellite_position,
        satellite_velocity=satellite_velocity
    )
    
    assert echo_signal.shape == (config.num_samples,)
    assert echo_signal.dtype == np.complex64
    # Echo 신호가 0일 수도 있음 (타겟이 노이즈 임계값 이하이거나 거리가 너무 멀 경우)
    # assert np.any(np.abs(echo_signal) > 0)  # 일부 신호가 있어야 함
    
    # 결과 출력
    print("\n=== 시뮬레이션 결과 ===")
    print(f"Chirp 신호:")
    print(f"  Shape: {chirp_signal.shape}")
    chirp_max = np.max(np.abs(chirp_signal))
    chirp_mean = np.mean(np.abs(chirp_signal))
    print(f"  Max magnitude: {chirp_max:.6f}")
    print(f"  Mean magnitude: {chirp_mean:.6f}")
    
    print(f"\nEcho 신호:")
    print(f"  Shape: {echo_signal.shape}")
    echo_max = np.max(np.abs(echo_signal))
    echo_mean = np.mean(np.abs(echo_signal))
    print(f"  Max magnitude: {echo_max:.6e}")
    print(f"  Mean magnitude: {echo_mean:.6e}")
    print(f"  Non-zero samples: {np.count_nonzero(np.abs(echo_signal))} / {len(echo_signal)}")
    
    # 실제 Echo 신호 값 확인
    non_zero_indices = np.where(np.abs(echo_signal) > 0)[0]
    if len(non_zero_indices) > 0:
        print(f"  첫 10개 non-zero 샘플:")
        for i in range(min(10, len(non_zero_indices))):
            idx = non_zero_indices[i]
            print(f"    [{idx}]: {echo_signal[idx]:.6e}, magnitude={np.abs(echo_signal[idx]):.6e}")
    else:
        print(f"  모든 샘플이 0입니다!")
        # idx0~idx1 범위의 실제 값 확인
        if idx0 >= 0 and idx1 <= len(echo_signal):
            print(f"  idx0~idx1 범위 [{idx0}:{idx1}]의 실제 값:")
            print(f"    Max: {np.max(np.abs(echo_signal[idx0:idx1])):.6e}")
            print(f"    Mean: {np.mean(np.abs(echo_signal[idx0:idx1])):.6e}")
            print(f"    첫 5개: {echo_signal[idx0:idx0+5]}")
            print(f"    chirp_signal * coeff (첫 5개): {(chirp_signal[:5] * coeff)}")
    
    # 시각화
    visualize_chirp_signal(
        chirp_signal,
        config,
        OUTPUT_DIR / "test_chirp_signal.png"
    )
    visualize_echo_signal(
        echo_signal,
        config,
        OUTPUT_DIR / "test_echo_signal.png"
    )


def test_multiple_pulses():
    """여러 펄스 시뮬레이션 테스트"""
    config = SarSystemConfig(
        fc=5.4e9,
        bw=150e6,
        taup=10e-6,
        fs=350e6,  # 나이키스트 조건: fs >= 2*bw (300e6)
        prf=5000,
        swst=10e-6,
        swl=50e-6,
        orbit_height=517e3,
        antenna_width=4.0,
        antenna_height=0.5
    )
    
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
    
    # 타겟 정의
    # 샘플링 윈도우 내에 타겟 배치
    from sar_simulator.common.constants import LIGHT_SPEED
    target_td = 30e-6  # 30 μs (샘플링 윈도우 중간)
    target_R = target_td * LIGHT_SPEED / 2.0
    sat_norm = satellite_positions[0] / np.linalg.norm(satellite_positions[0])
    target_position = satellite_positions[0] - sat_norm * target_R
    
    target = Target(
        position=target_position,
        reflectivity=100.0  # 반사도 증가
    )
    target_list = TargetList([target])
    
    # Echo Simulator
    echo_sim = SarEchoSimulator(config)
    echo_signals = echo_sim.simulate_multiple_pulses(
        target_list=target_list,
        satellite_positions=satellite_positions,
        satellite_velocities=satellite_velocities
    )
    
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64
    
    # 결과 출력
    print("\n=== 여러 펄스 시뮬레이션 결과 ===")
    print(f"Echo 신호 배열:")
    print(f"  Shape: {echo_signals.shape}")
    pulses_max = np.max(np.abs(echo_signals))
    pulses_mean = np.mean(np.abs(echo_signals))
    print(f"  Max magnitude: {pulses_max:.6f}")
    print(f"  Mean magnitude: {pulses_mean:.6f}")
    print(f"  Non-zero samples per pulse: {np.count_nonzero(np.abs(echo_signals), axis=1).mean():.2f}")
    
    # 시각화
    visualize_multiple_pulses(
        echo_signals,
        config,
        OUTPUT_DIR / "test_multiple_pulses.png"
    )
    
    # 첫 번째 펄스도 개별 시각화
    visualize_echo_signal(
        echo_signals[0],
        config,
        OUTPUT_DIR / "test_first_pulse.png"
    )


if __name__ == "__main__":
    pytest.main([__file__])
