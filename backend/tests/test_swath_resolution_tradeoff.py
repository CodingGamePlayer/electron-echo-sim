"""
Swath 범위와 해상도의 트레이드오프 테스트

swath 범위를 늘렸을 때 해상도에 미치는 영향을 확인합니다.
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


def test_swath_resolution_tradeoff():
    """Swath 범위와 해상도의 관계 테스트"""
    
    # 기본 설정 (LumirX-1 유사)
    base_config = {
        "fc": 9.65e9,
        "bw": 500e6,
        "taup": 30e-6,
        "fs": 1200e6,
        "prf": 4000,
        "swst": 10e-6,
        "orbit_height": 550e3,
        "antenna_width": 3.5,
        "antenna_height": 0.5
    }
    
    # 다양한 swath 길이 테스트
    swath_lengths = [20e-6, 30e-6, 40e-6, 50e-6, 60e-6, 70e-6, 80e-6]  # μs
    
    results = []
    
    print("=== Swath 범위와 해상도 트레이드오프 분석 ===\n")
    
    for swl in swath_lengths:
        config = SarSystemConfig(
            fc=base_config["fc"],
            bw=base_config["bw"],
            taup=base_config["taup"],
            fs=base_config["fs"],
            prf=base_config["prf"],
            swst=base_config["swst"],
            swl=swl,
            orbit_height=base_config["orbit_height"],
            antenna_width=base_config["antenna_width"],
            antenna_height=base_config["antenna_height"]
        )
        
        # Range 커버리지 계산
        near_slant = 0.5 * LIGHT_SPEED * config.swst
        far_slant = 0.5 * LIGHT_SPEED * (config.swst + config.swl)
        swath_slant = far_slant - near_slant
        
        # 이론적 해상도 (대역폭에만 의존)
        theoretical_resolution = LIGHT_SPEED / (2 * config.bw)
        
        # 샘플 간격 (실제 해상도에 영향)
        sample_spacing = swath_slant / config.num_samples
        
        # 샘플 수
        num_samples = config.num_samples
        
        results.append({
            'swl_us': swl * 1e6,
            'swath_km': swath_slant / 1000,
            'num_samples': num_samples,
            'theoretical_resolution_m': theoretical_resolution,
            'sample_spacing_m': sample_spacing,
            'sample_spacing_ratio': sample_spacing / theoretical_resolution
        })
        
        print(f"Swath Length: {swl*1e6:.1f} μs")
        print(f"  Swath Width: {swath_slant/1000:.2f} km")
        print(f"  샘플 수: {num_samples}")
        print(f"  이론적 해상도: {theoretical_resolution:.3f} m (변하지 않음)")
        print(f"  샘플 간격: {sample_spacing:.3f} m")
        print(f"  샘플 간격/이론적 해상도 비율: {sample_spacing/theoretical_resolution:.2f}")
        print()
    
    # 시각화
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    swl_values = [r['swl_us'] for r in results]
    swath_values = [r['swath_km'] for r in results]
    num_samples_values = [r['num_samples'] for r in results]
    theoretical_res = [r['theoretical_resolution_m'] for r in results]
    sample_spacing_values = [r['sample_spacing_m'] for r in results]
    ratio_values = [r['sample_spacing_ratio'] for r in results]
    
    # 1. Swath Width vs Swath Length
    axes[0, 0].plot(swl_values, swath_values, 'b-o', linewidth=2, markersize=8)
    axes[0, 0].set_xlabel('Swath Length (μs)')
    axes[0, 0].set_ylabel('Swath Width (km)')
    axes[0, 0].set_title('Swath Length vs Swath Width')
    axes[0, 0].grid(True, alpha=0.3)
    
    # 2. 샘플 수 vs Swath Length
    axes[0, 1].plot(swl_values, num_samples_values, 'g-o', linewidth=2, markersize=8)
    axes[0, 1].set_xlabel('Swath Length (μs)')
    axes[0, 1].set_ylabel('Number of Samples')
    axes[0, 1].set_title('Swath Length vs Number of Samples')
    axes[0, 1].grid(True, alpha=0.3)
    
    # 3. 해상도 비교
    axes[1, 0].plot(swl_values, theoretical_res, 'r--', linewidth=2, label='Theoretical Resolution (constant)', alpha=0.7)
    axes[1, 0].plot(swl_values, sample_spacing_values, 'b-o', linewidth=2, markersize=8, label='Sample Spacing')
    axes[1, 0].set_xlabel('Swath Length (μs)')
    axes[1, 0].set_ylabel('Resolution (m)')
    axes[1, 0].set_title('Resolution: Theoretical vs Sample Spacing')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    
    # 4. 샘플 간격/이론적 해상도 비율
    axes[1, 1].plot(swl_values, ratio_values, 'm-o', linewidth=2, markersize=8)
    axes[1, 1].axhline(y=1.0, color='r', linestyle='--', alpha=0.5, label='Ideal (1.0)')
    axes[1, 1].set_xlabel('Swath Length (μs)')
    axes[1, 1].set_ylabel('Sample Spacing / Theoretical Resolution')
    axes[1, 1].set_title('Sample Spacing Ratio (낮을수록 좋음)')
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "swath_resolution_tradeoff.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"시각화 저장: {output_path}")
    
    # 결론 출력
    print("\n=== 결론 ===")
    print("1. 이론적 해상도는 대역폭(bw)에만 의존하므로 swath를 늘려도 변하지 않습니다.")
    print("2. 샘플 간격은 swath width와 샘플 수에 의해 결정됩니다.")
    print("3. 샘플링 주파수(fs)가 고정되어 있으면, swath를 늘려도 샘플 간격은 일정합니다.")
    print("4. 샘플 간격이 이론적 해상도보다 크면 실제 해상도가 떨어질 수 있습니다.")
    print(f"5. 현재 설정에서 샘플 간격/이론적 해상도 비율: {ratio_values[-1]:.2f}")
    
    # 검증
    assert all(r['theoretical_resolution_m'] == theoretical_res[0] for r in results), \
        "이론적 해상도는 변하지 않아야 합니다"
    
    # 샘플 간격이 이론적 해상도보다 작거나 같아야 이상적
    assert all(r['sample_spacing_m'] <= r['theoretical_resolution_m'] * 2 for r in results), \
        "샘플 간격이 너무 큽니다"


if __name__ == "__main__":
    test_swath_resolution_tradeoff()
