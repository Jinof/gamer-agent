---
name: aoe4-demo-analysis
description: 对《帝国时代 IV》1v1 对局双方录像分析, 给出胜利者做的对的地方以及失败者做的可改进的地方。截图分析对局录像，给出关键对局节点，以及各时间点的胜率。
---

# AoE4 双视角录像复盘

使用 `gamer-agent` CLI, 处理用户指定的对局录像文件。
工作目录为 ~/.gamer-agent

## 第一步: 确定对局录像
根据用户给出对局双方的对局录像文件地址确定对局录像，若用户未指定默认从 Xbox/Windows 截图/录像目录中搜索。与用户确认文件。记文件为 A B。

### 准备工具与查询录像信息

以下 PowerShell 代码块在同一会话中依次执行。替换双方录像路径；工具不在 PATH 时，将 `$ffmpeg`、`$ffprobe` 改为对应 exe 的完整路径。每次运行建立独立截图目录。

```powershell
$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
$videos = @(
    @{ Id = 'A'; Path = 'C:\录像\玩家 A.mp4' },
    @{ Id = 'B'; Path = 'C:\录像\玩家 B.mp4' }
)
$captureRoot = Join-Path $HOME ('.gamer-agent\frames-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $captureRoot | Out-Null
$invariant = [Globalization.CultureInfo]::InvariantCulture
$missing = [Collections.Generic.List[object]]::new()
foreach ($v in $videos) {
    $v.Path = (Resolve-Path -LiteralPath $v.Path).Path
    $probe = & $ffprobe -v error -select_streams v:0 -show_entries 'stream=width,height,duration:format=duration' -of json $v.Path
    if ($LASTEXITCODE -ne 0) { throw "无法读取录像 $($v.Id)" }
    $info = ($probe -join "`n") | ConvertFrom-Json
    if (@($info.streams).Count -eq 0) { throw "录像 $($v.Id) 没有视频轨道" }
    $probe | Set-Content -LiteralPath (Join-Path $captureRoot "$($v.Id)-probe.json") -Encoding utf8
    $probe # JSON 中包含时长、宽度和高度
}

function Export-ReviewFrame {
    param($Video, [decimal]$Seconds, [string]$Stage, [switch]$AllowMissing)
    if ($Seconds -lt 0) { throw '截图时间不能为负数' }
    $timestamp = $Seconds.ToString($invariant)
    $file = Join-Path $captureRoot "$($Video.Id)-$Stage-$($timestamp)s.jpg"
    if (Test-Path -LiteralPath $file) { throw "截图已存在：$file" }
    & $ffmpeg -hide_banner -loglevel error -nostdin -n -ss $timestamp -i $Video.Path -map 0:v:0 -frames:v 1 -an -sn -dn -vf 'scale=800:600:force_original_aspect_ratio=decrease,pad=800:600:(ow-iw)/2:(oh-ih)/2,setsar=1' -q:v 2 -update 1 $file
    $exitCode = $LASTEXITCODE
    $hasFrame = (Test-Path -LiteralPath $file) -and ((Get-Item -LiteralPath $file).Length -gt 0)
    if ($exitCode -ne 0 -or -not $hasFrame) {
        if (-not $AllowMissing) { throw "取帧失败：玩家 $($Video.Id)，录像 $timestamp 秒，退出码 $exitCode" }
        $missing.Add([pscustomobject]@{ player = $Video.Id; video_seconds = $Seconds; exit_code = $exitCode; reason = '结束点未生成有效截图；检查是否超出可解码范围及 FFmpeg 错误' })
        ConvertTo-Json -InputObject @($missing.ToArray()) -Depth 4 | Set-Content -LiteralPath (Join-Path $captureRoot 'missing-frames.json') -Encoding utf8
        Write-Warning "结束点缺帧：玩家 $($Video.Id)，录像 $timestamp 秒"
    }
}
```

缩略图等比例缩放并填充黑边至 800×600，保留完整游戏画面。截图中的时间使用录像秒数；游戏时间需根据第二步的对齐结果换算。

## 第二步：对齐对局人员以及录像游戏时间

1. 截取两段录像的 **1、3、5、6、7、8 秒**画面，并转为缩略图 800x600。
2. 逐张读取第 1、3、5 秒的截图：读取游戏内时钟，记录“玩家、文明、计时器时间、计时器总时间、播放/暂停/加载状态”。
3. 核对录像是否属于同一对局：玩家、文明、录像计时器总时间一致。任意不一致则提示用户“两局录像不属于同一个对局”
4. 找“录像稳定计时器时间”：读取第 6、7、8 秒的截图，结合 1、3、5 秒的画面找出录像的稳定录制时的计时器时间。如果截图中计时器增加的时间等于截图间隔的时间，则表示录像稳定。
5. 对齐“开始分析计时器时间”。选择 A B 中 “录像稳定计时器时间” 中的较大者，作为“开始分析计时器时间”
6. 对齐“开始分析偏移时间”。根据“开始分析计时器时间”所对应的截图时间，作为“开始分析偏移时间“
7. 计算”结束分析偏移时间“。”等于”开始分析偏移时间“ + “计时器总时间”
8. 输出对局的玩家、文明、地图、录像稳定计时器时间（以及定义）、开始分析计时器时间（以及定义）、开始分析偏移时间（以及定义）
### 开场六个时间点截图

```powershell
foreach ($v in $videos) {
    foreach ($seconds in @(1, 3, 5, 6, 7, 8)) {
        Export-ReviewFrame -Video $v -Seconds $seconds -Stage 'opening'
    }
}
```

## 第三步：分析对局游戏
1. 从"开始分析偏移时间"到“结束分析偏移时间”每隔 10s 截图画面，转为缩略图 800x600，“结束分析偏移时间”要确保截图。
2. 分析每张截图，按照计时器时间，列出每张截图中的“截图统计信息”：食、木、金、石的数量、以及各资源的农民的数量、资源比例、建造队列、当前积分、地图控制度，是否战斗中，军队各单位的数量，军队单位 Counter 占比，胜率。
3. 地图控制度说明：可见视野 / 总图视野。
4. 军队单位 Counter 占比说明：单位 Counter 另一个单位记为 1，单位 Counter 多个单位均记 1.
5. 胜率：按以下规定和公式计算。

### 每 10 秒采样与结束点补帧

`gamer-agent video analyze` 当前固定每 60 秒采样。本 SKILL 的 10 秒截图使用以下 FFmpeg 循环完成。将示例的开始、结束偏移替换为第二步确认的双方录像秒数；两段范围应对应同一游戏时间区间。

```powershell
$ranges = @{
    A = @{ Start = [decimal]3; End = [decimal]26 }
    B = @{ Start = [decimal]9; End = [decimal]32 }
}
foreach ($v in $videos) {
    $range = $ranges[$v.Id]
    if ($range.Start -lt 0 -or $range.End -lt $range.Start) { throw "玩家 $($v.Id) 的采样范围无效" }
    for ($seconds = $range.Start; $seconds -lt $range.End; $seconds += 10) {
        Export-ReviewFrame -Video $v -Seconds $seconds -Stage 'sample'
    }
    # 循环不含结束点，因此无论是否为 10 秒整数倍，都恰好补一次结束点。
    Export-ReviewFrame -Video $v -Seconds $range.End -Stage 'sample' -AllowMissing
}
```

视频时长边界不保证存在可解码帧。结束点缺帧时查看 `missing-frames.json` 与 FFmpeg 错误并在分析中说明，不用其他时间的截图冒充结束点；非结束点取帧失败则停止处理。

### 1. 胜率规定

取同一游戏时间点双方的积分 $S_A,S_B>0$。

| A 积分 / B 积分 | A 胜率 |
| --- | --- |
| 1.0 | 50% |
| 1.1 | 60% |
| 1.2 | 75% |
| ≥ 1.3 | 100% |

双方胜率之和为 100%；交换双方积分后，胜率互换。

### 2. 公式

```text
x = (S_A - S_B) / min(S_A, S_B)
P_A = max(0, min(1, 1/2 + 11*x/12 + 25*x^3/3))
P_B = 1 - P_A
```

$P_A,P_B$ 取值为 0～1，输出时转换为百分比。

### 3. 胜率映射曲线

![积分比与胜率映射曲线](assets/score-win-probability.png)

## 第四步：输出总结
输出 Markdown 报告时，胜率公式统一使用带 `text` 标记的三反引号代码块，按下方模板放在玩家卡片之后、统计表之前。

文本输出模板，不允许超出模板之外的信息：
````markdown
{玩家卡片}（玩家A）
{玩家卡片}（玩家B）

### 胜率计算公式

```text
x = (S_A - S_B) / min(S_A, S_B)
P_A = max(0, min(1, 1/2 + 11*x/12 + 25*x^3/3))
P_B = 1 - P_A
```

{胜率曲线:svg}

胜者分析：
做的对的地方：
待改进的地方：
败者分析：
做的对的地方：
待改建的地方：
胜率转折点分析：
|计时器时间|玩家A录像偏移时间|玩家A截图说明|玩家B录像偏移时间|玩家B截图说明|胜率|


````
玩家卡片定义：
```
玩家名称: {玩家名称}
文明: {文明}
胜负：{胜/负}
```
