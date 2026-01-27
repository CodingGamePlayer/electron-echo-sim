"""
SAR Simulator API 서버 메인 애플리케이션

FastAPI 기반 REST API 서버의 진입점입니다.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import config, chirp, echo, raw_data, sar_image, satellite
from api.database import init_db

# FastAPI 앱 생성
app = FastAPI(
    title="SAR Simulator API",
    description="SAR Sensor Simulator와 SAR Echo Simulator를 위한 REST API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 데이터베이스 초기화"""
    init_db()

# CORS 설정 (프론트엔드 연동 시 필요)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(config.router, prefix="/api/config", tags=["Config"])
app.include_router(chirp.router, prefix="/api/chirp", tags=["Chirp"])
app.include_router(echo.router, prefix="/api/echo", tags=["Echo"])
app.include_router(raw_data.router, prefix="/api/raw-data", tags=["Raw Data"])
app.include_router(sar_image.router, prefix="/api/sar-image", tags=["SAR Image"])
app.include_router(satellite.router, prefix="/api/satellite", tags=["Satellite"])


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    헬스 체크 엔드포인트
    
    서버 상태를 확인합니다.
    """
    return {
        "status": "healthy",
        "service": "SAR Simulator API",
        "version": "1.0.0"
    }


@app.get("/", tags=["Root"])
async def root():
    """
    루트 엔드포인트
    
    API 문서 링크를 제공합니다.
    """
    return {
        "message": "SAR Simulator API",
        "docs": "/api/docs",
        "redoc": "/api/redoc",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
