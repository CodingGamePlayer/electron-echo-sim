import { SarSystemConfig, SarSystemConfigRecord } from '../types/sar-config.types.js';

// Electron API 타입 선언
declare global {
  interface Window {
    electronAPI?: {
      sarConfig: {
        save: (request: { name: string; config: SarSystemConfig }) => Promise<SarSystemConfigRecord>;
        getAll: () => Promise<SarSystemConfigRecord[]>;
        getById: (id: string) => Promise<SarSystemConfigRecord>;
        delete: (id: string) => Promise<boolean>;
      };
    };
  }
}

/**
 * SAR 시스템 설정 UI 관리
 */
export class SarConfigUIManager {
  /**
   * SAR 설정 UI 초기화
   */
  initialize(): void {
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
    const configList = document.getElementById('sarConfigList') as HTMLSelectElement;

    if (!saveBtn || !loadBtn || !deleteBtn || !configList) {
      return;
    }

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

        if (!window.electronAPI?.sarConfig) {
          alert('Electron API가 사용할 수 없습니다.');
          return;
        }

        await window.electronAPI.sarConfig.save({
          name: nameInput.value.trim(),
          config: config
        });

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

        if (!window.electronAPI?.sarConfig) {
          alert('Electron API가 사용할 수 없습니다.');
          return;
        }

        const record = await window.electronAPI.sarConfig.getById(selectedId);
        this.fillSarConfigForm(record);
        
        const nameInput = document.getElementById('sarConfigName') as HTMLInputElement;
        if (nameInput) {
          nameInput.value = record.name;
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

        if (!window.electronAPI?.sarConfig) {
          alert('Electron API가 사용할 수 없습니다.');
          return;
        }

        await window.electronAPI.sarConfig.delete(selectedId);
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
  private fillSarConfigForm(record: SarSystemConfigRecord): void {
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
      if (!window.electronAPI?.sarConfig) {
        configList.innerHTML = '<option>Electron API 사용 불가</option>';
        return;
      }

      const configs = await window.electronAPI.sarConfig.getAll();
      configList.innerHTML = '';

      if (configs.length === 0) {
        configList.innerHTML = '<option>저장된 설정이 없습니다</option>';
        return;
      }

      configs.forEach(config => {
        const option = document.createElement('option');
        option.value = config.id;
        option.textContent = `${config.name} (${new Date(config.updated_at).toLocaleString()})`;
        configList.appendChild(option);
      });
    } catch (error: any) {
      console.error('SAR 설정 목록 로드 실패:', error);
      configList.innerHTML = '<option>로드 실패</option>';
    }
  }
}
