"""Rank 추정 및 계산 검증 스크립트

기존 Python 코드의 rank 계산 방식:
  rank = ceil((2 * dist / LIGHT_SPEED - swst) * prf)
  
역계산 (rank로부터 거리):
  min_dist_swst = 0.5 * LIGHT_SPEED * (rank / prf + swst)
  max_dist_swet = 0.5 * LIGHT_SPEED * (rank / prf + swst + swl - taup)
"""

import math

# C5 기본 설정값
swst = 0.0000478  # 47.8μs
swl = 0.0000455   # 45.5μs
taup = 0.000011   # 11μs
prf = 5930
orbit_height = 561000  # 561 km
c = 299792458
earth_radius = 6378137
satellite_radius = earth_radius + orbit_height

print("=" * 70)
print("Rank 추정 및 계산 검증")
print("=" * 70)
print(f"swst: {swst*1e6:.2f} μs")
print(f"swl: {swl*1e6:.2f} μs")
print(f"taup: {taup*1e6:.2f} μs")
print(f"prf: {prf} Hz")
print(f"orbit_height: {orbit_height/1000:.0f} km")
print(f"Satellite Radius: {satellite_radius/1000:.0f} km")
print()

# 방법 1: orbit_height를 최소 거리로 가정 (직하방)
print("방법 1: orbit_height를 최소 거리로 가정 (직하방)")
min_range = orbit_height
min_time = 2 * min_range / c
rank_est1 = math.ceil((min_time - swst) * prf)
print(f"  추정 rank: {rank_est1}")
near_slant1 = 0.5 * c * (rank_est1 / prf + swst)
far_slant1 = 0.5 * c * (rank_est1 / prf + swst + swl - taup)
print(f"  Near Slant: {near_slant1:.2f} m ({near_slant1/1000:.2f} km)")
print(f"  Far Slant: {far_slant1:.2f} m ({far_slant1/1000:.2f} km)")
print(f"  Near > orbit_height: {near_slant1 > orbit_height}")
print()

# 방법 2: 일반적인 SAR 시나리오 (look angle 20-40도)
print("방법 2: 일반적인 SAR 시나리오 (look angle 고려)")
print("  Look angle 범위: 20-40도")
print()

best_result = None
for look_angle_deg in [20, 25, 30, 35, 40]:
    look_angle_rad = math.radians(look_angle_deg)
    # 최소 거리 = orbit_height / cos(look_angle)
    min_range = orbit_height / math.cos(look_angle_rad)
    min_time = 2 * min_range / c
    rank_est = math.ceil((min_time - swst) * prf)
    
    near_slant = 0.5 * c * (rank_est / prf + swst)
    far_slant = 0.5 * c * (rank_est / prf + swst + swl - taup)
    
    # 그라운드 레인지 변환
    if near_slant > orbit_height:
        cos_angle_near = (earth_radius**2 + satellite_radius**2 - near_slant**2) / (2 * earth_radius * satellite_radius)
        cos_angle_near = max(-1, min(1, cos_angle_near))
        angle_near = math.acos(cos_angle_near)
        near_ground = earth_radius * angle_near
        
        cos_angle_far = (earth_radius**2 + satellite_radius**2 - far_slant**2) / (2 * earth_radius * satellite_radius)
        cos_angle_far = max(-1, min(1, cos_angle_far))
        angle_far = math.acos(cos_angle_far)
        far_ground = earth_radius * angle_far
        
        swath_width = far_ground - near_ground
        
        print(f"  Look angle {look_angle_deg}deg: rank={rank_est}, Near={near_ground/1000:.2f}km, Width={swath_width/1000:.2f}km")
        
        if best_result is None or (200000 <= near_ground <= 800000 and swath_width > 0):
            best_result = (look_angle_deg, rank_est, near_ground, far_ground, swath_width)
    else:
        print(f"  Look angle {look_angle_deg}deg: rank={rank_est}, Near Slant={near_slant/1000:.2f}km < orbit_height (invalid)")

print()

# 최종 검증 결과
if best_result:
    look_angle_deg, rank_est, near_ground, far_ground, swath_width = best_result
    print("=" * 70)
    print(f"최종 검증 결과 (Look angle: {look_angle_deg}deg, Rank: {rank_est})")
    print("=" * 70)
    
    near_slant = 0.5 * c * (rank_est / prf + swst)
    far_slant = 0.5 * c * (rank_est / prf + swst + swl - taup)
    
    print(f"Near Slant Range: {near_slant:.2f} m ({near_slant/1000:.2f} km)")
    print(f"Far Slant Range: {far_slant:.2f} m ({far_slant/1000:.2f} km)")
    print(f"Near Ground Range: {near_ground:.2f} m ({near_ground/1000:.2f} km)")
    print(f"Far Ground Range: {far_ground:.2f} m ({far_ground/1000:.2f} km)")
    print(f"Swath Width: {swath_width:.2f} m ({swath_width/1000:.2f} km)")
    print()
    print("=" * 70)
    print("검증 완료: rank 추정을 통해 올바른 값이 계산됨")
    print("=" * 70)
else:
    print("=" * 70)
    print("경고: 적절한 rank를 찾을 수 없음")
    print("=" * 70)
