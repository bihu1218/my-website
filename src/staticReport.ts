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
  wealth: '财位事业',
  health: '健康舒适',
  relationship: '关系和谐',
  career: '事业专注',
  study: '学习效率',
  sleep: '睡眠质量',
  comfort: '整体舒适度',
}

export function buildStaticReport(form: FormState): Report {
  const room = roomLabel[form.roomType]
  const goals = form.goals.length ? form.goals.map((goal) => goalLabel[goal]).join('、') : '整体舒适度'
  const score = getScore(form)
  const hasFamilyRisk = form.hasEldersOrChildren
  const hasBirthContext = Boolean(form.birthDate || form.birthTime || form.birthPlace)

  return {
    mode: 'rule',
    generatedAt: new Date().toISOString(),
    overview: `这是基于「${room}」和「${goals}」生成的快速检测报告。判断重点不是吓人，而是把传统风水里的“气、靠山、门冲、水火”翻译成看得见的空气流动、视线压力、动线效率、光线和安全感。`,
    overallScore: score,
    scores: [
      {
        label: '动线顺畅',
        value: Math.max(60, score - 4),
        summary: '看入户、过道、门窗和家具之间是否形成直冲、绕行或拥堵。',
      },
      {
        label: '采光通风',
        value: Math.max(58, score - 2),
        summary: '看自然光、空气流通、湿度和异味是否能服务日常生活。',
      },
      {
        label: '稳定安全',
        value: hasFamilyRisk ? Math.max(56, score - 8) : score,
        summary: hasFamilyRisk
          ? '家里有老人小孩时，防滑、夜灯、通道宽度和尖角优先级更高。'
          : '床、沙发、书桌背后稳定，会让人更容易放松和专注。',
      },
      {
        label: '收纳秩序',
        value: form.concerns.includes('clutter') ? Math.max(55, score - 10) : Math.min(90, score + 2),
        summary: '杂物越多，动线、清洁和视觉压力越明显，空间也越容易显得乱。',
      },
    ],
    findings: [
      {
        title: '门窗和长期停留位是否形成直冲',
        severity: 'high',
        principle: '传统说“藏风聚气”，现代可以理解为空气、视线和人流要有缓冲。空间被一条直线穿透时，人会更容易觉得不安定。',
        evidence: '重点核对入户门、阳台门、窗户与床、沙发、书桌之间有没有一眼穿透或正面直冲。',
        action: '如果有直冲，先用半高柜、帘子、绿植、地毯或家具转向做缓冲，不要直接封死采光和通风。',
      },
      {
        title: '床、沙发、书桌背后是否有稳定支撑',
        severity: 'medium',
        principle: '传统说“靠山”，现代对应的是心理安全感、视线稳定和长期停留时的放松感。',
        evidence: `${room}里长期坐卧的位置，如果背后是门、窗或过道，人更容易紧张、分心或睡不踏实。`,
        action: '优先让床头、沙发背、书桌背后靠实墙。无法靠墙时，用矮柜、厚窗帘或地毯建立边界。',
      },
      {
        title: '颜色材质最后再调，不要越级改造',
        severity: 'low',
        principle: '颜色和摆件主要影响视觉秩序与心理感受，不能替代动线、照明、通风和安全。',
        evidence: hasBirthContext
          ? '你补充了出生信息，可以作为颜色和材质的轻参考，但不能当作绝对结论。'
          : '未填写出生信息也没关系，报告会优先按真实居住体验来判断。',
        action: '先处理动线、光线、收纳，再用木色、米白、暖光、少量绿植或金属质感做气氛修正。',
      },
    ],
    roomAdvice: [
      {
        area: room,
        diagnosis: `${room}先看五件事：门的位置、窗的位置、长期停留点、主要光源、杂物堆积点。`,
        suggestions: [
          '站在门口拍一张全景，再站在窗边反拍一张，用来判断视线和动线是否直冲。',
          '床、沙发、书桌这些“人停留最久”的位置，优先检查背后是否稳定、头顶是否压迫、正面是否拥堵。',
          '调整后观察 7 天，看睡眠、清洁效率、家人走动冲突和压迫感有没有改善。',
        ],
      },
      {
        area: '灯光与收纳',
        diagnosis: '灯光和收纳决定空间是清爽、稳定、好用，还是一进门就让人烦。',
        suggestions: [
          '操作区用清晰照明，休息区用柔和暖光，不要一盏大白灯管全屋。',
          '台面只留高频物品，其他进入封闭收纳，视觉上会立刻安静很多。',
          '镜面和强反光材质不要正对床、沙发和书桌，晚上尤其容易刺激。',
        ],
      },
    ],
    sections: buildSections(form, room, goals, hasBirthContext),
    quickWins: [
      '清空入户门内外 1 米范围，让进出、换鞋、拿取更顺。',
      '给床、沙发或书桌背后补稳定边界：靠墙、矮柜、厚窗帘都可以。',
      '把正对床、沙发、书桌的强反光镜面移开或遮挡。',
      '每天固定短时间对流通风，潮湿区优先除湿和防霉。',
      '先做不花钱的家具微调，再决定是否购买灯具、窗帘或收纳柜。',
    ],
    avoid: [
      '不要因为“犯煞”恐慌拆墙、封窗或牺牲消防安全。',
      '不要购买承诺改命、暴富、化灾的高价摆件。',
      '不要机械套方位公式，现代住宅先看真实日照、噪声、隐私和湿度。',
      '不要只凭一张照片下结论，最好结合多房间照片或户型图。',
    ],
    disclaimer: '本报告用于居住舒适度和空间优化参考，不替代建筑结构、消防、电气、燃气、医疗或法律专业意见。',
  }
}

function buildSections(form: FormState, room: string, goals: string, hasBirthContext: boolean): ReportSection[] {
  return [
    {
      title: '整体评分',
      summary: `当前按「${room}」和「${goals}」做初评，先看动线、采光、通风、安全和收纳。`,
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
        '入户直见阳台时，用帘子、绿植或半高柜做缓冲。',
        '茶几和电视柜周围留出顺畅通道，减少尖角和杂物。',
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
      summary: '厨房里的“水火”落到现实里，就是清洁、防滑、油烟路径和备餐效率。',
      suggestions: [
        '灶台不要被门口强风直吹，水槽周围做好沥水和防滑。',
        '灶台、水槽、冰箱形成顺手动线，减少来回绕行。',
        '台面只留高频工具，油烟路径越短越好。',
      ],
    },
    {
      title: '财位/事业/健康建议',
      summary: '财位和事业位先按环境质量处理：明亮、干净、稳定、可停留。',
      suggestions: [
        '所谓财位先做到明亮、干净、不被过道直冲。',
        '事业区重点是书桌背后稳定、侧向取光、屏幕不反光。',
        form.hasEldersOrChildren
          ? '老人小孩常住时，防滑、夜灯、圆角和空气质量优先。'
          : '健康先看通风、湿度、噪声和睡眠光环境。',
      ],
    },
    {
      title: '颜色材质建议',
      summary: hasBirthContext
        ? '出生信息可作为颜色材质的轻参考，但仍以空间功能为先。'
        : '未填写出生信息时，颜色材质建议按居住舒适度处理。',
      suggestions: [
        '大面积用低饱和木色、米白、浅灰绿，少量暖色做点缀。',
        '摆件只作为视觉秩序提醒，不建议购买高价开光物。',
        form.ownership === 'rent'
          ? '租房优先用窗帘、地毯、灯具、收纳柜等可移动方案。'
          : '自住房再考虑灯位、收纳系统和局部硬装。',
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
