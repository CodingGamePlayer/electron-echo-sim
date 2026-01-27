"""
위성 생성 및 미션 방향 계산 API 라우트
"""

from fastapi import APIRouter, HTTPException
import numpy as np
from api.schemas.request import SatelliteCreateRequest, MissionDirectionRequest
from api.schemas.response import SatelliteCreateResponse, MissionDirectionResponse
from api.schemas.target import SatelliteState
from sar_simulator.common.satellite_orbit_service import (
    llh_to_ecef,
    ecef_to_llh,
    calculate_mission_direction
)

router = APIRouter()


@router.post("/create", response_model=SatelliteCreateResponse)
async def create_satellite(request: SatelliteCreateRequest):
    """
    위성 생성 및 미션 방향 계산
    
    위성 위치(경도, 위도, 고도)와 속도 벡터, 미션 위치를 받아서
    위성을 생성하고 미션 방향을 계산합니다.
    """
    try:
        # 입력 검증
        lon, lat, alt = request.position
        velocity = np.array(request.velocity)
        mission_lon, mission_lat = request.mission_location
        
        # 위성 위치를 ECEF로 변환
        satellite_position_ecef = llh_to_ecef(lat, lon, alt)
        
        # 미션 방향 계산
        mission_direction = calculate_mission_direction(
            satellite_position_ecef,
            velocity,
            [mission_lon, mission_lat]
        )
        
        # 응답 생성
        return SatelliteCreateResponse(
            success=True,
            message="위성 생성 및 미션 방향 계산 완료",
            satellite_state={
                "position": satellite_position_ecef.tolist(),
                "velocity": velocity.tolist()
            },
            mission_direction=mission_direction
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.post("/calculate-direction", response_model=MissionDirectionResponse)
async def calculate_direction(request: MissionDirectionRequest):
    """
    미션 방향 계산
    
    기존 위성 상태와 미션 위치를 받아서 미션 방향을 계산합니다.
    """
    try:
        # 위성 상태 추출
        satellite_position_ecef = np.array(request.satellite_state.position)
        satellite_velocity_ecef = np.array(request.satellite_state.velocity)
        mission_lon, mission_lat = request.mission_location
        
        # 미션 방향 계산
        mission_direction = calculate_mission_direction(
            satellite_position_ecef,
            satellite_velocity_ecef,
            [mission_lon, mission_lat]
        )
        
        # 응답 생성
        return MissionDirectionResponse(
            success=True,
            message="미션 방향 계산 완료",
            beam_direction=mission_direction["beam_direction"],
            heading=mission_direction["heading"],
            crossing_point=mission_direction["crossing_point"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
