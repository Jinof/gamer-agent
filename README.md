# Gamer Agent Skills

《帝国时代 IV》对局复盘技能。

## 技能

- [aoe4-demo-analysis](skills/aoe4-demo-analysis/SKILL.md)：先通过 AoE4 World 开源解析器读取对局摘要，以解析数据为准，再结合双方录像分析关键节点、双方表现和积分映射胜率。

## 使用

将 `skills/aoe4-demo-analysis` 整个目录安装到宿主支持的技能目录，保留其中的 `assets` 资源。向助手提供对局摘要或双方录像，也可请求分析最近一局。

解析器来源：[aoe4world/replays-api](https://github.com/aoe4world/replays-api)。详细流程与数据来源要求见技能说明。
