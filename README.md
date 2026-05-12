# Gemini AI Studio Cloudflare Proxy

English | [中文](#中文说明)

A lightweight Cloudflare Worker reverse proxy template for Google AI Studio / Gemini API. Deploy it to your own Cloudflare account and bind your own domain or use the default `*.workers.dev` URL.

After deployment, your endpoint will look like one of these:

```text
https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev
https://YOUR_CUSTOM_DOMAIN
```

## Features

- Proxies requests to `https://generativelanguage.googleapis.com`.
- Supports native Gemini REST endpoints such as `/v1beta/models/...:generateContent`.
- Supports Gemini's OpenAI-compatible endpoint under `/v1beta/openai/`.
- Streams upstream responses without buffering large payloads in Worker memory.
- Adds browser-friendly CORS headers.
- Supports optional shared-key mode with `GEMINI_API_KEY` and `PROXY_AUTH_TOKEN` Worker secrets.

## Supported APIs

Native Gemini REST:

```text
https://YOUR_PROXY_DOMAIN/v1beta/models/gemini-2.5-flash:generateContent
```

OpenAI-compatible Gemini API:

```text
https://YOUR_PROXY_DOMAIN/v1beta/openai/
```

## Deploy

1. Fork or clone this repository.
2. Install dependencies:

```bash
npm install
```

3. Login to Cloudflare:

```bash
npx wrangler login
```

4. Deploy to the default Workers domain:

```bash
npm run deploy
```

5. Optional: bind your own custom domain by editing `wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "api.example.com",
    "custom_domain": true
  }
]
```

Then deploy again:

```bash
npm run deploy
```

## Usage

Replace `YOUR_PROXY_DOMAIN` with your deployed Worker domain.

Native Gemini REST example:

```bash
curl "https://YOUR_PROXY_DOMAIN/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "Say hello in one short sentence." }
        ]
      }
    ]
  }'
```

OpenAI-compatible example:

```bash
curl "https://YOUR_PROXY_DOMAIN/v1beta/openai/chat/completions" \
  -H "authorization: Bearer $GEMINI_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      { "role": "user", "content": "Say hello in one short sentence." }
    ]
  }'
```

## Optional Worker Secrets

The safest default is to send the Gemini API key with each request. If you want the Worker to inject a shared Gemini key, store it as a Worker secret and protect it with a proxy token:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put PROXY_AUTH_TOKEN
```

When both secrets are configured, send `x-proxy-token` with requests. The Worker injects `x-goog-api-key` only when the request does not already include Google credentials.

## Local Development

```bash
npm install
npm run dev
npm run deploy
```

## Security Notes

- Do not commit API keys or `.dev.vars`.
- Prefer per-user API keys for personal use.
- If using shared-key mode, always set `PROXY_AUTH_TOKEN`.

## 中文说明

这是一个轻量级 Cloudflare Worker 中转代理模板，用于 Google AI Studio / Gemini API。请将它部署到你自己的 Cloudflare 账号，并绑定你自己的域名，或直接使用默认的 `*.workers.dev` 地址。

部署后，你的访问地址通常类似：

```text
https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev
https://YOUR_CUSTOM_DOMAIN
```

## 功能

- 将请求转发到 `https://generativelanguage.googleapis.com`。
- 支持 Gemini 原生 REST 接口，例如 `/v1beta/models/...:generateContent`。
- 支持 Gemini 的 OpenAI 兼容接口：`/v1beta/openai/`。
- 以流式方式转发上游响应，避免在 Worker 内存中缓存大响应。
- 自动添加适合浏览器调用的 CORS 响应头。
- 支持可选的共享密钥模式：通过 Worker secret 配置 `GEMINI_API_KEY` 与 `PROXY_AUTH_TOKEN`。

## 支持的 API

Gemini 原生 REST：

```text
https://YOUR_PROXY_DOMAIN/v1beta/models/gemini-2.5-flash:generateContent
```

Gemini OpenAI 兼容 API：

```text
https://YOUR_PROXY_DOMAIN/v1beta/openai/
```

## 部署

1. Fork 或 clone 本仓库。
2. 安装依赖：

```bash
npm install
```

3. 登录 Cloudflare：

```bash
npx wrangler login
```

4. 部署到默认 Workers 域名：

```bash
npm run deploy
```

5. 可选：编辑 `wrangler.jsonc` 绑定你自己的自定义域名：

```jsonc
"routes": [
  {
    "pattern": "api.example.com",
    "custom_domain": true
  }
]
```

然后再次部署：

```bash
npm run deploy
```

## 使用示例

请将 `YOUR_PROXY_DOMAIN` 替换成你自己部署后的 Worker 域名。

Gemini 原生 REST：

```bash
curl "https://YOUR_PROXY_DOMAIN/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "用一句话打个招呼。" }
        ]
      }
    ]
  }'
```

OpenAI 兼容接口：

```bash
curl "https://YOUR_PROXY_DOMAIN/v1beta/openai/chat/completions" \
  -H "authorization: Bearer $GEMINI_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      { "role": "user", "content": "用一句话打个招呼。" }
    ]
  }'
```

## 可选 Worker Secret

默认建议每次请求都携带自己的 Gemini API key。若希望 Worker 代为注入共享 Gemini key，可以将其配置为 Worker secret，并使用代理 token 保护：

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put PROXY_AUTH_TOKEN
```

当两个 secret 都配置后，请求需要携带 `x-proxy-token`。如果请求本身没有 Google 凭据，Worker 会自动注入 `x-goog-api-key`。

## 本地开发

```bash
npm install
npm run dev
npm run deploy
```

## 安全说明

- 不要提交 API key 或 `.dev.vars`。
- 个人使用时优先采用每个用户自己的 API key。
- 如果使用共享密钥模式，请务必设置 `PROXY_AUTH_TOKEN`。
