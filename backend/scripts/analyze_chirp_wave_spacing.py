"""
Chirp 신호의 파동 간격 변화 분석
"""
import numpy as np
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sar_simulator.common.constants import PI
from sar_simulator.common import SarSystemConfig
from sar_simulator.sensor import SarSensorSimulator

# 설정
config = SarSystemConfig(
    fc=5.4e9,
    bw=150e6,
    taup=10e-6,
    fs=350e6,
    prf=5000,
    swst=10e-6,
    swl=50e-6,
    orbit_height=517e3,
    antenna_width=4.0,
    antenna_height=0.5
)

# Chirp 신호 생성
sim = SarSensorSimulator(config)
chirp = sim.generate_chirp_signal()

# 시간 벡터
dt = 1.0 / config.fs
n = len(chirp)
t = (np.arange(n) - n / 2) * dt
t_us = t * 1e6

# Chirp rate 및 순시 주파수
chirp_rate = config.bw / config.taup
instantaneous_freq = chirp_rate * t

# 실수부
real = chirp.real

print("=== Chirp Signal Wave Spacing Analysis ===\n")
print(f"Chirp rate (Kr): {chirp_rate/1e12:.2f} THz/s")
print(f"Time range: {t[0]*1e6:.3f} ~ {t[-1]*1e6:.3f} μs")
print(f"Instantaneous freq range: {instantaneous_freq[0]/1e6:.2f} ~ {instantaneous_freq[-1]/1e6:.2f} MHz")
print(f"Total samples: {n}\n")

# 구간별 분석
regions = [
    ('Early (Wide)', 0, n//4),
    ('Mid-Early', n//4, n//2),
    ('Mid-Late', n//2, 3*n//4),
    ('Late (Narrow)', 3*n//4, n)
]

print("=== Region Analysis ===")
for name, start, end in regions:
    region_real = real[start:end]
    region_t = t[start:end]
    region_t_us = region_t * 1e6
    region_inst_freq = instantaneous_freq[start:end]
    
    # Zero crossing 계산
    zero_crossings = np.sum(np.diff(np.sign(region_real)) != 0)
    
    if zero_crossings > 0:
        avg_period = (region_t[-1] - region_t[0]) / zero_crossings
        avg_freq = 1 / avg_period if avg_period > 0 else 0
    else:
        avg_period = 0
        avg_freq = 0
    
    inst_freq_start = chirp_rate * region_t[0]
    inst_freq_end = chirp_rate * region_t[-1]
    inst_freq_avg = (inst_freq_start + inst_freq_end) / 2
    
    print(f"\n{name} region (samples {start}-{end}):")
    print(f"  Time range: {region_t_us[0]:.3f} ~ {region_t_us[-1]:.3f} μs")
    print(f"  Zero crossings: {zero_crossings}")
    if avg_period > 0:
        print(f"  Avg period: {avg_period*1e9:.3f} ns")
        print(f"  Avg freq from period: {avg_freq/1e6:.2f} MHz")
    print(f"  Inst freq range: {inst_freq_start/1e6:.2f} ~ {inst_freq_end/1e6:.2f} MHz")
    print(f"  Inst freq avg: {inst_freq_avg/1e6:.2f} MHz")
    
    # 파동 간격 변화 확인
    if zero_crossings > 1:
        # 각 zero crossing 사이의 간격 계산
        sign_changes = np.where(np.diff(np.sign(region_real)) != 0)[0]
        if len(sign_changes) > 1:
            periods = np.diff(region_t[sign_changes])
            print(f"  Period variations: min={np.min(periods)*1e9:.3f} ns, max={np.max(periods)*1e9:.3f} ns")
            print(f"  Period change: {(np.max(periods) - np.min(periods))/np.min(periods)*100:.1f}%")

print("\n=== Comparison with echo_sim_cmd ===")
print("echo_sim_cmd/chirp.py uses:")
print("  phi = 2*π*(fc*t + (k/2)*t²)  [with carrier frequency fc]")
print("  s_t = cos(phi)")
print("")
print("backend/sar_simulator/sensor/chirp_generator.py uses:")
print("  s(t) = exp(j*π*Kr*t²)  [baseband, no carrier]")
print("  Real part: cos(π*Kr*t²)")
print("")
print("Both methods are correct, but:")
print("- echo_sim_cmd includes carrier frequency, so wave spacing is more visible")
print("- backend uses baseband signal, so wave spacing change is smaller")
print("- The actual frequency modulation (chirp) is the same in both")
