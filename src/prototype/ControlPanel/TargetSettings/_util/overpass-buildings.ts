/**
 * Overpass API로 타겟 bbox 내 OSM 건물 데이터 수집 (BuildingFeature 호환)
 */

export interface Bounds {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

/** BuildingFeature와 호환: longitude_deg, latitude_deg, height_m, properties */
export interface BuildingFeatureFromOverpass {
  longitude_deg: number;
  latitude_deg: number;
  height_m: number;
  properties: Record<string, unknown>;
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat?: number;
  lon?: number;
}

interface OverpassWay {
  type: 'way';
  id: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

type OverpassElement = OverpassNode | OverpassWay;

interface OverpassResponse {
  elements?: OverpassElement[];
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 25000;

/**
 * Overpass bbox 형식: (south, west, north, east) = (minLat, minLon, maxLat, maxLon)
 */
function boundsToOverpassBbox(bounds: Bounds): string {
  return `${bounds.latMin},${bounds.lonMin},${bounds.latMax},${bounds.lonMax}`;
}

/**
 * way 태그에서 높이(m) 계산: height, building:levels 등
 */
function heightFromTags(tags: Record<string, string> | undefined): number {
  if (!tags) return 10;
  const rawHeight = tags['height'];
  if (rawHeight != null) {
    const m = rawHeight.match(/^(\d+(?:\.\d+)?)\s*m/);
    if (m) return parseFloat(m[1]);
    const num = parseFloat(rawHeight);
    if (!Number.isNaN(num)) return num;
  }
  const levels = tags['building:levels'];
  if (levels != null) {
    const n = parseInt(levels, 10);
    if (!Number.isNaN(n)) return n * 3.5;
  }
  return 10;
}

/**
 * 타겟 bounds 내 OSM 건물을 Overpass API로 조회해 BuildingFeature[] 반환.
 * 에러/타임아웃 시 빈 배열 반환.
 */
export async function fetchBuildingsFromOverpass(
  bounds: Bounds
): Promise<BuildingFeatureFromOverpass[]> {
  const bbox = boundsToOverpassBbox(bounds);
  const query = `[out:json][timeout:25];
(
  way["building"](${bbox});
);
out body;
>;
out skel qt;
`;
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Overpass] HTTP 오류:', response.status, response.statusText);
      return [];
    }

    const data: OverpassResponse = await response.json();
    const elements = data.elements ?? [];

    const node_map = new Map<number, { lat: number; lon: number }>();
    for (const el of elements) {
      if (el.type === 'node' && el.lat != null && el.lon != null) {
        node_map.set(el.id, { lat: el.lat, lon: el.lon });
      }
    }

    const buildings: BuildingFeatureFromOverpass[] = [];
    for (const el of elements) {
      if (el.type !== 'way' || !el.tags?.building) continue;
      const nodes = el.nodes ?? [];
      const coords = nodes
        .map((node_id) => node_map.get(node_id))
        .filter((c): c is { lat: number; lon: number } => c != null)
        .map((c) => [c.lon, c.lat] as [number, number]);

      if (coords.length < 3) continue;

      const center_lon =
        coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const center_lat =
        coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      const height_m = heightFromTags(el.tags);

      const properties: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(el.tags)) {
        properties[k] = v;
      }

      buildings.push({
        longitude_deg: center_lon,
        latitude_deg: center_lat,
        height_m,
        properties,
      });
    }

    return buildings;
  } catch (err) {
    if (err instanceof Error) {
      console.warn('[Overpass] 건물 조회 실패:', err.message);
    }
    return [];
  }
}
