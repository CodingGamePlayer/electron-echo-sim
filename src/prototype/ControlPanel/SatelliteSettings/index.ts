import { SatelliteBusPayloadManager } from './SatelliteBusPayloadManager.js';

/**
 * SatelliteSettings - Satellite settings tab management class
 */
export class SatelliteSettings {
  private container: HTMLElement | null;
  private viewer: any;
  private busPayloadManager: SatelliteBusPayloadManager | null;
  private updateDebounceTimer: number | null;

  constructor() {
    this.container = null;
    this.viewer = null;
    this.busPayloadManager = null;
    this.updateDebounceTimer = null;
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

    const altInput = this.createInputField('고도 (km):', 'prototypeSatelliteAltitude', 'number', '0 이상', '591');
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

    // 버스-안테나 간격 설정 섹션
    const gapSection = this.createSection('버스-안테나 간격 설정');
    
    const antennaGapInput = this.createInputField('버스-안테나 간격 (mm):', 'prototypeAntennaGap', 'number', '예: 1', '1');
    gapSection.appendChild(antennaGapInput);

    form.appendChild(gapSection);

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
    
    // 입력 필드 상태 로깅 헬퍼 함수
    const logInputState = (event: string, details?: any) => {
      const computedStyle = window.getComputedStyle(input);
      const rect = input.getBoundingClientRect();
      const parent = input.parentElement;
      
      console.log(`[InputDebug:${id}] ${event}`, {
        // 기본 상태
        disabled: input.disabled,
        readOnly: input.readOnly,
        value: input.value,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd,
        isContentEditable: input.isContentEditable,
        
        // CSS 상태
        pointerEvents: computedStyle.pointerEvents,
        userSelect: computedStyle.userSelect,
        zIndex: computedStyle.zIndex,
        position: computedStyle.position,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        
        // 위치 및 크기
        boundingRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        
        // 부모 요소 상태
        parentElement: parent ? {
          tagName: parent.tagName,
          id: parent.id,
          className: parent.className,
          pointerEvents: window.getComputedStyle(parent).pointerEvents,
          zIndex: window.getComputedStyle(parent).zIndex
        } : null,
        
        // 추가 정보
        ...details
      });
    };
    
    // 숫자 입력 필드는 텍스트로 변경하여 더 편하게 입력 가능하도록 함
    if (type === 'number') {
      input.type = 'text';
      input.inputMode = 'decimal'; // 모바일에서 숫자 키패드 표시
      
      // 포커스 이벤트 로깅
      input.addEventListener('focus', () => {
        logInputState('FOCUS');
      });
      
      input.addEventListener('blur', () => {
        logInputState('BLUR', { valueBefore: input.value });
      });
      
      // 마우스 이벤트 로깅
      input.addEventListener('mousedown', (e) => {
        logInputState('MOUSEDOWN', {
          button: e.button,
          buttons: e.buttons,
          defaultPrevented: e.defaultPrevented,
          target: e.target === input
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] MOUSEDOWN이 preventDefault되었습니다!`, e);
        }
      });
      
      input.addEventListener('click', (e) => {
        logInputState('CLICK', {
          button: e.button,
          defaultPrevented: e.defaultPrevented,
          target: e.target === input
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] CLICK이 preventDefault되었습니다!`, e);
        }
      });
      
      // 포커스 가능 여부 확인
      input.addEventListener('focusin', (e) => {
        logInputState('FOCUSIN', {
          relatedTarget: e.relatedTarget,
          target: e.target === input
        });
      });
      
      input.addEventListener('focusout', (e) => {
        logInputState('FOCUSOUT', {
          relatedTarget: e.relatedTarget,
          target: e.target === input
        });
      });
      
      // 키보드 이벤트 로깅 - capture 단계에서 확인
      input.addEventListener('keydown', (e) => {
        const valueBefore = input.value;
        const selectionStartBefore = input.selectionStart;
        const selectionEndBefore = input.selectionEnd;
        
        logInputState('KEYDOWN', { 
          key: e.key, 
          code: e.code,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          defaultPrevented: e.defaultPrevented,
          isTrusted: e.isTrusted,
          target: e.target === input,
          currentTarget: e.currentTarget === input,
          cancelable: e.cancelable,
          valueBefore: valueBefore,
          selectionBefore: { start: selectionStartBefore, end: selectionEndBefore }
        });
        
        // 실제로 입력이 막히는지 확인
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] KEYDOWN이 preventDefault되었습니다!`, e);
        }
        
        // 특정 키가 입력을 막는지 확인
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // 일반 문자 입력인 경우, 입력 필드에 포커스가 있으면 Cesium이 키보드 이벤트를 처리하지 않도록 함
          // 입력 필드에 포커스가 있을 때는 키보드 이벤트를 입력 필드가 처리하도록 함
          if (document.activeElement === input) {
            // 이벤트가 Cesium으로 전파되지 않도록 함
            e.stopPropagation();
          }
          
          const key = e.key;
          const start = selectionStartBefore || 0;
          const end = selectionEndBefore || 0;
          
          // 값이 변경되지 않았다면 수동으로 시도
          setTimeout(() => {
            const valueAfter = input.value;
            const selectionStartAfter = input.selectionStart;
            const selectionEndAfter = input.selectionEnd;
            
            console.log(`[InputDebug:${id}] KEYDOWN 후 값 확인:`, {
              key: key,
              valueBefore: valueBefore,
              valueAfter: valueAfter,
              changed: valueAfter !== valueBefore,
              selectionBefore: { start: selectionStartBefore, end: selectionEndBefore },
              selectionAfter: { start: selectionStartAfter, end: selectionEndAfter }
            });
            
            // 값이 변경되지 않았다면 문제가 있는 것
            if (valueAfter === valueBefore && key.length === 1) {
              console.error(`[InputDebug:${id}] ⚠️ 입력이 처리되지 않았습니다! 수동으로 처리합니다.`, {
                key: key,
                code: e.code,
                inputType: input.type,
                disabled: input.disabled,
                readOnly: input.readOnly,
                isContentEditable: input.isContentEditable,
                computedStyle: {
                  pointerEvents: window.getComputedStyle(input).pointerEvents,
                  userSelect: window.getComputedStyle(input).userSelect
                }
              });
              
              // 수동으로 값 변경 시도 (Cesium이 키보드 이벤트를 가로채는 경우 대비)
              try {
                const newValue = valueBefore.substring(0, start) + key + valueBefore.substring(end);
                input.value = newValue;
                input.setSelectionRange(start + 1, start + 1);
                console.log(`[InputDebug:${id}] 수동으로 값 변경 완료:`, {
                  before: valueBefore,
                  after: input.value,
                  success: input.value !== valueBefore
                });
                
                // 수동 변경 후 INPUT 이벤트 강제 발생
                const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                input.dispatchEvent(inputEvent);
                
                // change 이벤트도 발생
                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                input.dispatchEvent(changeEvent);
              } catch (err) {
                console.error(`[InputDebug:${id}] 수동 값 변경 실패:`, err);
              }
            }
          }, 50); // 더 긴 대기 시간
        }
      }, { capture: true, passive: false });
      
      input.addEventListener('keypress', (e) => {
        logInputState('KEYPRESS', {
          key: e.key,
          charCode: e.charCode,
          keyCode: e.keyCode,
          defaultPrevented: e.defaultPrevented,
          cancelable: e.cancelable
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] KEYPRESS가 preventDefault되었습니다!`, e);
        }
      }, { capture: true });
      
      input.addEventListener('keyup', (e) => {
        logInputState('KEYUP', { 
          key: e.key,
          defaultPrevented: e.defaultPrevented
        });
      });
      
      // beforeinput 이벤트도 확인 (입력 전 상태) - 가장 먼저 확인
      input.addEventListener('beforeinput', (e) => {
        const inputEvent = e as any;
        logInputState('BEFOREINPUT', {
          inputType: inputEvent.inputType || 'unknown',
          data: inputEvent.data || null,
          isComposing: inputEvent.isComposing || false,
          cancelable: e.cancelable,
          defaultPrevented: e.defaultPrevented,
          valueBefore: input.value
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] BEFOREINPUT이 preventDefault되었습니다!`, e);
        }
      }, { capture: true, passive: false });
      
      // 입력 중에는 값을 변경하지 않고 업데이트만 호출 (입력 방해 최소화)
      input.addEventListener('input', (e) => {
        const inputEvent = e as any;
        const beforeValue = (e.target as HTMLInputElement).value;
        logInputState('INPUT', { 
          value: beforeValue,
          inputType: inputEvent.inputType || 'unknown',
          data: inputEvent.data || null,
          isComposing: inputEvent.isComposing || false
        });
        // 입력 중에는 값을 변경하지 않음 - 완전히 자유롭게 입력 가능
        this.updateEntityFromInputs();
      }, { capture: true });
      
      // change 이벤트도 확인
      input.addEventListener('change', (e) => {
        logInputState('CHANGE', {
          value: input.value
        });
      });
      
      // compositionstart/update/end 이벤트 확인 (IME 입력)
      input.addEventListener('compositionstart', (e) => {
        logInputState('COMPOSITION_START');
      });
      
      input.addEventListener('compositionupdate', (e) => {
        logInputState('COMPOSITION_UPDATE', { data: (e as any).data });
      });
      
      input.addEventListener('compositionend', (e) => {
        logInputState('COMPOSITION_END', { data: (e as any).data });
      });
      
      // 포커스 아웃 시에만 값 정리 및 즉시 업데이트
      input.addEventListener('blur', () => {
        logInputState('BLUR_START', { valueBefore: input.value });
        
        // 디바운스 타이머가 있으면 취소하고 즉시 업데이트
        if (this.updateDebounceTimer !== null) {
          clearTimeout(this.updateDebounceTimer);
          this.updateDebounceTimer = null;
        }
        
        let value = input.value;
        // 숫자, 소수점, 음수 기호만 허용
        value = value.replace(/[^0-9.\-]/g, '');
        
        // 음수 기호는 맨 앞에만 허용
        if (value.includes('-') && value.indexOf('-') !== 0) {
          value = value.replace(/-/g, '');
        }
        
        // 소수점이 여러 개인 경우 첫 번째만 유지
        const parts = value.split('.');
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // 유효하지 않은 값이면 기본값으로 복원
        if (value === '' || value === '-' || value === '.') {
          if (defaultValue !== undefined) {
            value = defaultValue;
          } else {
            value = '';
          }
        }
        
        // 값이 변경된 경우에만 업데이트
        if (input.value !== value) {
          logInputState('VALUE_CHANGED', { 
            before: input.value, 
            after: value 
          });
          input.value = value;
        }
        
        logInputState('BLUR_END', { valueAfter: input.value });
        
        // 포커스를 잃을 때는 즉시 업데이트
        this.performEntityUpdate();
      });
    } else {
      input.type = type;
      
      // 포커스 이벤트 로깅
      input.addEventListener('focus', () => {
        logInputState('FOCUS');
      });
      
      input.addEventListener('blur', () => {
        logInputState('BLUR');
      });
      
      // 마우스 이벤트 로깅
      input.addEventListener('mousedown', (e) => {
        logInputState('MOUSEDOWN', {
          button: e.button,
          buttons: e.buttons,
          defaultPrevented: e.defaultPrevented,
          target: e.target === input
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] MOUSEDOWN이 preventDefault되었습니다!`, e);
        }
      });
      
      input.addEventListener('click', (e) => {
        logInputState('CLICK', {
          button: e.button,
          defaultPrevented: e.defaultPrevented,
          target: e.target === input
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] CLICK이 preventDefault되었습니다!`, e);
        }
      });
      
      // 키보드 이벤트 로깅 (일반 입력 필드도)
      input.addEventListener('keydown', (e) => {
        logInputState('KEYDOWN', {
          key: e.key,
          code: e.code,
          defaultPrevented: e.defaultPrevented
        });
        
        if (e.defaultPrevented) {
          console.warn(`[InputDebug:${id}] KEYDOWN이 preventDefault되었습니다!`, e);
        }
      });
      
      // 입력 필드 변경 시 엔티티 업데이트
      input.addEventListener('input', () => {
        logInputState('INPUT', { value: input.value });
        this.updateEntityFromInputs();
      });
    }
    
    input.id = id;
    input.placeholder = placeholder;
    if (defaultValue !== undefined) {
      input.value = defaultValue;
    }
    
    // 초기 상태 로깅
    console.log(`[InputDebug:${id}] CREATED`, {
      type: input.type,
      defaultValue,
      disabled: input.disabled,
      readOnly: input.readOnly,
      value: input.value
    });
    input.style.width = '100%';
    input.style.marginTop = '4px';
    input.style.padding = '6px';
    input.style.backgroundColor = '#2a2a2a';
    input.style.color = '#fff';
    input.style.border = '1px solid #444';
    input.style.borderRadius = '4px';
    input.style.boxSizing = 'border-box';

    label.appendChild(input);
    return label;
  }

  /**
   * 입력 필드 값으로 엔티티 업데이트 (디바운싱 적용)
   */
  private updateEntityFromInputs(): void {
    // 디바운싱: 입력이 멈춘 후 300ms 후에 업데이트 실행
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
    }
    
    this.updateDebounceTimer = window.setTimeout(() => {
      this.performEntityUpdate();
      this.updateDebounceTimer = null;
    }, 300);
  }

  /**
   * 실제 엔티티 업데이트 수행
   */
  private performEntityUpdate(): void {
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

    // 엔티티 업데이트 시 카메라 이동 방지
    const previousTrackedEntity = this.viewer.trackedEntity;
    this.viewer.trackedEntity = undefined;

    try {
      // 위치 정보 가져오기 및 검증 (km를 미터로 변환)
      const lonInput = (document.getElementById('prototypeSatelliteLongitude') as HTMLInputElement)?.value;
      const latInput = (document.getElementById('prototypeSatelliteLatitude') as HTMLInputElement)?.value;
      const altInput = (document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value;

      if (lonInput && latInput && altInput) {
        const longitude = parseFloat(lonInput);
        const latitude = parseFloat(latInput);
        const altitudeKm = parseFloat(altInput);

        // 입력값 검증 (NaN 체크 포함)
        // 위치 수정 시에도 우주 공간(50,000km)에 생성되도록 고도 고정
        if (!isNaN(longitude) && !isNaN(latitude) && !isNaN(altitudeKm) &&
            longitude >= -180 && longitude <= 180 && 
            latitude >= -90 && latitude <= 90 && 
            altitudeKm >= 0) {
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

      // 버스-안테나 간격 가져오기 및 검증 (mm를 미터로 변환)
      const antennaGapInput = (document.getElementById('prototypeAntennaGap') as HTMLInputElement)?.value;

      if (antennaGapInput !== undefined && antennaGapInput !== '') {
        const antennaGapMm = parseFloat(antennaGapInput);

        if (!isNaN(antennaGapMm) && antennaGapMm >= 0) {
          // mm를 미터로 변환 (Cesium은 미터 단위 사용)
          this.busPayloadManager.updateAntennaGap(antennaGapMm / 1000);
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
      // 이전 trackedEntity 복원
      if (previousTrackedEntity) {
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
    const altitudeKm = parseFloat((document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value || '591');
    // km를 미터로 변환 (Cesium은 미터 단위 사용)
    const altitude = altitudeKm * 1000;

    // 입력값 검증
    if (longitude < -180 || longitude > 180) {
      alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
      return;
    }
    if (altitudeKm < 0) {
      alert('고도는 0 이상이어야 합니다.');
      return;
    }

    const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
    const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
    const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');

    const antennaHeightMm = parseFloat((document.getElementById('prototypeAntennaHeight') as HTMLInputElement)?.value || '800');
    const antennaWidthMm = parseFloat((document.getElementById('prototypeAntennaWidth') as HTMLInputElement)?.value || '2410');
    const antennaDepthMm = parseFloat((document.getElementById('prototypeAntennaDepth') as HTMLInputElement)?.value || '100');
    const antennaGapMm = parseFloat((document.getElementById('prototypeAntennaGap') as HTMLInputElement)?.value || '1');

    // mm를 미터로 변환 (Cesium은 미터 단위 사용)
    const busLength = busLengthMm / 1000;
    const busWidth = busWidthMm / 1000;
    const busHeight = busHeightMm / 1000;

    const antennaHeight = antennaHeightMm / 1000;
    const antennaWidth = antennaWidthMm / 1000;
    const antennaDepth = antennaDepthMm / 1000;
    const antennaGap = antennaGapMm / 1000;

    const antennaRoll = parseFloat((document.getElementById('prototypeAntennaRoll') as HTMLInputElement)?.value || '0');
    const antennaPitch = parseFloat((document.getElementById('prototypeAntennaPitch') as HTMLInputElement)?.value || '0');
    const antennaYaw = parseFloat((document.getElementById('prototypeAntennaYaw') as HTMLInputElement)?.value || '0');
    const antennaElevation = parseFloat((document.getElementById('prototypeAntennaElevation') as HTMLInputElement)?.value || '0');
    const antennaAzimuth = parseFloat((document.getElementById('prototypeAntennaAzimuth') as HTMLInputElement)?.value || '0');

    // 엔티티 생성 (우주 공간에서 생성 - 지구에서 멀리 떨어진 곳)
    try {
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

      // 엔티티 생성 전 입력 필드 상태 로깅
      const allInputsBefore = this.container?.querySelectorAll('input');
      if (allInputsBefore) {
        console.log('[InputDebug] 엔티티 생성 전 입력 필드 상태:', {
          totalInputs: allInputsBefore.length,
          inputs: Array.from(allInputsBefore).map(input => ({
            id: input.id,
            disabled: input.disabled,
            readOnly: input.readOnly,
            value: input.value,
            type: input.type
          }))
        });
      }

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
        },
        antennaGap
      );

      // 엔티티 생성 전 현재 포커스된 입력 필드 저장
      const activeElement = document.activeElement as HTMLElement;
      const wasInputFocused = activeElement && activeElement.tagName === 'INPUT' && 
                              activeElement.id && activeElement.id.startsWith('prototype');
      
      // 엔티티 생성 후 약간의 지연을 두고 카메라를 BUS에 고정
      setTimeout(() => {
        // 모든 입력 필드의 상태 로깅
        const allInputs = this.container?.querySelectorAll('input');
        if (allInputs) {
          console.log('[InputDebug] 엔티티 생성 후 입력 필드 상태:', {
            totalInputs: allInputs.length,
            activeElement: document.activeElement?.id,
            wasInputFocused,
            inputs: Array.from(allInputs).map(input => ({
              id: input.id,
              disabled: input.disabled,
              readOnly: input.readOnly,
              value: input.value,
              type: input.type,
              isFocused: document.activeElement === input
            }))
          });
        }
        
        const busEntity = this.busPayloadManager?.getBusEntity();
        const antennaEntity = this.busPayloadManager?.getAntennaEntity();
        
        // 엔티티가 생성되었는지 확인
        if (!busEntity && !antennaEntity) {
          console.error('[SatelliteSettings] 엔티티가 생성되지 않았습니다!');
          alert('엔티티 생성에 실패했습니다. 콘솔을 확인하세요.');
          return;
        }

        // 카메라 각도 설정 (항상 동일한 각도로 설정)
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
            
            // 카메라를 엔티티 생성 시와 동일한 각도로 설정
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
        
        // Cesium 캔버스가 포커스를 가져가지 않도록 설정
        const cesiumCanvas = this.viewer?.canvas;
        if (cesiumCanvas) {
          cesiumCanvas.setAttribute('tabindex', '-1');
          cesiumCanvas.style.outline = 'none';
        }
        
        // 포커스 복원: 이전에 입력 필드에 포커스가 있었다면 복원
        if (wasInputFocused && activeElement && activeElement.id) {
          // 카메라 조작 후 포커스 복원
          setTimeout(() => {
            const inputToFocus = document.getElementById(activeElement.id) as HTMLInputElement;
            if (inputToFocus && !inputToFocus.disabled && !inputToFocus.readOnly) {
              inputToFocus.focus();
              // 커서를 끝으로 이동
              inputToFocus.setSelectionRange(inputToFocus.value.length, inputToFocus.value.length);
              console.log(`[InputDebug] 카메라 조작 후 포커스 복원: ${activeElement.id}`);
            }
          }, 100);
        }
      }, 300); // 엔티티 생성 완료 대기 시간

      // alert는 비동기로 처리하여 포커스에 영향을 최소화
      setTimeout(() => {
        alert('위성 엔티티가 생성되었습니다.');
        
        // alert 후에도 포커스 복원 시도
        if (wasInputFocused && activeElement && activeElement.id) {
          setTimeout(() => {
            const inputToFocus = document.getElementById(activeElement.id) as HTMLInputElement;
            if (inputToFocus && !inputToFocus.disabled && !inputToFocus.readOnly) {
              inputToFocus.focus();
              inputToFocus.setSelectionRange(inputToFocus.value.length, inputToFocus.value.length);
              console.log(`[InputDebug] alert 후 포커스 복원: ${activeElement.id}`);
            }
          }, 50);
        }
      }, 50);
    } catch (error) {
      console.error('[SatelliteSettings] 위성 엔티티 생성 오류:', error);
      alert('위성 엔티티 생성 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  }


  /**
   * 지구로 이동
   */
  private moveSatelliteToEarth(): void {
    if (!this.busPayloadManager || !this.viewer) {
      alert('Cesium 뷰어가 초기화되지 않았습니다.');
      return;
    }

    // 입력된 위치 정보 가져오기 (km를 미터로 변환)
    const longitude = parseFloat((document.getElementById('prototypeSatelliteLongitude') as HTMLInputElement)?.value || '0');
    const latitude = parseFloat((document.getElementById('prototypeSatelliteLatitude') as HTMLInputElement)?.value || '0');
    const altitudeKm = parseFloat((document.getElementById('prototypeSatelliteAltitude') as HTMLInputElement)?.value || '591');
    // km를 미터로 변환 (Cesium은 미터 단위 사용)
    const altitude = altitudeKm * 1000;

    // 입력값 검증
    if (longitude < -180 || longitude > 180) {
      alert('경도는 -180 ~ 180 사이의 값이어야 합니다.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      alert('위도는 -90 ~ 90 사이의 값이어야 합니다.');
      return;
    }
    if (altitudeKm < 0) {
      alert('고도는 0 이상이어야 합니다.');
      return;
    }

    try {
      // 위성 위치 업데이트
      this.busPayloadManager.updatePosition({ longitude, latitude, altitude });

      // 지구로 이동 시 항상 카메라를 엔티티에 고정하고 엔티티 생성 시와 동일한 각도로 설정
      const busEntity = this.busPayloadManager.getBusEntity();
      if (busEntity) {
        // 기존 trackedEntity 해제 (충돌 방지)
        this.viewer.trackedEntity = undefined;
        
        // 엔티티 생성 시와 동일한 카메라 각도 설정
        setTimeout(() => {
          const busPosition = busEntity.position?.getValue(Cesium.JulianDate.now());
          if (busPosition) {
            // BUS 크기 정보로 적절한 거리 계산 (mm를 미터로 변환)
            const busLengthMm = parseFloat((document.getElementById('prototypeBusLength') as HTMLInputElement)?.value || '800');
            const busWidthMm = parseFloat((document.getElementById('prototypeBusWidth') as HTMLInputElement)?.value || '700');
            const busHeightMm = parseFloat((document.getElementById('prototypeBusHeight') as HTMLInputElement)?.value || '840');
            const maxBusSize = Math.max(busLengthMm, busWidthMm, busHeightMm) / 1000;
            
            // 대각선에서 바라보는 각도 설정 (엔티티 생성 시와 동일)
            const cameraRange = Math.max(maxBusSize * 3, 20);
            
            // 카메라를 엔티티 생성 시와 동일한 각도로 설정
            this.viewer.camera.lookAt(
              busPosition,
              new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(45), // heading: 대각선 방향
                Cesium.Math.toRadians(0), // pitch: 수평선에 가까운 대각선 뷰
                cameraRange // range: 거리
              )
            );
            
          }
        }, 100);
      }

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
    // 디바운스 타이머 정리
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }
    
    // 카메라 고정 해제
    if (this.viewer) {
      this.viewer.trackedEntity = undefined;
    }

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
