"""
대역폭이 해상도에 미치는 영향 분석

대역폭이 높아지면 → 해상도가 좋아짐 (더 작은 값)
대역폭이 낮아지면 → 해상도가 나빠짐 (더 큰 값)
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


def test_bandwidth_resolution_impact():
    """대역폭이 해상도에 미치는 영향 분석"""
    
    print("=== 대역폭이 해상도에 미치는 영향 ===\n")
    
    # 다양한 대역폭 테스트
    bandwidths = [50e6, 100e6, 150e6, 200e6, 300e6, 400e6, 500e6, 600e6]  # MHz
    
    results = []
    
    for bw in bandwidths:
        # Range 해상도 계산
        range_resolution = LIGHT_SPEED / (2 * bw)
        
        results.append({
            'bw_mhz': bw / 1e6,
            'resolution_m': range_resolution,
            'resolution_cm': range_resolution * 100
        })
        
        print(f"대역폭: {bw/1e6:6.0f} MHz → Range 해상도: {range_resolution:.3f} m ({range_resolution*100:.1f} cm)")
    
    print()
    
    # 시각화
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    bw_values = [r['bw_mhz'] for r in results]
    resolution_m = [r['resolution_m'] for r in results]
    resolution_cm = [r['resolution_cm'] for r in results]
    
    # 1. 대역폭 vs Range 해상도 (선형 스케일)
    axes[0, 0].plot(bw_values, resolution_m, 'b-o', linewidth=2, markersize=8)
    axes[0, 0].set_xlabel('Bandwidth (MHz)')
    axes[0, 0].set_ylabel('Range Resolution (m)')
    axes[0, 0].set_title('대역폭 ↑ → 해상도 ↑ (더 작은 값, 더 좋음)')
    axes[0, 0].grid(True, alpha=0.3)
    axes[0, 0].invert_yaxis()  # 해상도가 작을수록 좋으므로 y축 반전
    axes[0, 0].annotate('더 좋은 해상도', xy=(500, 0.3), xytext=(400, 0.5),
                        arrowprops=dict(arrowstyle='->', color='green', lw=2),
                        fontsize=12, color='green', weight='bold')
    
    # 2. 대역폭 vs Range 해상도 (로그 스케일)
    axes[0, 1].semilogy(bw_values, resolution_m, 'g-o', linewidth=2, markersize=8)
    axes[0, 1].set_xlabel('Bandwidth (MHz)')
    axes[0, 1].set_ylabel('Range Resolution (m, log scale)')
    axes[0, 1].set_title('대역폭과 해상도의 관계 (로그 스케일)')
    axes[0, 1].grid(True, alpha=0.3, which='both')
    
    # 3. 실제 위성 비교
    satellite_configs = {
        'ALOS PALSAR': {'bw': 28e6, 'name': 'ALOS PALSAR (L-band)'},
        'Sentinel-1': {'bw': 100e6, 'name': 'Sentinel-1 (C-band)'},
        'TerraSAR-X': {'bw': 150e6, 'name': 'TerraSAR-X (X-band)'},
        'LumirX-1': {'bw': 500e6, 'name': 'LumirX-1 (X-band)'}
    }
    
    sat_names = []
    sat_bws = []
    sat_resolutions = []
    colors = ['blue', 'green', 'orange', 'red']
    
    for i, (key, config) in enumerate(satellite_configs.items()):
        sat_names.append(key)
        sat_bws.append(config['bw'] / 1e6)
        res = LIGHT_SPEED / (2 * config['bw'])
        sat_resolutions.append(res * 100)  # cm
    
    bars = axes[1, 0].bar(sat_names, sat_resolutions, color=colors, alpha=0.7, edgecolor='black', linewidth=1.5)
    axes[1, 0].set_ylabel('Range Resolution (cm)')
    axes[1, 0].set_title('실제 위성들의 대역폭과 해상도 비교')
    axes[1, 0].grid(True, alpha=0.3, axis='y')
    axes[1, 0].invert_yaxis()  # 해상도가 작을수록 좋으므로 y축 반전
    
    # 값 표시
    for bar, res, bw in zip(bars, sat_resolutions, sat_bws):
        height = bar.get_height()
        axes[1, 0].text(bar.get_x() + bar.get_width()/2., height,
                        f'{res:.1f}cm\n({bw:.0f}MHz)',
                        ha='center', va='top', fontsize=9, weight='bold')
    
    # 4. 대역폭 증가율 vs 해상도 개선율
    base_bw = 100e6  # 기준 대역폭
    base_res = LIGHT_SPEED / (2 * base_bw)
    
    improvement_ratios = []
    bw_ratios = []
    
    for bw in bandwidths:
        res = LIGHT_SPEED / (2 * bw)
        improvement = (base_res - res) / base_res * 100  # 개선율 (%)
        bw_ratio = (bw - base_bw) / base_bw * 100  # 대역폭 증가율 (%)
        improvement_ratios.append(improvement)
        bw_ratios.append(bw_ratio)
    
    axes[1, 1].plot(bw_ratios, improvement_ratios, 'm-o', linewidth=2, markersize=8)
    axes[1, 1].axhline(y=0, color='k', linestyle='--', alpha=0.3)
    axes[1, 1].axvline(x=0, color='k', linestyle='--', alpha=0.3)
    axes[1, 1].set_xlabel('Bandwidth 증가율 (%)')
    axes[1, 1].set_ylabel('해상도 개선율 (%)')
    axes[1, 1].set_title(f'대역폭 증가에 따른 해상도 개선 (기준: {base_bw/1e6:.0f} MHz)')
    axes[1, 1].grid(True, alpha=0.3)
    
    # 기준선 표시
    axes[1, 1].plot([0], [0], 'ko', markersize=10, label=f'기준: {base_bw/1e6:.0f} MHz')
    axes[1, 1].legend()
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "bandwidth_resolution_impact.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"시각화 저장: {output_path}")
    
    # 상세 설명
    print("\n=== 상세 설명 ===")
    print("1. 공식:")
    print("   Range 해상도 = c / (2 × 대역폭)")
    print("   여기서 c = 299,792,458 m/s (빛의 속도)")
    print()
    print("2. 대역폭이 높아지면:")
    print("   - 해상도 값이 작아짐 (더 좋은 해상도)")
    print("   - 예: 500 MHz → 0.300 m (30 cm)")
    print("   - 더 가까운 거리의 두 물체를 구분할 수 있음")
    print()
    print("3. 대역폭이 낮아지면:")
    print("   - 해상도 값이 커짐 (더 나쁜 해상도)")
    print("   - 예: 50 MHz → 3.000 m (300 cm)")
    print("   - 가까운 거리의 두 물체를 구분하기 어려움")
    print()
    print("4. 실제 위성 비교:")
    for name, config in satellite_configs.items():
        res = LIGHT_SPEED / (2 * config['bw'])
        print(f"   {name:15s}: {config['bw']/1e6:6.0f} MHz → {res:.3f} m ({res*100:.1f} cm)")
    print()
    print("5. 결론:")
    print("   - 대역폭 ↑ → 해상도 ↑ (더 좋음)")
    print("   - 대역폭 ↓ → 해상도 ↓ (더 나쁨)")
    print("   - 하지만 대역폭을 높이면 시스템 복잡도와 비용이 증가")


if __name__ == "__main__":
    test_bandwidth_resolution_impact()
