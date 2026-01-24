"""
타겟 모델

SAR 시뮬레이션에서 사용하는 타겟을 정의하는 모듈입니다.
"""

import numpy as np
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class Target:
    """
    단일 타겟 정의
    
    Attributes:
    -----------
    position : np.ndarray
        타겟 위치 (ECEF 좌표, shape: [3], 단위: m)
        [x, y, z]
    reflectivity : float
        반사도 (RCS, 단위: m²)
    phase : float
        위상 (단위: deg)
    """
    position: np.ndarray
    reflectivity: float = 1.0
    phase: float = 0.0
    
    def __post_init__(self):
        """초기화 후 검증"""
        if self.position.shape != (3,):
            raise ValueError("position은 3D 벡터여야 합니다 (shape: [3])")


class TargetList:
    """
    타겟 리스트 클래스
    
    여러 타겟을 관리하고 벡터화된 연산을 제공합니다.
    """
    
    def __init__(self, targets: List[Target] = None):
        """
        TargetList 초기화
        
        Parameters:
        -----------
        targets : List[Target], optional
            타겟 리스트
        """
        self.targets: List[Target] = targets if targets is not None else []
    
    def add_target(self, target: Target):
        """타겟 추가"""
        self.targets.append(target)
    
    def add_targets(self, targets: List[Target]):
        """여러 타겟 추가"""
        self.targets.extend(targets)
    
    def to_array(self) -> np.ndarray:
        """
        타겟 리스트를 배열로 변환
        
        Returns:
        --------
        np.ndarray
            타겟 배열 (shape: [num_targets, 5])
            각 행: [x, y, z, reflectivity, phase]
        """
        if len(self.targets) == 0:
            return np.zeros((0, 5), dtype=np.float64)
        
        array = np.zeros((len(self.targets), 5), dtype=np.float64)
        for i, target in enumerate(self.targets):
            array[i, 0:3] = target.position
            array[i, 3] = target.reflectivity
            array[i, 4] = target.phase
        
        return array
    
    @classmethod
    def from_array(cls, array: np.ndarray) -> 'TargetList':
        """
        배열로부터 TargetList 생성
        
        Parameters:
        -----------
        array : np.ndarray
            타겟 배열 (shape: [num_targets, 5])
            각 행: [x, y, z, reflectivity, phase]
        
        Returns:
        --------
        TargetList
            생성된 TargetList
        """
        targets = []
        for row in array:
            target = Target(
                position=row[0:3],
                reflectivity=row[3],
                phase=row[4]
            )
            targets.append(target)
        
        return cls(targets)
    
    def __len__(self) -> int:
        """타겟 개수 반환"""
        return len(self.targets)
    
    def __getitem__(self, index: int) -> Target:
        """인덱스로 타겟 접근"""
        return self.targets[index]
