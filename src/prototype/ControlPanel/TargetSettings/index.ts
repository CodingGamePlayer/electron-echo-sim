import {
  computeSarSummary,
  type SarRangeParams,
  type SarAzimuthParams,
} from './_util/sar-target-calculator.js';
import {
  computeGridCornersLonLat,
  computeAllGridPointsLonLat,
} from './_util/sar-grid-to-cesium.js';

/**
 * TargetSettings - Target settings tab management class
 */
export class TargetSettings {
  private container: HTMLElement | null;
  private viewer: any;
  private target_footprint_entity: any;
  private grid_point_entities: any[];
  private update_debounce_timer: number | null;

  constructor() {
    this.container = null;
    this.viewer = null;
    this.target_footprint_entity = null;
    this.grid_point_entities = [];
    this.update_debounce_timer = null;
  }

  /**
   * Initialize target settings tab
   */
  initialize(container: HTMLElement, viewer?: any): void {
    this.container = container;
    this.viewer = viewer || null;
    this.render();
    if (this.viewer) {
      this.updateTargetDebounced();
    }
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

    // SAR 타겟 파라미터 섹션
    const sar_section = document.createElement('div');
    sar_section.style.marginTop = '20px';
    sar_section.style.paddingTop = '15px';
    sar_section.style.borderTop = '1px solid #333';
    const sar_title = document.createElement('h4');
    sar_title.textContent = 'SAR 타겟 파라미터';
    sar_title.style.marginBottom = '10px';
    sar_title.style.fontSize = '14px';
    sar_title.style.color = '#ccc';
    sar_section.appendChild(sar_title);

    // Along-track 방위각 (deg)
    this.createInputField(
      sar_section,
      'Along-track 방위각 (deg, 0=북 90=동):',
      'prototypeTargetAlongTrackHeading',
      '90',
      '-180',
      '180',
      '1'
    );
    form.appendChild(sar_section);

    // Range
    const range_title = document.createElement('h5');
    range_title.textContent = 'Range (Cross-track)';
    range_title.style.marginTop = '12px';
    range_title.style.fontSize = '12px';
    range_title.style.color = '#aaa';
    sar_section.appendChild(range_title);
    this.createInputField(sar_section, 'Range Count:', 'prototypeTargetRangeCount', '8', '1', '10000', '1');
    this.createInputField(sar_section, 'Range Spacing (km):', 'prototypeTargetRangeSpacing', '5', '0', '1000', '0.1');
    this.createInputField(sar_section, 'Range Offset (km):', 'prototypeTargetRangeOffset', '30', '-1000', '1000', '0.1');

    // Azimuth
    const azimuth_title = document.createElement('h5');
    azimuth_title.textContent = 'Azimuth (Along-track)';
    azimuth_title.style.marginTop = '12px';
    azimuth_title.style.fontSize = '12px';
    azimuth_title.style.color = '#aaa';
    sar_section.appendChild(azimuth_title);
    this.createInputField(sar_section, 'Azimuth Count:', 'prototypeTargetAzimuthCount', '9', '1', '10000', '1');
    this.createInputField(sar_section, 'Azimuth Spacing (km):', 'prototypeTargetAzimuthSpacing', '10', '0', '1000', '0.1');
    this.createInputField(sar_section, 'Azimuth Offset (km):', 'prototypeTargetAzimuthOffset', '-40', '-1000', '1000', '0.1');

    // 요약 (읽기 전용)
    const summary_title = document.createElement('h5');
    summary_title.textContent = '요약';
    summary_title.style.marginTop = '12px';
    summary_title.style.fontSize = '12px';
    summary_title.style.color = '#aaa';
    sar_section.appendChild(summary_title);
    const summary_div = document.createElement('div');
    summary_div.id = 'prototypeTargetSarSummary';
    summary_div.style.fontSize = '12px';
    summary_div.style.color = '#ccc';
    summary_div.style.marginTop = '6px';
    summary_div.style.whiteSpace = 'pre-wrap';
    sar_section.appendChild(summary_div);

    section.appendChild(form);
    this.container.appendChild(section);

    // 입력 변경 시 요약 갱신 + Cesium 디바운스
    const input_ids = [
      'prototypeTargetLongitude',
      'prototypeTargetLatitude',
      'prototypeTargetAlongTrackHeading',
      'prototypeTargetRangeCount',
      'prototypeTargetRangeSpacing',
      'prototypeTargetRangeOffset',
      'prototypeTargetAzimuthCount',
      'prototypeTargetAzimuthSpacing',
      'prototypeTargetAzimuthOffset',
    ];
    input_ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.updateSummary();
          this.updateTargetDebounced();
        });
        el.addEventListener('change', () => {
          this.updateSummary();
          this.updateTargetDebounced();
        });
      }
    });
    this.updateSummary();
  }

  private createInputField(
    parent: HTMLElement,
    label_text: string,
    input_id: string,
    default_value: string,
    min: string,
    max: string,
    step: string
  ): HTMLElement {
    const label = document.createElement('label');
    label.style.marginTop = '10px';
    label.style.display = 'block';
    label.textContent = label_text;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = input_id;
    input.value = default_value;
    input.min = min;
    input.max = max;
    input.step = step;
    input.style.width = '100%';
    input.style.marginTop = '4px';
    input.style.padding = '4px';
    label.appendChild(input);
    parent.appendChild(label);
    return label;
  }

  private updateSummary(): void {
    const summary_el = document.getElementById('prototypeTargetSarSummary');
    if (!summary_el) return;
    const range_params: SarRangeParams = {
      count: parseInt((document.getElementById('prototypeTargetRangeCount') as HTMLInputElement)?.value || '8', 10),
      spacing_km: parseFloat((document.getElementById('prototypeTargetRangeSpacing') as HTMLInputElement)?.value || '5'),
      offset_km: parseFloat((document.getElementById('prototypeTargetRangeOffset') as HTMLInputElement)?.value || '30'),
    };
    const azimuth_params: SarAzimuthParams = {
      count: parseInt((document.getElementById('prototypeTargetAzimuthCount') as HTMLInputElement)?.value || '9', 10),
      spacing_km: parseFloat((document.getElementById('prototypeTargetAzimuthSpacing') as HTMLInputElement)?.value || '10'),
      offset_km: parseFloat((document.getElementById('prototypeTargetAzimuthOffset') as HTMLInputElement)?.value || '-40'),
    };
    const summary = computeSarSummary(range_params, azimuth_params);
    summary_el.textContent =
      `Range Coverage: ${summary.range_coverage_km.toFixed(2)} km\n` +
      `Azimuth Coverage: ${summary.azimuth_coverage_km.toFixed(2)} km\n` +
      `Total Area: ${summary.total_area_km2.toFixed(2)} km²\n` +
      `Total Pixels: ${summary.total_pixels}`;
  }

  private updateTargetDebounced(): void {
    if (this.update_debounce_timer !== null) {
      clearTimeout(this.update_debounce_timer);
    }
    this.update_debounce_timer = window.setTimeout(() => {
      this.drawTargetFootprint();
      this.update_debounce_timer = null;
    }, 500);
  }

  private drawTargetFootprint(): void {
    if (!this.viewer) return;
    this.clearTargetEntities();
    const center_lon = parseFloat((document.getElementById('prototypeTargetLongitude') as HTMLInputElement)?.value || '128');
    const center_lat = parseFloat((document.getElementById('prototypeTargetLatitude') as HTMLInputElement)?.value || '37');
    const heading_deg = parseFloat((document.getElementById('prototypeTargetAlongTrackHeading') as HTMLInputElement)?.value || '90');
    const range_params: SarRangeParams = {
      count: parseInt((document.getElementById('prototypeTargetRangeCount') as HTMLInputElement)?.value || '8', 10),
      spacing_km: parseFloat((document.getElementById('prototypeTargetRangeSpacing') as HTMLInputElement)?.value || '5'),
      offset_km: parseFloat((document.getElementById('prototypeTargetRangeOffset') as HTMLInputElement)?.value || '30'),
    };
    const azimuth_params: SarAzimuthParams = {
      count: parseInt((document.getElementById('prototypeTargetAzimuthCount') as HTMLInputElement)?.value || '9', 10),
      spacing_km: parseFloat((document.getElementById('prototypeTargetAzimuthSpacing') as HTMLInputElement)?.value || '10'),
      offset_km: parseFloat((document.getElementById('prototypeTargetAzimuthOffset') as HTMLInputElement)?.value || '-40'),
    };
    const corners = computeGridCornersLonLat(
      center_lon,
      center_lat,
      heading_deg,
      range_params,
      azimuth_params
    );
    const positions = corners.map((c) =>
      Cesium.Cartesian3.fromDegrees(c.longitude_deg, c.latitude_deg, 0)
    );
    this.target_footprint_entity = this.viewer.entities.add({
      name: 'SAR 타겟 영역',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: Cesium.Color.CYAN.withAlpha(0.25),
        outline: true,
        outlineColor: Cesium.Color.CYAN,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    // 격자점(픽셀) 표시
    const grid_points = computeAllGridPointsLonLat(
      center_lon,
      center_lat,
      heading_deg,
      range_params,
      azimuth_params
    );
    for (const p of grid_points) {
      const entity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          p.longitude_deg,
          p.latitude_deg,
          0
        ),
        point: {
          pixelSize: 6,
          color: Cesium.Color.CYAN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
      this.grid_point_entities.push(entity);
    }
  }

  private clearTargetEntities(): void {
    if (this.viewer) {
      if (this.target_footprint_entity) {
        this.viewer.entities.remove(this.target_footprint_entity);
        this.target_footprint_entity = null;
      }
      for (const entity of this.grid_point_entities) {
        this.viewer.entities.remove(entity);
      }
      this.grid_point_entities.length = 0;
    }
  }

  /**
   * Cleanup target settings
   */
  cleanup(): void {
    if (this.update_debounce_timer !== null) {
      clearTimeout(this.update_debounce_timer);
      this.update_debounce_timer = null;
    }
    this.clearTargetEntities();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
    this.viewer = null;
  }
}