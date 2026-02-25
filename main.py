from time import time
from fastapi import FastAPI
from python_research.routes.aqi_route import router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Stealth AQI API", description="API for AQI route analysis and forecasting", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            
    allow_credentials=True,
    allow_methods=["*"],            
    allow_headers=["*"],            
)

# --- THE ALWAYS-ON HEALTH ROUTE ---
@app.get("/health")
async def health_check():
    """
    Core system health check. 
    Always runs from the main entry point.
    """
    return {
        "status": "online",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "environment": "production_stealth",
        "uptime_check": True
    }

app.include_router(router)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)