# AI 人才评估项目 — API 接口文档

> **项目名称**：AI 人才评估（新人主播能力评估）  
> **版本号**：v1.1.0  
> **更新日期**：2026-07-21  
> **作者**：后端开发团队  
> **状态**：已发布

---

## 目录

1. [文档概述](#1-文档概述)
2. [接口域名 / Base URL](#2-接口域名--base-url)
3. [通用说明](#3-通用说明)
   - [3.1 认证方式](#31-认证方式)
   - [3.2 通用请求头](#32-通用请求头)
   - [3.3 通用响应格式](#33-通用响应格式)
   - [3.4 错误码定义](#34-错误码定义)
4. [接口一：POST 上传视频/图片](#4-接口一post-上传视频图片)
5. [接口二：GET 查询评估结果](#5-接口二get-查询评估结果)
6. [评估结果数据结构说明](#6-评估结果数据结构说明)
7. [调用流程示例](#7-调用流程示例)
8. [附录](#8-附录)

---

## 1. 文档概述

本文档描述了 AI 人才评估项目的 RESTful API 接口规范，供前端（Web / App）及第三方系统集成使用。

**业务场景**：用户（运营/HR）通过前台页面上传新人主播的面试视频及形象照片，后台接收文件后立即返回任务编号（`taskId`），随后异步调用 Google Gemini 大模型对主播的 10 大类、20 小项能力进行综合评估，评估完成后将结果持久化至数据库。前台可通过 `taskId` 轮询查询评估进度与结果。

**评估体系总览**：

| 序号 | 评估维度 | 权重 | 子项（分值） |
|------|----------|------|--------------|
| 1   | 外貌     | 18% | 轮廓五官/立体辨识度(7分)、整体观感(7分)、静态情绪底色(4分) |
| 2   | 气质体态  | 12% | 气质(6分)、体态(6分) |
| 3   | 妆容     | 5%  | 妆容/发型(5分) |
| 4   | 镜前松弛感 | 5%  | 神情自然放松(5分) |
| 5   | 自信心笃定  | 7%  | 语气/气场(7分) |
| 6   | 情绪张力控制力 | 7% | 情绪张力/控制力(7分) |
| 7   | 专注力    | 5%  | 注意力集中/状态维持(5分) |
| 8   | 口音     | 11% | 口条(5分)、声线(6分) |
| 9   | 产品学习表达能力 | 12% | 产品学习能力(5分)、产品表达能力(7分) |
| 10  | 话术天赋   | 18% | 开播留人话术(3分)、内容叙述话术(3分)、互动控场话术(3分)、信任背书话术(3分)、商业转化话术(3分)、下拨沉淀话术(3分) |

**等级划分**：

| 等级 | 分数区间 | 说明 |
|------|----------|------|
| S    | 95–100  | 顶级人才 |
| A+   | 88–94   | 优秀 |
| A    | 80–87   | 良好 |
| B    | 70–79   | 一般 |
| C    | 60–69   | 较弱 |
| C-   | <60     | 不达标 |

---

## 2. 接口域名 / Base URL

| 环境     | Base URL                              |
|----------|---------------------------------------|
| 开发环境 | `http://dev-api.example.com/v1`       |
| 测试环境 | `http://test-api.example.com/v1`      |
| 预发布   | `https://pre-api.example.com/v1`      |
| 生产环境 | `https://api.example.com/v1`          |

> 本文档所有接口路径均相对于上述 Base URL。

---

## 3. 通用说明

### 3.1 认证方式

所有接口均需在 HTTP Header 中携带 `Authorization` 字段进行身份认证。

- **认证类型**：Bearer Token（即 `authKey`）
- **Header 名称**：`Authorization`
- **Header 格式**：

```
Authorization: Bearer <authKey>
```

> `authKey` 由系统管理员统一分配，每个合法调用方持有一个唯一的 `authKey`。  
> 未携带或携带无效 `authKey` 的请求将返回 `401 Unauthorized`。

### 3.2 通用请求头

| Header           | 是否必填 | 说明                              |
|------------------|----------|-----------------------------------|
| `Authorization`  | 是       | Bearer Token，格式见 3.1          |
| `Content-Type`   | 视接口而定 | 上传接口使用 `multipart/form-data`；查询接口使用 `application/json` |
| `Accept`         | 否       | 建议 `application/json`           |
| `X-Request-Id`   | 否       | 调用方自定义的请求追踪 ID，便于日志排查 |

### 3.3 通用响应格式

所有接口统一返回 JSON，结构如下：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": 1752979200000
}
```

| 字段        | 类型          | 说明                                          |
|-------------|---------------|-----------------------------------------------|
| `code`      | integer       | 业务状态码，`0` 表示成功，非 `0` 表示异常       |
| `message`   | string        | 状态描述信息                                  |
| `data`      | object / null | 业务数据，具体结构见各接口定义。失败时为 `null` |
| `timestamp` | integer (int64)| 服务端响应时刻的 Unix 毫秒时间戳               |

### 3.4 错误码定义

#### 通用错误码

| HTTP 状态码 | code  | message                 | 说明                         |
|-------------|-------|-------------------------|------------------------------|
| 401         | 1001  | 未授权：缺少认证信息        | Header 中未携带 `Authorization` |
| 401         | 1002  | 未授权：authKey 无效或已过期 | `authKey` 校验失败              |
| 403         | 1003  | 禁止访问：权限不足          | 当前 `authKey` 无此接口调用权限  |
| 429         | 1004  | 请求过于频繁，请稍后重试     | 触发限流                       |
| 500         | 9999  | 服务器内部错误             | 系统未知异常                   |

#### 业务错误码

| HTTP 状态码 | code  | message                         | 说明                         |
|-------------|-------|---------------------------------|------------------------------|
| 400         | 2001  | 请求参数校验失败                  | 缺少必填字段或字段格式不正确      |
| 400         | 2002  | 文件类型不支持                    | 上传了非 MP4/JPG/PNG 等格式的文件 |
| 400         | 2003  | 文件大小超出限制                  | 单个文件超过最大允许值（视频 500MB，图片 20MB） |
| 400         | 2004  | 未上传任何文件                    | `files` 参数为空               |
| 404         | 3001  | 评估任务不存在                    | `taskId` 在数据库中未找到        |
| 500         | 5001  | 文件存储失败                     | 上传至 OSS/存储服务异常          |
| 500         | 5002  | 评估服务调用失败                  | Gemini 调用异常                |
| 500         | 5003  | 评估结果保存失败                  | 数据库写入异常                  |

---

## 4. 接口一：POST 上传视频/图片

### 4.1 接口说明

前台上传新人主播的面试视频和多张形象照片，后台接收后立即返回 `taskId`，同时异步触发 Gemini 评估流程。

- **URL**：`/evaluation/upload`
- **Method**：`POST`
- **Content-Type**：`multipart/form-data`

### 4.2 请求参数

| 参数名          | 类型        | 必填 | 说明                                                         |
|-----------------|-------------|------|--------------------------------------------------------------|
| `files`         | File[]      | 是   | 视频和图片文件列表。视频支持 `.mp4`、`.mov`、`.avi`；图片支持 `.jpg`、`.jpeg`、`.png`、`.webp`。至少上传 1 个文件，最多 10 个。 |
| `candidateName` | string      | 是   | 候选人姓名，1–50 个字符                                        |
| `candidateId`   | string      | 否   | 候选人编号（如企业内部工号或简历编号），1–64 个字符              |
| `remark`        | string      | 否   | 备注信息（如面试轮次、来源渠道等），最多 500 个字符               |
| `callbackUrl`   | string      | 否   | 评估完成后的 HTTP 回调地址。提供后，系统在评估完成时主动 POST 通知。详见附录 8.1。 |

> **文件限制**：视频单文件 ≤ 500MB，图片单文件 ≤ 20MB；总请求体 ≤ 1GB。

### 4.3 请求示例（curl）

```bash
curl -X POST "https://api.example.com/v1/evaluation/upload" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "files=@/path/to/interview_video.mp4" \
  -F "files=@/path/to/photo_front.jpg" \
  -F "files=@/path/to/photo_side.jpg" \
  -F "candidateName=张三" \
  -F "candidateId=EMP20260001" \
  -F "remark=校园招聘-华东区-第一轮面试" \
  -F "callbackUrl=https://your-app.example.com/callback/evaluation"
```

### 4.4 成功响应

**HTTP Status**：`200 OK`

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

| 字段              | 类型     | 说明                                   |
|-------------------|----------|----------------------------------------|
| `data.taskId`     | string   | 评估任务唯一标识，后续查询进度用此 ID     |
| `data.status`     | string   | 任务状态，上传成功后固定为 `PROCESSING`  |
| `data.createdAt`  | string   | 任务创建时间（ISO 8601 格式，含时区）    |

### 4.5 错误响应示例

**未上传文件**：

```json
{
  "code": 2004,
  "message": "未上传任何文件",
  "data": null,
  "timestamp": 1752979200000
}
```

**文件类型不支持**：

```json
{
  "code": 2002,
  "message": "文件类型不支持：file_3.pdf。支持的格式：视频(.mp4, .mov, .avi)，图片(.jpg, .jpeg, .png, .webp)",
  "data": null,
  "timestamp": 1752979200000
}
```

**文件超出大小限制**：

```json
{
  "code": 2003,
  "message": "文件大小超出限制：interview_video.mp4 (620MB)。视频单文件最大 500MB",
  "data": null,
  "timestamp": 1752979200000
}
```

---

## 5. 接口二：GET 查询评估结果

### 5.1 接口说明

根据上传接口返回的 `taskId`，查询评估任务的当前状态及评估结果。

- **URL**：`/evaluation/result`
- **Method**：`GET`
- **Content-Type**：`application/json`

### 5.2 请求参数（Query String）

| 参数名    | 类型   | 必填 | 说明                                |
|-----------|--------|------|-------------------------------------|
| `taskId`  | string | 是   | 评估任务唯一标识（由上传接口返回）     |

### 5.3 请求示例（curl）

```bash
curl -X GET "https://api.example.com/v1/evaluation/result?taskId=eval_7a3f2b1c8d4e5f6a" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 5.4 响应 — 状态一：处理中（PROCESSING）

Gemini 仍在评估中，尚未产出完整结果。

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

| 字段                       | 类型            | 说明                                                  |
|----------------------------|-----------------|-------------------------------------------------------|
| `data.status`              | string          | `PROCESSING` — 评估进行中                              |
| `data.progress`            | integer         | 评估进度百分比，0–99                                    |
| `data.progressDescription` | string          | 当前评估阶段的文字描述                                   |
| `data.result`              | null            | 处理中时始终为 `null`                                  |

### 5.5 响应 — 状态二：已完成（COMPLETED）

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
            {
              "name": "轮廓五官/立体辨识度",
              "score": 6,
              "maxScore": 7,
              "comment": "脸型流畅舒展，软组织覆盖良好，五官立体度出色，上镜轮廓清晰。侧颜线条流畅。"
            },
            {
              "name": "整体观感",
              "score": 5,
              "maxScore": 7,
              "comment": "整体干净舒服，有一定的辨识度，氛围温和自然，属于让人愿意继续看下去的长相。"
            },
            {
              "name": "静态情绪底色",
              "score": 3,
              "maxScore": 4,
              "comment": "目光柔和有温度，注视时能传递友善。整体呈现放松平和的情绪暗示。"
            }
          ]
        },
        {
          "dimensionId": 2,
          "name": "气质体态",
          "weight": 0.12,
          "weightedScore": 9.0,
          "maxScore": 12.0,
          "subItems": [
            {
              "name": "气质",
              "score": 5,
              "maxScore": 6,
              "comment": "有明显的精致感与高级感，气质出众，适合为品质优良的头部国货或轻奢品牌带货。"
            },
            {
              "name": "体态",
              "score": 4,
              "maxScore": 6,
              "comment": "体态自然端正，放松状态下也能保持基本框架，整体看着精神。"
            }
          ]
        },
        {
          "dimensionId": 3,
          "name": "妆容",
          "weight": 0.05,
          "weightedScore": 3.75,
          "maxScore": 5.0,
          "subItems": [
            {
              "name": "妆容/发型",
              "score": 3,
              "maxScore": 5,
              "comment": "有完整的日常妆容，底妆均匀，眉毛有修饰，气色好。发型干净整齐。"
            }
          ]
        },
        {
          "dimensionId": 4,
          "name": "镜前松弛感",
          "weight": 0.05,
          "weightedScore": 4.0,
          "maxScore": 5.0,
          "subItems": [
            {
              "name": "神情自然放松",
              "score": 4,
              "maxScore": 5,
              "comment": "整体自然放松，偶尔语调稍高或表情略夸张，但很快收回。观众看着舒服愿意停留。"
            }
          ]
        },
        {
          "dimensionId": 5,
          "name": "自信心笃定",
          "weight": 0.07,
          "weightedScore": 5.25,
          "maxScore": 7.0,
          "subItems": [
            {
              "name": "语气/气场",
              "score": 5,
              "maxScore": 7,
              "comment": "整体信心十足，讲解流畅有底气。大部分时间传递出笃定感，有主角感。"
            }
          ]
        },
        {
          "dimensionId": 6,
          "name": "情绪张力控制力",
          "weight": 0.07,
          "weightedScore": 5.25,
          "maxScore": 7.0,
          "subItems": [
            {
              "name": "情绪张力/控制力",
              "score": 5,
              "maxScore": 7,
              "comment": "整体感染力和控制力都不错。正常讲解能带动粉丝，遇到突发基本能稳住。"
            }
          ]
        },
        {
          "dimensionId": 7,
          "name": "专注力",
          "weight": 0.05,
          "weightedScore": 4.0,
          "maxScore": 5.0,
          "subItems": [
            {
              "name": "注意力集中/状态维持",
              "score": 4,
              "maxScore": 5,
              "comment": "整体注意力在线，反应及时。全程精神面貌良好，无明显起伏。"
            }
          ]
        },
        {
          "dimensionId": 8,
          "name": "口音",
          "weight": 0.11,
          "weightedScore": 7.7,
          "maxScore": 11.0,
          "subItems": [
            {
              "name": "口条",
              "score": 4,
              "maxScore": 5,
              "comment": "口齿清晰，表达流畅。偶有轻微口头禅但不影响整体节奏。达到普通话二级甲等水平。"
            },
            {
              "name": "声线",
              "score": 3,
              "maxScore": 6,
              "comment": "声音条件一般，略显单薄，但不影响长时间收听。耐久度尚可。"
            }
          ]
        },
        {
          "dimensionId": 9,
          "name": "产品学习表达能力",
          "weight": 0.12,
          "weightedScore": 9.0,
          "maxScore": 12.0,
          "subItems": [
            {
              "name": "产品学习能力",
              "score": 4,
              "maxScore": 5,
              "comment": "核心信息完整覆盖，关键内容无遗漏、无错误。重点抓得准。"
            },
            {
              "name": "产品表达能力",
              "score": 5,
              "maxScore": 7,
              "comment": "能把产品讲得明白易懂，大部分时间能在通俗和专业之间找到平衡。"
            }
          ]
        },
        {
          "dimensionId": 10,
          "name": "话术天赋",
          "weight": 0.18,
          "weightedScore": 14.4,
          "maxScore": 18.0,
          "subItems": [
            {
              "name": "开播留人话术",
              "score": 2,
              "maxScore": 3,
              "comment": "开场能抓住路人注意力，把产品卖点和粉丝利益挂钩，话术有冲击力。"
            },
            {
              "name": "内容叙述话术",
              "score": 3,
              "maxScore": 3,
              "comment": "能将产品卖点包装成生活场景，有共鸣代入感，叙述自然不生硬。"
            },
            {
              "name": "互动控场话术",
              "score": 2,
              "maxScore": 3,
              "comment": "能自然回应弹幕提问，把粉丝留言融入讲解素材，互动感较好。"
            },
            {
              "name": "信任背书话术",
              "score": 3,
              "maxScore": 3,
              "comment": "使用亲身体验和选品标准建立信任，专业背书能力强。"
            },
            {
              "name": "商业转化话术",
              "score": 2,
              "maxScore": 3,
              "comment": "能通过价格锚定和限时限量制造紧迫感，算账式说服有一定效果。"
            },
            {
              "name": "下拨沉淀话术",
              "score": 2,
              "maxScore": 3,
              "comment": "结束时有引导关注和预告下场的意识，话术还需打磨得更自然。"
            }
          ]
        }
      ],
      "generalTags": [
        { "name": "体力体能", "value": "预计可持续上播 3 小时", "comment": "视频面试过程中精力保持良好" },
        { "name": "语言能力", "value": "普通话二级甲等", "comment": null },
        { "name": "技能特长", "value": "美妆", "comment": "具备基础美妆技能" }
      ],
      "industryAdvantages": [
        { "name": "美妆个护", "matchLevel": "HIGH", "comment": "妆容精致，气质与美妆类目高度匹配" },
        { "name": "生活百货", "matchLevel": "MEDIUM", "comment": "亲和力足，适合生活好物分享" }
      ],
      "overallComment": "该候选人综合素质良好，外貌和气质条件出众，镜前表现自然放松，具备较好的产品学习和表达能力。口音方面声线略显单薄，可通过发声训练进一步提升。话术天赋各子项均展现出可培养的潜力，商业转化话术有亮点。综合评级 A 级，建议进入下一轮面试或安排试播考核。"
    }
  },
  "timestamp": 1752979542000
}
```

> **说明**：以上为一份完整的评估结果示例，共 10 大类 20 小项，满分 100 分。第 10 类"话术天赋"的 6 个子项每项满分 3 分，与其余维度共同参与总分计算。

### 5.6 响应 — 状态三：失败（FAILED）

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
    "candidateId": "EMP20260001",
    "remark": "校园招聘-华东区-第一轮面试",
    "createdAt": "2026-07-20T10:30:00+08:00",
    "updatedAt": "2026-07-20T10:33:28+08:00",
    "fileCount": 3,
    "failureReason": "视频文件损坏或格式无法解析，Gemini 返回错误：Unable to process video file. Error code: VIDEO_DECODE_ERROR",
    "retryable": true,
    "result": null
  },
  "timestamp": 1752979408000
}
```

| 字段                    | 类型    | 说明                                                         |
|-------------------------|---------|--------------------------------------------------------------|
| `data.status`           | string  | `FAILED` — 评估失败                                          |
| `data.failureReason`    | string  | 失败原因的人类可读描述                                         |
| `data.retryable`        | boolean | 是否可通过重新上传重试。`true` 表示可重试（如模型超时），`false` 表示不可重试（如文件本身不可用） |

---

## 6. 评估结果数据结构说明

### 6.1 顶层 result 结构

| 字段                | 类型                  | 说明                                                         |
|---------------------|-----------------------|--------------------------------------------------------------|
| `totalScore`        | float                 | 总分（满分 100）。20 小项得分直接加总即为百分制总分 |
| `grade`             | string                | 等级代码：`S` / `A+` / `A` / `B` / `C` / `C-`               |
| `gradeLabel`        | string                | 等级中文名称：`顶级人才` / `优秀` / `良好` / `一般` / `较弱` / `不达标` |
| `dimensions`        | Dimension[]           | 各维度评估详情，共 10 项                                       |
| `generalTags`       | GeneralTag[]          | 通用标签列表（体力体能、家庭背景、学业背景、语言能力、身体优势、技能特长） |
| `industryAdvantages`| IndustryAdvantage[]   | 行业优势标记列表（美妆个护、服饰鞋包、3C数码、零食食品、生活百货、女装） |
| `overallComment`    | string                | 综合评价描述                                                 |

### 6.2 Dimension 维度结构

| 字段            | 类型        | 说明                                                     |
|-----------------|-------------|----------------------------------------------------------|
| `dimensionId`   | integer     | 维度编号，1–10                                            |
| `name`          | string      | 维度中文名称                                              |
| `weight`        | float       | 权重（0.00–1.00）                                         |
| `weightedScore` | float | 该维度的加权得分（维度内各子项得分之和 × 100 / 100） |
| `maxScore`      | float | 该维度满分（第10类为 18.0） |
| `subItems`      | SubItem[]   | 该维度下的子项评分列表                                     |

### 6.3 SubItem 子项结构

| 字段       | 类型          | 说明                                                  |
|------------|---------------|-------------------------------------------------------|
| `name`     | string        | 子项名称                                               |
| `score`    | integer\|null | 实际得分。定性评估项始终为 `null`                       |
| `maxScore` | integer\|null | 满分。定性评估项始终为 `null`                           |
| `comment`  | string        | Gemini 对该子项的详细评语                                |

### 6.4 GeneralTag 通用标签结构

| 字段      | 类型          | 说明                                      |
|-----------|---------------|-------------------------------------------|
| `name`    | string        | 标签名称（体力体能 / 家庭背景 / 学业背景 / 语言能力 / 身体优势 / 技能特长） |
| `value`   | string\|null  | 标签具体内容                                |
| `comment` | string\|null  | Gemini 备注说明                             |

### 6.5 IndustryAdvantage 行业优势结构

| 字段         | 类型          | 说明                                                      |
|--------------|---------------|-----------------------------------------------------------|
| `name`       | string        | 行业名称（美妆个护 / 服饰鞋包 / 3C数码 / 零食食品 / 生活百货 / 女装） |
| `matchLevel` | string        | 匹配度：`HIGH`（高）/ `MEDIUM`（中）/ `LOW`（低）/ `NONE`（不匹配） |
| `comment`    | string\|null  | 匹配度说明                                                 |

### 6.6 等级映射表

| 总分区间  | 等级代码 | 等级名称 |
|-----------|----------|----------|
| 95 – 100  | `S`      | 顶级人才 |
| 88 – 94   | `A+`     | 优秀     |
| 80 – 87   | `A`      | 良好     |
| 70 – 79   | `B`      | 一般     |
| 60 – 69   | `C`      | 较弱     |
| < 60      | `C-`     | 不达标   |

### 6.7 总分计算说明

总分直接由全部 20 小项的实际得分加总得出（满分 100 分）：

```
totalScore = Σ(各子项 score)   // 满分 100，直接即为百分制总分
```

第 10 类"话术天赋"的 6 个子项每项满分 3 分（共 18 分），与其余 9 类（满分 82 分）共同组成 100 分满分。

---

## 7. 调用流程示例

### 7.1 时序图

```mermaid
sequenceDiagram
    actor Client as 前台/客户端
    participant API as API 服务
    participant OSS as 对象存储
    participant MQ as 消息队列
    participant Worker as 异步评估 Worker
    participant Gemini as Google Gemini
    participant DB as 数据库

    Client->>API: POST /v1/evaluation/upload (视频+图片)
    API->>API: 校验 authKey、文件格式、大小
    API->>OSS: 上传文件
    OSS-->>API: 返回文件 URL 列表
    API->>DB: 创建评估任务 (status=PROCESSING)
    API->>MQ: 发送评估消息 (taskId + fileUrls)
    API-->>Client: 200 { taskId, status: "PROCESSING" }

    MQ->>Worker: 消费评估任务
    Worker->>DB: 更新 progress=10
    Worker->>Gemini: 调用 Gemini API, 传入文件 URL
    Gemini-->>Worker: 返回评估结果 (流式或批量)
    Worker->>Worker: 解析结果、计算加权总分、判定等级
    Worker->>DB: 保存完整评估结果 (status=COMPLETED)

    Client->>API: GET /v1/evaluation/result?taskId=xxx
    API->>DB: 查询任务状态
    API-->>Client: 200 { status: "COMPLETED", result: {...} }

    opt 配置了 callbackUrl
        Worker->>Client: POST callbackUrl (评估完成通知)
    end
```

### 7.2 前端轮询建议

```
推荐轮询间隔：
  - 0–30 秒：每 2 秒一次
  - 30 秒 – 2 分钟：每 5 秒一次
  - 2 分钟后：每 10 秒一次
  - 超时阈值：5 分钟后仍未完成 → 提示用户耐心等待，后台继续处理

终止条件：
  - status === "COMPLETED" → 停止轮询，展示评估结果
  - status === "FAILED"    → 停止轮询，展示失败原因及重试按钮
```

### 7.3 完整调用流程（curl 示例）

**Step 1 — 上传文件**

```bash
# 上传视频和图片，获取 taskId
curl -X POST "https://api.example.com/v1/evaluation/upload" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "files=@interview.mp4" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "candidateName=张三" \
  -F "candidateId=EMP20260001"

# 响应：
# { "code": 0, "data": { "taskId": "eval_7a3f2b1c8d4e5f6a", "status": "PROCESSING", ... } }
```

**Step 2 — 轮询结果**

```bash
# 每隔 5 秒查询一次
while true; do
  RESPONSE=$(curl -s -X GET "https://api.example.com/v1/evaluation/result?taskId=eval_7a3f2b1c8d4e5f6a" \
    -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")

  STATUS=$(echo "$RESPONSE" | jq -r '.data.status')

  if [ "$STATUS" = "COMPLETED" ]; then
    echo "评估完成！"
    echo "$RESPONSE" | jq '.data.result'
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "评估失败："
    echo "$RESPONSE" | jq '.data.failureReason'
    break
  else
    PROGRESS=$(echo "$RESPONSE" | jq -r '.data.progress')
    echo "评估中... 进度: ${PROGRESS}%"
    sleep 5
  fi
done
```

---

## 8. 附录

### 8.1 Gemini 异步回调说明

若上传任务时提供了 `callbackUrl`，系统在评估完成（成功或失败）后会向该地址发送 POST 请求。

**回调请求**：

```
POST <callbackUrl>
Content-Type: application/json

{
  "event": "EVALUATION_COMPLETED",
  "taskId": "eval_7a3f2b1c8d4e5f6a",
  "status": "COMPLETED",
  "completedAt": "2026-07-20T10:35:42+08:00",
  "signature": "sha256=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

> **签名验证**：回调请求 Header 中附带 `X-Callback-Signature: sha256=<hmac_sha256(payload, authKey)>`，接收方可据此验证回调来源真实性。建议接收方务必校验签名。

**重试策略**：回调失败时，系统按 1 秒、5 秒、15 秒、30 秒、1 分钟的间隔重试 5 次，全部失败后不再重试。

### 8.2 文件限制说明

| 限制项           | 值                         |
|------------------|----------------------------|
| 视频支持格式      | `.mp4`, `.mov`, `.avi`     |
| 图片支持格式      | `.jpg`, `.jpeg`, `.png`, `.webp` |
| 视频单文件最大    | 500 MB                     |
| 图片单文件最大    | 20 MB                      |
| 单次请求最大文件数 | 10 个                      |
| 单次请求体最大    | 1 GB                       |
| 视频推荐时长      | 1–30 分钟                  |
| 视频推荐分辨率    | 720p 及以上                |

### 8.3 限流说明

| 限流维度        | 阈值             | 说明                     |
|-----------------|------------------|--------------------------|
| 单 authKey 上传 | 20 次/分钟       | 超出返回 `code: 1004`    |
| 单 authKey 查询 | 120 次/分钟      | 超出返回 `code: 1004`    |
| 全局上传        | 200 次/分钟      | 超出返回 `code: 1004`    |
| 单 IP 上传      | 30 次/分钟       | 超出返回 `code: 1004`    |

响应头中包含限流信息：

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 17
X-RateLimit-Reset: 1752979260
```

### 8.4 评估耗时参考

| 文件情况                    | 预计耗时    |
|-----------------------------|-------------|
| 仅图片（1–3 张）             | 10–30 秒    |
| 1 个短视频（≤ 5 分钟）       | 30–90 秒    |
| 1 个中等视频（5–15 分钟）    | 1.5–3 分钟  |
| 1 个长视频（15–30 分钟）     | 3–5 分钟    |
| 视频 + 多张图片               | 叠加以上耗时 |

> 以上为 Gemini API 正常响应下的参考值，高峰期可能出现延迟。建议前端设置 5 分钟超时提示。

### 8.5 数据安全与隐私

- 上传的文件存储于加密的对象存储（如阿里云 OSS / AWS S3），存储有效期 90 天，到期自动删除。
- 评估结果数据持久化保存，支持按 `candidateId` 关联历史评估记录。
- `authKey` 通过 HTTPS 传输，建议调用方妥善保管，定期轮换。
- 所有 Gemini 调用使用服务端代理模式，调用方 `authKey` 不会暴露给第三方模型服务。

### 8.6 变更记录

| 版本   | 日期       | 变更内容                                         | 作者         |
|--------|------------|--------------------------------------------------|--------------|
| v1.1.0 | 2026-07-21 | 话术天赋(第10类)6子项改为3分制定量打分，总分计算简化为20项直接加总(满分100) | 后端开发团队 |
| v1.0.0 | 2026-07-20 | 初始版本，包含上传和查询两个接口                    | 后端开发团队 |

---

> **文档反馈**：如有疑问或建议，请联系后端开发团队。
