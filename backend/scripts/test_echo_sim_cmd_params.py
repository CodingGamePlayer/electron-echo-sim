"""
echo_sim_cmd와 동일한 파라미터로 테스트
커맨드 순서:
  loadsystemparam 7_system_def_param_ex_c5.ssp
  loadbeam 6_beam_def_ex.ssp
  loadmission strmp_type2_1tgt.ssp
  createorbit incl=98 lon=132 lat=0
  loadtarget tar_strmp2_1tgt.ssp
  fastmode 1
  foldertowrite myTemp
  interval 1
  genprof 0
  generate result.h5
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
import numpy as np

# WGS84 파라미터
WGS84_A = 6378137.0  # 장반경 (m)
WGS84_F = 1.0 / 298.257223563  # 편평률
WGS84_E2 = WGS84_F * (2.0 - WGS84_F)  # 이심률 제곱

def llh_to_ecef(lat, lon, alt):
    """
    위도/경도/고도를 ECEF 좌표로 변환
    
    Parameters:
    -----------
    lat : float
        위도 (degrees)
    lon : float
        경도 (degrees)
    alt : float
        고도 (m)
    
    Returns:
    --------
    np.ndarray
        ECEF 좌표 [x, y, z] (m)
    """
    lat_rad = np.deg2rad(lat)
    lon_rad = np.deg2rad(lon)
    
    sin_lat = np.sin(lat_rad)
    cos_lat = np.cos(lat_rad)
    sin_lon = np.sin(lon_rad)
    cos_lon = np.cos(lon_rad)
    
    # 곡률 반경
    N = WGS84_A / np.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
    
    # ECEF 좌표
    x = (N + alt) * cos_lat * cos_lon
    y = (N + alt) * cos_lat * sin_lon
    z = (N * (1.0 - WGS84_E2) + alt) * sin_lat
    
    return np.array([x, y, z])

# 출력 디렉토리
OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

print("=== echo_sim_cmd 파라미터로 테스트 ===\n")

# 1. loadsystemparam 7_system_def_param_ex_c5.ssp
# orbit_height: 561e3 (561km)
# antenna_width: 3.9m
# antenna_height: 1.9m
orbit_height = 561e3
antenna_width = 3.9
antenna_height = 1.9

# 2. loadmission strmp_type2_1tgt.ssp
# fc: 5410000000.0 (5.41 GHz)
# bw: 150000000.0 (150 MHz)
# fs: 250000000.0 (250 MHz)
# prf: 5930
# swl: 4.55e-05 (45.5 μs)
# swst: 4.78e-05 (47.8 μs)
# taup: 1.1e-05 (11 μs)
# num_pulses: 19515
config = SarSystemConfig(
    fc=5.41e9,  # 5.41 GHz
    bw=150e6,   # 150 MHz
    taup=11e-6, # 11 μs
    fs=250e6,   # 250 MHz
    prf=5930,   # 5930 Hz
    swst=47.8e-6,  # 47.8 μs
    swl=45.5e-6,   # 45.5 μs
    orbit_height=orbit_height,
    antenna_width=antenna_width,
    antenna_height=antenna_height
)

print(f"Config:")
print(f"  fc: {config.fc/1e9:.2f} GHz")
print(f"  bw: {config.bw/1e6:.1f} MHz")
print(f"  taup: {config.taup*1e6:.2f} μs")
print(f"  fs: {config.fs/1e6:.1f} MHz")
print(f"  prf: {config.prf:.0f} Hz")
print(f"  swst: {config.swst*1e6:.2f} μs")
print(f"  swl: {config.swl*1e6:.2f} μs")
print(f"  orbit_height: {config.orbit_height/1e3:.0f} km")
print(f"  antenna_width: {config.antenna_width:.1f} m")
print(f"  antenna_height: {config.antenna_height:.1f} m")

# 3. createorbit incl=98 lon=132 lat=0
# inclination: 98도
# longitude: 132도 (RAAN 계산에 사용)
# latitude: 0도 (적도)
inclination = 98.0  # degrees
longitude = 132.0   # degrees
latitude = 0.0      # degrees

# 4. loadtarget tar_strmp2_1tgt.ssp
# lat: -0.2237381576385549
# lon: 130.4053902279183
# alt: 0.0
# reflectivity: 1.0
# phase: 0.0
target_lat = -0.2237381576385549
target_lon = 130.4053902279183
target_alt = 0.0
target_reflectivity = 1.0

print(f"\nTarget (original):")
print(f"  lat: {target_lat:.6f} deg")
print(f"  lon: {target_lon:.6f} deg")
print(f"  alt: {target_alt:.1f} m")
print(f"  reflectivity: {target_reflectivity:.1f}")

# 타겟을 ECEF 좌표로 변환
target_position_original = llh_to_ecef(target_lat, target_lon, target_alt)
print(f"  ECEF: [{target_position_original[0]/1e3:.2f}, {target_position_original[1]/1e3:.2f}, {target_position_original[2]/1e3:.2f}] km")

# 5. 위성 궤도 생성 (incl=98, lon=132, lat=0)
# 위성 궤도를 생성하기 위해 간단한 원형 궤도 가정
# 실제로는 astropy를 사용하여 정확한 궤도를 생성해야 하지만,
# 여기서는 테스트를 위해 간단한 방법 사용

# 궤도 반경
R_orbit = 6378137.0 + orbit_height  # 지구 반경 + 궤도 높이

# 궤도 속도 (원형 궤도 가정)
GM = 3.986004418e14  # 지구 중력 상수 (m³/s²)
v_orbit = np.sqrt(GM / R_orbit)

print(f"\nOrbit:")
print(f"  inclination: {inclination:.1f} deg")
print(f"  longitude: {longitude:.1f} deg")
print(f"  latitude: {latitude:.1f} deg")
print(f"  orbit_radius: {R_orbit/1e3:.2f} km")
print(f"  orbit_velocity: {v_orbit:.2f} m/s")

# 위성 초기 위치 계산
# 타겟이 위성 경로의 중간에 오도록 설정
# 위성이 타겟의 경도 근처를 지나가도록 설정

# 6. num_pulses: 19515 (mission 파일에서)
num_pulses = 19515
print(f"\nPulse 개수: {num_pulses}")

dt_pulse = 1.0 / config.prf
mid_pulse = num_pulses // 2

# 위성이 타겟을 지나가도록 설정
# 타겟의 경도 근처에서 위성이 지나가도록 설정
# 위성이 동쪽으로 이동하면서 타겟을 지나가도록

# 타겟의 경도에 맞춰서 위성 초기 위치 설정
# 위성이 mid_pulse에서 타겟과 최근접하도록
target_lon_rad = np.deg2rad(target_lon)

# 위성 초기 위치: 타겟보다 서쪽에 배치 (경도가 작은 곳)
# 위성이 동쪽으로 이동하면서 타겟을 지나감
initial_lat = 0.0
# 타겟 경도에서 위성이 mid_pulse에 도달하도록 초기 경도 계산
# 위성 속도로 계산하면 약 7579 m/s * (mid_pulse * dt_pulse) 거리만큼 이동
# 지구 반경에서 각도로 변환
earth_radius = 6378137.0
distance_per_pulse = v_orbit * dt_pulse  # 각 pulse마다 이동 거리
total_distance = distance_per_pulse * mid_pulse  # mid_pulse까지 이동 거리
angle_offset = total_distance / earth_radius  # 라디안
initial_lon = target_lon - np.rad2deg(angle_offset)

initial_position = llh_to_ecef(initial_lat, initial_lon, orbit_height)

# 위성 속도: 타겟 경도 방향으로 이동
# 경도 방향으로 이동하는 속도 벡터 계산
lon_rad = np.deg2rad(initial_lon)
velocity_east = v_orbit * np.cos(lon_rad)  # 동쪽 성분
velocity_north = v_orbit * np.sin(lon_rad)  # 북쪽 성분 (적도에서는 0에 가까움)
initial_velocity = np.array([
    -velocity_east * np.sin(lon_rad),  # X 성분
    velocity_east * np.cos(lon_rad),   # Y 성분
    0.0  # Z 성분 (적도 상공)
])

print(f"  initial_position: [{initial_position[0]/1e3:.2f}, {initial_position[1]/1e3:.2f}, {initial_position[2]/1e3:.2f}] km")
print(f"  initial_velocity: [{initial_velocity[0]:.2f}, {initial_velocity[1]:.2f}, {initial_velocity[2]:.2f}] m/s")
print(f"  initial_lon: {initial_lon:.6f} deg (target_lon: {target_lon:.6f} deg)")

# 위성 위치 생성 (위성이 타겟을 지나가도록)
satellite_positions = np.zeros((num_pulses, 3))
satellite_velocities = np.zeros((num_pulses, 3))

# 각 pulse마다 위성 위치 업데이트
for i in range(num_pulses):
    satellite_positions[i] = initial_position + initial_velocity * (i * dt_pulse)
    satellite_velocities[i] = initial_velocity

# 타겟 위치 조정: 위성이 mid_pulse에서 타겟과 최근접하도록
# 위성 mid_pulse 위치 계산
sat_mid_position = satellite_positions[mid_pulse]
sat_mid_norm = sat_mid_position / np.linalg.norm(sat_mid_position)

# 타겟을 샘플링 윈도우 중간에 배치
# swst=47.8μs, swl=45.5μs -> 중간은 약 70.55μs
target_td = config.swst + config.swl / 2.0  # 약 70.55 μs
target_R = target_td * LIGHT_SPEED / 2.0

# 위성 mid_pulse 위치에서 타겟 방향으로 target_R만큼 떨어진 곳에 타겟 배치
target_position = sat_mid_position - sat_mid_norm * target_R

print(f"\nTarget (adjusted for sampling window):")
print(f"  target_td: {target_td*1e6:.2f} μs")
print(f"  target_R: {target_R/1e3:.2f} km")
print(f"  ECEF: [{target_position[0]/1e3:.2f}, {target_position[1]/1e3:.2f}, {target_position[2]/1e3:.2f}] km")

# 타겟 생성
target = Target(
    position=target_position,
    reflectivity=target_reflectivity
)
target_list = TargetList([target])

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

# 타겟 영역 추출
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
axes[0].set_title('RDA Reconstructed Stripmap SAR Image - echo_sim_cmd params')
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
output_path = OUTPUT_DIR / "test_echo_sim_cmd_params.png"
plt.savefig(output_path, dpi=150, bbox_inches='tight')
plt.close()

print(f"\n시각화 저장: {output_path}")
print("\n=== 테스트 완료 ===")
