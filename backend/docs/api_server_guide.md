# API 서버 사용 가이드

SAR Simulator API 서버 사용 방법을 설명합니다.

## 목차

1. [서버 시작](#서버-시작)
2. [API 엔드포인트](#api-엔드포인트)
3. [요청/응답 형식](#요청응답-형식)
4. [데이터 인코딩](#데이터-인코딩)
5. [예제](#예제)

---

## 서버 시작

### Windows PowerShell

```powershell
# 1. 가상환경 설정 (최초 1회)
cd backend
.\scripts\setup_venv.ps1

# 2. 서버 시작
.\scripts\start_server.ps1
```

### 수동 실행

```bash
# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 서버 실행
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

서버가 시작되면:
- API 문서: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- 헬스 체크: http://localhost:8000/api/health

---

## API 엔드포인트

### 1. 헬스 체크

**GET** `/api/health`

서버 상태를 확인합니다.

**응답:**
```json
{
  "status": "healthy",
  "service": "SAR Simulator API",
  "version": "1.0.0"
}
```

### 2. 시스템 설정 검증

**POST** `/api/config/validate`

SAR 시스템 설정의 유효성을 검증합니다.

**요청 본문:**
```json
{
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
```

**응답:**
```json
{
  "valid": true,
  "message": "설정이 유효합니다.",
  "config": { ... }
}
```

### 3. Chirp 신호 생성

**POST** `/api/chirp/generate`

LFM Chirp 신호를 생성합니다.

**요청 본문:** 시스템 설정 (위와 동일)

**응답:**
```json
{
  "success": true,
  "message": "Chirp 신호 생성 완료",
  "shape": [2500],
  "dtype": "complex64",
  "data": "base64_encoded_data...",
  "num_samples": 2500
}
```

### 4. Echo 시뮬레이션 (단일 펄스)

**POST** `/api/echo/simulate`

단일 펄스에 대한 Echo 신호를 생성합니다.

**요청 본문:**
```json
{
  "fc": 5.4e9,
  "bw": 150e6,
  "fs": 250e6,
  "taup": 10e-6,
  "prf": 5000,
  "swst": 10e-6,
  "swl": 50e-6,
  "orbit_height": 517e3,
  "antenna_width": 4.0,
  "antenna_height": 0.5,
  "targets": [
    {
      "position": [6378137.0, 0.0, 0.0],
      "reflectivity": 1.0,
      "phase": 0.0
    }
  ],
  "satellite_state": {
    "position": [6378137.0 + 517000.0, 0.0, 0.0],
    "velocity": [0.0, 7266.0, 0.0],
    "beam_direction": null
  }
}
```

**응답:**
```json
{
  "success": true,
  "message": "Echo 시뮬레이션 완료",
  "shape": [12500],
  "dtype": "complex64",
  "data": "base64_encoded_data...",
  "num_samples": 12500,
  "max_amplitude": 0.123456,
  "mean_amplitude": 0.001234
}
```

### 5. Echo 시뮬레이션 (여러 펄스)

**POST** `/api/echo/simulate-multiple`

여러 펄스에 대한 Echo 신호를 생성합니다.

**요청 본문:**
```json
{
  "fc": 5.4e9,
  "bw": 150e6,
  "fs": 250e6,
  "taup": 10e-6,
  "prf": 5000,
  "swst": 10e-6,
  "swl": 50e-6,
  "orbit_height": 517e3,
  "antenna_width": 4.0,
  "antenna_height": 0.5,
  "targets": [...],
  "satellite_states": [
    {
      "position": [6378137.0 + 517000.0, 0.0, 0.0],
      "velocity": [0.0, 7266.0, 0.0],
      "beam_direction": null
    },
    ...
  ]
}
```

**응답:**
```json
{
  "success": true,
  "message": "여러 펄스 Echo 시뮬레이션 완료",
  "shape": [100, 12500],
  "dtype": "complex64",
  "data": "base64_encoded_data...",
  "num_pulses": 100,
  "num_samples": 12500
}
```

### 6. Raw Data 저장

**POST** `/api/raw-data/save`

Echo 신호를 HDF5 파일로 저장합니다.

**요청 본문:**
```json
{
  "config_request": { ... },
  "echo_data_base64": "base64_encoded_data...",
  "satellite_states": [...],
  "filepath": "output.h5",
  "group_name": "SSG00"
}
```

**응답:**
```json
{
  "success": true,
  "message": "Raw Data 저장 완료",
  "filepath": "C:\\path\\to\\output.h5",
  "group_name": "SSG00",
  "num_pulses": 100,
  "num_samples": 12500
}
```

---

## 요청/응답 형식

### Content-Type

모든 요청은 `application/json` 형식을 사용합니다.

### 에러 응답

에러 발생 시 다음 형식으로 응답합니다:

```json
{
  "detail": "에러 메시지"
}
```

HTTP 상태 코드:
- `400`: 잘못된 요청 (파라미터 오류 등)
- `500`: 서버 오류

---

## 데이터 인코딩

### NumPy 배열 전송

NumPy 배열은 JSON으로 직접 직렬화할 수 없으므로 Base64로 인코딩하여 전송합니다.

**인코딩 (서버 → 클라이언트):**
```python
import numpy as np
import base64

# 복소수 배열을 실수/허수로 분리
data = np.stack([signal.real, signal.imag], axis=-1)
data_bytes = data.astype(np.float32).tobytes()
data_base64 = base64.b64encode(data_bytes).decode('utf-8')
```

**디코딩 (클라이언트):**
```python
import numpy as np
import base64

# Base64 디코딩
data_bytes = base64.b64decode(data_base64)
data_float32 = np.frombuffer(data_bytes, dtype=np.float32)

# 실수/허수 분리된 데이터를 복소수로 복원
signal = data_float32[::2] + 1j * data_float32[1::2]

# shape 복원 (필요한 경우)
signal = signal.reshape(shape)
```

---

## 예제

### Python 클라이언트

```python
import requests
import base64
import numpy as np

BASE_URL = "http://localhost:8000/api"

# 시스템 설정
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

# 1. 헬스 체크
response = requests.get(f"{BASE_URL}/health")
print(response.json())

# 2. Chirp 신호 생성
response = requests.post(f"{BASE_URL}/chirp/generate", json=config)
result = response.json()

# 데이터 복원
chirp_data = base64.b64decode(result["data"])
chirp_float32 = np.frombuffer(chirp_data, dtype=np.float32)
chirp_signal = chirp_float32[::2] + 1j * chirp_float32[1::2]
chirp_signal = chirp_signal.reshape(result["shape"])

print(f"Chirp 신호: shape={chirp_signal.shape}, dtype={chirp_signal.dtype}")

# 3. Echo 시뮬레이션
request_data = {
    **config,
    "targets": [{
        "position": [6378137.0, 0.0, 0.0],
        "reflectivity": 1.0,
        "phase": 0.0
    }],
    "satellite_state": {
        "position": [6378137.0 + 517000.0, 0.0, 0.0],
        "velocity": [0.0, 7266.0, 0.0],
        "beam_direction": None
    }
}

response = requests.post(f"{BASE_URL}/echo/simulate", json=request_data)
result = response.json()

# 데이터 복원
echo_data = base64.b64decode(result["data"])
echo_float32 = np.frombuffer(echo_data, dtype=np.float32)
echo_signal = echo_float32[::2] + 1j * echo_float32[1::2]
echo_signal = echo_signal.reshape(result["shape"])

print(f"Echo 신호: shape={echo_signal.shape}, max={result['max_amplitude']}")
```

### JavaScript/TypeScript 클라이언트

```typescript
const BASE_URL = "http://localhost:8000/api";

// 헬스 체크
const healthResponse = await fetch(`${BASE_URL}/health`);
const health = await healthResponse.json();
console.log(health);

// Chirp 신호 생성
const config = {
  fc: 5.4e9,
  bw: 150e6,
  fs: 250e6,
  taup: 10e-6,
  prf: 5000,
  swst: 10e-6,
  swl: 50e-6,
  orbit_height: 517e3,
  antenna_width: 4.0,
  antenna_height: 0.5
};

const chirpResponse = await fetch(`${BASE_URL}/chirp/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(config)
});

const chirpResult = await chirpResponse.json();

// Base64 디코딩 (브라우저 환경)
const binaryString = atob(chirpResult.data);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}

// Float32Array로 변환
const float32Array = new Float32Array(bytes.buffer);
// 실수/허수 분리된 데이터를 복소수로 복원
const complexData = [];
for (let i = 0; i < float32Array.length; i += 2) {
  complexData.push({
    real: float32Array[i],
    imag: float32Array[i + 1]
  });
}

console.log(`Chirp 신호: ${chirpResult.num_samples} 샘플`);
```

---

## 문제 해결

### 서버가 시작되지 않는 경우

1. Python 버전 확인: `python --version` (3.9 이상 필요)
2. 가상환경이 활성화되었는지 확인
3. 의존성이 설치되었는지 확인: `pip list`
4. 포트가 이미 사용 중인지 확인

### API 요청이 실패하는 경우

1. 서버가 실행 중인지 확인: `GET /api/health`
2. 요청 형식 확인 (Content-Type: application/json)
3. 필수 파라미터가 모두 포함되었는지 확인
4. API 문서에서 스키마 확인: http://localhost:8000/api/docs

### 데이터 디코딩 오류

1. Base64 인코딩이 올바른지 확인
2. 데이터 타입 확인 (float32)
3. Shape 정보 확인 (실수/허수 분리된 형태)

---

## 관련 문서

- [아키텍처 문서](architecture.md)
- [API 참조](api_reference.md)
- [사용자 가이드](user_guide.md)
