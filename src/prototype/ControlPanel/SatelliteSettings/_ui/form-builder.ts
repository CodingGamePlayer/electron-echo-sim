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
  
  // 입력 필드 타입 설정
  input.type = type;
  
  // number 타입인 경우 추가 설정
  if (type === 'number') {
    input.inputMode = 'decimal'; // 모바일에서 숫자 키패드 표시
    input.step = 'any'; // 소수점 입력 허용
    
    // 포커스 이벤트 및 방향 화살표 표시
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
    
    // 키보드 이벤트 - Cesium이 키보드 이벤트를 가로채지 않도록 함
    input.addEventListener('keydown', (e) => {
      // 입력 필드에 포커스가 있을 때는 키보드 이벤트를 입력 필드가 처리하도록 함
      if (document.activeElement === input) {
        // 이벤트가 Cesium으로 전파되지 않도록 함
        e.stopPropagation();
      }
    }, { capture: true, passive: false });
    
    // 입력 필드 변경 시 엔티티 업데이트
    input.addEventListener('input', () => {
      logInputState('INPUT', { value: input.value });
      if (onInput) {
        onInput();
      }
    });
  } else {
    
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
