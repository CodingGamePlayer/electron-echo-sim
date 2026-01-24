# SAR Swath와 Pulse 개념 정리

SAR (Synthetic Aperture Radar) 시뮬레이터에서 Swath와 Pulse의 관계를 설명합니다.

## 목차

1. [개념 개요](#개념-개요)
2. [Swath (면)](#swath-면)
3. [Pulse (선)](#pulse-선)
4. [관계](#관계)
5. [파라미터 설정](#파라미터-설정)
6. [코드에서의 표현](#코드에서의-표현)
7. [데이터 구조](#데이터-구조)
8. [실제 예시](#실제-예시)

---

## 개념 개요

### 핵심 개념

```
Swath (면) = 여러 Pulse (선들)의 집합
```

- **Swath**: 위성이 지나가며 커버하는 지상 영역 (2D 면적)
- **Pulse**: 위성이 특정 위치에서 Range 방향으로 발사하는 레이더 신호 (1D 선)

### 시각적 표현

```
위성 궤도 방향 (Azimuth)
    ↓
    P1  P2  P3  P4  P5  ...  P100  (Pulse들)
    |   |   |   |   |         |
    └───┴───┴───┴───┴─────────┘
         Swath (면적)
         
Range 방향 (Cross-track)
    ←─────────────→
    Near    Far
    
각 Pulse (선):
    [sample1, sample2, sample3, ..., sampleN]
    ←────────── num_samples ──────────→
    (Range 방향의 거리 샘플들)
```

---

## Swath (면)

### 정의

**Swath**는 위성이 궤도를 따라 이동하면서 레이더로 관측하는 지상 커버리지 영역입니다.

### 특징

- **2D 면적**: Azimuth 방향(궤도 방향) × Range 방향(Cross-track)
- **기하 파라미터**:
  - `nearRange`: 근거리 (m)
  - `farRange`: 원거리 (m)
  - `swathWidth`: Swath 폭 (m) = farRange - nearRange
  - `azimuthLength`: Azimuth 방향 길이 (m)

### Frontend에서의 표현

```typescript
// src/types/sar-swath.types.ts
interface SARSwathGeometry {
  nearRange: number;      // 면의 시작 (m)
  farRange: number;       // 면의 끝 (m)
  swathWidth: number;     // 면의 폭 (m)
  azimuthLength: number;  // 면의 길이 (m) ← 여러 Pulse가 이 길이를 형성
  centerLat: number;
  centerLon: number;
  heading: number;
}
```

---

## Pulse (선)

### 정의

**Pulse**는 위성이 특정 위치에서 Range 방향으로 발사하는 레이더 펄스 신호입니다.

### 특징

- **1D 선**: Range 방향(Cross-track)으로만 확장
- **시간적 순간**: 위성이 특정 위치에 있을 때 발사
- **샘플 구성**: `num_samples`개의 Range 샘플로 구성

### Backend에서의 표현

```python
# backend/sar_simulator/common/sar_system_config.py
self.num_samples: int = int(self.swl * self.fs)
# swl = 샘플링 윈도우 길이 (Range 방향의 시간)
# num_samples = Range 방향의 샘플 개수
```

### Echo 신호 생성

```python
# backend/sar_simulator/echo/echo_simulator.py
def simulate_echo(
    satellite_position: np.ndarray,  # ← 하나의 Pulse 위치
    ...
) -> np.ndarray:
    # 하나의 Pulse에 대한 Echo 신호 반환
    return echo_signal  # shape: [num_samples]
```

---

## 관계

### 구조적 관계

```
Swath (면)
  ├─ Pulse 1 (선) → [sample1, sample2, ..., sampleN]
  ├─ Pulse 2 (선) → [sample1, sample2, ..., sampleN]
  ├─ Pulse 3 (선) → [sample1, sample2, ..., sampleN]
  ├─ ...
  └─ Pulse N (선) → [sample1, sample2, ..., sampleN]
```

### 형성 과정

1. **위성 이동**: 위성이 궤도를 따라 이동
2. **Pulse 발사**: 각 위치에서 Range 방향으로 Pulse 발사
3. **Echo 수신**: 각 Pulse마다 Echo 신호 수신 (Range 방향 샘플)
4. **Swath 형성**: 여러 Pulse의 Echo 신호가 모여 Swath 면적 형성

### 계산식

한 Swath를 형성하는데 필요한 Pulse 개수:

```
필요한 Pulse 개수 = Swath 길이 / (위성 속도 / PRF)

예시:
- azimuthLength: 50,000m (50km)
- PRF: 5000 Hz (초당 5000개 펄스)
- 위성 속도: 7266 m/s

필요한 Pulse 개수:
= 50,000 / (7266 / 5000)
≈ 34,400개 Pulse
```

---

## 파라미터 설정

### Pulse 간격 설정 (Azimuth 방향)

**직접 설정 불가능**: 하나의 Pulse가 Azimuth 방향으로 몇 m를 구성하는지 직접 설정하는 파라미터는 없습니다.

**간접 설정 가능**: PRF (Pulse Repetition Frequency)를 조정하여 Pulse 간격을 변경할 수 있습니다.

#### 계산식

```
Pulse 간격 (Azimuth 방향) = 위성 속도 / PRF
```

#### 예시

```
위성 속도: 7266 m/s

PRF = 5000 Hz  →  Pulse 간격 = 7266 / 5000 = 1.45 m
PRF = 10000 Hz →  Pulse 간격 = 7266 / 10000 = 0.73 m
PRF = 2500 Hz  →  Pulse 간격 = 7266 / 2500 = 2.91 m
```

#### 설정 방법

```python
# backend/api/schemas/config.py
config = {
    "prf": 5000,  # PRF를 조정하여 Pulse 간격 제어
    ...
}
```

**주의사항:**
- PRF를 높이면 Pulse 간격이 좁아집니다 (더 많은 Pulse)
- PRF를 낮추면 Pulse 간격이 넓어집니다 (더 적은 Pulse)
- 위성 속도는 궤도 높이에 의해 결정되므로 변경할 수 없습니다

---

### Swath Width 설정 (Range 방향)

**Frontend: 직접 설정 가능**

Frontend에서는 Swath width를 직접 설정할 수 있습니다:

```typescript
// src/types/sar-swath.types.ts
interface SARSwathGeometry {
  nearRange: number;      // 근거리 (m)
  farRange: number;       // 원거리 (m)
  swathWidth: number;     // Swath 폭 (m) = farRange - nearRange
  ...
}
```

**Backend: 간접 설정**

Backend에서는 Swath width를 직접 설정하는 파라미터가 없습니다. 대신 `swst`와 `swl` 파라미터로 간접적으로 제어됩니다.

#### 계산식

```
Swath width (Range 방향) ≈ swl * c / 2

여기서:
- swl: 샘플링 윈도우 길이 (s)
- c: 빛의 속도 (299,792,458 m/s)
```

#### 설정 방법

```python
# backend/api/schemas/config.py
config = {
    "swst": 10e-6,  # 샘플링 윈도우 시작 시간 (s)
    "swl": 50e-6,   # 샘플링 윈도우 길이 (s) ← Swath width 결정
    ...
}
```

#### 예시

```
swl = 50e-6 s (50μs)
→ Swath width ≈ 50e-6 * 299,792,458 / 2 ≈ 7,495 m

swl = 100e-6 s (100μs)
→ Swath width ≈ 100e-6 * 299,792,458 / 2 ≈ 14,990 m
```

**정리:**

| 파라미터 | Frontend | Backend | 설정 방법 |
|---------|----------|---------|----------|
| **Pulse 간격** (Azimuth) | - | PRF로 간접 설정 | `prf` 파라미터 조정 |
| **Swath Width** (Range) | 직접 설정 가능 | `swst`, `swl`로 간접 설정 | Frontend: `swathWidth`, Backend: `swl` |

---

## 코드에서의 표현

### Frontend (Swath 관리)

```typescript
// src/managers/SwathManager.ts
export class SwathManager {
  // Swath 추가 (면적 단위)
  addStaticSwath(
    geometry: SARSwathGeometry,  // 면적 정보
    options?: Partial<SwathVisualizationOptions>,
    groupId?: string
  ): string
  
  // 실시간 추적 (여러 Swath 누적)
  addRealtimeTrackingSwath(
    satellitePositionGetter: () => {...},
    swathParams: {...},
    ...
  ): string
}
```

### Backend (Echo 시뮬레이션)

```python
# backend/sar_simulator/echo/echo_simulator.py
class SarEchoSimulator:
    # 단일 Pulse Echo 시뮬레이션
    def simulate_echo(
        self,
        satellite_position: np.ndarray,  # 하나의 Pulse 위치
        ...
    ) -> np.ndarray:
        return echo_signal  # shape: [num_samples]
    
    # 여러 Pulse Echo 시뮬레이션
    def simulate_multiple_pulses(
        self,
        satellite_positions: np.ndarray,  # 여러 Pulse 위치들
        ...
    ) -> np.ndarray:
        return echo_signals  # shape: [num_pulses, num_samples]
```

---

## 데이터 구조

### 단일 Pulse

```python
echo_signal.shape = [num_samples]
# 예: [12500]
# = Range 방향의 12500개 샘플 (선)
```

### 여러 Pulse (Swath)

```python
echo_signals.shape = [num_pulses, num_samples]
# 예: [100, 12500]
# = 100개의 선들이 모여서 면을 형성
```

### API 응답 형식

```json
// 단일 Pulse
{
  "success": true,
  "shape": [12500],
  "dtype": "complex64",
  "data": "base64_encoded_data...",
  "num_samples": 12500
}

// 여러 Pulse
{
  "success": true,
  "shape": [100, 12500],
  "dtype": "complex64",
  "data": "base64_encoded_data...",
  "num_pulses": 100,
  "num_samples": 12500
}
```

---

## 실제 예시

### 시나리오: 한 Swath 시뮬레이션

**Swath 정보:**
- `azimuthLength`: 50,000m (50km)
- `swathWidth`: 400,000m (400km)
- `nearRange`: 200,000m
- `farRange`: 600,000m

**시스템 파라미터:**
- `PRF`: 5000 Hz
- `위성 속도`: 7266 m/s
- `fs`: 250,000,000 Hz
- `swl`: 0.00005 s (50μs)

**계산:**

1. **필요한 Pulse 개수:**
   ```
   num_pulses = 50,000 / (7266 / 5000) ≈ 34,400개
   ```

2. **각 Pulse의 샘플 수:**
   ```
   num_samples = swl * fs = 0.00005 * 250,000,000 = 12,500개
   ```

3. **최종 데이터 구조:**
   ```python
   echo_signals.shape = [34400, 12500]
   # 34,400개의 Pulse (선)
   # 각 Pulse마다 12,500개의 Range 샘플
   ```

4. **API 호출:**
   ```python
   # /api/echo/simulate-multiple
   {
     "satellite_states": [
       {"position": [...], "velocity": [...]},  # Pulse 1
       {"position": [...], "velocity": [...]},  # Pulse 2
       ...
       {"position": [...], "velocity": [...]}    # Pulse 34400
     ]
   }
   ```

---

## 요약

| 개념 | 차원 | 설명 | 데이터 구조 |
|------|------|------|------------|
| **Swath** | 2D (면) | 위성이 커버하는 지상 영역 | Frontend: `SARSwathGeometry` |
| **Pulse** | 1D (선) | Range 방향의 레이더 신호 | Backend: `[num_samples]` |
| **여러 Pulse** | 2D (면) | 여러 Pulse가 모여 Swath 형성 | Backend: `[num_pulses, num_samples]` |

### 핵심 포인트

1. **Swath = 면**: 2D 지상 커버리지 영역
2. **Pulse = 선**: Range 방향의 1D 신호
3. **여러 Pulse → Swath**: 여러 선들이 모여 면을 형성
4. **Backend 처리**: Pulse 단위로 Echo 시뮬레이션 수행
5. **Frontend 표시**: Swath 단위로 시각화
6. **Pulse 간격**: PRF로 간접 설정 (직접 설정 불가)
7. **Swath Width**: Frontend에서 직접 설정 가능, Backend에서는 `swl`로 간접 설정

---

## 관련 문서

- [Backend 아키텍처](../backend/docs/architecture.md)
- [API 서버 가이드](../backend/docs/api_server_guide.md)
- [함수 참조](../backend/docs/function_reference.md)
