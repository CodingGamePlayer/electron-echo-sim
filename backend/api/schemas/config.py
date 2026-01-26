"""
시스템 설정 스키마

SAR 시스템 설정을 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from sar_simulator.common.sar_system_config import SarSystemConfig


class SarSystemConfigRequest(BaseModel):
    """SAR 시스템 설정 요청 스키마"""
    
    # 메타데이터 (선택적)
    name: Optional[str] = Field(None, description="Config 이름")
    description: Optional[str] = Field(None, description="Config 설명")
    
    # 기본 주파수 파라미터
    fc: float = Field(..., description="반송파 주파수 (Hz)", gt=0)
    bw: float = Field(..., description="대역폭 (Hz)", gt=0)
    fs: float = Field(..., description="샘플링 주파수 (Hz)", gt=0)
    
    # 펄스 파라미터
    taup: float = Field(..., description="펄스 폭 (s)", gt=0)
    prf: float = Field(..., description="펄스 반복 주파수 (Hz)", gt=0)
    
    # 샘플링 윈도우 파라미터
    swst: float = Field(..., description="샘플링 윈도우 시작 시간 (s)")
    swl: float = Field(..., description="샘플링 윈도우 길이 (s)", gt=0)
    
    # 위성 파라미터
    orbit_height: float = Field(..., description="궤도 높이 (m)", gt=0)
    
    # 안테나 파라미터
    antenna_width: float = Field(..., description="안테나 폭 (m)", gt=0)
    antenna_height: float = Field(..., description="안테나 높이 (m)", gt=0)
    antenna_roll_angle: float = Field(0.0, description="안테나 롤 각도 (deg)")
    antenna_pitch_angle: float = Field(0.0, description="안테나 피치 각도 (deg)")
    antenna_yaw_angle: float = Field(0.0, description="안테나 요 각도 (deg)")
    
    # 전력 및 게인 파라미터
    Pt: float = Field(1000.0, description="송신 전력 (W)", gt=0)
    G_recv: float = Field(1.0, description="수신 안테나 게인", gt=0)
    NF: float = Field(3.0, description="노이즈 지수 (dB)")
    Loss: float = Field(2.0, description="시스템 손실 (dB)")
    Tsys: float = Field(290.0, description="시스템 온도 (K)", gt=0)
    
    # ADC 파라미터
    adc_bits: int = Field(12, description="ADC 비트 수", ge=1, le=32)
    
    # 빔 파라미터
    beam_id: str = Field("Beam0000", description="빔 ID")
    el_angle: float = Field(0.0, description="Elevation angle (deg) - rank 계산에 사용")
    az_angle: float = Field(0.0, description="Azimuth angle (deg) - rank 계산에 사용")
    
    # SSP 파일 추가 파라미터
    chirp_set_size: Optional[int] = Field(None, description="Chirp 세트 크기")
    echo_generator: Optional[str] = Field(None, description="Echo 생성기 타입")
    num_pulses: Optional[int] = Field(None, description="펄스 개수")
    pulse_num: Optional[int] = Field(None, description="펄스 번호")
    begin_time: Optional[datetime] = Field(None, description="시작 시간")
    bus_roll_angle: Optional[float] = Field(None, description="버스 롤 각도 (deg)")
    bus_pitch_angle: Optional[float] = Field(None, description="버스 피치 각도 (deg)")
    bus_yaw_angle: Optional[float] = Field(None, description="버스 요 각도 (deg)")
    bus_roll_rate: Optional[float] = Field(None, description="버스 롤 각속도 (deg/s)")
    bus_pitch_rate: Optional[float] = Field(None, description="버스 피치 각속도 (deg/s)")
    bus_yaw_rate: Optional[float] = Field(None, description="버스 요 각속도 (deg/s)")
    mode: Optional[str] = Field(None, description="SAR 모드 (STRIPMAP, SCANSAR 등)")
    num_repeats: Optional[int] = Field(None, description="반복 횟수")
    
    def to_sar_system_config(self) -> SarSystemConfig:
        """SarSystemConfig 객체로 변환"""
        return SarSystemConfig(
            fc=self.fc,
            bw=self.bw,
            fs=self.fs,
            taup=self.taup,
            prf=self.prf,
            swst=self.swst,
            swl=self.swl,
            orbit_height=self.orbit_height,
            antenna_width=self.antenna_width,
            antenna_height=self.antenna_height,
            antenna_roll_angle=self.antenna_roll_angle,
            antenna_pitch_angle=self.antenna_pitch_angle,
            antenna_yaw_angle=self.antenna_yaw_angle,
            Pt=self.Pt,
            G_recv=self.G_recv,
            NF=self.NF,
            Loss=self.Loss,
            Tsys=self.Tsys,
            adc_bits=self.adc_bits,
            beam_id=self.beam_id
        )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "fc": 5.4e9,
                "bw": 150e6,
                "fs": 250e6,
                "taup": 10e-6,
                "prf": 5000,
                "swst": 10e-6,
                "swl": 50e-6,
                "orbit_height": 517e3,
                "antenna_width": 4.0,
                "antenna_height": 0.5
            }
        }
    )


class SarSystemConfigResponse(BaseModel):
    """SAR 시스템 설정 검증 응답 스키마"""
    
    valid: bool = Field(..., description="검증 결과")
    message: str = Field(..., description="검증 메시지")
    config: Optional[SarSystemConfigRequest] = Field(None, description="설정 정보")


class SarConfigCreateRequest(BaseModel):
    """SAR Config 생성 요청 스키마"""
    
    # 메타데이터 (name 필수)
    name: str = Field(..., description="Config 이름", min_length=1)
    description: Optional[str] = Field(None, description="Config 설명")
    
    # 기본 주파수 파라미터
    fc: float = Field(..., description="반송파 주파수 (Hz)", gt=0)
    bw: float = Field(..., description="대역폭 (Hz)", gt=0)
    fs: float = Field(..., description="샘플링 주파수 (Hz)", gt=0)
    
    # 펄스 파라미터
    taup: float = Field(..., description="펄스 폭 (s)", gt=0)
    prf: float = Field(..., description="펄스 반복 주파수 (Hz)", gt=0)
    
    # 샘플링 윈도우 파라미터
    swst: float = Field(..., description="샘플링 윈도우 시작 시간 (s)")
    swl: float = Field(..., description="샘플링 윈도우 길이 (s)", gt=0)
    
    # 위성 파라미터
    orbit_height: float = Field(..., description="궤도 높이 (m)", gt=0)
    
    # 안테나 파라미터
    antenna_width: float = Field(..., description="안테나 폭 (m)", gt=0)
    antenna_height: float = Field(..., description="안테나 높이 (m)", gt=0)
    antenna_roll_angle: float = Field(0.0, description="안테나 롤 각도 (deg)")
    antenna_pitch_angle: float = Field(0.0, description="안테나 피치 각도 (deg)")
    antenna_yaw_angle: float = Field(0.0, description="안테나 요 각도 (deg)")
    
    # 전력 및 게인 파라미터
    Pt: float = Field(1000.0, description="송신 전력 (W)", gt=0)
    G_recv: float = Field(1.0, description="수신 안테나 게인", gt=0)
    NF: float = Field(3.0, description="노이즈 지수 (dB)")
    Loss: float = Field(2.0, description="시스템 손실 (dB)")
    Tsys: float = Field(290.0, description="시스템 온도 (K)", gt=0)
    
    # ADC 파라미터
    adc_bits: int = Field(12, description="ADC 비트 수", ge=1, le=32)
    
    # 빔 파라미터
    beam_id: str = Field("Beam0000", description="빔 ID")
    el_angle: float = Field(0.0, description="Elevation angle (deg) - rank 계산에 사용")
    az_angle: float = Field(0.0, description="Azimuth angle (deg) - rank 계산에 사용")
    
    # SSP 파일 추가 파라미터
    chirp_set_size: Optional[int] = Field(None, description="Chirp 세트 크기")
    echo_generator: Optional[str] = Field(None, description="Echo 생성기 타입")
    num_pulses: Optional[int] = Field(None, description="펄스 개수")
    pulse_num: Optional[int] = Field(None, description="펄스 번호")
    begin_time: Optional[datetime] = Field(None, description="시작 시간")
    bus_roll_angle: Optional[float] = Field(None, description="버스 롤 각도 (deg)")
    bus_pitch_angle: Optional[float] = Field(None, description="버스 피치 각도 (deg)")
    bus_yaw_angle: Optional[float] = Field(None, description="버스 요 각도 (deg)")
    bus_roll_rate: Optional[float] = Field(None, description="버스 롤 각속도 (deg/s)")
    bus_pitch_rate: Optional[float] = Field(None, description="버스 피치 각속도 (deg/s)")
    bus_yaw_rate: Optional[float] = Field(None, description="버스 요 각속도 (deg/s)")
    mode: Optional[str] = Field(None, description="SAR 모드 (STRIPMAP, SCANSAR 등)")
    num_repeats: Optional[int] = Field(None, description="반복 횟수")
    
    def to_sar_system_config(self) -> SarSystemConfig:
        """SarSystemConfig 객체로 변환"""
        return SarSystemConfig(
            fc=self.fc,
            bw=self.bw,
            fs=self.fs,
            taup=self.taup,
            prf=self.prf,
            swst=self.swst,
            swl=self.swl,
            orbit_height=self.orbit_height,
            antenna_width=self.antenna_width,
            antenna_height=self.antenna_height,
            antenna_roll_angle=self.antenna_roll_angle,
            antenna_pitch_angle=self.antenna_pitch_angle,
            antenna_yaw_angle=self.antenna_yaw_angle,
            Pt=self.Pt,
            G_recv=self.G_recv,
            NF=self.NF,
            Loss=self.Loss,
            Tsys=self.Tsys,
            adc_bits=self.adc_bits,
            beam_id=self.beam_id
        )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "기본 설정",
                "description": "기본 SAR 시스템 설정",
                "fc": 5.4e9,
                "bw": 150e6,
                "fs": 250e6,
                "taup": 10e-6,
                "prf": 5000,
                "swst": 10e-6,
                "swl": 50e-6,
                "orbit_height": 517e3,
                "antenna_width": 4.0,
                "antenna_height": 0.5
            }
        }
    )


class SarConfigUpdateRequest(BaseModel):
    """SAR Config 업데이트 요청 스키마"""
    
    # 메타데이터 (모두 선택적)
    name: Optional[str] = Field(None, description="Config 이름", min_length=1)
    description: Optional[str] = Field(None, description="Config 설명")
    
    # 기본 주파수 파라미터 (모두 선택적)
    fc: Optional[float] = Field(None, description="반송파 주파수 (Hz)", gt=0)
    bw: Optional[float] = Field(None, description="대역폭 (Hz)", gt=0)
    fs: Optional[float] = Field(None, description="샘플링 주파수 (Hz)", gt=0)
    
    # 펄스 파라미터
    taup: Optional[float] = Field(None, description="펄스 폭 (s)", gt=0)
    prf: Optional[float] = Field(None, description="펄스 반복 주파수 (Hz)", gt=0)
    
    # 샘플링 윈도우 파라미터
    swst: Optional[float] = Field(None, description="샘플링 윈도우 시작 시간 (s)")
    swl: Optional[float] = Field(None, description="샘플링 윈도우 길이 (s)", gt=0)
    
    # 위성 파라미터
    orbit_height: Optional[float] = Field(None, description="궤도 높이 (m)", gt=0)
    
    # 안테나 파라미터
    antenna_width: Optional[float] = Field(None, description="안테나 폭 (m)", gt=0)
    antenna_height: Optional[float] = Field(None, description="안테나 높이 (m)", gt=0)
    antenna_roll_angle: Optional[float] = Field(None, description="안테나 롤 각도 (deg)")
    antenna_pitch_angle: Optional[float] = Field(None, description="안테나 피치 각도 (deg)")
    antenna_yaw_angle: Optional[float] = Field(None, description="안테나 요 각도 (deg)")
    
    # 전력 및 게인 파라미터
    Pt: Optional[float] = Field(None, description="송신 전력 (W)", gt=0)
    G_recv: Optional[float] = Field(None, description="수신 안테나 게인", gt=0)
    NF: Optional[float] = Field(None, description="노이즈 지수 (dB)")
    Loss: Optional[float] = Field(None, description="시스템 손실 (dB)")
    Tsys: Optional[float] = Field(None, description="시스템 온도 (K)", gt=0)
    
    # ADC 파라미터
    adc_bits: Optional[int] = Field(None, description="ADC 비트 수", ge=1, le=32)
    
    # 빔 파라미터
    beam_id: Optional[str] = Field(None, description="빔 ID")
    el_angle: Optional[float] = Field(None, description="Elevation angle (deg) - rank 계산에 사용")
    az_angle: Optional[float] = Field(None, description="Azimuth angle (deg) - rank 계산에 사용")
    
    # SSP 파일 추가 파라미터
    chirp_set_size: Optional[int] = Field(None, description="Chirp 세트 크기")
    echo_generator: Optional[str] = Field(None, description="Echo 생성기 타입")
    num_pulses: Optional[int] = Field(None, description="펄스 개수")
    pulse_num: Optional[int] = Field(None, description="펄스 번호")
    begin_time: Optional[datetime] = Field(None, description="시작 시간")
    bus_roll_angle: Optional[float] = Field(None, description="버스 롤 각도 (deg)")
    bus_pitch_angle: Optional[float] = Field(None, description="버스 피치 각도 (deg)")
    bus_yaw_angle: Optional[float] = Field(None, description="버스 요 각도 (deg)")
    bus_roll_rate: Optional[float] = Field(None, description="버스 롤 각속도 (deg/s)")
    bus_pitch_rate: Optional[float] = Field(None, description="버스 피치 각속도 (deg/s)")
    bus_yaw_rate: Optional[float] = Field(None, description="버스 요 각속도 (deg/s)")
    mode: Optional[str] = Field(None, description="SAR 모드 (STRIPMAP, SCANSAR 등)")
    num_repeats: Optional[int] = Field(None, description="반복 횟수")


class SarConfigItem(BaseModel):
    """SAR Config 목록 항목 스키마"""
    
    id: str = Field(..., description="Config ID (UUID)")
    name: str = Field(..., description="Config 이름")
    description: Optional[str] = Field(None, description="Config 설명")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="수정 시간")
    
    model_config = ConfigDict(from_attributes=True)


class SarConfigDetail(SarConfigItem):
    """SAR Config 상세 정보 스키마"""
    
    # 기본 주파수 파라미터
    fc: float
    bw: float
    fs: float
    
    # 펄스 파라미터
    taup: float
    prf: float
    
    # 샘플링 윈도우 파라미터
    swst: float
    swl: float
    
    # 위성 파라미터
    orbit_height: float
    
    # 안테나 파라미터
    antenna_width: float
    antenna_height: float
    antenna_roll_angle: float
    antenna_pitch_angle: float
    antenna_yaw_angle: float
    
    # 전력 및 게인 파라미터
    Pt: float
    G_recv: float
    NF: float
    Loss: float
    Tsys: float
    
    # ADC 파라미터
    adc_bits: int
    
    # 빔 파라미터
    beam_id: str
    el_angle: float
    az_angle: float
    
    # SSP 파일 추가 파라미터
    chirp_set_size: Optional[int] = None
    echo_generator: Optional[str] = None
    num_pulses: Optional[int] = None
    pulse_num: Optional[int] = None
    begin_time: Optional[datetime] = None
    bus_roll_angle: Optional[float] = None
    bus_pitch_angle: Optional[float] = None
    bus_yaw_angle: Optional[float] = None
    bus_roll_rate: Optional[float] = None
    bus_pitch_rate: Optional[float] = None
    bus_yaw_rate: Optional[float] = None
    mode: Optional[str] = None
    num_repeats: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class SarConfigListResponse(BaseModel):
    """SAR Config 목록 응답 스키마"""
    
    configs: List[SarConfigItem] = Field(..., description="Config 목록")
    total: int = Field(..., description="전체 개수")
