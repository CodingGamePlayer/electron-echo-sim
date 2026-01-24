// SAR 설정 타입 (로컬에서만 사용)
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
      alert('데이터베이스 기능이 비활성화되어 있습니다.');
      return;
    });

    loadBtn.addEventListener('click', async () => {
      alert('데이터베이스 기능이 비활성화되어 있습니다.');
      return;
    });

    deleteBtn.addEventListener('click', async () => {
      alert('데이터베이스 기능이 비활성화되어 있습니다.');
      return;
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
  private fillSarConfigForm(record: SarSystemConfig): void {
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

    configList.innerHTML = '<option>데이터베이스 기능이 비활성화되어 있습니다</option>';
  }
}
