# 수식 및 변수 명칭 정리 문서

SAR Simulator에서 사용하는 모든 수식과 변수명을 정리한 문서입니다.

## 목차

1. [Chirp 신호 생성 관련 변수](#1-chirp-신호-생성-관련-변수)
2. [시간 관련 변수](#2-시간-관련-변수)
3. [거리 관련 변수](#3-거리-관련-변수)
4. [신호 세기 및 전파 관련 변수](#4-신호-세기-및-전파-관련-변수)
5. [기하학 관련 변수](#5-기하학-관련-변수)
6. [위성 및 궤도 관련 변수](#6-위성-및-궤도-관련-변수)
7. [타겟 관련 변수](#7-타겟-관련-변수)
8. [SAR 시스템 파라미터](#8-sar-시스템-파라미터)
9. [데이터 배열 관련 변수](#9-데이터-배열-관련-변수)
10. [물리 상수](#10-물리-상수)
11. [주요 수식 정리](#11-주요-수식-정리)

---

## 1. Chirp 신호 생성 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `bw`, `BW` | 대역폭 (Bandwidth) | Hz | - | `config.bw` |
| `taup`, `Tp` | 펄스 폭 (Pulse Width) | s | - | `config.taup` |
| `fs`, `Fs` | 샘플링 주파수 (Sampling Frequency) | Hz | - | `config.fs` |
| `fc` | 반송파 주파수 (Center Frequency) | Hz | - | `config.fc` |
| `Kr`, `k` | 첩 비율 (Chirp Rate) | Hz/s | `Kr = BW / taup` | `config.chirp_rate` |
| `dt` | 샘플링 간격 (Sampling Interval) | s | `dt = 1 / fs` | `config.dt` |
| `t` | 시간 벡터 (Time Vector) | s | `t = [-taup/2, taup/2]` | - |
| `phi`, `φ` | 위상 (Phase) | rad | `φ(t) = 2π * (fc * t + (Kr/2) * t²)` | - |
| `s(t)` | Chirp 신호 (Chirp Signal) | - | `s(t) = exp(j * π * Kr * t²)` (baseband) | `chirp_signal` |
| `num_samples_in_pulse` | 펄스 내 샘플 수 | - | `int(taup * fs)` | `config.num_samples_in_chirp` |
| `chirp_set_size` | Chirp 세트 크기 (보간용) | - | 기본값: 64 | - |
| `num_chirps` | 생성할 Chirp 개수 | - | - | - |

### Chirp 신호 생성 수식

```python
chirp_rate = bw / taup
dt = 1 / fs / num_chirps
num_samples_in_pulse = int(taup * fs)
n = num_samples_in_pulse * num_chirps
t = (np.arange(n) - n/2) * dt
s = exp(1j * π * chirp_rate * t²)
```

**수학적 표현:**
```
Kr = BW / taup
t ∈ [-taup/2, taup/2]
s(t) = exp(j * π * Kr * t²)  (baseband)
```

---

## 2. 시간 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `prf`, `PRF` | 펄스 반복 주파수 (Pulse Repetition Frequency) | Hz | - | `config.prf` |
| `pri`, `PRI` | 펄스 반복 간격 (Pulse Repetition Interval) | s | `pri = 1 / prf` | `config.pri` |
| `swst` | 샘플링 윈도우 시작 시간 (Sampling Window Start Time) | s | - | `config.swst` |
| `swl` | 샘플링 윈도우 길이 (Sampling Window Length) | s | - | `config.swl` |
| `swet` | 샘플링 윈도우 종료 시간 (Sampling Window End Time) | s | `swet = swst + swl` | `config.swet` |
| `td` | 시간 지연 (Time Delay) | s | `td = R_2way / c` | - |
| `td_amb` | 모호한 시간 지연 (Ambiguous Time Delay) | s | `td_amb = td % pri` | - |
| `t_tx` | 송신 시간 (Transmit Time) | s | - | - |
| `t_rx` | 수신 시간 (Receive Time) | s | - | - |
| `rank` | Rank (펄스 번호) | - | `rank = ceil((2*R/c - swst) * prf)` | - |

### 시간 지연 계산

```python
td = R_2way / LIGHT_SPEED
td_amb = td % pri
```

**수학적 표현:**
```
td = R_2way / c
td_amb = td mod PRI
```

---

## 3. 거리 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `R` | 거리 (Range) | m | `R = ||sat_pos - target_pos||` | - |
| `R_2way` | 왕복 거리 (2-way Range) | m | `R_2way = R_tx + R_rx` | - |
| `R_tx` | 송신 거리 (Transmit Range) | m | - | - |
| `R_rx` | 수신 거리 (Receive Range) | m | - | - |
| `rs0` | 슬란트 거리 (Slant Range) | m | - | - |
| `rg0` | 지상 거리 (Ground Range) | m | - | - |
| `distance` | 거리 (일반적) | m | - | - |
| `min_dist_swst` | SWST에서의 최소 거리 | m | `0.5 * c * (rank/prf + swst)` | - |
| `max_dist_swet` | SWET에서의 최대 거리 | m | `0.5 * c * (rank/prf + swst + swl - taup)` | - |

### 거리 계산

```python
R = np.linalg.norm(target_position - satellite_position)
R_2way = 2.0 * R  # 송수신 동일 위치 가정
```

**수학적 표현:**
```
R = ||r_target - r_satellite||
R_2way = R_tx + R_rx = 2R  (monostatic case)
```

---

## 4. 신호 세기 및 전파 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `Pt` | 송신 전력 (Transmit Power) | W | - | `config.Pt` |
| `G_tx` | 송신 안테나 게인 (Transmit Antenna Gain) | - | - | - |
| `G_rx`, `gr` | 수신 안테나 게인 (Receive Antenna Gain) | - | - | `config.G_recv` |
| `ant_gain` | 안테나 게인 (Antenna Gain) | - | - | - |
| `loss` | 손실 (Loss) | - | `loss = NF + Loss` | `config.get_loss_linear()` |
| `loss_linear` | 손실 (선형 스케일) | - | `10^((NF + Loss) / 10)` | `config.get_loss_linear()` |
| `NF` | 노이즈 지수 (Noise Figure) | dB | - | `config.NF` |
| `Loss` | 시스템 손실 (System Loss) | dB | - | `config.Loss` |
| `Tsys`, `tsys` | 시스템 온도 (System Temperature) | K | - | `config.Tsys` |
| `noise_threshold` | 노이즈 임계값 | - | `sqrt(k_B * Tsys / N / num_pulses)` | `config.get_noise_threshold()` |
| `c`, `c1` | 신호 계수 (Signal Coefficient) | - | `c = sqrt(Pt * λ² * G² / (4π)³ * R⁴ * σ)` | - |
| `coeff` | 최종 계수 (Final Coefficient) | - | `coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)` | - |
| `σ`, `sigma` | 반사도 (Reflectivity/RCS) | m² | - | `target.reflectivity` |
| `atmospheric_loss` | 대기 손실 (Atmospheric Loss) | - | 기본값: 1 | - |
| `path_loss` | 경로 손실 (Path Loss) | - | `(λ / (4π * R))²` | `calc_path_loss()` |

### Echo 신호 세기 계산 수식

```python
# 손실을 선형 스케일로 변환
loss_linear = 10.0 ** ((NF + Loss) / 10.0)

# 기본 계수
c1 = Pt * λ² * G² / ((4π)³ * loss_linear * atmospheric_loss)

# 타겟별 계수
c = sqrt(c1 * σ / (R_2way/2)⁴)

# 최종 계수
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
```

**수학적 표현:**
```
L = 10^((NF + Loss) / 10)  (dB → linear)
c1 = (Pt * λ² * G²) / ((4π)³ * L * L_atm)
c = sqrt(c1 * σ / (R_2way/2)⁴)
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
```

여기서:
- `L`: 시스템 손실 (linear scale, `loss_linear`)
- `L_atm`: 대기 손실 (`atmospheric_loss`)
- `σ`: 타겟 반사도 (RCS)

### 경로 손실 계산

경로 손실은 자유 공간 전파 손실을 나타냅니다:

```python
path_loss = (wavelength / (4.0 * PI * (range_2way / 2.0))) ** 2
```

**수학적 표현:**
```
L_path = (λ / (4π * R))²
```

여기서:
- `λ`: 파장
- `R`: 단방향 거리 (`R_2way / 2`)

---

## 5. 기하학 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `el_angle` | 고도각 (Elevation Angle) | deg/rad | - | - |
| `az_angle` | 방위각 (Azimuth Angle) | deg/rad | - | - |
| `beamwidth_el` | 고도 빔폭 (Elevation Beamwidth) | deg/rad | `λ / antenna_height` | `config.beamwidth_el` |
| `beamwidth_az` | 방위 빔폭 (Azimuth Beamwidth) | deg/rad | `λ / antenna_width` | `config.beamwidth_az` |
| `beamwidth_h` | 수평 빔폭 (Horizontal Beamwidth) | deg/rad | - | - |
| `look_angle` | 관측각 (Look Angle) | deg/rad | - | - |
| `squint_angle` | 스퀸트 각 (Squint Angle) | deg/rad | - | - |
| `incidence_angle` | 입사각 (Incidence Angle) | deg/rad | - | - |
| `beam_vector` | 빔 벡터 (Beam Vector) | - | 3D 벡터 `[x, y, z]` | - |
| `beam_direction` | 빔 방향 벡터 (Beam Direction Vector) | - | 정규화된 벡터 `[x, y, z]` | `beam_direction` |
| `bus_roll_angle`, `bus_roll_deg` | 버스 롤 각도 (Bus Roll Angle) | deg | - | - |
| `bus_pitch_angle`, `bus_pitch_deg` | 버스 피치 각도 (Bus Pitch Angle) | deg | - | - |
| `bus_yaw_angle`, `bus_yaw_deg` | 버스 요 각도 (Bus Yaw Angle) | deg | - | - |
| `ant_roll_angle`, `ant_roll_deg` | 안테나 롤 각도 (Antenna Roll Angle) | deg | - | `config.antenna_roll_angle` |
| `ant_yaw_angle`, `ant_yaw_deg` | 안테나 요 각도 (Antenna Yaw Angle) | deg | - | `config.antenna_yaw_angle` |
| `target_vectors` | 타겟 방향 벡터 (Target Direction Vectors) | m | `target_positions - satellite_position` | shape: `[num_targets, 3]` |
| `target_distances` | 타겟까지의 거리 (Target Distances) | m | `||target_vectors||` | shape: `[num_targets]` |
| `target_directions` | 타겟 방향 (정규화) (Target Directions) | - | `target_vectors / target_distances` | shape: `[num_targets, 3]` |
| `cos_angle` | 빔 방향과 타겟 방향의 코사인 각도 | - | `dot(target_directions, beam_direction)` | - |
| `angle` | 빔 방향과 타겟 방향의 각도 | rad | `arccos(clip(cos_angle, -1, 1))` | - |

### 빔폭 계산

```python
beamwidth_az = (wavelength / antenna_width) * RAD2DEG
beamwidth_el = (wavelength / antenna_height) * RAD2DEG
```

**수학적 표현:**
```
θ_az ≈ λ / D_az  (radians)
θ_el ≈ λ / D_el  (radians)
```

### 안테나 게인 계산 과정

안테나 게인 계산에 사용되는 중간 변수들:

```python
# 타겟 방향 벡터 계산
target_vectors = target_positions - satellite_position
target_distances = np.linalg.norm(target_vectors, axis=1)
target_directions = target_vectors / target_distances[:, np.newaxis]

# 빔 방향과의 각도 계산
cos_angle = np.dot(target_directions, beam_direction)
angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))

# 가우시안 빔 모델로 게인 계산
gain = max_gain * np.exp(-2.0 * (angle ** 2) / ((np.deg2rad(beamwidth_el) / 2) ** 2))
```

**수학적 표현:**
```
r_target = target_positions - satellite_position
d_target = ||r_target||
û_target = r_target / d_target

cos(θ) = û_target · û_beam
θ = arccos(cos(θ))

G(θ) = G_max * exp(-2 * (θ / (θ_el/2))²)
```

---

## 6. 위성 및 궤도 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `orbit_height` | 궤도 높이 (Orbit Height) | m | - | `config.orbit_height` |
| `V`, `Vst` | 유효 비행 속도 (Effective Flight Speed) | m/s | - | - |
| `pos_t`, `satellite_position` | 위성 위치 (Satellite Position) | m | ECEF 좌표 `[x, y, z]` | `satellite_position` |
| `vel_t`, `satellite_velocity` | 위성 속도 (Satellite Velocity) | m/s | ECEF 좌표 `[vx, vy, vz]` | `satellite_velocity` |
| `beam_direction` | 빔 방향 벡터 (Beam Direction Vector) | - | 정규화된 벡터 `[x, y, z]` | `beam_direction` |
| `att_t` | 위성 자세 (Satellite Attitude) | - | Quaternion `[q0, q1, q2, q3]` | - |
| `angv_t` | 각속도 (Angular Velocity) | rad/s | `[ωx, ωy, ωz]` | - |
| `sat_pos` | 위성 위치 (간단 표기) | m | ECEF 좌표 `[x, y, z]` | `satellite_position`과 동일 |
| `sat_vel` | 위성 속도 (간단 표기) | m/s | ECEF 좌표 `[vx, vy, vz]` | `satellite_velocity`와 동일 |
| `satellite_direction` | 위성 진행 방향 (Satellite Direction) | - | `velocity / ||velocity||` | 정규화된 속도 벡터 |
| `X`, `Y`, `Z` | 위성 좌표계 방향 벡터 | - | `calc_direction_vector(pos, vel)` | `[X, Y, Z]` - X는 속도 방향 |
| `latitude`, `lat` | 위도 (Latitude) | deg | ECEF → 지리 좌표 변환 | - |
| `longitude`, `lon` | 경도 (Longitude) | deg | ECEF → 지리 좌표 변환 | - |
| `altitude`, `height`, `h` | 고도 (Altitude/Height) | m | ECEF → 지리 좌표 변환 | - |

### 위성 위치 및 방향 계산

**중요:** `sat_pos` 또는 `satellite_position`는 **ECEF 좌표 `[x, y, z]` (미터)**로 주어지며, 이를 통해 다음을 모두 계산할 수 있습니다:

1. **거리 계산**: 타겟까지의 거리 (`R = ||target_position - satellite_position||`)
2. **안테나 게인 계산**: 타겟 방향 벡터 계산에 사용
3. **빔 방향 계산**: 기본 빔 방향 (nadir 방향) 계산
4. **지리 좌표 변환**: 위도, 경도, 고도로 변환 가능

위성 위치와 방향은 Echo 신호 계산에 직접 사용됩니다:

**ECEF 좌표에서 지리 좌표 변환:**
위성 위치가 ECEF 좌표 `[x, y, z]` (미터)로 주어지면, 이를 위도/경도/고도로 변환할 수 있습니다:

```python
def ecef_to_llh_wgs84(xyz_m):
    """ECEF 좌표 [x, y, z] (m) → [위도(deg), 경도(deg), 고도(m)]"""
    x, y, z = float(xyz_m[0]), float(xyz_m[1]), float(xyz_m[2])
    
    # 경도 계산
    lon = np.arctan2(y, x)
    p = np.hypot(x, y)
    
    # 위도 계산 (반복법)
    lat = np.arctan2(z, p * (1.0 - WGS84_E2))
    for _ in range(6):
        sin_lat = np.sin(lat)
        N = WGS84_A / np.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
        h = p / np.cos(lat) - N
        lat = np.arctan2(z, p * (1.0 - WGS84_E2 * (N / (N + h))))
    
    # 최종 고도 계산
    sin_lat = np.sin(lat)
    N = WGS84_A / np.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)
    h = p / np.cos(lat) - N
    
    lat_deg = lat * 180.0 / np.pi
    lon_deg = lon * 180.0 / np.pi
    return np.array([lat_deg, lon_deg, h], dtype=np.double)
```

**수학적 표현:**
```
lon = arctan2(y, x)
p = √(x² + y²)
lat = arctan2(z, p * (1 - e²))  (반복법으로 정밀도 향상)
h = p / cos(lat) - N
```

여기서:
- `WGS84_A = 6378137.0` (m): 지구 장반경
- `WGS84_F = 1/298.257223563`: 편평률
- `WGS84_E2 = F * (2 - F)`: 이심률 제곱
- `N = A / √(1 - e² * sin²(lat))`: 곡률 반경

**위성 진행 방향 계산:**
위성의 속도 벡터가 바로 위성이 나아가는 방향을 나타냅니다:

```python
# 속도 벡터를 정규화하여 단위 방향 벡터로 변환
satellite_direction = satellite_velocity / np.linalg.norm(satellite_velocity)
```

**수학적 표현:**
```
û_satellite = v_satellite / ||v_satellite||
```

여기서:
- `v_satellite`: 위성 속도 벡터 `[vx, vy, vz]`
- `û_satellite`: 정규화된 위성 진행 방향 벡터

**위성 좌표계 방향 벡터 (원본 코드):**
원본 코드에서는 `calc_direction_vector(pos, vel)` 함수를 사용하여 위성 좌표계의 3개 방향 벡터를 계산합니다:

```python
X, Y, Z = calc_direction_vector(satellite_position, satellite_velocity)
# X: 속도 방향 (위성이 나아가는 방향)
# Y: 수직 방향 (위성 좌표계)
# Z: 수직 방향 (위성 좌표계)
```

**거리 계산:**
```python
R = np.linalg.norm(target_position - satellite_position)
```

**빔 방향 (기본값):**
```python
if beam_direction is None:
    # 지구 중심 방향 (nadir 방향)
    beam_direction = -satellite_position / np.linalg.norm(satellite_position)
```

**안테나 게인 계산:**
```python
ant_gain = calc_antenna_gain_simple(
    target_positions,
    satellite_position,
    beam_direction,
    beamwidth_el,
    beamwidth_az
)
```

**대기 손실 계산:**
```python
atmospheric_loss = calc_atmospheric_loss(beam_direction, satellite_position)
```

---

## 7. 타겟 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `target_list` | 타겟 리스트 | - | `[x, y, z, reflectivity, phase]` | `TargetList` |
| `target_pos` | 타겟 위치 (Target Position) | m | ECEF 좌표 | `target.position` |
| `reflectivity` | 반사도 (Reflectivity) | - | - | `target.reflectivity` |
| `phase` | 위상 (Phase) | deg/rad | - | `target.phase` |
| `num_targets` | 타겟 개수 | - | - | `len(target_list)` |

### 타겟 배열 구조

```python
target_array = [
    [x1, y1, z1, reflectivity1, phase1],
    [x2, y2, z2, reflectivity2, phase2],
    ...
]
```

---

## 8. SAR 시스템 파라미터

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `wavelength`, `λ` | 파장 (Wavelength) | m | `λ = c / fc` | `config.wavelength` |
| `antenna_width` | 안테나 폭 (Antenna Width) | m | - | `config.antenna_width` |
| `antenna_height` | 안테나 높이 (Antenna Height) | m | - | `config.antenna_height` |
| `BW_fd` | 도플러 대역폭 (Doppler Bandwidth) | Hz | `BW_fd = 2*V/λ * beamwidth_az` | - |
| `dR` | 거리 해상도 (Range Resolution) | m | `dR = c / (2 * BW)` | - |
| `azimuth_sampling_interval` | 방위 샘플링 간격 | m | `azimuth_sampling_interval = pri * V` | - |
| `max_ambiguity_number` | 최대 모호성 번호 | - | `ceil(orbit_height * 4 / (c * pri))` | - |

### 해상도 계산

**거리 해상도:**
```
dR = c / (2 * BW)
```

**방위 해상도:**
```
dAz = V / BW_fd = λ / (2 * beamwidth_az)
```

**도플러 대역폭:**
```
BW_fd = 2 * V / λ * beamwidth_az
```

---

## 9. 데이터 배열 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `N` | 범위 샘플 수 (Range Samples) | - | `N = num_samples` | `config.num_samples` |
| `n` | Chirp 내 샘플 수 (Samples in Chirp) | - | `n = num_samples_in_chirp` | `config.num_samples_in_chirp` |
| `num_pulses` | 펄스 개수 (Number of Pulses) | - | - | - |
| `num_samples` | 샘플 개수 (Number of Samples) | - | `int(swl * fs)` | `config.num_samples` |
| `num_range_samples` | 범위 샘플 수 | - | - | - |
| `num_azimuth_samples` | 방위 샘플 수 | - | - | - |
| `sig` | Echo 신호 (Echo Signal) | - | `complex64` 배열 | `echo_signal` |
| `raw_data` | 원시 데이터 (Raw Data) | - | `[num_pulses, num_samples]` | - |
| `sample_pos` | 샘플 위치 (Sample Position) | - | `(td_amb - swst) * fs` | - |
| `idx0`, `idx1` | 샘플 인덱스 | - | - | - |
| `chirp_index` | Chirp 인덱스 | - | `((idx0 - sample_pos) * chirp_set_size)` | - |
| `valid_mask` | 유효 타겟 마스크 (Valid Target Mask) | - | `c > noise_threshold` | boolean 배열, shape: `[num_targets]` |
| `valid_indices` | 유효 타겟 인덱스 (Valid Target Indices) | - | `where(valid_mask)[0]` | 정수 배열 |

### 데이터 배열 구조

**Chirp 신호:**
```python
chirp_signal: np.ndarray  # shape: [num_samples_in_chirp], dtype: complex64
```

**Echo 신호 (단일 펄스):**
```python
echo_signal: np.ndarray  # shape: [num_samples], dtype: complex64
```

**Echo 신호 (여러 펄스):**
```python
echo_signals: np.ndarray  # shape: [num_pulses, num_samples], dtype: complex64
```

### 유효성 검사

Echo 신호 생성 시 노이즈 임계값 이상인 타겟만 처리합니다:

```python
# 노이즈 임계값 계산
noise_threshold = config.get_noise_threshold(num_pulses=1)

# 유효한 타겟 선택 (신호 계수가 임계값 이상)
valid_mask = c > noise_threshold
valid_indices = np.where(valid_mask)[0]

# 유효한 타겟에 대해서만 Echo 신호 생성
for idx in valid_indices:
    # Echo 신호 계산...
```

---

## 10. 물리 상수

| 상수명 | 설명 | 값 | 단위 | 코드에서 사용 |
|--------|------|-----|------|---------------|
| `c`, `LIGHT_SPEED` | 빛의 속도 | 299792458 | m/s | `LIGHT_SPEED` |
| `k_B`, `BOLZMAN_CONST` | 볼츠만 상수 | 1.380649e-23 | J/K | `BOLZMAN_CONST` |
| `pi`, `π` | 원주율 | 3.14159265359 | - | `PI` |

### 각도 변환 상수

| 상수명 | 값 | 설명 |
|--------|-----|------|
| `DEG2RAD` | π / 180 | 도를 라디안으로 변환 |
| `RAD2DEG` | 180 / π | 라디안을 도로 변환 |

---

## 11. 주요 수식 정리

### 11.1 Chirp 신호 생성

**수학적 표현:**
```
Kr = BW / taup
t ∈ [-taup/2, taup/2]
s(t) = exp(j * π * Kr * t²)  (baseband)
```

**Python 구현:**
```python
chirp_rate = bw / taup
t = np.linspace(-taup/2, taup/2, int(taup * fs))
chirp_signal = np.exp(1j * PI * chirp_rate * t**2)
```

### 11.2 Echo 신호 생성

**수학적 표현:**
```
R_2way = R_tx + R_rx = 2R  (monostatic)
td = R_2way / c
td_amb = td mod PRI

c1 = (Pt * λ² * G²) / ((4π)³ * L * L_atm)
c = sqrt(c1 * σ / (R_2way/2)⁴)
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)

echo(t) = Σ chirp(t - td_i) * coeff_i
```

**Python 구현:**
```python
# 손실을 선형 스케일로 변환
loss_linear = 10.0 ** ((NF + Loss) / 10.0)

# 거리 및 시간 지연 계산
R_2way = 2.0 * R
td = R_2way / LIGHT_SPEED
td_amb = td % pri

# 안테나 게인 계산
target_vectors = target_positions - satellite_position
target_distances = np.linalg.norm(target_vectors, axis=1)
target_directions = target_vectors / target_distances[:, np.newaxis]
cos_angle = np.dot(target_directions, beam_direction)
angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
ant_gain = max_gain * np.exp(-2.0 * (angle ** 2) / ((np.deg2rad(beamwidth_el) / 2) ** 2))

# 신호 계수 계산
c1 = (Pt * wavelength**2 * ant_gain**2) / ((4*PI)**3 * loss_linear * atmospheric_loss)
c = np.sqrt(c1 * reflectivity / (R_2way/2)**4)

# 유효성 검사
noise_threshold = np.sqrt(BOLZMAN_CONST * Tsys / num_samples / num_pulses)
valid_mask = c > noise_threshold
valid_indices = np.where(valid_mask)[0]

# 유효한 타겟에 대해 Echo 신호 생성
for idx in valid_indices:
    coeff = c[idx] * np.exp(-1j*2*PI*fc*td[idx]) * np.sqrt(G_rx)
    sample_pos = (td_amb[idx] - swst) * fs
    idx0 = int(np.ceil(sample_pos))
    idx1 = idx0 + len(chirp_signal)
    echo_signal[idx0:idx1] += chirp_signal * coeff
```

### 11.3 거리 해상도

```
dR = c / (2 * BW)
```

### 11.4 도플러 대역폭

```
BW_fd = 2 * V / λ * beamwidth_az
```

### 11.5 Rank 계산

```
rank = ceil((2*R/c - swst) * prf)
```

### 11.6 손실 변환 (dB → Linear)

```
L_linear = 10^((NF + Loss) / 10)
```

여기서:
- `NF`: 노이즈 지수 (dB)
- `Loss`: 시스템 손실 (dB)
- `L_linear`: 선형 스케일 손실 (`loss_linear`)

### 11.7 안테나 게인 계산

```
r_target = target_positions - satellite_position
d_target = ||r_target||
û_target = r_target / d_target

cos(θ) = û_target · û_beam
θ = arccos(clip(cos(θ), -1, 1))

G(θ) = G_max * exp(-2 * (θ / (θ_el/2))²)
```

여기서:
- `r_target`: 타겟 방향 벡터 (`target_vectors`)
- `d_target`: 타겟까지의 거리 (`target_distances`)
- `û_target`: 정규화된 타겟 방향 (`target_directions`)
- `û_beam`: 빔 방향 벡터 (`beam_direction`)
- `θ`: 빔 방향과 타겟 방향의 각도 (`angle`)
- `θ_el`: 고도 빔폭 (`beamwidth_el`)
- `G_max`: 최대 게인

### 11.8 노이즈 임계값

```
noise_threshold = sqrt(k_B * Tsys / N / num_pulses)
```

여기서:
- `k_B`: 볼츠만 상수
- `Tsys`: 시스템 온도
- `N`: 샘플 수 (`num_samples`)
- `num_pulses`: 펄스 개수

---

## 12. 변수명 네이밍 컨벤션

### 12.1 규칙

1. **물리량**: 소문자 사용 (예: `fc`, `bw`, `taup`)
2. **상수**: 대문자 사용 (예: `LIGHT_SPEED`, `BOLZMAN_CONST`)
3. **배열/리스트**: 복수형 또는 `_ar` 접미사 (예: `target_list`, `pos_t_ar`)
4. **각도**: `_deg` 또는 `_rad` 접미사로 단위 명시 (예: `el_angle_deg`)
5. **시간**: `_t` 접미사 (예: `pos_t`, `vel_t`)
6. **계수**: `c`, `c1`, `coeff` 등 간단한 이름 사용

### 12.2 코드에서의 사용 예

```python
# 설정
config = SarSystemConfig(
    fc=5.4e9,      # 반송파 주파수
    bw=150e6,      # 대역폭
    taup=10e-6,    # 펄스 폭
    fs=250e6,      # 샘플링 주파수
    prf=5000       # PRF
)

# 파생 파라미터 접근
wavelength = config.wavelength      # 파장
pri = config.pri                    # PRI
chirp_rate = config.chirp_rate     # Chirp rate
dt = config.dt                      # 샘플링 간격

# 거리 계산
R = calc_distance_to_target(target_positions, satellite_position)
R_2way = 2.0 * R

# 시간 지연
td = R_2way / LIGHT_SPEED
td_amb = td % config.pri
```

---

## 13. 참고 자료

- SAR 원리: Synthetic Aperture Radar (SAR) 기본 원리
- 레이더 방정식: Radar Range Equation
- LFM Chirp: Linear Frequency Modulated (LFM) Chirp Signal
- 도플러 효과: Doppler Effect in SAR

---

---

## 14. 변경 이력

- 2026-01-24: 초기 문서 작성
- 기존 코드(`echo_sim_cmd_2026_0109_정해찬/`) 분석 기반으로 작성
- 2026-01-24: 백엔드 코드 분석 기반 변수 추가
  - 섹션 4: `loss_linear`, `path_loss` 추가
  - 섹션 5: 안테나 게인 계산 중간 변수 추가 (`target_vectors`, `target_distances`, `target_directions`, `cos_angle`, `angle`)
  - 섹션 9: 유효성 검사 변수 추가 (`valid_mask`, `valid_indices`)
  - 섹션 11: 손실 변환 및 안테나 게인 계산 과정 보완
