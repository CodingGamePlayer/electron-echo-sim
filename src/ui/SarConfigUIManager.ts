// SAR 설정 타입
interface SarSystemConfig {
  fc: number;
  bw: number;
  fs: number;
  taup: number;
  prf: number;
  swst: number;
  swl: number;
  orbit_height: number;
  antenna_width: number;
  antenna_height: number;
  antenna_roll_angle: number;
  antenna_pitch_angle: number;
  antenna_yaw_angle: number;
  Pt: number;
  G_recv: number;
  NF: number;
  Loss: number;
  Tsys: number;
  adc_bits: number;
  beam_id: string;
  el_angle?: number;  // Elevation angle (deg) - rank 계산에 사용
  az_angle?: number;  // Azimuth angle (deg) - rank 계산에 사용
}

// Swath 계산에 필요한 최소 SAR 설정 타입
import type { SarSystemConfig as SwathCalcSarConfig } from '../utils/swath-param-calculator.js';

interface SarConfigDetail extends SarSystemConfig {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SarConfigItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SarConfigListResponse {
  configs: SarConfigItem[];
  total: number;
}

// Backend API 기본 URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * SAR 시스템 설정 UI 관리
 */
export class SarConfigUIManager {
  private onConfigLoaded?: (sarConfig: SwathCalcSarConfig) => void;

  /**
   * SAR 설정 UI 초기화
   */
  initialize(onConfigLoaded?: (sarConfig: SwathCalcSarConfig) => void): void {
    this.onConfigLoaded = onConfigLoaded;
    this.setupHandlers();
    this.loadSarConfigList();
  }

  /**
   * SAR 시스템 설정 핸들러 설정
   */
  private setupHandlers(): void {
    const saveBtn = document.getElementById('sarConfigSaveBtn') as HTMLButtonElement;
    const loadBtn = document.getElementById('sarConfigLoadBtn') as HTMLButtonElement;
    const deleteBtn = document.getElementById('sarConfigDeleteBtn') as HTMLButtonElement;
    const newBtn = document.getElementById('sarConfigNewBtn') as HTMLButtonElement;
    const configList = document.getElementById('sarConfigList') as HTMLSelectElement;

    if (!saveBtn || !loadBtn || !deleteBtn || !newBtn || !configList) {
      return;
    }

    newBtn.addEventListener('click', () => {
      this.clearSarConfigForm();
      const nameInput = document.getElementById('sarConfigName') as HTMLInputElement;
      if (nameInput) {
        nameInput.value = '';
      }
      if (configList) {
        configList.selectedIndex = -1;
      }
    });

    saveBtn.addEventListener('click', async () => {
      try {
        const nameInput = document.getElementById('sarConfigName') as HTMLInputElement;
        if (!nameInput || !nameInput.value.trim()) {
          alert('설정 이름을 입력하세요.');
          return;
        }

        const config = this.getSarConfigFromForm();
        if (!config) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: nameInput.value.trim(),
            description: '',
            ...config
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        alert('설정이 저장되었습니다.');
        nameInput.value = '';
        this.clearSarConfigForm();
        this.loadSarConfigList();
      } catch (error: any) {
        console.error('SAR 설정 저장 실패:', error);
        alert('설정 저장 실패: ' + error.message);
      }
    });

    loadBtn.addEventListener('click', async () => {
      try {
        const selectedId = configList.value;
        if (!selectedId) {
          alert('불러올 설정을 선택하세요.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/config/${selectedId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const record: SarConfigDetail = await response.json();
        this.fillSarConfigForm(record);
        
        const nameInput = document.getElementById('sarConfigName') as HTMLInputElement;
        if (nameInput) {
          nameInput.value = record.name;
        }

        // SAR 설정을 Swath 제어 탭에 적용
        if (this.onConfigLoaded) {
          // Swath 계산에 필요한 필드만 추출 (rank 계산을 위해 prf, taup, el_angle, az_angle 포함)
          const swathConfig: SwathCalcSarConfig = {
            fc: record.fc,
            swst: record.swst,
            swl: record.swl,
            orbit_height: record.orbit_height,
            antenna_width: record.antenna_width,
            antenna_height: record.antenna_height,
            prf: record.prf,
            taup: record.taup,
            el_angle: (record as any).el_angle,
            az_angle: (record as any).az_angle
          };
          this.onConfigLoaded(swathConfig);
        }

        alert('설정을 불러왔습니다.');
      } catch (error: any) {
        console.error('SAR 설정 불러오기 실패:', error);
        alert('설정 불러오기 실패: ' + error.message);
      }
    });

    deleteBtn.addEventListener('click', async () => {
      try {
        const selectedId = configList.value;
        if (!selectedId) {
          alert('삭제할 설정을 선택하세요.');
          return;
        }

        if (!confirm('정말 이 설정을 삭제하시겠습니까?')) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/config/${selectedId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        alert('설정이 삭제되었습니다.');
        this.loadSarConfigList();
      } catch (error: any) {
        console.error('SAR 설정 삭제 실패:', error);
        alert('설정 삭제 실패: ' + error.message);
      }
    });
  }

  /**
   * 폼에서 SAR 설정 읽기
   */
  private getSarConfigFromForm(): SarSystemConfig | null {
    try {
      return {
        fc: parseFloat((document.getElementById('sarConfigFc') as HTMLInputElement)?.value || '0'),
        bw: parseFloat((document.getElementById('sarConfigBw') as HTMLInputElement)?.value || '0'),
        fs: parseFloat((document.getElementById('sarConfigFs') as HTMLInputElement)?.value || '0'),
        taup: parseFloat((document.getElementById('sarConfigTaup') as HTMLInputElement)?.value || '0'),
        prf: parseFloat((document.getElementById('sarConfigPrf') as HTMLInputElement)?.value || '0'),
        swst: parseFloat((document.getElementById('sarConfigSwst') as HTMLInputElement)?.value || '0'),
        swl: parseFloat((document.getElementById('sarConfigSwl') as HTMLInputElement)?.value || '0'),
        orbit_height: parseFloat((document.getElementById('sarConfigOrbitHeight') as HTMLInputElement)?.value || '0'),
        antenna_width: parseFloat((document.getElementById('sarConfigAntennaWidth') as HTMLInputElement)?.value || '0'),
        antenna_height: parseFloat((document.getElementById('sarConfigAntennaHeight') as HTMLInputElement)?.value || '0'),
        antenna_roll_angle: parseFloat((document.getElementById('sarConfigAntennaRollAngle') as HTMLInputElement)?.value || '0'),
        antenna_pitch_angle: parseFloat((document.getElementById('sarConfigAntennaPitchAngle') as HTMLInputElement)?.value || '0'),
        antenna_yaw_angle: parseFloat((document.getElementById('sarConfigAntennaYawAngle') as HTMLInputElement)?.value || '0'),
        Pt: parseFloat((document.getElementById('sarConfigPt') as HTMLInputElement)?.value || '0'),
        G_recv: parseFloat((document.getElementById('sarConfigGRecv') as HTMLInputElement)?.value || '0'),
        NF: parseFloat((document.getElementById('sarConfigNF') as HTMLInputElement)?.value || '0'),
        Loss: parseFloat((document.getElementById('sarConfigLoss') as HTMLInputElement)?.value || '0'),
        Tsys: parseFloat((document.getElementById('sarConfigTsys') as HTMLInputElement)?.value || '0'),
        adc_bits: parseInt((document.getElementById('sarConfigAdcBits') as HTMLInputElement)?.value || '0'),
        beam_id: (document.getElementById('sarConfigBeamId') as HTMLInputElement)?.value || 'Beam0000'
      };
    } catch (error) {
      console.error('SAR 설정 폼 읽기 실패:', error);
      return null;
    }
  }

  /**
   * 폼에 SAR 설정 채우기
   */
  private fillSarConfigForm(record: SarSystemConfig | SarConfigDetail): void {
    (document.getElementById('sarConfigFc') as HTMLInputElement).value = record.fc.toString();
    (document.getElementById('sarConfigBw') as HTMLInputElement).value = record.bw.toString();
    (document.getElementById('sarConfigFs') as HTMLInputElement).value = record.fs.toString();
    (document.getElementById('sarConfigTaup') as HTMLInputElement).value = record.taup.toString();
    (document.getElementById('sarConfigPrf') as HTMLInputElement).value = record.prf.toString();
    (document.getElementById('sarConfigSwst') as HTMLInputElement).value = record.swst.toString();
    (document.getElementById('sarConfigSwl') as HTMLInputElement).value = record.swl.toString();
    (document.getElementById('sarConfigOrbitHeight') as HTMLInputElement).value = record.orbit_height.toString();
    (document.getElementById('sarConfigAntennaWidth') as HTMLInputElement).value = record.antenna_width.toString();
    (document.getElementById('sarConfigAntennaHeight') as HTMLInputElement).value = record.antenna_height.toString();
    (document.getElementById('sarConfigAntennaRollAngle') as HTMLInputElement).value = record.antenna_roll_angle.toString();
    (document.getElementById('sarConfigAntennaPitchAngle') as HTMLInputElement).value = record.antenna_pitch_angle.toString();
    (document.getElementById('sarConfigAntennaYawAngle') as HTMLInputElement).value = record.antenna_yaw_angle.toString();
    (document.getElementById('sarConfigPt') as HTMLInputElement).value = record.Pt.toString();
    (document.getElementById('sarConfigGRecv') as HTMLInputElement).value = record.G_recv.toString();
    (document.getElementById('sarConfigNF') as HTMLInputElement).value = record.NF.toString();
    (document.getElementById('sarConfigLoss') as HTMLInputElement).value = record.Loss.toString();
    (document.getElementById('sarConfigTsys') as HTMLInputElement).value = record.Tsys.toString();
    (document.getElementById('sarConfigAdcBits') as HTMLInputElement).value = record.adc_bits.toString();
    (document.getElementById('sarConfigBeamId') as HTMLInputElement).value = record.beam_id;
  }

  /**
   * SAR 설정 폼 초기화
   */
  private clearSarConfigForm(): void {
    (document.getElementById('sarConfigFc') as HTMLInputElement).value = '5.4e9';
    (document.getElementById('sarConfigBw') as HTMLInputElement).value = '150e6';
    (document.getElementById('sarConfigFs') as HTMLInputElement).value = '250e6';
    (document.getElementById('sarConfigTaup') as HTMLInputElement).value = '10e-6';
    (document.getElementById('sarConfigPrf') as HTMLInputElement).value = '5000';
    (document.getElementById('sarConfigSwst') as HTMLInputElement).value = '10e-6';
    (document.getElementById('sarConfigSwl') as HTMLInputElement).value = '50e-6';
    (document.getElementById('sarConfigOrbitHeight') as HTMLInputElement).value = '517e3';
    (document.getElementById('sarConfigAntennaWidth') as HTMLInputElement).value = '4.0';
    (document.getElementById('sarConfigAntennaHeight') as HTMLInputElement).value = '0.5';
    (document.getElementById('sarConfigAntennaRollAngle') as HTMLInputElement).value = '0.0';
    (document.getElementById('sarConfigAntennaPitchAngle') as HTMLInputElement).value = '0.0';
    (document.getElementById('sarConfigAntennaYawAngle') as HTMLInputElement).value = '0.0';
    (document.getElementById('sarConfigPt') as HTMLInputElement).value = '1000.0';
    (document.getElementById('sarConfigGRecv') as HTMLInputElement).value = '1.0';
    (document.getElementById('sarConfigNF') as HTMLInputElement).value = '3.0';
    (document.getElementById('sarConfigLoss') as HTMLInputElement).value = '2.0';
    (document.getElementById('sarConfigTsys') as HTMLInputElement).value = '290.0';
    (document.getElementById('sarConfigAdcBits') as HTMLInputElement).value = '12';
    (document.getElementById('sarConfigBeamId') as HTMLInputElement).value = 'Beam0000';
  }

  /**
   * 저장된 SAR 설정 목록 로드
   */
  private async loadSarConfigList(): Promise<void> {
    const configList = document.getElementById('sarConfigList') as HTMLSelectElement;
    if (!configList) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: SarConfigListResponse = await response.json();
      configList.innerHTML = '';

      if (data.configs.length === 0) {
        configList.innerHTML = '<option>저장된 설정이 없습니다</option>';
        return;
      }

      data.configs.forEach(config => {
        const option = document.createElement('option');
        option.value = config.id;
        option.textContent = `${config.name} (${new Date(config.created_at).toLocaleString('ko-KR')})`;
        configList.appendChild(option);
      });
    } catch (error: any) {
      console.error('SAR 설정 목록 로드 실패:', error);
      configList.innerHTML = '<option>로드 실패: ' + error.message + '</option>';
    }
  }
}
