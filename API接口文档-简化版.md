# AI 人才评估 — API 接口文档（简化版）

> **版本号**：v1.1.0  
> **更新日期**：2026-07-21

---

## 1. 文档概述

本文档描述 AI 人才评估项目的核心 RESTful API，用于上传新人主播的面试视频及照片，并查询 Gemini 大模型对 10 大类 20 小项能力的综合评估结果。

---

## 2. 认证方式

所有接口均需在 HTTP Header 中携带 `Authorization`：

```
Authorization: Bearer <authKey>
```

`authKey` 由系统管理员统一分配，未携带或无效将返回 `401`。

---

## 3. 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": 1752979200000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | integer | `0` 成功，非 `0` 异常 |
| `message` | string | 状态描述 |
| `data` | object / null | 业务数据，失败时为 `null` |
| `timestamp` | integer (int64) | 服务端响应时刻的 Unix 毫秒时间戳 |

---

## 4. 接口一：POST 上传视频/图片

- **URL**：`/evaluation/upload`
- **Method**：`POST`
- **Content-Type**：`multipart/form-data`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `files` | File[] | 是 | 视频和图片文件。视频支持 `.mp4`/`.mov`/`.avi`，图片支持 `.jpg`/`.jpeg`/`.png`/`.webp`。最少 1 个，最多 10 个。视频 ≤ 500MB，图片 ≤ 20MB |
| `candidateName` | string | 是 | 候选人姓名，1–50 字符 |
| `candidateId` | string | 否 | 候选人编号，1–64 字符 |
| `remark` | string | 否 | 备注信息，最多 500 字符 |
| `callbackUrl` | string | 否 | 评估完成后的 HTTP 回调地址 |

### curl 示例

```bash
curl -X POST "https://api.example.com/v1/evaluation/upload" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "files=@interview_video.mp4" \
  -F "files=@photo_front.jpg" \
  -F "files=@photo_side.jpg" \
  -F "candidateName=张三" \
  -F "candidateId=EMP20260001" \
  -F "remark=校园招聘-华东区-第一轮面试"
```

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "eval_7a3f2b1c8d4e5f6a",
    "status": "PROCESSING",
    "createdAt": "2026-07-20T10:30:00+08:00"
  },
  "timestamp": 1752979200000
}
```

### 常见错误

| 情形 | code | message |
|------|------|---------|
| 文件类型不支持 | 2002 | 文件类型不支持（仅支持 .mp4/.mov/.avi/.jpg/.jpeg/.png/.webp） |
| 文件超出大小限制 | 2003 | 视频 ≤ 500MB，图片 ≤ 20MB |
| 未上传任何文件 | 2004 | `files` 参数为空 |
| 缺少认证 | 1001 | Header 中未携带 `Authorization` |

---

## 5. 接口二：GET 查询评估结果

- **URL**：`/evaluation/result`
- **Method**：`GET`

### 请求参数（Query String）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `taskId` | string | 是 | 评估任务唯一标识（由上传接口返回） |

### curl 示例

```bash
curl -X GET "https://api.example.com/v1/evaluation/result?taskId=eval_7a3f2b1c8d4e5f6a" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 状态一：处理中（PROCESSING）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "eval_7a3f2b1c8d4e5f6a",
    "status": "PROCESSING",
    "progress": 45,
    "progressDescription": "正在分析产品学习表达能力...",
    "candidateName": "张三",
    "candidateId": "EMP20260001",
    "remark": "校园招聘-华东区-第一轮面试",
    "createdAt": "2026-07-20T10:30:00+08:00",
    "updatedAt": "2026-07-20T10:32:15+08:00",
    "fileCount": 3,
    "result": null
  },
  "timestamp": 1752979335000
}
```

### 状态二：已完成（COMPLETED）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "eval_7a3f2b1c8d4e5f6a",
    "status": "COMPLETED",
    "progress": 100,
    "progressDescription": "评估完成",
    "candidateName": "张三",
    "candidateId": "EMP20260001",
    "remark": "校园招聘-华东区-第一轮面试",
    "createdAt": "2026-07-20T10:30:00+08:00",
    "updatedAt": "2026-07-20T10:35:42+08:00",
    "completedAt": "2026-07-20T10:35:42+08:00",
    "fileCount": 3,
    "evaluationDurationMs": 342000,
    "result": {
      "totalScore": 81.0,
      "grade": "A",
      "gradeLabel": "良好",
      "dimensions": [
        {
          "dimensionId": 1,
          "name": "外貌",
          "weight": 0.18,
          "weightedScore": 14.4,
          "maxScore": 18.0,
          "subItems": [
            { "name": "轮廓五官/立体辨识度", "score": 6, "maxScore": 7, "comment": "脸型流畅舒展，软组织覆盖良好，五官立体度出色。" },
            { "name": "整体观感", "score": 5, "maxScore": 7, "comment": "干净舒服，有辨识度，氛围温和自然。" },
            { "name": "静态情绪底色", "score": 3, "maxScore": 4, "comment": "目光柔和有温度，呈现放松平和的情绪暗示。" }
          ]
        },
        {
          "dimensionId": 2,
          "name": "气质体态",
          "weight": 0.12,
          "weightedScore": 9.0,
          "maxScore": 12.0,
          "subItems": [
            { "name": "气质", "score": 5, "maxScore": 6, "comment": "有明显精致感与高级感，适合国货或轻奢品牌。" },
            { "name": "体态", "score": 4, "maxScore": 6, "comment": "体态自然端正，放松状态下也能保持基本框架。" }
          ]
        },
        {
          "dimensionId": 3,
          "name": "妆容",
          "weight": 0.05,
          "weightedScore": 3.75,
          "maxScore": 5.0,
          "subItems": [
            { "name": "妆容/发型", "score": 3, "maxScore": 5, "comment": "完整日常妆容，底妆均匀，气色好。" }
          ]
        },
        {
          "dimensionId": 4,
          "name": "镜前松弛感",
          "weight": 0.05,
          "weightedScore": 4.0,
          "maxScore": 5.0,
          "subItems": [
            { "name": "神情自然放松", "score": 4, "maxScore": 5, "comment": "整体自然放松，观众看着舒服愿意停留。" }
          ]
        },
        {
          "dimensionId": 5,
          "name": "自信心笃定",
          "weight": 0.07,
          "weightedScore": 5.25,
          "maxScore": 7.0,
          "subItems": [
            { "name": "语气/气场", "score": 5, "maxScore": 7, "comment": "信心十足，讲解流畅有底气，有主角感。" }
          ]
        },
        {
          "dimensionId": 6,
          "name": "情绪张力控制力",
          "weight": 0.07,
          "weightedScore": 5.25,
          "maxScore": 7.0,
          "subItems": [
            { "name": "情绪张力/控制力", "score": 5, "maxScore": 7, "comment": "感染力和控制力都不错，遇突发基本能稳住。" }
          ]
        },
        {
          "dimensionId": 7,
          "name": "专注力",
          "weight": 0.05,
          "weightedScore": 4.0,
          "maxScore": 5.0,
          "subItems": [
            { "name": "注意力集中/状态维持", "score": 4, "maxScore": 5, "comment": "注意力在线，精神面貌良好，无明显起伏。" }
          ]
        },
        {
          "dimensionId": 8,
          "name": "口音",
          "weight": 0.11,
          "weightedScore": 7.7,
          "maxScore": 11.0,
          "subItems": [
            { "name": "口条", "score": 4, "maxScore": 5, "comment": "口齿清晰，表达流畅，达普通话二级甲等水平。" },
            { "name": "声线", "score": 3, "maxScore": 6, "comment": "声音条件一般，略显单薄，但不影响长时间收听。" }
          ]
        },
        {
          "dimensionId": 9,
          "name": "产品学习表达能力",
          "weight": 0.12,
          "weightedScore": 9.0,
          "maxScore": 12.0,
          "subItems": [
            { "name": "产品学习能力", "score": 4, "maxScore": 5, "comment": "核心信息完整覆盖，关键内容无遗漏、无错误。" },
            { "name": "产品表达能力", "score": 5, "maxScore": 7, "comment": "能把产品讲得明白易懂，通俗和专业之间能找到平衡。" }
          ]
        },
        {
          "dimensionId": 10,
          "name": "话术天赋",
          "weight": 0.18,
          "weightedScore": 14.4,
          "maxScore": 18.0,
          "subItems": [
            { "name": "开播留人话术", "score": 2, "maxScore": 3, "comment": "开场能抓住路人注意力，话术有冲击力。" },
            { "name": "内容叙述话术", "score": 3, "maxScore": 3, "comment": "能将产品卖点包装成生活场景，叙述自然不生硬。" },
            { "name": "互动控场话术", "score": 2, "maxScore": 3, "comment": "能自然回应弹幕，把粉丝留言融入讲解素材。" },
            { "name": "信任背书话术", "score": 3, "maxScore": 3, "comment": "使用亲身体验和选品标准建立信任，专业背书能力强。" },
            { "name": "商业转化话术", "score": 2, "maxScore": 3, "comment": "能通过价格锚定和限时限量制造紧迫感。" },
            { "name": "下拨沉淀话术", "score": 2, "maxScore": 3, "comment": "结束时有引导关注和预告下场的意识。" }
          ]
        }
      ],
      "generalTags": [
        { "name": "体力体能", "value": "预计可持续上播 3 小时", "comment": "精力保持良好" },
        { "name": "语言能力", "value": "普通话二级甲等", "comment": null },
        { "name": "技能特长", "value": "美妆", "comment": "具备基础美妆技能" }
      ],
      "industryAdvantages": [
        { "name": "美妆个护", "matchLevel": "HIGH", "comment": "妆容精致，气质与美妆类目高度匹配" },
        { "name": "生活百货", "matchLevel": "MEDIUM", "comment": "亲和力足，适合生活好物分享" }
      ],
      "overallComment": "该候选人综合素质良好，外貌和气质条件出众，镜前表现自然放松，具备较好的产品学习和表达能力。综合评级 A 级，建议进入下一轮面试或安排试播考核。"
    }
  },
  "timestamp": 1752979542000
}
```

### 状态三：失败（FAILED）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "eval_7a3f2b1c8d4e5f6a",
    "status": "FAILED",
    "progress": 35,
    "progressDescription": "评估失败",
    "candidateName": "张三",
    "createdAt": "2026-07-20T10:30:00+08:00",
    "updatedAt": "2026-07-20T10:33:28+08:00",
    "fileCount": 3,
    "failureReason": "视频文件损坏或格式无法解析，Gemini 返回错误：VIDEO_DECODE_ERROR",
    "retryable": true,
    "result": null
  },
  "timestamp": 1752979408000
}
```

---

## 6. 评估结果字段说明

### 维度 / 子项结构

| 层级 | 字段 | 类型 | 说明 |
|------|------|------|------|
| result | `totalScore` | float | 总分（满分 100） |
| result | `grade` | string | 等级代码：`S` / `A+` / `A` / `B` / `C` / `C-` |
| result | `gradeLabel` | string | 等级中文名：顶级人才 / 优秀 / 良好 / 一般 / 较弱 / 不达标 |
| result | `overallComment` | string | 综合评价描述 |
| dimension | `dimensionId` | integer | 维度编号，1–10 |
| dimension | `name` | string | 维度中文名称 |
| dimension | `weight` | float | 权重（0.00–1.00） |
| dimension | `weightedScore` | float | 该维度加权得分 |
| dimension | `maxScore` | float | 该维度满分 |
| subItem | `name` | string | 子项名称 |
| subItem | `score` | integer | 实际得分 |
| subItem | `maxScore` | integer | 满分 |
| subItem | `comment` | string | Gemini 评语 |
| generalTag | `name` / `value` / `comment` | string | 通用标签（体力体能、语言能力、技能特长等） |
| industryAdvantage | `name` / `matchLevel` / `comment` | string | 行业匹配（HIGH / MEDIUM / LOW / NONE） |

### 总分计算

全部 20 小项的 `score` 直接加总即为百分制总分（满分 100）。

### 等级映射

| 总分区间 | 等级代码 | 等级名称 |
|----------|----------|----------|
| 95–100   | `S`      | 顶级人才 |
| 88–94    | `A+`     | 优秀     |
| 80–87    | `A`      | 良好     |
| 70–79    | `B`      | 一般     |
| 60–69    | `C`      | 较弱     |
| <60       | `C-`     | 不达标   |

---

## 7. 错误码速查表

| HTTP 状态码 | code | message | 说明 |
|-------------|------|---------|------|
| 401 | 1001 | 未授权：缺少认证信息 | Header 中未携带 `Authorization` |
| 401 | 1002 | 未授权：authKey 无效或已过期 | `authKey` 校验失败 |
| 403 | 1003 | 禁止访问：权限不足 | 当前 `authKey` 无此接口调用权限 |
| 429 | 1004 | 请求过于频繁，请稍后重试 | 触发限流 |
| 400 | 2001 | 请求参数校验失败 | 缺少必填字段或格式不正确 |
| 400 | 2002 | 文件类型不支持 | 非 MP4/JPG/PNG 等格式 |
| 400 | 2003 | 文件大小超出限制 | 视频 > 500MB 或图片 > 20MB |
| 400 | 2004 | 未上传任何文件 | `files` 参数为空 |
| 404 | 3001 | 评估任务不存在 | `taskId` 在数据库中未找到 |
| 500 | 5001 | 文件存储失败 | OSS/存储服务异常 |
| 500 | 5002 | 评估服务调用失败 | Gemini 调用异常 |
| 500 | 5003 | 评估结果保存失败 | 数据库写入异常 |
| 500 | 9999 | 服务器内部错误 | 系统未知异常 |
