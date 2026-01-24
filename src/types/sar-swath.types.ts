export interface SARSwathGeometry {
  nearRange: number;      // meters (ground range)
  farRange: number;       // meters (ground range)
  swathWidth: number;     // meters
  azimuthLength: number;  // meters
  centerLat: number;      // degrees
  centerLon: number;      // degrees
  heading: number;        // degrees (궤도 방향)
  satelliteAltitude?: number;  // meters (위성 고도, 선택적)
  lookAngle?: number;     // degrees (look angle, 선택적, 기본값: 30도)
}

export interface SwathCorners {
  topLeft: [number, number];    // [lon, lat]
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
}

// ✅ 새로 추가: Swath 생성 모드
export enum SwathMode {
  REALTIME_TRACKING = 'realtime_tracking',      // 실시간 위성 추적
  STATIC = 'static',                            // 정적 (고정 위치)
  PREDICTED_PATH = 'predicted_path',            // 예측 경로
  HISTORICAL = 'historical',                    // 과거 경로
  BACKEND_API = 'backend_api',                  // Python Backend API
  CUSTOM_GEOMETRY = 'custom_geometry',          // 사용자 정의 기하
}

// ✅ 새로 추가: Swath 시각화 옵션
export interface SwathVisualizationOptions {
  mode: SwathMode;
  color?: string;                    // Cesium.Color 문자열 (예: 'CYAN')
  alpha?: number;                    // 투명도 (0.0 ~ 1.0)
  outlineColor?: string;             // 테두리 색상
  outlineWidth?: number;             // 테두리 두께
  showLabel?: boolean;               // 라벨 표시 여부
  labelText?: string;                // 라벨 텍스트
  maxSwaths?: number;                // 최대 Swath 개수 (자동 정리)
  updateInterval?: number;           // 업데이트 주기 (ms)
  useGroundPrimitive?: boolean;      // GroundPrimitive 사용 여부
  useEntity?: boolean;               // Entity 사용 여부
}

// ✅ 새로 추가: Swath 데이터 소스
export interface SwathDataSource {
  mode: SwathMode;
  geometry?: SARSwathGeometry;       // 정적 기하 (STATIC, CUSTOM_GEOMETRY)
  satellitePosition?: {              // 위성 위치 (REALTIME_TRACKING)
    latitude: number;
    longitude: number;
    altitude: number;
    heading?: number;
  };
  predictedPath?: Array<{            // 예측 경로 (PREDICTED_PATH)
    time: number;                    // Unix timestamp
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
  }>;
  apiEndpoint?: string;              // Backend API URL (BACKEND_API)
  timeRange?: {                      // 시간 범위 (HISTORICAL, PREDICTED_PATH)
    start: number;                   // Unix timestamp
    end: number;
  };
}

// ✅ 새로 추가: Swath 인스턴스 메타데이터
export interface SwathInstance {
  id: string;
  mode: SwathMode;
  geometry: SARSwathGeometry;
  entity?: any;                      // Cesium Entity
  primitive?: any;                   // Cesium GroundPrimitive
  createdAt: number;                 // Unix timestamp
  label?: any;                       // Cesium Label Entity
  options: SwathVisualizationOptions;
  groupId?: string;                  // 그룹 ID (선택적)
}

// ✅ Swath 그룹 인터페이스
export interface SwathGroup {
  id: string;
  name: string;
  mode: SwathMode;
  swathIds: string[];                // 그룹에 속한 Swath ID 목록
  createdAt: number;                 // 그룹 생성 시간
  endedAt?: number;                   // 그룹 종료 시간 (실시간 추적의 경우)
}
