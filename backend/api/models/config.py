"""
SAR Config 데이터베이스 모델

SAR 시스템 설정을 저장하는 데이터베이스 모델입니다.
"""

from sqlalchemy import Column, String, Float, Integer, DateTime
from datetime import datetime
import uuid

from api.database import Base


class SarConfigModel(Base):
    """
    SAR Config 데이터베이스 모델
    
    SAR 시스템 설정을 영구 저장합니다.
    """
    __tablename__ = "sar_configs"
    
    # 기본 필드
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 기본 주파수 파라미터
    fc = Column(Float, nullable=False)  # 반송파 주파수 (Hz)
    bw = Column(Float, nullable=False)  # 대역폭 (Hz)
    fs = Column(Float, nullable=False)  # 샘플링 주파수 (Hz)
    
    # 펄스 파라미터
    taup = Column(Float, nullable=False)  # 펄스 폭 (s)
    prf = Column(Float, nullable=False)  # 펄스 반복 주파수 (Hz)
    
    # 샘플링 윈도우 파라미터
    swst = Column(Float, nullable=False)  # 샘플링 윈도우 시작 시간 (s)
    swl = Column(Float, nullable=False)  # 샘플링 윈도우 길이 (s)
    
    # 위성 파라미터
    orbit_height = Column(Float, nullable=False)  # 궤도 높이 (m)
    
    # 안테나 파라미터
    antenna_width = Column(Float, nullable=False)  # 안테나 폭 (m)
    antenna_height = Column(Float, nullable=False)  # 안테나 높이 (m)
    antenna_roll_angle = Column(Float, default=0.0)  # 안테나 롤 각도 (deg)
    antenna_pitch_angle = Column(Float, default=0.0)  # 안테나 피치 각도 (deg)
    antenna_yaw_angle = Column(Float, default=0.0)  # 안테나 요 각도 (deg)
    
    # 전력 및 게인 파라미터
    Pt = Column(Float, default=1000.0)  # 송신 전력 (W)
    G_recv = Column(Float, default=1.0)  # 수신 안테나 게인
    NF = Column(Float, default=3.0)  # 노이즈 지수 (dB)
    Loss = Column(Float, default=2.0)  # 시스템 손실 (dB)
    Tsys = Column(Float, default=290.0)  # 시스템 온도 (K)
    
    # ADC 파라미터
    adc_bits = Column(Integer, default=12)  # ADC 비트 수
    
    # 빔 파라미터
    beam_id = Column(String, default="Beam0000")  # 빔 ID
    el_angle = Column(Float, nullable=True, default=0.0)  # Elevation angle (deg) - rank 계산에 사용
    az_angle = Column(Float, nullable=True, default=0.0)  # Azimuth angle (deg) - rank 계산에 사용
    
    # SSP 파일 추가 파라미터
    chirp_set_size = Column(Integer, nullable=True, default=200)  # Chirp 세트 크기
    echo_generator = Column(String, nullable=True, default="EchoGenerator_chirped")  # Echo 생성기 타입
    num_pulses = Column(Integer, nullable=True)  # 펄스 개수
    pulse_num = Column(Integer, nullable=True, default=0)  # 펄스 번호
    begin_time = Column(DateTime, nullable=True)  # 시작 시간
    bus_roll_angle = Column(Float, nullable=True, default=0.0)  # 버스 롤 각도 (deg)
    bus_pitch_angle = Column(Float, nullable=True, default=0.0)  # 버스 피치 각도 (deg)
    bus_yaw_angle = Column(Float, nullable=True, default=0.0)  # 버스 요 각도 (deg)
    bus_roll_rate = Column(Float, nullable=True, default=0.0)  # 버스 롤 각속도 (deg/s)
    bus_pitch_rate = Column(Float, nullable=True, default=0.0)  # 버스 피치 각속도 (deg/s)
    bus_yaw_rate = Column(Float, nullable=True, default=0.0)  # 버스 요 각속도 (deg/s)
    mode = Column(String, nullable=True)  # SAR 모드 (STRIPMAP, SCANSAR 등)
    num_repeats = Column(Integer, nullable=True, default=1)  # 반복 횟수
    
    def __repr__(self):
        return f"<SarConfigModel(id={self.id}, name={self.name})>"
