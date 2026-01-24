"""
공통 모듈

SAR Simulator에서 공통으로 사용하는 유틸리티 및 설정 모듈입니다.
"""

from sar_simulator.common.constants import (
    LIGHT_SPEED,
    BOLZMAN_CONST,
    PI,
)

from sar_simulator.common.sar_system_config import (
    SarSystemConfig,
)

from sar_simulator.common.target_model import (
    Target,
    TargetList,
)

from sar_simulator.common.geometry_utils import (
    calc_distance_to_target,
    calc_2way_range,
    calc_time_delay,
    calc_ambiguous_time_delay,
)

from sar_simulator.common.propagation_model import (
    calc_atmospheric_loss,
    calc_path_loss,
)

__all__ = [
    "LIGHT_SPEED",
    "BOLZMAN_CONST",
    "PI",
    "SarSystemConfig",
    "Target",
    "TargetList",
    "calc_distance_to_target",
    "calc_2way_range",
    "calc_time_delay",
    "calc_ambiguous_time_delay",
    "calc_atmospheric_loss",
    "calc_path_loss",
]
