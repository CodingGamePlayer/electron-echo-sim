"""
시스템 설정 스키마

SAR 시스템 설정을 위한 Pydantic 스키마입니다.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from sar_simulator.common.sar_system_config import SarSystemConfig


class SarSystemConfigRequest(BaseModel):
    """SAR 시스템 설정 요청 스키마"""
    
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
