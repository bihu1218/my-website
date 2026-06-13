import type { FormState, Report, ReportSection } from './reportTypes'

const roomLabel: Record<FormState['roomType'], string> = {
  living: '客厅',
  bedroom: '卧室',
  kitchen: '厨房',
  study: '书房',
  entry: '玄关',
  whole: '整屋',
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

export function buildStaticReport(form: FormState): Report {
  const room = roomLabel[form.roomType]
  const goals = form.goals.length ? form.goals.map((goal) => goalLabel[goal]).join('、') : '整体舒适度'
  const hasBirthContext = Boolean(form.birthDate && form.birthTime && form.birthPlace)
  const hasFamilyRisk = form.hasEldersOrChildren
  const score = getScore(form)
  const sections = buildSections(form, room, goals, hasBirthContext)

  return {
    mode: 'rule',
    generatedAt: new Date().toISOString(),
    overview: `这是基于${room}、房屋信息和“${goals}”诉求生成的静态版评估。判断重点放在门窗动线、采光通风、长期停留位、安全和收纳压力上；命理信息只作为弱参考，不做绝对结论。`,
    overallScore: score,
    scores: [
      {
        label: '动线顺畅',
        value: Math.max(62, score - 4),
        summary: '重点看入户、过道、门窗和家具是否形成直冲或绕行。',
      },
      {
        label: '采光通风',
        value: Math.max(60, score - 2),
        summary: '先保证空气流通、湿度可控、自然光能服务日常活动。',
      },
      {
        label: '稳定安全',
        value: hasFamilyRisk ? Math.max(58, score - 8) : score,
        summary: hasFamilyRisk ? '有老人或小孩时，防滑、圆角、夜灯和通道宽度优先。' : '床、沙发、书桌背后有稳定支撑更利于放松和专注。',
      },
      {
        label: '收纳秩序',
        value: form.concerns.includes('clutter') ? Math.max(55, score - 10) : Math.min(88, score + 2),
        summary: '外露杂物越多，动线、清洁和视觉压力越明显。',
      },
    ],
    findings: [
      {
        title: '先判断门窗和主要停留位是否直冲',
        severity: 'high',
        principle: '传统“藏风聚气”可以理解为空气、视线和人流有缓冲，空间不会被一条直线穿透。',
        evidence: '上传照片后应重点核对入户门、阳台门、窗户和床/沙发/书桌之间的直线关系。',
        action: '如果有直冲，优先用半高柜、纱帘、地毯、绿植或家具转向形成缓冲，不要直接封死采光和通风。',
      },
      {
        title: '床、沙发、书桌要先处理“背后是否稳定”',
        severity: 'medium',
        principle: '“靠山”对应的是安全感、视线稳定和长期停留时的心理放松。',
        evidence: `${room}里长期坐卧的位置如果背门、背窗或背后是走道，容易产生压迫和分心。`,
        action: '优先让床头、沙发背、书桌背后靠实墙；无法靠墙时，用矮柜、窗帘或地毯建立边界。',
      },
      {
        title: '颜色材质放在最后，不要越级调整',
        severity: 'low',
        principle: '颜色和摆件主要影响视觉秩序与心理感受，不能替代通风、照明和动线。',
        evidence: hasBirthContext ? '你填写了较完整的出生信息，可作为颜色材质的参考项。' : '出生时间或出生地不完整，命理匹配只能做弱参考。',
        action: '先处理动线、光线、收纳，再用低饱和木色、米白、暖光和少量绿植做温和调整。',
      },
    ],
    roomAdvice: [
      {
        area: room,
        diagnosis: `${room}建议从门、窗、长期停留位、光源和收纳五个点检查。`,
        suggestions: [
          '站在门口拍全景，再站在窗边反拍，确认视线和动线是否直冲。',
          '长期坐卧位置先看背后是否稳定、头顶是否压迫、正面是否拥堵。',
          '调整后观察 7 天：睡眠、通风、打扫效率和家人使用冲突是否改善。',
        ],
      },
      {
        area: '灯光与收纳',
        diagnosis: '灯光和收纳决定空间是否清爽、稳定、好用。',
        suggestions: [
          '操作区用清晰照明，休息区用柔和暖光。',
          '台面只留高频物品，其余进入封闭收纳。',
          '镜面和强反光材质不要正对床、沙发和书桌。',
        ],
      },
    ],
    sections,
    quickWins: [
      '清空入户门内外 1 米范围，让进出、换鞋、拿取更顺。',
      '给床、沙发或书桌背后补稳定边界：靠墙、矮柜、厚窗帘都可以。',
      '把强反光镜面移出床、沙发和书桌正对面。',
      '每天固定短时间对流通风，潮湿区域优先除湿和防霉。',
      '先做不花钱的家具微调，再决定是否购买灯具、窗帘或收纳柜。',
    ],
    avoid: [
      '不要因为“犯煞”恐慌拆墙、封窗或牺牲消防安全。',
      '不要购买承诺改命、暴富、化灾的高价摆件。',
      '不要机械套方位公式，现代住宅先看真实日照、噪声、隐私和湿度。',
      '不要只看单张照片下结论，最好结合户型图和多房间照片。',
    ],
    disclaimer: '本报告用于居住舒适度和空间优化参考，不替代建筑结构、消防、电气、燃气、医疗或法律专业意见。',
  }
}

function buildSections(form: FormState, room: string, goals: string, hasBirthContext: boolean): ReportSection[] {
  return [
    {
      title: '整体评分',
      summary: `当前按${room}和“${goals}”诉求做初评，先看动线、采光、通风、安全和收纳。`,
      suggestions: [
        '先改不花钱的家具位置和收纳，再考虑买灯、窗帘或柜子。',
        '调整后连续观察 7 天，用睡眠、清洁效率和家人使用感受验证。',
      ],
    },
    {
      title: '客厅建议',
      summary: '客厅重点是入户缓冲、沙发靠山、明堂开阔和交流舒适度。',
      suggestions: [
        '沙发尽量背后靠墙，背后是走道时用矮柜或地毯建立边界。',
        '入户直见阳台时，用纱帘、绿植或半高柜做缓冲。',
        '茶几和电视柜周边留出顺畅通道，减少尖角和杂物。',
      ],
    },
    {
      title: '卧室建议',
      summary: '卧室先服务睡眠，床位、光线和镜面比摆件更重要。',
      suggestions: [
        '床头优先靠实墙，床尾尽量避开房门直冲。',
        '镜子和亮面柜门不要正对床，减少夜间视觉刺激。',
        '卧室用低色温暖光，睡前减少强光和反光面。',
      ],
    },
    {
      title: '厨房建议',
      summary: '厨房的“水火”落到清洁、防滑、油烟路径和备餐效率上。',
      suggestions: [
        '灶台不要被门口强风直吹，水槽周边做好沥水和防滑。',
        '灶台、水槽、冰箱形成顺手三角动线，减少来回绕行。',
        '台面只留高频工具，油烟路径越短越好。',
      ],
    },
    {
      title: '财位/事业/健康建议',
      summary: '财位、事业和健康先按环境质量处理，不做玄乎承诺。',
      suggestions: [
        '所谓财位先做到明亮、干净、可停留、不被过道直冲。',
        '事业区重点是书桌背后稳定、侧向取光、屏幕不反光。',
        form.hasEldersOrChildren ? '老人小孩常住时，防滑、夜灯、圆角和空气质量优先。' : '健康先看通风、湿度、噪声和睡眠光环境。',
      ],
    },
    {
      title: '颜色材质摆件建议',
      summary: hasBirthContext ? '命理信息可作为颜色材质弱参考，但仍以空间功能为先。' : '出生信息不完整时，颜色材质建议只按居住舒适度处理。',
      suggestions: [
        '大面积用低饱和木色、米白、浅灰绿，少量暖色做点缀。',
        '摆件只作为视觉秩序提醒，不建议购买高价开光物。',
        form.ownership === 'rent' ? '租房优先用窗帘、地毯、灯具、收纳柜等可移动方案。' : '自住房再考虑灯位、收纳系统和局部硬装。',
      ],
    },
  ]
}

function getScore(form: FormState) {
  let score = 78
  if (form.concerns.includes('clutter')) score -= 6
  if (form.concerns.includes('sleep')) score -= 4
  if (form.concerns.includes('airflow')) score -= 3
  if (form.hasEldersOrChildren) score -= 3
  if (form.roomType === 'whole') score -= 2
  return Math.max(58, Math.min(88, score))
}
