"""
위성 궤도 계산 서비스

위성 위치/속도와 미션 위치를 기반으로 위성 생성 및 미션 방향 계산을 수행합니다.
echo_sim_cmd의 geometry_calculation.py 로직을 참고하여 구현했습니다.
"""

import numpy as np
from typing import List, Tuple, Optional
from astropy.coordinates import EarthLocation
from astropy import units as u


# WGS84 타원체 파라미터
WGS84_A = 6378137.0  # 장반경 (m)
WGS84_F = 1.0 / 298.257223563  # 편평률
WGS84_B = WGS84_A * (1 - WGS84_F)  # 단반경 (m)
WGS84_E2 = WGS84_F * (2.0 - WGS84_F)  # 제1 이심률 제곱


def llh_to_ecef(latitude: float, longitude: float, height: float) -> np.ndarray:
    """
    지리 좌표(위도, 경도, 고도)를 ECEF 좌표로 변환
    
    Parameters:
    -----------
    latitude : float
        위도 (단위: deg)
    longitude : float
        경도 (단위: deg)
    height : float
        고도 (단위: m)
    
    Returns:
    --------
    np.ndarray
        ECEF 좌표 [x, y, z] (단위: m)
    """
    lat_rad = np.deg2rad(latitude)
    lon_rad = np.deg2rad(longitude)
    
    sin_lat = np.sin(lat_rad)
    cos_lat = np.cos(lat_rad)
    sin_lon = np.sin(lon_rad)
    cos_lon = np.cos(lon_rad)
    
    # 타원체의 곡률 반경
    N = WGS84_A / np.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
    
    # ECEF 좌표 계산
    x = (N + height) * cos_lat * cos_lon
    y = (N + height) * cos_lat * sin_lon
    z = (N * (1 - WGS84_E2) + height) * sin_lat
    
    return np.array([x, y, z])


def ecef_to_llh(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    ECEF 좌표를 지리 좌표(위도, 경도, 고도)로 변환
    
    Parameters:
    -----------
    x, y, z : float
        ECEF 좌표 (단위: m)
    
    Returns:
    --------
    Tuple[float, float, float]
        (위도, 경도, 고도) (단위: [deg, deg, m])
    """
    # 경도 계산
    lon = np.arctan2(y, x)
    p = np.hypot(x, y)
    
    # 위도 계산 (반복법)
    lat = np.arctan2(z, p * (1.0 - WGS84_E2))
    for _ in range(6):
        sin_lat = np.sin(lat)
        N = WGS84_A / np.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
        h = p / np.cos(lat) - N
        lat = np.arctan2(z, p * (1.0 - WGS84_E2 * (N / (N + h))))
    
    # 최종 고도 계산
    sin_lat = np.sin(lat)
    N = WGS84_A / np.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
    h = p / np.cos(lat) - N
    
    lat_deg = np.rad2deg(lat)
    lon_deg = np.rad2deg(lon)
    
    return (lat_deg, lon_deg, h)


def calc_direction_vector(pos: np.ndarray, vel: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    위성 위치와 속도로부터 로컬 좌표계 방향 벡터 계산
    
    echo_sim_cmd의 calc_direction_vector 로직을 참고
    
    Parameters:
    -----------
    pos : np.ndarray
        위성 위치 (ECEF, shape: [3], 단위: m)
    vel : np.ndarray
        위성 속도 (ECEF, shape: [3], 단위: m/s)
    
    Returns:
    --------
    Tuple[np.ndarray, np.ndarray, np.ndarray]
        (X축, Y축, Z축) 방향 벡터
        - X축: 위성 진행 방향 (속도 벡터 방향)
        - Z축: 지구 중심 방향 (위성 위치에서 지구 중심으로)
        - Y축: SAR 관측 방향 (X × Z)
    """
    # Z축: 지구 중심 방향 (위성 위치에서 지구 중심으로)
    z_axis = -pos / np.linalg.norm(pos)
    
    # X축: 위성 진행 방향 (속도 벡터 방향)
    vel_norm = np.linalg.norm(vel)
    if vel_norm < 1e-6:
        # 속도가 거의 0인 경우 기본 방향 사용
        x_axis = np.array([1.0, 0.0, 0.0])
    else:
        x_axis = vel / vel_norm
    
    # Y축: X × Z (SAR 관측 방향)
    y_axis = np.cross(x_axis, z_axis)
    y_norm = np.linalg.norm(y_axis)
    if y_norm < 1e-6:
        # X와 Z가 평행한 경우 기본 방향 사용
        y_axis = np.array([0.0, 1.0, 0.0])
    else:
        y_axis = y_axis / y_norm
    
    # X축 재정의 (Y × Z)
    x_axis = np.cross(y_axis, z_axis)
    x_axis = x_axis / np.linalg.norm(x_axis)
    
    return x_axis, y_axis, z_axis


def calc_beam_direction_to_target(
    satellite_position: np.ndarray,
    satellite_velocity: np.ndarray,
    target_position: np.ndarray
) -> np.ndarray:
    """
    위성에서 타겟으로의 빔 방향 벡터 계산
    
    Parameters:
    -----------
    satellite_position : np.ndarray
        위성 위치 (ECEF, shape: [3], 단위: m)
    satellite_velocity : np.ndarray
        위성 속도 (ECEF, shape: [3], 단위: m/s)
    target_position : np.ndarray
        타겟 위치 (ECEF, shape: [3], 단위: m)
    
    Returns:
    --------
    np.ndarray
        빔 방향 벡터 (ECEF, 정규화된 벡터, shape: [3])
    """
    # 위성에서 타겟으로의 벡터
    target_vector = target_position - satellite_position
    target_distance = np.linalg.norm(target_vector)
    
    if target_distance < 1e-6:
        # 타겟이 위성과 매우 가까운 경우
        return np.array([0.0, 0.0, -1.0])
    
    # 정규화된 타겟 방향 벡터
    target_direction = target_vector / target_distance
    
    # 위성의 로컬 좌표계 계산
    x_axis, y_axis, z_axis = calc_direction_vector(satellite_position, satellite_velocity)
    
    # 타겟 방향을 로컬 좌표계로 변환
    # 타겟 방향 벡터를 로컬 좌표계로 투영
    local_x = np.dot(target_direction, x_axis)
    local_y = np.dot(target_direction, y_axis)
    local_z = np.dot(target_direction, z_axis)
    
    # 빔 방향은 타겟 방향과 동일 (nadir 방향에서의 편차 고려)
    beam_direction = target_direction
    
    return beam_direction / np.linalg.norm(beam_direction)


def calc_crossing_point_ellipsoid(
    position: np.ndarray,
    direction: np.ndarray
) -> Optional[np.ndarray]:
    """
    빔 벡터와 지구 타원체의 교차점 계산
    
    echo_sim_cmd의 calc_crossing_point_of_view_vector_ellipsoid 로직을 참고
    
    Parameters:
    -----------
    position : np.ndarray
        시작 위치 (ECEF, shape: [3], 단위: m)
    direction : np.ndarray
        방향 벡터 (정규화된 벡터, shape: [3])
    
    Returns:
    --------
    Optional[np.ndarray]
        교차점 ECEF 좌표 (shape: [3], 단위: m)
        교차점이 없는 경우 None
    """
    # 타원체 방정식: (x/a)² + (y/a)² + (z/b)² = 1
    # 선 방정식: r = position + t * direction
    
    a = WGS84_A
    b = WGS84_B
    
    p = position
    v = direction
    
    # 이차 방정식 계수 계산
    # 타원체 방정식에 선 방정식 대입
    # (px + t*vx)²/a² + (py + t*vy)²/a² + (pz + t*vz)²/b² = 1
    
    a_coeff = (v[0]**2 + v[1]**2) / (a**2) + v[2]**2 / (b**2)
    b_coeff = 2 * (p[0]*v[0] + p[1]*v[1]) / (a**2) + 2 * p[2]*v[2] / (b**2)
    c_coeff = (p[0]**2 + p[1]**2) / (a**2) + p[2]**2 / (b**2) - 1
    
    discriminant = b_coeff**2 - 4 * a_coeff * c_coeff
    
    if discriminant < 0:
        return None
    
    t1 = (-b_coeff + np.sqrt(discriminant)) / (2 * a_coeff)
    t2 = (-b_coeff - np.sqrt(discriminant)) / (2 * a_coeff)
    
    # 두 교차점 중 위성에서 가까운 점 선택
    t = min(t1, t2) if t1 > 0 and t2 > 0 else max(t1, t2)
    
    if t < 0:
        return None
    
    crossing_point = p + t * v
    
    return crossing_point


def calculate_mission_direction(
    satellite_position_ecef: np.ndarray,
    satellite_velocity_ecef: np.ndarray,
    mission_location_llh: List[float]
) -> dict:
    """
    미션 위치를 지나가도록 위성 방향 계산
    
    Parameters:
    -----------
    satellite_position_ecef : np.ndarray
        위성 위치 (ECEF, shape: [3], 단위: m)
    satellite_velocity_ecef : np.ndarray
        위성 속도 (ECEF, shape: [3], 단위: m/s)
    mission_location_llh : List[float]
        미션 위치 (지리 좌표: [경도, 위도], 단위: [deg, deg])
    
    Returns:
    --------
    dict
        미션 방향 정보
        - beam_direction: 빔 방향 벡터 (ECEF, 정규화된 벡터)
        - heading: Heading 각도 (단위: deg, 0-360)
        - crossing_point: 빔과 지구 교차점 (지리 좌표: [경도, 위도, 고도])
    """
    # 미션 위치를 ECEF로 변환 (고도는 0으로 가정)
    mission_lon, mission_lat = mission_location_llh
    mission_position_ecef = llh_to_ecef(mission_lat, mission_lon, 0.0)
    
    # 위성에서 미션 위치로의 빔 방향 계산
    beam_direction = calc_beam_direction_to_target(
        satellite_position_ecef,
        satellite_velocity_ecef,
        mission_position_ecef
    )
    
    # 빔 방향과 지구 타원체의 교차점 계산
    crossing_point_ecef = calc_crossing_point_ellipsoid(
        satellite_position_ecef,
        beam_direction
    )
    
    crossing_point_llh = None
    if crossing_point_ecef is not None:
        lat, lon, h = ecef_to_llh(
            crossing_point_ecef[0],
            crossing_point_ecef[1],
            crossing_point_ecef[2]
        )
        crossing_point_llh = [lon, lat, h]
    
    # Heading 계산 (위성 속도 방향 기준)
    # 위성 속도 벡터의 방위각 계산
    vel_norm = np.linalg.norm(satellite_velocity_ecef)
    if vel_norm > 1e-6:
        # 속도 벡터를 지리 좌표계로 변환하여 heading 계산
        sat_lat, sat_lon, sat_h = ecef_to_llh(
            satellite_position_ecef[0],
            satellite_position_ecef[1],
            satellite_position_ecef[2]
        )
        
        # 다음 위치 계산 (1초 후)
        next_position_ecef = satellite_position_ecef + satellite_velocity_ecef
        next_lat, next_lon, _ = ecef_to_llh(
            next_position_ecef[0],
            next_position_ecef[1],
            next_position_ecef[2]
        )
        
        # 두 지점 간의 방위각 계산
        d_lon = np.deg2rad(next_lon - sat_lon)
        lat1_rad = np.deg2rad(sat_lat)
        lat2_rad = np.deg2rad(next_lat)
        
        y = np.sin(d_lon) * np.cos(lat2_rad)
        x = np.cos(lat1_rad) * np.sin(lat2_rad) - np.sin(lat1_rad) * np.cos(lat2_rad) * np.cos(d_lon)
        
        heading = np.rad2deg(np.arctan2(y, x))
        if heading < 0:
            heading += 360.0
    else:
        heading = 0.0
    
    return {
        "beam_direction": beam_direction.tolist(),
        "heading": float(heading),
        "crossing_point": crossing_point_llh
    }
