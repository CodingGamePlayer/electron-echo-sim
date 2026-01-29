import { SatelliteBusPayloadManager } from './SatelliteBusPayloadManager.js';

/**
 * SatelliteSettings - Satellite settings tab management class
 */
export class SatelliteSettings {
  private container: HTMLElement | null;
  private viewer: any;
  private busPayloadManager: SatelliteBusPayloadManager | null;

  constructor() {
    this.container = null;
    this.viewer = null;
    this.busPayloadManager = null;
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
    
    const busLengthInput = this.createInputField('BUS 길이 (미터):', 'prototypeBusLength', 'number', '예: 5.0', '5.0');
    busSection.appendChild(busLengthInput);

    const busWidthInput = this.createInputField('BUS 너비 (미터):', 'prototypeBusWidth', 'number', '예: 2.0', '2.0');
    busSection.appendChild(busWidthInput);

    const busHeightInput = this.createInputField('BUS 높이 (미터):', 'prototypeBusHeight', 'number', '예: 2.0', '2.0');
    busSection.appendChild(busHeightInput);

    form.appendChild(busSection);

    // 안테나 크기 설정 섹션
    const antennaSizeSection = this.createSection('안테나 크기 설정');
    
    const antennaHeightInput = this.createInputField('안테나 높이 (미터):', 'prototypeAntennaHeight', 'number', '예: 3.0', '3.0');
    antennaSizeSection.appendChild(antennaHeightInput);

    const antennaWidthInput = this.createInputField('안테나 너비 (미터):', 'prototypeAntennaWidth', 'number', '예: 5.0', '5.0');
    antennaSizeSection.appendChild(antennaWidthInput);

    const antennaDepthInput = this.createInputField('안테나 두께 (미터):', 'prototypeAntennaDepth', 'number', '예: 0.1', '0.1');
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

    label.appendChild(input);
    return label;
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

    const busLength = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '5');
    const busWidth = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '2');
    const busHeight = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '2');

    const antennaHeight = parseFloat((document.getElementById('prototypeAntennaHeight') as HTMLInputElement)?.value || '3');
    const antennaWidth = parseFloat((document.getElementById('prototypeAntennaWidth') as HTMLInputElement)?.value || '5');
    const antennaDepth = parseFloat((document.getElementById('prototypeAntennaDepth') as HTMLInputElement)?.value || '0.1');

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

      // 엔티티 생성 후 약간의 지연을 두고 카메라 이동
      setTimeout(() => {
        // 위성 위치
        const satellitePosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, spaceAltitude);
        
        // 모델의 최대 크기 계산
        const maxModelSize = Math.max(busLength, busWidth, busHeight, antennaHeight, antennaWidth);
        
        // 카메라를 위성에서 적절한 거리에 배치
        // 모델 크기의 5배 거리로 설정
        const offsetDistance = Math.max(maxModelSize * 5, 50); // 최소 50미터
        
        // 위성의 동쪽 방향으로 오프셋 계산
        const cartographic = Cesium.Cartographic.fromCartesian(satellitePosition);
        
        // 로컬 좌표계 계산 (동쪽, 북쪽, 위쪽)
        const east = new Cesium.Cartesian3(-Math.sin(cartographic.longitude), Math.cos(cartographic.longitude), 0);
        const up = Cesium.Cartesian3.normalize(satellitePosition, new Cesium.Cartesian3());
        
        // 카메라 위치 계산 (동쪽으로 offsetDistance만큼 이동, 약간 위쪽)
        const cameraOffset = Cesium.Cartesian3.add(
          Cesium.Cartesian3.multiplyByScalar(east, offsetDistance, new Cesium.Cartesian3()),
          Cesium.Cartesian3.multiplyByScalar(up, offsetDistance * 0.3, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
        const cameraPosition = Cesium.Cartesian3.add(satellitePosition, cameraOffset, new Cesium.Cartesian3());

        // lookAt을 사용하여 위성을 화면 중앙에 정확히 배치 (즉시 이동)
        // lookAt은 target(위성 위치)과 offset(카메라 오프셋)을 사용
        this.viewer.camera.lookAt(
          satellitePosition,
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(0), // heading: 동쪽 방향
            Cesium.Math.toRadians(-0.3), // pitch: 약간 아래를 보도록
            offsetDistance // range: 거리
          )
        );

        // 엔티티 확인
        setTimeout(() => {
          const busEntity = this.busPayloadManager?.getBusEntity();
          const antennaEntity = this.busPayloadManager?.getAntennaEntity();
          
          console.log('[SatelliteSettings] 엔티티 확인:', {
            busEntity: !!busEntity,
            antennaEntity: !!antennaEntity,
            busEntityId: busEntity?.id,
            antennaEntityId: antennaEntity?.id,
            cameraPosition: this.viewer.camera.position,
            satellitePosition: satellitePosition,
            distance: Cesium.Cartesian3.distance(this.viewer.camera.position, satellitePosition),
            maxModelSize: maxModelSize
          });
          
          // 엔티티가 생성되었는지 확인
          if (!busEntity && !antennaEntity) {
            console.error('[SatelliteSettings] 엔티티가 생성되지 않았습니다!');
            alert('엔티티 생성에 실패했습니다. 콘솔을 확인하세요.');
            return;
          }
        }, 100); // 엔티티 생성 확인 대기
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

      // 카메라를 지구 위성 위치로 이동
      const satellitePosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
      
      // BUS 크기 정보 가져오기 (기본값 사용)
      const busLength = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '5');
      const busWidth = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '2');
      const busHeight = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '2');
      const antennaHeight = parseFloat((document.getElementById('prototypeAntennaHeight') as HTMLInputElement)?.value || '3');
      const antennaWidth = parseFloat((document.getElementById('prototypeAntennaWidth') as HTMLInputElement)?.value || '5');
      
      // 모델의 최대 크기 계산
      const maxModelSize = Math.max(busLength, busWidth, busHeight, antennaHeight, antennaWidth);
      
      // 위성에서 매우 가까운 거리에 카메라 배치
      const offsetDistance = Math.max(maxModelSize * 2.5, 20); // 최소 20미터, 모델 크기의 2.5배
      const cartographic = Cesium.Cartographic.fromCartesian(satellitePosition);
      const cameraPosition = Cesium.Cartesian3.fromRadians(
        cartographic.longitude + Cesium.Math.toRadians(0.001),
        cartographic.latitude,
        cartographic.height + offsetDistance
      );

      // 즉시 카메라 이동 (애니메이션 없음)
      this.viewer.camera.lookAt(
        satellitePosition,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(0), // heading: 동쪽 방향
          Cesium.Math.toRadians(-0.3), // pitch: 약간 아래를 보도록
          offsetDistance // range: 거리
        )
      );

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
   * Cleanup satellite settings
   */
  cleanup(): void {
    if (this.busPayloadManager) {
      this.busPayloadManager.removeSatellite();
      this.busPayloadManager = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
    this.viewer = null;
  }
}
