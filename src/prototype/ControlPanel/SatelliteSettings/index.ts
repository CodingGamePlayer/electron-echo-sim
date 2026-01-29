import { SatelliteBusPayloadManager } from './SatelliteBusPayloadManager.js';

/**
 * SatelliteSettings - Satellite settings tab management class
 */
export class SatelliteSettings {
  private container: HTMLElement | null;
  private viewer: any;
  private busPayloadManager: SatelliteBusPayloadManager | null;
  private cameraTrackingInterval: number | null;
  private isCameraTracking: boolean;
  private cameraTrackingButton: HTMLButtonElement | null;
  private cameraMoveHandler: any;

  constructor() {
    this.container = null;
    this.viewer = null;
    this.busPayloadManager = null;
    this.cameraTrackingInterval = null;
    this.isCameraTracking = false;
    this.cameraTrackingButton = null;
    this.cameraMoveHandler = null;
  }

  /**
   * Initialize satellite settings tab
   */
  initialize(container: HTMLElement, viewer?: any): void {
    this.container = container;
    this.viewer = viewer || null;
    if (this.viewer) {
      this.busPayloadManager = new SatelliteBusPayloadManager(this.viewer);
    }
    this.render();
  }

  /**
   * Render satellite settings UI
   */
  private render(): void {
    if (!this.container) return;

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
    const basicInfoSection = this.createSection('위성 기본 정보');
    
    // Satellite name input
    const nameInput = this.createInputField('위성 이름:', 'prototypeSatelliteName', 'text', '위성 이름을 입력하세요', 'Satellite-1');
    basicInfoSection.appendChild(nameInput);

    // Satellite ID input
    const idInput = this.createInputField('위성 ID:', 'prototypeSatelliteId', 'text', '위성 ID를 입력하세요', 'SAT-001');
    basicInfoSection.appendChild(idInput);

    // 위치 입력 필드
    const lonInput = this.createInputField('경도 (도):', 'prototypeSatelliteLongitude', 'number', '-180 ~ 180', '0');
    basicInfoSection.appendChild(lonInput);

    const latInput = this.createInputField('위도 (도):', 'prototypeSatelliteLatitude', 'number', '-90 ~ 90', '0');
    basicInfoSection.appendChild(latInput);

    const altInput = this.createInputField('고도 (미터):', 'prototypeSatelliteAltitude', 'number', '0 이상', '700000');
    basicInfoSection.appendChild(altInput);

    form.appendChild(basicInfoSection);

    // BUS 설정 섹션
    const busSection = this.createSection('BUS 설정');
    
    const busLengthInput = this.createInputField('BUS 길이 (mm):', 'prototypeBusLength', 'number', '예: 800', '800');
    busSection.appendChild(busLengthInput);

    const busWidthInput = this.createInputField('BUS 너비 (mm):', 'prototypeBusWidth', 'number', '예: 700', '700');
    busSection.appendChild(busWidthInput);

    const busHeightInput = this.createInputField('BUS 높이 (mm):', 'prototypeBusHeight', 'number', '예: 840', '840');
    busSection.appendChild(busHeightInput);

    form.appendChild(busSection);

    // 안테나 크기 설정 섹션
    const antennaSizeSection = this.createSection('안테나 크기 설정');
    
    const antennaHeightInput = this.createInputField('안테나 높이 (mm):', 'prototypeAntennaHeight', 'number', '예: 800', '800');
    antennaSizeSection.appendChild(antennaHeightInput);

    const antennaWidthInput = this.createInputField('안테나 너비 (mm):', 'prototypeAntennaWidth', 'number', '예: 2410', '2410');
    antennaSizeSection.appendChild(antennaWidthInput);

    const antennaDepthInput = this.createInputField('안테나 두께 (mm):', 'prototypeAntennaDepth', 'number', '예: 100', '100');
    antennaSizeSection.appendChild(antennaDepthInput);

    form.appendChild(antennaSizeSection);

    // 안테나 방향 파라미터 섹션
    const antennaOrientationSection = this.createSection('안테나 방향 파라미터');
    
    const antennaRollInput = this.createInputField('Antenna Roll Angle (도):', 'prototypeAntennaRoll', 'number', 'x축 회전', '0');
    antennaOrientationSection.appendChild(antennaRollInput);

    const antennaPitchInput = this.createInputField('Antenna Pitch Angle (도):', 'prototypeAntennaPitch', 'number', 'y축 회전', '0');
    antennaOrientationSection.appendChild(antennaPitchInput);

    const antennaYawInput = this.createInputField('Antenna Yaw Angle (도):', 'prototypeAntennaYaw', 'number', 'z축 회전', '0');
    antennaOrientationSection.appendChild(antennaYawInput);

    const antennaElevationInput = this.createInputField('Initial Antenna Elevation Angle (도):', 'prototypeAntennaElevation', 'number', '초기 Elevation', '0');
    antennaOrientationSection.appendChild(antennaElevationInput);

    const antennaAzimuthInput = this.createInputField('Initial Antenna Azimuth Angle (도):', 'prototypeAntennaAzimuth', 'number', '초기 Azimuth', '0');
    antennaOrientationSection.appendChild(antennaAzimuthInput);

    form.appendChild(antennaOrientationSection);

    // 안테나 기타 파라미터 섹션 (데이터 저장용)
    const antennaOtherSection = this.createSection('안테나 기타 파라미터 (데이터 저장용)');
    
    const beamwidthElevationInput = this.createInputField('Beamwidth Elevation (도):', 'prototypeBeamwidthElevation', 'number', '', '1.0');
    antennaOtherSection.appendChild(beamwidthElevationInput);

    const beamwidthAzimuthInput = this.createInputField('Beamwidth Azimuth (도):', 'prototypeBeamwidthAzimuth', 'number', '', '1.0');
    antennaOtherSection.appendChild(beamwidthAzimuthInput);

    const hpaInput = this.createInputField('High Power Amp (HPA):', 'prototypeHPA', 'number', '', '1000');
    antennaOtherSection.appendChild(hpaInput);

    const noiseFigureInput = this.createInputField('Noise Figure (dB):', 'prototypeNoiseFigure', 'number', '', '3.0');
    antennaOtherSection.appendChild(noiseFigureInput);

    const totalLossInput = this.createInputField('Total Loss (dB):', 'prototypeTotalLoss', 'number', '', '2.0');
    antennaOtherSection.appendChild(totalLossInput);

    const systemNoiseTempInput = this.createInputField('System Noise Temperature:', 'prototypeSystemNoiseTemp', 'number', '', '290');
    antennaOtherSection.appendChild(systemNoiseTempInput);

    const receiverGainInput = this.createInputField('Receiver Gain (dB):', 'prototypeReceiverGain', 'number', '', '50');
    antennaOtherSection.appendChild(receiverGainInput);

    const adcBitsInput = this.createInputField('ADC Bits:', 'prototypeADCBits', 'number', '', '12');
    antennaOtherSection.appendChild(adcBitsInput);

    const centerFreqInput = this.createInputField('Center Frequency (Hz):', 'prototypeCenterFrequency', 'number', '', '9.65e9');
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
    createButton.addEventListener('click', () => this.createSatelliteEntity());
    buttonSection.appendChild(createButton);

    // 지구로 이동 버튼
    const moveToEarthButton = document.createElement('button');
    moveToEarthButton.textContent = '지구로 이동';
    moveToEarthButton.style.padding = '10px';
    moveToEarthButton.style.backgroundColor = '#2196F3';
    moveToEarthButton.style.color = 'white';
    moveToEarthButton.style.border = 'none';
    moveToEarthButton.style.borderRadius = '4px';
    moveToEarthButton.style.cursor = 'pointer';
    moveToEarthButton.addEventListener('click', () => this.moveSatelliteToEarth());
    buttonSection.appendChild(moveToEarthButton);

    // 엔티티 삭제 버튼
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '엔티티 삭제';
    deleteButton.style.padding = '10px';
    deleteButton.style.backgroundColor = '#f44336';
    deleteButton.style.color = 'white';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.addEventListener('click', () => this.removeSatelliteEntity());
    buttonSection.appendChild(deleteButton);

    // 카메라 추적 토글 버튼
    const cameraTrackingButton = document.createElement('button');
    cameraTrackingButton.textContent = '카메라 추적 OFF';
    cameraTrackingButton.id = 'prototypeCameraTrackingButton';
    cameraTrackingButton.style.padding = '10px';
    cameraTrackingButton.style.backgroundColor = '#666';
    cameraTrackingButton.style.color = 'white';
    cameraTrackingButton.style.border = 'none';
    cameraTrackingButton.style.borderRadius = '4px';
    cameraTrackingButton.style.cursor = 'pointer';
    cameraTrackingButton.addEventListener('click', () => this.toggleCameraTracking());
    this.cameraTrackingButton = cameraTrackingButton;
    buttonSection.appendChild(cameraTrackingButton);

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
    axisToggle.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.setAxisVisible(checked);
    });

    const axisToggleText = document.createElement('span');
    axisToggleText.textContent = 'XYZ 축 표시';

    axisToggleLabel.appendChild(axisToggle);
    axisToggleLabel.appendChild(axisToggleText);
    buttonSection.appendChild(axisToggleLabel);

    form.appendChild(buttonSection);

    section.appendChild(form);
    this.container.appendChild(section);
  }

  /**
   * 섹션 생성 헬퍼 메서드
   */
  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.marginTop = '20px';
    section.style.paddingTop = '15px';
    section.style.borderTop = '1px solid #333';

    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = title;
    sectionTitle.style.marginBottom = '10px';
    sectionTitle.style.fontSize = '14px';
    sectionTitle.style.color = '#ccc';
    section.appendChild(sectionTitle);

    return section;
  }

  /**
   * 입력 필드 생성 헬퍼 메서드
   */
  private createInputField(labelText: string, id: string, type: string, placeholder: string, defaultValue?: string): HTMLElement {
    const label = document.createElement('label');
    label.style.marginTop = '10px';
    label.style.display = 'block';
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.placeholder = placeholder;
    if (defaultValue !== undefined) {
      input.value = defaultValue;
    }
    input.style.width = '100%';
    input.style.marginTop = '4px';
    input.style.padding = '6px';
    input.style.backgroundColor = '#2a2a2a';
    input.style.color = '#fff';
    input.style.border = '1px solid #444';
    input.style.borderRadius = '4px';
    input.style.boxSizing = 'border-box';

    if (type === 'number') {
      input.step = 'any';
    }

    // 입력 필드 변경 시 엔티티 업데이트
    input.addEventListener('input', () => {
      this.updateEntityFromInputs();
    });

    label.appendChild(input);
    return label;
  }

  /**
   * 입력 필드 값으로 엔티티 업데이트
   */
  private updateEntityFromInputs(): void {
    if (!this.busPayloadManager || !this.viewer) {
      return;
    }

    // 엔티티가 생성되어 있는지 확인
    const busEntity = this.busPayloadManager.getBusEntity();
    const antennaEntity = this.busPayloadManager.getAntennaEntity();
    
    if (!busEntity && !antennaEntity) {
      // 엔티티가 없으면 업데이트하지 않음
      return;
    }

    // 카메라 추적 중이 아닐 때는 카메라가 자동으로 이동하지 않도록 설정
    // trackedEntity를 일시적으로 해제하여 엔티티 업데이트 시 카메라 이동 방지
    // 추적 상태와 관계없이 항상 해제하여 카메라 이동 방지
    const wasTracking = this.isCameraTracking;
    const previousTrackedEntity = this.viewer.trackedEntity;
    this.viewer.trackedEntity = undefined;

    try {
      // 위치 정보 가져오기 및 검증
      const lonInput = (document.getElementById('prototypeSatelliteLongitude') as HTMLInputElement)?.value;
      const latInput = (document.getElementById('prototypeSatelliteLatitude') as HTMLInputElement)?.value;
      const altInput = (document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value;

      if (lonInput && latInput && altInput) {
        const longitude = parseFloat(lonInput);
        const latitude = parseFloat(latInput);
        const altitude = parseFloat(altInput);

        // 입력값 검증 (NaN 체크 포함)
        // 위치 수정 시에도 우주 공간(50,000km)에 생성되도록 고도 고정
        if (!isNaN(longitude) && !isNaN(latitude) && !isNaN(altitude) &&
            longitude >= -180 && longitude <= 180 && 
            latitude >= -90 && latitude <= 90 && 
            altitude >= 0) {
          const spaceAltitude = 50000000; // 50,000km (지구 반지름의 약 8배)
          this.busPayloadManager.updatePosition({ longitude, latitude, altitude: spaceAltitude });
        }
      }

      // BUS 크기 가져오기 및 검증 (mm를 미터로 변환)
      const busLengthInput = (document.getElementById('prototypeBusLength') as HTMLInputElement)?.value;
      const busWidthInput = (document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value;
      const busHeightInput = (document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value;

      if (busLengthInput && busWidthInput && busHeightInput) {
        const busLengthMm = parseFloat(busLengthInput);
        const busWidthMm = parseFloat(busWidthInput);
        const busHeightMm = parseFloat(busHeightInput);

        if (!isNaN(busLengthMm) && !isNaN(busWidthMm) && !isNaN(busHeightMm) &&
            busLengthMm > 0 && busWidthMm > 0 && busHeightMm > 0) {
          // mm를 미터로 변환 (Cesium은 미터 단위 사용)
          this.busPayloadManager.updateBusDimensions({
            length: busLengthMm / 1000,
            width: busWidthMm / 1000,
            height: busHeightMm / 1000
          });
        }
      }

      // 안테나 크기 가져오기 및 검증 (mm를 미터로 변환)
      const antennaHeightInput = (document.getElementById('prototypeAntennaHeight') as HTMLInputElement)?.value;
      const antennaWidthInput = (document.getElementById('prototypeAntennaWidth') as HTMLInputElement)?.value;
      const antennaDepthInput = (document.getElementById('prototypeAntennaDepth') as HTMLInputElement)?.value;

      if (antennaHeightInput && antennaWidthInput && antennaDepthInput) {
        const antennaHeightMm = parseFloat(antennaHeightInput);
        const antennaWidthMm = parseFloat(antennaWidthInput);
        const antennaDepthMm = parseFloat(antennaDepthInput);

        if (!isNaN(antennaHeightMm) && !isNaN(antennaWidthMm) && !isNaN(antennaDepthMm) &&
            antennaHeightMm > 0 && antennaWidthMm > 0 && antennaDepthMm > 0) {
          // mm를 미터로 변환 (Cesium은 미터 단위 사용)
          this.busPayloadManager.updateAntennaDimensions({
            height: antennaHeightMm / 1000,
            width: antennaWidthMm / 1000,
            depth: antennaDepthMm / 1000
          });
        }
      }

      // 안테나 방향 가져오기 및 검증
      const antennaRollInput = (document.getElementById('prototypeAntennaRoll') as HTMLInputElement)?.value;
      const antennaPitchInput = (document.getElementById('prototypeAntennaPitch') as HTMLInputElement)?.value;
      const antennaYawInput = (document.getElementById('prototypeAntennaYaw') as HTMLInputElement)?.value;
      const antennaElevationInput = (document.getElementById('prototypeAntennaElevation') as HTMLInputElement)?.value;
      const antennaAzimuthInput = (document.getElementById('prototypeAntennaAzimuth') as HTMLInputElement)?.value;

      if (antennaRollInput !== undefined && antennaPitchInput !== undefined && antennaYawInput !== undefined &&
          antennaElevationInput !== undefined && antennaAzimuthInput !== undefined) {
        const antennaRoll = parseFloat(antennaRollInput || '0');
        const antennaPitch = parseFloat(antennaPitchInput || '0');
        const antennaYaw = parseFloat(antennaYawInput || '0');
        const antennaElevation = parseFloat(antennaElevationInput || '0');
        const antennaAzimuth = parseFloat(antennaAzimuthInput || '0');

        // NaN 체크 (방향은 0도가 기본값이므로 항상 업데이트 가능)
        if (!isNaN(antennaRoll) && !isNaN(antennaPitch) && !isNaN(antennaYaw) &&
            !isNaN(antennaElevation) && !isNaN(antennaAzimuth)) {
          this.busPayloadManager.updateAntennaOrientation({
            rollAngle: antennaRoll,
            pitchAngle: antennaPitch,
            yawAngle: antennaYaw,
            initialElevationAngle: antennaElevation,
            initialAzimuthAngle: antennaAzimuth
          });
        }
      }
    } catch (error) {
      // 입력값 파싱 오류는 무시 (사용자가 입력 중일 수 있음)
      console.debug('[SatelliteSettings] 엔티티 업데이트 중 오류 (무시됨):', error);
    } finally {
      // 카메라 추적이 활성화되어 있었다면 복원
      if (wasTracking && previousTrackedEntity) {
        this.viewer.trackedEntity = previousTrackedEntity;
      }
    }
  }

  /**
   * 위성 엔티티 생성
   */
  private createSatelliteEntity(): void {
    if (!this.busPayloadManager || !this.viewer) {
      alert('Cesium 뷰어가 초기화되지 않았습니다.');
      return;
    }

    // 입력값 가져오기
    const name = (document.getElementById('prototypeSatelliteName') as HTMLInputElement)?.value || 'Satellite';
    const id = (document.getElementById('prototypeSatelliteId') as HTMLInputElement)?.value || '';
    
    const longitude = parseFloat((document.getElementById('prototypeSatelliteLongitude') as HTMLInputElement)?.value || '0');
    const latitude = parseFloat((document.getElementById('prototypeSatelliteLatitude') as HTMLInputElement)?.value || '0');
    const altitude = parseFloat((document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value || '700000');

    // 입력값 검증
    if (longitude < -180 || longitude > 180) {
      alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
      return;
    }
    if (altitude < 0) {
      alert('고도는 0 이상이어야 합니다.');
      return;
    }

    const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
    const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
    const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');

    const antennaHeightMm = parseFloat((document.getElementById('prototypeAntennaHeight') as HTMLInputElement)?.value || '800');
    const antennaWidthMm = parseFloat((document.getElementById('prototypeAntennaWidth') as HTMLInputElement)?.value || '2410');
    const antennaDepthMm = parseFloat((document.getElementById('prototypeAntennaDepth') as HTMLInputElement)?.value || '100');

    // mm를 미터로 변환 (Cesium은 미터 단위 사용)
    const busLength = busLengthMm / 1000;
    const busWidth = busWidthMm / 1000;
    const busHeight = busHeightMm / 1000;

    const antennaHeight = antennaHeightMm / 1000;
    const antennaWidth = antennaWidthMm / 1000;
    const antennaDepth = antennaDepthMm / 1000;

    const antennaRoll = parseFloat((document.getElementById('prototypeAntennaRoll') as HTMLInputElement)?.value || '0');
    const antennaPitch = parseFloat((document.getElementById('prototypeAntennaPitch') as HTMLInputElement)?.value || '0');
    const antennaYaw = parseFloat((document.getElementById('prototypeAntennaYaw') as HTMLInputElement)?.value || '0');
    const antennaElevation = parseFloat((document.getElementById('prototypeAntennaElevation') as HTMLInputElement)?.value || '0');
    const antennaAzimuth = parseFloat((document.getElementById('prototypeAntennaAzimuth') as HTMLInputElement)?.value || '0');

    // 엔티티 생성 (우주 공간에서 생성 - 지구에서 멀리 떨어진 곳)
    try {
      console.log('[SatelliteSettings] 엔티티 생성 시작:', {
        viewer: !!this.viewer,
        busPayloadManager: !!this.busPayloadManager
      });

      if (!this.viewer) {
        alert('Cesium 뷰어가 초기화되지 않았습니다.');
        return;
      }

      if (!this.busPayloadManager) {
        alert('BUS/Payload 매니저가 초기화되지 않았습니다.');
        return;
      }

      // 우주 공간에서 생성 (지구에서 멀리 떨어진 위치)
      // 경도/위도는 입력값 사용하되, 고도는 매우 높게 설정하여 지구와 멀리 떨어뜨림
      const spaceAltitude = 50000000; // 50,000km (지구 반지름의 약 8배)

      this.busPayloadManager.createSatellite(
        name,
        { longitude, latitude, altitude: spaceAltitude },
        { length: busLength, width: busWidth, height: busHeight },
        {
          height: antennaHeight,
          width: antennaWidth,
          depth: antennaDepth,
          rollAngle: antennaRoll,
          pitchAngle: antennaPitch,
          yawAngle: antennaYaw,
          initialElevationAngle: antennaElevation,
          initialAzimuthAngle: antennaAzimuth,
        }
      );

      // 엔티티 생성 후 약간의 지연을 두고 카메라를 BUS에 고정
      setTimeout(() => {
        const busEntity = this.busPayloadManager?.getBusEntity();
        const antennaEntity = this.busPayloadManager?.getAntennaEntity();
        
        console.log('[SatelliteSettings] 엔티티 확인:', {
          busEntity: !!busEntity,
          antennaEntity: !!antennaEntity,
          busEntityId: busEntity?.id,
          antennaEntityId: antennaEntity?.id
        });
        
        // 엔티티가 생성되었는지 확인
        if (!busEntity && !antennaEntity) {
          console.error('[SatelliteSettings] 엔티티가 생성되지 않았습니다!');
          alert('엔티티 생성에 실패했습니다. 콘솔을 확인하세요.');
          return;
        }

        // 엔티티 생성 시 한 번만 카메라가 엔티티를 바라보도록 설정
        if (busEntity) {
          const busPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
          if (busPosition) {
            // BUS 크기 정보로 적절한 거리 계산 (mm를 미터로 변환)
            const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
            const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
            const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');
            const maxBusSize = Math.max(busLengthMm, busWidthMm, busHeightMm) / 1000;
            
            // 대각선에서 바라보는 각도 설정
            const cameraRange = Math.max(maxBusSize * 3, 20);
            
            // 한 번만 카메라를 엔티티로 이동
            this.viewer.camera.lookAt(
              busPosition,
              new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(45), // heading: 대각선 방향
                Cesium.Math.toRadians(0), // pitch: 수평선에 가까운 대각선 뷰
                cameraRange // range: 거리
              )
            );
          }
        }
        
        // 추적 모드는 OFF 상태로 유지
        console.log('[SatelliteSettings] 위성 엔티티 생성 완료. 카메라가 한 번 엔티티를 바라본 후 추적 모드는 OFF 상태입니다.');
      }, 300); // 엔티티 생성 완료 대기 시간

      console.log('[SatelliteSettings] 위성 엔티티 생성 완료 (우주 공간)');
      alert('위성 엔티티가 우주 공간에 생성되었습니다. "지구로 이동" 버튼을 눌러 지구로 이동시킬 수 있습니다.');
    } catch (error) {
      console.error('[SatelliteSettings] 위성 엔티티 생성 오류:', error);
      alert('위성 엔티티 생성 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  }

  /**
   * 위성 엔티티 제거
   */
  private removeSatelliteEntity(): void {
    if (!this.busPayloadManager) {
      alert('Cesium 뷰어가 초기화되지 않았습니다.');
      return;
    }

    // 카메라 추적 해제
    this.stopCameraTracking();
    console.log('[SatelliteSettings] 카메라 추적 해제 완료');

    this.busPayloadManager.removeSatellite();
    console.log('[SatelliteSettings] 위성 엔티티 제거 완료');
  }

  /**
   * 지구로 이동
   */
  private moveSatelliteToEarth(): void {
    if (!this.busPayloadManager || !this.viewer) {
      alert('Cesium 뷰어가 초기화되지 않았습니다.');
      return;
    }

    // 입력된 위치 정보 가져오기
    const longitude = parseFloat((document.getElementById('prototypeSatelliteLongitude') as HTMLInputElement)?.value || '0');
    const latitude = parseFloat((document.getElementById('prototypeSatelliteLatitude') as HTMLInputElement)?.value || '0');
    const altitude = parseFloat((document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value || '700000');

    // 입력값 검증
    if (longitude < -180 || longitude > 180) {
      alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
      return;
    }
    if (altitude < 0) {
      alert('고도는 0 이상이어야 합니다.');
      return;
    }

    try {
      // 위성 위치 업데이트
      this.busPayloadManager.updatePosition({ longitude, latitude, altitude });

      // BUS 엔티티 위치 업데이트 완료
      // 카메라 추적이 활성화되어 있으면 자동으로 업데이트됨
      console.log('[SatelliteSettings] 위성을 지구로 이동 완료');

      console.log('[SatelliteSettings] 위성을 지구로 이동 완료');
      alert('위성이 지구로 이동되었습니다.');
    } catch (error) {
      console.error('[SatelliteSettings] 지구로 이동 오류:', error);
      alert('지구로 이동 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  }

  /**
   * XYZ 축 표시/숨김 설정
   */
  private setAxisVisible(visible: boolean): void {
    if (!this.busPayloadManager) {
      return;
    }

    this.busPayloadManager.setAxisVisible(visible);
    console.log(`[SatelliteSettings] XYZ 축 표시: ${visible ? 'ON' : 'OFF'}`);
  }

  /**
   * 카메라 추적 토글
   */
  private toggleCameraTracking(): void {
    const busEntity = this.busPayloadManager?.getBusEntity();
    if (!busEntity) {
      alert('위성 엔티티가 생성되지 않았습니다. 먼저 위성 엔티티를 생성하세요.');
      return;
    }

    if (this.isCameraTracking) {
      this.stopCameraTracking();
    } else {
      this.startCameraTracking(busEntity);
    }
  }

  /**
   * 카메라 추적 시작 (대각선 뷰 유지)
   */
  private startCameraTracking(busEntity: any): void {
    // 기존 추적 중지
    this.stopCameraTracking();

    this.isCameraTracking = true;

    // 버튼 상태 업데이트
    if (this.cameraTrackingButton) {
      this.cameraTrackingButton.textContent = '카메라 추적 ON';
      this.cameraTrackingButton.style.backgroundColor = '#4CAF50';
    }

    // 사용자가 카메라를 조작하면 추적 자동 해제
    this.setupCameraMoveHandler();

    // trackedEntity를 사용하지 않고 주기적으로 lookAt 호출
    const updateCamera = () => {
      if (!busEntity || !this.viewer || !this.isCameraTracking) {
        return;
      }

      const busPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
      if (busPosition) {
        // BUS 크기 정보로 적절한 거리 계산 (mm를 미터로 변환)
        const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
        const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
        const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');
        const maxBusSize = Math.max(busLengthMm, busWidthMm, busHeightMm) / 1000;
        
        // 대각선에서 바라보는 각도 설정
        const cameraRange = Math.max(maxBusSize * 3, 20);
        
        this.viewer.camera.lookAt(
          busPosition,
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(45), // heading: 대각선 방향
            Cesium.Math.toRadians(0), // pitch: 수평선에 가까운 대각선 뷰
            cameraRange // range: 거리
          )
        );
      }
    };

    // 즉시 한 번 실행
    updateCamera();
    
    // 주기적으로 카메라 업데이트 (100ms마다)
    this.cameraTrackingInterval = window.setInterval(updateCamera, 100);
  }

  /**
   * 카메라 이동 감지 핸들러 설정
   * 사용자가 카메라를 조작하면 추적을 자동으로 해제
   */
  private setupCameraMoveHandler(): void {
    if (!this.viewer || this.cameraMoveHandler) {
      return;
    }

    let isUserInteracting = false;
    let interactionTimeout: number | null = null;

    // 마우스 이벤트로 사용자 상호작용 감지
    const onMouseDown = () => {
      isUserInteracting = true;
    };

    const onMouseUp = () => {
      isUserInteracting = false;
      // 마우스를 놓은 후 잠시 대기 (드래그 완료 대기)
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
      interactionTimeout = window.setTimeout(() => {
        if (!isUserInteracting && this.isCameraTracking) {
          // 사용자가 카메라를 조작했으므로 추적 해제
          this.stopCameraTracking();
          console.log('[SatelliteSettings] 사용자가 카메라를 조작하여 추적이 자동으로 해제되었습니다.');
        }
      }, 100);
    };

    const onWheel = () => {
      if (this.isCameraTracking) {
        this.stopCameraTracking();
        console.log('[SatelliteSettings] 사용자가 카메라를 조작하여 추적이 자동으로 해제되었습니다.');
      }
    };

    this.viewer.canvas.addEventListener('mousedown', onMouseDown);
    this.viewer.canvas.addEventListener('mouseup', onMouseUp);
    this.viewer.canvas.addEventListener('wheel', onWheel);

    this.cameraMoveHandler = {
      onMouseDown,
      onMouseUp,
      onWheel,
      cleanup: () => {
        this.viewer.canvas.removeEventListener('mousedown', onMouseDown);
        this.viewer.canvas.removeEventListener('mouseup', onMouseUp);
        this.viewer.canvas.removeEventListener('wheel', onWheel);
        if (interactionTimeout) {
          clearTimeout(interactionTimeout);
        }
      }
    };
  }

  /**
   * 카메라 추적 중지
   */
  private stopCameraTracking(): void {
    this.isCameraTracking = false;
    if (this.cameraTrackingInterval !== null) {
      clearInterval(this.cameraTrackingInterval);
      this.cameraTrackingInterval = null;
    }
    if (this.viewer) {
      this.viewer.trackedEntity = undefined;
    }

    // 버튼 상태 업데이트
    if (this.cameraTrackingButton) {
      this.cameraTrackingButton.textContent = '카메라 추적 OFF';
      this.cameraTrackingButton.style.backgroundColor = '#666';
    }

    // 카메라 이동 핸들러 정리
    if (this.cameraMoveHandler) {
      this.cameraMoveHandler.cleanup();
      this.cameraMoveHandler = null;
    }
  }

  /**
   * Cleanup satellite settings
   */
  cleanup(): void {
    // 카메라 추적 해제
    this.stopCameraTracking();

    if (this.busPayloadManager) {
      this.busPayloadManager.removeSatellite();
      this.busPayloadManager = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
    this.viewer = null;
    this.cameraTrackingButton = null;
  }
}
