"""
대역폭(Bandwidth)과 PRF(Pulse Repetition Frequency)의 차이 설명

대역폭: 하나의 pulse 내에서 주파수가 변하는 범위
PRF: 초당 보내는 pulse 수
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sar_simulator.common import SarSystemConfig, LIGHT_SPEED

OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def test_bandwidth_vs_prf():
    """대역폭과 PRF의 차이를 시각화"""
    
    # LumirX-1 설정
    config = SarSystemConfig(
        fc=9.65e9,      # 중심 주파수: 9.65 GHz
        bw=500e6,       # 대역폭: 500 MHz (하나의 pulse 내 주파수 범위)
        taup=30e-6,    # 펄스 폭: 30 μs
        fs=1200e6,      # 샘플링 주파수: 1200 MHz
        prf=4000,       # PRF: 4000 Hz (초당 4000개 pulse)
        swst=10e-6,
        swl=50e-6,
        orbit_height=550e3,
        antenna_width=3.5,
        antenna_height=0.5
    )
    
    print("=== 대역폭(Bandwidth) vs PRF(Pulse Repetition Frequency) ===\n")
    
    print("1. 대역폭 (Bandwidth, bw):")
    print(f"   값: {config.bw/1e6:.1f} MHz")
    print("   의미: 하나의 pulse 내에서 주파수가 변하는 범위")
    print(f"   주파수 범위: {config.fc/1e9 - config.bw/2/1e9:.3f} GHz ~ {config.fc/1e9 + config.bw/2/1e9:.3f} GHz")
    print(f"   역할: Range 해상도 결정 → {LIGHT_SPEED/(2*config.bw):.3f} m")
    print()
    
    print("2. PRF (Pulse Repetition Frequency):")
    print(f"   값: {config.prf} Hz")
    print("   의미: 초당 보내는 pulse 개수")
    print(f"   Pulse 간격: {1/config.prf*1e3:.3f} ms")
    print(f"   1초에 보내는 pulse 수: {config.prf}개")
    print(f"   역할: Azimuth 방향 샘플링 (위성 이동 방향)")
    print()
    
    print("3. 차이점:")
    print("   - 대역폭: 하나의 pulse 내부의 주파수 특성 (주파수 도메인)")
    print("   - PRF: pulse를 보내는 시간적 빈도 (시간 도메인)")
    print("   - 대역폭 ↑ → Range 해상도 ↑ (더 세밀한 거리 구분)")
    print("   - PRF ↑ → Azimuth 샘플링 밀도 ↑ (더 많은 pulse)")
    print()
    
    # 시각화
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. 대역폭 개념: 하나의 pulse 내 주파수 변화
    dt = 1.0 / config.fs
    t_pulse = np.arange(0, config.taup, dt) * 1e6  # μs
    chirp_rate = config.bw / config.taup
    # Chirp 신호의 주파수 변화 (선형 주파수 변조)
    freq_instantaneous = config.fc + chirp_rate * (t_pulse - config.taup/2)
    
    axes[0, 0].plot(t_pulse, freq_instantaneous / 1e9, 'b-', linewidth=2)
    axes[0, 0].axhline(y=config.fc/1e9, color='r', linestyle='--', alpha=0.5, label=f'Center: {config.fc/1e9:.2f} GHz')
    axes[0, 0].fill_between(t_pulse, 
                            (config.fc - config.bw/2)/1e9, 
                            (config.fc + config.bw/2)/1e9, 
                            alpha=0.2, color='green', label=f'Bandwidth: {config.bw/1e6:.0f} MHz')
    axes[0, 0].set_xlabel('Time within Pulse (μs)')
    axes[0, 0].set_ylabel('Frequency (GHz)')
    axes[0, 0].set_title('Bandwidth: 주파수 범위 (하나의 pulse 내)')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # 2. PRF 개념: 시간에 따른 pulse 반복
    time_axis = np.arange(0, 5/config.prf, 1/config.fs) * 1e3  # ms
    pulse_signal = np.zeros_like(time_axis)
    pri = 1.0 / config.prf  # Pulse Repetition Interval
    for i in range(5):  # 5개 pulse 표시
        pulse_start = i * pri
        pulse_end = pulse_start + config.taup
        mask = (time_axis*1e-3 >= pulse_start) & (time_axis*1e-3 < pulse_end)
        pulse_signal[mask] = 1.0
    
    axes[0, 1].plot(time_axis, pulse_signal, 'b-', linewidth=2, drawstyle='steps-post')
    axes[0, 1].set_xlabel('Time (ms)')
    axes[0, 1].set_ylabel('Pulse Signal')
    axes[0, 1].set_title(f'PRF: 초당 {config.prf}개 pulse (시간적 반복)')
    axes[0, 1].set_ylim([-0.1, 1.2])
    axes[0, 1].grid(True, alpha=0.3)
    axes[0, 1].text(0.5, 0.5, f'PRI = {pri*1e3:.3f} ms\nPRF = {config.prf} Hz', 
                    transform=axes[0, 1].transAxes, fontsize=12,
                    bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5),
                    ha='center', va='center')
    
    # 3. Range 해상도 (대역폭에 의존)
    bandwidths = [50e6, 100e6, 150e6, 200e6, 300e6, 400e6, 500e6]
    range_resolutions = [LIGHT_SPEED / (2 * bw) for bw in bandwidths]
    
    axes[1, 0].plot([b/1e6 for b in bandwidths], [r*100 for r in range_resolutions], 
                    'g-o', linewidth=2, markersize=8)
    axes[1, 0].set_xlabel('Bandwidth (MHz)')
    axes[1, 0].set_ylabel('Range Resolution (cm)')
    axes[1, 0].set_title('Range 해상도는 대역폭에만 의존')
    axes[1, 0].grid(True, alpha=0.3)
    axes[1, 0].axvline(x=config.bw/1e6, color='r', linestyle='--', alpha=0.5, 
                       label=f'LumirX-1: {config.bw/1e6:.0f} MHz')
    axes[1, 0].legend()
    
    # 4. Azimuth 샘플링 (PRF에 의존)
    prfs = [1000, 2000, 3000, 4000, 5000, 6000]
    satellite_velocity = 7266  # m/s (LEO 위성 평균 속도)
    azimuth_intervals = [satellite_velocity / prf for prf in prfs]
    
    axes[1, 1].plot(prfs, azimuth_intervals, 'm-o', linewidth=2, markersize=8)
    axes[1, 1].set_xlabel('PRF (Hz)')
    axes[1, 1].set_ylabel('Azimuth Sampling Interval (m)')
    axes[1, 1].set_title('Azimuth 샘플링 간격은 PRF에 의존')
    axes[1, 1].grid(True, alpha=0.3)
    axes[1, 1].axvline(x=config.prf, color='r', linestyle='--', alpha=0.5,
                       label=f'LumirX-1: {config.prf} Hz')
    axes[1, 1].legend()
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "bandwidth_vs_prf.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"시각화 저장: {output_path}")
    
    # 요약
    print("\n=== 요약 ===")
    print("대역폭 (Bandwidth):")
    print("  - 하나의 pulse 내에서 주파수가 변하는 범위")
    print("  - 단위: Hz (MHz, GHz)")
    print("  - 역할: Range 해상도 결정")
    print("  - 공식: Range 해상도 = c / (2 × bw)")
    print()
    print("PRF (Pulse Repetition Frequency):")
    print("  - 초당 보내는 pulse 개수")
    print("  - 단위: Hz (pulses per second)")
    print("  - 역할: Azimuth 방향 샘플링 밀도 결정")
    print("  - 공식: Azimuth 간격 = 위성 속도 / PRF")
    print()
    print("결론: 대역폭과 PRF는 완전히 다른 개념입니다!")


if __name__ == "__main__":
    test_bandwidth_vs_prf()
