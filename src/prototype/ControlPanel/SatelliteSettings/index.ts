/**
 * SatelliteSettings - Satellite settings tab management class
 */
export class SatelliteSettings {
  private container: HTMLElement | null;

  constructor() {
    this.container = null;
  }

  /**
   * Initialize satellite settings tab
   */
  initialize(container: HTMLElement): void {
    this.container = container;
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
    description.textContent = '위성 관련 설정을 관리합니다.';
    section.appendChild(description);

    // Satellite settings form
    const form = document.createElement('div');
    form.style.marginTop = '15px';

    // Satellite name input
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '위성 이름:';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'prototypeSatelliteName';
    nameInput.placeholder = '위성 이름을 입력하세요';
    nameInput.style.width = '100%';
    nameInput.style.marginTop = '4px';
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);

    // Satellite ID input
    const idLabel = document.createElement('label');
    idLabel.style.marginTop = '10px';
    idLabel.style.display = 'block';
    idLabel.textContent = '위성 ID:';
    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.id = 'prototypeSatelliteId';
    idInput.placeholder = '위성 ID를 입력하세요';
    idInput.style.width = '100%';
    idInput.style.marginTop = '4px';
    idLabel.appendChild(idInput);
    form.appendChild(idLabel);

    section.appendChild(form);
    this.container.appendChild(section);
  }

  /**
   * Cleanup satellite settings
   */
  cleanup(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}