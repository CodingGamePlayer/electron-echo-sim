# SAR Simulator 아키텍처 문서

## 개요

SAR Simulator는 SAR Sensor Simulator와 SAR Echo Simulator로 구성된 모듈화된 시스템입니다.

## 전체 구조

```
SAR Simulator
├── SAR Sensor Simulator
│   ├── Chirp 신호 생성
│   └── 위성 신호 시뮬레이션
│
└── SAR Echo Simulator
    ├── Echo 신호 생성
    ├── 타겟 반사 모델링
    └── SAR Raw Data 생성
```

## 모듈 구조

### 1. Sensor 모듈 (`sar_simulator/sensor/`)

**ChirpGenerator**
- LFM Chirp 신호 생성
- 보간을 위한 Chirp 세트 생성

**SarSensorSimulator**
- Chirp 신호 생성 관리
- 위성 신호 시뮬레이션

### 2. Echo 모듈 (`sar_simulator/echo/`)

**EchoGenerator**
- Chirp 신호를 받아 Echo 신호 생성
- 타겟 반사 모델링
- 전파 손실 계산

**SarEchoSimulator**
- Echo 신호 생성 관리
- 여러 펄스 처리

### 3. Common 모듈 (`sar_simulator/common/`)

**constants.py**
- 물리 상수 정의

**sar_system_config.py**
- SAR 시스템 설정 관리

**target_model.py**
- 타겟 정의 및 관리

**geometry_utils.py**
- 기하학 계산 유틸리티

**propagation_model.py**
- 전파 모델

### 4. IO 모듈 (`sar_simulator/io/`)

**raw_data_writer.py**
- SAR Raw Data를 HDF5 형식으로 저장

## 데이터 흐름

```
사용자 코드
  ↓
SarSystemConfig 생성
  ↓
SarSensorSimulator
  ├── ChirpGenerator.generate()
  └── Chirp 신호 생성
  ↓
SarEchoSimulator
  ├── EchoGenerator.generate()
  ├── 타겟 거리 계산
  ├── 안테나 게인 계산
  ├── 전파 손실 계산
  └── Echo 신호 생성
  ↓
RawDataWriter
  └── HDF5 파일 저장
```

## 주요 클래스

### SarSystemConfig

SAR 시스템의 모든 파라미터를 관리합니다.

**주요 속성:**
- `fc`: 반송파 주파수
- `bw`: 대역폭
- `taup`: 펄스 폭
- `fs`: 샘플링 주파수
- `prf`: 펄스 반복 주파수

### ChirpGenerator

Chirp 신호를 생성합니다.

**주요 메서드:**
- `generate()`: Chirp 신호 생성
- `generate_set()`: Chirp 세트 생성
- `get_chirp()`: 특정 인덱스의 Chirp 가져오기

### EchoGenerator

Echo 신호를 생성합니다.

**주요 메서드:**
- `generate()`: Echo 신호 생성

### TargetList

타겟 리스트를 관리합니다.

**주요 메서드:**
- `add_target()`: 타겟 추가
- `to_array()`: 배열로 변환

## 확장성

새로운 기능을 추가하기 쉽도록 설계되었습니다:

1. **새로운 Chirp 타입**: `ChirpGenerator`를 상속하여 구현
2. **새로운 Echo 모델**: `EchoGenerator`를 상속하여 구현
3. **새로운 전파 모델**: `propagation_model.py`에 함수 추가

## 성능 고려사항

- NumPy를 사용한 벡터화 연산
- C-contiguous 배열 사용으로 성능 최적화
- 필요시 C++ 확장 모듈 활용 가능
