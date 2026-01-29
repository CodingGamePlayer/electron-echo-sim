import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from matplotlib import cm

def orbital_elements_to_cartesian(a, e, i, omega, w, nu):
    """
    궤도 6요소를 직교 좌표계로 변환
    
    Parameters:
    a: 긴반지름 (semi-major axis) [km]
    e: 이심률 (eccentricity) [무차원]
    i: 궤도경사각 (inclination) [degrees]
    omega: 승교점 적경 (longitude of ascending node, RAAN) [degrees]
    w: 근지점 인수 (argument of periapsis) [degrees]
    nu: 진근점이각 (true anomaly) [degrees]
    
    Returns:
    x, y, z: 직교좌표계 위치 [km]
    """
    # 각도를 라디안으로 변환
    i_rad = np.radians(i)
    omega_rad = np.radians(omega)
    w_rad = np.radians(w)
    nu_rad = np.radians(nu)
    
    # 궤도면에서의 위치 계산 (perifocal frame)
    r = a * (1 - e**2) / (1 + e * np.cos(nu_rad))
    x_orb = r * np.cos(nu_rad)
    y_orb = r * np.sin(nu_rad)
    
    # 회전 행렬을 통한 좌표 변환
    cos_omega = np.cos(omega_rad)
    sin_omega = np.sin(omega_rad)
    cos_i = np.cos(i_rad)
    sin_i = np.sin(i_rad)
    cos_w = np.cos(w_rad)
    sin_w = np.sin(w_rad)
    
    # 회전 행렬 적용
    x = (cos_omega * cos_w - sin_omega * sin_w * cos_i) * x_orb + \
        (-cos_omega * sin_w - sin_omega * cos_w * cos_i) * y_orb
    
    y = (sin_omega * cos_w + cos_omega * sin_w * cos_i) * x_orb + \
        (-sin_omega * sin_w + cos_omega * cos_w * cos_i) * y_orb
    
    z = (sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb
    
    return x, y, z

def cartesian_to_latlon(x, y, z, earth_rotation_angle=0):
    """
    직교좌표를 위도/경도로 변환 (지구 자전 고려)
    
    Parameters:
    x, y, z: 직교좌표 [km]
    earth_rotation_angle: 지구 자전 각도 [degrees]
    
    Returns:
    lat, lon: 위도, 경도 [degrees]
    """
    # 지구 자전 보정
    rotation_rad = np.radians(earth_rotation_angle)
    x_rot = x * np.cos(rotation_rad) + y * np.sin(rotation_rad)
    y_rot = -x * np.sin(rotation_rad) + y * np.cos(rotation_rad)
    z_rot = z
    
    # 위도/경도 계산
    r = np.sqrt(x_rot**2 + y_rot**2 + z_rot**2)
    lat = np.degrees(np.arcsin(z_rot / r))
    lon = np.degrees(np.arctan2(y_rot, x_rot))
    
    return lat, lon

def calculate_orbital_period(a):
    """
    케플러 제3법칙을 사용한 궤도 주기 계산
    
    Parameters:
    a: 긴반지름 [km]
    
    Returns:
    period: 궤도 주기 [minutes]
    """
    mu = 398600.4418  # 지구 중력 상수 [km^3/s^2]
    period_seconds = 2 * np.pi * np.sqrt(a**3 / mu)
    return period_seconds / 60  # 분 단위로 변환

def plot_ground_track(a, e, i, omega, w, num_orbits=3):
    """
    지구 표면에 위성의 지상 궤적을 그리기 (여러 궤도)
    
    Parameters:
    a: 긴반지름 [km]
    e: 이심률
    i: 궤도경사각 [degrees]
    omega: 승교점 적경 [degrees]
    w: 근지점 인수 [degrees]
    num_orbits: 그릴 궤도 수
    """
    # 궤도 주기 계산
    orbital_period = calculate_orbital_period(a)
    
    # 지구 자전 속도 (도/분)
    earth_rotation_rate = 360.0 / (24 * 60)  # 약 0.25도/분
    
    # 전체 시뮬레이션 시간
    total_time = orbital_period * num_orbits  # 분
    num_points = 1000 * num_orbits
    
    # 위도/경도 배열
    latitudes = []
    longitudes = []
    
    # 각 시간 스텝마다 위치 계산
    for i_time in range(num_points):
        time = (i_time / num_points) * total_time
        
        # 진근점이각 (간단화: 시간에 비례한다고 가정)
        nu = (time / orbital_period) * 360
        
        # 위성의 3D 위치
        x, y, z = orbital_elements_to_cartesian(a, e, i, omega, w, nu)
        
        # 지구 자전 각도
        earth_angle = earth_rotation_rate * time
        
        # 위도/경도로 변환
        lat, lon = cartesian_to_latlon(x, y, z, earth_angle)
        
        latitudes.append(lat)
        longitudes.append(lon)
    
    # 2D 지도에 그리기
    fig = plt.figure(figsize=(16, 10))
    
    # 지도 배경 (단순 그리드)
    ax = fig.add_subplot(111)
    ax.set_xlim([-180, 180])
    ax.set_ylim([-90, 90])
    ax.set_xlabel('경도 (Longitude) [degrees]', fontsize=14, fontweight='bold')
    ax.set_ylabel('위도 (Latitude) [degrees]', fontsize=14, fontweight='bold')
    ax.set_title(f'위성 지상 궤적 (Ground Track) - {num_orbits} 궤도\n' + 
                 f'a={a}km, e={e}, i={i}°, Ω={omega}°, ω={w}°\n' +
                 f'궤도주기: {orbital_period:.1f}분',
                 fontsize=15, fontweight='bold')
    ax.grid(True, alpha=0.3, linestyle='--')
    
    # 적도 강조
    ax.axhline(y=0, color='red', linestyle='-', linewidth=2, alpha=0.5, label='적도')
    
    # 회귀선 표시
    ax.axhline(y=23.5, color='orange', linestyle='--', linewidth=1, alpha=0.3)
    ax.axhline(y=-23.5, color='orange', linestyle='--', linewidth=1, alpha=0.3)
    
    # 극권 표시
    ax.axhline(y=66.5, color='blue', linestyle='--', linewidth=1, alpha=0.3)
    ax.axhline(y=-66.5, color='blue', linestyle='--', linewidth=1, alpha=0.3)
    
    # 지상 궤적 그리기 (색상 그라디언트로 시간 경과 표시)
    # 경도 불연속성 처리
    lon_segments = []
    lat_segments = []
    current_lon_seg = []
    current_lat_seg = []
    
    for i in range(len(longitudes)):
        if i > 0 and abs(longitudes[i] - longitudes[i-1]) > 180:
            # 경도가 -180/+180 경계를 넘을 때
            lon_segments.append(current_lon_seg)
            lat_segments.append(current_lat_seg)
            current_lon_seg = []
            current_lat_seg = []
        
        current_lon_seg.append(longitudes[i])
        current_lat_seg.append(latitudes[i])
    
    # 마지막 세그먼트 추가
    if current_lon_seg:
        lon_segments.append(current_lon_seg)
        lat_segments.append(current_lat_seg)
    
    # 각 세그먼트 그리기
    colors = cm.viridis(np.linspace(0, 1, len(lon_segments)))
    for idx, (lon_seg, lat_seg) in enumerate(zip(lon_segments, lat_segments)):
        ax.plot(lon_seg, lat_seg, linewidth=2, color=colors[idx], alpha=0.8)
    
    # 시작점과 끝점 표시
    ax.scatter([longitudes[0]], [latitudes[0]], s=200, c='green', 
               marker='o', edgecolors='black', linewidths=2, 
               label='시작점', zorder=5)
    ax.scatter([longitudes[-1]], [latitudes[-1]], s=200, c='red', 
               marker='s', edgecolors='black', linewidths=2, 
               label='종료점', zorder=5)
    
    ax.legend(fontsize=12, loc='upper right')
    
    # 배경색 추가
    ax.set_facecolor('#e6f2ff')
    
    plt.tight_layout()
    return fig, orbital_period

def plot_3d_orbit_with_earth(a, e, i, omega, w, num_points=500):
    """
    3D 공간에서 궤도와 지구를 함께 표시
    """
    # 진근점이각을 0부터 360도까지 변화
    nu_array = np.linspace(0, 360, num_points)
    
    # 각 점에서의 위치 계산
    x_orbit = []
    y_orbit = []
    z_orbit = []
    
    for nu in nu_array:
        x, y, z = orbital_elements_to_cartesian(a, e, i, omega, w, nu)
        x_orbit.append(x)
        y_orbit.append(y)
        z_orbit.append(z)
    
    # 3D 플롯 생성
    fig = plt.figure(figsize=(14, 12))
    ax = fig.add_subplot(111, projection='3d')
    
    # 궤도 그리기
    ax.plot(x_orbit, y_orbit, z_orbit, 'b-', linewidth=2.5, label='위성 궤도')
    
    # 지구 그리기 (반지름 6371km) - 텍스처 맵핑 효과
    u = np.linspace(0, 2 * np.pi, 100)
    v = np.linspace(0, np.pi, 100)
    x_earth = 6371 * np.outer(np.cos(u), np.sin(v))
    y_earth = 6371 * np.outer(np.sin(u), np.sin(v))
    z_earth = 6371 * np.outer(np.ones(np.size(u)), np.cos(v))
    ax.plot_surface(x_earth, y_earth, z_earth, color='lightblue', 
                    alpha=0.7, edgecolors='blue', linewidth=0.1)
    
    # 적도면 표시
    theta = np.linspace(0, 2*np.pi, 100)
    x_eq = 6371 * np.cos(theta) * 1.01
    y_eq = 6371 * np.sin(theta) * 1.01
    z_eq = np.zeros_like(x_eq)
    ax.plot(x_eq, y_eq, z_eq, 'r--', linewidth=2, alpha=0.6, label='적도면')
    
    # 근지점과 원지점 표시
    x_peri, y_peri, z_peri = orbital_elements_to_cartesian(a, e, i, omega, w, 0)
    ax.scatter([x_peri], [y_peri], [z_peri], color='red', s=150, 
               label='근지점 (Periapsis)', marker='o', edgecolors='darkred', linewidths=2)
    
    x_apo, y_apo, z_apo = orbital_elements_to_cartesian(a, e, i, omega, w, 180)
    ax.scatter([x_apo], [y_apo], [z_apo], color='green', s=150, 
               label='원지점 (Apoapsis)', marker='o', edgecolors='darkgreen', linewidths=2)
    
    # 좌표축 설정
    max_range = a * (1 + e) * 1.1
    ax.set_xlim([-max_range, max_range])
    ax.set_ylim([-max_range, max_range])
    ax.set_zlim([-max_range, max_range])
    
    ax.set_xlabel('X (km)', fontsize=13, fontweight='bold')
    ax.set_ylabel('Y (km)', fontsize=13, fontweight='bold')
    ax.set_zlabel('Z (km)', fontsize=13, fontweight='bold')
    ax.set_title(f'3D 궤도 시각화\na={a}km, e={e}, i={i}°, Ω={omega}°, ω={w}°', 
                 fontsize=15, fontweight='bold', pad=20)
    
    ax.legend(fontsize=11, loc='upper left')
    ax.grid(True, alpha=0.3)
    
    # 시점 조정
    ax.view_init(elev=25, azim=45)
    
    plt.tight_layout()
    return fig

# ============================================================
# 예시 1: ISS 유사 궤도 (저궤도, 경사각 51.6도)
# ============================================================
print("=" * 70)
print("예시 1: 국제우주정거장(ISS) 유사 궤도")
print("=" * 70)
a1 = 6371 + 420  # 고도 420km
e1 = 0.0005      # 거의 원형 궤도
i1 = 51.6        # 경사각 51.6도
omega1 = 0       # 승교점 적경
w1 = 0           # 근지점 인수

print(f"궤도 요소:")
print(f"  긴반지름 (a): {a1} km (고도: {a1-6371} km)")
print(f"  이심률 (e): {e1}")
print(f"  경사각 (i): {i1}°")
print(f"  승교점 적경 (Ω): {omega1}°")
print(f"  근지점 인수 (ω): {w1}°")

# 3D 궤도
fig1_3d = plot_3d_orbit_with_earth(a1, e1, i1, omega1, w1)
plt.savefig('/mnt/user-data/outputs/iss_3d_orbit.png', dpi=150, bbox_inches='tight')
print(f"\n✓ 3D 궤도 저장: iss_3d_orbit.png")

# 지상 궤적 (3 궤도)
fig1_ground, period1 = plot_ground_track(a1, e1, i1, omega1, w1, num_orbits=3)
plt.savefig('/mnt/user-data/outputs/iss_ground_track.png', dpi=150, bbox_inches='tight')
print(f"✓ 지상 궤적 저장: iss_ground_track.png")
print(f"  궤도 주기: {period1:.2f}분 (약 {period1/60:.2f}시간)\n")

# ============================================================
# 예시 2: 극궤도 위성 (지구 전체 관측 가능)
# ============================================================
print("=" * 70)
print("예시 2: 극궤도 위성 (Polar Orbit)")
print("=" * 70)
a2 = 6371 + 800  # 고도 800km
e2 = 0.001       # 거의 원형
i2 = 98          # 태양동기궤도에 가까운 극궤도
omega2 = 0       # 승교점 적경
w2 = 0           # 근지점 인수

print(f"궤도 요소:")
print(f"  긴반지름 (a): {a2} km (고도: {a2-6371} km)")
print(f"  이심률 (e): {e2}")
print(f"  경사각 (i): {i2}° (극궤도)")
print(f"  승교점 적경 (Ω): {omega2}°")
print(f"  근지점 인수 (ω): {w2}°")

# 3D 궤도
fig2_3d = plot_3d_orbit_with_earth(a2, e2, i2, omega2, w2)
plt.savefig('/mnt/user-data/outputs/polar_3d_orbit.png', dpi=150, bbox_inches='tight')
print(f"\n✓ 3D 궤도 저장: polar_3d_orbit.png")

# 지상 궤적 (15 궤도 - 지구 전체 커버리지 확인)
fig2_ground, period2 = plot_ground_track(a2, e2, i2, omega2, w2, num_orbits=15)
plt.savefig('/mnt/user-data/outputs/polar_ground_track.png', dpi=150, bbox_inches='tight')
print(f"✓ 지상 궤적 저장: polar_ground_track.png")
print(f"  궤도 주기: {period2:.2f}분 (약 {period2/60:.2f}시간)")
print(f"  15 궤도 후 지구 전체를 거의 순회합니다!\n")

# ============================================================
# 예시 3: 타원 궤도 (몰니야 궤도 유사)
# ============================================================
print("=" * 70)
print("예시 3: 타원 궤도 (고이심률)")
print("=" * 70)
a3 = 26560       # 긴반지름
e3 = 0.72        # 높은 이심률
i3 = 63.4        # 몰니야 궤도 경사각
omega3 = 0       # 승교점 적경
w3 = 270         # 근지점 인수 (근지점이 남반구에)

print(f"궤도 요소:")
print(f"  긴반지름 (a): {a3} km")
print(f"  이심률 (e): {e3}")
print(f"  경사각 (i): {i3}°")
print(f"  승교점 적경 (Ω): {omega3}°")
print(f"  근지점 인수 (ω): {w3}°")

# 3D 궤도
fig3_3d = plot_3d_orbit_with_earth(a3, e3, i3, omega3, w3)
plt.savefig('/mnt/user-data/outputs/elliptical_3d_orbit.png', dpi=150, bbox_inches='tight')
print(f"\n✓ 3D 궤도 저장: elliptical_3d_orbit.png")

# 지상 궤적 (3 궤도)
fig3_ground, period3 = plot_ground_track(a3, e3, i3, omega3, w3, num_orbits=3)
plt.savefig('/mnt/user-data/outputs/elliptical_ground_track.png', dpi=150, bbox_inches='tight')
print(f"✓ 지상 궤적 저장: elliptical_ground_track.png")
print(f"  궤도 주기: {period3:.2f}분 (약 {period3/60:.2f}시간)\n")

print("=" * 70)
print("✅ 모든 시각화 완료!")
print("=" * 70)
print("\n각 궤도에 대해 두 가지 시각화를 생성했습니다:")
print("  1. 3D 궤도: 우주에서 본 위성의 실제 궤도")
print("  2. 지상 궤적: 지구 표면에서 본 위성의 이동 경로")
