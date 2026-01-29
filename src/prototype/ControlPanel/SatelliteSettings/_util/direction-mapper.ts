/**
 * 입력 필드 ID를 방향 문자열로 매핑하는 유틸리티
 */

/**
 * 입력 필드 ID에 해당하는 방향 문자열 반환
 */
export function getDirectionForInputId(inputId: string): string | null {
  const directionMap: Record<string, string> = {
    'prototypeBusLength': 'bus_length',
    'prototypeBusWidth': 'bus_width',
    'prototypeBusHeight': 'bus_height',
    'prototypeAntennaHeight': 'antenna_height',
    'prototypeAntennaWidth': 'antenna_width',
    'prototypeAntennaDepth': 'antenna_depth',
    'prototypeAntennaGap': 'antenna_gap',
    'prototypeAntennaRoll': 'antenna_roll',
    'prototypeAntennaPitch': 'antenna_pitch',
    'prototypeAntennaYaw': 'antenna_yaw',
    'prototypeAntennaElevation': 'antenna_elevation',
    'prototypeAntennaAzimuth': 'antenna_azimuth',
  };

  return directionMap[inputId] || null;
}
