"""
ACC ClubHub - FastAPI 后端应用
会员注册、活动管理、报名系统
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ACC ClubHub API",
    description="ACC 俱乐部后端服务",
    version="0.1.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ACC ClubHub API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# TODO: 导入路由
# from routes import members, events, rsvp
# app.include_router(members.router, prefix="/api/members", tags=["members"])
# app.include_router(events.router, prefix="/api/events", tags=["events"])
# app.include_router(rsvp.router, prefix="/api/rsvp", tags=["rsvp"])
