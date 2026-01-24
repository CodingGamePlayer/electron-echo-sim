# SAR Simulator Backend

SAR Sensor Simulator와 SAR Echo Simulator를 포함하는 백엔드 라이브러리 및 REST API 서버입니다.

## 구조

```
backend/
├── sar_simulator/          # 메인 패키지
│   ├── sensor/             # SAR Sensor Simulator
│   ├── echo/               # SAR Echo Simulator
│   ├── common/             # 공통 모듈
│   └── io/                 # 데이터 입출력
├── api/                    # API 서버
│   ├── routes/             # API 라우트
│   ├── schemas/            # Pydantic 스키마
│   └── main.py             # FastAPI 앱 진입점
├── scripts/                 # 유틸리티 스크립트
│   ├── setup_venv.ps1      # 가상환경 설정
│   └── start_server.ps1    # 서버 시작
├── tests/                  # 테스트 코드
├── docs/                   # 문서
└── examples/               # 사용 예제
```

## Python 버전 요구사항

- **권장: Python 3.9 이상** (3.10 또는 3.11 권장)
- 최소: Python 3.8

## 설치 및 설정

### 1. 가상환경 생성 및 의존성 설치

Windows PowerShell에서:

```powershell
cd backend
.\scripts\setup_venv.ps1
```

또는 수동으로:

```bash
# 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
.\venv\Scripts\Activate.ps1

# 의존성 설치
pip install -r requirements.txt
```

### 2. API 서버 시작

```powershell
.\scripts\start_server.ps1
```

또는 수동으로:

```bash
# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 서버 실행
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

서버가 시작되면 다음 URL에서 API 문서를 확인할 수 있습니다:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- 헬스 체크: http://localhost:8000/api/health

## API 사용 예제

### Python 클라이언트

```python
import requests
import base64
import numpy as np

# API 기본 URL
BASE_URL = "http://localhost:8000/api"

# 1. 시스템 설정 검증
config = {
    "fc": 5.4e9,
    "bw": 150e6,
    "fs": 250e6,
    "taup": 10e-6,
    "prf": 5000,
    "swst": 10e-6,
    "swl": 50e-6,
    "orbit_height": 517e3,
    "antenna_width": 4.0,
    "antenna_height": 0.5
}

response = requests.post(f"{BASE_URL}/config/validate", json=config)
print(response.json())

# 2. Chirp 신호 생성
response = requests.post(f"{BASE_URL}/chirp/generate", json=config)
result = response.json()
chirp_data = base64.b64decode(result["data"])
# 데이터 복원 (실수/허수 분리된 형태)
chirp_float32 = np.frombuffer(chirp_data, dtype=np.float32)
chirp_signal = chirp_float32[::2] + 1j * chirp_float32[1::2]

# 3. Echo 시뮬레이션
targets = [{
    "position": [6378137.0, 0.0, 0.0],
    "reflectivity": 1.0,
    "phase": 0.0
}]

satellite_state = {
    "position": [6378137.0 + 517000.0, 0.0, 0.0],
    "velocity": [0.0, 7266.0, 0.0],
    "beam_direction": None
}

response = requests.post(
    f"{BASE_URL}/echo/simulate",
    json={
        **config,
        "targets": targets,
        "satellite_state": satellite_state
    }
)
result = response.json()
print(f"Echo 신호 생성 완료: {result['num_samples']} 샘플")
```

### cURL 예제

```bash
# 헬스 체크
curl http://localhost:8000/api/health

# 시스템 설정 검증
curl -X POST http://localhost:8000/api/config/validate \
  -H "Content-Type: application/json" \
  -d '{
    "fc": 5.4e9,
    "bw": 150e6,
    "fs": 250e6,
    "taup": 10e-6,
    "prf": 5000,
    "swst": 10e-6,
    "swl": 50e-6,
    "orbit_height": 517e3,
    "antenna_width": 4.0,
    "antenna_height": 0.5
  }'
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

## API 엔드포인트

### 헬스 체크
- `GET /api/health` - 서버 상태 확인

### 시스템 설정
- `POST /api/config/validate` - 시스템 설정 검증

### Chirp 신호 생성
- `POST /api/chirp/generate` - Chirp 신호 생성

### Echo 시뮬레이션
- `POST /api/echo/simulate` - 단일 펄스 Echo 시뮬레이션
- `POST /api/echo/simulate-multiple` - 여러 펄스 Echo 시뮬레이션

### Raw Data 저장
- `POST /api/raw-data/save` - HDF5 파일로 저장

자세한 API 문서는 서버 실행 후 http://localhost:8000/api/docs 에서 확인할 수 있습니다.

## 문서

- [API 서버 가이드](docs/api_server_guide.md) - API 서버 사용 방법 및 예제
- [아키텍처 문서](docs/architecture.md)
- [API 참조](docs/api_reference.md)
- [사용자 가이드](docs/user_guide.md)
- [함수 및 메서드 참조](docs/function_reference.md) - 아키텍처별 모든 함수와 메서드 정리
- [변수 명칭 정리](docs/variable_nomenclature.md) - 수식에 사용되는 모든 변수명 정리

## 라이선스

Internal use only.
