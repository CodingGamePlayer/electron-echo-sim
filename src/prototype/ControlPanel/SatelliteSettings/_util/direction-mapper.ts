/**
 * 입력 필드 ID를 방향 문자열로 매핑하는 유틸리티
 */

/**
 * 입력 필드 ID에 해당하는 방향 문자열 반환
 */
export function getDirectionForInputId(inputId: string): string | null {
  // BUS 관련만 방향 화살표 표시 (안테나는 방향 표시 없음)
  const directionMap: Record<string, string> = {
    'prototypeBusLength': 'bus_length',
    'prototypeBusWidth': 'bus_width',
    'prototypeBusHeight': 'bus_height',
  };

  return directionMap[inputId] || null;
}
