/**
 * OrbitSettings - Orbit settings tab management class
 */
export class OrbitSettings {
  private container: HTMLElement | null;

  constructor() {
    this.container = null;
  }

  /**
   * Initialize orbit settings tab
   */
  initialize(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  /**
   * Render orbit settings UI
   */
  private render(): void {
    if (!this.container) return;

    const section = document.createElement('div');
    section.className = 'sidebar-section';

    const title = document.createElement('h3');
    title.textContent = '궤도 설정';
    section.appendChild(title);

    const description = document.createElement('p');
    description.style.color = '#aaa';
    description.style.fontSize = '12px';
    description.style.marginTop = '10px';
    description.textContent = '궤도 관련 설정을 관리합니다.';
    section.appendChild(description);

    // Orbit settings form
    const form = document.createElement('div');
    form.style.marginTop = '15px';

    // Orbit altitude input
    const altitudeLabel = document.createElement('label');
    altitudeLabel.textContent = '궤도 높이 (km):';
    const altitudeInput = document.createElement('input');
    altitudeInput.type = 'number';
    altitudeInput.id = 'prototypeOrbitAltitude';
    altitudeInput.value = '500';
    altitudeInput.min = '200';
    altitudeInput.max = '2000';
    altitudeInput.step = '10';
    altitudeInput.style.width = '100%';
    altitudeInput.style.marginTop = '4px';
    altitudeLabel.appendChild(altitudeInput);
    form.appendChild(altitudeLabel);

    // Orbit inclination input
    const inclinationLabel = document.createElement('label');
    inclinationLabel.style.marginTop = '10px';
    inclinationLabel.style.display = 'block';
    inclinationLabel.textContent = '궤도 경사각 (deg):';
    const inclinationInput = document.createElement('input');
    inclinationInput.type = 'number';
    inclinationInput.id = 'prototypeOrbitInclination';
    inclinationInput.value = '98.0';
    inclinationInput.min = '0';
    inclinationInput.max = '180';
    inclinationInput.step = '0.1';
    inclinationInput.style.width = '100%';
    inclinationInput.style.marginTop = '4px';
    inclinationLabel.appendChild(inclinationInput);
    form.appendChild(inclinationLabel);

    // Orbit eccentricity input
    const eccentricityLabel = document.createElement('label');
    eccentricityLabel.style.marginTop = '10px';
    eccentricityLabel.style.display = 'block';
    eccentricityLabel.textContent = '궤도 이심률:';
    const eccentricityInput = document.createElement('input');
    eccentricityInput.type = 'number';
    eccentricityInput.id = 'prototypeOrbitEccentricity';
    eccentricityInput.value = '0.0';
    eccentricityInput.min = '0';
    eccentricityInput.max = '1';
    eccentricityInput.step = '0.001';
    eccentricityInput.style.width = '100%';
    eccentricityInput.style.marginTop = '4px';
    eccentricityLabel.appendChild(eccentricityInput);
    form.appendChild(eccentricityLabel);

    section.appendChild(form);
    this.container.appendChild(section);
  }

  /**
   * Cleanup orbit settings
   */
  cleanup(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}