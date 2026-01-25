"""
SAR에서 Pulse의 개념 설명

Pulse: SAR가 보내는 짧은 전파 신호 (Chirp 신호를 포함)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sar_simulator.common import SarSystemConfig, LIGHT_SPEED
from sar_simulator.sensor import SarSensorSimulator

OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def test_pulse_concept():
    """Pulse의 개념을 시각화하여 설명"""
    
    # LumirX-1 설정
    config = SarSystemConfig(
        fc=9.65e9,      # 중심 주파수: 9.65 GHz
        bw=500e6,       # 대역폭: 500 MHz
        taup=30e-6,    # 펄스 폭: 30 μs (하나의 pulse가 지속되는 시간)
        fs=1200e6,      # 샘플링 주파수: 1200 MHz
        prf=4000,       # PRF: 4000 Hz (초당 4000개 pulse)
        swst=10e-6,
        swl=50e-6,
        orbit_height=550e3,
        antenna_width=3.5,
        antenna_height=0.5
    )
    
    print("=== SAR에서 Pulse의 개념 ===\n")
    
    print("1. Pulse란?")
    print("   - SAR가 보내는 짧은 전파 신호")
    print("   - Chirp 신호를 포함하는 하나의 송신 단위")
    print(f"   - 하나의 pulse 지속 시간: {config.taup*1e6:.1f} μs")
    print(f"   - 초당 보내는 pulse 수: {config.prf}개 (PRF)")
    print()
    
    print("2. Pulse의 역할:")
    print("   - 지구 표면으로 전파를 보냄")
    print("   - 반사된 신호(Echo)를 받아서 거리 정보 획득")
    print("   - 여러 pulse를 모아서 2D 이미지 생성")
    print()
    
    print("3. Pulse의 구조:")
    print("   - 시작: 전파 송신 시작")
    print("   - 중간: Chirp 신호 (주파수가 변하는 신호)")
    print("   - 끝: 송신 종료, Echo 수신 대기")
    print()
    
    # Chirp 신호 생성
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    
    # 시각화
    fig, axes = plt.subplots(3, 2, figsize=(16, 14))
    
    dt = 1.0 / config.fs
    t_pulse = np.arange(len(chirp_signal)) * dt * 1e6  # μs
    
    # 1. 하나의 Pulse 내부 구조 (시간 영역)
    axes[0, 0].plot(t_pulse, chirp_signal.real, 'b-', linewidth=1.5, alpha=0.7, label='Real')
    axes[0, 0].plot(t_pulse, chirp_signal.imag, 'r-', linewidth=1.5, alpha=0.7, label='Imaginary')
    axes[0, 0].set_xlabel('Time (μs)')
    axes[0, 0].set_ylabel('Amplitude')
    axes[0, 0].set_title(f'하나의 Pulse 내부 (Chirp 신호)\nPulse Width: {config.taup*1e6:.1f} μs')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    axes[0, 0].axvline(x=0, color='g', linestyle='--', alpha=0.5, label='Pulse 시작')
    axes[0, 0].axvline(x=config.taup*1e6, color='r', linestyle='--', alpha=0.5, label='Pulse 끝')
    axes[0, 0].legend()
    
    # 2. 하나의 Pulse 내부 구조 (크기)
    axes[0, 1].plot(t_pulse, np.abs(chirp_signal), 'g-', linewidth=2)
    axes[0, 1].fill_between(t_pulse, 0, np.abs(chirp_signal), alpha=0.3, color='green')
    axes[0, 1].set_xlabel('Time (μs)')
    axes[0, 1].set_ylabel('Magnitude')
    axes[0, 1].set_title(f'하나의 Pulse - 크기\n대역폭: {config.bw/1e6:.0f} MHz')
    axes[0, 1].grid(True, alpha=0.3)
    
    # 3. 여러 Pulse의 시간적 반복 (PRF)
    pri = 1.0 / config.prf  # Pulse Repetition Interval
    num_pulses_show = 5
    time_total = num_pulses_show * pri * 1e3  # ms
    time_axis = np.arange(0, time_total, 0.001) * 1e3  # ms 단위로 변환
    
    pulse_envelope = np.zeros_like(time_axis)
    pulse_signal = np.zeros_like(time_axis, dtype=complex)
    
    for i in range(num_pulses_show):
        pulse_start_ms = i * pri * 1e3
        pulse_end_ms = pulse_start_ms + config.taup * 1e3
        
        # Pulse envelope
        mask = (time_axis >= pulse_start_ms) & (time_axis < pulse_end_ms)
        pulse_envelope[mask] = 1.0
    
    axes[1, 0].plot(time_axis, pulse_envelope, 'b-', linewidth=2, drawstyle='steps-post', label='Pulse Envelope')
    axes[1, 0].set_xlabel('Time (ms)')
    axes[1, 0].set_ylabel('Pulse Signal')
    axes[1, 0].set_title(f'여러 Pulse의 반복 (PRF: {config.prf} Hz)\nPRI: {pri*1e3:.3f} ms')
    axes[1, 0].set_ylim([-0.1, 1.2])
    axes[1, 0].grid(True, alpha=0.3)
    axes[1, 0].legend()
    
    # 4. Pulse와 Echo의 관계
    # Pulse 송신 후 Echo 수신까지의 시간
    range_example = 5e3  # 5 km 거리의 타겟
    echo_delay = 2 * range_example / LIGHT_SPEED * 1e6  # μs
    
    time_with_echo = np.arange(0, pri * 1e6, 0.1)  # μs
    pulse_tx = np.zeros_like(time_with_echo)
    echo_rx = np.zeros_like(time_with_echo)
    
    # Pulse 송신
    pulse_mask = time_with_echo < config.taup * 1e6
    pulse_tx[pulse_mask] = 1.0
    
    # Echo 수신 (약한 신호)
    echo_start = config.taup * 1e6 + echo_delay
    echo_end = echo_start + config.taup * 1e6
    echo_mask = (time_with_echo >= echo_start) & (time_with_echo < echo_end)
    echo_rx[echo_mask] = 0.3  # Echo는 약한 신호
    
    axes[1, 1].plot(time_with_echo, pulse_tx, 'b-', linewidth=3, label='Pulse 송신', alpha=0.8)
    axes[1, 1].plot(time_with_echo, echo_rx, 'r-', linewidth=2, label='Echo 수신', alpha=0.8)
    axes[1, 1].set_xlabel('Time (μs)')
    axes[1, 1].set_ylabel('Signal')
    axes[1, 1].set_title(f'Pulse 송신과 Echo 수신\n거리: {range_example/1000:.1f} km, 지연: {echo_delay:.1f} μs')
    axes[1, 1].set_ylim([-0.1, 1.2])
    axes[1, 1].grid(True, alpha=0.3)
    axes[1, 1].legend()
    axes[1, 1].annotate('Pulse\n송신', xy=(config.taup*1e6/2, 1.0), 
                       ha='center', fontsize=10, weight='bold', color='blue')
    axes[1, 1].annotate('Echo\n수신', xy=(echo_start + config.taup*1e6/2, 0.3), 
                       ha='center', fontsize=10, weight='bold', color='red')
    
    # 5. 여러 Pulse로 이미지 생성 (개념도)
    num_pulses_image = 10
    pulse_positions = np.arange(num_pulses_image) * (satellite_velocity := 7266) / config.prf  # 위성 이동 거리
    
    # Range 방향 (거리)
    ranges = np.linspace(1e3, 10e3, 50)  # 1km ~ 10km
    
    # 간단한 시뮬레이션: 각 pulse마다 echo 받음
    image_data = np.zeros((num_pulses_image, len(ranges)))
    for i, pulse_pos in enumerate(pulse_positions):
        # 거리에 따라 echo 강도 변화 (간단한 모델)
        echo_strength = np.exp(-ranges / 5e3) * (1 + 0.1 * np.sin(i * 0.5))
        image_data[i, :] = echo_strength
    
    im = axes[2, 0].imshow(image_data, aspect='auto', cmap='hot', origin='lower', 
                          extent=[ranges[0]/1000, ranges[-1]/1000, 0, num_pulses_image])
    axes[2, 0].set_xlabel('Range (km)')
    axes[2, 0].set_ylabel('Pulse Number (Azimuth)')
    axes[2, 0].set_title('여러 Pulse로 만든 2D 이미지\n(Range vs Azimuth)')
    plt.colorbar(im, ax=axes[2, 0], label='Echo Strength')
    
    # 6. Pulse 파라미터 요약
    axes[2, 1].axis('off')
    info_text = f"""
SAR Pulse 개념 요약:

1. Pulse란?
   - SAR가 보내는 짧은 전파 신호
   - Chirp 신호를 포함
   - 지속 시간: {config.taup*1e6:.1f} μs

2. Pulse의 역할:
   - 지구 표면으로 전파 송신
   - 반사된 Echo 신호 수신
   - 거리 정보 획득

3. Pulse 반복:
   - PRF: {config.prf} Hz (초당 {config.prf}개)
   - PRI: {pri*1e3:.3f} ms (Pulse 간격)
   - 위성 이동: {satellite_velocity/config.prf:.3f} m/pulse

4. 이미지 생성:
   - Range 방향: Echo 지연 시간
   - Azimuth 방향: 여러 Pulse
   - 2D 이미지 = Range × Azimuth

5. 현재 설정:
   - 대역폭: {config.bw/1e6:.0f} MHz
   - Range 해상도: {LIGHT_SPEED/(2*config.bw):.3f} m
   - Pulse 폭: {config.taup*1e6:.1f} μs
    """
    
    axes[2, 1].text(0.05, 0.95, info_text, transform=axes[2, 1].transAxes,
                   fontsize=10, verticalalignment='top', family='monospace',
                   bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "pulse_concept.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"시각화 저장: {output_path}")
    
    # 추가 설명
    print("\n=== Pulse의 전체 프로세스 ===")
    print("1. Pulse 송신:")
    print(f"   - {config.taup*1e6:.1f} μs 동안 Chirp 신호 송신")
    print(f"   - 주파수: {config.fc/1e9 - config.bw/2/1e9:.3f} GHz ~ {config.fc/1e9 + config.bw/2/1e9:.3f} GHz")
    print()
    print("2. Echo 수신 대기:")
    print(f"   - Pulse 송신 후 Echo 신호 수신")
    print(f"   - 거리에 따라 Echo 지연 시간이 다름")
    print(f"   - 예: 5 km 거리 → 약 {2*5e3/LIGHT_SPEED*1e6:.1f} μs 지연")
    print()
    print("3. 다음 Pulse 송신:")
    print(f"   - {pri*1e3:.3f} ms 후 다음 Pulse 송신")
    print(f"   - 위성은 {satellite_velocity/config.prf:.3f} m 이동")
    print()
    print("4. 이미지 생성:")
    print("   - 여러 Pulse의 Echo를 모아서 2D 이미지 생성")
    print("   - Range 방향: Echo 지연 시간 → 거리")
    print("   - Azimuth 방향: 여러 Pulse → 위성 이동 방향")
    print()
    print("=== 비유 ===")
    print("Pulse는 마치:")
    print("  - 손전등으로 빛을 비추는 것과 같음")
    print("  - 짧은 시간 동안 빛을 켰다가 끔")
    print("  - 반사된 빛을 받아서 거리 측정")
    print("  - 여러 번 반복하여 전체 영역 촬영")


if __name__ == "__main__":
    test_pulse_concept()
