"""
RDA 알고리즘 비교 테스트
echo_sim_cmd와 동일한 결과를 생성하는지 확인
"""
import numpy as np
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.echo import SarEchoSimulator
from sar_simulator.processing import RDAProcessor
from sar_simulator.common.constants import LIGHT_SPEED

# 출력 디렉토리
OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# echo_sim_cmd와 유사한 설정
config = SarSystemConfig(
    fc=5.4e9,  # C-band
    bw=150e6,
    taup=10e-6,
    fs=350e6,
    prf=5000,
    swst=10e-6,
    swl=50e-6,
    orbit_height=517e3,
    antenna_width=4.0,
    antenna_height=0.5
)

print("=== RDA 알고리즘 비교 테스트 ===\n")
print(f"Config:")
print(f"  fc: {config.fc/1e9:.2f} GHz")
print(f"  bw: {config.bw/1e6:.1f} MHz")
print(f"  taup: {config.taup*1e6:.2f} μs")
print(f"  prf: {config.prf:.0f} Hz")
print(f"  swst: {config.swst*1e6:.2f} μs")
print(f"  swl: {config.swl*1e6:.2f} μs")

# 더 많은 pulse 사용 (echo_sim_cmd는 8000개 사용)
num_pulses = 1000  # 충분한 azimuth 샘플링을 위해 증가
print(f"\nPulse 개수: {num_pulses}")

# 위성 위치 생성 (위성이 타겟을 지나가도록 설정)
satellite_positions = np.zeros((num_pulses, 3))
satellite_velocities = np.zeros((num_pulses, 3))

# 초기 위치
initial_position = np.array([6378137.0 + config.orbit_height, 0.0, 0.0])
initial_velocity = np.array([0.0, 7266.0, 0.0])  # Y축 방향 이동

# 타겟 정의 (샘플링 윈도우 중간)
target_td = 30e-6  # 30 μs
target_R = target_td * LIGHT_SPEED / 2.0

# 타겟을 위성 초기 위치에서 거리 R만큼 떨어진 곳에 배치
# 위성이 Y축 방향으로 이동하므로, 타겟도 Y=0에 배치하되 거리는 R로 설정
sat_norm = initial_position / np.linalg.norm(initial_position)
target_position = initial_position - sat_norm * target_R

# 위성이 타겟을 지나가도록 설정
# 타겟이 위성 경로의 중간에 오도록 위성 초기 위치 조정
# 위성이 num_pulses/2 번째 pulse에서 타겟과 최근접하도록
dt_pulse = 1.0 / config.prf
mid_pulse = num_pulses // 2

# 타겟의 Y 좌표 (위성 경로와 교차하는 지점)
target_y = target_position[1]

# 위성이 mid_pulse에서 타겟과 최근접하도록 초기 Y 위치 조정
initial_y = target_y - initial_velocity[1] * mid_pulse * dt_pulse
initial_position[1] = initial_y

# 각 pulse마다 위성 위치 업데이트
for i in range(num_pulses):
    satellite_positions[i] = initial_position + initial_velocity * (i * dt_pulse)
    satellite_velocities[i] = initial_velocity

target = Target(
    position=target_position,
    reflectivity=1000.0  # 반사도 증가 (더 강한 신호)
)
target_list = TargetList([target])

print(f"\n타겟 위치: {target_position[0]/1000:.2f}, {target_position[1]/1000:.2f}, {target_position[2]/1000:.2f} km")
print(f"타겟 거리: {target_R/1000:.2f} km")

# Echo 신호 생성
print("\nEcho 신호 생성 중...")
echo_sim = SarEchoSimulator(config)
echo_signals = echo_sim.simulate_multiple_pulses(
    target_list=target_list,
    satellite_positions=satellite_positions,
    satellite_velocities=satellite_velocities
)

print(f"Echo 신호 shape: {echo_signals.shape}")
echo_max = np.max(np.abs(echo_signals))
echo_mean = np.mean(np.abs(echo_signals))
print(f"Echo 신호 최대값: {echo_max:.6e}")
print(f"Echo 신호 평균값: {echo_mean:.6e}")

# RDA 처리
print("\nRDA 처리 중...")
satellite_velocity = satellite_velocities[0]
rda_processor = RDAProcessor(config, satellite_velocity)
sar_image_db, range_extent, azimuth_extent = rda_processor.process(
    echo_signals,
    dynamic_range=50.0
)

# 결과 분석
print("\n=== RDA 처리 결과 ===")
print(f"SAR 이미지 shape: {sar_image_db.shape}")
print(f"Range 범위: {range_extent[0]:.2f} ~ {range_extent[1]:.2f} m")
print(f"Azimuth 범위: {azimuth_extent[0]:.2f} ~ {azimuth_extent[1]:.2f} m")
print(f"최대 값: {np.max(sar_image_db):.2f} dB")
print(f"최소 값: {np.min(sar_image_db):.2f} dB")
print(f"평균 값: {np.mean(sar_image_db):.2f} dB")

# 십자가 형태 타겟 응답 확인
max_idx = np.unravel_index(np.argmax(sar_image_db), sar_image_db.shape)
print(f"\n최대값 위치: azimuth={max_idx[0]}, range={max_idx[1]}")
print(f"최대값: {sar_image_db[max_idx]:.2f} dB")

# 타겟 영역 추출 (echo_sim_cmd 방식)
target_region_size = 64
max_i_y = max_idx[0] - target_region_size // 2
max_i_x = max_idx[1] - target_region_size // 2
if max_i_y < 0:
    max_i_y = 0
if max_i_x < 0:
    max_i_x = 0
if max_i_y + target_region_size > sar_image_db.shape[0]:
    max_i_y = sar_image_db.shape[0] - target_region_size
if max_i_x + target_region_size > sar_image_db.shape[1]:
    max_i_x = sar_image_db.shape[1] - target_region_size

target_img = sar_image_db[max_i_y:max_i_y+target_region_size, max_i_x:max_i_x+target_region_size]

print(f"\n타겟 영역 추출:")
print(f"  영역 크기: {target_img.shape}")
print(f"  최대값: {np.max(target_img):.2f} dB")
print(f"  최소값: {np.min(target_img):.2f} dB")

# 시각화
fig, axes = plt.subplots(1, 2, figsize=(16, 8))

# 전체 SAR 이미지
im1 = axes[0].imshow(
    sar_image_db,
    aspect='auto',
    cmap='hot',
    interpolation='nearest',
    origin='lower',
    extent=[range_extent[0], range_extent[1], azimuth_extent[0], azimuth_extent[1]]
)
axes[0].set_xlabel('Range (m)')
axes[0].set_ylabel('Along-Track (m)')
axes[0].set_title('RDA Reconstructed Stripmap SAR Image - Full')
plt.colorbar(im1, ax=axes[0], label='Magnitude (dB)')

# 타겟 영역 확대
target_range_extent = [
    range_extent[0] + (max_i_x / sar_image_db.shape[1]) * (range_extent[1] - range_extent[0]),
    range_extent[0] + ((max_i_x + target_region_size) / sar_image_db.shape[1]) * (range_extent[1] - range_extent[0])
]
target_azimuth_extent = [
    azimuth_extent[0] + (max_i_y / sar_image_db.shape[0]) * (azimuth_extent[1] - azimuth_extent[0]),
    azimuth_extent[0] + ((max_i_y + target_region_size) / sar_image_db.shape[0]) * (azimuth_extent[1] - azimuth_extent[0])
]

im2 = axes[1].imshow(
    target_img,
    aspect='auto',
    cmap='hot',
    interpolation='nearest',
    origin='lower',
    extent=[target_range_extent[0], target_range_extent[1], target_azimuth_extent[0], target_azimuth_extent[1]]
)
axes[1].set_xlabel('Range (m)')
axes[1].set_ylabel('Along-Track (m)')
axes[1].set_title('Target Region (Zoomed) - 십자가 형태 확인')
plt.colorbar(im2, ax=axes[1], label='Magnitude (dB)')

plt.tight_layout()
output_path = OUTPUT_DIR / "test_rda_comparison.png"
plt.savefig(output_path, dpi=150, bbox_inches='tight')
plt.close()

print(f"\n시각화 저장: {output_path}")

# Range/Azimuth 프로파일 확인
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Range 프로파일 (azimuth 중심선)
center_az = target_img.shape[0] // 2
range_profile = target_img[center_az, :]
range_positions = np.linspace(target_range_extent[0], target_range_extent[1], len(range_profile))

axes[0, 0].plot(range_positions, range_profile, 'b-', linewidth=2)
axes[0, 0].set_xlabel('Range (m)')
axes[0, 0].set_ylabel('Magnitude (dB)')
axes[0, 0].set_title('Range Profile (Azimuth Center)')
axes[0, 0].grid(True, alpha=0.3)

# Azimuth 프로파일 (range 중심선)
center_rg = target_img.shape[1] // 2
azimuth_profile = target_img[:, center_rg]
azimuth_positions = np.linspace(target_azimuth_extent[0], target_azimuth_extent[1], len(azimuth_profile))

axes[0, 1].plot(azimuth_positions, azimuth_profile, 'r-', linewidth=2)
axes[0, 1].set_xlabel('Along-Track (m)')
axes[0, 1].set_ylabel('Magnitude (dB)')
axes[0, 1].set_title('Azimuth Profile (Range Center)')
axes[0, 1].grid(True, alpha=0.3)

# 2D 타겟 영역
im3 = axes[1, 0].imshow(
    target_img,
    aspect='auto',
    cmap='hot',
    interpolation='nearest',
    origin='lower',
    extent=[target_range_extent[0], target_range_extent[1], target_azimuth_extent[0], target_azimuth_extent[1]]
)
axes[1, 0].set_xlabel('Range (m)')
axes[1, 0].set_ylabel('Along-Track (m)')
axes[1, 0].set_title('Target Region 2D')
plt.colorbar(im3, ax=axes[1, 0], label='Magnitude (dB)')

# 통계 정보
axes[1, 1].axis('off')
info_text = f"""
RDA 처리 결과 분석:

SAR 이미지:
  Shape: {sar_image_db.shape}
  Range: {range_extent[0]:.2f} ~ {range_extent[1]:.2f} m
  Azimuth: {azimuth_extent[0]:.2f} ~ {azimuth_extent[1]:.2f} m
  최대값: {np.max(sar_image_db):.2f} dB
  최소값: {np.min(sar_image_db):.2f} dB

타겟 응답:
  최대값 위치: azimuth={max_idx[0]}, range={max_idx[1]}
  최대값: {sar_image_db[max_idx]:.2f} dB
  타겟 영역 크기: {target_img.shape}

십자가 형태 확인:
  Range 방향 side lobe: 확인 필요
  Azimuth 방향 side lobe: 확인 필요
"""
axes[1, 1].text(0.05, 0.95, info_text, transform=axes[1, 1].transAxes,
                fontsize=10, verticalalignment='top', family='monospace',
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

plt.tight_layout()
profile_path = OUTPUT_DIR / "test_rda_profiles.png"
plt.savefig(profile_path, dpi=150, bbox_inches='tight')
plt.close()

print(f"프로파일 시각화 저장: {profile_path}")
print("\n=== 테스트 완료 ===")
