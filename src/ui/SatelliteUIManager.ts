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
        this.satelliteManager.setPositionVelocityState({
          position: {
            longitude: position.longitude,
            latitude: position.latitude,
            altitude: position.altitude
          },
          velocity: velocity,
          missionDirection: response.mission_direction
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
}
