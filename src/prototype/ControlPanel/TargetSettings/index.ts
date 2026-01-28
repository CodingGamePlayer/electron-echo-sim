/**
 * TargetSettings - Target settings tab management class
 */
export class TargetSettings {
  private container: HTMLElement | null;

  constructor() {
    this.container = null;
  }

  /**
   * Initialize target settings tab
   */
  initialize(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  /**
   * Render target settings UI
   */
  private render(): void {
    if (!this.container) return;

    const section = document.createElement('div');
    section.className = 'sidebar-section';

    const title = document.createElement('h3');
    title.textContent = '타겟 설정';
    section.appendChild(title);

    const description = document.createElement('p');
    description.style.color = '#aaa';
    description.style.fontSize = '12px';
    description.style.marginTop = '10px';
    description.textContent = '타겟 관련 설정을 관리합니다.';
    section.appendChild(description);

    // Target settings form
    const form = document.createElement('div');
    form.style.marginTop = '15px';

    // Target name input
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '타겟 이름:';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'prototypeTargetName';
    nameInput.placeholder = '타겟 이름을 입력하세요';
    nameInput.style.width = '100%';
    nameInput.style.marginTop = '4px';
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);

    // Target longitude input
    const longitudeLabel = document.createElement('label');
    longitudeLabel.style.marginTop = '10px';
    longitudeLabel.style.display = 'block';
    longitudeLabel.textContent = '경도 (deg):';
    const longitudeInput = document.createElement('input');
    longitudeInput.type = 'number';
    longitudeInput.id = 'prototypeTargetLongitude';
    longitudeInput.value = '128.0';
    longitudeInput.min = '-180';
    longitudeInput.max = '180';
    longitudeInput.step = '0.0001';
    longitudeInput.style.width = '100%';
    longitudeInput.style.marginTop = '4px';
    longitudeLabel.appendChild(longitudeInput);
    form.appendChild(longitudeLabel);

    // Target latitude input
    const latitudeLabel = document.createElement('label');
    latitudeLabel.style.marginTop = '10px';
    latitudeLabel.style.display = 'block';
    latitudeLabel.textContent = '위도 (deg):';
    const latitudeInput = document.createElement('input');
    latitudeInput.type = 'number';
    latitudeInput.id = 'prototypeTargetLatitude';
    latitudeInput.value = '37.0';
    latitudeInput.min = '-90';
    latitudeInput.max = '90';
    latitudeInput.step = '0.0001';
    latitudeInput.style.width = '100%';
    latitudeInput.style.marginTop = '4px';
    latitudeLabel.appendChild(latitudeInput);
    form.appendChild(latitudeLabel);

    // Target altitude input
    const altitudeLabel = document.createElement('label');
    altitudeLabel.style.marginTop = '10px';
    altitudeLabel.style.display = 'block';
    altitudeLabel.textContent = '고도 (m):';
    const altitudeInput = document.createElement('input');
    altitudeInput.type = 'number';
    altitudeInput.id = 'prototypeTargetAltitude';
    altitudeInput.value = '0';
    altitudeInput.min = '0';
    altitudeInput.step = '1';
    altitudeInput.style.width = '100%';
    altitudeInput.style.marginTop = '4px';
    altitudeLabel.appendChild(altitudeInput);
    form.appendChild(altitudeLabel);

    section.appendChild(form);
    this.container.appendChild(section);
  }

  /**
   * Cleanup target settings
   */
  cleanup(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}