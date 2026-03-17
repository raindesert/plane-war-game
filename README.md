# 飞机大战游戏

一个基于Flask + HTML5 Canvas + JavaScript的飞机大战游戏，包含完整的游戏循环、碰撞检测、计分系统和特殊道具功能。

## 功能特性

- **多种敌机类型**: 普通敌机、快速敌机、重型敌机、Boss
- **道具系统**: 增加火力、护盾、激光升级、额外生命
- **计分和等级系统**: 难度递增机制
- **视觉效果**: 爆炸粒子、受伤动画、无敌时间闪烁
- **平滑控制**: 键盘控制，支持斜向移动

## 技术栈

- **后端**: Flask (Python Web框架)
- **前端**: HTML5 Canvas + JavaScript (游戏逻辑和渲染)
- **样式**: CSS3 (游戏界面美化)

## 安装和运行

1. 安装依赖:
```bash
pip install -r requirements.txt
```

2. 启动服务器:
```bash
python app.py
```

3. 访问游戏:
```
http://localhost:5000
```

## 操作说明

- **WASD** 或 **方向键**: 移动飞机
- **空格键**: 发射子弹（或自动发射）
- **R键**: 游戏结束后重新开始

## 游戏规则

- 消灭敌机获得分数
- 收集掉落道具获得特殊能力
- 受伤后进入无敌时间
- 每1000分升一级，难度增加
- Boss在等级10、20、30时出现

## 项目结构

```
plane-war-game/
├── app.py                 # Flask后端应用
├── requirements.txt      # Python依赖
├── README.md             # 项目说明
├── templates/
│   └── index.html        # 主页面（游戏入口）
└── static/
    ├── js/
    │   └── game.js       # 游戏核心逻辑
    └── css/
        └── style.css     # 游戏样式
```
