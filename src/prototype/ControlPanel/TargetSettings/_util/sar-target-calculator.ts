/**
 * SAR 타겟 파라미터 요약 계산 (순수 함수)
 */

export interface SarRangeParams {
  count: number;
  spacing_km: number;
  offset_km: number;
}

export interface SarAzimuthParams {
  count: number;
  spacing_km: number;
  offset_km: number;
}

export interface SarSummary {
  range_coverage_km: number;
  azimuth_coverage_km: number;
  total_area_km2: number;
  total_pixels: number;
}

/**
 * Range Coverage = (count - 1) × spacing_km
 * Azimuth Coverage = (count - 1) × spacing_km
 * Total Area = range_coverage × azimuth_coverage
 * Total Pixels = range_count × azimuth_count
 */
export function computeSarSummary(
  range_params: SarRangeParams,
  azimuth_params: SarAzimuthParams
): SarSummary {
  const range_coverage_km =
    Math.max(0, range_params.count - 1) * range_params.spacing_km;
  const azimuth_coverage_km =
    Math.max(0, azimuth_params.count - 1) * azimuth_params.spacing_km;
  const total_area_km2 = range_coverage_km * azimuth_coverage_km;
  const total_pixels = range_params.count * azimuth_params.count;

  return {
    range_coverage_km,
    azimuth_coverage_km,
    total_area_km2,
    total_pixels,
  };
}
