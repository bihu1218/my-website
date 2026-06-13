import type { AnalyzePayload, Finding, FormState, Report, ReportSection, RoomAdvice, Score } from './reportTypes'

type OpenAiContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }

const roomLabel: Record<FormState['roomType'], string> = {
  living: '客厅',
  bedroom: '卧室',
  kitchen: '厨房',
  study: '书房',
  entry: '玄关',
  whole: '整屋',
}

const concernLabel: Record<FormState['concerns'][number], string> = {
  airflow: '通风',
  lighting: '采光',
  privacy: '隐私',
  clutter: '杂乱',
  sleep: '睡眠',
  wealth: '财位',
  health: '健康',
}

const goalLabel: Record<FormState['goals'][number], string> = {
  wealth: '求财',
  health: '健康',
  relationship: '夫妻关系',
  career: '事业',
  study: '孩子学习',
  sleep: '睡眠',
  comfort: '整体舒适度',
}

export async function analyzeHome(payload: AnalyzePayload): Promise<Report> {
  const safePayload = sanitizePayload(payload)

  if (process.env.OPENAI_API_KEY) {
    try {
      return await analyzeWithOpenAI(safePayload)
    } catch (error) {
      console.warn('OpenAI analysis failed, falling back to local rules:', error)
    }
  }

  return buildRuleReport(safePayload.form)
}

function sanitizePayload(payload: AnalyzePayload): AnalyzePayload {
  const images = Array.isArray(payload.images)
    ? payload.images
        .filter((image) => typeof image.dataUrl === 'string' && image.dataUrl.startsWith('data:image/'))
        .slice(0, 6)
    : []

  if (!images.length) {
    throw new Error('请至少上传 1 张家居照片。')
  }

  return {
    images,
    form: {
      roomType: payload.form?.roomType ?? 'living',
      orientation: payload.form?.orientation ?? 'unknown',
      homeSize: trimText(payload.form?.homeSize, 30),
      people: trimText(payload.form?.people, 40),
      birthDate: trimText(payload.form?.birthDate, 20),
      birthTime: trimText(payload.form?.birthTime, 20),
      birthPlace: trimText(payload.form?.birthPlace, 60),
      gender: payload.form?.gender ?? 'unknown',
      household: trimText(payload.form?.household, 120),
      masterBedroomUser: trimText(payload.form?.masterBedroomUser, 80),
      hasEldersOrChildren: Boolean(payload.form?.hasEldersOrChildren),
      doorDirection: trimText(payload.form?.doorDirection, 40),
      floor: trimText(payload.form?.floor, 40),
      moveInYear: trimText(payload.form?.moveInYear, 20),
      ownership: payload.form?.ownership ?? 'unknown',
      concerns: Array.isArray(payload.form?.concerns) ? payload.form.concerns.slice(0, 7) : [],
      goals: Array.isArray(payload.form?.goals) && payload.form.goals.length ? payload.form.goals.slice(0, 7) : ['comfort'],
      notes: trimText(payload.form?.notes, 400),
    },
  }
}

async function analyzeWithOpenAI(payload: AnalyzePayload): Promise<Report> {
  const content: OpenAiContent[] = [
    {
      type: 'input_text',
      text: buildPrompt(payload.form),
    },
    ...payload.images.map((image) => ({
      type: 'input_image' as const,
      image_url: image.dataUrl,
    })),
  ]

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-5.5',
      input: [
        {
          role: 'user',
          content,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'home_fengshui_report',
          strict: true,
          schema: reportJsonSchema,
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const text = extractResponseText(result)
  const report = JSON.parse(text) as Report
  return normalizeReport({ ...report, mode: 'ai' })
}

function buildPrompt(form: FormState) {
  const concerns = form.concerns.map((concern) => concernLabel[concern]).join('、') || '未指定'
  const goals = form.goals.map((goal) => goalLabel[goal]).join('、') || '整体舒适度'
  return [
    '你是“AI 家居风水顾问”，风格是专业、理性、可落地。',
    '请根据用户上传的家居照片与补充信息，生成中文移动端报告。',
    '原则：用建筑动线、采光通风、环境心理、人体工学解释传统术语；不恐吓、不承诺改运暴富、不要求购买开光摆件；建议必须低成本、可执行、可验证。',
    '把“气”解释为空气流通、温湿度、光照、气味、声音、人流动线和视线感受；把“藏风聚气”解释为空间缓冲、安全感和稳定停留；把“煞”解释为环境压力源。',
    '可参考形峦风水、八宅、玄空飞星、五行命理、家居美学和现实安全规则，但命理结论必须标注为参考，不可绝对化。',
    '报告 sections 必须固定 6 个部分：整体评分、客厅建议、卧室建议、厨房建议、财位/事业/健康建议、个性化颜色材质摆件建议。',
    `分析空间：${roomLabel[form.roomType]}`,
    `主要朝向：${form.orientation}`,
    `大门朝向：${form.doorDirection || '未填写'}`,
    `楼层：${form.floor || '未填写'}`,
    `入住年份：${form.moveInYear || '未填写'}`,
    `居住类型：${form.ownership}`,
    `面积：${form.homeSize || '未填写'}`,
    `常住人数：${form.people || '未填写'}`,
    `家庭情况：${form.household || '未填写'}`,
    `主卧使用者：${form.masterBedroomUser || '未填写'}`,
    `有老人或小孩常住：${form.hasEldersOrChildren ? '是' : '否'}`,
    `出生日期：${form.birthDate || '未填写'}`,
    `出生时间：${form.birthTime || '未填写'}`,
    `出生地：${form.birthPlace || '未填写'}`,
    `性别：${form.gender}`,
    `主要诉求：${goals}`,
    `重点关注：${concerns}`,
    `补充描述：${form.notes || '无'}`,
    '请严格输出符合 schema 的 JSON，不要输出 Markdown。',
  ].join('\n')
}

function buildRuleReport(form: FormState): Report {
  const concernSet = new Set(form.concerns)
  const isBedroom = form.roomType === 'bedroom'
  const isKitchen = form.roomType === 'kitchen'
  const isStudy = form.roomType === 'study'
  const isEntry = form.roomType === 'entry'
  const isWhole = form.roomType === 'whole'
  const targetRoom = roomLabel[form.roomType]

  const scores: Score[] = [
    {
      label: '气流与通风',
      value: concernSet.has('airflow') ? 74 : 78,
      summary: '优先检查门窗是否形成直线强风，以及长期停留位是否被风口直吹。',
    },
    {
      label: '采光与明暗',
      value: concernSet.has('lighting') ? 72 : 80,
      summary: '自然光要服务于活动，不需要每处都亮；休息区宜柔和，操作区宜清晰。',
    },
    {
      label: '动线与缓冲',
      value: isEntry || isWhole ? 70 : 76,
      summary: '入户、过道、家具边缘如果直冲停留位，会增加紧张感和磕碰风险。',
    },
    {
      label: '稳定与私密',
      value: isBedroom || concernSet.has('privacy') ? 71 : 79,
      summary: '床、沙发、书桌背后有稳定支撑，前方有可观察空间，更利于放松和专注。',
    },
  ]

  const findings: Finding[] = [
    {
      title: isEntry ? '入户需要形成缓冲，不宜一眼穿透到底' : '先检查门窗直线与主要停留位的关系',
      severity: 'high',
      principle: '“藏风聚气”可理解为空气、视线和人流都有缓冲，空间不会被一条直线快速穿透。',
      evidence: '目前仅凭照片流程做初步判断，重点应核对入户门、阳台门、窗户和沙发/床/书桌是否在同一直线上。',
      action: '若存在直冲，可用半高柜、窄屏风、绿植、纱帘或地毯划出缓冲区，避免直接挡死采光和通风。',
    },
    {
      title: isBedroom ? '床位优先看靠背、门窗和梁位' : '核心座位要有靠、有看面、有回旋余地',
      severity: 'medium',
      principle: '“靠山”对应背后稳定支撑和视线安全感，能减少潜意识警觉，提高休息或交流质量。',
      evidence: `${targetRoom}的长期停留位需要避免背门、背窗、正对强反光或被过道贴身穿过。`,
      action: isBedroom
        ? '床头尽量靠实墙，两侧保留可下床尺度；若床头靠窗，用厚窗帘和稳定床头板补足安全感。'
        : '沙发或书桌尽量背后靠墙，无法靠墙时用矮柜或地毯建立边界，前方保留开阔视线。',
    },
    {
      title: concernSet.has('clutter') ? '杂物会直接削弱空间的“气口”效率' : '收纳边界决定空间是否清爽稳定',
      severity: concernSet.has('clutter') ? 'high' : 'low',
      principle: '杂乱不是玄学问题，而是动线阻塞、视觉负荷和清洁成本上升。',
      evidence: '鞋柜、餐边柜、床头、茶几和厨房台面最容易形成持续压力源。',
      action: '把外露物品压缩到 20% 以下；入口只保留当日鞋包，台面只留高频物品，其余进入封闭收纳。',
    },
  ]

  if (isKitchen) {
    findings.push({
      title: '厨房重点是水火距离、烟气路径和操作安全',
      severity: 'medium',
      principle: '传统“水火不冲”在现代厨房里对应清洁、防滑、油烟扩散和操作动线。',
      evidence: '灶台、水槽、冰箱三点如果距离过近或交叉频繁，会降低效率并增加清洁负担。',
      action: '保持灶台两侧有备餐台面，水槽区做好沥水，油烟路径尽量短直，避免灶口正对门口强风。',
    })
  }

  if (isStudy) {
    findings.push({
      title: '书桌要兼顾自然光和背后稳定',
      severity: 'medium',
      principle: '专注空间的关键不是摆件，而是眩光控制、坐姿尺度、背后安全感和低干扰。',
      evidence: '如果屏幕正对窗或背后是门，容易出现反光、分心和久坐疲劳。',
      action: '书桌侧向取光，屏幕避开窗面直射；背后空旷时加书柜或低柜，桌面只保留当前任务物品。',
    })
  }

  const roomAdvice: RoomAdvice[] = [
    {
      area: targetRoom,
      diagnosis: `${targetRoom}的判断应从“门、窗、长期停留位、收纳、光源”五个点开始。`,
      suggestions: [
        '先站在门口拍一张全景，再站在窗边反拍一张，确认视线和动线是否直冲。',
        '所有长期坐卧的位置，优先处理背后空、头顶压、正面堵、侧面冲的问题。',
        '调整后连续观察 7 天：睡眠、通风、打扫效率和家人冲突点是否改善。',
      ],
    },
    {
      area: '灯光与材质',
      diagnosis: '明暗和材质会直接影响空间冷暖、洁净感和安全感。',
      suggestions: [
        '休息区用低色温间接光，操作区用足够亮的直下光。',
        '反光强的墙面、镜面和亮面柜门不要正对床、沙发或书桌。',
        '用木、布、植物等柔性材质平衡硬质墙地面，但不要牺牲清洁便利。',
      ],
    },
  ]

  const goals = form.goals.map((goal) => goalLabel[goal]).join('、') || '整体舒适度'
  const hasBirthContext = Boolean(form.birthDate && form.birthTime && form.birthPlace)
  const personalizedColorAdvice = hasBirthContext
    ? '已填写出生日期、时间和出生地，可在 AI 版中进一步做五行偏向参考；规则版先建议使用低饱和木色、米白、暖光，避免大面积压抑黑灰。'
    : '出生时间或出生地不完整，颜色材质只做弱参考；建议优先使用低饱和木色、米白、暖光和易清洁材质。'

  const sections: ReportSection[] = [
    {
      title: '整体评分',
      summary: `当前按照片流程、${targetRoom}信息和“${goals}”诉求做初评，核心先看门窗动线、长期停留位、采光通风和收纳压力。`,
      suggestions: [
        '先完成低成本调整，再观察 7 天睡眠、通风、清洁效率和家人使用冲突是否改善。',
        '如果后续加入户型图、大门精确坐向和视频抽帧，可以再补八宅、飞星和逐房间优先级。',
      ],
    },
    {
      title: '客厅建议',
      summary: '客厅是家庭公共气口，重点是入户缓冲、沙发靠山、明堂开阔和视线稳定。',
      suggestions: [
        '沙发尽量背后靠墙或有矮柜形成支撑，避免背后是走道或门口。',
        '入户直见阳台时，用半高柜、纱帘、地毯或绿植形成缓冲，不要完全封死采光。',
        '茶几和电视柜周围保持通道顺畅，减少尖角、杂物和强反光。',
      ],
    },
    {
      title: '卧室建议',
      summary: '卧室优先服务睡眠和私密，床位比摆件重要。',
      suggestions: [
        '床头优先靠实墙，床尾尽量避开房门直冲，床侧保留稳定上下床空间。',
        '镜子、亮面柜门和强光源不建议正对床，减少夜间视觉刺激。',
        form.masterBedroomUser
          ? `主卧使用者为“${form.masterBedroomUser}”，建议按使用者睡眠质量和收纳习惯优先调整。`
          : '请补充谁住主卧，后续可把夫妻、老人、儿童的建议分开。',
      ],
    },
    {
      title: '厨房建议',
      summary: '厨房的“水火”应落到清洁、防滑、油烟路径和备餐效率上。',
      suggestions: [
        '灶台避免被门口强风直吹，水槽区做好沥水和防滑。',
        '灶台、水槽、冰箱形成顺手三角动线，减少交叉和绕行。',
        '厨房台面只留高频工具，油烟机到灶台路径保持短直。',
      ],
    },
    {
      title: '财位/事业/健康建议',
      summary: `当前主要诉求是“${goals}”。财位、事业和健康先按环境质量处理，不做暴富承诺。`,
      suggestions: [
        '所谓财位先做到明亮、干净、可停留、不被过道直冲，再考虑植物或灯光点缀。',
        '事业位更适合落实为书桌/办公区：背后稳定、侧向取光、屏幕避开窗面反光。',
        form.hasEldersOrChildren
          ? '有老人或小孩常住时，防滑、圆角、夜灯、通道宽度和空气质量优先级高于风水摆件。'
          : '健康建议先看通风、湿度、霉味、噪声和睡眠光环境。',
      ],
    },
    {
      title: '个性化颜色材质摆件建议',
      summary: personalizedColorAdvice,
      suggestions: [
        '颜色建议从大面积低饱和开始，小面积用绿植、木质、暖色织物提气，不建议全屋重色压暗。',
        '摆件只作为视觉秩序和使用习惯提醒，不建议购买高价开光物。',
        form.ownership === 'rent'
          ? '租房优先选择可移动、可恢复的方案：落地灯、窗帘、地毯、收纳柜和床头靠垫。'
          : '自住房可进一步考虑灯位、收纳系统和局部硬装，但仍要避开承重、燃气和消防风险。',
      ],
    },
  ]

  const quickWins = [
    '清空入户门内外 1 米范围，让气流、视线和拿取动作都更顺。',
    '给床、沙发或书桌背后补稳定边界：靠墙、加矮柜、加厚窗帘都可以。',
    '把强反光镜面移出床、沙发和书桌正对面，减少视觉刺激。',
    '每天固定 15 分钟对流通风，潮湿季节配合除湿而不是盲目开窗。',
  ]

  if (concernSet.has('wealth')) {
    quickWins.push('所谓财位先按“明亮、干净、可停留、不被过道冲”处理，不建议用昂贵摆件替代收纳和照明。')
  }

  return normalizeReport({
    mode: 'rule',
    generatedAt: new Date().toISOString(),
    overview: `这是基于${targetRoom}信息生成的演示报告。当前版本按现代建筑、环境心理和传统阳宅逻辑做初筛；接入 OPENAI_API_KEY 后可结合照片细节识别家具、门窗、光线和杂物状态。`,
    overallScore: Math.round(scores.reduce((sum, score) => sum + score.value, 0) / scores.length),
    scores,
    findings,
    roomAdvice,
    sections,
    quickWins,
    avoid: [
      '不要因为“犯煞”恐慌拆改承重墙、封堵必要通风或牺牲消防安全。',
      '不要购买声称能改命、暴富、化灾的高价开光摆件。',
      '不要机械套方位公式；现代住宅先看日照、噪声、隐私、湿度和真实动线。',
      '不要只看单张美图下结论，最好结合户型图、罗盘方向和白天/夜晚照片。',
    ],
    disclaimer: '本报告用于居住舒适度和空间优化参考，不替代建筑结构、消防、电气、燃气、医疗或法律专业意见。',
  })
}

function normalizeReport(report: Report): Report {
  return {
    mode: report.mode,
    generatedAt: report.generatedAt || new Date().toISOString(),
    overview: trimText(report.overview, 260),
    overallScore: clampScore(report.overallScore),
    scores: report.scores.slice(0, 6).map((score) => ({
      label: trimText(score.label, 20),
      value: clampScore(score.value),
      summary: trimText(score.summary, 120),
    })),
    findings: report.findings.slice(0, 6).map((finding) => ({
      title: trimText(finding.title, 40),
      severity: finding.severity,
      principle: trimText(finding.principle, 160),
      evidence: trimText(finding.evidence, 160),
      action: trimText(finding.action, 180),
    })),
    roomAdvice: report.roomAdvice.slice(0, 4).map((item) => ({
      area: trimText(item.area, 20),
      diagnosis: trimText(item.diagnosis, 140),
      suggestions: item.suggestions.slice(0, 4).map((suggestion) => trimText(suggestion, 150)),
    })),
    sections: (report.sections ?? []).slice(0, 6).map((section) => ({
      title: trimText(section.title, 30),
      summary: trimText(section.summary, 180),
      suggestions: section.suggestions.slice(0, 5).map((suggestion) => trimText(suggestion, 160)),
    })),
    quickWins: report.quickWins.slice(0, 6).map((item) => trimText(item, 140)),
    avoid: report.avoid.slice(0, 6).map((item) => trimText(item, 140)),
    disclaimer:
      report.disclaimer ||
      '本报告用于居住舒适度和空间优化参考，不替代建筑结构、消防、电气、燃气、医疗或法律专业意见。',
  }
}

function extractResponseText(result: unknown): string {
  const outputText = (result as { output_text?: unknown }).output_text
  if (typeof outputText === 'string') return outputText

  const output = (result as { output?: Array<{ content?: Array<{ text?: string }> }> }).output
  const text = output?.flatMap((item) => item.content ?? []).find((content) => typeof content.text === 'string')?.text
  if (text) return text

  throw new Error('OpenAI response did not include text output.')
}

function trimText(value: unknown, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 75
  return Math.max(0, Math.min(100, Math.round(value)))
}

const findingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'severity', 'principle', 'evidence', 'action'],
  properties: {
    title: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    principle: { type: 'string' },
    evidence: { type: 'string' },
    action: { type: 'string' },
  },
}

const reportJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'mode',
    'generatedAt',
    'overview',
    'overallScore',
    'scores',
    'findings',
    'roomAdvice',
    'sections',
    'quickWins',
    'avoid',
    'disclaimer',
  ],
  properties: {
    mode: { type: 'string', enum: ['ai', 'rule'] },
    generatedAt: { type: 'string' },
    overview: { type: 'string' },
    overallScore: { type: 'number' },
    scores: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'summary'],
        properties: {
          label: { type: 'string' },
          value: { type: 'number' },
          summary: { type: 'string' },
        },
      },
    },
    findings: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: findingSchema,
    },
    roomAdvice: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['area', 'diagnosis', 'suggestions'],
        properties: {
          area: { type: 'string' },
          diagnosis: { type: 'string' },
          suggestions: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: { type: 'string' },
          },
        },
      },
    },
    sections: {
      type: 'array',
      minItems: 6,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary', 'suggestions'],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          suggestions: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: { type: 'string' },
          },
        },
      },
    },
    quickWins: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: { type: 'string' },
    },
    avoid: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: { type: 'string' },
    },
    disclaimer: { type: 'string' },
  },
}
