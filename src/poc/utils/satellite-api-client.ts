/**
 * 위성 생성 및 미션 방향 계산 API 클라이언트
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface SatellitePosition {
  longitude: number;  // 경도 (deg)
  latitude: number;   // 위도 (deg)
  altitude: number;   // 고도 (m)
}

export interface SatelliteVelocity {
  vx: number;  // ECEF x 방향 속도 (m/s)
  vy: number;  // ECEF y 방향 속도 (m/s)
  vz: number;  // ECEF z 방향 속도 (m/s)
}

export interface MissionLocation {
  longitude: number;  // 경도 (deg)
  latitude: number;    // 위도 (deg)
}

export interface SatelliteCreateRequest {
  position: [number, number, number];  // [경도, 위도, 고도]
  velocity: [number, number, number];  // [vx, vy, vz]
  mission_location: [number, number];  // [경도, 위도]
}

export interface SatelliteCreateResponse {
  success: boolean;
  message: string;
  satellite_state: {
    position: [number, number, number];
    velocity: [number, number, number];
  };
  mission_direction: {
    beam_direction: [number, number, number];
    heading: number;
    crossing_point: [number, number, number] | null;
  };
}

export interface MissionDirectionRequest {
  satellite_state: {
    position: [number, number, number];
    velocity: [number, number, number];
    beam_direction?: [number, number, number] | null;
  };
  mission_location: [number, number];
}

export interface MissionDirectionResponse {
  success: boolean;
  message: string;
  beam_direction: [number, number, number];
  heading: number;
  crossing_point: [number, number, number] | null;
}

/**
 * 위성 생성 및 미션 방향 계산
 */
export async function createSatellite(
  position: SatellitePosition,
  velocity: SatelliteVelocity,
  missionLocation: MissionLocation
): Promise<SatelliteCreateResponse> {
  const request: SatelliteCreateRequest = {
    position: [position.longitude, position.latitude, position.altitude],
    velocity: [velocity.vx, velocity.vy, velocity.vz],
    mission_location: [missionLocation.longitude, missionLocation.latitude]
  };

  const response = await fetch(`${API_BASE_URL}/satellite/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * 미션 방향 계산
 */
export async function calculateMissionDirection(
  satelliteState: {
    position: [number, number, number];
    velocity: [number, number, number];
    beam_direction?: [number, number, number] | null;
  },
  missionLocation: MissionLocation
): Promise<MissionDirectionResponse> {
  const request: MissionDirectionRequest = {
    satellite_state: satelliteState,
    mission_location: [missionLocation.longitude, missionLocation.latitude]
  };

  const response = await fetch(`${API_BASE_URL}/satellite/calculate-direction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
