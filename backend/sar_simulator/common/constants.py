"""
물리 상수 정의

SAR Simulator에서 사용하는 물리 상수들을 정의합니다.
"""

import numpy as np

# 빛의 속도 (m/s)
LIGHT_SPEED: float = 299792458.0

# 볼츠만 상수 (J/K)
BOLZMAN_CONST: float = 1.380649e-23

# 원주율
PI: float = np.pi

# 각도 변환 상수
DEG2RAD: float = PI / 180.0
RAD2DEG: float = 180.0 / PI
