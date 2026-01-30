import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch, Circle
from matplotlib.patches import FancyBboxPatch, Polygon
import matplotlib.patches as mpatches

# 한글 폰트 설정
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

fig = plt.figure(figsize=(20, 14))

# ============================================
# 1. Target Orbit 설명
# ============================================
ax1 = plt.subplot(3, 3, 1)
ax1.set_aspect('equal')
ax1.grid(True, alpha=0.3, linestyle='--')

# 지구
earth = Circle((0, 0), 100, color='lightblue', alpha=0.3, label='Earth')
ax1.add_patch(earth)

# 여러 궤도
orbits = [
    (150, 'blue', 'Target Orbit 1\n(Low)'),
    (200, 'green', 'Target Orbit 2\n(Mid)'),
    (250, 'red', 'Target Orbit 3\n(High)')
]

for radius, color, label in orbits:
    orbit_circle = Circle((0, 0), radius, fill=False, color=color, 
                          linewidth=3, alpha=0.7, linestyle='--')
    ax1.add_patch(orbit_circle)
    
    # 위성 위치 표시
    angle = np.radians(30 * orbits.index((radius, color, label)))
    sat_x = radius * np.cos(angle)
    sat_y = radius * np.sin(angle)
    ax1.plot(sat_x, sat_y, 'o', color=color, markersize=12)
    
    # 레이블
    label_x = radius * np.cos(np.radians(45))
    label_y = radius * np.sin(np.radians(45))
    ax1.text(label_x, label_y, label, fontsize=9, color=color, 
            fontweight='bold', ha='left')

# 궤도 파라미터 텍스트
orbit_params = """
Target Orbit Parameters:
• Altitude
• Inclination
• Eccentricity
• Period
• Ground Track
"""
ax1.text(0.05, 0.95, orbit_params, transform=ax1.transAxes,
        fontsize=9, verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

ax1.set_xlim([-300, 300])
ax1.set_ylim([-300, 300])
ax1.set_xlabel('X [km]', fontsize=11)
ax1.set_ylabel('Y [km]', fontsize=11)
ax1.set_title('Target Orbit\n(Which orbit to image)', fontsize=12, fontweight='bold')
ax1.legend(loc='upper right', fontsize=8)

# ============================================
# 2. Range Count/Spacing/Offset 개념도
# ============================================
ax2 = plt.subplot(3, 3, 2)
ax2.set_aspect('equal')
ax2.grid(True, alpha=0.3, linestyle='--')

# 위성 위치
sat_pos = np.array([0, 100])
ax2.plot(*sat_pos, 'ko', markersize=20, label='Satellite', zorder=10)

# Nadir
ax2.plot([0, 0], [100, 0], 'b--', linewidth=2, alpha=0.5, label='Nadir')

# Range 방향 (Cross-track)
range_start = 30  # Near Range
range_offset = range_start  # Offset from Nadir
range_spacing = 5   # Spacing between samples
range_count = 8     # Number of samples

# Range 샘플 포인트들
range_positions = []
for i in range(range_count):
    range_pos = range_offset + i * range_spacing
    range_positions.append(range_pos)
    
    # 빔 라인
    ax2.plot([0, range_pos], [sat_pos[1], 0], 'g--', linewidth=1, alpha=0.3)
    
    # 샘플 포인트
    color = 'orange' if i == 0 else ('purple' if i == range_count-1 else 'cyan')
    size = 150 if (i == 0 or i == range_count-1) else 80
    ax2.scatter(range_pos, 0, color=color, s=size, zorder=5, edgecolor='black', linewidth=2)
    
    # 인덱스 표시
    ax2.text(range_pos, -5, f'{i}', ha='center', fontsize=9, fontweight='bold')

# Range 파라미터 표시
# Offset
ax2.annotate('', xy=(range_offset, 10), xytext=(0, 10),
            arrowprops=dict(arrowstyle='<->', color='red', lw=3))
ax2.text(range_offset/2, 13, 'Range Offset', ha='center', fontsize=10, 
        color='red', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))

# Spacing
ax2.annotate('', xy=(range_offset + range_spacing, 5), xytext=(range_offset, 5),
            arrowprops=dict(arrowstyle='<->', color='blue', lw=3))
ax2.text(range_offset + range_spacing/2, 8, 'Range\nSpacing', ha='center', 
        fontsize=9, color='blue', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))

# Count
ax2.annotate('', xy=(range_positions[-1], 15), xytext=(range_positions[0], 15),
            arrowprops=dict(arrowstyle='<->', color='green', lw=3))
ax2.text((range_positions[0] + range_positions[-1])/2, 18, 
        f'Range Count = {range_count}', ha='center', fontsize=10, 
        color='green', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.7))

# 지면
ax2.fill_between([-10, 80], [0, 0], [-10, -10], alpha=0.3, color='brown')
ax2.axhline(y=0, color='black', linewidth=2)

# 설명 박스
range_info = """
Range Parameters:
Count: Number of samples
Spacing: Distance between samples
Offset: Start position from nadir
"""
ax2.text(0.02, 0.98, range_info, transform=ax2.transAxes,
        fontsize=8, verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

ax2.set_xlim([-10, 80])
ax2.set_ylim([-10, 110])
ax2.set_xlabel('Cross-track (Range) [km]', fontsize=11, fontweight='bold')
ax2.set_ylabel('Altitude [km]', fontsize=11, fontweight='bold')
ax2.set_title('Range Count/Spacing/Offset\n(Cross-track sampling)', 
             fontsize=12, fontweight='bold')

# ============================================
# 3. Azimuth Count/Spacing/Offset 개념도
# ============================================
ax3 = plt.subplot(3, 3, 3)
ax3.set_aspect('equal')
ax3.grid(True, alpha=0.3, linestyle='--')

# 궤도 (Along-track)
orbit_y = 0
orbit_x = np.linspace(-60, 60, 100)
ax3.plot(orbit_x, orbit_y * np.ones_like(orbit_x), 'k--', 
        linewidth=2, alpha=0.5, label='Satellite Orbit')

# Azimuth 파라미터
azimuth_offset = -40  # Start position
azimuth_spacing = 10   # Spacing between samples
azimuth_count = 9      # Number of samples

# Azimuth 샘플 포인트들
azimuth_positions = []
for i in range(azimuth_count):
    azimuth_pos = azimuth_offset + i * azimuth_spacing
    azimuth_positions.append(azimuth_pos)
    
    # 위성 위치
    color = 'orange' if i == 0 else ('purple' if i == azimuth_count-1 else 'blue')
    size = 200 if (i == 0 or i == azimuth_count-1) else 100
    ax3.scatter(azimuth_pos, orbit_y, color=color, s=size, 
               zorder=5, edgecolor='black', linewidth=2, marker='s')
    
    # 인덱스 표시
    ax3.text(azimuth_pos, 5, f'{i}', ha='center', fontsize=9, fontweight='bold')
    
    # Swath 영역 (간단화)
    swath_y = -30
    swath_width = 6
    swath_rect = Rectangle((azimuth_pos - swath_width/2, swath_y - 5), 
                           swath_width, 10, alpha=0.2, facecolor='cyan',
                           edgecolor='darkblue', linewidth=1)
    ax3.add_patch(swath_rect)
    
    # 빔 라인
    ax3.plot([azimuth_pos, azimuth_pos], [orbit_y, swath_y], 
            'b--', linewidth=1, alpha=0.3)

# Azimuth 파라미터 표시
# Offset
ax3.annotate('', xy=(azimuth_offset, 10), xytext=(0, 10),
            arrowprops=dict(arrowstyle='<->', color='red', lw=3))
ax3.text(azimuth_offset/2, 13, 'Azimuth Offset', ha='center', fontsize=10, 
        color='red', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))

# Spacing
ax3.annotate('', xy=(azimuth_offset + azimuth_spacing, -10), 
            xytext=(azimuth_offset, -10),
            arrowprops=dict(arrowstyle='<->', color='blue', lw=3))
ax3.text(azimuth_offset + azimuth_spacing/2, -13, 'Azimuth\nSpacing', 
        ha='center', fontsize=9, color='blue', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))

# Count
ax3.annotate('', xy=(azimuth_positions[-1], 15), xytext=(azimuth_positions[0], 15),
            arrowprops=dict(arrowstyle='<->', color='green', lw=3))
ax3.text((azimuth_positions[0] + azimuth_positions[-1])/2, 18, 
        f'Azimuth Count = {azimuth_count}', ha='center', fontsize=10, 
        color='green', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.7))

# 지면
ax3.fill_between([-70, 70], [-40, -40], [-45, -45], alpha=0.3, color='brown')
ax3.axhline(y=-40, color='black', linewidth=2)

# 비행 방향 화살표
ax3.arrow(-55, -15, 20, 0, head_width=3, head_length=3, 
         fc='red', ec='red', linewidth=3, alpha=0.7)
ax3.text(-45, -20, 'Flight Direction', fontsize=10, color='red', fontweight='bold')

# 설명 박스
azimuth_info = """
Azimuth Parameters:
Count: Number of samples
Spacing: Time/distance between
Offset: Start position in orbit
"""
ax3.text(0.02, 0.98, azimuth_info, transform=ax3.transAxes,
        fontsize=8, verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

ax3.set_xlim([-70, 70])
ax3.set_ylim([-45, 25])
ax3.set_xlabel('Along-track (Azimuth) [km]', fontsize=11, fontweight='bold')
ax3.set_ylabel('Cross-track [km]', fontsize=11, fontweight='bold')
ax3.set_title('Azimuth Count/Spacing/Offset\n(Along-track sampling)', 
             fontsize=12, fontweight='bold')

# ============================================
# 4. Top View: 전체 타겟 그리드
# ============================================
ax4 = plt.subplot(3, 3, 4)
ax4.set_aspect('equal')
ax4.grid(True, alpha=0.3, linestyle='--')

# 위성 궤도
ax4.plot(orbit_x, orbit_y * np.ones_like(orbit_x), 'k--', 
        linewidth=2, alpha=0.5, label='Satellite Orbit')

# 타겟 그리드 생성
range_grid = np.linspace(range_offset, range_offset + (range_count-1)*range_spacing, range_count)
azimuth_grid = np.linspace(azimuth_offset, azimuth_offset + (azimuth_count-1)*azimuth_spacing, azimuth_count)

# 그리드 포인트 표시
for i, az in enumerate(azimuth_grid):
    for j, rng in enumerate(range_grid):
        # 위성 위치 (Azimuth)
        if j == 0:
            ax4.plot(az, 0, 'bs', markersize=10, alpha=0.5)
        
        # 타겟 포인트
        color = 'red' if (i == 0 and j == 0) else \
                ('purple' if (i == azimuth_count-1 and j == range_count-1) else 'cyan')
        size = 100 if (i == 0 and j == 0) or (i == azimuth_count-1 and j == range_count-1) else 30
        
        ax4.scatter(az, -rng, color=color, s=size, alpha=0.7, zorder=5)

# 그리드 라인
for az in azimuth_grid:
    ax4.plot([az, az], [0, -(range_offset + (range_count-1)*range_spacing)], 
            'gray', linewidth=0.5, alpha=0.3)
for rng in range_grid:
    ax4.plot([azimuth_offset, azimuth_offset + (azimuth_count-1)*azimuth_spacing], 
            [-rng, -rng], 'gray', linewidth=0.5, alpha=0.3)

# 타겟 영역 하이라이트
target_rect = Rectangle((azimuth_offset, -(range_offset + (range_count-1)*range_spacing)),
                        (azimuth_count-1)*azimuth_spacing,
                        (range_count-1)*range_spacing,
                        fill=False, edgecolor='green', linewidth=3, linestyle='-')
ax4.add_patch(target_rect)

# 차원 표시
ax4.text(0, -(range_offset + (range_count-1)*range_spacing)/2 - 5, 
        f'{range_count} x {azimuth_count}\nTarget Grid', 
        ha='center', fontsize=12, color='green', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.7))

# 시작/끝 포인트 레이블
ax4.text(azimuth_offset - 5, -range_offset, 'START\n(0,0)', 
        ha='right', fontsize=9, color='red', fontweight='bold')
ax4.text(azimuth_positions[-1] + 5, -range_positions[-1], 
        f'END\n({azimuth_count-1},{range_count-1})', 
        ha='left', fontsize=9, color='purple', fontweight='bold')

ax4.set_xlim([-70, 70])
ax4.set_ylim([-(range_offset + (range_count-1)*range_spacing) - 10, 15])
ax4.set_xlabel('Along-track (Azimuth) [km]', fontsize=11, fontweight='bold')
ax4.set_ylabel('Cross-track (Range) [km]', fontsize=11, fontweight='bold')
ax4.set_title('Top View: Complete Target Grid\n(Range x Azimuth)', 
             fontsize=12, fontweight='bold')
ax4.legend(loc='upper right', fontsize=9)

# ============================================
# 5. Range 샘플링 상세도
# ============================================
ax5 = plt.subplot(3, 3, 5)

# 시간축 펄스 다이어그램
time = np.linspace(0, 100, 1000)
pulse_count = range_count

# 송신 펄스
for i in range(pulse_count):
    pulse_time = 10 + i * 10
    pulse = np.exp(-((time - pulse_time)**2) / 2)
    ax5.plot(time, pulse + i*1.5, 'b-', linewidth=2, alpha=0.7)
    ax5.text(pulse_time, i*1.5 + 1.2, f'Range\nBin {i}', 
            ha='center', fontsize=8, fontweight='bold')

# 수신 윈도우
receive_start = 15
receive_width = 75
rect = Rectangle((receive_start, -0.5), receive_width, pulse_count*1.5 + 1,
                alpha=0.2, facecolor='yellow', edgecolor='orange', 
                linewidth=3, linestyle='--')
ax5.add_patch(rect)
ax5.text(receive_start + receive_width/2, -1, 'Receive Window', 
        ha='center', fontsize=10, color='orange', fontweight='bold')

# Range spacing 표시
ax5.annotate('', xy=(20, 0), xytext=(30, 0),
            arrowprops=dict(arrowstyle='<->', color='red', lw=2))
ax5.text(25, -0.5, 'Spacing', ha='center', fontsize=9, 
        color='red', fontweight='bold')

ax5.set_xlim([0, 100])
ax5.set_ylim([-2, pulse_count*1.5 + 1])
ax5.set_xlabel('Time (Round-trip delay) [us]', fontsize=11, fontweight='bold')
ax5.set_ylabel('Range Bins', fontsize=11, fontweight='bold')
ax5.set_title('Range Sampling: Time Domain\n(Echo pulse timing)', 
             fontsize=12, fontweight='bold')
ax5.grid(True, alpha=0.3)

# ============================================
# 6. Azimuth 샘플링 상세도
# ============================================
ax6 = plt.subplot(3, 3, 6)

# PRF (Pulse Repetition Frequency) 다이어그램
orbit_time = np.linspace(0, azimuth_count, 1000)
prf_pulses = azimuth_count

# 도플러 히스토리
doppler = 1000 * np.sin((orbit_time - azimuth_count/2) * np.pi / azimuth_count)
ax6.plot(orbit_time, doppler, 'b-', linewidth=3, alpha=0.7, label='Doppler Frequency')

# 샘플링 포인트
for i in range(prf_pulses):
    sample_time = i
    sample_doppler = 1000 * np.sin((sample_time - azimuth_count/2) * np.pi / azimuth_count)
    ax6.plot(sample_time, sample_doppler, 'ro', markersize=10, zorder=5)
    ax6.axvline(x=sample_time, color='gray', linestyle='--', 
               linewidth=1, alpha=0.3)
    
    # 인덱스
    ax6.text(sample_time, -1400, f'{i}', ha='center', fontsize=8, fontweight='bold')

# Azimuth spacing
ax6.annotate('', xy=(1, -1200), xytext=(0, -1200),
            arrowprops=dict(arrowstyle='<->', color='red', lw=3))
ax6.text(0.5, -1000, 'Azimuth\nSpacing\n(PRF)', ha='center', fontsize=9, 
        color='red', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))

# Synthetic Aperture Length
aperture_start = 2
aperture_end = 6
ax6.axvspan(aperture_start, aperture_end, alpha=0.2, color='green')
ax6.text((aperture_start + aperture_end)/2, 1200, 
        'Synthetic Aperture\nIntegration', ha='center', fontsize=9, 
        color='green', fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.7))

ax6.axhline(y=0, color='k', linestyle='-', linewidth=1)
ax6.set_xlim([-0.5, azimuth_count - 0.5])
ax6.set_ylim([-1500, 1500])
ax6.set_xlabel('Azimuth Sample Index (PRF pulses)', fontsize=11, fontweight='bold')
ax6.set_ylabel('Doppler Frequency [Hz]', fontsize=11, fontweight='bold')
ax6.set_title('Azimuth Sampling: Doppler Domain\n(SAR processing)', 
             fontsize=12, fontweight='bold')
ax6.grid(True, alpha=0.3)
ax6.legend(loc='upper right', fontsize=9)

# ============================================
# 7. 파라미터 요약 테이블
# ============================================
ax7 = plt.subplot(3, 3, 7)
ax7.axis('off')

table_data = f"""
╔═══════════════════════════════════════════════════════════╗
║           TARGET PARAMETERS SUMMARY                       ║
╠═══════════════════════════════════════════════════════════╣
║ 1. TARGET ORBIT                                           ║
║    - Which orbital position to image                      ║
║    - Defines imaging geometry                             ║
║    - Examples: LEO (500km), MEO (2000km)                  ║
║                                                           ║
║ 2. RANGE PARAMETERS (Cross-track)                        ║
║    • Count: {range_count} samples                                   ║
║      → Number of pixels in cross-track direction          ║
║                                                           ║
║    • Spacing: {range_spacing} km                                    ║
║      → Distance between adjacent range samples            ║
║      → Determined by: c/(2*Bandwidth)                     ║
║                                                           ║
║    • Offset: {range_offset} km                                     ║
║      → Start position from nadir                          ║
║      → Defines near range position                        ║
║                                                           ║
║    Total Range Coverage:                                  ║
║    = (Count-1) × Spacing = {(range_count-1)*range_spacing} km                     ║
║                                                           ║
║ 3. AZIMUTH PARAMETERS (Along-track)                      ║
║    • Count: {azimuth_count} samples                                 ║
║      → Number of pixels in along-track direction          ║
║                                                           ║
║    • Spacing: {azimuth_spacing} km                                  ║
║      → Distance between adjacent azimuth samples          ║
║      → Related to: Velocity/PRF                           ║
║                                                           ║
║    • Offset: {azimuth_offset} km                                   ║
║      → Start position in orbit                            ║
║      → Defines imaging start point                        ║
║                                                           ║
║    Total Azimuth Coverage:                                ║
║    = (Count-1) × Spacing = {(azimuth_count-1)*azimuth_spacing} km                    ║
║                                                           ║
║ 4. TOTAL IMAGING AREA                                    ║
║    = Range Coverage × Azimuth Coverage                    ║
║    = {(range_count-1)*range_spacing} km × {(azimuth_count-1)*azimuth_spacing} km = {(range_count-1)*range_spacing * (azimuth_count-1)*azimuth_spacing} km²               ║
║                                                           ║
║    Total Pixels = Range Count × Azimuth Count            ║
║                 = {range_count} × {azimuth_count} = {range_count * azimuth_count} pixels                  ║
╚═══════════════════════════════════════════════════════════╝
"""

ax7.text(0.5, 0.5, table_data, transform=ax7.transAxes,
        fontsize=9, verticalalignment='center', horizontalalignment='center',
        fontfamily='monospace',
        bbox=dict(boxstyle='round', facecolor='lightyellow', 
                 edgecolor='black', linewidth=2))

ax7.set_title('Parameter Summary & Calculations', 
             fontsize=12, fontweight='bold', pad=10)

# ============================================
# 8. 실제 예시: Sentinel-1
# ============================================
ax8 = plt.subplot(3, 3, 8)
ax8.axis('off')

sentinel_example = """
═══════════════════════════════════════════════════════
    REAL EXAMPLE: Sentinel-1 SAR Parameters
═══════════════════════════════════════════════════════

Interferometric Wide Swath (IW) Mode:

TARGET ORBIT:
  • Altitude: ~693 km (sun-synchronous)
  • Inclination: 98.18°
  • Repeat cycle: 12 days (single satellite)

RANGE PARAMETERS:
  • Range Count: ~21,000 samples
  • Range Spacing: ~2.3 m (ground range)
  • Range Offset: ~30 km (near range)
  • Total Swath Width: ~250 km
  
  → Covers 250km in cross-track direction
  → 21,000 pixels across swath

AZIMUTH PARAMETERS:
  • Azimuth Count: Variable (scene dependent)
  • Azimuth Spacing: ~14 m (ground)
  • Azimuth Offset: Scene start position
  • Typical Length: ~170 km
  
  → Scene length depends on data take
  → ~12,000 lines for standard IW product

IMAGING AREA:
  • Single burst: 250 km × 20 km
  • Full IW scene: 250 km × 170 km
  • Total area: ~42,500 km²

DATA VOLUME:
  • Pixels per scene: ~250 million
  • File size: ~800 MB (SLC product)
  • Processing time: ~3 minutes

KEY RELATIONS:
  Range Spacing = c/(2·B·sin(θ))
    where: c = speed of light
           B = bandwidth (100 MHz for IW)
           θ = incidence angle

  Azimuth Spacing = V/PRF
    where: V = satellite velocity (~7.6 km/s)
           PRF = pulse repetition frequency

═══════════════════════════════════════════════════════
"""

ax8.text(0.5, 0.5, sentinel_example, transform=ax8.transAxes,
        fontsize=8, verticalalignment='center', horizontalalignment='center',
        fontfamily='monospace',
        bbox=dict(boxstyle='round', facecolor='lightcyan', 
                 edgecolor='darkblue', linewidth=2))

ax8.set_title('Real World Example: Sentinel-1', 
             fontsize=12, fontweight='bold', pad=10)

# ============================================
# 9. 수식 및 관계
# ============================================
ax9 = plt.subplot(3, 3, 9)
ax9.axis('off')

formulas = """
╔══════════════════════════════════════════════════════╗
║        KEY FORMULAS & RELATIONSHIPS                  ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  RANGE (Cross-track) RESOLUTION:                    ║
║                                                      ║
║   Ground Range Resolution:                          ║
║   ρ_gr = c / (2·B·sin(θ_inc))                      ║
║                                                      ║
║   where:                                            ║
║   c = 3×10⁸ m/s (speed of light)                   ║
║   B = bandwidth (Hz)                                ║
║   θ_inc = incidence angle                          ║
║                                                      ║
║   Range Spacing ≤ ρ_gr (for proper sampling)       ║
║                                                      ║
║─────────────────────────────────────────────────────║
║                                                      ║
║  AZIMUTH (Along-track) RESOLUTION:                  ║
║                                                      ║
║   SAR Azimuth Resolution:                           ║
║   ρ_az = L_ant / 2                                  ║
║                                                      ║
║   where:                                            ║
║   L_ant = physical antenna length                   ║
║                                                      ║
║   Azimuth Spacing:                                  ║
║   Δx_az = V_sat / PRF                              ║
║                                                      ║
║   where:                                            ║
║   V_sat = satellite velocity                        ║
║   PRF = pulse repetition frequency                  ║
║                                                      ║
║─────────────────────────────────────────────────────║
║                                                      ║
║  TARGET GRID DIMENSIONS:                            ║
║                                                      ║
║   Total Range Extent:                               ║
║   R_total = (N_range - 1) × Δr + r_offset          ║
║                                                      ║
║   Total Azimuth Extent:                             ║
║   A_total = (N_az - 1) × Δa + a_offset             ║
║                                                      ║
║   Image Area:                                       ║
║   Area = R_total × A_total                         ║
║                                                      ║
║   Total Samples:                                    ║
║   N_total = N_range × N_azimuth                    ║
║                                                      ║
║─────────────────────────────────────────────────────║
║                                                      ║
║  MEMORY REQUIREMENTS:                               ║
║                                                      ║
║   Complex Data (I+Q):                               ║
║   Memory = N_range × N_az × 2 × bytes_per_sample   ║
║                                                      ║
║   For 16-bit complex:                               ║
║   Memory = N_range × N_az × 4 bytes                ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
"""

ax9.text(0.5, 0.5, formulas, transform=ax9.transAxes,
        fontsize=8, verticalalignment='center', horizontalalignment='center',
        fontfamily='monospace',
        bbox=dict(boxstyle='round', facecolor='lavender', 
                 edgecolor='purple', linewidth=2))

ax9.set_title('Mathematical Formulas', 
             fontsize=12, fontweight='bold', pad=10)

plt.suptitle('SAR Target Parameters: Complete Guide\nOrbit, Range & Azimuth Count/Spacing/Offset', 
            fontsize=16, fontweight='bold', y=0.995)
plt.tight_layout()

plt.savefig('/mnt/user-data/outputs/sar_target_parameters_guide.png', dpi=150, bbox_inches='tight')
print("타겟 파라미터 가이드 저장 완료!")

# ============================================
# 추가: 3D 시각화
# ============================================
from mpl_toolkits.mplot3d import Axes3D

fig2 = plt.figure(figsize=(16, 12))

# 3D 타겟 그리드
ax_3d = fig2.add_subplot(111, projection='3d')

# 타겟 그리드 포인트 생성
range_3d = np.linspace(range_offset, range_offset + (range_count-1)*range_spacing, range_count)
azimuth_3d = np.linspace(azimuth_offset, azimuth_offset + (azimuth_count-1)*azimuth_spacing, azimuth_count)

# 메시 그리드
Az_mesh, R_mesh = np.meshgrid(azimuth_3d, range_3d)
Z_mesh = np.zeros_like(Az_mesh)  # 지면

# 지면 표면
ax_3d.plot_surface(Az_mesh, R_mesh, Z_mesh, alpha=0.3, cmap='terrain')

# 타겟 포인트들
for i, az in enumerate(azimuth_3d):
    for j, rng in enumerate(range_3d):
        color = 'red' if (i == 0 and j == 0) else \
                ('purple' if (i == len(azimuth_3d)-1 and j == len(range_3d)-1) else 'cyan')
        size = 100 if (i == 0 and j == 0) or (i == len(azimuth_3d)-1 and j == len(range_3d)-1) else 30
        ax_3d.scatter(az, rng, 0, color=color, s=size, alpha=0.8, edgecolor='black', linewidth=1)

# 위성 궤도
sat_altitude = 100
orbit_3d = azimuth_3d
ax_3d.plot(orbit_3d, np.zeros_like(orbit_3d), 
          sat_altitude * np.ones_like(orbit_3d), 
          'b-', linewidth=3, label='Satellite Orbit')

# 위성 위치들
for i, az in enumerate(azimuth_3d[::2]):  # 2개씩 건너뛰기
    ax_3d.scatter(az, 0, sat_altitude, color='blue', s=200, 
                 marker='s', alpha=0.7, edgecolor='black', linewidth=2)
    
    # 빔 라인 (중앙 range만)
    mid_range = range_offset + (range_count-1)*range_spacing/2
    ax_3d.plot([az, az], [0, mid_range], [sat_altitude, 0], 
              'b--', linewidth=1, alpha=0.3)

# 그리드 라인
for az in azimuth_3d:
    ax_3d.plot([az, az], [range_offset, range_offset + (range_count-1)*range_spacing], 
              [0, 0], 'gray', linewidth=0.5, alpha=0.3)
for rng in range_3d:
    ax_3d.plot([azimuth_offset, azimuth_offset + (azimuth_count-1)*azimuth_spacing], 
              [rng, rng], [0, 0], 'gray', linewidth=0.5, alpha=0.3)

# 레이블
ax_3d.set_xlabel('Along-track (Azimuth) [km]', fontsize=12, fontweight='bold')
ax_3d.set_ylabel('Cross-track (Range) [km]', fontsize=12, fontweight='bold')
ax_3d.set_zlabel('Altitude [km]', fontsize=12, fontweight='bold')
ax_3d.set_title(f'3D View: Target Grid\n{range_count} Range × {azimuth_count} Azimuth = {range_count*azimuth_count} Total Pixels', 
               fontsize=14, fontweight='bold', pad=20)
ax_3d.legend(loc='upper right', fontsize=10)

# 시점 조정
ax_3d.view_init(elev=25, azim=135)

# 정보 박스
info_text = f"""
Target Grid Parameters:
• Range: {range_count} samples × {range_spacing}km = {(range_count-1)*range_spacing}km coverage
• Azimuth: {azimuth_count} samples × {azimuth_spacing}km = {(azimuth_count-1)*azimuth_spacing}km coverage
• Total Area: {(range_count-1)*range_spacing * (azimuth_count-1)*azimuth_spacing}km²
• Total Pixels: {range_count * azimuth_count}
"""
ax_3d.text2D(0.02, 0.98, info_text, transform=ax_3d.transAxes,
            fontsize=10, verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.9))

plt.tight_layout()
plt.savefig('/mnt/user-data/outputs/sar_target_3d_view.png', dpi=150, bbox_inches='tight')
print("3D 타겟 그리드 시각화 저장 완료!")

plt.close('all')

print("\n=== Target Parameter 시각화 완료 ===")
print(f"Range: {range_count} samples × {range_spacing}km spacing, offset {range_offset}km")
print(f"Azimuth: {azimuth_count} samples × {azimuth_spacing}km spacing, offset {azimuth_offset}km")
print(f"Total coverage: {(range_count-1)*range_spacing}km × {(azimuth_count-1)*azimuth_spacing}km = {(range_count-1)*range_spacing * (azimuth_count-1)*azimuth_spacing}km²")
print(f"Total pixels: {range_count * azimuth_count}")