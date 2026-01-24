---
name: swath 파라미터 계산 수정 (rank 문제 해결 - Look angle 기본값 가정)
overview: Look angle을 기본값(30도)으로 가정하여 rank를 추정하고, 이를 통해 Near Range와 Swath Width를 올바르게 계산하도록 수정합니다.
todos:
  - id: add_rank_estimation
    content: rank 추정 함수 추가 - Look angle 30도 기본값 가정, orbit_height와 swst, prf로부터 rank 계산
    status: completed
  - id: update_slant_range_calc
    content: 슬랜트 레인지 계산 수정 - swst 직접 해석 대신 rank 기반 계산으로 변경
    status: completed
  - id: verify_calculation
    content: C5 설정값으로 검증 - Near Range와 Swath Width가 올바르게 계산되는지 확인
    status: completed
isProject: false
---

# Swath 파라미터 계산 수정 (Rank 문제 해결)

## 문제 분석

현재 `src/utils/swath-param-calculator.ts`에서 `swst`를 직접 슬랜트 레인지로 해석하여 계산하면, `swst * c / 2`가 `orbit_height`보다 훨씬 작아서 물리적으로 불가능한 값이 나옵니다. 이는 `swst`가 레이더 모호성(ambiguity)을 고려하지 않은 샘플링 시작 시간이기 때문입니다.

## 해결 방안

기존 Python 코드의 `rank` 개념을 도입하여 올바른 거리를 계산합니다:

- `rank = ceil((2 * min_range / c - swst) * prf)`
- `min_dist_swst = 0.5 * c * (rank / prf + swst)`
- `max_dist_swet = 0.5 * c * (rank / prf + swst + swl - taup)`

Look angle 정보가 없으므로 기본값 30도를 가정합니다.

## 구현 계획

### 1. Rank 추정 함수 추가

- `src/utils/swath-param-calculator.ts`에 `estimateRank()` 함수 추가
- Look angle 기본값: 30도
- 최소 거리 = `orbit_height / cos(look_angle)`
- `rank = ceil((2 * min_range / c - swst) * prf)`

### 2. 슬랜트 레인지 계산 수정

- `calculateSwathParamsFromSarConfig()` 함수 수정
- `swst * c / 2` 대신 `rank`를 사용한 계산으로 변경
- `nearSlantRange = 0.5 * c * (rank / prf + swst)`
- `farSlantRange = 0.5 * c * (rank / prf + swst + swl - taup)`

### 3. `slantToGroundRange` 함수 개선

- 현재 함수는 이미 코사인 법칙을 사용하여 올바르게 구현되어 있음
- 슬랜트 레인지가 `orbit_height`보다 큰 경우만 처리하도록 보장

### 4. 검증

- C5 설정값으로 테스트하여 올바른 값이 나오는지 확인
- 예상 결과: Near Ground Range ≈ 340-460 km, Swath Width ≈ 7-10 km

## 파일 수정

- `src/utils/swath-param-calculator.ts`: rank 추정 및 계산 로직 추가

## 참고

- 향후 `el_angle`, `az_angle` 정보가 추가되면 더 정확한 rank 추정이 가능합니다.
- 현재는 Look angle 30도를 기본값으로 사용하지만, 이는 일반적인 SAR 시나리오에 적합합니다.