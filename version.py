# version.py

VERSION_INFO = {
    "version": "2.1.3",          # 当前版本号
    "build_date": "2025-09-16",  # 构建日期
    "channel": "stable",         # 更新通道
    "app_name": "看海量化回测平台", # 应用名称
    "build_id": "LB-20250125-DEPLOYHOTFIX"  # Lazybacktest 版本代碼，請回報此編號以追蹤改動
}

def get_version():
    """获取版本号"""
    return VERSION_INFO["version"]

def get_version_info():
    """获取完整版本信息"""
    return VERSION_INFO.copy()

def get_channel():
    """获取更新通道"""
    return VERSION_INFO["channel"]
