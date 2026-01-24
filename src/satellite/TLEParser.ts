/**
 * TLE 파서
 */
export class TLEParser {
  /**
   * TLE 데이터 파싱
   */
  parseTLE(tleData: string): { line1: string; line2: string } | null {
    if (!tleData) {
      return null;
    }

    try {
      const tleLines = tleData.trim().split('\n');
      let line1: string, line2: string;
      
      if (tleLines.length === 2) {
        line1 = tleLines[0];
        line2 = tleLines[1];
      } else if (tleLines.length === 3) {
        line1 = tleLines[1];
        line2 = tleLines[2];
      } else {
        throw new Error('TLE 형식이 올바르지 않습니다. 2줄 또는 3줄이 필요합니다.');
      }
      
      return { line1, line2 };
    } catch (error) {
      console.error('TLE 파싱 실패:', error);
      return null;
    }
  }
}
