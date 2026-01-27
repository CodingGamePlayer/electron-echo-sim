import { SatelliteManager, SatelliteMode } from '../satellite/SatelliteManager.js';
import { EntityManager } from '../entity/EntityManager.js';
import { createSatellite } from '../utils/satellite-api-client.js';

/**
 * 위성 생성 UI 관리
 */
export class SatelliteUIManager {
  private satelliteManager: SatelliteManager;
  private entityManager: EntityManager;
  private satelliteModeSelect: HTMLSelectElement | null;
  private positionVelocityInput: HTMLElement | null;
  private tleInput: HTMLElement | null;
  private createSatelliteButton: HTMLButtonElement | null;
  private satelliteCreationStatus: HTMLElement | null;
  private useTLECheckbox: HTMLInputElement | null;
  private applyTLEButton: HTMLButtonElement | null;
  private tleInputText: HTMLTextAreaElement | null;
  private satelliteAltitudeTLE: HTMLInputElement | null;
  private missionLongitudeTLE: HTMLInputElement | null;
  private missionLatitudeTLE: HTMLInputElement | null;
  private missionTimeOffsetTLE: HTMLInputElement | null;
  private moveToMissionLocationTLEButton: HTMLButtonElement | null;
  private tleMissionStatus: HTMLElement | null;

  constructor(satelliteManager: SatelliteManager, entityManager: EntityManager) {
    this.satelliteManager = satelliteManager;
    this.entityManager = entityManager;
    this.satelliteModeSelect = null;
    this.positionVelocityInput = null;
    this.tleInput = null;
    this.createSatelliteButton = null;
    this.satelliteCreationStatus = null;
    this.useTLECheckbox = null;
    this.applyTLEButton = null;
    this.tleInputText = null;
    this.satelliteAltitudeTLE = null;
    this.missionLongitudeTLE = null;
    this.missionLatitudeTLE = null;
    this.missionTimeOffsetTLE = null;
    this.moveToMissionLocationTLEButton = null;
    this.tleMissionStatus = null;
  }

  /**
   * 위성 생성 UI 초기화
   */
  initialize(defaultTLE: string): void {
    // 모드 선택
    this.satelliteModeSelect = document.getElementById('satelliteMode') as HTMLSelectElement;
    this.positionVelocityInput = document.getElementById('positionVelocityInput');
    this.tleInput = document.getElementById('tleInput');
    
    // 위치/속도 기반 입력 요소
    this.createSatelliteButton = document.getElementById('createSatellite') as HTMLButtonElement;
    this.satelliteCreationStatus = document.getElementById('satelliteCreationStatus');
    
    // TLE 기반 입력 요소
    this.useTLECheckbox = document.getElementById('useTLE') as HTMLInputElement;
    this.applyTLEButton = document.getElementById('applyTLE') as HTMLButtonElement;
    this.tleInputText = document.getElementById('tleInputText') as HTMLTextAreaElement;
    this.satelliteAltitudeTLE = document.getElementById('satelliteAltitudeTLE') as HTMLInputElement;
    this.missionLongitudeTLE = document.getElementById('missionLongitudeTLE') as HTMLInputElement;
    this.missionLatitudeTLE = document.getElementById('missionLatitudeTLE') as HTMLInputElement;
    this.missionTimeOffsetTLE = document.getElementById('missionTimeOffsetTLE') as HTMLInputElement;
    this.moveToMissionLocationTLEButton = document.getElementById('moveToMissionLocationTLE') as HTMLButtonElement;
    this.tleMissionStatus = document.getElementById('tleMissionStatus');

    if (this.tleInputText && defaultTLE) {
      this.tleInputText.value = defaultTLE;
    }

    if (this.useTLECheckbox) {
      this.useTLECheckbox.checked = true;
    }

    this.setupHandlers();
    
    // 초기 TLE가 있으면 고도 계산 및 표시
    if (defaultTLE && defaultTLE.trim() && this.satelliteAltitudeTLE) {
      this.calculateAndDisplayAltitude(defaultTLE);
    }

    // 초기 미션 위치 기반 위성 위치 계산
    const missionLonInput = document.getElementById('missionLongitude') as HTMLInputElement;
    const missionLatInput = document.getElementById('missionLatitude') as HTMLInputElement;
    if (missionLonInput && missionLatInput) {
      const missionLon = parseFloat(missionLonInput.value);
      const missionLat = parseFloat(missionLatInput.value);
      if (!isNaN(missionLon) && !isNaN(missionLat)) {
        this.calculateSatellitePositionFromMission(missionLon, missionLat);
      }
    }
  }

  /**
   * TLE로부터 고도 계산 및 UI에 표시 (km 단위)
   */
  private calculateAndDisplayAltitude(tleText: string): void {
    try {
      if (!tleText || !tleText.trim()) {
        console.warn('[SatelliteUIManager] TLE 텍스트가 비어있습니다.');
        return;
      }
      
      const currentTime = Cesium.JulianDate.now();
      const tempManager = new SatelliteManager(tleText);
      const position = tempManager.calculatePosition(currentTime);
      
      if (position && this.satelliteAltitudeTLE) {
        if (position.altitude !== undefined && position.altitude !== null && !isNaN(position.altitude)) {
          // 미터를 킬로미터로 변환하여 표시
          const altitudeKm = position.altitude / 1000;
          this.satelliteAltitudeTLE.value = altitudeKm.toFixed(2);
          console.log(`[SatelliteUIManager] 초기 고도 계산: ${altitudeKm.toFixed(2)}km (${Math.round(position.altitude)}m) - 위도: ${position.latitude.toFixed(4)}°, 경도: ${position.longitude.toFixed(4)}°`);
        }
      }
    } catch (error) {
      console.error('[SatelliteUIManager] 초기 고도 계산 실패:', error);
    }
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupHandlers(): void {
    // 모드 전환 핸들러
    if (this.satelliteModeSelect) {
      this.satelliteModeSelect.addEventListener('change', () => {
        const mode = this.satelliteModeSelect!.value as SatelliteMode;
        this.satelliteManager.setSatelliteMode(mode);
        
        if (mode === SatelliteMode.POSITION_VELOCITY) {
          if (this.positionVelocityInput) this.positionVelocityInput.style.display = 'block';
          if (this.tleInput) this.tleInput.style.display = 'none';
        } else {
          if (this.positionVelocityInput) this.positionVelocityInput.style.display = 'none';
          if (this.tleInput) this.tleInput.style.display = 'block';
        }
      });
    }

    // 미션 위치 입력 핸들러 - 미션 위치 변경 시 위성 위치 자동 계산
    const missionLonInput = document.getElementById('missionLongitude') as HTMLInputElement;
    const missionLatInput = document.getElementById('missionLatitude') as HTMLInputElement;
    
    if (missionLonInput && missionLatInput) {
      const updateSatellitePosition = () => {
        const missionLon = parseFloat(missionLonInput.value);
        const missionLat = parseFloat(missionLatInput.value);
        
        if (!isNaN(missionLon) && !isNaN(missionLat)) {
          // 미션 위치를 기준으로 위성 위치 계산
          this.calculateSatellitePositionFromMission(missionLon, missionLat);
          // 미션 위치 마커 표시
          this.entityManager.setMissionLocation({
            longitude: missionLon,
            latitude: missionLat
          });
        }
      };
      
      missionLonInput.addEventListener('change', updateSatellitePosition);
      missionLatInput.addEventListener('change', updateSatellitePosition);
    }

    // 위성 생성 버튼 핸들러
    if (this.createSatelliteButton) {
      this.createSatelliteButton.addEventListener('click', async () => {
        await this.handleCreateSatellite();
      });
    }

    // TLE 적용 버튼 핸들러
    if (this.applyTLEButton && this.tleInputText && this.useTLECheckbox) {
      this.applyTLEButton.addEventListener('click', () => {
        this.handleApplyTLE();
      });
    }

    // TLE 미션 위치로 이동 버튼 핸들러
    if (this.moveToMissionLocationTLEButton) {
      this.moveToMissionLocationTLEButton.addEventListener('click', () => {
        this.handleTLEMissionLocation();
      });
    }

    // TLE 사용 체크박스 핸들러
    if (this.useTLECheckbox) {
      this.useTLECheckbox.addEventListener('change', () => {
        const useTLE = this.useTLECheckbox!.checked;
        this.satelliteManager.setUseTLE(useTLE);
        
        if (!useTLE) {
          alert('TLE 사용이 비활성화되었습니다. TLE를 계속 사용하려면 체크박스를 다시 활성화하세요.');
        }
      });
    }

    // TLE 고도 입력 핸들러
    if (this.satelliteAltitudeTLE) {
      this.satelliteAltitudeTLE.addEventListener('change', () => {
        const altitudeKm = parseFloat(this.satelliteAltitudeTLE!.value || '0');
        if (altitudeKm >= 0) {
          const altitudeM = altitudeKm * 1000;
          this.entityManager.setCustomAltitude(altitudeM);
          this.updatePositionIfNeeded();
        }
      });
    }
  }

  /**
   * 위성 생성 처리
   */
  private async handleCreateSatellite(): Promise<void> {
    if (!this.createSatelliteButton || !this.satelliteCreationStatus) {
      return;
    }

    try {
      // 입력 값 가져오기
      const longitudeInput = document.getElementById('satelliteLongitude') as HTMLInputElement;
      const latitudeInput = document.getElementById('satelliteLatitude') as HTMLInputElement;
      const altitudeInput = document.getElementById('satelliteAltitude') as HTMLInputElement;
      const vxInput = document.getElementById('satelliteVx') as HTMLInputElement;
      const vyInput = document.getElementById('satelliteVy') as HTMLInputElement;
      const vzInput = document.getElementById('satelliteVz') as HTMLInputElement;
      const missionLonInput = document.getElementById('missionLongitude') as HTMLInputElement;
      const missionLatInput = document.getElementById('missionLatitude') as HTMLInputElement;

      if (!longitudeInput || !latitudeInput || !altitudeInput || 
          !vxInput || !vyInput || !vzInput || 
          !missionLonInput || !missionLatInput) {
        throw new Error('입력 필드를 찾을 수 없습니다.');
      }

      const position = {
        longitude: parseFloat(longitudeInput.value),
        latitude: parseFloat(latitudeInput.value),
        altitude: parseFloat(altitudeInput.value)
      };

      const velocity = {
        vx: parseFloat(vxInput.value),
        vy: parseFloat(vyInput.value),
        vz: parseFloat(vzInput.value)
      };

      const missionLocation = {
        longitude: parseFloat(missionLonInput.value),
        latitude: parseFloat(missionLatInput.value)
      };

      // 상태 표시 업데이트
      this.createSatelliteButton.disabled = true;
      this.satelliteCreationStatus.style.display = 'block';
      this.satelliteCreationStatus.textContent = '위성 생성 중...';
      this.satelliteCreationStatus.style.color = '#4CAF50';

      // Backend API 호출
      const response = await createSatellite(position, velocity, missionLocation);

      if (response.success) {
        // 위성 상태 저장
        // 백엔드 응답 형식(beam_direction, crossing_point)을 프론트엔드 형식(beamDirection, crossingPoint)으로 변환
        const missionDirection = response.mission_direction ? {
          beamDirection: response.mission_direction.beam_direction,
          heading: response.mission_direction.heading,
          crossingPoint: response.mission_direction.crossing_point
        } : undefined;

        this.satelliteManager.setPositionVelocityState({
          position: {
            longitude: position.longitude,
            latitude: position.latitude,
            altitude: position.altitude
          },
          velocity: velocity,
          missionDirection: missionDirection
        });

        // 위성 위치 업데이트
        this.entityManager.updatePosition(position);
        
        // 미션 위치 마커 표시
        this.entityManager.setMissionLocation(missionLocation);
        
        // 미션 방향 설정 (EntityManager에 전달)
        if (response.mission_direction) {
          this.entityManager.setMissionDirection(response.mission_direction);
        }

        // 상태 표시 업데이트
        this.satelliteCreationStatus.textContent = `위성 생성 완료!\nHeading: ${response.mission_direction.heading.toFixed(2)}°`;
        this.satelliteCreationStatus.style.color = '#4CAF50';

        // 예상 경로 제거 (위성 생성 시 궤도선 없애기)
        this.entityManager.removePredictedPath();

        console.log('[SatelliteUIManager] 위성 생성 완료:', response);
      } else {
        throw new Error(response.message || '위성 생성 실패');
      }
    } catch (error: any) {
      console.error('[SatelliteUIManager] 위성 생성 실패:', error);
      if (this.satelliteCreationStatus) {
        this.satelliteCreationStatus.textContent = `오류: ${error.message}`;
        this.satelliteCreationStatus.style.color = '#f44336';
      }
      alert('위성 생성 실패: ' + error.message);
    } finally {
      if (this.createSatelliteButton) {
        this.createSatelliteButton.disabled = false;
      }
    }
  }

  /**
   * TLE 적용 처리
   */
  private handleApplyTLE(): void {
    if (!this.applyTLEButton || !this.tleInputText || !this.useTLECheckbox) {
      return;
    }

    const tleText = this.tleInputText.value.trim();
    if (!tleText) {
      alert('TLE 데이터를 입력하세요.');
      return;
    }
    
    try {
      // TLE 유효성 검사
      const testTime = Cesium.JulianDate.now();
      const tempManager = new SatelliteManager(tleText);
      const testPosition = tempManager.calculatePosition(testTime);
      
      if (!testPosition) {
        alert('TLE 데이터가 올바르지 않습니다.');
        return;
      }
      
      // TLE 데이터 저장
      this.satelliteManager.setTLE(tleText);
      this.satelliteManager.setSatelliteMode(SatelliteMode.TLE);
      
      // 초기 위치 계산 및 업데이트
      const startTime = Cesium.JulianDate.now();
      const initialPos = this.satelliteManager.calculatePosition(startTime);
      if (initialPos) {
        // 계산된 고도를 UI에 표시 (km 단위)
        if (this.satelliteAltitudeTLE && initialPos.altitude) {
          const altitudeKm = initialPos.altitude / 1000;
          this.satelliteAltitudeTLE.value = altitudeKm.toFixed(2);
          console.log(`[SatelliteUIManager] TLE 적용 - 계산된 고도: ${altitudeKm.toFixed(2)}km (${Math.round(initialPos.altitude)}m)`);
        }
        
        // 커스텀 고도 초기화 (TLE 고도 사용)
        this.entityManager.setCustomAltitude(null);
        
        this.entityManager.updatePosition(initialPos);
      } else {
        console.error('[SatelliteUIManager] TLE 위치 계산 실패');
      }
      
      // 예상 경로 다시 그리기
      this.entityManager.updatePredictedPath(4);
      
      alert('TLE가 적용되었습니다.');
    } catch (error: any) {
      alert('TLE 적용 실패: ' + error.message);
      console.error(error);
    }
  }

  /**
   * 필요시 위치 업데이트
   */
  private updatePositionIfNeeded(): void {
    if (this.satelliteManager.useTLE) {
      const currentTime = Cesium.JulianDate.now();
      const position = this.satelliteManager.calculatePosition(currentTime);
      if (position) {
        this.entityManager.updatePosition(position);
      }
    }
  }

  /**
   * 미션 위치를 기준으로 위성 위치 및 속도 계산
   * SAR 위성이 미션 위치를 swath의 중심으로 촬영할 수 있도록 look angle과 swath center range를 고려하여 위성 위치를 계산합니다.
   * @param missionLon 미션 경도 (deg)
   * @param missionLat 미션 위도 (deg)
   */
  private calculateSatellitePositionFromMission(missionLon: number, missionLat: number): void {
    // 위성 위치 입력 필드 가져오기
    const satLonInput = document.getElementById('satelliteLongitude') as HTMLInputElement;
    const satLatInput = document.getElementById('satelliteLatitude') as HTMLInputElement;
    const satAltInput = document.getElementById('satelliteAltitude') as HTMLInputElement;
    const satVxInput = document.getElementById('satelliteVx') as HTMLInputElement;
    const satVyInput = document.getElementById('satelliteVy') as HTMLInputElement;
    const satVzInput = document.getElementById('satelliteVz') as HTMLInputElement;

    if (!satLonInput || !satLatInput || !satAltInput || 
        !satVxInput || !satVyInput || !satVzInput) {
      return;
    }

    // 기본 고도 (517km)
    const defaultAltitude = 517000; // 미터
    
    // Swath 파라미터 가져오기 (UI에서)
    const swathNearRangeInput = document.getElementById('swathNearRange') as HTMLInputElement;
    const swathWidthInput = document.getElementById('swathWidth') as HTMLInputElement;
    
    let centerRange = 0; // Swath 중심 거리 (ground range, m)
    let lookAngleDeg = 30.0; // 기본 look angle (30도)
    
    if (swathNearRangeInput && swathWidthInput) {
      const nearRange = parseFloat(swathNearRangeInput.value || '200000');
      const swathWidth = parseFloat(swathWidthInput.value || '400000');
      
      if (!isNaN(nearRange) && !isNaN(swathWidth) && swathWidth > 0) {
        // Swath 중심 거리 = near range + swath width / 2
        centerRange = nearRange + swathWidth / 2;
        
        // Look angle 계산: center range를 고려하여 역산
        // center_range = orbit_height * tan(look_angle)
        // look_angle = arctan(center_range / orbit_height)
        lookAngleDeg = Math.atan(centerRange / defaultAltitude) * 180 / Math.PI;
        
        console.log(`[SatelliteUIManager] Swath 파라미터: Near Range=${nearRange}m, Swath Width=${swathWidth}m, Center Range=${centerRange.toFixed(0)}m, Look Angle=${lookAngleDeg.toFixed(2)}도`);
      }
    }
    
    const lookAngleRad = lookAngleDeg * Math.PI / 180;
    
    // 지구 반지름
    const earthRadius = 6378137.0; // WGS84 장반경 (m)
    const WGS84_E2 = 0.00669437999014; // WGS84 제1 이심률 제곱
    
    // 미션 위치를 ECEF로 변환 (고도 0)
    const latRad = missionLat * Math.PI / 180;
    const lonRad = missionLon * Math.PI / 180;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);
    
    const N = earthRadius / Math.sqrt(1.0 - WGS84_E2 * sinLat * sinLat);
    const missionX = N * cosLat * cosLon;
    const missionY = N * cosLat * sinLon;
    const missionZ = N * (1 - WGS84_E2) * sinLat;
    
    const missionPos = new Cesium.Cartesian3(missionX, missionY, missionZ);
    const missionPosMag = Math.sqrt(missionX * missionX + missionY * missionY + missionZ * missionZ);
    const missionPosUnit = new Cesium.Cartesian3(
      missionX / missionPosMag,
      missionY / missionPosMag,
      missionZ / missionPosMag
    );
    
    // 지구 중심에서 미션 위치로의 방향 (nadir 방향)
    const nadirDirection = missionPosUnit;
    
    // 동쪽 방향 벡터 (경도 방향의 접선 벡터)
    const eastVector = new Cesium.Cartesian3(-sinLon, cosLon, 0);
    
    // 위성 속도 방향 (동쪽 방향, 궤도 평면에 수직)
    const velocityDirection = Cesium.Cartesian3.cross(
      nadirDirection,
      eastVector,
      new Cesium.Cartesian3()
    );
    
    const velocityDirMag = Math.sqrt(
      velocityDirection.x * velocityDirection.x +
      velocityDirection.y * velocityDirection.y +
      velocityDirection.z * velocityDirection.z
    );
    
    let velocityUnit: Cesium.Cartesian3;
    if (velocityDirMag < 1e-6) {
      // 극지방의 경우 기본 동쪽 방향 사용
      velocityUnit = eastVector;
    } else {
      velocityUnit = new Cesium.Cartesian3(
        velocityDirection.x / velocityDirMag,
        velocityDirection.y / velocityDirMag,
        velocityDirection.z / velocityDirMag
      );
    }
    
    // SAR 위성은 side-looking이므로, 위성의 Y축(관측 방향)이 미션 위치를 향해야 함
    // cross-track 방향 = velocityUnit × nadirDirection
    const crossTrackDirection = Cesium.Cartesian3.cross(
      velocityUnit,
      nadirDirection,
      new Cesium.Cartesian3()
    );
    const crossTrackMag = Math.sqrt(
      crossTrackDirection.x * crossTrackDirection.x +
      crossTrackDirection.y * crossTrackDirection.y +
      crossTrackDirection.z * crossTrackDirection.z
    );
    
    let crossTrackUnit: Cesium.Cartesian3;
    if (crossTrackMag < 1e-6) {
      // 극지방의 경우 기본 방향 사용
      crossTrackUnit = new Cesium.Cartesian3(0, 0, 1);
    } else {
      crossTrackUnit = new Cesium.Cartesian3(
        crossTrackDirection.x / crossTrackMag,
        crossTrackDirection.y / crossTrackMag,
        crossTrackDirection.z / crossTrackMag
      );
    }
    
    // 위성 위치 계산:
    // 위성은 미션 위치에서 look angle을 고려하여 배치됨
    // 위성 위치 = 미션 위치 + (nadir 방향) * 고도 - (cross-track 방향) * offset
    // offset = 고도 * tan(look_angle)
    const offset = defaultAltitude * Math.tan(lookAngleRad);
    
    const satelliteOffset = Cesium.Cartesian3.multiplyByScalar(
      crossTrackUnit,
      offset,
      new Cesium.Cartesian3()
    );
    
    const satellitePosFromMission = Cesium.Cartesian3.add(
      missionPos,
      Cesium.Cartesian3.multiplyByScalar(nadirDirection, defaultAltitude, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    
    const satellitePos = Cesium.Cartesian3.subtract(
      satellitePosFromMission,
      satelliteOffset,
      new Cesium.Cartesian3()
    );
    
    // 위성 위치를 지리 좌표로 변환
    const cartographic = Cesium.Cartographic.fromCartesian(satellitePos);
    const satelliteLon = Cesium.Math.toDegrees(cartographic.longitude);
    const satelliteLat = Cesium.Math.toDegrees(cartographic.latitude);
    const satelliteAlt = cartographic.height;

    // 위성 속도 계산 (ECEF 좌표계)
    // 위성 궤도 속도: v = sqrt(GM / r)
    const GM = 3.986004418e14; // m^3/s^2
    const r = earthRadius + satelliteAlt; // 위성 거리 (m)
    const orbitalSpeed = Math.sqrt(GM / r); // 궤도 속도 (m/s)
    
    // 위성 속도 벡터 (위성 위치에서 속도 방향으로)
    const velocityX = velocityUnit.x * orbitalSpeed;
    const velocityY = velocityUnit.y * orbitalSpeed;
    const velocityZ = velocityUnit.z * orbitalSpeed;
    
    // UI에 값 설정
    satLonInput.value = satelliteLon.toFixed(6);
    satLatInput.value = satelliteLat.toFixed(6);
    satAltInput.value = satelliteAlt.toFixed(2);
    satVxInput.value = velocityX.toFixed(2);
    satVyInput.value = velocityY.toFixed(2);
    satVzInput.value = velocityZ.toFixed(2);

    console.log(`[SatelliteUIManager] 미션 위치 기반 위성 위치 계산 완료`);
    console.log(`  미션 위치: 경도 ${missionLon.toFixed(4)}°, 위도 ${missionLat.toFixed(4)}°`);
    if (centerRange > 0) {
      console.log(`  Swath Center Range: ${centerRange.toFixed(0)}m (Look Angle: ${lookAngleDeg.toFixed(2)}도)`);
    } else {
      console.log(`  Look Angle: ${lookAngleDeg.toFixed(2)}도 (기본값)`);
    }
    console.log(`  위성 위치: 경도 ${satelliteLon.toFixed(4)}°, 위도 ${satelliteLat.toFixed(4)}°, 고도 ${satelliteAlt.toFixed(0)}m`);
    console.log(`  위성 속도: Vx=${velocityX.toFixed(2)}, Vy=${velocityY.toFixed(2)}, Vz=${velocityZ.toFixed(2)} m/s`);
  }

  /**
   * TLE 궤도에서 미션 위치를 SAR로 촬영할 수 있는 시점 찾기
   * SAR 위성의 관측 방향(Y축)이 미션 위치를 향하는 시점을 찾습니다.
   * @param tleData TLE 데이터
   * @param missionLon 미션 경도 (deg)
   * @param missionLat 미션 위도 (deg)
   * @param startTime 시작 시간 (JulianDate)
   * @param searchDurationMinutes 검색 기간 (분, 기본값: 100분)
   * @returns 가장 적합한 시점과 거리, 없으면 null
   */
  private findClosestTimeToMissionInTLE(
    tleData: string,
    missionLon: number,
    missionLat: number,
    startTime: any,
    searchDurationMinutes: number = 100
  ): { time: any; distance: number } | null {
    if (!tleData || !tleData.trim()) {
      return null;
    }

    try {
      const tempManager = new SatelliteManager(tleData);
      
      // SAR Swath 파라미터 가져오기
      const swathNearRangeInput = document.getElementById('swathNearRange') as HTMLInputElement;
      const swathWidthInput = document.getElementById('swathWidth') as HTMLInputElement;
      
      let nearRange = 200000; // 기본값 (m)
      let swathWidth = 400000; // 기본값 (m)
      
      if (swathNearRangeInput && swathWidthInput) {
        const nearRangeValue = parseFloat(swathNearRangeInput.value || '200000');
        const swathWidthValue = parseFloat(swathWidthInput.value || '400000');
        
        if (!isNaN(nearRangeValue) && nearRangeValue > 0) {
          nearRange = nearRangeValue;
        }
        if (!isNaN(swathWidthValue) && swathWidthValue > 0) {
          swathWidth = swathWidthValue;
        }
      }
      
      const farRange = nearRange + swathWidth;
      const centerRange = nearRange + swathWidth / 2;
      const earthRadius = 6378137.0; // WGS84 장반경 (m)
      
      console.log(`[SatelliteUIManager] SAR Swath 범위 - Near: ${nearRange}m, Far: ${farRange}m, Center: ${centerRange}m`);
      
      // 미션 위치를 ECEF로 변환
      const missionPosEcef = Cesium.Cartesian3.fromDegrees(missionLon, missionLat, 0);

      let bestTime: any = null;
      let bestScore = -Infinity; // 점수가 높을수록 좋음 (Y축 방향 일치도 + 거리 적합도)
      let bestLocalY = -Infinity; // 최고 localY 값 추적
      let bestRange = 0; // 최고 거리 추적

      // 1단계: 1분 간격으로 대략적인 검색
      const searchIntervalMinutes = 1;
      const numSamples = Math.floor(searchDurationMinutes / searchIntervalMinutes);

      for (let i = 0; i <= numSamples; i++) {
        const sampleTime = Cesium.JulianDate.addMinutes(
          startTime,
          i * searchIntervalMinutes,
          new Cesium.JulianDate()
        );

        const position = tempManager.calculatePosition(sampleTime);
        if (!position) {
          continue;
        }

        // 위성 위치를 ECEF로 변환
        const satPosEcef = Cesium.Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          position.altitude
        );

        // 위성 속도 계산 (다음 시점과의 차이로)
        const futureTime = Cesium.JulianDate.addSeconds(sampleTime, 1.0, new Cesium.JulianDate());
        const futurePosition = tempManager.calculatePosition(futureTime);
        
        if (!futurePosition) {
          continue;
        }

        const futureSatPosEcef = Cesium.Cartesian3.fromDegrees(
          futurePosition.longitude,
          futurePosition.latitude,
          futurePosition.altitude
        );

        // 속도 벡터 (ECEF)
        const velocityEcef = Cesium.Cartesian3.subtract(
          futureSatPosEcef,
          satPosEcef,
          new Cesium.Cartesian3()
        );

        const velocityMag = Math.sqrt(
          velocityEcef.x * velocityEcef.x +
          velocityEcef.y * velocityEcef.y +
          velocityEcef.z * velocityEcef.z
        );
        if (velocityMag < 1e-6) {
          continue;
        }

        // 위성의 로컬 좌표계 계산
        // Z축: 지구 중심 방향
        const zAxis = Cesium.Cartesian3.negate(
          Cesium.Cartesian3.normalize(satPosEcef, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );

        // X축: 위성 진행 방향 (속도 벡터)
        const xAxis = Cesium.Cartesian3.normalize(velocityEcef, new Cesium.Cartesian3());

        // Y축: SAR 관측 방향 (X × Z)
        const yAxis = Cesium.Cartesian3.cross(
          xAxis,
          zAxis,
          new Cesium.Cartesian3()
        );
        const yAxisMag = Math.sqrt(
          yAxis.x * yAxis.x +
          yAxis.y * yAxis.y +
          yAxis.z * yAxis.z
        );

        if (yAxisMag < 1e-6) {
          continue;
        }

        const yAxisNormalized = Cesium.Cartesian3.normalize(yAxis, new Cesium.Cartesian3());

        // 위성에서 미션 위치로의 벡터
        const toMission = Cesium.Cartesian3.subtract(
          missionPosEcef,
          satPosEcef,
          new Cesium.Cartesian3()
        );
        const toMissionMag = Math.sqrt(
          toMission.x * toMission.x +
          toMission.y * toMission.y +
          toMission.z * toMission.z
        );

        if (toMissionMag < 1e-6) {
          continue;
        }

        const toMissionNormalized = Cesium.Cartesian3.normalize(toMission, new Cesium.Cartesian3());

        // 미션 방향을 로컬 좌표계로 변환 (Y축과의 내적)
        const localY = toMissionNormalized.x * yAxisNormalized.x +
                      toMissionNormalized.y * yAxisNormalized.y +
                      toMissionNormalized.z * yAxisNormalized.z;

        // 위성에서 미션 위치까지의 거리 (ground range, 대략적인 근사)
        // 실제로는 지구 곡률을 고려해야 하지만, 여기서는 간단히 ECEF 거리를 사용
        // 지구 표면에서의 거리를 추정하기 위해 위성 고도를 고려
        const satAltitude = position.altitude;
        const satRadius = earthRadius + satAltitude;
        
        // 슬랜트 레인지에서 그라운드 레인지로 변환 (코사인 법칙 사용)
        const slantRange = toMissionMag;
        const cosTheta = (earthRadius * earthRadius + satRadius * satRadius - slantRange * slantRange) / 
                        (2 * earthRadius * satRadius);
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
        const theta = Math.acos(clampedCosTheta);
        const groundRange = earthRadius * theta;

        // 거리가 swath 범위 내에 있는지 확인
        const isInSwathRange = groundRange >= nearRange && groundRange <= farRange;
        
        // Y축 방향 일치도 계산 (Y축이 미션 위치를 향하는 정도)
        // localY가 양수이고 클수록 좋음 (Y축이 미션 위치를 향함)
        // 거리 적합도: swath 범위 내에 있으면 높은 점수, 범위 밖이면 거리에 따라 감점
        let rangeScore = 0;
        if (isInSwathRange) {
          // swath 범위 내: center range에 가까울수록 높은 점수
          const distanceFromCenter = Math.abs(groundRange - centerRange);
          const maxDistance = swathWidth / 2;
          rangeScore = 1000 * (1 - distanceFromCenter / maxDistance); // 0~1000 점수
        } else {
          // swath 범위 밖: 거리에 따라 감점
          if (groundRange < nearRange) {
            rangeScore = -500 * (nearRange - groundRange) / nearRange; // 너무 가까우면 감점
          } else {
            rangeScore = -500 * (groundRange - farRange) / farRange; // 너무 멀면 감점
          }
        }
        
        // Y축 방향 일치도 점수 (양수일 때만 점수 부여)
        const directionScore = localY > 0 ? localY * 500 : localY * 100; // 양수일 때 더 높은 점수
        
        // 최종 점수: 방향 일치도 + 거리 적합도
        const score = directionScore + rangeScore;

        if (score > bestScore) {
          bestScore = score;
          bestLocalY = localY;
          bestRange = groundRange;
          bestTime = sampleTime.clone();
        }
      }

      if (!bestTime) {
        console.warn('[SatelliteUIManager] 적합한 시점을 찾지 못했습니다.');
        return null;
      }

      console.log(`[SatelliteUIManager] 1단계 검색 완료 - 최고 점수: ${bestScore.toFixed(2)}, localY: ${bestLocalY.toFixed(3)}, 거리: ${(bestRange/1000).toFixed(2)}km (범위: ${(nearRange/1000).toFixed(2)}~${(farRange/1000).toFixed(2)}km)`);

      // 2단계: 가장 적합한 시점 주변 10분을 10초 간격으로 정밀 검색
      const refineRangeMinutes = 10;
      const refineIntervalSeconds = 10;
      const refineStartTime = Cesium.JulianDate.addMinutes(
        bestTime,
        -refineRangeMinutes / 2,
        new Cesium.JulianDate()
      );
      const refineNumSamples = Math.floor((refineRangeMinutes * 60) / refineIntervalSeconds);

      let refinedBestTime = bestTime.clone();
      let refinedBestScore = bestScore;

      for (let i = 0; i <= refineNumSamples; i++) {
        const sampleTime = Cesium.JulianDate.addSeconds(
          refineStartTime,
          i * refineIntervalSeconds,
          new Cesium.JulianDate()
        );

        const position = tempManager.calculatePosition(sampleTime);
        if (!position) {
          continue;
        }

        const satPosEcef = Cesium.Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          position.altitude
        );

        const futureTime = Cesium.JulianDate.addSeconds(sampleTime, 1.0, new Cesium.JulianDate());
        const futurePosition = tempManager.calculatePosition(futureTime);
        
        if (!futurePosition) {
          continue;
        }

        const futureSatPosEcef = Cesium.Cartesian3.fromDegrees(
          futurePosition.longitude,
          futurePosition.latitude,
          futurePosition.altitude
        );

        const velocityEcef = Cesium.Cartesian3.subtract(
          futureSatPosEcef,
          satPosEcef,
          new Cesium.Cartesian3()
        );

        const velocityMag = Math.sqrt(
          velocityEcef.x * velocityEcef.x +
          velocityEcef.y * velocityEcef.y +
          velocityEcef.z * velocityEcef.z
        );
        if (velocityMag < 1e-6) {
          continue;
        }

        const zAxis = Cesium.Cartesian3.negate(
          Cesium.Cartesian3.normalize(satPosEcef, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );

        const xAxis = Cesium.Cartesian3.normalize(velocityEcef, new Cesium.Cartesian3());
        const yAxis = Cesium.Cartesian3.cross(xAxis, zAxis, new Cesium.Cartesian3());
        const yAxisMag = Math.sqrt(
          yAxis.x * yAxis.x +
          yAxis.y * yAxis.y +
          yAxis.z * yAxis.z
        );

        if (yAxisMag < 1e-6) {
          continue;
        }

        const yAxisNormalized = Cesium.Cartesian3.normalize(yAxis, new Cesium.Cartesian3());
        const toMission = Cesium.Cartesian3.subtract(missionPosEcef, satPosEcef, new Cesium.Cartesian3());
        const toMissionMag = Math.sqrt(
          toMission.x * toMission.x +
          toMission.y * toMission.y +
          toMission.z * toMission.z
        );

        if (toMissionMag < 1e-6) {
          continue;
        }

        const toMissionNormalized = Cesium.Cartesian3.normalize(toMission, new Cesium.Cartesian3());
        const localY = toMissionNormalized.x * yAxisNormalized.x +
                      toMissionNormalized.y * yAxisNormalized.y +
                      toMissionNormalized.z * yAxisNormalized.z;

        // 거리 계산 (ground range)
        const satAltitude = position.altitude;
        const satRadius = earthRadius + satAltitude;
        const slantRange = toMissionMag;
        const cosTheta = (earthRadius * earthRadius + satRadius * satRadius - slantRange * slantRange) / 
                        (2 * earthRadius * satRadius);
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
        const theta = Math.acos(clampedCosTheta);
        const groundRange = earthRadius * theta;

        // 거리 적합도 계산
        const isInSwathRange = groundRange >= nearRange && groundRange <= farRange;
        let rangeScore = 0;
        if (isInSwathRange) {
          const distanceFromCenter = Math.abs(groundRange - centerRange);
          const maxDistance = swathWidth / 2;
          rangeScore = 1000 * (1 - distanceFromCenter / maxDistance);
        } else {
          if (groundRange < nearRange) {
            rangeScore = -500 * (nearRange - groundRange) / nearRange;
          } else {
            rangeScore = -500 * (groundRange - farRange) / farRange;
          }
        }
        
        const directionScore = localY > 0 ? localY * 500 : localY * 100;
        const score = directionScore + rangeScore;

        if (score > refinedBestScore) {
          refinedBestScore = score;
          refinedBestTime = sampleTime.clone();
        }
      }

      // 최종 거리 계산 및 로깅
      const finalPosition = tempManager.calculatePosition(refinedBestTime);
      if (!finalPosition) {
        return null;
      }

      // 최종 거리 계산 (ground range)
      const finalSatPosEcef = Cesium.Cartesian3.fromDegrees(
        finalPosition.longitude,
        finalPosition.latitude,
        finalPosition.altitude
      );
      const finalToMission = Cesium.Cartesian3.subtract(missionPosEcef, finalSatPosEcef, new Cesium.Cartesian3());
      const finalSlantRange = Math.sqrt(
        finalToMission.x * finalToMission.x +
        finalToMission.y * finalToMission.y +
        finalToMission.z * finalToMission.z
      );
      const finalSatRadius = earthRadius + finalPosition.altitude;
      const finalCosTheta = (earthRadius * earthRadius + finalSatRadius * finalSatRadius - finalSlantRange * finalSlantRange) / 
                            (2 * earthRadius * finalSatRadius);
      const finalClampedCosTheta = Math.max(-1, Math.min(1, finalCosTheta));
      const finalTheta = Math.acos(finalClampedCosTheta);
      const finalGroundRange = earthRadius * finalTheta;
      
      console.log(`[SatelliteUIManager] 2단계 정밀 검색 완료 - 최종 점수: ${refinedBestScore.toFixed(2)}, 거리: ${(finalGroundRange/1000).toFixed(2)}km`);

      const finalDistance = this.calculateGreatCircleDistance(
        missionLat,
        missionLon,
        finalPosition.latitude,
        finalPosition.longitude
      );

      return {
        time: refinedBestTime,
        distance: finalDistance
      };
    } catch (error) {
      console.error('[SatelliteUIManager] TLE 궤도 검색 실패:', error);
      return null;
    }
  }

  /**
   * 대권 거리 계산 (Haversine 공식)
   * @param lat1 첫 번째 점의 위도 (deg)
   * @param lon1 첫 번째 점의 경도 (deg)
   * @param lat2 두 번째 점의 위도 (deg)
   * @param lon2 두 번째 점의 경도 (deg)
   * @returns 거리 (미터)
   */
  private calculateGreatCircleDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadius = 6378137.0; // WGS84 장반경 (m)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  /**
   * TLE 기반 미션 위치 처리
   */
  private handleTLEMissionLocation(): void {
    if (!this.missionLongitudeTLE || !this.missionLatitudeTLE || !this.missionTimeOffsetTLE || 
        !this.tleInputText || !this.tleMissionStatus) {
      return;
    }

    const missionLon = parseFloat(this.missionLongitudeTLE.value);
    const missionLat = parseFloat(this.missionLatitudeTLE.value);
    const timeOffsetMinutes = parseFloat(this.missionTimeOffsetTLE.value || '5');

    if (isNaN(missionLon) || isNaN(missionLat) || isNaN(timeOffsetMinutes)) {
      alert('미션 위치와 시간 오프셋을 올바르게 입력하세요.');
      return;
    }

    const tleText = this.tleInputText.value.trim();
    if (!tleText) {
      alert('TLE 데이터를 먼저 입력하고 적용하세요.');
      return;
    }

    // 상태 표시 업데이트
    if (this.moveToMissionLocationTLEButton) {
      this.moveToMissionLocationTLEButton.disabled = true;
    }
    this.tleMissionStatus.style.display = 'block';
    this.tleMissionStatus.textContent = '미션 위치 검색 중...';
    this.tleMissionStatus.style.color = '#4CAF50';

    try {
      // 현재 시간부터 검색 시작
      const startTime = Cesium.JulianDate.now();

      // TLE 궤도에서 미션 위치에 가장 가까운 시점 찾기
      // 위성 궤도 주기는 약 90-100분이므로, 여러 궤도를 검색하기 위해 24시간(1440분) 검색
      const result = this.findClosestTimeToMissionInTLE(
        tleText,
        missionLon,
        missionLat,
        startTime,
        1440 // 24시간 동안 검색 (약 14-16개 궤도 주기)
      );

      if (!result) {
        throw new Error('미션 위치를 찾을 수 없습니다. TLE 데이터를 확인하거나 검색 범위를 늘려보세요.');
      }

      // 시간 오프셋 적용 (분 단위)
      const targetTime = Cesium.JulianDate.addMinutes(
        result.time,
        -timeOffsetMinutes, // 음수로 과거로 이동
        new Cesium.JulianDate()
      );

      // 해당 시점의 위성 위치 계산
      const tempManager = new SatelliteManager(tleText);
      const position = tempManager.calculatePosition(targetTime);

      if (!position) {
        throw new Error('위성 위치 계산 실패');
      }

      // TLE 데이터 저장 및 모드 설정 (위치 업데이트 전에 설정)
      this.satelliteManager.setTLE(tleText);
      this.satelliteManager.setSatelliteMode(SatelliteMode.TLE);

      // Cesium 시계를 해당 시점으로 설정 (위치 업데이트 전에 설정)
      this.entityManager.setClockTime(targetTime);

      // 위성 위치 업데이트
      this.entityManager.updatePosition(position);

      // 미션 위치 마커 표시
      this.entityManager.setMissionLocation({
        longitude: missionLon,
        latitude: missionLat
      });

      // 계산된 고도를 UI에 표시
      if (this.satelliteAltitudeTLE && position.altitude) {
        const altitudeKm = position.altitude / 1000;
        this.satelliteAltitudeTLE.value = altitudeKm.toFixed(2);
      }

      // 상태 표시 업데이트
      const distanceKm = result.distance / 1000;
      const targetDate = Cesium.JulianDate.toDate(targetTime);
      const missionDate = Cesium.JulianDate.toDate(result.time);
      
      this.tleMissionStatus.textContent = 
        `미션 위치로 이동 완료!\n` +
        `가장 가까운 시점: ${missionDate.toLocaleString()}\n` +
        `거리: ${distanceKm.toFixed(2)}km\n` +
        `위성 위치: ${targetDate.toLocaleString()}`;
      this.tleMissionStatus.style.color = '#4CAF50';

      console.log(`[SatelliteUIManager] TLE 미션 위치 처리 완료`);
      console.log(`  미션 위치: 경도 ${missionLon.toFixed(4)}°, 위도 ${missionLat.toFixed(4)}°`);
      console.log(`  가장 가까운 시점: ${missionDate.toISOString()}, 거리: ${distanceKm.toFixed(2)}km`);
      console.log(`  위성 이동 시점: ${targetDate.toISOString()} (${timeOffsetMinutes}분 전)`);
      console.log(`  위성 위치: 경도 ${position.longitude.toFixed(4)}°, 위도 ${position.latitude.toFixed(4)}°, 고도 ${position.altitude.toFixed(0)}m`);

      // 예상 경로 다시 그리기
      this.entityManager.updatePredictedPath(4);
    } catch (error: any) {
      console.error('[SatelliteUIManager] TLE 미션 위치 처리 실패:', error);
      if (this.tleMissionStatus) {
        this.tleMissionStatus.textContent = `오류: ${error.message}`;
        this.tleMissionStatus.style.color = '#f44336';
      }
      alert('미션 위치로 이동 실패: ' + error.message);
    } finally {
      if (this.moveToMissionLocationTLEButton) {
        this.moveToMissionLocationTLEButton.disabled = false;
      }
    }
  }
}
