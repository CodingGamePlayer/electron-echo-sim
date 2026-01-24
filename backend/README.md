# SAR Simulator Backend

SAR Sensor Simulator와 SAR Echo Simulator를 포함하는 백엔드 라이브러리입니다.

## 구조

```
backend/
├── sar_simulator/          # 메인 패키지
│   ├── sensor/             # SAR Sensor Simulator
│   ├── echo/               # SAR Echo Simulator
│   ├── common/             # 공통 모듈
│   └── io/                 # 데이터 입출력
├── tests/                  # 테스트 코드
├── docs/                   # 문서
└── examples/               # 사용 예제
```

## 설치

```bash
pip install -r requirements.txt
```

## 사용 예제

```python
from sar_simulator.common import SarSystemConfig
from sar_simulator.sensor import SarSensorSimulator
from sar_simulator.echo import SarEchoSimulator

# 설정
config = SarSystemConfig(
    fc=5.4e9,      # 중심 주파수
    bw=150e6,      # 대역폭
    taup=10e-6,    # 펄스 폭
    fs=250e6,      # 샘플링 주파수
    prf=5000,      # PRF
    swst=10e-6,    # 샘플링 윈도우 시작 시간
    swl=50e-6,     # 샘플링 윈도우 길이
    orbit_height=517e3,  # 궤도 높이
    antenna_width=4.0,   # 안테나 폭
    antenna_height=0.5   # 안테나 높이
)

# Sensor Simulator
sensor_sim = SarSensorSimulator(config)
chirp_signal = sensor_sim.generate_chirp_signal()

# Echo Simulator
echo_sim = SarEchoSimulator(config)
# echo_signal = echo_sim.simulate_echo(...)
```

## 문서

- [아키텍처 문서](docs/architecture.md)
- [API 참조](docs/api_reference.md)
- [사용자 가이드](docs/user_guide.md)
- [함수 및 메서드 참조](docs/function_reference.md) - 아키텍처별 모든 함수와 메서드 정리
- [변수 명칭 정리](docs/variable_nomenclature.md) - 수식에 사용되는 모든 변수명 정리

## 라이선스

Internal use only.
