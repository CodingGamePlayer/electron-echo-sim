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
| `NF` | 노이즈 지수 (Noise Figure) | - | - | `config.NF` |
| `Loss` | 시스템 손실 (System Loss) | - | - | `config.Loss` |
| `Tsys`, `tsys` | 시스템 온도 (System Temperature) | K | - | `config.Tsys` |
| `noise_threshold` | 노이즈 임계값 | - | `sqrt(k_B * Tsys / N / num_pulses)` | `config.get_noise_threshold()` |
| `c`, `c1` | 신호 계수 (Signal Coefficient) | - | `c = sqrt(Pt * λ² * G² / (4π)³ * R⁴ * σ)` | - |
| `coeff` | 최종 계수 (Final Coefficient) | - | `coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)` | - |
| `σ`, `sigma` | 반사도 (Reflectivity/RCS) | m² | - | `target.reflectivity` |
| `atmospheric_loss` | 대기 손실 (Atmospheric Loss) | - | 기본값: 1 | - |

### Echo 신호 세기 계산 수식

```python
# 기본 계수
c1 = Pt * λ² * G² / ((4π)³ * loss * atmospheric_loss)

# 타겟별 계수
c = sqrt(c1 * σ / (R_2way/2)⁴)

# 최종 계수
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
```

**수학적 표현:**
```
c1 = (Pt * λ² * G²) / ((4π)³ * L * L_atm)
c = sqrt(c1 * σ / (R_2way/2)⁴)
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
```

여기서:
- `L`: 시스템 손실 (linear scale)
- `L_atm`: 대기 손실
- `σ`: 타겟 반사도 (RCS)

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
| `beam_vector` | 빔 벡터 (Beam Vector) | - | 3D 벡터 | - |
| `bus_roll_deg` | 버스 롤 각도 | deg | - | - |
| `bus_pitch_deg` | 버스 피치 각도 | deg | - | - |
| `bus_yaw_deg` | 버스 요 각도 | deg | - | - |
| `ant_roll_deg` | 안테나 롤 각도 | deg | - | `config.antenna_roll_angle` |
| `ant_pitch_deg` | 안테나 피치 각도 | deg | - | `config.antenna_pitch_angle` |
| `ant_yaw_deg` | 안테나 요 각도 | deg | - | `config.antenna_yaw_angle` |

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

---

## 6. 위성 및 궤도 관련 변수

| 변수명 | 설명 | 단위 | 수식/관계 | 코드에서 사용 |
|--------|------|------|-----------|---------------|
| `orbit_height` | 궤도 높이 (Orbit Height) | m | - | `config.orbit_height` |
| `V`, `Vst` | 유효 비행 속도 (Effective Flight Speed) | m/s | - | - |
| `pos_t` | 위성 위치 (Satellite Position) | m | ECEF 좌표 | `satellite_position` |
| `vel_t` | 위성 속도 (Satellite Velocity) | m/s | ECEF 좌표 | `satellite_velocity` |
| `att_t` | 위성 자세 (Satellite Attitude) | - | Quaternion | - |
| `angv_t` | 각속도 (Angular Velocity) | rad/s | - | - |
| `sat_pos` | 위성 위치 (간단 표기) | m | - | - |
| `sat_vel` | 위성 속도 (간단 표기) | m/s | - | - |

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
R_2way = 2.0 * R
td = R_2way / LIGHT_SPEED
td_amb = td % pri

c1 = (Pt * wavelength**2 * ant_gain**2) / ((4*PI)**3 * loss * atmospheric_loss)
c = np.sqrt(c1 * reflectivity / (R_2way/2)**4)
coeff = c * np.exp(-1j*2*PI*fc*td) * np.sqrt(G_rx)

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

### 11.6 노이즈 임계값

```
noise_threshold = sqrt(k_B * Tsys / N / num_pulses)
```

여기서:
- `k_B`: 볼츠만 상수
- `Tsys`: 시스템 온도
- `N`: 샘플 수
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

## 14. 변경 이력

- 2026-01-24: 초기 문서 작성
- 기존 코드(`echo_sim_cmd_2026_0109_정해찬/`) 분석 기반으로 작성
