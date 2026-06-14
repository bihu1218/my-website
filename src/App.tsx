import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Compass,
  Download,
  Eye,
  Flame,
  History,
  Home,
  Lightbulb,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sofa,
  Sparkles,
  Trash2,
  Wind,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { buildStaticReport } from './staticReport'
import type {
  Concern,
  Finding,
  FormState,
  LifeGoal,
  Report,
  RoomType,
} from './reportTypes'

type UploadImage = {
  id: string
  name: string
  type: string
  originalSize: number
  compressedSize: number
  preview: string
  dataUrl: string
}

type ReportHistoryItem = {
  id: string
  createdAt: string
  form: FormState
  report: Report
  images: UploadImage[]
}

type AssessmentMode = {
  id: 'whole' | 'sleep' | 'wealth'
  title: string
  subtitle: string
  icon: LucideIcon
  roomType: RoomType
  goals: LifeGoal[]
  concerns: Concern[]
  prompt: string
  result: string
}

const HISTORY_KEY = 'home-fengshui-report-history'
const MAX_HISTORY_ITEMS = 12
const MAX_IMAGE_SIDE = 1600
const JPEG_QUALITY = 0.82

const roomOptions: Array<{ value: RoomType; label: string; hint: string }> = [
  { value: 'living', label: '客厅', hint: '沙发、电视、动线' },
  { value: 'bedroom', label: '卧室', hint: '床位、私密、睡眠' },
  { value: 'kitchen', label: '厨房', hint: '灶台、水火、烟气' },
  { value: 'study', label: '书房', hint: '书桌、专注、采光' },
  { value: 'entry', label: '玄关', hint: '入户、缓冲、收纳' },
  { value: 'whole', label: '整屋', hint: '多空间综合评估' },
]

const defaultForm: FormState = {
  roomType: 'living',
  orientation: 'unknown',
  homeSize: '',
  people: '',
  birthDate: '',
  birthTime: '',
  birthPlace: '',
  gender: 'unknown',
  household: '',
  masterBedroomUser: '',
  hasEldersOrChildren: false,
  doorDirection: '',
  floor: '',
  moveInYear: '',
  ownership: 'unknown',
  concerns: ['airflow', 'lighting'],
  goals: ['comfort'],
  notes: '',
}

const assessmentModes: AssessmentMode[] = [
  {
    id: 'whole',
    title: '全屋体检',
    subtitle: '找出最该先改的 3 件事',
    icon: Home,
    roomType: 'whole',
    goals: ['comfort', 'health'],
    concerns: ['airflow', 'lighting', 'clutter'],
    prompt: '适合第一次使用。先看入户、客厅、卧室、厨房这些大关系，判断动线、采光、收纳和安全感。',
    result: '你会得到：综合分、3 个优先问题、先不花钱怎么改。',
  },
  {
    id: 'sleep',
    title: '睡眠卧室',
    subtitle: '床位、门冲、镜面、光线',
    icon: Sofa,
    roomType: 'bedroom',
    goals: ['sleep', 'health'],
    concerns: ['sleep', 'privacy', 'lighting'],
    prompt: '适合睡不好、卧室压抑、床不知道怎么摆。重点看床头有没有靠、门窗是否直冲、夜间光线是否刺激。',
    result: '你会得到：床位调整、灯光建议、镜子和收纳处理方法。',
  },
  {
    id: 'wealth',
    title: '财位事业',
    subtitle: '客厅、书桌、厨房、明堂',
    icon: Compass,
    roomType: 'living',
    goals: ['wealth', 'career'],
    concerns: ['wealth', 'airflow', 'clutter'],
    prompt: '适合想看财位、事业位和办公区。这里不讲暴富，主要判断明亮、稳定、可停留、少干扰。',
    result: '你会得到：财位逻辑、书桌方向、客厅和厨房的低成本调整。',
  },
]

const severityCopy: Record<Finding['severity'], string> = {
  high: '优先处理',
  medium: '建议调整',
  low: '可优化',
}

const roomCopy: Record<RoomType, string> = {
  living: '客厅',
  bedroom: '卧室',
  kitchen: '厨房',
  study: '书房',
  entry: '玄关',
  whole: '整屋',
}

const particleDots = Array.from({ length: 18 }, (_, index) => index)

function App() {
  const [images, setImages] = useState<UploadImage[]>([])
  const [form, setForm] = useState<FormState>(defaultForm)
  const [report, setReport] = useState<Report | null>(null)
  const [history, setHistory] = useState<ReportHistoryItem[]>(() => loadHistory())
  const [selectedModeId, setSelectedModeId] = useState<AssessmentMode['id']>('whole')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [error, setError] = useState('')

  const canGenerate = images.length > 0 && !isGenerating && !isProcessingImages
  const totalOriginalSize = images.reduce((sum, image) => sum + image.originalSize, 0)
  const totalCompressedSize = images.reduce((sum, image) => sum + image.compressedSize, 0)

  const selectedRoom = useMemo(
    () => roomOptions.find((room) => room.value === form.roomType) ?? roomOptions[0],
    [form.roomType],
  )

  const selectedMode = useMemo(
    () => assessmentModes.find((mode) => mode.id === selectedModeId) ?? assessmentModes[0],
    [selectedModeId],
  )

  const applyMode = (mode: AssessmentMode) => {
    setSelectedModeId(mode.id)
    setForm((current) => ({
      ...current,
      roomType: mode.roomType,
      goals: mode.goals,
      concerns: mode.concerns,
    }))
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return

    setError('')
    setIsProcessingImages(true)
    const accepted = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 6 - images.length))

    if (!accepted.length) {
      setError('请上传 JPG、PNG 或 HEIC 等图片文件。')
      setIsProcessingImages(false)
      return
    }

    try {
      const nextImages = await Promise.all(accepted.map((file) => compressImageFile(file)))
      setImages((current) => [...current, ...nextImages])
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : '图片处理失败，请重新选择。')
    } finally {
      setIsProcessingImages(false)
    }
  }

  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id))
  }

  const generateReport = async (event: FormEvent) => {
    event.preventDefault()
    if (!canGenerate) return

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((image) => ({
            name: image.name,
            type: image.type,
            dataUrl: image.dataUrl,
          })),
          form,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? '报告生成失败，请稍后重试。')
      }

      const nextReport = payload.report as Report
      setReport(nextReport)
      const nextHistory = saveReportToHistory({
        form,
        images,
        report: nextReport,
      })
      setHistory(nextHistory)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (requestError) {
      console.warn('Falling back to static report generation:', requestError)
      const nextReport = buildStaticReport(form)
      setReport(nextReport)
      const nextHistory = saveReportToHistory({
        form,
        images,
        report: nextReport,
      })
      setHistory(nextHistory)
      setError('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsGenerating(false)
    }
  }

  const reset = () => {
    setReport(null)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openHistoryItem = (item: ReportHistoryItem) => {
    setImages(item.images)
    setForm(item.form)
    const modeFromHistory =
      assessmentModes.find((mode) => mode.roomType === item.form.roomType && mode.goals.every((goal) => item.form.goals.includes(goal))) ??
      assessmentModes[0]
    setSelectedModeId(modeFromHistory.id)
    setReport(item.report)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  if (report) {
    return <ReportView images={images} report={report} form={form} onBack={reset} />
  }

  return (
    <main className="app-shell">
      <div className="particle-field" aria-hidden="true">
        {particleDots.map((dot) => (
          <span key={dot} />
        ))}
      </div>

      <form className="analysis-form mobile-flow" onSubmit={generateReport}>
        <section className="hero-panel scanner-hero" id="upload-section">
          <div className="hero-copy">
            <p className="eyebrow">玄学逻辑 × 科学检测</p>
            <h1>先拍家里现状，看看空间哪里在偷偷消耗你</h1>
            <p className="hero-lead">
              用传统风水的语言抓痛点，用建筑动线、采光通风、环境心理和安全规则做解释。你不用懂术语，上传 3-6 张照片，系统会直接告诉你先改哪里、为什么、怎么改、花不花钱。
            </p>

            <div className="hook-grid" aria-label="用户常见痛点">
              <span>总觉得家里越住越累？</span>
              <span>床明明不小，还是睡不安稳？</span>
              <span>想知道财位到底该怎么用？</span>
            </div>

            <div className="flow-steps" aria-label="三步生成">
              <span>1 拍照</span>
              <span>2 选目标</span>
              <span>3 补一句</span>
            </div>
          </div>

          <section className="scan-console" aria-label="拍照检测入口">
            <div className="console-topline">
              <span className="console-dot" />
              <strong>HOUSE SCAN 01</strong>
              <small>{images.length ? 'READY' : 'WAITING'}</small>
            </div>

            <div className="compass-hud" aria-hidden="true">
              <span className="compass-ring outer" />
              <span className="compass-ring inner" />
              <span className="compass-axis horizontal" />
              <span className="compass-axis vertical" />
              <span className="compass-core">气</span>
              <span className="trigram trigram-n">坎</span>
              <span className="trigram trigram-s">离</span>
              <span className="trigram trigram-e">震</span>
              <span className="trigram trigram-w">兑</span>
            </div>

            <div className="scan-tags">
              <span className={images.length ? 'active' : ''}>照片扫描{images.length ? '已接入' : '待接入'}</span>
              <span>动线识别</span>
              <span>光线检测</span>
              <span>家具压迫点</span>
            </div>

            <div className={images.length ? 'upload-zone ready' : 'upload-zone'}>
              <div className="upload-icon">
                <Camera aria-hidden="true" />
              </div>
              <strong>{isProcessingImages ? '正在压缩图片' : images.length ? '照片已接入' : '立即拍照检测'}</strong>
              <span>{images.length ? '已准备好生成报告，也可以继续补充角度。' : '拍 3-6 张即可：入户、客厅、卧室、厨房，重点拍门窗、床、沙发、灶台和镜子。'}</span>

              <div className="upload-actions">
                <label className="upload-action primary">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  <Camera size={18} aria-hidden="true" />
                  立即拍照
                </label>

                <label className="upload-action secondary">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  从相册选
                </label>
              </div>

              {images.length > 0 && (
                <div className="ready-pill">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  已准备好生成报告
                </div>
              )}
            </div>

            {images.length > 0 && (
              <>
                <div className="upload-meta">
                  <span>{images.length}/6 张已接入 · 已压缩 {formatBytes(totalOriginalSize)} → {formatBytes(totalCompressedSize)}</span>
                </div>
                <div className="image-grid" aria-label="已上传照片">
                  {images.map((image) => (
                    <figure key={image.id} className="image-tile">
                      <img src={image.preview} alt={`${selectedRoom.label}照片预览`} />
                      <button type="button" onClick={() => removeImage(image.id)} aria-label="移除照片">
                        <X size={16} aria-hidden="true" />
                      </button>
                    </figure>
                  ))}
                </div>
              </>
            )}
          </section>
        </section>

        <HistoryPanel items={history} onOpen={openHistoryItem} onClear={clearHistory} />

        <section className="tool-section mode-section">
          <div className="section-heading">
            <span className="step-badge">2</span>
            <div>
              <h2>选择检测目标</h2>
              <p>只保留 3 个入口。点一个，系统自动配置分析重点。</p>
            </div>
          </div>

          <div className="mode-grid">
            {assessmentModes.map((mode) => {
              const ModeIcon = mode.icon
              const isSelected = selectedModeId === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={isSelected ? 'selected' : ''}
                  onClick={() => applyMode(mode)}
                >
                  <span className="mode-orbit">
                    <ModeIcon size={22} aria-hidden="true" />
                  </span>
                  <span className="mode-copy">
                    <strong>{mode.title}</strong>
                    <small>{mode.subtitle}</small>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mode-readout">
            <span>当前模式</span>
            <strong>{selectedMode.title}</strong>
            <p>{selectedMode.prompt}</p>
            <small>{selectedMode.result}</small>
          </div>
        </section>

        <section className="tool-section intent-section">
          <div className="section-heading">
            <span className="step-badge">3</span>
            <div>
              <h2>补一句需求</h2>
              <p>不用写长篇，像和师傅说一句话就行。</p>
            </div>
          </div>

          <div className="prompt-chips" aria-label="快捷需求">
            {['卧室睡不好', '入户正对阳台', '想看财位'].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setForm((current) => ({ ...current, notes: example }))}
              >
                {example}
              </button>
            ))}
          </div>

          <label className="field">
            <span>一句话补充</span>
            <textarea
              value={form.notes}
              rows={3}
              placeholder="例如：卧室睡不好；入户正对阳台；想看财位；家里有小孩老人。"
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>

          <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced((value) => !value)}>
            <ChevronRight className={showAdvanced ? 'open' : ''} size={18} aria-hidden="true" />
            {showAdvanced ? '收起精准信息' : '可选：补充精准信息'}
          </button>

          {showAdvanced && (
            <div className="advanced-panel">
              <div className="two-column">
                <label className="field">
                  <span>大门朝向</span>
                  <input
                    value={form.doorDirection}
                    placeholder="例如 朝南 / 约 178°"
                    onChange={(event) => setForm((current) => ({ ...current, doorDirection: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>入住年份</span>
                  <input
                    value={form.moveInYear}
                    inputMode="numeric"
                    placeholder="例如 2022"
                    onChange={(event) => setForm((current) => ({ ...current, moveInYear: event.target.value }))}
                  />
                </label>
              </div>

              <div className="two-column">
                <label className="field">
                  <span>常住情况</span>
                  <input
                    value={form.people}
                    placeholder="例如 两大一小 / 独居"
                    onChange={(event) => setForm((current) => ({ ...current, people: event.target.value }))}
                  />
                </label>

                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={form.hasEldersOrChildren}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, hasEldersOrChildren: event.target.checked }))
                    }
                  />
                  <span>有老人或小孩</span>
                </label>
              </div>

              <div className="two-column">
                <label className="field">
                  <span className="field-title">
                    出生日期
                    <small>可不填，仅用于颜色/材质参考</small>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday"
                    enterKeyHint="next"
                    placeholder="1990 06 14"
                    value={form.birthDate}
                    onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span className="field-title">
                    出生时间
                    <small>可不填</small>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="done"
                    pattern="[0-9: ]*"
                    placeholder="08:30"
                    value={form.birthTime}
                    onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="error-box" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <section className="sticky-submit">
          <div>
            <strong>{images.length ? `${images.length} 张照片已接入` : '先拍 3-6 张照片'}</strong>
            <span>
              {isProcessingImages
                ? '图片处理中'
                : images.length
                  ? `${selectedMode.title} · 可以生成检测报告`
                  : '上传后 3 步内生成报告'}
            </span>
          </div>
          <button type="submit" disabled={!canGenerate}>
            {isGenerating ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            {isGenerating ? '生成中' : '生成检测报告'}
          </button>
        </section>
      </form>
    </main>
  )
}

function ReportView({
  images,
  report,
  form,
  onBack,
}: {
  images: UploadImage[]
  report: Report
  form: FormState
  onBack: () => void
}) {
  const modeLabel = report.mode === 'ai' ? '空间图像检测' : '规则检测演示'
  const priorityFindings = report.findings.slice(0, 3)

  const downloadReport = () => {
    const content = buildMarkdownReport(report, form)
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `家居风水报告-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell report-shell">
      <section className="report-top">
        <button type="button" className="ghost-button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          重新分析
        </button>
        <button type="button" className="ghost-button" onClick={downloadReport}>
          <Download size={18} aria-hidden="true" />
          下载
        </button>
      </section>

      <section className="report-hero">
        <div>
          <p className="eyebrow">{modeLabel}</p>
          <h1>{roomCopy[form.roomType]}空间能量与居住逻辑报告</h1>
          <p>{report.overview}</p>
        </div>
        <div className="score-ring" aria-label={`总体评分 ${report.overallScore} 分`}>
          <span>{report.overallScore}</span>
          <small>综合分</small>
        </div>
      </section>

      <section className="photo-strip" aria-label="分析照片">
        {images.slice(0, 4).map((image) => (
          <img key={image.id} src={image.preview} alt="已分析的家居照片" />
        ))}
      </section>

      <section className="report-section priority-section">
        <div className="section-title">
          <Sparkles size={20} aria-hidden="true" />
          <h2>先看这 3 个问题</h2>
        </div>
        <div className="priority-list">
          {priorityFindings.map((finding, index) => (
            <article className={`priority-card ${finding.severity}`} key={finding.title}>
              <div className="priority-number">0{index + 1}</div>
              <div>
                <span>{severityCopy[finding.severity]}</span>
                <h3>{finding.title}</h3>
                <dl>
                  <div>
                    <dt>问题</dt>
                    <dd>{finding.evidence}</dd>
                  </div>
                  <div>
                    <dt>为什么</dt>
                    <dd>{finding.principle}</dd>
                  </div>
                  <div>
                    <dt>怎么改</dt>
                    <dd>{finding.action}</dd>
                  </div>
                  <div>
                    <dt>花不花钱</dt>
                    <dd>先做家具微调、遮挡缓冲、灯光和收纳整理，大多可以低成本验证。</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="score-list">
        {report.scores.map((score) => (
          <article key={score.label} className="score-card">
            <div className="score-card-head">
              <span>{score.label}</span>
              <strong>{score.value}</strong>
            </div>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${score.value}%` }} />
            </div>
            <p>{score.summary}</p>
          </article>
        ))}
      </section>

      {report.sections.length > 0 && (
        <section className="report-section">
          <div className="section-title">
            <Sparkles size={20} aria-hidden="true" />
            <h2>详细顾问报告</h2>
          </div>
          <div className="consultant-section-list">
            {report.sections.map((section) => (
              <article key={section.title} className="consultant-section">
                <h3>{section.title}</h3>
                <p>{section.summary}</p>
                <ul>
                  {section.suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <ChevronRight size={16} aria-hidden="true" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="report-section">
        <div className="section-title">
          <ShieldCheck size={20} aria-hidden="true" />
          <h2>关键判断</h2>
        </div>
        <div className="finding-list">
          {report.findings.map((finding) => (
            <article className={`finding-card ${finding.severity}`} key={finding.title}>
              <div>
                <span>{severityCopy[finding.severity]}</span>
                <h3>{finding.title}</h3>
              </div>
              <p>{finding.evidence}</p>
              <dl>
                <div>
                  <dt>底层逻辑</dt>
                  <dd>{finding.principle}</dd>
                </div>
                <div>
                  <dt>调整建议</dt>
                  <dd>{finding.action}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section">
        <div className="section-title">
          <Sofa size={20} aria-hidden="true" />
          <h2>空间建议</h2>
        </div>
        <div className="advice-list">
          {report.roomAdvice.map((item) => (
            <article key={item.area} className="advice-card">
              <h3>{item.area}</h3>
              <p>{item.diagnosis}</p>
              <ul>
                {item.suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <ChevronRight size={16} aria-hidden="true" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section quick-grid">
        <article>
          <div className="section-title">
            <Lightbulb size={20} aria-hidden="true" />
            <h2>低成本先做</h2>
          </div>
          <ul className="plain-list">
            {report.quickWins.map((item) => (
              <li key={item}>
                <CheckCircle2 size={17} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <div className="section-title">
            <AlertTriangle size={20} aria-hidden="true" />
            <h2>不要踩坑</h2>
          </div>
          <ul className="plain-list avoid-list">
            {report.avoid.map((item) => (
              <li key={item}>
                <X size={17} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="basis-panel">
        <h2>判断依据</h2>
        <div>
          <span><Wind size={16} aria-hidden="true" /> 气 = 空气、温湿度、光照、动线</span>
          <span><Eye size={16} aria-hidden="true" /> 靠山 = 安全感与视线稳定</span>
          <span><Compass size={16} aria-hidden="true" /> 方位 = 日照、噪声、隐私优先</span>
          <span><Flame size={16} aria-hidden="true" /> 水火 = 清洁、烟气、操作安全</span>
        </div>
        <p>{report.disclaimer}</p>
      </section>

      <button type="button" className="floating-reset" onClick={onBack} aria-label="重新分析">
        <RotateCcw size={20} aria-hidden="true" />
      </button>
    </main>
  )
}

function HistoryPanel({
  items,
  onOpen,
  onClear,
}: {
  items: ReportHistoryItem[]
  onOpen: (item: ReportHistoryItem) => void
  onClear: () => void
}) {
  if (!items.length) return null

  return (
    <section className="tool-section history-section">
      <div className="section-heading compact-heading">
        <span className="step-badge muted-badge">
          <History size={16} aria-hidden="true" />
        </span>
        <div>
          <h2>历史报告</h2>
          <p>仅保存在本机浏览器，最多保留 {MAX_HISTORY_ITEMS} 份。</p>
        </div>
        <button type="button" className="icon-text-button" onClick={onClear}>
          <Trash2 size={16} aria-hidden="true" />
          清空
        </button>
      </div>

      <div className="history-list">
        {items.slice(0, 4).map((item) => (
          <button key={item.id} type="button" onClick={() => onOpen(item)}>
            {item.images[0] && <img src={item.images[0].preview} alt="" />}
            <span>
              <strong>{roomCopy[item.form.roomType]} · {item.report.overallScore} 分</strong>
              <small>{new Date(item.createdAt).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}</small>
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}

async function compressImageFile(file: File): Promise<UploadImage> {
  const source = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前浏览器不支持图片压缩，请更换浏览器或压缩后上传。')
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(source, 0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const compressedSize = Math.round((dataUrl.length * 3) / 4)

  return {
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    name: file.name.replace(/\.[^.]+$/, '.jpg'),
    type: 'image/jpeg',
    originalSize: file.size,
    compressedSize,
    preview: dataUrl,
    dataUrl,
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片无法读取，请换一张清晰的 JPG 或 PNG。'))
    }
    image.src = url
  })
}

function loadHistory(): ReportHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReportHistoryItem[]
    return Array.isArray(parsed)
      ? parsed.slice(0, MAX_HISTORY_ITEMS).map((item) => ({
          ...item,
          form: { ...defaultForm, ...item.form },
          report: normalizeClientReport(item.report),
        }))
      : []
  } catch {
    return []
  }
}

function saveReportToHistory({
  form,
  images,
  report,
}: {
  form: FormState
  images: UploadImage[]
  report: Report
}) {
  const nextHistory: ReportHistoryItem[] = [
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      form,
      report,
      images: images.slice(0, 6),
    },
    ...loadHistory(),
  ].slice(0, MAX_HISTORY_ITEMS)

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
  } catch {
    const slimHistory = nextHistory.map((item) => ({
      ...item,
      images: item.images.slice(0, 1),
    }))
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slimHistory))
    return slimHistory
  }

  return nextHistory
}

function normalizeClientReport(report: Report): Report {
  return {
    ...report,
    sections: report.sections ?? [],
  }
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function buildMarkdownReport(report: Report, form: FormState) {
  const lines = [
    `# ${roomCopy[form.roomType]}风水与居住舒适度报告`,
    '',
    `生成时间：${new Date(report.generatedAt).toLocaleString('zh-CN')}`,
    `分析模式：${report.mode === 'ai' ? 'AI 图像分析' : '规则引擎演示'}`,
    `综合评分：${report.overallScore}`,
    `主要诉求：${form.goals.join('、') || '未填写'}`,
    `大门朝向：${form.doorDirection || '未填写'}`,
    `入住年份：${form.moveInYear || '未填写'}`,
    '',
    '## 总览',
    report.overview,
    '',
    '## 六部分顾问报告',
    ...report.sections.flatMap((section) => [
      `### ${section.title}`,
      section.summary,
      ...section.suggestions.map((suggestion) => `- ${suggestion}`),
      '',
    ]),
    '',
    '## 关键判断',
    ...report.findings.flatMap((finding) => [
      `### ${finding.title}`,
      `- 优先级：${severityCopy[finding.severity]}`,
      `- 底层逻辑：${finding.principle}`,
      `- 现场判断：${finding.evidence}`,
      `- 调整建议：${finding.action}`,
      '',
    ]),
    '## 低成本先做',
    ...report.quickWins.map((item) => `- ${item}`),
    '',
    '## 不要踩坑',
    ...report.avoid.map((item) => `- ${item}`),
    '',
    report.disclaimer,
  ]

  return lines.join('\n')
}

export default App
