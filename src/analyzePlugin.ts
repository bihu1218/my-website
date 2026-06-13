import type { Connect } from 'vite'
import type { AnalyzePayload } from './reportTypes'
import { analyzeHome } from './analyzeHome'

export function homeAnalysisMiddleware(): Connect.NextHandleFunction {
  return async (request, response, next) => {
    if (request.url !== '/api/analyze' || request.method !== 'POST') {
      next()
      return
    }

    try {
      const body = await readJsonBody<AnalyzePayload>(request)
      const report = await analyzeHome(body)

      response.statusCode = 200
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ report }))
    } catch (error) {
      response.statusCode = 400
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : '报告生成失败，请稍后重试。',
        }),
      )
    }
  }
}

function readJsonBody<T>(request: Connect.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk: Buffer) => {
      body += chunk.toString()
      if (body.length > 30 * 1024 * 1024) {
        reject(new Error('图片过大，请减少照片数量或压缩后再上传。'))
        request.destroy()
      }
    })

    request.on('end', () => {
      try {
        resolve(JSON.parse(body) as T)
      } catch {
        reject(new Error('请求格式不正确。'))
      }
    })

    request.on('error', () => {
      reject(new Error('请求读取失败。'))
    })
  })
}
