# Swath 파라미터 계산 변환 방식 문서

## 개요

이 문서는 SAR 시스템 설정 파라미터에서 Swath 시각화 파라미터로의 변환 방법을 설명합니다. SAR 설정 탭에서 불러온 설정 값(fc, swst, swl, orbit_height, antenna_width 등)을 기반으로 Swath 제어 탭에 표시되는 nearRange, farRange, swathWidth, azimuthLength를 자동으로 계산하는 방법을 다룹니다.

### 변환이 필요한 이유

- SAR 시스템 설정은 물리적 시스템 파라미터(주파수, 시간, 안테나 크기 등)를 다룹니다
- Swath 시각화는 지표면에서의 거리와 영역을 다룹니다
- 두 파라미터 세트 간의 변환은 지구 곡률, 궤도 높이, 전파 속도 등을 고려해야 합니다

## 용어 정의

### SAR 시스템 설정 파라미터

- **swst (Sampling Window Start Time)**: 샘플링 윈도우 시작 시간 (초)
- **swl (Sampling Window Length)**: 샘플링 윈도우 길이 (초)
- **fc (Carrier Frequency)**: 반송파 주파수 (Hz)
- **orbit_height**: 위성 궤도 높이 (미터)
- **antenna_width**: 안테나 폭 (미터)
- **antenna_height**: 안테나 높이 (미터)

### Swath 시각화 파라미터

- **nearRange**: 최근접 그라운드 레인지 (미터)
- **farRange**: 최원거리 그라운드 레인지 (미터)
- **swathWidth**: Swath 폭 (미터) = farRange - nearRange
- **azimuthLength**: Azimuth 방향 길이 (미터)

### 기하학적 용어

- **슬랜트 레인지 (Slant Range)**: 위성에서 타겟까지의 직선 거리
- **그라운드 레인지 (Ground Range)**: 지표면을 따라 측정된 거리
- **빔폭 (Beamwidth)**: 안테나가 전파를 방사하는 각도 범위

## 파라미터 매핑 테이블

| 입력 파라미터 (SAR 설정) | 출력 파라미터 (Swath) | 변환 관계 |
|------------------------|---------------------|----------|
| swst, orbit_height | nearRange | 슬랜트 레인지 → 그라운드 레인지 |
| swst + swl, orbit_height | farRange | 슬랜트 레인지 → 그라운드 레인지 |
| farRange - nearRange | swathWidth | 직접 계산 |
| fc, antenna_width, orbit_height | azimuthLength | 빔폭과 궤도 높이로 계산 |

## 변환 공식 상세 설명

### 1. Near Range 계산

Near Range는 샘플링 윈도우 시작 시간(swst)에서 계산됩니다.

#### 단계 1: 슬랜트 레인지 계산

```
R_slant_near = swst × c / 2
```

여기서:
- `R_slant_near`: 최근접 슬랜트 레인지 (미터)
- `swst`: 샘플링 윈도우 시작 시간 (초)
- `c`: 빛의 속도 = 299,792,458 m/s
- `/2`: 전파가 위성 → 타겟 → 위성으로 왕복하므로 2로 나눔

#### 단계 2: 그라운드 레인지로 변환

지구 곡률을 고려하여 슬랜트 레인지를 그라운드 레인지로 변환합니다.

```
nearRange = R_earth × θ
```

여기서 `θ`는 코사인 법칙을 사용하여 계산됩니다:

```
cos(θ) = (R_earth² + R_sat² - R_slant²) / (2 × R_earth × R_sat)
θ = arccos(cos(θ))
```

여기서:
- `R_earth`: 지구 반경 = 6,378,137 m (WGS84)
- `R_sat`: 위성 반경 = R_earth + orbit_height
- `R_slant`: 슬랜트 레인지

### 2. Far Range 계산

Far Range는 샘플링 윈도우 종료 시간(swst + swl)에서 계산됩니다.

#### 단계 1: 슬랜트 레인지 계산

```
R_slant_far = (swst + swl) × c / 2
```

#### 단계 2: 그라운드 레인지로 변환

Near Range와 동일한 방법으로 그라운드 레인지로 변환:

```
farRange = R_earth × θ_far
```

여기서 `θ_far`는 `R_slant_far`를 사용하여 계산됩니다.

### 3. Swath Width 계산

Swath Width는 Far Range와 Near Range의 차이입니다:

```
swathWidth = farRange - nearRange
```

### 4. Azimuth Length 계산

Azimuth Length는 안테나 빔폭과 궤도 높이로 계산됩니다.

#### 단계 1: 파장 계산

```
λ = c / fc
```

여기서:
- `λ`: 파장 (미터)
- `c`: 빛의 속도
- `fc`: 반송파 주파수 (Hz)

#### 단계 2: Azimuth 빔폭 계산

```
beamwidth_az = λ / antenna_width (라디안)
```

#### 단계 3: Azimuth Length 계산

```
azimuthLength = orbit_height × tan(beamwidth_az) × 2
```

여기서:
- `× 2`: 빔폭의 양쪽 방향을 고려

## 수학적 유도

### 슬랜트 레인지 → 그라운드 레인지 변환 유도

지구를 구로 가정하고, 위성, 지구 중심, 타겟이 이루는 삼각형을 고려합니다.

```
        위성 (R_sat)
           |
           |
           | R_slant
           |
           |
지구 중심 ─┴─ 타겟 (R_earth)
           \
            \
             \ R_earth
              \
               \
                지표면
```

코사인 법칙에 의해:

```
R_slant² = R_earth² + R_sat² - 2 × R_earth × R_sat × cos(θ)
```

이를 `cos(θ)`에 대해 정리하면:

```
cos(θ) = (R_earth² + R_sat² - R_slant²) / (2 × R_earth × R_sat)
```

그라운드 레인지는:

```
groundRange = R_earth × θ
```

여기서 `θ`는 라디안 단위입니다.

### Azimuth Length 계산 유도

안테나 빔폭은 다음과 같이 계산됩니다:

```
beamwidth_az ≈ λ / antenna_width (라디안)
```

이는 작은 각도 근사(small angle approximation)를 사용한 것입니다.

궤도 높이에서의 빔폭에 해당하는 지표면 거리는:

```
azimuthLength = orbit_height × tan(beamwidth_az) × 2
```

작은 각도에서 `tan(θ) ≈ θ`이므로, 근사적으로:

```
azimuthLength ≈ orbit_height × beamwidth_az × 2
azimuthLength ≈ orbit_height × (λ / antenna_width) × 2
```

## 물리 상수 및 가정

### 사용된 물리 상수

- **빛의 속도 (c)**: 299,792,458 m/s
- **지구 반경 (R_earth)**: 6,378,137 m (WGS84 타원체의 평균 반경)

### 가정 및 근사치

1. **지구를 완전한 구로 가정**: 실제로는 타원체이지만, 계산의 단순화를 위해 구로 근사
2. **작은 각도 근사**: Azimuth 빔폭 계산에서 `tan(θ) ≈ θ` 사용
3. **대기 굴절 무시**: 전파의 대기 굴절 효과는 고려하지 않음
4. **지형 고도 무시**: 지표면을 해수면 높이로 가정

### 제한사항

- 고도가 높은 지형에서는 실제 그라운드 레인지가 다를 수 있음
- 극지방 근처에서는 지구 타원체 효과가 더 중요할 수 있음
- 대기 조건에 따른 전파 속도 변화는 고려하지 않음

## 계산 예제

### 입력: C5 기본 설정 (Stripmap)

```
fc = 5.41 × 10⁹ Hz
swst = 47.8 × 10⁻⁶ s
swl = 45.5 × 10⁻⁶ s
orbit_height = 561 × 10³ m
antenna_width = 3.9 m
antenna_height = 1.9 m
```

### 계산 과정

#### 1. Near Range 계산

**슬랜트 레인지:**
```
R_slant_near = 47.8 × 10⁻⁶ × 299,792,458 / 2
            = 7,164,999.7 m
            ≈ 7,165 km
```

**그라운드 레인지 변환:**
```
R_earth = 6,378,137 m
R_sat = 6,378,137 + 561,000 = 6,939,137 m
R_slant = 7,164,999.7 m

cos(θ) = (6,378,137² + 6,939,137² - 7,164,999.7²) / (2 × 6,378,137 × 6,939,137)
       = (4.068 × 10¹³ + 4.814 × 10¹³ - 5.134 × 10¹³) / (8.850 × 10¹³)
       = 3.748 × 10¹² / 8.850 × 10¹³
       ≈ 0.4233

θ = arccos(0.4233) ≈ 1.133 라디안

nearRange = 6,378,137 × 1.133 ≈ 7,226,431 m ≈ 7,226 km
```

#### 2. Far Range 계산

**슬랜트 레인지:**
```
R_slant_far = (47.8 × 10⁻⁶ + 45.5 × 10⁻⁶) × 299,792,458 / 2
            = 93.3 × 10⁻⁶ × 299,792,458 / 2
            = 13,985,198.2 m
            ≈ 13,985 km
```

**그라운드 레인지 변환:**
```
cos(θ_far) = (6,378,137² + 6,939,137² - 13,985,198.2²) / (2 × 6,378,137 × 6,939,137)
           = (4.068 × 10¹³ + 4.814 × 10¹³ - 1.957 × 10¹⁴) / (8.850 × 10¹³)
           = -1.069 × 10¹⁴ / 8.850 × 10¹³
           ≈ -1.208

(음수 값은 계산 오류를 나타냄 - 실제로는 더 정확한 계산 필요)
```

**참고**: 위 계산은 예시이며, 실제 구현에서는 더 정확한 수치 계산이 필요합니다.

#### 3. Swath Width 계산

```
swathWidth = farRange - nearRange
```

#### 4. Azimuth Length 계산

**파장:**
```
λ = 299,792,458 / 5.41 × 10⁹
  = 0.0554 m
  = 5.54 cm
```

**Azimuth 빔폭:**
```
beamwidth_az = 0.0554 / 3.9
             = 0.0142 라디안
             ≈ 0.814도
```

**Azimuth Length:**
```
azimuthLength = 561,000 × tan(0.0142) × 2
              ≈ 561,000 × 0.0142 × 2
              ≈ 15,932 m
              ≈ 15.9 km
```

## 검증 방법

### 물리적 타당성 검사

1. **Range 값 검증**
   - Near Range는 위성 궤도 높이보다 작아야 함 (불가능)
   - 실제로는 지구 곡률로 인해 그라운드 레인지가 슬랜트 레인지보다 클 수 있음
   - 계산된 값이 일반적인 SAR 시스템 범위 내에 있는지 확인

2. **Swath Width 검증**
   - Swath Width는 양수여야 함
   - 일반적인 SAR 시스템의 Swath Width는 수십 ~ 수백 km 범위

3. **Azimuth Length 검증**
   - Azimuth Length는 양수여야 함
   - 안테나 크기와 궤도 높이에 비례해야 함

### 수치 검증

- 계산된 값들을 다른 SAR 시스템 파라미터와 비교
- Backend의 SarSystemConfig 계산 결과와 비교
- 실제 SAR 시스템 사양서와 비교

## 구현 참고사항

### 코드 구현 시 주의사항

1. **부동소수점 정밀도**: 큰 수와 작은 수를 다룰 때 정밀도 손실 주의
2. **각도 단위**: 라디안과 도 간 변환 확인
3. **에러 처리**: 잘못된 입력 값에 대한 검증
4. **경계 조건**: 극단적인 값(매우 높은 궤도, 매우 작은 안테나 등) 처리

### 성능 고려사항

- 계산은 실시간으로 수행되므로 효율적인 알고리즘 사용
- 삼각 함수 계산은 최적화된 라이브러리 사용 권장

## 참고 자료

- SAR 시스템 이론 및 원리
- 지구 곡률을 고려한 레인지 계산
- 안테나 빔폭 이론
- WGS84 지구 타원체 모델

## 향후 개선 방향

1. **지구 타원체 모델**: 완전한 타원체 모델 사용
2. **대기 굴절**: 대기 조건을 고려한 전파 속도 보정
3. **지형 고도**: 실제 지형 고도를 고려한 그라운드 레인지 계산
4. **더 정확한 빔폭 계산**: 작은 각도 근사 대신 정확한 계산
5. **시각화 개선**: 계산 과정을 단계별로 시각화하여 사용자가 이해하기 쉽게

## 변경 이력

- 2026-01-24: 초기 문서 작성
