# 함수 및 메서드 참조 문서

SAR Simulator의 모든 함수와 메서드를 아키텍처별로 정리한 문서입니다.

## 목차

1. [Common 모듈](#1-common-모듈)
   - [constants.py](#constantspy)
   - [sar_system_config.py](#sar_system_configpy)
   - [target_model.py](#target_modelpy)
   - [geometry_utils.py](#geometry_utilspy)
   - [propagation_model.py](#propagation_modelpy)
2. [Sensor 모듈](#2-sensor-모듈)
   - [chirp_generator.py](#chirp_generatorpy)
   - [sensor_simulator.py](#sensor_simulatorpy)
3. [Echo 모듈](#3-echo-모듈)
   - [echo_generator.py](#echo_generatorpy)
   - [echo_simulator.py](#echo_simulatorpy)
4. [IO 모듈](#4-io-모듈)
   - [raw_data_writer.py](#raw_data_writerpy)

---

## 1. Common 모듈

### constants.py

물리 상수 정의 모듈입니다.

#### 상수

| 상수명 | 타입 | 값 | 설명 |
|--------|------|-----|------|
| `LIGHT_SPEED` | `float` | 299792458.0 | 빛의 속도 (m/s) |
| `BOLZMAN_CONST` | `float` | 1.380649e-23 | 볼츠만 상수 (J/K) |
| `PI` | `float` | np.pi | 원주율 |
| `DEG2RAD` | `float` | π / 180.0 | 도를 라디안으로 변환 |
| `RAD2DEG` | `float` | 180.0 / π | 라디안을 도로 변환 |

---

### sar_system_config.py

SAR 시스템 설정을 관리하는 모듈입니다.

#### 클래스: `SarSystemConfig`

SAR 시스템의 모든 파라미터를 포함하는 데이터 클래스입니다.

##### 생성자

```python
SarSystemConfig(
    fc: float,                    # 반송파 주파수 (Hz)
    bw: float,                    # 대역폭 (Hz)
    fs: float,                    # 샘플링 주파수 (Hz)
    taup: float,                  # 펄스 폭 (s)
    prf: float,                   # 펄스 반복 주파수 (Hz)
    swst: float,                  # 샘플링 윈도우 시작 시간 (s)
    swl: float,                   # 샘플링 윈도우 길이 (s)
    orbit_height: float,          # 궤도 높이 (m)
    antenna_width: float,         # 안테나 폭 (m)
    antenna_height: float,        # 안테나 높이 (m)
    antenna_roll_angle: float = 0.0,    # 안테나 롤 각도 (deg)
    antenna_pitch_angle: float = 0.0,   # 안테나 피치 각도 (deg)
    antenna_yaw_angle: float = 0.0,     # 안테나 요 각도 (deg)
    Pt: float = 1000.0,          # 송신 전력 (W)
    G_recv: float = 1.0,          # 수신 안테나 게인
    NF: float = 3.0,             # 노이즈 지수 (dB)
    Loss: float = 2.0,            # 시스템 손실 (dB)
    Tsys: float = 290.0,          # 시스템 온도 (K)
    adc_bits: int = 12,           # ADC 비트 수
    beam_id: str = "Beam0000"     # 빔 ID
)
```

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `__post_init__()` | `None` | 초기화 후 검증 및 파생 파라미터 계산 |
| `_validate()` | `None` | 파라미터 유효성 검증 (나이키스트 샘플링 등) |
| `_calculate_derived_params()` | `None` | 파생 파라미터 계산 (파장, PRI, chirp_rate 등) |
| `get_loss_linear()` | `float` | 손실을 선형 스케일로 변환 |
| `get_noise_threshold(num_pulses: int)` | `float` | 노이즈 임계값 계산 |

##### 계산된 속성 (파생 파라미터)

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `wavelength` | `float` | 파장 (m) = c / fc |
| `pri` | `float` | 펄스 반복 간격 (s) = 1 / prf |
| `chirp_rate` | `float` | Chirp rate (Hz/s) = bw / taup |
| `dt` | `float` | 샘플링 간격 (s) = 1 / fs |
| `num_samples_in_chirp` | `int` | Chirp 내 샘플 수 = int(taup * fs) |
| `num_samples` | `int` | 샘플 개수 = int(swl * fs) |
| `swet` | `float` | 샘플링 윈도우 종료 시간 (s) = swst + swl |
| `beamwidth_az` | `float` | 방위 빔폭 (deg) = (λ / antenna_width) * RAD2DEG |
| `beamwidth_el` | `float` | 고도 빔폭 (deg) = (λ / antenna_height) * RAD2DEG |

---

### target_model.py

타겟 모델 정의 모듈입니다.

#### 클래스: `Target`

단일 타겟을 정의하는 데이터 클래스입니다.

##### 생성자

```python
Target(
    position: np.ndarray,      # 타겟 위치 (ECEF 좌표, shape: [3], 단위: m)
    reflectivity: float = 1.0, # 반사도 (RCS, 단위: m²)
    phase: float = 0.0         # 위상 (단위: deg)
)
```

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `__post_init__()` | `None` | 초기화 후 검증 (position shape 확인) |

#### 클래스: `TargetList`

여러 타겟을 관리하는 클래스입니다.

##### 생성자

```python
TargetList(targets: List[Target] = None)
```

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `add_target(target: Target)` | `None` | 단일 타겟 추가 |
| `add_targets(targets: List[Target])` | `None` | 여러 타겟 추가 |
| `to_array()` | `np.ndarray` | 타겟 리스트를 배열로 변환 (shape: [num_targets, 5]) |
| `from_array(array: np.ndarray)` | `TargetList` | 배열로부터 TargetList 생성 (클래스 메서드) |
| `__len__()` | `int` | 타겟 개수 반환 |
| `__getitem__(index: int)` | `Target` | 인덱스로 타겟 접근 |

---

### geometry_utils.py

기하학 계산 유틸리티 모듈입니다.

#### 함수

| 함수명 | 반환 타입 | 설명 |
|--------|-----------|------|
| `calc_distance_to_target(target_positions, satellite_position, satellite_position_rx=None)` | `np.ndarray` | 위성에서 타겟까지의 거리 계산 (shape: [num_targets], 단위: m) |
| `calc_2way_range(target_positions, satellite_position_tx, satellite_position_rx)` | `np.ndarray` | 왕복 거리 계산 (shape: [num_targets], 단위: m) |
| `calc_time_delay(range_2way)` | `np.ndarray` | 시간 지연 계산 (shape: [num_targets], 단위: s) |
| `calc_ambiguous_time_delay(time_delay, pri)` | `np.ndarray` | 모호한 시간 지연 계산 (PRI 모듈로, shape: [num_targets], 단위: s) |
| `calc_antenna_gain_simple(target_positions, satellite_position, beam_direction, beamwidth_el, beamwidth_az, max_gain=1.0)` | `np.ndarray` | 간단한 안테나 게인 계산 (가우시안 빔 모델, shape: [num_targets]) |

##### 함수 상세

**`calc_distance_to_target`**
```python
calc_distance_to_target(
    target_positions: np.ndarray,        # 타겟 위치 배열 (shape: [num_targets, 3])
    satellite_position: np.ndarray,      # 위성 위치 (shape: [3])
    satellite_position_rx: Optional[np.ndarray] = None  # 수신기 위치 (None이면 송신기와 동일)
) -> np.ndarray
```

**`calc_2way_range`**
```python
calc_2way_range(
    target_positions: np.ndarray,        # 타겟 위치 배열 (shape: [num_targets, 3])
    satellite_position_tx: np.ndarray,   # 송신기 위치 (shape: [3])
    satellite_position_rx: np.ndarray    # 수신기 위치 (shape: [3])
) -> np.ndarray
```

**`calc_time_delay`**
```python
calc_time_delay(
    range_2way: np.ndarray  # 왕복 거리 배열 (shape: [num_targets], 단위: m)
) -> np.ndarray
# 반환: 시간 지연 배열 (shape: [num_targets], 단위: s) = range_2way / LIGHT_SPEED
```

**`calc_ambiguous_time_delay`**
```python
calc_ambiguous_time_delay(
    time_delay: np.ndarray,  # 시간 지연 배열 (shape: [num_targets], 단위: s)
    pri: float               # 펄스 반복 간격 (단위: s)
) -> np.ndarray
# 반환: 모호한 시간 지연 배열 (shape: [num_targets], 단위: s) = time_delay % pri
```

**`calc_antenna_gain_simple`**
```python
calc_antenna_gain_simple(
    target_positions: np.ndarray,    # 타겟 위치 배열 (shape: [num_targets, 3])
    satellite_position: np.ndarray,  # 위성 위치 (shape: [3])
    beam_direction: np.ndarray,      # 빔 방향 벡터 (shape: [3])
    beamwidth_el: float,             # 고도 빔폭 (단위: deg)
    beamwidth_az: float,             # 방위 빔폭 (단위: deg)
    max_gain: float = 1.0            # 최대 게인
) -> np.ndarray
# 반환: 안테나 게인 배열 (shape: [num_targets])
```

---

### propagation_model.py

전파 모델 모듈입니다.

#### 함수

| 함수명 | 반환 타입 | 설명 |
|--------|-----------|------|
| `calc_atmospheric_loss(beam_vector=None, satellite_position=None)` | `float` | 대기 손실 계산 (현재는 1.0 반환, 향후 모델 추가 예정) |
| `calc_path_loss(range_2way, wavelength)` | `np.ndarray` | 경로 손실 계산 (자유 공간 전파 손실, shape: [num_targets]) |

##### 함수 상세

**`calc_atmospheric_loss`**
```python
calc_atmospheric_loss(
    beam_vector: Optional[np.ndarray] = None,      # 빔 벡터 (shape: [3])
    satellite_position: Optional[np.ndarray] = None # 위성 위치 (shape: [3])
) -> float
# 반환: 대기 손실 (기본값: 1.0, 손실 없음)
```

**`calc_path_loss`**
```python
calc_path_loss(
    range_2way: np.ndarray,  # 왕복 거리 배열 (shape: [num_targets], 단위: m)
    wavelength: float        # 파장 (단위: m)
) -> np.ndarray
# 반환: 경로 손실 배열 (shape: [num_targets]) = (λ / (4π * R/2))²
```

---

## 2. Sensor 모듈

### chirp_generator.py

Chirp 신호 생성기 모듈입니다.

#### 클래스: `ChirpGenerator`

LFM Chirp 신호를 생성하는 클래스입니다.

##### 생성자

```python
ChirpGenerator()
```

##### 속성

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `chirp_set` | `Optional[np.ndarray]` | 생성된 Chirp 세트 (shape: [chirp_set_size, num_samples_in_pulse]) |
| `chirp_set_size` | `int` | Chirp 세트 크기 (기본값: 64) |

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `generate(bw, taup, fs, num_chirps=1)` | `np.ndarray` | Chirp 신호 세트 생성 (shape: [num_chirps, num_samples_in_pulse], dtype: complex64) |
| `generate_set(bw, taup, fs, chirp_set_size=64)` | `np.ndarray` | 보간을 위한 Chirp 세트 생성 및 저장 |
| `get_chirp(index)` | `np.ndarray` | 특정 인덱스의 Chirp 신호 가져오기 (shape: [num_samples_in_pulse], dtype: complex64) |
| `reset()` | `None` | Chirp 세트 초기화 |

##### 메서드 상세

**`generate`**
```python
generate(
    bw: float,              # 대역폭 (Hz)
    taup: float,            # 펄스 폭 (s)
    fs: float,              # 샘플링 주파수 (Hz)
    num_chirps: int = 1     # 생성할 Chirp 개수 (보간용)
) -> np.ndarray
# 반환: Chirp 신호 세트 (shape: [num_chirps, num_samples_in_pulse], dtype: complex64)
# 수식: s(t) = exp(j * π * Kr * t²), 여기서 Kr = bw / taup
```

**`generate_set`**
```python
generate_set(
    bw: float,                    # 대역폭 (Hz)
    taup: float,                  # 펄스 폭 (s)
    fs: float,                    # 샘플링 주파수 (Hz)
    chirp_set_size: int = 64      # Chirp 세트 크기
) -> np.ndarray
# 반환: Chirp 신호 세트 (shape: [chirp_set_size, num_samples_in_pulse], dtype: complex64)
# 내부적으로 generate()를 호출하고 결과를 저장
```

**`get_chirp`**
```python
get_chirp(index: int) -> np.ndarray
# 반환: Chirp 신호 (shape: [num_samples_in_pulse], dtype: complex64)
# 예외: ValueError - 인덱스가 범위를 벗어나거나 세트가 초기화되지 않은 경우
```

---

### sensor_simulator.py

SAR Sensor Simulator 모듈입니다.

#### 클래스: `SarSensorSimulator`

위성에서 Chirp 신호를 생성하고 송신하는 시뮬레이터입니다.

##### 생성자

```python
SarSensorSimulator(config: SarSystemConfig)
```

##### 속성

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `config` | `SarSystemConfig` | SAR 시스템 설정 |
| `chirp_generator` | `ChirpGenerator` | Chirp 생성기 인스턴스 |

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `generate_chirp_signal()` | `np.ndarray` | Chirp 신호 생성 (shape: [num_samples_in_chirp], dtype: complex64) |
| `generate_chirp_set(chirp_set_size=64)` | `np.ndarray` | Chirp 세트 생성 (보간용, shape: [chirp_set_size, num_samples_in_chirp]) |
| `get_chirp(index)` | `np.ndarray` | 특정 인덱스의 Chirp 신호 가져오기 |

##### 메서드 상세

**`generate_chirp_signal`**
```python
generate_chirp_signal() -> np.ndarray
# 반환: Chirp 신호 (shape: [num_samples_in_chirp], dtype: complex64)
# 내부적으로 chirp_generator.get_chirp(0) 호출
```

**`generate_chirp_set`**
```python
generate_chirp_set(chirp_set_size: int = 64) -> np.ndarray
# 반환: Chirp 신호 세트 (shape: [chirp_set_size, num_samples_in_chirp], dtype: complex64)
# 내부적으로 chirp_generator.generate_set() 호출
```

**`get_chirp`**
```python
get_chirp(index: int) -> np.ndarray
# 반환: Chirp 신호
# 내부적으로 chirp_generator.get_chirp() 호출
```

---

## 3. Echo 모듈

### echo_generator.py

Echo 신호 생성기 모듈입니다.

#### 클래스: `EchoGenerator`

Chirp 신호를 받아 타겟에서 반사된 Echo 신호를 생성하는 클래스입니다.

##### 생성자

```python
EchoGenerator(config: SarSystemConfig)
```

##### 속성

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `config` | `SarSystemConfig` | SAR 시스템 설정 |

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `generate(chirp_signal, target_list, satellite_position, satellite_velocity, beam_direction=None)` | `np.ndarray` | Echo 신호 생성 (shape: [num_samples], dtype: complex64) |

##### 메서드 상세

**`generate`**
```python
generate(
    chirp_signal: np.ndarray,              # Chirp 신호 (shape: [num_samples_in_chirp], dtype: complex64)
    target_list: TargetList,               # 타겟 리스트
    satellite_position: np.ndarray,        # 위성 위치 (shape: [3], 단위: m)
    satellite_velocity: np.ndarray,        # 위성 속도 (shape: [3], 단위: m/s)
    beam_direction: Optional[np.ndarray] = None  # 빔 방향 벡터 (shape: [3])
) -> np.ndarray
# 반환: Echo 신호 (shape: [num_samples], dtype: complex64)
# 
# 처리 과정:
# 1. 타겟 거리 계산 (calc_distance_to_target)
# 2. 왕복 거리 계산 (R_2way = 2 * R)
# 3. 시간 지연 계산 (calc_time_delay, calc_ambiguous_time_delay)
# 4. 안테나 게인 계산 (calc_antenna_gain_simple)
# 5. 대기 손실 계산 (calc_atmospheric_loss)
# 6. 신호 세기 계수 계산 (레이더 방정식)
# 7. 노이즈 임계값 필터링
# 8. Echo 신호 생성 (chirp 신호에 계수 적용 및 시간 지연 반영)
```

---

### echo_simulator.py

SAR Echo Simulator 모듈입니다.

#### 클래스: `SarEchoSimulator`

Sensor Simulator에서 생성한 Chirp 신호를 받아 Echo 신호를 생성하는 메인 시뮬레이터입니다.

##### 생성자

```python
SarEchoSimulator(config: SarSystemConfig)
```

##### 속성

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `config` | `SarSystemConfig` | SAR 시스템 설정 |
| `sensor_simulator` | `SarSensorSimulator` | Sensor Simulator 인스턴스 |
| `echo_generator` | `EchoGenerator` | Echo 생성기 인스턴스 |

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `simulate_echo(target_list, satellite_position, satellite_velocity, beam_direction=None, chirp_signal=None)` | `np.ndarray` | 단일 펄스 Echo 신호 시뮬레이션 (shape: [num_samples], dtype: complex64) |
| `simulate_multiple_pulses(target_list, satellite_positions, satellite_velocities, beam_directions=None)` | `np.ndarray` | 여러 펄스에 대한 Echo 신호 시뮬레이션 (shape: [num_pulses, num_samples], dtype: complex64) |

##### 메서드 상세

**`simulate_echo`**
```python
simulate_echo(
    target_list: TargetList,                    # 타겟 리스트
    satellite_position: np.ndarray,             # 위성 위치 (shape: [3], 단위: m)
    satellite_velocity: np.ndarray,            # 위성 속도 (shape: [3], 단위: m/s)
    beam_direction: Optional[np.ndarray] = None,  # 빔 방향 벡터 (shape: [3])
    chirp_signal: Optional[np.ndarray] = None     # Chirp 신호 (None이면 자동 생성)
) -> np.ndarray
# 반환: Echo 신호 (shape: [num_samples], dtype: complex64)
# 내부적으로 sensor_simulator.generate_chirp_signal() 및 echo_generator.generate() 호출
```

**`simulate_multiple_pulses`**
```python
simulate_multiple_pulses(
    target_list: TargetList,                    # 타겟 리스트
    satellite_positions: np.ndarray,           # 위성 위치 배열 (shape: [num_pulses, 3], 단위: m)
    satellite_velocities: np.ndarray,          # 위성 속도 배열 (shape: [num_pulses, 3], 단위: m/s)
    beam_directions: Optional[np.ndarray] = None  # 빔 방향 벡터 배열 (shape: [num_pulses, 3])
) -> np.ndarray
# 반환: Echo 신호 배열 (shape: [num_pulses, num_samples], dtype: complex64)
# 내부적으로 각 펄스에 대해 simulate_echo()를 반복 호출
```

---

## 4. IO 모듈

### raw_data_writer.py

SAR Raw Data Writer 모듈입니다.

#### 클래스: `RawDataWriter`

SAR Raw Data를 HDF5 형식으로 저장하는 클래스입니다.

##### 생성자

```python
RawDataWriter(filepath: str, config: SarSystemConfig)
```

##### 속성

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `filepath` | `Path` | 저장할 HDF5 파일 경로 |
| `config` | `SarSystemConfig` | SAR 시스템 설정 |
| `hdf_file` | `Optional[h5py.File]` | HDF5 파일 객체 |

##### 메서드

| 메서드명 | 반환 타입 | 설명 |
|----------|-----------|------|
| `open()` | `None` | HDF5 파일 열기 및 루트 속성 작성 |
| `close()` | `None` | HDF5 파일 닫기 |
| `__enter__()` | `RawDataWriter` | Context manager 진입 |
| `__exit__(exc_type, exc_val, exc_tb)` | `None` | Context manager 종료 |
| `write_burst(group_name, echo_data, satellite_positions=None, satellite_velocities=None, timestamps=None, **kwargs)` | `None` | Burst 데이터 작성 |
| `_write_root_attributes()` | `None` | 루트 레벨 속성 작성 (내부 메서드) |
| `_write_group_attributes(group)` | `None` | 그룹 속성 작성 (내부 메서드) |
| `_write_burst_attributes(group, burst_name, num_pulses)` | `None` | Burst 속성 작성 (내부 메서드) |

##### 메서드 상세

**`open`**
```python
open() -> None
# HDF5 파일을 생성하고 루트 속성을 작성합니다.
# 이미 열려있으면 아무 작업도 하지 않습니다.
```

**`close`**
```python
close() -> None
# HDF5 파일을 닫습니다.
# 파일이 열려있지 않으면 아무 작업도 하지 않습니다.
```

**`write_burst`**
```python
write_burst(
    group_name: str,                          # 그룹 이름 (예: 'SSG00')
    echo_data: np.ndarray,                    # Echo 데이터 (shape: [num_pulses, num_samples], dtype: complex64)
    satellite_positions: Optional[np.ndarray] = None,  # 위성 위치 배열 (shape: [num_pulses, 3], 단위: m)
    satellite_velocities: Optional[np.ndarray] = None, # 위성 속도 배열 (shape: [num_pulses, 3], 단위: m/s)
    timestamps: Optional[np.ndarray] = None,          # 타임스탬프 배열 (shape: [num_pulses], 단위: s)
    **kwargs                                  # 추가 속성들
) -> None
# 
# 처리 과정:
# 1. 그룹 생성 (없으면 생성)
# 2. 그룹 속성 작성 (_write_group_attributes)
# 3. Echo 데이터를 복소수에서 실수/허수로 분리하여 저장
# 4. Burst 속성 작성 (_write_burst_attributes)
# 5. ADX 데이터 작성 (위성 상태 벡터 등)
```

**`_write_root_attributes`**
```python
_write_root_attributes() -> None
# 루트 레벨 속성 작성:
# - Light Speed: 299792458.0
# - Ellipsoid Designator: 'WGS84'
# - Ellipsoid Semimajor Axis: 6378137.0
# - Ellipsoid Semiminor Axis: 6356752.314245
# - Product Type: 'SAR_RAW_DATA'
# - Satellite Height: config.orbit_height
```

**`_write_group_attributes`**
```python
_write_group_attributes(group: h5py.Group) -> None
# 그룹 속성 작성:
# - Beam ID: config.beam_id
# - Radar Frequency: config.fc
# - Radar Wavelength: config.wavelength
# - PRF: config.prf
# - Sampling Rate: config.fs
# - Range Chirp Length: config.taup
# - Range Chirp Rate: config.chirp_rate
# - Echo Sampling Window Length: config.num_samples
```

**`_write_burst_attributes`**
```python
_write_burst_attributes(
    group: h5py.Group,    # HDF5 그룹
    burst_name: str,       # Burst 이름
    num_pulses: int       # 펄스 개수
) -> None
# Burst 속성 작성:
# - Lines per Burst: num_pulses
# - Range Chirp Samples: config.num_samples_in_chirp
```

---

## 사용 예제

### 기본 사용 흐름

```python
from sar_simulator.common import SarSystemConfig, Target, TargetList
from sar_simulator.sensor import SarSensorSimulator
from sar_simulator.echo import SarEchoSimulator
from sar_simulator.io import RawDataWriter
import numpy as np

# 1. 시스템 설정
config = SarSystemConfig(
    fc=5.4e9, bw=150e6, taup=10e-6, fs=250e6, prf=5000,
    swst=10e-6, swl=50e-6, orbit_height=517e3,
    antenna_width=4.0, antenna_height=0.5
)

# 2. Sensor Simulator로 Chirp 생성
sensor_sim = SarSensorSimulator(config)
chirp_signal = sensor_sim.generate_chirp_signal()

# 3. 타겟 정의
target = Target(
    position=np.array([6378137.0, 0.0, 0.0]),
    reflectivity=1.0, phase=0.0
)
target_list = TargetList([target])

# 4. Echo Simulator로 Echo 생성
echo_sim = SarEchoSimulator(config)
satellite_position = np.array([6378137.0 + 517000.0, 0.0, 0.0])
satellite_velocity = np.array([0.0, 7266.0, 0.0])

echo_signal = echo_sim.simulate_echo(
    target_list=target_list,
    satellite_position=satellite_position,
    satellite_velocity=satellite_velocity
)

# 5. Raw Data 저장
with RawDataWriter("output.h5", config) as writer:
    writer.write_burst(
        group_name="SSG00",
        echo_data=echo_signal.reshape(1, -1),
        satellite_positions=satellite_position.reshape(1, -1),
        satellite_velocities=satellite_velocity.reshape(1, -1)
    )
```

---

## 함수 호출 흐름도

```
사용자 코드
  ↓
SarSystemConfig 생성
  ├── __post_init__()
  │   ├── _validate()
  │   └── _calculate_derived_params()
  ↓
SarSensorSimulator 생성
  ├── ChirpGenerator 생성
  └── generate_set() 호출
  ↓
generate_chirp_signal()
  └── ChirpGenerator.get_chirp(0)
  ↓
SarEchoSimulator 생성
  ├── SarSensorSimulator 생성
  └── EchoGenerator 생성
  ↓
simulate_echo()
  ├── generate_chirp_signal() (chirp_signal이 None인 경우)
  └── EchoGenerator.generate()
      ├── calc_distance_to_target()
      ├── calc_time_delay()
      ├── calc_ambiguous_time_delay()
      ├── calc_antenna_gain_simple()
      ├── calc_atmospheric_loss()
      └── 신호 계수 계산 및 Echo 신호 생성
  ↓
RawDataWriter 생성
  ├── open()
  │   └── _write_root_attributes()
  └── write_burst()
      ├── _write_group_attributes()
      └── _write_burst_attributes()
```

---

## 관련 문서

- [아키텍처 문서](architecture.md) - 전체 시스템 구조 설명
- [API 참조](api_reference.md) - 상세 API 문서
- [변수 명칭 정리](variable_nomenclature.md) - 수식에 사용되는 모든 변수명 정리
- [사용자 가이드](user_guide.md) - 실용적인 사용 가이드
