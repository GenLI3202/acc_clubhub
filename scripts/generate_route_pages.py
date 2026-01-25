"""
路线页面生成脚本
从数据库读取路线数据，生成 .qmd 文件
"""

import os

ROUTES_DIR = "content/routes"


def generate_route_page(route_data: dict):
    """生成单个路线的 .qmd 页面"""
    template = f"""---
title: "{route_data['name']}"
description: "{route_data.get('description', '')}"
date: "{route_data.get('date', '')}"
categories: [{route_data.get('category', '')}]
---

## 路线信息

- **距离**: {route_data.get('distance', 'N/A')} km
- **爬升**: {route_data.get('elevation', 'N/A')} m
- **难度**: {route_data.get('difficulty', 'N/A')}

## 路线描述

{route_data.get('description', '待添加')}

## GPX 下载

[下载 GPX 文件](/assets/gpx/{route_data.get('gpx_file', '')})
"""
    return template


def main():
    print("Route page generation not yet implemented")
    # TODO: 从数据库读取路线，生成页面


if __name__ == "__main__":
    main()
