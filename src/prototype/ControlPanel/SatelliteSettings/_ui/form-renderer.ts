import { createSection, createInputField } from './form-builder.js';

/**
 * 폼 렌더링 유틸리티
 */

export interface FormRendererCallbacks {
  onInputFocus?: (id: string) => void;
  onInputBlur?: (id: string) => void;
  onInputChange?: () => void;
  onCreateButtonClick?: () => void;
  onAxisToggleChange?: (checked: boolean) => void;
}

/**
 * 위성 설정 폼 렌더링
 */
export function renderSatelliteSettingsForm(
  container: HTMLElement,
  callbacks: FormRendererCallbacks
): void {
  const section = document.createElement('div');
  section.className = 'sidebar-section';

  const title = document.createElement('h3');
  title.textContent = '위성 설정';
  section.appendChild(title);

  const description = document.createElement('p');
  description.style.color = '#aaa';
  description.style.fontSize = '12px';
  description.style.marginTop = '10px';
  description.textContent = '위성 BUS와 Payload(안테나)를 설정하고 생성합니다.';
  section.appendChild(description);

  // Satellite settings form
  const form = document.createElement('div');
  form.style.marginTop = '15px';

  // 위성 기본 정보 섹션
  const basicInfoSection = createSection('위성 기본 정보');
  
  // Satellite name input
  const nameInput = createInputField(
    '위성 이름:',
    'prototypeSatelliteName',
    'text',
    '위성 이름을 입력하세요',
    'Satellite-1',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  basicInfoSection.appendChild(nameInput);

  // Satellite ID input
  const idInput = createInputField(
    '위성 ID:',
    'prototypeSatelliteId',
    'text',
    '위성 ID를 입력하세요',
    'SAT-001',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  basicInfoSection.appendChild(idInput);

  // 위치 입력 필드
  const lonInput = createInputField(
    '경도 (도):',
    'prototypeSatelliteLongitude',
    'number',
    '-180 ~ 180',
    '127.5',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  basicInfoSection.appendChild(lonInput);

  const latInput = createInputField(
    '위도 (도):',
    'prototypeSatelliteLatitude',
    'number',
    '-90 ~ 90',
    '37.5',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  basicInfoSection.appendChild(latInput);

  const altInput = createInputField(
    '고도 (km):',
    'prototypeSatelliteAltitude',
    'number',
    '0 이상',
    '591',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  basicInfoSection.appendChild(altInput);

  form.appendChild(basicInfoSection);

  // BUS 설정 섹션
  const busSection = createSection('BUS 설정');
  
  const busLengthInput = createInputField(
    'BUS 길이 (mm):',
    'prototypeBusLength',
    'number',
    '예: 800',
    '800',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  busSection.appendChild(busLengthInput);

  const busWidthInput = createInputField(
    'BUS 너비 (mm):',
    'prototypeBusWidth',
    'number',
    '예: 700',
    '700',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  busSection.appendChild(busWidthInput);

  const busHeightInput = createInputField(
    'BUS 높이 (mm):',
    'prototypeBusHeight',
    'number',
    '예: 840',
    '840',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  busSection.appendChild(busHeightInput);

  form.appendChild(busSection);

  // 안테나 크기 설정 섹션
  const antennaSizeSection = createSection('안테나 크기 설정');
  
  const antennaHeightInput = createInputField(
    '안테나 높이 (mm):',
    'prototypeAntennaHeight',
    'number',
    '예: 800',
    '800',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaSizeSection.appendChild(antennaHeightInput);

  const antennaWidthInput = createInputField(
    '안테나 너비 (mm):',
    'prototypeAntennaWidth',
    'number',
    '예: 2410',
    '2410',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaSizeSection.appendChild(antennaWidthInput);

  const antennaDepthInput = createInputField(
    '안테나 두께 (mm):',
    'prototypeAntennaDepth',
    'number',
    '예: 100',
    '100',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaSizeSection.appendChild(antennaDepthInput);

  form.appendChild(antennaSizeSection);

  // 버스-안테나 간격 설정 섹션
  const gapSection = createSection('버스-안테나 간격 설정');
  
  const antennaGapInput = createInputField(
    '버스-안테나 간격 (mm):',
    'prototypeAntennaGap',
    'number',
    '예: 100',
    '100',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  gapSection.appendChild(antennaGapInput);

  form.appendChild(gapSection);

  // 안테나 방향 파라미터 섹션
  const antennaOrientationSection = createSection('안테나 방향 파라미터');
  
  const antennaRollInput = createInputField(
    'Antenna Roll Angle (도):',
    'prototypeAntennaRoll',
    'number',
    'x축 회전',
    '0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOrientationSection.appendChild(antennaRollInput);

  const antennaPitchInput = createInputField(
    'Antenna Pitch Angle (도):',
    'prototypeAntennaPitch',
    'number',
    'y축 회전',
    '0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOrientationSection.appendChild(antennaPitchInput);

  const antennaYawInput = createInputField(
    'Antenna Yaw Angle (도):',
    'prototypeAntennaYaw',
    'number',
    'z축 회전',
    '0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOrientationSection.appendChild(antennaYawInput);

  const antennaElevationInput = createInputField(
    'Initial Antenna Elevation Angle (도):',
    'prototypeAntennaElevation',
    'number',
    '초기 Elevation',
    '0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOrientationSection.appendChild(antennaElevationInput);

  const antennaAzimuthInput = createInputField(
    'Initial Antenna Azimuth Angle (도):',
    'prototypeAntennaAzimuth',
    'number',
    '초기 Azimuth',
    '0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOrientationSection.appendChild(antennaAzimuthInput);

  form.appendChild(antennaOrientationSection);

  // 안테나 기타 파라미터 섹션 (데이터 저장용)
  const antennaOtherSection = createSection('안테나 기타 파라미터 (데이터 저장용)');
  
  const beamwidthElevationInput = createInputField(
    'Beamwidth Elevation (도):',
    'prototypeBeamwidthElevation',
    'number',
    '',
    '1.0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(beamwidthElevationInput);

  const beamwidthAzimuthInput = createInputField(
    'Beamwidth Azimuth (도):',
    'prototypeBeamwidthAzimuth',
    'number',
    '',
    '1.0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(beamwidthAzimuthInput);

  const hpaInput = createInputField(
    'High Power Amp (HPA):',
    'prototypeHPA',
    'number',
    '',
    '1000',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(hpaInput);

  const noiseFigureInput = createInputField(
    'Noise Figure (dB):',
    'prototypeNoiseFigure',
    'number',
    '',
    '3.0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(noiseFigureInput);

  const totalLossInput = createInputField(
    'Total Loss (dB):',
    'prototypeTotalLoss',
    'number',
    '',
    '2.0',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(totalLossInput);

  const systemNoiseTempInput = createInputField(
    'System Noise Temperature:',
    'prototypeSystemNoiseTemp',
    'number',
    '',
    '290',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(systemNoiseTempInput);

  const receiverGainInput = createInputField(
    'Receiver Gain (dB):',
    'prototypeReceiverGain',
    'number',
    '',
    '50',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(receiverGainInput);

  const adcBitsInput = createInputField(
    'ADC Bits:',
    'prototypeADCBits',
    'number',
    '',
    '12',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(adcBitsInput);

  const centerFreqInput = createInputField(
    'Center Frequency (Hz):',
    'prototypeCenterFrequency',
    'number',
    '',
    '9.65e9',
    callbacks.onInputFocus,
    callbacks.onInputBlur,
    callbacks.onInputChange
  );
  antennaOtherSection.appendChild(centerFreqInput);

  form.appendChild(antennaOtherSection);

  // 제어 버튼 섹션
  const buttonSection = document.createElement('div');
  buttonSection.style.marginTop = '20px';
  buttonSection.style.display = 'flex';
  buttonSection.style.gap = '10px';
  buttonSection.style.flexDirection = 'column';

  // 위성 엔티티 생성 버튼 (우주 공간에서 생성)
  const createButton = document.createElement('button');
  createButton.textContent = '위성 엔티티 생성 (우주 공간)';
  createButton.style.padding = '10px';
  createButton.style.backgroundColor = '#4CAF50';
  createButton.style.color = 'white';
  createButton.style.border = 'none';
  createButton.style.borderRadius = '4px';
  createButton.style.cursor = 'pointer';
  if (callbacks.onCreateButtonClick) {
    createButton.addEventListener('click', callbacks.onCreateButtonClick);
  }
  buttonSection.appendChild(createButton);

  // XYZ 축 표시/숨김 토글
  const axisToggleLabel = document.createElement('label');
  axisToggleLabel.style.display = 'flex';
  axisToggleLabel.style.alignItems = 'center';
  axisToggleLabel.style.gap = '8px';
  axisToggleLabel.style.marginTop = '10px';
  axisToggleLabel.style.cursor = 'pointer';

  const axisToggle = document.createElement('input');
  axisToggle.type = 'checkbox';
  axisToggle.id = 'prototypeAxisToggle';
  axisToggle.checked = true;
  const onAxisToggleChange = callbacks.onAxisToggleChange;
  if (onAxisToggleChange) {
    axisToggle.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      onAxisToggleChange(checked);
    });
  }

  const axisToggleText = document.createElement('span');
  axisToggleText.textContent = 'XYZ 축 표시';

  axisToggleLabel.appendChild(axisToggle);
  axisToggleLabel.appendChild(axisToggleText);
  buttonSection.appendChild(axisToggleLabel);

  form.appendChild(buttonSection);

  section.appendChild(form);
  container.appendChild(section);
}
