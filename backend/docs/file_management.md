# 파일 관리 가이드

SAR Simulator에서 생성된 파일들의 저장 위치와 관리 방법을 설명합니다.

## 현재 파일 저장 구조

### 1. 라이브러리 사용 시 (Python 코드)

**RawDataWriter 사용:**
```python
from sar_simulator.io import RawDataWriter

# 사용자가 직접 파일 경로 지정
with RawDataWriter("output.h5", config) as writer:
    writer.write_burst(...)
```

**저장 위치:**
- 현재 작업 디렉토리 또는 지정한 경로
- 절대 경로 또는 상대 경로 모두 가능
- 예: `"output.h5"`, `"data/simulation.h5"`, `"C:/data/output.h5"`

### 2. API 서버 사용 시

**API 엔드포인트:**
```
POST /api/raw-data/save
```

**요청 본문:**
```json
{
  "config_request": {...},
  "echo_data_base64": "...",
  "satellite_states": [...],
  "filepath": "output.h5",  // 저장할 파일 경로
  "group_name": "SSG00"
}
```

**저장 위치:**
- 요청에서 지정한 `filepath`에 저장
- 상대 경로인 경우: API 서버의 현재 작업 디렉토리 기준
- 절대 경로인 경우: 지정한 경로에 저장
- 부모 디렉토리가 없으면 자동 생성

**예시:**
```json
// 상대 경로
"filepath": "output.h5"  // → 현재 디렉토리에 저장

// 절대 경로
"filepath": "C:/data/sar_output.h5"  // → 지정한 경로에 저장

// 하위 디렉토리
"filepath": "data/output/simulation.h5"  // → data/output/ 디렉토리 자동 생성
```

## 파일 저장 동작

### RawDataWriter 동작

1. **파일 경로 지정**: 생성자에서 `filepath` 받음
2. **기존 파일 처리**: 파일이 이미 존재하면 삭제 후 새로 생성
3. **디렉토리 생성**: 부모 디렉토리가 없으면 자동 생성 (API에서만)
4. **파일 형식**: HDF5 형식 (`.h5` 확장자)

### 파일 구조

생성된 HDF5 파일 구조:
```
output.h5
├── (루트 속성)
│   ├── Light Speed
│   ├── Ellipsoid Designator
│   ├── Product Type
│   └── Satellite Height
└── SSG00/ (그룹)
    ├── (그룹 속성)
    │   ├── Beam ID
    │   ├── Radar Frequency
    │   ├── PRF
    │   └── ...
    ├── B000/ (데이터셋)
    │   ├── shape: [num_pulses, num_samples, 2]
    │   ├── dtype: float32
    │   └── (속성)
    │       ├── Lines per Burst
    │       └── Range Chirp Samples
    └── B000_adx/ (보조 데이터)
        └── shape: [num_pulses, 15]
```

## 권장 파일 관리 구조

### 옵션 1: 프로젝트 내 data 디렉토리

```
backend/
├── data/
│   ├── output/          # 시뮬레이션 결과
│   │   ├── simulation_20260124_001.h5
│   │   └── simulation_20260124_002.h5
│   ├── temp/            # 임시 파일
│   └── archive/         # 아카이브
├── sar_simulator/
└── ...
```

**사용 예:**
```python
from datetime import datetime
import os

# 타임스탬프 포함 파일명 생성
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
output_dir = "data/output"
os.makedirs(output_dir, exist_ok=True)
filepath = f"{output_dir}/simulation_{timestamp}.h5"

with RawDataWriter(filepath, config) as writer:
    writer.write_burst(...)
```

### 옵션 2: 환경 변수로 출력 디렉토리 설정

`.env` 파일:
```env
SAR_OUTPUT_DIR=data/output
SAR_TEMP_DIR=data/temp
```

코드에서 사용:
```python
import os
from pathlib import Path

output_dir = os.getenv("SAR_OUTPUT_DIR", "data/output")
Path(output_dir).mkdir(parents=True, exist_ok=True)
filepath = os.path.join(output_dir, "simulation.h5")
```

### 옵션 3: 사용자 홈 디렉토리

```python
from pathlib import Path
import os

home_dir = Path.home()
sar_data_dir = home_dir / "sar_simulator" / "data" / "output"
sar_data_dir.mkdir(parents=True, exist_ok=True)
filepath = str(sar_data_dir / "simulation.h5")
```

## 파일 관리 모범 사례

### 1. 파일명 규칙

권장 파일명 형식:
```
{mission}_{beam}_{timestamp}.h5
예: mission01_beam0000_20260124_143022.h5
```

또는:
```
{simulation_id}_{config_hash}.h5
예: sim_001_a3f2b1c4.h5
```

### 2. 디렉토리 구조

```
data/
├── output/              # 최종 결과
│   ├── 2026/
│   │   ├── 01/
│   │   │   └── 24/
│   │   └── ...
│   └── ...
├── temp/                # 임시 파일
└── archive/             # 아카이브
    └── 2025/
```

### 3. 메타데이터 관리

HDF5 파일에 포함된 메타데이터:
- 시스템 설정 (주파수, 대역폭 등)
- 위성 상태 (위치, 속도)
- 타임스탬프
- 빔 정보

추가 메타데이터는 별도 JSON 파일로 관리:
```json
{
  "simulation_id": "sim_001",
  "created_at": "2026-01-24T14:30:22",
  "config": {...},
  "filepath": "data/output/simulation_001.h5",
  "description": "테스트 시뮬레이션"
}
```

## 파일 크기 고려사항

### 예상 파일 크기

- **단일 펄스**: 약 수 MB ~ 수십 MB
- **100 펄스**: 약 수백 MB
- **1000 펄스**: 약 수 GB

**계산식:**
```
파일 크기 (bytes) = num_pulses × num_samples × 2 (실수/허수) × 4 (float32)
```

### 디스크 공간 관리

1. **정기적인 정리**: 오래된 파일 아카이브 또는 삭제
2. **압축**: 필요시 HDF5 압축 옵션 사용
3. **외부 저장소**: 대용량 파일은 외부 저장소 사용

## 현재 제한사항

1. **기본 출력 디렉토리 없음**: 사용자가 직접 경로 지정 필요
2. **파일 관리 유틸리티 없음**: 파일 목록 조회, 삭제 등 기능 없음
3. **메타데이터 관리 없음**: 파일 정보를 별도로 관리하는 기능 없음

## 향후 개선 방안

1. **기본 출력 디렉토리 설정**
   - 환경 변수 또는 설정 파일로 지정
   - `backend/data/output/` 기본값

2. **파일 관리 API 추가**
   - `GET /api/files/list` - 파일 목록 조회
   - `GET /api/files/info` - 파일 정보 조회
   - `DELETE /api/files/{file_id}` - 파일 삭제

3. **파일 메타데이터 관리**
   - 데이터베이스 또는 JSON 파일로 메타데이터 저장
   - 검색 및 필터링 기능

4. **자동 파일명 생성**
   - 타임스탬프, 설정 해시 등을 포함한 자동 파일명

---

## 관련 문서

- [API 서버 가이드](api_server_guide.md)
- [사용자 가이드](user_guide.md)
- [RawDataWriter API 참조](../sar_simulator/io/raw_data_writer.py)
