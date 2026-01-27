/**
 * TLE 데이터 저장 및 관리 API 클라이언트
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface TleCreateRequest {
  name: string;
  description?: string;
  tle_data: string;
}

export interface TleUpdateRequest {
  name?: string;
  description?: string;
  tle_data?: string;
}

export interface TleResponse {
  id: string;
  name: string;
  description?: string;
  tle_data: string;
  created_at: string;
  updated_at: string;
}

export interface TleListResponse {
  tles: TleResponse[];
  total: number;
}

/**
 * TLE 데이터 저장
 */
export async function saveTLE(
  name: string,
  description: string | undefined,
  tleData: string
): Promise<TleResponse> {
  const request: TleCreateRequest = {
    name,
    description,
    tle_data: tleData
  };

  const response = await fetch(`${API_BASE_URL}/tle`, {
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
 * TLE 목록 조회
 */
export async function getTLEList(
  skip: number = 0,
  limit: number = 100
): Promise<TleListResponse> {
  const response = await fetch(`${API_BASE_URL}/tle?skip=${skip}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * 특정 TLE 조회
 */
export async function getTLE(id: string): Promise<TleResponse> {
  const response = await fetch(`${API_BASE_URL}/tle/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * TLE 데이터 수정
 */
export async function updateTLE(
  id: string,
  name: string | undefined,
  description: string | undefined,
  tleData: string | undefined
): Promise<TleResponse> {
  const request: TleUpdateRequest = {
    name,
    description,
    tle_data: tleData
  };

  const response = await fetch(`${API_BASE_URL}/tle/${id}`, {
    method: 'PUT',
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
 * TLE 데이터 삭제
 */
export async function deleteTLE(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tle/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
}
