/**
 * SAR 지역 정보 payload용 유틸: 통계, slope/aspect, 지질 mock
 */

export interface ElevationGridPoint {
  longitude_deg: number;
  latitude_deg: number;
  height_m: number;
}

export interface Bounds {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

/** 건물 피처 (지면 고도 보정용): ground_elevation_m는 보정 후 세팅 */
export interface BuildingWithGroundElevation {
  longitude_deg: number;
  latitude_deg: number;
  height_m: number;
  properties: Record<string, unknown>;
  ground_elevation_m?: number;
}

/**
 * 건물 배열에 DEM 격자 기반 지면 고도(ground_elevation_m) 보정.
 * 각 건물의 (longitude_deg, latitude_deg)와 최근접 격자 점의 height_m을 지면 고도로 설정.
 */
export function addTerrainElevationToBuildings(
  buildings: BuildingWithGroundElevation[],
  elevationGrid: ElevationGridPoint[]
): BuildingWithGroundElevation[] {
  if (elevationGrid.length === 0) return buildings;
  for (const building of buildings) {
    let closest: ElevationGridPoint | null = null;
    let min_dist_sq = Infinity;
    const blon = building.longitude_deg;
    const blat = building.latitude_deg;
    for (const p of elevationGrid) {
      const dlon = p.longitude_deg - blon;
      const dlat = p.latitude_deg - blat;
      const dist_sq = dlon * dlon + dlat * dlat;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest = p;
      }
    }
    if (closest) {
      building.ground_elevation_m = closest.height_m;
    }
  }
  return buildings;
}

/**
 * 표준편차 계산
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * elevationGrid(1차원, index = az_i * rangeCount + rng_i)에서 slope_map, aspect_map 계산
 */
export function calculateSlopeAndAspect(
  elevationGrid: ElevationGridPoint[],
  rangeCount: number,
  azimuthCount: number,
  bounds: Bounds
): {
  slope_map: Array<{ longitude: number; latitude: number; slope: number }>;
  aspect_map: Array<{ longitude: number; latitude: number; aspect: number }>;
} {
  const slope_map: Array<{ longitude: number; latitude: number; slope: number }> = [];
  const aspect_map: Array<{ longitude: number; latitude: number; aspect: number }> = [];
  if (rangeCount < 3 || azimuthCount < 3 || elevationGrid.length !== rangeCount * azimuthCount) {
    return { slope_map, aspect_map };
  }
  const toIndex = (az: number, rng: number) => az * rangeCount + rng;
  const deltaLon = (bounds.lonMax - bounds.lonMin) / Math.max(1, rangeCount - 1);
  const deltaLat = (bounds.latMax - bounds.latMin) / Math.max(1, azimuthCount - 1);
  const METERS_PER_DEG_LAT = 111320;
  for (let az = 1; az < azimuthCount - 1; az++) {
    for (let rng = 1; rng < rangeCount - 1; rng++) {
      const i = toIndex(az, rng);
      const p = elevationGrid[i];
      const latRad = (p.latitude_deg * Math.PI) / 180;
      const dx = deltaLon * METERS_PER_DEG_LAT * 1000 * Math.cos(latRad);
      const dy = deltaLat * METERS_PER_DEG_LAT * 1000;
      const elev_c = p.height_m;
      const elev_r_minus = elevationGrid[toIndex(az - 1, rng)].height_m;
      const elev_r_plus = elevationGrid[toIndex(az + 1, rng)].height_m;
      const elev_c_minus = elevationGrid[toIndex(az, rng - 1)].height_m;
      const elev_c_plus = elevationGrid[toIndex(az, rng + 1)].height_m;
      const dz_dx = dx !== 0 ? (elev_c_plus - elev_c_minus) / (2 * dx) : 0;
      const dz_dy = dy !== 0 ? (elev_r_plus - elev_r_minus) / (2 * dy) : 0;
      const slope_rad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
      const slope_deg = (slope_rad * 180) / Math.PI;
      const aspect_rad = Math.atan2(dz_dy, -dz_dx);
      let aspect_deg = (aspect_rad * 180) / Math.PI;
      if (aspect_deg < 0) aspect_deg += 360;
      slope_map.push({
        longitude: p.longitude_deg,
        latitude: p.latitude_deg,
        slope: slope_deg,
      });
      aspect_map.push({
        longitude: p.longitude_deg,
        latitude: p.latitude_deg,
        aspect: aspect_deg,
      });
    }
  }
  return { slope_map, aspect_map };
}

/**
 * 점 배열의 바운딩 박스로 폴리곤 extent 생성 (참고 문서 createExtentFromPoints)
 */
export function createExtentFromPoints(
  points: ElevationGridPoint[]
): { type: 'Polygon'; coordinates: number[][][] } | null {
  if (points.length === 0) return null;
  const lons = points.map((p) => p.longitude_deg);
  const lats = points.map((p) => p.latitude_deg);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ],
    ],
  };
}

/** 지형 통계 (getGeologyFromTerrain 입력) */
export interface ElevationStats {
  min_elevation: number;
  max_elevation: number;
  mean_elevation: number;
  std_deviation: number;
}

/**
 * 지형 고도 기반 지질 분류 (참고 문서 형식): 충적토/퇴적층/화강암/도심 4단위
 */
export function getGeologyFromTerrain(
  regionName: string,
  bounds: Bounds,
  elevationGrid: ElevationGridPoint[],
  elevationStats: ElevationStats
): Record<string, unknown> {
  const { mean_elevation, std_deviation } = elevationStats;
  const lowThreshold = mean_elevation - std_deviation * 0.5;
  const highThreshold = mean_elevation + std_deviation * 0.5;
  const total = elevationGrid.length;

  const geological_units: Record<string, unknown>[] = [];

  const lowlandPoints = elevationGrid.filter((p) => p.height_m < lowThreshold);
  if (lowlandPoints.length > 0) {
    const extent = createExtentFromPoints(lowlandPoints);
    geological_units.push({
      id: 'unit_001',
      name: '충적토',
      name_en: 'Alluvial Soil',
      type: 'soil',
      rock_type: 'alluvial_soil',
      age: 'Holocene',
      extent,
      coverage_percent: ((lowlandPoints.length / total) * 100).toFixed(1),
      properties: {
        density: 1.85,
        porosity: 0.35,
        permeability: 'high',
        moisture_content: 0.25,
        dielectric_constant: 15.0,
        conductivity: 0.01,
        roughness: 'moderate',
        description: '하천 퇴적물, 높은 수분 함량, 강한 레이더 감쇠',
      },
    });
  }

  const midlandPoints = elevationGrid.filter(
    (p) => p.height_m >= lowThreshold && p.height_m <= highThreshold
  );
  if (midlandPoints.length > 0) {
    const extent = createExtentFromPoints(midlandPoints);
    geological_units.push({
      id: 'unit_002',
      name: '퇴적층',
      name_en: 'Sedimentary Layer',
      type: 'sedimentary',
      rock_type: 'sandstone',
      age: 'Quaternary',
      extent,
      coverage_percent: ((midlandPoints.length / total) * 100).toFixed(1),
      properties: {
        density: 2.35,
        porosity: 0.15,
        permeability: 'medium',
        moisture_content: 0.1,
        dielectric_constant: 8.5,
        conductivity: 0.001,
        roughness: 'moderate',
        description: '사암층, 중간 투수성, 중간 레이더 반사',
      },
    });
  }

  const highlandPoints = elevationGrid.filter((p) => p.height_m > highThreshold);
  if (highlandPoints.length > 0) {
    const extent = createExtentFromPoints(highlandPoints);
    geological_units.push({
      id: 'unit_003',
      name: '화강암층',
      name_en: 'Granite Bedrock',
      type: 'igneous',
      rock_type: 'granite',
      age: 'Jurassic',
      extent,
      coverage_percent: ((highlandPoints.length / total) * 100).toFixed(1),
      properties: {
        density: 2.65,
        porosity: 0.01,
        permeability: 'very_low',
        moisture_content: 0.02,
        dielectric_constant: 5.5,
        conductivity: 0.0001,
        roughness: 'smooth',
        description: '화강암 기반암, 낮은 투수성, 약한 레이더 감쇠',
      },
    });
  }

  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const urbanRadius = Math.min(
    (bounds.lonMax - bounds.lonMin) / 4,
    (bounds.latMax - bounds.latMin) / 4
  );
  geological_units.push({
    id: 'unit_004',
    name: '도심 복합층',
    name_en: 'Urban Mixed Layer',
    type: 'urban',
    rock_type: 'urban_mixed',
    age: 'Anthropocene',
    extent: {
      type: 'Polygon',
      coordinates: [
        [
          [centerLon - urbanRadius, centerLat - urbanRadius],
          [centerLon + urbanRadius, centerLat - urbanRadius],
          [centerLon + urbanRadius, centerLat + urbanRadius],
          [centerLon - urbanRadius, centerLat + urbanRadius],
          [centerLon - urbanRadius, centerLat - urbanRadius],
        ],
      ],
    },
    coverage_percent: '25.0',
    properties: {
      density: 2.1,
      porosity: 0.2,
      permeability: 'variable',
      moisture_content: 0.15,
      dielectric_constant: 10.0,
      conductivity: 0.005,
      roughness: 'very_rough',
      description: '도심 복합 지질, 인공 구조물 포함, 복잡한 레이더 산란',
    },
  });

  const unitsWithMoisture = geological_units.filter(
    (u) => (u.properties as Record<string, unknown>)?.moisture_content != null
  );
  const unitsWithDielectric = geological_units.filter(
    (u) => (u.properties as Record<string, unknown>)?.dielectric_constant != null
  );
  const average_moisture =
    unitsWithMoisture.length > 0
      ? unitsWithMoisture.reduce(
          (sum, u) => sum + ((u.properties as Record<string, unknown>).moisture_content as number),
          0
        ) / unitsWithMoisture.length
      : 0.12;
  const average_dielectric =
    unitsWithDielectric.length > 0
      ? unitsWithDielectric.reduce(
          (sum, u) =>
            sum + ((u.properties as Record<string, unknown>).dielectric_constant as number),
          0
        ) / unitsWithDielectric.length
      : 10.0;

  return {
    region: regionName,
    source: 'Terrain-based Classification',
    classification_method: 'Elevation-based automatic classification',
    geological_units,
    soil_properties: {
      average_moisture,
      average_dielectric,
      soil_type: 'urban_mixed',
      compaction: 'high',
    },
  };
}

/**
 * 타겟 bounds 기준 지질 mock (참고 문서 형식, elevationGrid 없을 때 폴백)
 */
export function getGeologyMock(bounds: Bounds, regionName: string): Record<string, unknown> {
  const { lonMin, lonMax, latMin, latMax } = bounds;
  const w = (lonMax - lonMin) / 3;
  const h = (latMax - latMin) / 3;
  return {
    region: regionName,
    geological_units: [
      {
        id: 'unit_001',
        name: '화강암층',
        type: 'igneous',
        rock_type: 'granite',
        age: 'Jurassic',
        extent: {
          type: 'Polygon',
          coordinates: [
            [
              [lonMin, latMin],
              [lonMin + w, latMin],
              [lonMin + w, latMin + h],
              [lonMin, latMin + h],
              [lonMin, latMin],
            ],
          ],
        },
        properties: {
          density: 2.65,
          porosity: 0.01,
          permeability: 'very_low',
          moisture_content: 0.02,
          dielectric_constant: 5.5,
          conductivity: 0.0001,
        },
      },
      {
        id: 'unit_002',
        name: '퇴적층',
        type: 'sedimentary',
        rock_type: 'sandstone',
        age: 'Quaternary',
        extent: {
          type: 'Polygon',
          coordinates: [
            [
              [lonMin + w, latMin],
              [lonMin + 2 * w, latMin],
              [lonMin + 2 * w, latMin + h],
              [lonMin + w, latMin + h],
              [lonMin + w, latMin],
            ],
          ],
        },
        properties: {
          density: 2.35,
          porosity: 0.15,
          permeability: 'medium',
          moisture_content: 0.1,
          dielectric_constant: 8.5,
          conductivity: 0.001,
        },
      },
      {
        id: 'unit_003',
        name: '충적토',
        type: 'soil',
        rock_type: 'alluvial_soil',
        age: 'Holocene',
        extent: {
          type: 'Polygon',
          coordinates: [
            [
              [lonMin + 2 * w, latMin],
              [lonMax, latMin],
              [lonMax, latMin + h],
              [lonMin + 2 * w, latMin + h],
              [lonMin + 2 * w, latMin],
            ],
          ],
        },
        properties: {
          density: 1.85,
          porosity: 0.35,
          permeability: 'high',
          moisture_content: 0.25,
          dielectric_constant: 15.0,
          conductivity: 0.01,
        },
      },
    ],
    soil_properties: {
      average_moisture: 0.12,
      soil_type: 'urban_mixed',
      compaction: 'high',
    },
  };
}
