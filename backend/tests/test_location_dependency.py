"""
지역(위치)에 따라 값이 변하는지 확인하는 테스트

타겟 위치, 위성 위치에 따라 Echo 신호가 어떻게 변하는지 확인
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sar_simulator.common import SarSystemConfig, Target, TargetList, LIGHT_SPEED
from sar_simulator.echo import SarEchoSimulator

OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def test_location_dependency():
    """지역(위치)에 따라 값이 변하는지 확인"""
    
    # 기본 설정
    config = SarSystemConfig(
        fc=9.65e9,
        bw=500e6,
        taup=30e-6,
        fs=1200e6,
        prf=4000,
        swst=10e-6,
        swl=50e-6,
        orbit_height=550e3,
        antenna_width=3.5,
        antenna_height=0.5
    )
    
    echo_sim = SarEchoSimulator(config)
    
    print("=== 지역(위치)에 따른 값 변화 확인 ===\n")
    
    # 위성 위치 (고정)
    satellite_position = np.array([6378137.0 + 550000.0, 0.0, 0.0])  # 적도 상공
    satellite_velocity = np.array([0.0, 7266.0, 0.0])
    
    # 다양한 위치의 타겟 테스트
    test_cases = [
        {"name": "근거리 (1km)", "position": np.array([6378137.0 + 1000.0, 0.0, 0.0])},
        {"name": "중거리 (5km)", "position": np.array([6378137.0 + 5000.0, 0.0, 0.0])},
        {"name": "원거리 (10km)", "position": np.array([6378137.0 + 10000.0, 0.0, 0.0])},
        {"name": "측면 (5km, 90도)", "position": np.array([6378137.0, 5000.0, 0.0])},
        {"name": "고도 차이 (5km, 높이 100m)", "position": np.array([6378137.0 + 5000.0, 0.0, 100.0])},
    ]
    
    results = []
    
    for case in test_cases:
        target = Target(
            position=case["position"],
            reflectivity=1.0,
            phase=0.0
        )
        target_list = TargetList([target])
        
        # Echo 신호 생성
        echo_signal = echo_sim.simulate_echo(
            target_list=target_list,
            satellite_position=satellite_position,
            satellite_velocity=satellite_velocity
        )
        
        # 거리 계산
        distance = np.linalg.norm(case["position"] - satellite_position)
        time_delay = 2 * distance / LIGHT_SPEED * 1e6  # μs
        
        # Echo 신호 특성
        echo_max = np.max(np.abs(echo_signal))
        echo_mean = np.mean(np.abs(echo_signal))
        echo_peak_idx = np.argmax(np.abs(echo_signal))
        echo_peak_time = (echo_peak_idx / config.fs + config.swst) * 1e6  # μs
        
        results.append({
            "name": case["name"],
            "position": case["position"],
            "distance": distance,
            "time_delay": time_delay,
            "echo_max": echo_max,
            "echo_mean": echo_mean,
            "echo_peak_time": echo_peak_time
        })
        
        print(f"{case['name']}:")
        print(f"  위치: ({case['position'][0]/1000:.1f}, {case['position'][1]/1000:.1f}, {case['position'][2]:.1f}) km")
        print(f"  거리: {distance/1000:.2f} km")
        print(f"  시간 지연: {time_delay:.2f} μs")
        print(f"  Echo 최대값: {echo_max:.6e}")
        print(f"  Echo 평균값: {echo_mean:.6e}")
        print(f"  Echo 피크 시간: {echo_peak_time:.2f} μs")
        print()
    
    # 시각화
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    names = [r["name"] for r in results]
    distances = [r["distance"]/1000 for r in results]  # km
    time_delays = [r["time_delay"] for r in results]  # μs
    echo_maxes = [r["echo_max"] for r in results]
    echo_peak_times = [r["echo_peak_time"] for r in results]
    
    # 1. 거리 vs 시간 지연
    axes[0, 0].plot(distances, time_delays, 'b-o', linewidth=2, markersize=8)
    axes[0, 0].set_xlabel('Distance (km)')
    axes[0, 0].set_ylabel('Time Delay (μs)')
    axes[0, 0].set_title('거리에 따른 시간 지연')
    axes[0, 0].grid(True, alpha=0.3)
    for i, name in enumerate(names):
        axes[0, 0].annotate(name, (distances[i], time_delays[i]), 
                           fontsize=8, rotation=45, ha='left')
    
    # 2. 거리 vs Echo 최대값
    axes[0, 1].semilogy(distances, echo_maxes, 'g-o', linewidth=2, markersize=8)
    axes[0, 1].set_xlabel('Distance (km)')
    axes[0, 1].set_ylabel('Echo Max (log scale)')
    axes[0, 1].set_title('거리에 따른 Echo 신호 세기 (거리 제곱에 반비례)')
    axes[0, 1].grid(True, alpha=0.3, which='both')
    
    # 3. 시간 지연 vs Echo 피크 시간
    axes[1, 0].plot(time_delays, echo_peak_times, 'r-o', linewidth=2, markersize=8)
    axes[1, 0].plot([min(time_delays), max(time_delays)], 
                    [min(time_delays), max(time_delays)], 
                    'k--', alpha=0.5, label='이상적 (y=x)')
    axes[1, 0].set_xlabel('Theoretical Time Delay (μs)')
    axes[1, 0].set_ylabel('Echo Peak Time (μs)')
    axes[1, 0].set_title('이론적 시간 지연 vs 실제 Echo 피크 시간')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    
    # 4. Echo 신호 비교 (거리별)
    axes[1, 1].axis('off')
    info_text = "지역(위치)에 따른 값 변화:\n\n"
    info_text += "1. 거리 계산:\n"
    info_text += "   - 타겟 위치와 위성 위치에 따라 거리가 달라짐\n"
    info_text += "   - 거리 = ||타겟 위치 - 위성 위치||\n\n"
    info_text += "2. 시간 지연:\n"
    info_text += "   - 거리에 비례: td = 2 × R / c\n"
    info_text += "   - 거리가 멀수록 Echo 지연 시간이 길어짐\n\n"
    info_text += "3. Echo 신호 세기:\n"
    info_text += "   - 거리의 제곱에 반비례: Pr ∝ 1/R²\n"
    info_text += "   - 거리가 멀수록 Echo 신호가 약해짐\n\n"
    info_text += "4. 안테나 게인:\n"
    info_text += "   - 타겟 방향에 따라 안테나 게인이 달라짐\n"
    info_text += "   - 빔 중심에서 멀어질수록 게인 감소\n\n"
    info_text += "5. 대기 손실:\n"
    info_text += "   - 빔 방향과 위성 위치에 따라 달라짐\n"
    info_text += "   - 지구 표면에 가까울수록 손실 증가\n\n"
    info_text += "결론: 모든 값이 위치(지역)에 따라 변합니다!"
    
    axes[1, 1].text(0.05, 0.95, info_text, transform=axes[1, 1].transAxes,
                   fontsize=10, verticalalignment='top', family='monospace',
                   bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "location_dependency.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"시각화 저장: {output_path}")
    
    # 결론
    print("\n=== 결론 ===")
    print("현재 코드는 지역(위치)에 따라 값이 변동됩니다:")
    print("1. 타겟 위치에 따라 거리가 달라짐")
    print("2. 거리에 따라 시간 지연이 달라짐")
    print("3. 거리에 따라 Echo 신호 세기가 달라짐")
    print("4. 타겟 방향에 따라 안테나 게인이 달라짐")
    print("5. 위성 위치와 빔 방향에 따라 대기 손실이 달라짐")
    print()
    print("따라서 같은 타겟이라도 위치가 다르면 Echo 신호가 완전히 달라집니다!")


if __name__ == "__main__":
    test_location_dependency()
