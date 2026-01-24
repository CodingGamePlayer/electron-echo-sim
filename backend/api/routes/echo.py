"""
Echo 시뮬레이션 관련 API 라우트
"""

from fastapi import APIRouter, HTTPException
import numpy as np
import base64
from api.schemas.request import EchoSimulateRequest, EchoSimulateMultipleRequest
from api.schemas.response import EchoResponse, EchoMultipleResponse
from sar_simulator.echo.echo_simulator import SarEchoSimulator
from sar_simulator.common.target_model import Target, TargetList

router = APIRouter()


@router.post("/simulate", response_model=EchoResponse)
async def simulate_echo(request: EchoSimulateRequest):
    """
    단일 펄스 Echo 시뮬레이션
    
    타겟 리스트와 위성 상태를 기반으로 Echo 신호를 생성합니다.
    """
    try:
        # 시스템 설정 생성
        config = request.config.to_sar_system_config()
        
        # 타겟 리스트 생성
        target_list = TargetList([
            Target(
                position=np.array(t.position),
                reflectivity=t.reflectivity,
                phase=t.phase
            )
            for t in request.targets
        ])
        
        # 위성 상태
        satellite_position = np.array(request.satellite_state.position)
        satellite_velocity = np.array(request.satellite_state.velocity)
        beam_direction = np.array(request.satellite_state.beam_direction) if request.satellite_state.beam_direction else None
        
        # Echo Simulator 생성 및 시뮬레이션
        echo_sim = SarEchoSimulator(config)
        echo_signal = echo_sim.simulate_echo(
            target_list=target_list,
            satellite_position=satellite_position,
            satellite_velocity=satellite_velocity,
            beam_direction=beam_direction
        )
        
        # NumPy 배열을 Base64로 인코딩
        # 복소수를 실수/허수로 분리하여 저장
        echo_data = np.stack([echo_signal.real, echo_signal.imag], axis=-1)
        echo_bytes = echo_data.astype(np.float32).tobytes()
        echo_base64 = base64.b64encode(echo_bytes).decode('utf-8')
        
        return EchoResponse(
            success=True,
            message="Echo 시뮬레이션 완료",
            shape=list(echo_signal.shape),
            dtype=str(echo_signal.dtype),
            data=echo_base64,
            num_samples=len(echo_signal),
            max_amplitude=float(np.max(np.abs(echo_signal))),
            mean_amplitude=float(np.mean(np.abs(echo_signal)))
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.post("/simulate-multiple", response_model=EchoMultipleResponse)
async def simulate_multiple_echoes(request: EchoSimulateMultipleRequest):
    """
    여러 펄스 Echo 시뮬레이션
    
    여러 위성 상태에 대해 Echo 신호를 생성합니다.
    """
    try:
        # 시스템 설정 생성
        config = request.config.to_sar_system_config()
        
        # 타겟 리스트 생성
        target_list = TargetList([
            Target(
                position=np.array(t.position),
                reflectivity=t.reflectivity,
                phase=t.phase
            )
            for t in request.targets
        ])
        
        # 위성 상태 배열 준비
        num_pulses = len(request.satellite_states)
        satellite_positions = np.array([s.position for s in request.satellite_states])
        satellite_velocities = np.array([s.velocity for s in request.satellite_states])
        beam_directions = None
        if request.satellite_states and request.satellite_states[0].beam_direction:
            beam_directions = np.array([s.beam_direction for s in request.satellite_states])
        
        # Echo Simulator 생성 및 시뮬레이션
        echo_sim = SarEchoSimulator(config)
        echo_signals = echo_sim.simulate_multiple_pulses(
            target_list=target_list,
            satellite_positions=satellite_positions,
            satellite_velocities=satellite_velocities,
            beam_directions=beam_directions
        )
        
        # NumPy 배열을 Base64로 인코딩
        # 복소수를 실수/허수로 분리하여 저장
        echo_data = np.stack([echo_signals.real, echo_signals.imag], axis=-1)
        echo_bytes = echo_data.astype(np.float32).tobytes()
        echo_base64 = base64.b64encode(echo_bytes).decode('utf-8')
        
        return EchoMultipleResponse(
            success=True,
            message="여러 펄스 Echo 시뮬레이션 완료",
            shape=list(echo_signals.shape),
            dtype=str(echo_signals.dtype),
            data=echo_base64,
            num_pulses=num_pulses,
            num_samples=echo_signals.shape[1]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
