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

  /**
   * TLE에서 평균 운동(Mean Motion) 추출
   * @param tleData TLE 데이터
   * @returns 평균 운동 (revolutions per day), 실패 시 null
   */
  extractMeanMotion(tleData: string): number | null {
    const parsed = this.parseTLE(tleData);
    if (!parsed) {
      return null;
    }

    try {
      // Line 2에서 평균 운동 추출 (마지막 필드)
      // 형식: "2 12345 097.4360 041.9900 0007590 076.9850 265.0060 15.17000000000008"
      // 평균 운동은 마지막 필드 (52-63번째 문자, 1-based)
      const line2 = parsed.line2.trim();
      
      // 평균 운동은 line2의 마지막 필드 (공백으로 분리)
      const fields = line2.split(/\s+/);
      if (fields.length >= 7) {
        const meanMotion = parseFloat(fields[6]);
        if (!isNaN(meanMotion) && meanMotion > 0) {
          return meanMotion;
        }
      }
      
      return null;
    } catch (error) {
      console.error('평균 운동 추출 실패:', error);
      return null;
    }
  }

  /**
   * TLE에서 궤도 주기 계산 (지구 중심 기준)
   * @param tleData TLE 데이터
   * @returns 궤도 주기 (분), 실패 시 null
   */
  calculateOrbitalPeriod(tleData: string): number | null {
    const meanMotion = this.extractMeanMotion(tleData);
    if (!meanMotion || meanMotion <= 0) {
      return null;
    }

    // 궤도 주기 (분) = 1440 / 평균 운동
    // 평균 운동은 하루에 몇 번 공전하는지 (revolutions per day)
    // 이는 지구 중심 기준으로 한 바퀴 도는 시간입니다.
    const periodMinutes = 1440 / meanMotion;
    
    return periodMinutes;
  }

  /**
   * TLE에서 궤도 경사각(Inclination) 추출
   * @param tleData TLE 데이터
   * @returns 궤도 경사각 (도), 실패 시 null
   */
  extractInclination(tleData: string): number | null {
    const parsed = this.parseTLE(tleData);
    if (!parsed) {
      return null;
    }

    try {
      // Line 2에서 궤도 경사각 추출 (3번째 필드)
      // 형식: "2 12345 097.4360 041.9900 0007590 076.9850 265.0060 15.17000000000008"
      const line2 = parsed.line2.trim();
      const fields = line2.split(/\s+/);
      if (fields.length >= 3) {
        const inclination = parseFloat(fields[2]);
        if (!isNaN(inclination) && inclination >= 0 && inclination <= 180) {
          return inclination;
        }
      }
      
      return null;
    } catch (error) {
      console.error('궤도 경사각 추출 실패:', error);
      return null;
    }
  }

  /**
   * 같은 지표면 위치로 돌아오는 주기 계산 (Ground Track Repeat Cycle)
   * 
   * 참고: 평균 운동으로 계산한 궤도 주기는 지구 중심 기준 한 바퀴 도는 시간입니다.
   * 같은 지표면 위치(위도/경도)로 돌아오려면 지구 자전과 궤도 경사각을 고려해야 합니다.
   * 
   * 실제로는 위성 위치를 시뮬레이션해서 같은 위치로 돌아오는 시간을 찾는 것이 가장 정확합니다.
   * 
   * @param tleData TLE 데이터
   * @returns 설명 문자열
   */
  explainOrbitalPeriod(tleData: string): string {
    const meanMotion = this.extractMeanMotion(tleData);
    if (!meanMotion || meanMotion <= 0) {
      return 'TLE 데이터를 파싱할 수 없습니다.';
    }

    const orbitalPeriodMinutes = 1440 / meanMotion;
    const orbitalPeriodHours = orbitalPeriodMinutes / 60;
    
    let explanation = `\n=== 궤도 주기 분석 ===\n`;
    explanation += `평균 운동: ${meanMotion.toFixed(8)} revolutions/day\n`;
    explanation += `궤도 주기: ${orbitalPeriodMinutes.toFixed(2)}분 (${orbitalPeriodHours.toFixed(2)}시간)\n`;
    explanation += `\n※ 참고: 이는 지구 중심 기준으로 한 바퀴 도는 시간입니다.\n`;
    explanation += `같은 지표면 위치(위도/경도)로 돌아오는 시간은 다를 수 있습니다.\n`;
    explanation += `(지구 자전과 궤도 경사각에 따라 달라짐)\n`;
    
    return explanation;
  }
}
