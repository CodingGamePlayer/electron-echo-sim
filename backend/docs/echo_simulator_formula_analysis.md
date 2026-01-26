# Echo Simulator 수식 분석 및 문제점

## 목적
Echo Simulator에서 위성 위치와 방향 값을 사용하여 결과를 생성하는 과정에서 수식의 정확성을 검증하고 문제점을 파악합니다.

## 표준 레이더 방정식

### Monostatic 레이더 방정식 (표준)
```
Pr = Pt * G_tx * G_rx * λ² * σ / ((4π)³ * R⁴ * L)
```

Monostatic 레이더의 경우 (G_tx = G_rx = G):
```
Pr = Pt * G² * λ² * σ / ((4π)³ * R⁴ * L)
```

여기서:
- `Pr`: 수신 전력
- `Pt`: 송신 전력
- `G_tx`, `G_rx`: 송신/수신 안테나 게인
- `λ`: 파장
- `σ`: 타겟 RCS (반사도)
- `R`: 단방향 거리
- `L`: 시스템 손실 (linear scale)

### 신호 진폭 계산
신호 진폭은 수신 전력의 제곱근에 비례:
```
A = sqrt(Pr) = sqrt(Pt) * G * λ * sqrt(σ) / ((4π)^(3/2) * R² * sqrt(L))
```

## 현재 구현 분석

### 현재 코드 수식
```python
# 1. 기본 계수
c1 = Pt * λ² * G² / ((4π)³ * loss_linear * atmospheric_loss)

# 2. 타겟별 계수
c = sqrt(c1 * σ / (R_2way/2)⁴)
   = sqrt(Pt * λ² * G² * σ / ((4π)³ * loss_linear * atmospheric_loss * R⁴))
   = sqrt(Pt) * G * λ * sqrt(σ) / ((4π)^(3/2) * R² * sqrt(loss_linear * atmospheric_loss))

# 3. 최종 계수
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
      = sqrt(Pt) * G^(3/2) * λ * sqrt(σ) / ((4π)^(3/2) * R² * sqrt(loss_linear * atmospheric_loss)) * exp(-j*2π*fc*td)
```

### 문제점 1: 안테나 게인 중복 계산

**문제:**
- `c1`에서 이미 `G²`를 사용 (송신 게인과 수신 게인을 모두 포함)
- `coeff`에서 `sqrt(G_rx)`를 다시 곱함
- 결과적으로 `G^(3/2)`가 되어 잘못됨

**올바른 방법:**
옵션 1: c1에서 G_tx만 사용하고, coeff에서 sqrt(G_rx) 곱하기
```python
c1 = Pt * λ² * G_tx / ((4π)³ * loss_linear * atmospheric_loss)
c = sqrt(c1 * σ / R⁴)
coeff = c * exp(-j*2π*fc*td) * sqrt(G_rx)
```

옵션 2: c1에서 G² 사용하고, coeff에서 sqrt(G_rx) 곱하지 않기
```python
c1 = Pt * λ² * G² / ((4π)³ * loss_linear * atmospheric_loss)
c = sqrt(c1 * σ / R⁴)
coeff = c * exp(-j*2π*fc*td)  # sqrt(G_rx) 제거
```

**현재 상황:**
- `ant_gain`은 타겟 방향에 따른 안테나 게인 (송신/수신 동일 방향 가정)
- Monostatic이므로 G_tx = G_rx = ant_gain
- 따라서 `ant_gain²`는 올바르지만, `sqrt(G_rx)`를 다시 곱하면 안 됨

### 문제점 2: 안테나 게인 계산에서 방위 빔폭 미사용

**현재 구현:**
```python
def calc_antenna_gain_simple(...):
    # 고도 빔폭만 사용
    gain = max_gain * np.exp(-2.0 * (angle ** 2) / ((np.deg2rad(beamwidth_el) / 2) ** 2))
    # beamwidth_az는 사용되지 않음!
```

**문제:**
- `beamwidth_az` 파라미터를 받지만 사용하지 않음
- 2D 안테나 패턴을 제대로 모델링하지 못함
- 고도 방향만 고려하고 방위 방향은 무시

**개선 방안:**
고도와 방위 각도를 분리하여 계산:
```python
# 타겟 방향을 고도/방위 좌표계로 변환
# el_angle, az_angle 계산
# 각각의 빔폭에 대해 가우시안 적용
gain_el = np.exp(-2.0 * (el_angle ** 2) / ((np.deg2rad(beamwidth_el) / 2) ** 2))
gain_az = np.exp(-2.0 * (az_angle ** 2) / ((np.deg2rad(beamwidth_az) / 2) ** 2))
gain = max_gain * gain_el * gain_az
```

### 문제점 3: 위성 속도 미사용

**현재 상황:**
- `satellite_velocity` 파라미터를 받지만 사용하지 않음
- 도플러 효과를 고려하지 않음

**도플러 효과:**
SAR에서는 위성의 속도에 따라 도플러 주파수 이동이 발생:
```
fd = 2 * v_r / λ
```
여기서 `v_r`은 위성-타겟 방향의 상대 속도 (radial velocity)

**개선 방안:**
도플러 주파수 이동을 위상에 포함:
```python
# 상대 속도 계산
target_direction = (target_position - satellite_position) / R
v_r = np.dot(satellite_velocity, target_direction)
fd = 2.0 * v_r / wavelength

# 위상에 도플러 효과 추가
coeff = c * exp(-j*2π*(fc*td + fd*t)) * sqrt(G_rx)
```

### 문제점 4: 빔 방향 기본값

**현재 구현:**
```python
if beam_direction is None:
    beam_direction = -satellite_position / np.linalg.norm(satellite_position)
```

**문제:**
- 지구 중심 방향을 기본값으로 사용
- 위성의 자세(attitude)를 고려하지 않음
- 실제 안테나 지향 방향과 다를 수 있음

**개선 방안:**
- 위성 자세 정보를 파라미터로 받아서 빔 방향 계산
- 또는 명시적으로 빔 방향을 제공하도록 요구

## 권장 수정 사항

### 1. 안테나 게인 중복 계산 수정
```python
# echo_generator.py 수정
# c1 계산에서 G² 대신 G 사용 (또는 coeff에서 sqrt(G_rx) 제거)
c1 = (self.config.Pt * self.config.wavelength ** 2 * ant_gain /  # G² → G
      ((4.0 * PI) ** 3 * loss_linear * atmospheric_loss))
# 또는
coeff = (c[idx] * np.exp(-1j * 2.0 * PI * self.config.fc * td[idx]))  # sqrt(G_rx) 제거
```

### 2. 안테나 게인 계산 개선
```python
# geometry_utils.py 수정
# 고도/방위 각도를 분리하여 계산
# beamwidth_az도 사용하도록 수정
```

### 3. 위성 속도 활용 (선택사항)
```python
# 도플러 효과 추가 (향후 개선)
```

## 검증 방법

1. 수식 검증: 표준 레이더 방정식과 비교
2. 단위 검증: 각 항의 단위 확인
3. 물리적 의미 검증: 결과가 물리적으로 타당한지 확인
4. 테스트: 기존 테스트와 비교하여 수정 후 결과 확인
