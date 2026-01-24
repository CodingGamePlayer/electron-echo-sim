# 사용자 가이드

## 설치

```bash
cd backend
pip install -r requirements.txt
```

## 기본 사용법

### 1. 시스템 설정

```python
from sar_simulator.common import SarSystemConfig

config = SarSystemConfig(
    fc=5.4e9,           # 중심 주파수: 5.4 GHz
    bw=150e6,           # 대역폭: 150 MHz
    taup=10e-6,         # 펄스 폭: 10 μs
    fs=250e6,           # 샘플링 주파수: 250 MHz
    prf=5000,           # PRF: 5000 Hz
    swst=10e-6,         # 샘플링 윈도우 시작 시간
    swl=50e-6,          # 샘플링 윈도우 길이
    orbit_height=517e3, # 궤도 높이: 517 km
    antenna_width=4.0,  # 안테나 폭: 4 m
    antenna_height=0.5  # 안테나 높이: 0.5 m
)
```

### 2. Chirp 신호 생성

```python
from sar_simulator.sensor import SarSensorSimulator

sensor_sim = SarSensorSimulator(config)
chirp_signal = sensor_sim.generate_chirp_signal()
```

### 3. 타겟 정의

```python
from sar_simulator.common import Target, TargetList
import numpy as np

# 단일 타겟
target = Target(
    position=np.array([6378137.0, 0.0, 0.0]),  # ECEF 좌표
    reflectivity=1.0,  # 반사도
    phase=0.0         # 위상 (deg)
)

target_list = TargetList([target])
```

### 4. Echo 신호 생성

```python
from sar_simulator.echo import SarEchoSimulator

echo_sim = SarEchoSimulator(config)

satellite_position = np.array([6378137.0 + 517000.0, 0.0, 0.0])
satellite_velocity = np.array([0.0, 7266.0, 0.0])

echo_signal = echo_sim.simulate_echo(
    target_list=target_list,
    satellite_position=satellite_position,
    satellite_velocity=satellite_velocity
)
```

### 5. Raw Data 저장

```python
from sar_simulator.io import RawDataWriter

with RawDataWriter("output.h5", config) as writer:
    writer.write_burst(
        group_name="SSG00",
        echo_data=echo_signal.reshape(1, -1),  # [num_pulses, num_samples]
        satellite_positions=satellite_position.reshape(1, -1),
        satellite_velocities=satellite_velocity.reshape(1, -1)
    )
```

## 여러 펄스 처리

```python
# 여러 위성 위치
num_pulses = 100
satellite_positions = np.zeros((num_pulses, 3))
satellite_velocities = np.zeros((num_pulses, 3))

# ... 위성 위치 및 속도 계산 ...

# 여러 펄스에 대한 Echo 신호 생성
echo_signals = echo_sim.simulate_multiple_pulses(
    target_list=target_list,
    satellite_positions=satellite_positions,
    satellite_velocities=satellite_velocities
)
```

## 예제 실행

```bash
cd backend
python examples/basic_usage.py
```

## 테스트 실행

```bash
cd backend
pytest tests/
```

## 문제 해결

### 나이키스트 샘플링 오류

샘플링 주파수(`fs`)는 대역폭(`bw`)의 2배 이상이어야 합니다.

```python
# 올바른 예
fs = 250e6  # 250 MHz
bw = 150e6  # 150 MHz
# fs > 2 * bw ✓

# 잘못된 예
fs = 100e6  # 100 MHz
bw = 150e6  # 150 MHz
# fs < 2 * bw ✗
```

### 타겟이 보이지 않는 경우

- 타겟의 반사도가 너무 낮을 수 있습니다.
- 타겟이 안테나 빔폭 밖에 있을 수 있습니다.
- 노이즈 임계값을 확인하세요.

## 관련 문서

- [함수 및 메서드 참조](function_reference.md) - 아키텍처별 모든 함수와 메서드 정리
- [변수 명칭 정리](variable_nomenclature.md) - 수식에 사용되는 모든 변수명과 수식 정리
- [아키텍처 문서](architecture.md) - 전체 시스템 구조 설명
- [API 참조](api_reference.md) - 상세 API 문서
