"""
Strava 数据同步脚本
从 Strava API 获取俱乐部骑行数据
"""

import os
from dotenv import load_dotenv

load_dotenv()

STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")


def sync_club_activities():
    """同步俱乐部活动数据"""
    # TODO: 实现 Strava OAuth 和数据获取
    print("Strava sync not yet implemented")
    pass


def main():
    print("Starting Strava sync...")
    sync_club_activities()
    print("Strava sync completed.")


if __name__ == "__main__":
    main()
