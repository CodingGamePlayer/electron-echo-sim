"""
전체 시나리오 테스트

echo_sim_cmd처럼 많은 pulse와 타겟을 처리하는 전체 시나리오 테스트 케이스입니다.
배치 처리, 성능 측정, 위성 궤도 운동을 포함합니다.
"""

import numpy as np
import pytest
import time
import psutil
import os
from pathlib import Path
from typing import Optional, Tuple
from tqdm import tqdm
import matplotlib
matplotlib.use('Agg')  # GUI 없이 백엔드 사용 (테스트 환경용)
import matplotlib.pyplot as plt

from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.echo import SarEchoSimulator
from sar_simulator.common.constants import LIGHT_SPEED

# 출력 디렉토리
OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


# 지구 상수
EARTH_RADIUS = 6378137.0  # WGS84 장반경 (m)
GM = 3.986004418e14  # 지구 중력 상수 (m³/s²)


def generate_satellite_trajectory(
    num_pulses: int,
    config: SarSystemConfig,
    initial_position: Optional[np.ndarray] = None,
    initial_velocity: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    위성 궤도 운동을 시뮬레이션하여 각 pulse마다 위치와 속도를 생성
    
    Parameters:
    -----------
    num_pulses : int
        Pulse 개수
    config : SarSystemConfig
        SAR 시스템 설정 (orbit_height, prf 사용)
    initial_position : np.ndarray, optional
        초기 위성 위치 [x, y, z] (ECEF, m)
        None인 경우 기본값: [R, 0, 0] (적도 상공)
    initial_velocity : np.ndarray, optional
        초기 위성 속도 [vx, vy, vz] (ECEF, m/s)
        None인 경우 원형 궤도 속도 계산
    
    Returns:
    --------
    satellite_positions : np.ndarray
        위성 위치 배열 (shape: [num_pulses, 3], ECEF, m)
    satellite_velocities : np.ndarray
        위성 속도 배열 (shape: [num_pulses, 3], ECEF, m/s)
    """
    # 궤도 반경
    R_orbit = EARTH_RADIUS + config.orbit_height
    
    # 궤도 속도 계산 (원형 궤도 가정)
    # v = sqrt(GM / R)
    v_orbit = np.sqrt(GM / R_orbit)
    
    # 각속도
    omega = v_orbit / R_orbit  # rad/s
    
    # 초기 위치 설정
    if initial_position is None:
        # 적도 상공, X축 방향
        initial_position = np.array([R_orbit, 0.0, 0.0], dtype=np.float64)
    
    # 초기 속도 설정
    if initial_velocity is None:
        # Y축 방향 (동쪽)
        initial_velocity = np.array([0.0, v_orbit, 0.0], dtype=np.float64)
    
    # 시간 간격 (PRF에 따라)
    dt = 1.0 / config.prf  # s
    
    # 결과 배열 초기화
    satellite_positions = np.zeros((num_pulses, 3), dtype=np.float64)
    satellite_velocities = np.zeros((num_pulses, 3), dtype=np.float64)
    
    # 초기값 설정
    satellite_positions[0] = initial_position
    satellite_velocities[0] = initial_velocity
    
    # 각 pulse마다 위치 계산
    for i in range(1, num_pulses):
        # 경과 시간
        t = i * dt
        
        # 각도 변화
        dtheta = omega * t
        
        # 회전 행렬 (Z축 기준 회전, 적도 궤도 가정)
        cos_theta = np.cos(dtheta)
        sin_theta = np.sin(dtheta)
        rotation_matrix = np.array([
            [cos_theta, -sin_theta, 0],
            [sin_theta,  cos_theta, 0],
            [0,          0,         1]
        ], dtype=np.float64)
        
        # 위치 업데이트
        satellite_positions[i] = rotation_matrix @ initial_position
        
        # 속도 업데이트 (접선 방향)
        satellite_velocities[i] = rotation_matrix @ initial_velocity
    
    return satellite_positions, satellite_velocities


def generate_target_grid(
    num_targets: int,
    satellite_position: np.ndarray,
    config: SarSystemConfig,
    grid_size: Optional[int] = None
) -> TargetList:
    """
    그리드 형태로 타겟 생성
    
    Parameters:
    -----------
    num_targets : int
        생성할 타겟 개수
    satellite_position : np.ndarray
        위성 초기 위치 (ECEF, m)
    config : SarSystemConfig
        SAR 시스템 설정
    grid_size : int, optional
        그리드 크기 (한 변의 타겟 개수)
        None인 경우 자동 계산 (sqrt(num_targets))
    
    Returns:
    --------
    TargetList
        생성된 타겟 리스트
    """
    if grid_size is None:
        grid_size = int(np.ceil(np.sqrt(num_targets)))
    
    # 샘플링 윈도우 중간 지점의 거리 계산
    target_td = config.swst + config.swl / 2.0
    target_R = target_td * LIGHT_SPEED / 2.0
    
    # 위성에서 타겟 방향 (nadir 방향)
    sat_norm = satellite_position / np.linalg.norm(satellite_position)
    
    # 그리드 생성 (위성 아래 지면에 배치)
    targets = []
    spacing = 1000.0  # 타겟 간격 (m)
    
    # 그리드 중심을 위성 바로 아래로 설정
    center_position = satellite_position - sat_norm * target_R
    
    # 그리드 생성
    count = 0
    for i in range(grid_size):
        for j in range(grid_size):
            if count >= num_targets:
                break
            
            # 그리드 오프셋 계산 (위성 속도 방향과 수직인 평면)
            # 간단히 X-Y 평면에 배치
            offset_x = (i - grid_size / 2) * spacing
            offset_y = (j - grid_size / 2) * spacing
            
            # 타겟 위치 계산
            # 위성 속도 방향 (Y축)과 수직인 방향으로 오프셋 적용
            # 간단히 X축과 Z축 방향으로 오프셋
            target_position = center_position.copy()
            target_position[0] += offset_x
            target_position[2] += offset_y
            
            # 반사도 랜덤 설정 (1.0 ~ 100.0)
            reflectivity = 1.0 + (count % 100) * 0.99
            
            target = Target(
                position=target_position,
                reflectivity=reflectivity,
                phase=0.0
            )
            targets.append(target)
            count += 1
        
        if count >= num_targets:
            break
    
    return TargetList(targets)


def simulate_pulses_in_batches(
    echo_sim: SarEchoSimulator,
    target_list: TargetList,
    satellite_positions: np.ndarray,
    satellite_velocities: np.ndarray,
    batch_size: int = 64
) -> np.ndarray:
    """
    배치 단위로 pulse 처리 (tqdm 진행 표시)
    
    Parameters:
    -----------
    echo_sim : SarEchoSimulator
        Echo 시뮬레이터
    target_list : TargetList
        타겟 리스트
    satellite_positions : np.ndarray
        위성 위치 배열 (shape: [num_pulses, 3])
    satellite_velocities : np.ndarray
        위성 속도 배열 (shape: [num_pulses, 3])
    batch_size : int
        배치 크기 (기본값: 64)
    
    Returns:
    --------
    np.ndarray
        Echo 신호 배열 (shape: [num_pulses, num_samples])
    """
    num_pulses = satellite_positions.shape[0]
    num_batches = (num_pulses + batch_size - 1) // batch_size
    echo_signals = np.zeros((num_pulses, echo_sim.config.num_samples), dtype=np.complex64)
    
    # tqdm으로 진행 상황 표시
    with tqdm(total=num_pulses, desc="Processing pulses", unit="pulse") as pbar:
        for i in range(num_batches):
            start_idx = i * batch_size
            end_idx = min((i + 1) * batch_size, num_pulses)
            
            batch_positions = satellite_positions[start_idx:end_idx]
            batch_velocities = satellite_velocities[start_idx:end_idx]
            
            batch_echo = echo_sim.simulate_multiple_pulses(
                target_list=target_list,
                satellite_positions=batch_positions,
                satellite_velocities=batch_velocities
            )
            echo_signals[start_idx:end_idx] = batch_echo
            
            # 진행 상황 업데이트
            pbar.update(end_idx - start_idx)
    
    return echo_signals


def measure_performance(func, *args, **kwargs):
    """
    함수 실행 시간 및 메모리 사용량 측정 (psutil 사용)
    
    Parameters:
    -----------
    func : callable
        측정할 함수
    *args, **kwargs
        함수에 전달할 인자
    
    Returns:
    --------
    dict
        측정 결과 딕셔너리
        - result: 함수 실행 결과
        - time: 실행 시간 (초)
        - memory_used: 메모리 사용량 증가 (MB)
        - memory_peak: 최대 메모리 사용량 (MB)
    """
    process = psutil.Process(os.getpid())
    mem_before = process.memory_info().rss / 1024 / 1024  # MB
    
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    
    mem_after = process.memory_info().rss / 1024 / 1024  # MB
    
    return {
        'result': result,
        'time': end_time - start_time,
        'memory_used': mem_after - mem_before,
        'memory_peak': mem_after
    }


def visualize_chirp_signal(
    chirp_signal: np.ndarray,
    config: SarSystemConfig,
    output_path: Path,
    title: str = "Chirp Signal"
):
    """
    Chirp 신호 시각화
    
    Parameters:
    -----------
    chirp_signal : np.ndarray
        Chirp 신호 배열
    config : SarSystemConfig
        SAR 시스템 설정
    output_path : Path
        출력 파일 경로
    title : str
        그래프 제목
    """
    fig, axes = plt.subplots(3, 1, figsize=(12, 10))
    
    # 시간 벡터 생성
    dt = 1.0 / config.fs
    t = np.arange(len(chirp_signal)) * dt * 1e6  # 마이크로초 단위
    
    # 1. 시간 영역 - 실수부와 허수부
    axes[0].plot(t, chirp_signal.real, label='Real', alpha=0.7)
    axes[0].plot(t, chirp_signal.imag, label='Imaginary', alpha=0.7)
    axes[0].set_xlabel('Time (μs)')
    axes[0].set_ylabel('Amplitude')
    axes[0].set_title(f'{title} - Time Domain (I/Q)')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # 2. 시간 영역 - 크기 (Magnitude)
    axes[1].plot(t, np.abs(chirp_signal), 'g-', linewidth=1.5)
    axes[1].set_xlabel('Time (μs)')
    axes[1].set_ylabel('Magnitude')
    axes[1].set_title(f'{title} - Magnitude')
    axes[1].grid(True, alpha=0.3)
    
    # 3. 주파수 영역 (FFT)
    fft_signal = np.fft.fft(chirp_signal)
    fft_freq = np.fft.fftfreq(len(chirp_signal), dt) / 1e6  # MHz 단위
    fft_magnitude = np.abs(fft_signal)
    
    # 양의 주파수만 표시
    positive_freq_idx = fft_freq >= 0
    positive_freq = fft_freq[positive_freq_idx]
    positive_magnitude = fft_magnitude[positive_freq_idx]
    
    axes[2].plot(positive_freq, positive_magnitude, 'r-', linewidth=1.5)
    axes[2].set_xlabel('Frequency (MHz)')
    axes[2].set_ylabel('Magnitude')
    axes[2].set_title(f'{title} - Frequency Domain (FFT)')
    axes[2].grid(True, alpha=0.3)
    axes[2].set_xlim([0, config.fs / 2 / 1e6])  # 나이키스트 주파수까지
    
    # 대역폭 범위 표시
    axes[2].axvline(config.bw / 2 / 1e6, color='g', linestyle='--', alpha=0.5, 
                    label=f'BW/2 = {config.bw/2/1e6:.2f} MHz')
    axes[2].legend()
    
    # 대역폭 내 에너지 비율 표시
    bw_mask = np.abs(positive_freq) <= config.bw / 2 / 1e6
    if np.sum(bw_mask) > 0:
        bw_energy_ratio = np.sum(positive_magnitude[bw_mask]) / np.sum(positive_magnitude) * 100
        axes[2].text(0.02, 0.98, f'Energy in BW: {bw_energy_ratio:.2f}%', 
                     transform=axes[2].transAxes, verticalalignment='top',
                     bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Chirp 신호 시각화 저장: {output_path}")


def visualize_orbital_trajectory(
    satellite_positions: np.ndarray,
    output_path: Path
):
    """
    위성 궤도 궤적 시각화
    
    Parameters:
    -----------
    satellite_positions : np.ndarray
        위성 위치 배열 (shape: [num_pulses, 3])
    output_path : Path
        출력 파일 경로
    """
    fig = plt.figure(figsize=(12, 8))
    ax = fig.add_subplot(111, projection='3d')
    
    # 위성 궤적 플롯
    ax.plot(
        satellite_positions[:, 0] / 1000,  # km
        satellite_positions[:, 1] / 1000,  # km
        satellite_positions[:, 2] / 1000,  # km
        'b-', linewidth=1, alpha=0.7, label='Satellite trajectory'
    )
    
    # 시작점과 끝점 표시
    ax.scatter(
        satellite_positions[0, 0] / 1000,
        satellite_positions[0, 1] / 1000,
        satellite_positions[0, 2] / 1000,
        c='g', s=100, marker='o', label='Start'
    )
    ax.scatter(
        satellite_positions[-1, 0] / 1000,
        satellite_positions[-1, 1] / 1000,
        satellite_positions[-1, 2] / 1000,
        c='r', s=100, marker='s', label='End'
    )
    
    ax.set_xlabel('X (km)')
    ax.set_ylabel('Y (km)')
    ax.set_zlabel('Z (km)')
    ax.set_title('Satellite Orbital Trajectory')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"위성 궤적 시각화 저장: {output_path}")


def visualize_echo_signals_2d(
    echo_signals: np.ndarray,
    config: SarSystemConfig,
    output_path: Path,
    title: str = "Echo Signals"
):
    """
    여러 펄스 Echo 신호 시각화 (2D 이미지)
    
    Parameters:
    -----------
    echo_signals : np.ndarray
        Echo 신호 배열 (shape: [num_pulses, num_samples])
    config : SarSystemConfig
        SAR 시스템 설정
    output_path : Path
        출력 파일 경로
    title : str
        그래프 제목
    """
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))
    
    # 1. 2D 이미지 - 크기
    magnitude_2d = np.abs(echo_signals)
    im1 = axes[0].imshow(
        magnitude_2d,
        aspect='auto',
        cmap='hot',
        interpolation='nearest',
        origin='lower'
    )
    axes[0].set_xlabel('Range Sample')
    axes[0].set_ylabel('Pulse Number')
    axes[0].set_title(f'{title} - Magnitude (2D)')
    plt.colorbar(im1, ax=axes[0], label='Magnitude')
    
    # 2. 2D 이미지 - 위상
    phase_2d = np.angle(echo_signals)
    im2 = axes[1].imshow(
        phase_2d,
        aspect='auto',
        cmap='hsv',
        interpolation='nearest',
        origin='lower',
        vmin=-np.pi,
        vmax=np.pi
    )
    axes[1].set_xlabel('Range Sample')
    axes[1].set_ylabel('Pulse Number')
    axes[1].set_title(f'{title} - Phase (2D)')
    plt.colorbar(im2, ax=axes[1], label='Phase (rad)')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Echo 신호 2D 시각화 저장: {output_path}")


def visualize_performance_comparison(
    results: dict,
    output_path: Path
):
    """
    성능 비교 차트 생성
    
    Parameters:
    -----------
    results : dict
        위성별 성능 결과 딕셔너리
        {위성명: {time, pulse_per_sec, memory_used, ...}}
    output_path : Path
        출력 파일 경로
    """
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    satellite_names = list(results.keys())
    
    # 1. 처리 시간 비교
    times = [results[name]['time'] for name in satellite_names]
    axes[0, 0].bar(satellite_names, times, color='skyblue')
    axes[0, 0].set_ylabel('처리 시간 (초)')
    axes[0, 0].set_title('처리 시간 비교')
    axes[0, 0].tick_params(axis='x', rotation=45)
    for i, v in enumerate(times):
        axes[0, 0].text(i, v, f'{v:.2f}', ha='center', va='bottom')
    
    # 2. Pulse 처리 속도 비교
    pulse_per_sec = [results[name]['pulse_per_sec'] for name in satellite_names]
    axes[0, 1].bar(satellite_names, pulse_per_sec, color='lightgreen')
    axes[0, 1].set_ylabel('Pulse 처리 속도 (pulse/sec)')
    axes[0, 1].set_title('Pulse 처리 속도 비교')
    axes[0, 1].tick_params(axis='x', rotation=45)
    for i, v in enumerate(pulse_per_sec):
        axes[0, 1].text(i, v, f'{v:.0f}', ha='center', va='bottom')
    
    # 3. 메모리 사용량 비교
    memory_used = [results[name]['memory_used'] for name in satellite_names]
    axes[1, 0].bar(satellite_names, memory_used, color='coral')
    axes[1, 0].set_ylabel('메모리 사용량 (MB)')
    axes[1, 0].set_title('메모리 사용량 비교')
    axes[1, 0].tick_params(axis='x', rotation=45)
    for i, v in enumerate(memory_used):
        axes[1, 0].text(i, v, f'{v:.1f}', ha='center', va='bottom')
    
    # 4. Echo 신호 최대값 비교
    echo_max = [results[name]['echo_max'] for name in satellite_names]
    axes[1, 1].bar(satellite_names, echo_max, color='plum')
    axes[1, 1].set_ylabel('Echo 신호 최대값')
    axes[1, 1].set_title('Echo 신호 최대값 비교')
    axes[1, 1].tick_params(axis='x', rotation=45)
    axes[1, 1].set_yscale('log')
    for i, v in enumerate(echo_max):
        axes[1, 1].text(i, v, f'{v:.2e}', ha='center', va='bottom', fontsize=8)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"성능 비교 차트 저장: {output_path}")


def calculate_range_coverage(config: SarSystemConfig) -> dict:
    """
    한 pulse가 커버하는 range 범위 계산
    
    Parameters:
    -----------
    config : SarSystemConfig
        SAR 시스템 설정
    
    Returns:
    --------
    dict
        Range 커버리지 정보
        - near_slant_range: 최근접 슬랜트 레인지 (m)
        - far_slant_range: 최원거리 슬랜트 레인지 (m)
        - range_swath_slant: 슬랜트 레인지 swath (m)
        - near_ground_range: 최근접 그라운드 레인지 (m, 추정)
        - far_ground_range: 최원거리 그라운드 레인지 (m, 추정)
        - range_swath_ground: 그라운드 레인지 swath (m, 추정)
    """
    # 슬랜트 레인지 계산
    # R = c * t / 2 (왕복 거리이므로 2로 나눔)
    near_slant_range = LIGHT_SPEED * config.swst / 2.0
    far_slant_range = LIGHT_SPEED * (config.swst + config.swl) / 2.0
    range_swath_slant = far_slant_range - near_slant_range
    
    # 그라운드 레인지 추정 (간단한 근사)
    # 지구 곡률을 고려한 근사 계산
    R_earth = EARTH_RADIUS
    R_sat = R_earth + config.orbit_height
    
    # Near range 그라운드 변환 (코사인 법칙)
    cos_theta_near = (R_earth**2 + R_sat**2 - near_slant_range**2) / (2 * R_earth * R_sat)
    cos_theta_near = np.clip(cos_theta_near, -1.0, 1.0)
    theta_near = np.arccos(cos_theta_near)
    near_ground_range = R_earth * theta_near
    
    # Far range 그라운드 변환
    cos_theta_far = (R_earth**2 + R_sat**2 - far_slant_range**2) / (2 * R_earth * R_sat)
    cos_theta_far = np.clip(cos_theta_far, -1.0, 1.0)
    theta_far = np.arccos(cos_theta_far)
    far_ground_range = R_earth * theta_far
    
    range_swath_ground = far_ground_range - near_ground_range
    
    return {
        'near_slant_range': near_slant_range,
        'far_slant_range': far_slant_range,
        'range_swath_slant': range_swath_slant,
        'near_ground_range': near_ground_range,
        'far_ground_range': far_ground_range,
        'range_swath_ground': range_swath_ground
    }


def visualize_range_coverage(
    config: SarSystemConfig,
    range_info: dict,
    output_path: Path,
    title: str = "Range Coverage"
):
    """
    Range 커버리지 시각화
    
    Parameters:
    -----------
    config : SarSystemConfig
        SAR 시스템 설정
    range_info : dict
        calculate_range_coverage() 결과
    output_path : Path
        출력 파일 경로
    title : str
        그래프 제목
    """
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))
    
    # 1. 슬랜트 레인지 vs 그라운드 레인지 비교
    categories = ['Near Range', 'Far Range', 'Swath Width']
    slant_ranges = [
        range_info['near_slant_range'] / 1000,  # km
        range_info['far_slant_range'] / 1000,
        range_info['range_swath_slant'] / 1000
    ]
    ground_ranges = [
        range_info['near_ground_range'] / 1000,  # km
        range_info['far_ground_range'] / 1000,
        range_info['range_swath_ground'] / 1000
    ]
    
    x = np.arange(len(categories))
    width = 0.35
    
    axes[0].bar(x - width/2, slant_ranges, width, label='Slant Range', color='skyblue', alpha=0.8)
    axes[0].bar(x + width/2, ground_ranges, width, label='Ground Range', color='lightcoral', alpha=0.8)
    axes[0].set_xlabel('Range Type')
    axes[0].set_ylabel('Distance (km)')
    axes[0].set_title(f'{title} - Slant vs Ground Range')
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(categories)
    axes[0].legend()
    axes[0].grid(True, alpha=0.3, axis='y')
    
    # 값 표시
    for i, (s, g) in enumerate(zip(slant_ranges, ground_ranges)):
        axes[0].text(i - width/2, s, f'{s:.1f}', ha='center', va='bottom', fontsize=9)
        axes[0].text(i + width/2, g, f'{g:.1f}', ha='center', va='bottom', fontsize=9)
    
    # 2. Range 커버리지 상세 정보
    info_text = f"""
SAR System Parameters:
  - Center Frequency: {config.fc/1e9:.3f} GHz
  - Bandwidth: {config.bw/1e6:.1f} MHz
  - Pulse Width: {config.taup*1e6:.2f} μs
  - Sampling Window Start: {config.swst*1e6:.2f} μs
  - Sampling Window Length: {config.swl*1e6:.2f} μs
  - Orbit Height: {config.orbit_height/1000:.1f} km

Range Coverage (Slant Range):
  - Near Range: {range_info['near_slant_range']/1000:.2f} km
  - Far Range: {range_info['far_slant_range']/1000:.2f} km
  - Swath Width: {range_info['range_swath_slant']/1000:.2f} km

Range Coverage (Ground Range):
  - Near Range: {range_info['near_ground_range']/1000:.2f} km
  - Far Range: {range_info['far_ground_range']/1000:.2f} km
  - Swath Width: {range_info['range_swath_ground']/1000:.2f} km

Range Resolution:
  - Theoretical: {LIGHT_SPEED / (2 * config.bw):.3f} m ({LIGHT_SPEED / (2 * config.bw) * 100:.1f} cm)
  - Samples: {config.num_samples}
  - Sample Spacing: {range_info['range_swath_slant'] / config.num_samples:.3f} m
    """
    
    axes[1].text(0.05, 0.95, info_text, transform=axes[1].transAxes,
                 fontsize=10, verticalalignment='top', family='monospace',
                 bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    axes[1].axis('off')
    axes[1].set_title(f'{title} - Detailed Information')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Range 커버리지 시각화 저장: {output_path}")


def visualize_frequency_band_comparison(
    results: dict,
    output_path: Path
):
    """
    주파수 대역별 비교 차트 생성
    
    Parameters:
    -----------
    results : dict
        위성별 결과 딕셔너리
        {위성명: {band, frequency_ghz, wavelength_cm, ...}}
    output_path : Path
        출력 파일 경로
    """
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 주파수 대역별로 그룹화
    bands = {}
    for name, result in results.items():
        band = result['band']
        if band not in bands:
            bands[band] = []
        bands[band].append((name, result))
    
    # 색상 매핑
    band_colors = {
        'L-band': 'blue',
        'C-band': 'green',
        'X-band': 'red'
    }
    
    # 1. 주파수 비교
    for band, satellites in bands.items():
        names = [s[0] for s in satellites]
        freqs = [s[1]['frequency_ghz'] for s in satellites]
        axes[0, 0].bar(names, freqs, label=band, color=band_colors.get(band, 'gray'), alpha=0.7)
    axes[0, 0].set_ylabel('주파수 (GHz)')
    axes[0, 0].set_title('주파수 비교')
    axes[0, 0].legend()
    axes[0, 0].tick_params(axis='x', rotation=45)
    
    # 2. 파장 비교
    for band, satellites in bands.items():
        names = [s[0] for s in satellites]
        wavelengths = [s[1]['wavelength_cm'] for s in satellites]
        axes[0, 1].bar(names, wavelengths, label=band, color=band_colors.get(band, 'gray'), alpha=0.7)
    axes[0, 1].set_ylabel('파장 (cm)')
    axes[0, 1].set_title('파장 비교')
    axes[0, 1].legend()
    axes[0, 1].tick_params(axis='x', rotation=45)
    
    # 3. 처리 속도 비교
    for band, satellites in bands.items():
        names = [s[0] for s in satellites]
        speeds = [s[1]['pulse_per_sec'] for s in satellites]
        axes[1, 0].bar(names, speeds, label=band, color=band_colors.get(band, 'gray'), alpha=0.7)
    axes[1, 0].set_ylabel('처리 속도 (pulse/sec)')
    axes[1, 0].set_title('처리 속도 비교')
    axes[1, 0].legend()
    axes[1, 0].tick_params(axis='x', rotation=45)
    
    # 4. Echo 신호 최대값 비교
    for band, satellites in bands.items():
        names = [s[0] for s in satellites]
        echo_max = [s[1]['echo_max'] for s in satellites]
        axes[1, 1].bar(names, echo_max, label=band, color=band_colors.get(band, 'gray'), alpha=0.7)
    axes[1, 1].set_ylabel('Echo 신호 최대값')
    axes[1, 1].set_title('Echo 신호 최대값 비교')
    axes[1, 1].set_yscale('log')
    axes[1, 1].legend()
    axes[1, 1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"주파수 대역별 비교 차트 저장: {output_path}")


@pytest.mark.slow
def test_full_scenario_small():
    """전체 시나리오 테스트 (소규모)"""
    # 설정
    config = SarSystemConfig(
        fc=5.4e9,
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
    
    # 파라미터
    num_pulses = 1000
    num_targets = 100
    
    print(f"\n=== 전체 시나리오 테스트 (소규모) ===")
    print(f"Pulse 개수: {num_pulses}")
    print(f"타겟 개수: {num_targets}")
    
    # 위성 궤도 생성
    print("\n위성 궤도 생성 중...")
    satellite_positions, satellite_velocities = generate_satellite_trajectory(
        num_pulses=num_pulses,
        config=config
    )
    
    # 타겟 생성
    print("타겟 생성 중...")
    target_list = generate_target_grid(
        num_targets=num_targets,
        satellite_position=satellite_positions[0],
        config=config
    )
    
    # Echo Simulator 생성
    echo_sim = SarEchoSimulator(config)
    
    # Chirp 신호 생성 및 시각화
    from sar_simulator.sensor import SarSensorSimulator
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    
    # Chirp 신호 시각화
    visualize_chirp_signal(
        chirp_signal,
        config,
        OUTPUT_DIR / "full_scenario_small_chirp.png",
        title="Full Scenario Small - Chirp Signal"
    )
    
    # 배치 처리로 시뮬레이션 실행 (성능 측정 포함)
    print("\n시뮬레이션 실행 중...")
    def run_simulation():
        return simulate_pulses_in_batches(
            echo_sim=echo_sim,
            target_list=target_list,
            satellite_positions=satellite_positions,
            satellite_velocities=satellite_velocities,
            batch_size=64
        )
    
    perf_result = measure_performance(run_simulation)
    echo_signals = perf_result['result']
    
    # 결과 검증
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64
    
    # 성능 리포트
    print("\n=== 성능 리포트 ===")
    print(f"처리 시간: {perf_result['time']:.2f} 초")
    print(f"Pulse 처리 속도: {num_pulses / perf_result['time']:.2f} pulse/sec")
    print(f"타겟당 평균 처리 시간: {perf_result['time'] / num_targets * 1000:.3f} ms")
    print(f"메모리 사용량 증가: {perf_result['memory_used']:.2f} MB")
    print(f"최대 메모리 사용량: {perf_result['memory_peak']:.2f} MB")
    
    # Echo 신호 통계
    echo_max = np.max(np.abs(echo_signals))
    echo_mean = np.mean(np.abs(echo_signals))
    non_zero_count = np.count_nonzero(np.abs(echo_signals))
    print(f"\nEcho 신호 통계:")
    print(f"  Max magnitude: {echo_max:.6e}")
    print(f"  Mean magnitude: {echo_mean:.6e}")
    print(f"  Non-zero samples: {non_zero_count} / {echo_signals.size}")
    
    # 위성 궤적 시각화
    visualize_orbital_trajectory(
        satellite_positions,
        OUTPUT_DIR / "full_scenario_small_trajectory.png"
    )
    
    # Echo 신호 2D 시각화
    visualize_echo_signals_2d(
        echo_signals,
        config,
        OUTPUT_DIR / "full_scenario_small_echo_2d.png",
        title="Full Scenario Small - Echo Signals"
    )
    
    # Range 커버리지 계산 및 시각화
    range_info = calculate_range_coverage(config)
    print(f"\n=== 한 Pulse의 Range 커버리지 ===")
    print(f"슬랜트 레인지:")
    print(f"  Near Range: {range_info['near_slant_range']/1000:.2f} km")
    print(f"  Far Range: {range_info['far_slant_range']/1000:.2f} km")
    print(f"  Swath Width: {range_info['range_swath_slant']/1000:.2f} km")
    print(f"\n그라운드 레인지 (추정):")
    print(f"  Near Range: {range_info['near_ground_range']/1000:.2f} km")
    print(f"  Far Range: {range_info['far_ground_range']/1000:.2f} km")
    print(f"  Swath Width: {range_info['range_swath_ground']/1000:.2f} km")
    range_resolution = LIGHT_SPEED / (2 * config.bw)  # 이론적 range 해상도 (m)
    print(f"\nRange 해상도:")
    print(f"  이론적 해상도: {range_resolution:.3f} m ({range_resolution*100:.1f} cm)")
    print(f"  샘플 간격: {range_info['range_swath_slant'] / config.num_samples:.3f} m")
    
    visualize_range_coverage(
        config,
        range_info,
        OUTPUT_DIR / "full_scenario_small_range_coverage.png",
        title="Full Scenario Small - Range Coverage"
    )
    
    print(f"\n테스트 완료: {OUTPUT_DIR}")


@pytest.mark.slow
def test_full_scenario_medium():
    """전체 시나리오 테스트 (중규모)"""
    # 설정
    config = SarSystemConfig(
        fc=5.4e9,
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
    
    # 파라미터
    num_pulses = 5000
    num_targets = 500
    
    print(f"\n=== 전체 시나리오 테스트 (중규모) ===")
    print(f"Pulse 개수: {num_pulses}")
    print(f"타겟 개수: {num_targets}")
    
    # 위성 궤도 생성
    print("\n위성 궤도 생성 중...")
    satellite_positions, satellite_velocities = generate_satellite_trajectory(
        num_pulses=num_pulses,
        config=config
    )
    
    # 타겟 생성
    print("타겟 생성 중...")
    target_list = generate_target_grid(
        num_targets=num_targets,
        satellite_position=satellite_positions[0],
        config=config
    )
    
    # Echo Simulator 생성
    echo_sim = SarEchoSimulator(config)
    
    # 배치 처리로 시뮬레이션 실행 (성능 측정 포함)
    print("\n시뮬레이션 실행 중...")
    def run_simulation():
        return simulate_pulses_in_batches(
            echo_sim=echo_sim,
            target_list=target_list,
            satellite_positions=satellite_positions,
            satellite_velocities=satellite_velocities,
            batch_size=64
        )
    
    perf_result = measure_performance(run_simulation)
    echo_signals = perf_result['result']
    
    # 결과 검증
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64
    
    # 성능 리포트
    print("\n=== 성능 리포트 ===")
    print(f"처리 시간: {perf_result['time']:.2f} 초")
    print(f"Pulse 처리 속도: {num_pulses / perf_result['time']:.2f} pulse/sec")
    print(f"타겟당 평균 처리 시간: {perf_result['time'] / num_targets * 1000:.3f} ms")
    print(f"메모리 사용량 증가: {perf_result['memory_used']:.2f} MB")
    print(f"최대 메모리 사용량: {perf_result['memory_peak']:.2f} MB")
    
    print(f"\n테스트 완료: {OUTPUT_DIR}")


@pytest.mark.slow
def test_full_scenario_large():
    """전체 시나리오 테스트 (대규모) - 선택적, 느림"""
    # 설정
    config = SarSystemConfig(
        fc=5.4e9,
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
    
    # 파라미터
    num_pulses = 10000
    num_targets = 1000
    
    print(f"\n=== 전체 시나리오 테스트 (대규모) ===")
    print(f"Pulse 개수: {num_pulses}")
    print(f"타겟 개수: {num_targets}")
    print("주의: 이 테스트는 시간이 오래 걸릴 수 있습니다.")
    
    # 위성 궤도 생성
    print("\n위성 궤도 생성 중...")
    satellite_positions, satellite_velocities = generate_satellite_trajectory(
        num_pulses=num_pulses,
        config=config
    )
    
    # 타겟 생성
    print("타겟 생성 중...")
    target_list = generate_target_grid(
        num_targets=num_targets,
        satellite_position=satellite_positions[0],
        config=config
    )
    
    # Echo Simulator 생성
    echo_sim = SarEchoSimulator(config)
    
    # 배치 처리로 시뮬레이션 실행 (성능 측정 포함)
    print("\n시뮬레이션 실행 중...")
    def run_simulation():
        return simulate_pulses_in_batches(
            echo_sim=echo_sim,
            target_list=target_list,
            satellite_positions=satellite_positions,
            satellite_velocities=satellite_velocities,
            batch_size=64
        )
    
    perf_result = measure_performance(run_simulation)
    echo_signals = perf_result['result']
    
    # 결과 검증
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64
    
    # 성능 리포트
    print("\n=== 성능 리포트 ===")
    print(f"처리 시간: {perf_result['time']:.2f} 초")
    print(f"Pulse 처리 속도: {num_pulses / perf_result['time']:.2f} pulse/sec")
    print(f"타겟당 평균 처리 시간: {perf_result['time'] / num_targets * 1000:.3f} ms")
    print(f"메모리 사용량 증가: {perf_result['memory_used']:.2f} MB")
    print(f"최대 메모리 사용량: {perf_result['memory_peak']:.2f} MB")
    
    print(f"\n테스트 완료: {OUTPUT_DIR}")


def test_batch_processing():
    """배치 처리 방식 검증"""
    config = SarSystemConfig(
        fc=5.4e9,
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
    
    num_pulses = 200
    num_targets = 50
    
    # 위성 궤도 생성
    satellite_positions, satellite_velocities = generate_satellite_trajectory(
        num_pulses=num_pulses,
        config=config
    )
    
    # 타겟 생성
    target_list = generate_target_grid(
        num_targets=num_targets,
        satellite_position=satellite_positions[0],
        config=config
    )
    
    # Echo Simulator 생성
    echo_sim = SarEchoSimulator(config)
    
    # Chirp 신호 생성 및 시각화
    from sar_simulator.sensor import SarSensorSimulator
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    
    # Chirp 신호 시각화
    visualize_chirp_signal(
        chirp_signal,
        config,
        OUTPUT_DIR / "batch_processing_chirp.png",
        title="Batch Processing - Chirp Signal"
    )
    
    # 배치 크기별 성능 비교
    batch_sizes = [32, 64, 128]
    results = {}
    
    for batch_size in batch_sizes:
        def run_simulation():
            return simulate_pulses_in_batches(
                echo_sim=echo_sim,
                target_list=target_list,
                satellite_positions=satellite_positions,
                satellite_velocities=satellite_velocities,
                batch_size=batch_size
            )
        
        perf_result = measure_performance(run_simulation)
        results[batch_size] = perf_result
    
    # 결과 출력
    print("\n=== 배치 크기별 성능 비교 ===")
    for batch_size, perf in results.items():
        print(f"배치 크기 {batch_size}:")
        print(f"  처리 시간: {perf['time']:.2f} 초")
        print(f"  Pulse 처리 속도: {num_pulses / perf['time']:.2f} pulse/sec")
    
    # 위성 위치 이동 검증
    first_pos = satellite_positions[0]
    last_pos = satellite_positions[-1]
    distance_change = np.linalg.norm(last_pos - first_pos)
    
    print(f"\n위성 위치 이동 검증:")
    print(f"  첫 pulse 위치: {first_pos}")
    print(f"  마지막 pulse 위치: {last_pos}")
    print(f"  이동 거리: {distance_change / 1000:.2f} km")
    
    assert distance_change > 0, "위성 위치가 이동해야 함"


def test_orbital_motion():
    """위성 궤도 운동 검증"""
    config = SarSystemConfig(
        fc=5.4e9,
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
    
    num_pulses = 100
    
    positions, velocities = generate_satellite_trajectory(
        num_pulses=num_pulses,
        config=config
    )
    
    # 첫 pulse와 마지막 pulse 위치 비교
    first_pos = positions[0]
    last_pos = positions[-1]
    
    # 거리 변화 확인
    distance_change = np.linalg.norm(last_pos - first_pos)
    assert distance_change > 0, "위성 위치가 이동해야 함"
    
    # 속도 크기 확인 (원형 궤도)
    speed = np.linalg.norm(velocities[0])
    R_orbit = EARTH_RADIUS + config.orbit_height
    expected_speed = np.sqrt(GM / R_orbit)
    
    print(f"\n=== 위성 궤도 운동 검증 ===")
    print(f"첫 pulse 위치: {first_pos}")
    print(f"마지막 pulse 위치: {last_pos}")
    print(f"이동 거리: {distance_change / 1000:.2f} km")
    print(f"궤도 속도: {speed:.2f} m/s")
    print(f"예상 궤도 속도: {expected_speed:.2f} m/s")
    print(f"속도 차이: {np.abs(speed - expected_speed):.2f} m/s")
    
    assert np.abs(speed - expected_speed) < 1.0, "궤도 속도가 올바르지 않음"
    
    # 각 pulse마다 거리 확인 (궤도 반경 유지)
    for i in range(num_pulses):
        distance_from_center = np.linalg.norm(positions[i])
        expected_distance = R_orbit
        assert np.abs(distance_from_center - expected_distance) < 100.0, \
            f"Pulse {i}: 궤도 반경이 일정하지 않음"
    
    print("위성 궤도 운동 검증 완료")


# 실제 SAR 위성 주파수 설정
SAR_SATELLITE_CONFIGS = {
    "LumirX-1": {
        "fc": 9.65e9,  # X-band (추정, 고해상도 SAR 위성)
        "bw": 500e6,  # 0.3m 해상도: c/(2×0.3) ≈ 500 MHz 필요
        "taup": 30e-6,
        "fs": 1200e6,  # 나이키스트 조건: fs >= 2*bw (1.2 GHz)
        "prf": 4000,  # 고해상도를 위한 높은 PRF
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 550e3,  # LEO 궤도 (추정)
        "antenna_width": 3.5,  # 소형 위성용 안테나
        "antenna_height": 0.5,
        "description": "LumirX-1 (Lumir Inc.) - X-band SAR, 0.3m 해상도"
    },
    "Sentinel-1": {
        "fc": 5.405e9,  # C-band
        "bw": 100e6,
        "taup": 37.12e-6,
        "fs": 250e6,
        "prf": 2000,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 693e3,  # 약 693 km
        "antenna_width": 12.3,
        "antenna_height": 0.84,
        "description": "Sentinel-1 (ESA) - C-band SAR"
    },
    "TerraSAR-X": {
        "fc": 9.65e9,  # X-band
        "bw": 150e6,
        "taup": 45e-6,
        "fs": 300e6,
        "prf": 3000,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 514e3,  # 약 514 km
        "antenna_width": 4.8,
        "antenna_height": 0.7,
        "description": "TerraSAR-X (DLR) - X-band SAR"
    },
    "ALOS_PALSAR": {
        "fc": 1.27e9,  # L-band
        "bw": 28e6,
        "taup": 27e-6,
        "fs": 60e6,
        "prf": 2150,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 691.65e3,  # 약 692 km
        "antenna_width": 8.9,
        "antenna_height": 3.1,
        "description": "ALOS PALSAR (JAXA) - L-band SAR"
    },
    "RADARSAT-2": {
        "fc": 5.405e9,  # C-band
        "bw": 100e6,
        "taup": 42e-6,
        "fs": 250e6,
        "prf": 2000,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 798e3,  # 약 798 km
        "antenna_width": 15.0,
        "antenna_height": 1.5,
        "description": "RADARSAT-2 (CSA) - C-band SAR"
    },
    "COSMO-SkyMed": {
        "fc": 9.6e9,  # X-band
        "bw": 200e6,
        "taup": 40e-6,
        "fs": 400e6,
        "prf": 3000,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 619.5e3,  # 약 620 km
        "antenna_width": 5.7,
        "antenna_height": 1.4,
        "description": "COSMO-SkyMed (ASI) - X-band SAR"
    }
}


@pytest.mark.slow
@pytest.mark.parametrize("satellite_name,config_params", [
    ("LumirX-1", SAR_SATELLITE_CONFIGS["LumirX-1"]),
    ("Sentinel-1", SAR_SATELLITE_CONFIGS["Sentinel-1"]),
    ("TerraSAR-X", SAR_SATELLITE_CONFIGS["TerraSAR-X"]),
    ("ALOS_PALSAR", SAR_SATELLITE_CONFIGS["ALOS_PALSAR"]),
])
def test_real_sar_satellite_frequencies(satellite_name, config_params):
    """실제 SAR 위성 주파수를 사용한 테스트"""
    # 설정 생성
    config = SarSystemConfig(
        fc=config_params["fc"],
        bw=config_params["bw"],
        taup=config_params["taup"],
        fs=config_params["fs"],
        prf=config_params["prf"],
        swst=config_params["swst"],
        swl=config_params["swl"],
        orbit_height=config_params["orbit_height"],
        antenna_width=config_params["antenna_width"],
        antenna_height=config_params["antenna_height"]
    )
    
    # 파라미터
    num_pulses = 500
    num_targets = 50
    
    print(f"\n=== {satellite_name} 테스트 ===")
    print(f"설명: {config_params['description']}")
    print(f"주파수: {config.fc/1e9:.3f} GHz ({'L' if config.fc < 2e9 else 'C' if config.fc < 8e9 else 'X'}-band)")
    print(f"대역폭: {config.bw/1e6:.1f} MHz")
    print(f"파장: {config.wavelength*100:.2f} cm")
    print(f"궤도 높이: {config.orbit_height/1000:.1f} km")
    print(f"Pulse 개수: {num_pulses}")
    print(f"타겟 개수: {num_targets}")
    
    # 위성 궤도 생성
    satellite_positions, satellite_velocities = generate_satellite_trajectory(
        num_pulses=num_pulses,
        config=config
    )
    
    # 위성 궤적 시각화
    safe_name = satellite_name.replace('-', '_').replace(' ', '_')
    visualize_orbital_trajectory(
        satellite_positions,
        OUTPUT_DIR / f"{safe_name}_trajectory.png"
    )
    
    # 타겟 생성
    target_list = generate_target_grid(
        num_targets=num_targets,
        satellite_position=satellite_positions[0],
        config=config
    )
    
    # Echo Simulator 생성
    echo_sim = SarEchoSimulator(config)
    
    # Chirp 신호 생성 및 시각화
    from sar_simulator.sensor import SarSensorSimulator
    sensor_sim = SarSensorSimulator(config)
    chirp_signal = sensor_sim.generate_chirp_signal()
    
    # Chirp 신호 시각화
    visualize_chirp_signal(
        chirp_signal,
        config,
        OUTPUT_DIR / f"{safe_name}_chirp.png",
        title=f"{satellite_name} - Chirp Signal"
    )
    
    # 배치 처리로 시뮬레이션 실행
    def run_simulation():
        return simulate_pulses_in_batches(
            echo_sim=echo_sim,
            target_list=target_list,
            satellite_positions=satellite_positions,
            satellite_velocities=satellite_velocities,
            batch_size=64
        )
    
    perf_result = measure_performance(run_simulation)
    echo_signals = perf_result['result']
    
    # 결과 검증
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64
    
    # 성능 리포트
    print("\n=== 성능 리포트 ===")
    print(f"처리 시간: {perf_result['time']:.2f} 초")
    print(f"Pulse 처리 속도: {num_pulses / perf_result['time']:.2f} pulse/sec")
    print(f"메모리 사용량 증가: {perf_result['memory_used']:.2f} MB")
    
    # Echo 신호 통계
    echo_max = np.max(np.abs(echo_signals))
    echo_mean = np.mean(np.abs(echo_signals))
    print(f"\nEcho 신호 통계:")
    print(f"  Max magnitude: {echo_max:.6e}")
    print(f"  Mean magnitude: {echo_mean:.6e}")
    
    # Echo 신호 2D 시각화
    visualize_echo_signals_2d(
        echo_signals,
        config,
        OUTPUT_DIR / f"{safe_name}_echo_2d.png",
        title=f"{satellite_name} - Echo Signals"
    )
    
    # Range 커버리지 계산 및 시각화
    range_info = calculate_range_coverage(config)
    range_resolution = LIGHT_SPEED / (2 * config.bw)  # 이론적 range 해상도 (m)
    print(f"\n=== {satellite_name} Range 커버리지 ===")
    print(f"  슬랜트 레인지:")
    print(f"    Near: {range_info['near_slant_range']/1000:.2f} km")
    print(f"    Far: {range_info['far_slant_range']/1000:.2f} km")
    print(f"    Swath Width: {range_info['range_swath_slant']/1000:.2f} km")
    print(f"  그라운드 레인지 (추정):")
    print(f"    Near: {range_info['near_ground_range']/1000:.2f} km")
    print(f"    Far: {range_info['far_ground_range']/1000:.2f} km")
    print(f"    Swath Width: {range_info['range_swath_ground']/1000:.2f} km")
    print(f"  Range 해상도:")
    print(f"    이론적 해상도: {range_resolution:.3f} m ({range_resolution*100:.1f} cm)")
    print(f"    샘플 간격: {range_info['range_swath_slant'] / config.num_samples:.3f} m")
    
    visualize_range_coverage(
        config,
        range_info,
        OUTPUT_DIR / f"{safe_name}_range_coverage.png",
        title=f"{satellite_name} - Range Coverage"
    )
    
    print(f"\n{satellite_name} 테스트 완료")


@pytest.mark.slow
def test_all_sar_satellite_frequencies():
    """모든 실제 SAR 위성 주파수 테스트 (비교)"""
    num_pulses = 200
    num_targets = 30
    
    results = {}
    
    for satellite_name, config_params in SAR_SATELLITE_CONFIGS.items():
        config = SarSystemConfig(
            fc=config_params["fc"],
            bw=config_params["bw"],
            taup=config_params["taup"],
            fs=config_params["fs"],
            prf=config_params["prf"],
            swst=config_params["swst"],
            swl=config_params["swl"],
            orbit_height=config_params["orbit_height"],
            antenna_width=config_params["antenna_width"],
            antenna_height=config_params["antenna_height"]
        )
        
        satellite_positions, satellite_velocities = generate_satellite_trajectory(
            num_pulses=num_pulses,
            config=config
        )
        
        target_list = generate_target_grid(
            num_targets=num_targets,
            satellite_position=satellite_positions[0],
            config=config
        )
        
        echo_sim = SarEchoSimulator(config)
        
        def run_simulation():
            return simulate_pulses_in_batches(
                echo_sim=echo_sim,
                target_list=target_list,
                satellite_positions=satellite_positions,
                satellite_velocities=satellite_velocities,
                batch_size=64
            )
        
        perf_result = measure_performance(run_simulation)
        echo_signals = perf_result['result']
        
        # 주파수 대역 결정
        if config.fc < 2e9:
            band = "L-band"
        elif config.fc < 8e9:
            band = "C-band"
        else:
            band = "X-band"
        
        results[satellite_name] = {
            "band": band,
            "frequency_ghz": config.fc / 1e9,
            "wavelength_cm": config.wavelength * 100,
            "time": perf_result['time'],
            "pulse_per_sec": num_pulses / perf_result['time'],
            "memory_used": perf_result['memory_used'],
            "echo_max": np.max(np.abs(echo_signals)),
            "echo_mean": np.mean(np.abs(echo_signals))
        }
        
        # 각 위성별 Chirp 신호 및 Echo 신호 시각화
        safe_name = satellite_name.replace('-', '_').replace(' ', '_')
        
        # Chirp 신호 생성 및 시각화
        from sar_simulator.sensor import SarSensorSimulator
        sensor_sim = SarSensorSimulator(config)
        chirp_signal = sensor_sim.generate_chirp_signal()
        
        visualize_chirp_signal(
            chirp_signal,
            config,
            OUTPUT_DIR / f"{safe_name}_chirp.png",
            title=f"{satellite_name} - Chirp Signal"
        )
        
        # Echo 신호 2D 시각화
        visualize_echo_signals_2d(
            echo_signals,
            config,
            OUTPUT_DIR / f"{safe_name}_echo_2d.png",
            title=f"{satellite_name} - Echo Signals"
        )
    
    # 결과 비교 출력
    print("\n=== 모든 SAR 위성 주파수 비교 ===")
    print(f"{'위성명':<20} {'대역':<10} {'주파수(GHz)':<15} {'파장(cm)':<12} {'처리속도(pulse/s)':<20} {'Echo Max':<15}")
    print("-" * 100)
    for name, result in results.items():
        print(f"{name:<20} {result['band']:<10} {result['frequency_ghz']:<15.3f} "
              f"{result['wavelength_cm']:<12.2f} {result['pulse_per_sec']:<20.2f} "
              f"{result['echo_max']:<15.6e}")
    
    print("\n=== 주파수 대역별 특성 ===")
    bands = {}
    for name, result in results.items():
        band = result['band']
        if band not in bands:
            bands[band] = []
        bands[band].append((name, result))
    
    for band, satellites in bands.items():
        print(f"\n{band}:")
        for name, result in satellites:
            print(f"  {name}: {result['frequency_ghz']:.3f} GHz, 파장 {result['wavelength_cm']:.2f} cm")
    
    # 시각화 생성
    visualize_frequency_band_comparison(
        results,
        OUTPUT_DIR / "sar_satellite_frequency_comparison.png"
    )
    
    # 성능 비교 차트 (성능 데이터가 있는 경우)
    perf_results = {}
    for name, result in results.items():
        if 'time' in result:
            perf_results[name] = {
                'time': result['time'],
                'pulse_per_sec': result['pulse_per_sec'],
                'memory_used': result.get('memory_used', 0),
                'echo_max': result['echo_max']
            }
    
    if perf_results:
        visualize_performance_comparison(
            perf_results,
            OUTPUT_DIR / "sar_satellite_performance_comparison.png"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
