# API 참조 문서

## SarSystemConfig

SAR 시스템 설정 클래스입니다.

### 생성자

```python
SarSystemConfig(
    fc: float,              # 반송파 주파수 (Hz)
    bw: float,              # 대역폭 (Hz)
    taup: float,            # 펄스 폭 (s)
    fs: float,              # 샘플링 주파수 (Hz)
    prf: float,             # 펄스 반복 주파수 (Hz)
    swst: float,            # 샘플링 윈도우 시작 시간 (s)
    swl: float,             # 샘플링 윈도우 길이 (s)
    orbit_height: float,    # 궤도 높이 (m)
    antenna_width: float,   # 안테나 폭 (m)
    antenna_height: float,  # 안테나 높이 (m)
    **kwargs                # 기타 옵션
)
```

### 주요 속성

- `wavelength`: 파장 (m)
- `pri`: 펄스 반복 간격 (s)
- `chirp_rate`: Chirp rate (Hz/s)
- `num_samples_in_chirp`: Chirp 내 샘플 수
- `num_samples`: 전체 샘플 수

## ChirpGenerator

Chirp 신호 생성기입니다.

### 메서드

#### `generate(bw, taup, fs, num_chirps=1) -> np.ndarray`

Chirp 신호 세트를 생성합니다.

**Parameters:**
- `bw` (float): 대역폭 (Hz)
- `taup` (float): 펄스 폭 (s)
- `fs` (float): 샘플링 주파수 (Hz)
- `num_chirps` (int): 생성할 Chirp 개수

**Returns:**
- `np.ndarray`: Chirp 신호 세트 (shape: [num_chirps, num_samples_in_pulse])

#### `get_chirp(index) -> np.ndarray`

특정 인덱스의 Chirp 신호를 가져옵니다.

## SarSensorSimulator

SAR Sensor Simulator입니다.

### 생성자

```python
SarSensorSimulator(config: SarSystemConfig)
```

### 메서드

#### `generate_chirp_signal() -> np.ndarray`

Chirp 신호를 생성합니다.

## SarEchoSimulator

SAR Echo Simulator입니다.

### 생성자

```python
SarEchoSimulator(config: SarSystemConfig)
```

### 메서드

#### `simulate_echo(target_list, satellite_position, satellite_velocity, ...) -> np.ndarray`

Echo 신호를 시뮬레이션합니다.

**Parameters:**
- `target_list` (TargetList): 타겟 리스트
- `satellite_position` (np.ndarray): 위성 위치 (shape: [3])
- `satellite_velocity` (np.ndarray): 위성 속도 (shape: [3])
- `beam_direction` (np.ndarray, optional): 빔 방향 벡터
- `chirp_signal` (np.ndarray, optional): Chirp 신호

**Returns:**
- `np.ndarray`: Echo 신호 (shape: [num_samples])

## TargetList

타겟 리스트 관리 클래스입니다.

### 메서드

#### `add_target(target: Target)`

타겟을 추가합니다.

#### `to_array() -> np.ndarray`

타겟 리스트를 배열로 변환합니다.

## RawDataWriter

SAR Raw Data 작성기입니다.

### 생성자

```python
RawDataWriter(filepath: str, config: SarSystemConfig)
```

### 메서드

#### `open()`

HDF5 파일을 엽니다.

#### `close()`

HDF5 파일을 닫습니다.

#### `write_burst(group_name, echo_data, ...)`

Burst 데이터를 작성합니다.

### Context Manager 사용

```python
with RawDataWriter("output.h5", config) as writer:
    writer.write_burst("SSG00", echo_data)
```
