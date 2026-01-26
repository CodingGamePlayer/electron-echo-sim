"""
RDA 프로세서 테스트

RDA 알고리즘의 동작을 테스트합니다.
"""

import numpy as np
import pytest
import matplotlib
matplotlib.use('Agg')  # GUI 없이 백엔드 사용
import matplotlib.pyplot as plt
from pathlib import Path

from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.echo import SarEchoSimulator
from sar_simulator.processing import RDAProcessor
from sar_simulator.common.constants import LIGHT_SPEED

# 출력 디렉토리
OUTPUT_DIR = Path(__file__).parent.parent / "test_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def visualize_sar_image(
    sar_image_db: np.ndarray,
    range_extent: np.ndarray,
    azimuth_extent: np.ndarray,
    output_path: Path,
    title: str = "SAR Image"
):
    """
    SAR 이미지 시각화
    
    Parameters:
    -----------
    sar_image_db : np.ndarray
        SAR 이미지 (dB 스케일)
    range_extent : np.ndarray
        Range 범위 [min, max] (m)
    azimuth_extent : np.ndarray
        Azimuth 범위 [min, max] (m)
    output_path : Path
        출력 파일 경로
    title : str
        그래프 제목
    """
    fig, ax = plt.subplots(1, 1, figsize=(12, 10))
    
    im = ax.imshow(
        sar_image_db,
        aspect='auto',
        cmap='hot',
        interpolation='nearest',
        origin='lower',
        extent=[range_extent[0], range_extent[1], azimuth_extent[0], azimuth_extent[1]]
    )
    ax.set_xlabel('Range (m)')
    ax.set_ylabel('Along-Track (m)')
    ax.set_title(f'{title} - Magnitude (dB)')
    plt.colorbar(im, ax=ax, label='Magnitude (dB)')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"SAR 이미지 시각화 저장: {output_path}")


def test_rda_processing():
    """RDA 알고리즘 테스트"""
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
    
    # 여러 위성 위치 생성
    num_pulses = 100
    satellite_positions = np.tile(
        np.array([6378137.0 + 517000.0, 0.0, 0.0]),
        (num_pulses, 1)
    )
    satellite_velocities = np.tile(
        np.array([0.0, 7266.0, 0.0]),
        (num_pulses, 1)
    )
    
    # 타겟 정의
    target_td = 30e-6  # 30 μs (샘플링 윈도우 중간)
    target_R = target_td * LIGHT_SPEED / 2.0
    sat_norm = satellite_positions[0] / np.linalg.norm(satellite_positions[0])
    target_position = satellite_positions[0] - sat_norm * target_R
    
    target = Target(
        position=target_position,
        reflectivity=100.0  # 반사도 증가
    )
    target_list = TargetList([target])
    
    # Echo 신호 생성
    echo_sim = SarEchoSimulator(config)
    echo_signals = echo_sim.simulate_multiple_pulses(
        target_list=target_list,
        satellite_positions=satellite_positions,
        satellite_velocities=satellite_velocities
    )
    
    assert echo_signals.shape == (num_pulses, config.num_samples)
    assert echo_signals.dtype == np.complex64
    
    # RDA Processor 생성 및 처리
    satellite_velocity = satellite_velocities[0]
    rda_processor = RDAProcessor(config, satellite_velocity)
    sar_image_db, range_extent, azimuth_extent = rda_processor.process(
        echo_signals,
        dynamic_range=50.0
    )
    
    # 결과 검증
    assert sar_image_db.shape[0] > 0  # azimuth_samples
    assert sar_image_db.shape[1] > 0  # range_samples
    assert len(range_extent) == 2
    assert len(azimuth_extent) == 2
    
    # 결과 출력
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
    
    # 시각화
    visualize_sar_image(
        sar_image_db,
        range_extent,
        azimuth_extent,
        OUTPUT_DIR / "test_rda_sar_image.png",
        title="RDA Reconstructed Stripmap SAR Image"
    )
    
    print(f"\nSAR 이미지 저장 완료: {OUTPUT_DIR / 'test_rda_sar_image.png'}")
    print("십자가 형태 타겟 응답 확인 가능")
    
    # 전체 영역 처리 테스트
    print("\n=== 전체 영역 처리 테스트 ===")
    sar_image_full_db, range_extent_full, azimuth_extent_full = rda_processor.process(
        echo_signals,
        dynamic_range=50.0,
        process_full_swath=True
    )
    
    print(f"전체 영역 SAR 이미지 shape: {sar_image_full_db.shape}")
    print(f"전체 Range 범위: {range_extent_full[0]:.2f} ~ {range_extent_full[1]:.2f} m")
    print(f"전체 Azimuth 범위: {azimuth_extent_full[0]:.2f} ~ {azimuth_extent_full[1]:.2f} m")
    print(f"전체 영역 최대 값: {np.max(sar_image_full_db):.2f} dB")
    print(f"전체 영역 최소 값: {np.min(sar_image_full_db):.2f} dB")
    
    # 전체 영역 시각화
    visualize_sar_image(
        sar_image_full_db,
        range_extent_full,
        azimuth_extent_full,
        OUTPUT_DIR / "test_rda_sar_image_full.png",
        title="RDA Reconstructed Stripmap SAR Image (Full Swath)"
    )
    
    print(f"\n전체 영역 SAR 이미지 저장 완료: {OUTPUT_DIR / 'test_rda_sar_image_full.png'}")
    
    # 두 영역 모두 처리 테스트
    print("\n=== 두 영역 모두 처리 테스트 ===")
    target_result, full_result = rda_processor.process_both(
        echo_signals,
        dynamic_range=50.0
    )
    
    target_image, target_range, target_azimuth = target_result
    full_image, full_range, full_azimuth = full_result
    
    print(f"타겟 영역 shape: {target_image.shape}, Range: {target_range[0]:.2f} ~ {target_range[1]:.2f} m")
    print(f"전체 영역 shape: {full_image.shape}, Range: {full_range[0]:.2f} ~ {full_range[1]:.2f} m")
    
    # 두 영역 비교 시각화
    fig, axes = plt.subplots(1, 2, figsize=(20, 8))
    
    # 타겟 영역
    im1 = axes[0].imshow(
        target_image,
        aspect='auto',
        cmap='hot',
        interpolation='nearest',
        origin='lower',
        extent=[target_range[0], target_range[1], target_azimuth[0], target_azimuth[1]]
    )
    axes[0].set_xlabel('Range (m)')
    axes[0].set_ylabel('Along-Track (m)')
    axes[0].set_title('Target Region (Zoomed)')
    plt.colorbar(im1, ax=axes[0], label='Magnitude (dB)')
    
    # 전체 영역
    im2 = axes[1].imshow(
        full_image,
        aspect='auto',
        cmap='hot',
        interpolation='nearest',
        origin='lower',
        extent=[full_range[0], full_range[1], full_azimuth[0], full_azimuth[1]]
    )
    axes[1].set_xlabel('Range (m)')
    axes[1].set_ylabel('Along-Track (m)')
    axes[1].set_title('Full Swath')
    plt.colorbar(im2, ax=axes[1], label='Magnitude (dB)')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "test_rda_sar_image_both.png", dpi=150, bbox_inches='tight')
    plt.close()
    print(f"\n두 영역 비교 이미지 저장 완료: {OUTPUT_DIR / 'test_rda_sar_image_both.png'}")


def test_rda_api():
    """RDA API 엔드포인트 테스트"""
    from fastapi.testclient import TestClient
    from api.main import app
    import base64
    
    client = TestClient(app)
    
    # 설정
    config_data = {
        "fc": 5.4e9,
        "bw": 150e6,
        "fs": 350e6,
        "taup": 10e-6,
        "prf": 5000,
        "swst": 10e-6,
        "swl": 50e-6,
        "orbit_height": 517e3,
        "antenna_width": 4.0,
        "antenna_height": 0.5
    }
    
    # Echo 신호 생성 (간단한 테스트 데이터)
    num_pulses = 10
    num_samples = 1000
    echo_signals = np.random.randn(num_pulses, num_samples).astype(np.complex64)
    
    # Base64 인코딩
    echo_data = np.stack([echo_signals.real, echo_signals.imag], axis=-1)
    echo_bytes = echo_data.astype(np.float32).tobytes()
    echo_base64 = base64.b64encode(echo_bytes).decode('utf-8')
    
    # 요청 데이터
    request_data = {
        "config": config_data,
        "echo_data_base64": echo_base64,
        "shape": [num_pulses, num_samples],
        "satellite_velocity": [0.0, 7266.0, 0.0],
        "dynamic_range": 50.0
    }
    
    # API 호출
    response = client.post("/api/sar-image/process", json=request_data)
    
    # 응답 검증
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "shape" in data
    assert "data" in data
    assert "range_extent" in data
    assert "azimuth_extent" in data
    assert len(data["shape"]) == 2
    
    print("\n=== RDA API 테스트 결과 ===")
    print(f"SAR 이미지 shape: {data['shape']}")
    print(f"Range 범위: {data['range_extent']}")
    print(f"Azimuth 범위: {data['azimuth_extent']}")
    print(f"최대 값: {data['max_value']:.2f} dB")
    print(f"최소 값: {data['min_value']:.2f} dB")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
