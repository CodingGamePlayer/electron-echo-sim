/**
 * 폼 UI 생성 유틸리티
 */

/**
 * 섹션 생성
 */
export function createSection(title: string): HTMLElement {
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
export function createInputField(
  labelText: string,
  id: string,
  type: string,
  placeholder: string,
  defaultValue?: string,
  onFocus?: (id: string) => void,
  onBlur?: (id: string) => void,
  onInput?: () => void
): HTMLElement {
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
    
    // 포커스 이벤트 로깅 및 방향 화살표 표시
    input.addEventListener('focus', () => {
      logInputState('FOCUS');
      if (onFocus) {
        onFocus(id);
      }
    });
    
    input.addEventListener('blur', () => {
      logInputState('BLUR', { valueBefore: input.value });
      if (onBlur) {
        onBlur(id);
      }
    });
    
    // 다른 입력 필드로 포커스 이동 시에도 화살표 유지
    input.addEventListener('focusin', (e) => {
      logInputState('FOCUSIN', {
        relatedTarget: e.relatedTarget,
        target: e.target === input
      });
      // 다른 입력 필드로 포커스 이동 시에도 화살표 표시
      if (e.target === input && onFocus) {
        onFocus(id);
      }
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
    
    // focusout 이벤트는 이미 blur에서 처리하므로 여기서는 로깅만
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
      if (onInput) {
        onInput();
      }
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
    
    // 포커스 아웃 시에만 값 정리
    input.addEventListener('blur', () => {
      logInputState('BLUR_START', { valueBefore: input.value });
      
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
      if (onInput) {
        onInput();
      }
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
