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
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { buildStaticReport } from './staticReport'
import type {
  Concern,
  Finding,
  FormState,
  Gender,
  LifeGoal,
  Orientation,
  Ownership,
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

const orientationOptions: Array<{ value: Orientation; label: string }> = [
  { value: 'unknown', label: '不确定' },
  { value: 'south', label: '坐北朝南/南向' },
  { value: 'north', label: '北向' },
  { value: 'east', label: '东向' },
  { value: 'west', label: '西向' },
  { value: 'southeast', label: '东南' },
  { value: 'southwest', label: '西南' },
  { value: 'northeast', label: '东北' },
  { value: 'northwest', label: '西北' },
]

const concernOptions: Array<{ value: Concern; label: string }> = [
  { value: 'airflow', label: '通风' },
  { value: 'lighting', label: '采光' },
  { value: 'privacy', label: '隐私' },
  { value: 'clutter', label: '杂乱' },
  { value: 'sleep', label: '睡眠' },
  { value: 'wealth', label: '财位' },
  { value: 'health', label: '健康' },
]

const goalOptions: Array<{ value: LifeGoal; label: string }> = [
  { value: 'wealth', label: '求财' },
  { value: 'health', label: '健康' },
  { value: 'relationship', label: '夫妻关系' },
  { value: 'career', label: '事业' },
  { value: 'study', label: '孩子学习' },
  { value: 'sleep', label: '睡眠' },
  { value: 'comfort', label: '整体舒适度' },
]

const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: 'unknown', label: '不填写' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
]

const ownershipOptions: Array<{ value: Ownership; label: string }> = [
  { value: 'unknown', label: '不确定' },
  { value: 'own', label: '自住房' },
  { value: 'rent', label: '租房' },
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

function App() {
  const [images, setImages] = useState<UploadImage[]>([])
  const [form, setForm] = useState<FormState>(defaultForm)
  const [report, setReport] = useState<Report | null>(null)
  const [history, setHistory] = useState<ReportHistoryItem[]>(() => loadHistory())
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

  const toggleConcern = (value: Concern) => {
    setForm((current) => {
      const hasConcern = current.concerns.includes(value)
      return {
        ...current,
        concerns: hasConcern
          ? current.concerns.filter((concern) => concern !== value)
          : [...current.concerns, value],
      }
    })
  }

  const toggleGoal = (value: LifeGoal) => {
    setForm((current) => {
      const hasGoal = current.goals.includes(value)
      return {
        ...current,
        goals: hasGoal ? current.goals.filter((goal) => goal !== value) : [...current.goals, value],
      }
    })
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
      <section className="hero-panel">
        <div className="hero-image" aria-hidden="true">
          <div className="hero-photo-badge">
            <Camera size={16} />
            <span>先拍 5-15 张家里照片</span>
          </div>
          <div className="hero-room">
            <span className="hero-window" />
            <span className="hero-sofa" />
            <span className="hero-table" />
            <span className="hero-plant" />
          </div>
          <div className="hero-visual-notes">
            <span>门窗关系</span>
            <span>家具位置</span>
            <span>光线通风</span>
          </div>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">空间风水智能评估</p>
          <h1>拍几张家里照片，系统帮你梳理哪里该调整</h1>
          <p className="hero-lead">
            我们把传统风水问题拆成更容易理解的居住逻辑：门窗怎么通风、家具会不会压迫、床和沙发有没有安全感、厨房动线顺不顺、光线和收纳会不会影响日常状态。
          </p>
          <div className="hero-action-row">
            <a href="#upload-section" className="primary-hero-action">
              <Camera size={18} aria-hidden="true" />
              按步骤开始
            </a>
            <span>3 分钟提交，生成一份可执行报告</span>
          </div>
          <div className="hero-guide-grid">
            <article>
              <strong>1. 拍照</strong>
              <p>拍入户、客厅、卧室、厨房、卫生间、阳台，重点拍门、窗、床、沙发、灶台和镜子。</p>
            </article>
            <article>
              <strong>2. 补信息</strong>
              <p>填写大门朝向、楼层、入住年份、家庭成员、主要诉求；出生信息只作为个性化参考。</p>
            </article>
            <article>
              <strong>3. 看报告</strong>
              <p>得到整体评分、每个空间的问题说明、调整顺序、低成本做法、颜色材质和注意事项。</p>
            </article>
          </div>
          <div className="hero-proof-list" aria-label="报告特点">
            <span>先改动线</span>
            <span>再调光线</span>
            <span>最后看颜色材质</span>
          </div>
          <div className="hero-output-panel">
            <strong>报告会告诉你：</strong>
            <ul>
              <li>哪些问题最该先处理</li>
              <li>能不能不花钱先调整</li>
              <li>家具、灯光、颜色怎么改更合理</li>
            </ul>
          </div>
        </div>
      </section>

      <form className="analysis-form" onSubmit={generateReport}>
        <HistoryPanel items={history} onOpen={openHistoryItem} onClear={clearHistory} />

        <section className="tool-section upload-section" id="upload-section">
          <div className="section-heading">
            <span className="step-badge">1</span>
            <div>
              <h2>上传照片</h2>
              <p>建议包含门窗、主要家具、房间入口和长期停留位置。</p>
            </div>
          </div>

          <label className="upload-zone">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
            />
            <Camera aria-hidden="true" />
            <strong>{isProcessingImages ? '正在压缩图片' : images.length ? '继续添加照片' : '拍照或选择图片'}</strong>
            <span>最多 6 张，上传前会自动压缩，手机拍摄请尽量站在房间角落。</span>
          </label>

          {images.length > 0 && (
            <>
              <div className="upload-meta">
                <span>已压缩 {formatBytes(totalOriginalSize)} → {formatBytes(totalCompressedSize)}</span>
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

        <section className="tool-section">
          <div className="section-heading">
            <span className="step-badge">2</span>
            <div>
              <h2>客户与房屋信息</h2>
              <p>命理信息只做个性化参考，核心判断仍以照片、动线、采光和安全为准。</p>
            </div>
          </div>

          <div className="field-block">
            <label>分析空间</label>
            <div className="room-grid">
              {roomOptions.map((room) => (
                <button
                  key={room.value}
                  type="button"
                  className={form.roomType === room.value ? 'selected' : ''}
                  onClick={() => setForm((current) => ({ ...current, roomType: room.value }))}
                >
                  <Home size={17} aria-hidden="true" />
                  <span>{room.label}</span>
                  <small>{room.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="two-column">
            <label className="field">
              <span>主要朝向</span>
              <select
                value={form.orientation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, orientation: event.target.value as Orientation }))
                }
              >
                {orientationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>面积</span>
              <input
                value={form.homeSize}
                inputMode="decimal"
                placeholder="例如 89㎡"
                onChange={(event) => setForm((current) => ({ ...current, homeSize: event.target.value }))}
              />
            </label>
          </div>

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
              <span>楼层</span>
              <input
                value={form.floor}
                placeholder="例如 12/28 层"
                onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))}
              />
            </label>
          </div>

          <div className="two-column">
            <label className="field">
              <span>入住年份</span>
              <input
                value={form.moveInYear}
                inputMode="numeric"
                placeholder="例如 2022"
                onChange={(event) => setForm((current) => ({ ...current, moveInYear: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>居住类型</span>
              <select
                value={form.ownership}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ownership: event.target.value as Ownership }))
                }
              >
                {ownershipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>常住人数</span>
            <input
              value={form.people}
              placeholder="例如 两大一小 / 独居 / 与父母同住"
              onChange={(event) => setForm((current) => ({ ...current, people: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>家庭情况</span>
            <input
              value={form.household}
              placeholder="例如 三口之家，孩子上小学；父母偶尔同住"
              onChange={(event) => setForm((current) => ({ ...current, household: event.target.value }))}
            />
          </label>

          <div className="two-column">
            <label className="field">
              <span>谁住主卧</span>
              <input
                value={form.masterBedroomUser}
                placeholder="例如 夫妻 / 老人 / 自己"
                onChange={(event) =>
                  setForm((current) => ({ ...current, masterBedroomUser: event.target.value }))
                }
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
              <span>有老人或小孩常住</span>
            </label>
          </div>

          <div className="field-block">
            <label>主要诉求</label>
            <div className="chip-grid">
              {goalOptions.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  className={form.goals.includes(goal.value) ? 'selected' : ''}
                  onClick={() => toggleGoal(goal.value)}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-block subdued-block">
            <label>命理匹配参考</label>
            <p>八宅、五行和颜色材质建议会参考这里；如果没有出生时间或出生地，只做弱参考。</p>
            <div className="two-column">
              <label className="field">
                <span>出生日期</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                />
              </label>

              <label className="field">
                <span>出生时间</span>
                <input
                  type="time"
                  value={form.birthTime}
                  onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
                />
              </label>
            </div>
            <div className="two-column">
              <label className="field">
                <span>性别</span>
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, gender: event.target.value as Gender }))
                  }
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>出生地</span>
                <input
                  value={form.birthPlace}
                  placeholder="例如 广东广州"
                  onChange={(event) => setForm((current) => ({ ...current, birthPlace: event.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="field-block">
            <label>重点关注</label>
            <div className="chip-grid">
              {concernOptions.map((concern) => (
                <button
                  key={concern.value}
                  type="button"
                  className={form.concerns.includes(concern.value) ? 'selected' : ''}
                  onClick={() => toggleConcern(concern.value)}
                >
                  {concern.label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>补充描述</span>
            <textarea
              value={form.notes}
              rows={4}
              placeholder="例如 入户正对阳台、卧室睡眠不好、厨房油烟重、想保留现有家具等"
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
        </section>

        {error && (
          <div className="error-box" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <section className="sticky-submit">
          <div>
            <strong>{images.length} 张照片</strong>
            <span>
              {isProcessingImages
                ? '图片处理中'
                : `${selectedRoom.label} · ${form.goals.length} 个诉求 · ${form.concerns.length} 个关注点`}
            </span>
          </div>
          <button type="submit" disabled={!canGenerate}>
            {isGenerating ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            {isGenerating ? '生成中' : '生成报告'}
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
  const modeLabel = report.mode === 'ai' ? 'AI 图像分析' : '规则引擎演示'

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
          <h1>{roomCopy[form.roomType]}风水与居住舒适度报告</h1>
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
            <h2>六部分顾问报告</h2>
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
