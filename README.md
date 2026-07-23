# AI 人才评估系统

基于 Google Gemini 的新人主播人才评估 API 服务。

## 技术栈

- **运行时**: Node.js 22 + TypeScript
- **框架**: Express 4.x
- **数据库**: PostgreSQL + Prisma ORM
- **AI**: Google Gemini API
- **部署**: Docker + Kubernetes (AKS) + GitHub Actions

## 项目结构

```
ai-talent-eval/
├── shared/              # 共享类型定义
├── server/              # Express 后端 API
│   ├── prisma/          # 数据库 Schema + 迁移
│   └── src/
│       ├── routes/      # API 路由
│       ├── services/    # 评估引擎 + Gemini 调用
│       ├── middleware/   # 认证 + 错误处理
│       └── utils/       # 评分计算 + 错误类
├── k8s/                 # Kubernetes 部署配置
├── .github/workflows/   # CI/CD
└── Dockerfile
```

## API 端点

| 方法   | 路径                    | 说明                       |
|--------|-------------------------|----------------------------|
| POST   | `/evaluation/upload`    | 上传视频/图片，创建评估任务 |
| GET    | `/evaluation/result`    | 查询评估进度和结果         |
| GET    | `/api/health`           | 健康检查                   |

所有端点统一响应格式：`{ code, message, data, timestamp }`

## 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库（需要先启动 PostgreSQL）
cd server && npx prisma db push

# 启动开发服务器
npm run dev
```

## 环境变量

参考 `server/.env.example`

| 变量              | 说明                                    |
|-------------------|----------------------------------------|
| `PORT`            | 服务端口，默认 3000                      |
| `DATABASE_URL`    | PostgreSQL 连接串                       |
| `AUTH_KEYS`       | Bearer token 认证密钥，逗号分隔          |
| `GEMINI_API_KEY`  | Google Gemini API 密钥                  |
| `GEMINI_MODEL`    | Gemini 模型，默认 gemini-2.5-flash       |
| `MOCK_MODE`       | `true` 时跳过 Gemini API，返回模拟结果    |
| `UPLOAD_DIR`      | 上传文件目录，默认 ./uploads             |

## 评估模型

10 个维度，20 个子项，满分 100 分：

| 维度   | 权重  | 满分 |
|--------|-------|------|
| 外貌   | 18%   | 18   |
| 气质体态 | 12%  | 12   |
| 妆容   | 5%    | 5    |
| 镜前松弛感 | 5% | 5    |
| 自信心笃定 | 7% | 7    |
| 情绪张力控制力 | 7% | 7 |
| 专注力 | 5%    | 5    |
| 口音   | 11%   | 11   |
| 产品学习表达能力 | 12% | 12 |
| 话术天赋 | 18%  | 18   |

等级：S(≥95) / A+(88-94) / A(80-87) / B(70-79) / C(60-69) / C-(<60)
# ai-talent-eval
