const state = {
  step: 0,
  audience: "",
  answers: {},
  report: null,
};

const STORAGE_KEYS = {
  leads: "aiLeadDiagnosticLeads",
  qr: "aiLeadDiagnosticQr",
  modelConfig: "aiLeadDiagnosticModelConfig",
};

const audienceMeta = {
  boss: {
    label: "中小老板 / 创业者",
    title: "业务获客诊断",
    desc: "看清你的客户从哪里断掉：流量、信任、私域、成交，还是团队效率。",
    questions: [
      ["industry", "你现在主要做什么行业？", ["本地生活/门店", "教育培训/知识付费", "企业服务/B2B", "大健康/减脂/滋补", "汽车/地产/高客单", "其他"]],
      ["price", "你的主产品客单价大概是？", ["500 元以内", "500-3000 元", "3000-10000 元", "10000 元以上"]],
      ["leadSource", "现在客户主要从哪里来？", ["熟人介绍", "门店自然流量", "抖音/视频号/小红书", "广告投放", "渠道合作", "不稳定"]],
      ["bottleneck", "你最头疼的问题是？", ["没流量", "有咨询但不成交", "私域没人维护", "团队跟进不稳定", "不知道怎么用 AI"]],
      ["followup", "线索来了以后，多久会有人跟进？", ["5 分钟内", "1 小时内", "当天", "经常漏掉"]],
      ["content", "你现在是否稳定发内容？", ["每天发", "每周 2-3 条", "偶尔发", "基本不发"]],
      ["privateDomain", "你有私域承接吗？", ["有企微/社群/SOP", "只有个人微信", "有群但不活跃", "没有"]],
      ["aiUsage", "你现在 AI 用到什么程度？", ["已经接入业务", "用于写文案/做图", "偶尔问问", "基本没用"]],
    ],
  },
  creator: {
    label: "新媒体获客 / 知识付费",
    title: "内容转化诊断",
    desc: "看清你的内容为什么不带客户：定位、钩子、证据、产品、私信承接还是成交话术。",
    questions: [
      ["niche", "你现在主要做什么内容方向？", ["AI/工具/效率", "商业/创业/销售", "情感/心理/成长", "减脂/健康/营养", "占星/测评/咨询", "其他"]],
      ["offer", "你现在卖什么？", ["咨询/陪跑", "课程/社群", "实体产品", "服务定制", "还没明确产品"]],
      ["platform", "主阵地在哪里？", ["抖音", "视频号", "小红书", "公众号/社群", "多个平台都做", "还没开始"]],
      ["bottleneck", "你最卡在哪里？", ["不知道发什么", "播放/阅读低", "有人看但没人问", "有人问但不成交", "没有承接工具"]],
      ["hook", "开头 3 秒通常怎么做？", ["直接讲结果", "讲痛点/反差", "先自我介绍", "随便开头"]],
      ["proof", "内容里有没有证据？", ["有案例/截图/数据", "偶尔有", "多数是观点", "基本没有"]],
      ["cta", "结尾有没有明确动作？", ["评论关键词", "私信/加微信", "引导测评/资料", "基本没有"]],
      ["aiUsage", "你现在 AI 用到什么程度？", ["批量选题脚本", "辅助文案", "只会简单提问", "基本没用"]],
    ],
  },
};

const weights = {
  boss: {
    leadSource: { "抖音/视频号/小红书": 10, "渠道合作": 9, "熟人介绍": 7, "广告投放": 7, "门店自然流量": 5, "不稳定": 2 },
    bottleneck: { "有咨询但不成交": 4, "私域没人维护": 4, "团队跟进不稳定": 5, "没流量": 6, "不知道怎么用 AI": 4 },
    followup: { "5 分钟内": 10, "1 小时内": 8, "当天": 5, "经常漏掉": 2 },
    content: { "每天发": 10, "每周 2-3 条": 8, "偶尔发": 4, "基本不发": 1 },
    privateDomain: { "有企微/社群/SOP": 10, "只有个人微信": 6, "有群但不活跃": 4, "没有": 1 },
    aiUsage: { "已经接入业务": 10, "用于写文案/做图": 6, "偶尔问问": 3, "基本没用": 1 },
  },
  creator: {
    offer: { "咨询/陪跑": 9, "课程/社群": 9, "服务定制": 8, "实体产品": 7, "还没明确产品": 2 },
    platform: { "抖音": 8, "视频号": 8, "小红书": 8, "公众号/社群": 7, "多个平台都做": 6, "还没开始": 1 },
    bottleneck: { "有人看但没人问": 4, "有人问但不成交": 4, "没有承接工具": 3, "不知道发什么": 5, "播放/阅读低": 5 },
    hook: { "直接讲结果": 10, "讲痛点/反差": 9, "先自我介绍": 3, "随便开头": 1 },
    proof: { "有案例/截图/数据": 10, "偶尔有": 6, "多数是观点": 3, "基本没有": 1 },
    cta: { "引导测评/资料": 10, "评论关键词": 8, "私信/加微信": 8, "基本没有": 1 },
    aiUsage: { "批量选题脚本": 10, "辅助文案": 6, "只会简单提问": 3, "基本没用": 1 },
  },
};

const panel = document.getElementById("questionPanel");
const stepLabel = document.getElementById("stepLabel");
const stepTitle = document.getElementById("stepTitle");
const progressBar = document.getElementById("progressBar");

function setProgress(title, width) {
  stepLabel.textContent = state.step === 0 ? "第 1 步" : state.step === 9 ? "报告" : `第 ${state.step + 1} 步`;
  stepTitle.textContent = title;
  progressBar.style.width = width;
}

function renderAudience() {
  state.step = 0;
  setProgress("选择身份", "8%");
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">Choose Track</p>
        <h2>你现在更想先获哪类客户？</h2>
        <p>两个都能做，但入口先分流，报告才会说到用户心里。</p>
      </div>
    </div>
    <div class="choice-grid">
      ${Object.entries(audienceMeta).map(([key, item]) => `
        <button class="choice" data-audience="${key}">
          <strong>${item.label}</strong>
          <span>${item.desc}</span>
        </button>
      `).join("")}
    </div>
  `;

  document.querySelectorAll("[data-audience]").forEach((button) => {
    button.addEventListener("click", () => {
      state.audience = button.dataset.audience;
      state.answers = {};
      renderQuestion(0);
    });
  });
}

function renderQuestion(index) {
  const meta = audienceMeta[state.audience];
  const question = meta.questions[index];
  state.step = index + 1;
  setProgress(meta.title, `${12 + index * 9}%`);

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${meta.label}</p>
        <h2>${question[1]}</h2>
        <p>${meta.desc}</p>
      </div>
    </div>
    <div class="choice-grid">
      ${question[2].map((option) => `
        <button class="choice ${state.answers[question[0]] === option ? "selected" : ""}" data-answer="${option}">
          <strong>${option}</strong>
          <span>${getOptionHint(state.audience, question[0], option)}</span>
        </button>
      `).join("")}
    </div>
    <div class="actions">
      <button class="btn secondary" id="backBtn">${index === 0 ? "重选身份" : "上一题"}</button>
      <button class="btn" id="nextBtn">${index === meta.questions.length - 1 ? "生成报告" : "下一题"}</button>
    </div>
  `;

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => {
      state.answers[question[0]] = button.dataset.answer;
      document.querySelectorAll("[data-answer]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    if (index === 0) renderAudience();
    else renderQuestion(index - 1);
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (!state.answers[question[0]]) {
      alert("先选一个答案，再继续。");
      return;
    }
    if (index === meta.questions.length - 1) renderReport();
    else renderQuestion(index + 1);
  });
}

function getOptionHint(audience, key, option) {
  const hints = {
    boss: {
      bottleneck: {
        "没流量": "优先补内容和渠道入口",
        "有咨询但不成交": "优先补成交话术和证据",
        "私域没人维护": "优先补私域 SOP",
        "团队跟进不稳定": "优先补 AI 跟进提醒",
        "不知道怎么用 AI": "优先从高频岗位切入",
      },
    },
    creator: {
      bottleneck: {
        "不知道发什么": "优先补选题库",
        "播放/阅读低": "优先补开头钩子",
        "有人看但没人问": "优先补行动引导",
        "有人问但不成交": "优先补产品阶梯",
        "没有承接工具": "优先补测评/资料入口",
      },
    },
  };
  return hints[audience]?.[key]?.[option] || "这个答案会影响最终诊断建议";
}

function computeScore() {
  const table = weights[state.audience];
  const values = Object.entries(state.answers).map(([key, value]) => {
    if (!table[key]) return 7;
    return table[key][value] || 5;
  });
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 10);
}

function buildDiagnosis(score) {
  const a = state.answers;
  if (state.audience === "boss") {
    if (a.followup === "经常漏掉") return ["线索跟进漏斗型", "你最先该补的不是更多流量，而是线索到成交之间的跟进机制。先把每条咨询接住，再扩大投放和内容。"];
    if (a.privateDomain === "没有" || a.privateDomain === "有群但不活跃") return ["私域承接薄弱型", "你有机会通过内容或渠道拿到线索，但缺少持续沟通、信任建立和复购承接。先做私域 SOP。"];
    if (a.content === "基本不发" || a.content === "偶尔发") return ["内容入口不足型", "你过度依赖熟人、渠道或自然流量。要新增客户，需要稳定输出能证明专业度的短内容。"];
    if (a.aiUsage === "基本没用" || a.aiUsage === "偶尔问问") return ["AI 空转待启动型", "你不缺 AI 工具，缺的是把 AI 接到获客、跟进、话术和复盘这几个动作里。"];
    return score >= 80 ? ["增长系统可放大型", "你的基础链路已经有雏形，下一步适合用 AI 做线索分层、内容复用和销售辅助。"] : ["获客链路待补强型", "你有一定客户基础，但流量、承接和成交没有形成稳定闭环。"];
  }

  if (a.offer === "还没明确产品") return ["内容无产品承接型", "你现在最先要补产品阶梯。没有明确卖什么，内容越多越容易变成纯输出。"];
  if (a.cta === "基本没有") return ["内容缺行动引导型", "用户看完不知道下一步做什么。每条内容都要有评论关键词、测评、资料或私信入口。"];
  if (a.proof === "基本没有" || a.proof === "多数是观点") return ["信任证据不足型", "观点能吸引人，但成交要靠案例、截图、过程、结果和用户反馈。"];
  if (a.hook === "先自我介绍" || a.hook === "随便开头") return ["开头钩子偏弱型", "前三秒没有结果、痛点或反差，平台和用户都不会给你足够耐心。"];
  return score >= 80 ? ["内容转化可放大型", "你已经有变现基础，适合接入 AI 批量选题、脚本生产和私域承接工具。"] : ["内容成交链路待补强型", "你有内容意识，但选题、证据、产品和承接还需要做成一条线。"];
}

function buildPainAnalysis() {
  const a = state.answers;
  const painMap = state.audience === "boss" ? buildBossPainMap(a) : buildCreatorPainMap(a);
  const ranked = Object.values(painMap).sort((left, right) => right.score - left.score);
  const primary = ranked[0];
  const secondary = ranked.slice(1, 3).filter((item) => item.score > 0);
  return {
    primary,
    secondary,
    all: ranked,
  };
}

function buildBossPainMap(a) {
  const pains = {
    traffic: {
      key: "traffic",
      score: 0,
      title: "流量入口不稳定",
      signal: "客户来源不够稳定，内容和渠道没有形成持续进线。",
      loss: "容易一直靠熟人、渠道或临时活动吃饭，增长不可预测。",
      solution: "先建立一个固定内容入口：每周围绕客户痛点发布 3 条短视频，并用评论关键词导入体检工具。",
      ai: "用 AI 批量生成行业痛点选题、3 秒开头和不同平台标题。",
    },
    conversion: {
      key: "conversion",
      score: 0,
      title: "咨询到成交转化弱",
      signal: "有咨询但成交不稳定，客户没有快速看到信任证据和购买理由。",
      loss: "线索成本会被浪费，销售靠个人发挥，成交不可复制。",
      solution: "把成交话术拆成问题确认、案例证明、方案建议、下一步动作四段，并沉淀成标准 SOP。",
      ai: "用 AI 根据客户行业和客单价生成个性化跟进话术、案例表达和异议处理。",
    },
    privateDomain: {
      key: "privateDomain",
      score: 0,
      title: "私域承接断层",
      signal: "客户进来之后没有持续教育、分层和复购动作。",
      loss: "用户只咨询一次就流失，后续成交和复购机会被浪费。",
      solution: "设计 7 天私域承接节奏：欢迎语、诊断报告、案例、答疑、轻咨询、方案邀约、复盘提醒。",
      ai: "用 AI 自动生成欢迎语、朋友圈素材、社群话题和不同客户标签下的跟进内容。",
    },
    followup: {
      key: "followup",
      score: 0,
      title: "线索跟进容易漏",
      signal: "线索来了以后没有及时响应，或跟进状态没有被记录。",
      loss: "高意向客户会被竞争对手抢走，广告和内容带来的线索被浪费。",
      solution: "建立线索登记表，至少记录来源、需求、预算、下一次跟进时间和当前状态。",
      ai: "用 AI 根据客户留言自动判断意向等级，并生成下一步跟进提醒和话术。",
    },
    aiWorkflow: {
      key: "aiWorkflow",
      score: 0,
      title: "AI 还没接进业务流程",
      signal: "AI 只停留在写文案或偶尔提问，没有进入获客、跟进、成交和复盘动作。",
      loss: "工具很多但效率没有明显提升，团队仍然靠人肉重复劳动。",
      solution: "先选一个最高频动作 AI 化，比如选题、私信回复、客户问答、销售复盘，不要一开始做大系统。",
      ai: "用一个小型 AI 工作流把选题、脚本、私信话术和线索复盘串起来。",
    },
  };

  if (a.leadSource === "不稳定" || a.leadSource === "熟人介绍" || a.leadSource === "门店自然流量") pains.traffic.score += 4;
  if (a.content === "基本不发") pains.traffic.score += 4;
  if (a.content === "偶尔发") pains.traffic.score += 3;
  if (a.bottleneck === "没流量") pains.traffic.score += 5;

  if (a.bottleneck === "有咨询但不成交") pains.conversion.score += 6;
  if (a.price === "3000-10000 元" || a.price === "10000 元以上") pains.conversion.score += 2;
  if (a.followup === "当天") pains.conversion.score += 2;

  if (a.privateDomain === "没有") pains.privateDomain.score += 6;
  if (a.privateDomain === "有群但不活跃") pains.privateDomain.score += 5;
  if (a.privateDomain === "只有个人微信") pains.privateDomain.score += 3;
  if (a.bottleneck === "私域没人维护") pains.privateDomain.score += 6;

  if (a.followup === "经常漏掉") pains.followup.score += 7;
  if (a.followup === "当天") pains.followup.score += 3;
  if (a.bottleneck === "团队跟进不稳定") pains.followup.score += 6;

  if (a.aiUsage === "基本没用") pains.aiWorkflow.score += 6;
  if (a.aiUsage === "偶尔问问") pains.aiWorkflow.score += 4;
  if (a.bottleneck === "不知道怎么用 AI") pains.aiWorkflow.score += 7;

  return pains;
}

function buildCreatorPainMap(a) {
  const pains = {
    positioning: {
      key: "positioning",
      score: 0,
      title: "账号定位和产品承接不清",
      signal: "用户看完内容后不知道你到底能帮他解决什么，也不知道下一步买什么。",
      loss: "内容可能有互动，但很难沉淀成咨询、订单或长期客户。",
      solution: "先明确一个主产品和一个目标人群，再让所有选题都围绕同一类痛点展开。",
      ai: "用 AI 把你的经历、产品和目标客户整理成账号定位、产品阶梯和选题边界。",
    },
    hook: {
      key: "hook",
      score: 0,
      title: "内容开头吸引力不足",
      signal: "前三秒没有结果、痛点或反差，用户还没理解价值就划走了。",
      loss: "同样的内容观点，因为开头弱，播放和完播都起不来。",
      solution: "每条内容开头只做一件事：先说结果、反常识、强痛点或具体收益。",
      ai: "用 AI 为同一主题生成 10 个开头，再选最像真实客户会关心的那个。",
    },
    trust: {
      key: "trust",
      score: 0,
      title: "信任证据不足",
      signal: "内容里观点多，但案例、截图、过程、结果和用户反馈少。",
      loss: "用户觉得你说得有道理，但不一定相信你能帮他做到。",
      solution: "每条转化内容至少加入一种证据：案例、前后对比、过程记录、客户反馈或数据。",
      ai: "用 AI 把你的经历和案例改写成更适合短视频表达的证据链。",
    },
    cta: {
      key: "cta",
      score: 0,
      title: "行动引导和承接缺失",
      signal: "用户看完内容后，没有被引导评论、私信、测评、领资料或加微信。",
      loss: "内容只完成曝光，没有进入线索池，获客效率会很低。",
      solution: "固定 1 个评论关键词和 1 个前端钩子，把泛流量导入测评或资料领取。",
      ai: "用 AI 根据不同视频主题生成评论关键词、私信回复和加微信后的第一句话。",
    },
    aiWorkflow: {
      key: "aiWorkflow",
      score: 0,
      title: "内容生产没有形成 AI 工作流",
      signal: "AI 只辅助单条文案，没有批量支撑选题、脚本、复盘和私信承接。",
      loss: "输出靠状态，更新不稳定，也难以快速测试哪类内容能带来咨询。",
      solution: "建立选题库、脚本库、证据库、私信话术库和复盘表，让 AI 每周批量迭代。",
      ai: "用 AI 把评论、私信和成交问题反向生成下一周选题。",
    },
  };

  if (a.offer === "还没明确产品") pains.positioning.score += 7;
  if (a.bottleneck === "不知道发什么") pains.positioning.score += 4;
  if (a.platform === "多个平台都做") pains.positioning.score += 2;

  if (a.hook === "先自我介绍") pains.hook.score += 6;
  if (a.hook === "随便开头") pains.hook.score += 7;
  if (a.bottleneck === "播放/阅读低") pains.hook.score += 5;

  if (a.proof === "基本没有") pains.trust.score += 7;
  if (a.proof === "多数是观点") pains.trust.score += 5;
  if (a.proof === "偶尔有") pains.trust.score += 2;
  if (a.bottleneck === "有人问但不成交") pains.trust.score += 5;

  if (a.cta === "基本没有") pains.cta.score += 7;
  if (a.bottleneck === "有人看但没人问") pains.cta.score += 6;
  if (a.bottleneck === "没有承接工具") pains.cta.score += 7;

  if (a.aiUsage === "基本没用") pains.aiWorkflow.score += 6;
  if (a.aiUsage === "只会简单提问") pains.aiWorkflow.score += 4;
  if (a.aiUsage === "辅助文案") pains.aiWorkflow.score += 2;

  return pains;
}

function buildSolutionPlan(painAnalysis) {
  const primary = painAnalysis.primary;
  const secondaryTitles = painAnalysis.secondary.map((item) => item.title).join("、") || "暂无明显次级痛点";
  return {
    focus: `先解决「${primary.title}」，再处理「${secondaryTitles}」。`,
    steps: [
      `第 1 步：确认痛点 - ${primary.signal}`,
      `第 2 步：先补系统 - ${primary.solution}`,
      `第 3 步：接入 AI - ${primary.ai}`,
      "第 4 步：用 7 天数据复盘：测试完成率、留资率、私信率和成交预约率。",
    ],
    offer: state.audience === "boss"
      ? "适合用「AI获客链路诊断 + 私域承接SOP + 销售话术工作流」做咨询入口。"
      : "适合用「账号定位诊断 + 内容钩子库 + 私信承接工作流」做咨询入口。",
  };
}

function getModelConfig() {
  const defaults = {
    provider: "小鸡聚合AI / OpenAI兼容",
    baseUrl: "https://xiaoji.baziapi.site/v1",
    apiKey: "",
    model: "",
    mode: "analysis",
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.modelConfig);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch (error) {
    return defaults;
  }
}

function setModelConfig(config) {
  localStorage.setItem(STORAGE_KEYS.modelConfig, JSON.stringify(config));
}

function getModelModeLabel(mode) {
  const labels = {
    analysis: "深度诊断",
    fast: "低成本快速",
    copywriting: "文案生成",
  };
  return labels[mode] || labels.analysis;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getChatCompletionsUrl(baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return "";
  if (base.endsWith("/chat/completions")) return base;
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

function getModelsUrl(baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return "";
  if (base.endsWith("/chat/completions")) return base.replace(/\/chat\/completions$/, "/models");
  if (base.endsWith("/v1")) return `${base}/models`;
  return `${base}/v1/models`;
}

function pickModelForMode(models, mode) {
  const names = models.map((item) => typeof item === "string" ? item : item.id || item.name || "").filter(Boolean);
  const buckets = {
    analysis: ["gpt-5", "claude", "sonnet", "gemini-2.5-pro", "deepseek-reasoner", "qwen-max", "qwen3"],
    fast: ["gpt-5-mini", "gpt-4o-mini", "deepseek-chat", "qwen-plus", "qwen-turbo", "glm"],
    copywriting: ["gpt-4o-mini", "gpt-5-mini", "qwen-plus", "deepseek-chat", "doubao", "ernie"],
  };
  const priorities = buckets[mode] || buckets.analysis;
  const lowerNames = names.map((name) => ({ name, lower: name.toLowerCase() }));

  for (const key of priorities) {
    const match = lowerNames.find((item) => item.lower.includes(key));
    if (match) return match.name;
  }

  return names[0] || "";
}

function buildReportLists() {
  if (state.audience === "boss") {
    return {
      actions: [
        "第 1 天：列出过去 30 天所有线索来源和成交结果。",
        "第 2 天：写出客户咨询后的标准跟进话术。",
        "第 3 天：把 5 个成交案例整理成短视频素材。",
        "第 4 天：设置评论关键词或私信领取资料入口。",
        "第 5 天：用 AI 生成 20 个行业痛点选题。",
        "第 6 天：做一个线索登记表，记录来源、需求、跟进状态。",
        "第 7 天：复盘哪个环节最漏钱，先改一个动作。",
      ],
      topics: [
        "很多老板不是没流量，是来了流量接不住",
        "你公司第一个该 AI 化的岗位是什么",
        "客户咨询后 5 分钟没人回，广告费就白花了",
      ],
      dm: [
        "你现在主要卡在没流量，还是有咨询但不成交？",
        "我先按你的行业给你做一份获客链路体检。",
        "你把客单价、线索来源、团队人数发我，我给你看先改哪里。",
      ],
    };
  }

  return {
    actions: [
      "第 1 天：明确你要卖的第一个产品或服务。",
      "第 2 天：整理 20 个目标用户真实痛点。",
      "第 3 天：每个痛点写一个 3 秒开头。",
      "第 4 天：给每条内容加案例、截图或过程证据。",
      "第 5 天：设置评论关键词和私信承接话术。",
      "第 6 天：做一页测评/资料领取入口。",
      "第 7 天：复盘哪条内容带来最多咨询。",
    ],
    topics: [
      "账号没转化，通常不是选题差，而是没有承接动作",
      "知识付费最怕的是用户看完不知道怎么买",
      "一条内容能不能获客，看结尾有没有下一步",
    ],
    dm: [
      "你现在卖的是课程、咨询，还是还没明确产品？",
      "我先帮你看内容卡在选题、证据还是私信承接。",
      "你发我 3 条最近内容，我给你拆一版获客结构。",
    ],
  };
}

function renderReport() {
  state.step = 9;
  setProgress("诊断报告", "100%");
  const score = computeScore();
  const [type, summary] = buildDiagnosis(score);
  const lists = buildReportLists();
  const painAnalysis = buildPainAnalysis();
  const solutionPlan = buildSolutionPlan(painAnalysis);
  state.report = {
    score,
    type,
    summary,
    lists,
    painAnalysis,
    solutionPlan,
    aiTasks: buildAiTasks(),
    audience: state.audience,
    audienceLabel: audienceMeta[state.audience].label,
    title: audienceMeta[state.audience].title,
    answers: { ...state.answers },
    createdAt: new Date().toISOString(),
  };

  panel.innerHTML = `
    <div class="report">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Diagnostic Report</p>
          <h2>${audienceMeta[state.audience].title}报告</h2>
          <p>这是一个轻量体检结果，适合用于私信沟通前的初筛。</p>
        </div>
      </div>

      <div class="score-row">
        <div class="score-card">
          <div>
            <strong>${score}</strong>
            <span>获客系统评分</span>
          </div>
        </div>
        <div class="diagnosis">
          <h3>${type}</h3>
          <p>${summary}</p>
        </div>
      </div>

      <div class="pain-panel">
        <div class="pain-main">
          <p class="eyebrow">Pain Analysis</p>
          <h3>核心痛点：${painAnalysis.primary.title}</h3>
          <p>${painAnalysis.primary.signal}</p>
        </div>
        <div class="pain-loss">
          <span>潜在损失</span>
          <strong>${painAnalysis.primary.loss}</strong>
        </div>
      </div>

      <div class="solution-panel">
        <div>
          <p class="eyebrow">Solution Path</p>
          <h3>解决方案路径</h3>
          <p>${solutionPlan.focus}</p>
        </div>
        <div class="solution-steps">
          ${solutionPlan.steps.map((item) => `<div><span></span><p>${item}</p></div>`).join("")}
        </div>
        <div class="solution-offer">${solutionPlan.offer}</div>
      </div>

      ${renderModelPanel()}

      <div class="report-grid">
        <div class="report-block">
          <h3>次级痛点</h3>
          <ul>${painAnalysis.secondary.length ? painAnalysis.secondary.map((item) => `<li>${item.title}：${item.signal}</li>`).join("") : "<li>当前没有明显次级痛点，建议先集中解决主痛点。</li>"}</ul>
        </div>
        <div class="report-block">
          <h3>优先 AI 化动作</h3>
          <ul>${buildAiTasks().map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="report-block">
          <h3>7 天行动清单</h3>
          <ul>${lists.actions.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="report-block">
          <h3>短视频选题</h3>
          <ul>${lists.topics.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="report-block">
          <h3>私信承接话术</h3>
          <ul>${lists.dm.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </div>

      <div class="lead-box">
        <div>
          <strong>下一步承接话术</strong>
          <p>评论或私信“体检”，发送行业、客单价、当前获客方式，我给你补完整诊断。</p>
        </div>
        <div class="lead-actions">
          <button class="btn" id="copyDmBtn">复制话术</button>
          <button class="btn secondary dark" id="posterBtn">下载海报</button>
          <button class="btn secondary dark" id="restartBtn">重新测试</button>
        </div>
      </div>

      <div class="conversion-grid">
        <form class="lead-form" id="leadForm">
          <div>
            <p class="eyebrow">Lead Capture</p>
            <h3>领取完整诊断</h3>
            <p>把结果和联系方式保存下来，方便你后续私信、加微信、约诊断。</p>
          </div>
          <div class="field-grid compact">
            <div class="field">
              <label for="leadName">称呼</label>
              <input id="leadName" name="name" placeholder="例如：张总 / 王老师" />
            </div>
            <div class="field">
              <label for="leadContact">微信或手机号</label>
              <input id="leadContact" name="contact" placeholder="用于发送完整报告" required />
            </div>
            <div class="field">
              <label for="leadBusiness">行业/账号方向</label>
              <input id="leadBusiness" name="business" placeholder="例如：减脂产品 / AI课程 / 门店" />
            </div>
            <div class="field">
              <label for="leadNote">补充问题</label>
              <input id="leadNote" name="note" placeholder="当前最想解决的问题" />
            </div>
          </div>
          <div class="actions left">
            <button class="btn" type="submit">保存线索</button>
            <button class="btn secondary" type="button" id="exportCsvBtn">导出CSV</button>
          </div>
          <p class="save-status" id="saveStatus">当前浏览器已保存 ${getLeads().length} 条线索。</p>
        </form>

        <div class="qr-card">
          <div>
            <p class="eyebrow">Private Domain</p>
            <h3>微信二维码入口</h3>
            <p>上传你的微信或企微二维码，报告页和海报都会带上承接入口。</p>
          </div>
          <div class="qr-preview" id="qrPreview"></div>
          <label class="upload-btn">
            上传二维码
            <input id="qrInput" type="file" accept="image/*" />
          </label>
          <button class="btn secondary" id="clearQrBtn" type="button">清除二维码</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("restartBtn").addEventListener("click", renderAudience);
  document.getElementById("copyDmBtn").addEventListener("click", copyDmScript);
  document.getElementById("posterBtn").addEventListener("click", () => downloadPoster(state.report));
  bindModelPanelEvents();
  document.getElementById("leadForm").addEventListener("submit", saveLead);
  document.getElementById("exportCsvBtn").addEventListener("click", exportLeadsCsv);
  document.getElementById("qrInput").addEventListener("change", saveQrImage);
  document.getElementById("clearQrBtn").addEventListener("click", clearQrImage);
  renderQrPreview();
}

function buildAiTasks() {
  if (state.audience === "boss") {
    return [
      "把客户咨询整理成标准问答库。",
      "用 AI 生成行业痛点短视频脚本。",
      "用表格记录线索来源、需求、跟进状态。",
      "每周用 AI 复盘成交和流失原因。",
    ];
  }

  return [
    "用 AI 批量生成选题和 3 秒开头。",
    "把评论和私信问题沉淀成内容库。",
    "用 AI 改写成交型结尾和私信话术。",
    "把测评结果作为私域分层标签。",
  ];
}

function renderModelPanel() {
  const config = getModelConfig();
  return `
    <div class="model-panel">
      <div class="model-head">
        <div>
          <p class="eyebrow">Model Engine</p>
          <h3>AI 深度方案（可选）</h3>
          <p>支持小鸡聚合AI或其他 OpenAI 兼容接口。先保存配置，再自动匹配模型，最后生成更个性化的解决方案。</p>
        </div>
        <a href="https://xiaoji.baziapi.site/console/playground" target="_blank" rel="noreferrer">打开模型控制台</a>
      </div>
      <div class="field-grid compact">
        <div class="field">
          <label for="modelMode">自动匹配场景</label>
          <select id="modelMode">
            <option value="analysis" ${config.mode === "analysis" ? "selected" : ""}>深度诊断：优先推理/高质量模型</option>
            <option value="fast" ${config.mode === "fast" ? "selected" : ""}>低成本快速：优先便宜高速模型</option>
            <option value="copywriting" ${config.mode === "copywriting" ? "selected" : ""}>文案生成：优先表达和营销文案模型</option>
          </select>
        </div>
        <div class="field">
          <label for="modelBaseUrl">Base URL</label>
          <input id="modelBaseUrl" value="${escapeHtml(config.baseUrl)}" placeholder="例如：https://xxx.com/v1" />
        </div>
        <div class="field">
          <label for="modelApiKey">API Key</label>
          <input id="modelApiKey" value="${escapeHtml(config.apiKey)}" type="password" placeholder="只保存在当前浏览器本地" />
        </div>
        <div class="field">
          <label for="modelName">模型名</label>
          <input id="modelName" value="${escapeHtml(config.model)}" placeholder="可自动匹配，也可手动填写" />
        </div>
      </div>
      <div class="actions left model-actions">
        <button class="btn" type="button" id="saveModelConfigBtn">保存配置</button>
        <button class="btn secondary" type="button" id="fetchModelsBtn">获取模型并自动匹配</button>
        <button class="btn secondary" type="button" id="generateAiPlanBtn">生成AI深度方案</button>
      </div>
      <p class="model-status" id="modelStatus">当前模式：${getModelModeLabel(config.mode)}。API Key 只保存在本机浏览器。</p>
      <div class="ai-plan-output" id="aiPlanOutput">
        <strong>AI 深度方案会显示在这里</strong>
        <span>如果浏览器提示跨域或网络错误，需要后续加一个后端代理来保护 Key 并转发请求。</span>
      </div>
    </div>
  `;
}

function bindModelPanelEvents() {
  const saveBtn = document.getElementById("saveModelConfigBtn");
  const fetchBtn = document.getElementById("fetchModelsBtn");
  const generateBtn = document.getElementById("generateAiPlanBtn");
  if (!saveBtn || !fetchBtn || !generateBtn) return;

  saveBtn.addEventListener("click", () => {
    const config = readModelForm();
    setModelConfig(config);
    setModelStatus("模型配置已保存。");
  });

  fetchBtn.addEventListener("click", async () => {
    const config = readModelForm();
    setModelConfig(config);
    await fetchAndPickModel(config);
  });

  generateBtn.addEventListener("click", async () => {
    const config = readModelForm();
    setModelConfig(config);
    await generateAiPlan(config);
  });
}

function readModelForm() {
  return {
    provider: "小鸡聚合AI / OpenAI兼容",
    mode: document.getElementById("modelMode")?.value || "analysis",
    baseUrl: document.getElementById("modelBaseUrl")?.value || "",
    apiKey: document.getElementById("modelApiKey")?.value || "",
    model: document.getElementById("modelName")?.value || "",
  };
}

async function fetchAndPickModel(config) {
  if (!config.baseUrl || !config.apiKey) {
    setModelStatus("请先填写 Base URL 和 API Key。", true);
    return;
  }

  setModelStatus("正在获取模型列表...");
  try {
    const response = await fetch(getModelsUrl(config.baseUrl), {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`模型列表请求失败：${response.status}`);
    }
    const data = await response.json();
    const models = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const picked = pickModelForMode(models, config.mode);
    if (!picked) {
      setModelStatus("没有识别到可用模型，请手动填写模型名。", true);
      return;
    }
    document.getElementById("modelName").value = picked;
    setModelConfig({ ...config, model: picked });
    setModelStatus(`已按「${getModelModeLabel(config.mode)}」自动匹配模型：${picked}`);
  } catch (error) {
    setModelStatus(`获取失败：${error.message}。如果是跨域错误，需要后端代理。`, true);
  }
}

async function generateAiPlan(config) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    setModelStatus("请先填写 Base URL、API Key 和模型名，或先点击自动匹配。", true);
    return;
  }

  const output = document.getElementById("aiPlanOutput");
  output.innerHTML = "<strong>正在生成深度方案...</strong><span>模型会结合客户答案、核心痛点和解决路径生成更个性化建议。</span>";
  setModelStatus("正在调用大模型...");

  try {
    const response = await fetch(getChatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: "你是一个懂新媒体获客、私域转化、销售成交和AI工作流的商业顾问。输出要具体、克制、可执行，不要泛泛而谈。",
          },
          {
            role: "user",
            content: buildAiPlanPrompt(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`模型请求失败：${response.status} ${text.slice(0, 160)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.output_text || "";
    if (!content) throw new Error("模型没有返回正文。");
    output.innerHTML = `<strong>AI 深度方案</strong><div class="ai-plan-text">${formatAiText(content)}</div>`;
    setModelStatus(`已使用 ${config.model} 生成深度方案。`);
  } catch (error) {
    output.innerHTML = `<strong>生成失败</strong><span>${escapeHtml(error.message)}。如果是浏览器跨域限制，需要后续加后端代理。</span>`;
    setModelStatus(`生成失败：${error.message}`, true);
  }
}

function buildAiPlanPrompt() {
  const report = state.report;
  return [
    `用户类型：${report.audienceLabel}`,
    `诊断标题：${report.title}`,
    `评分：${report.score}`,
    `诊断类型：${report.type}`,
    `核心痛点：${report.painAnalysis.primary.title}`,
    `痛点表现：${report.painAnalysis.primary.signal}`,
    `潜在损失：${report.painAnalysis.primary.loss}`,
    `当前解决路径：${report.solutionPlan.focus}`,
    `用户答案：${JSON.stringify(report.answers, null, 2)}`,
    "",
    "请输出：",
    "1. 用 3 句话说明这个客户当前最真实的痛点。",
    "2. 给出一个 7 天内能落地的获客改造方案。",
    "3. 给出 3 条适合拍短视频的标题。",
    "4. 给出 3 句私信承接话术。",
    "5. 给出建议我后续如何向他介绍服务，但不要硬销售。",
  ].join("\n");
}

function setModelStatus(message, isError) {
  const status = document.getElementById("modelStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
}

function formatAiText(text) {
  return escapeHtml(text)
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.leads);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function setLeads(leads) {
  localStorage.setItem(STORAGE_KEYS.leads, JSON.stringify(leads));
}

function saveLead(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const contact = String(form.get("contact") || "").trim();
  if (!contact) {
    alert("请至少填写微信或手机号。");
    return;
  }

  const lead = {
    id: `lead-${Date.now()}`,
    savedAt: new Date().toISOString(),
    name: String(form.get("name") || "").trim(),
    contact,
    business: String(form.get("business") || "").trim(),
    note: String(form.get("note") || "").trim(),
    report: state.report,
  };

  const leads = getLeads();
  leads.unshift(lead);
  setLeads(leads);
  document.getElementById("saveStatus").textContent = `已保存。当前浏览器共有 ${leads.length} 条线索，可随时导出 CSV。`;
  event.currentTarget.reset();
}

function exportLeadsCsv() {
  const leads = getLeads();
  if (!leads.length) {
    alert("还没有保存线索。");
    return;
  }

  const header = [
    "保存时间",
    "称呼",
    "微信或手机号",
    "行业/方向",
    "补充问题",
    "人群",
    "评分",
    "诊断类型",
    "诊断摘要",
    "核心痛点",
    "解决路径",
    "答案",
  ];
  const rows = leads.map((lead) => [
    formatDateTime(lead.savedAt),
    lead.name,
    lead.contact,
    lead.business,
    lead.note,
    lead.report?.audienceLabel || "",
    lead.report?.score || "",
    lead.report?.type || "",
    lead.report?.summary || "",
    lead.report?.painAnalysis?.primary?.title || "",
    lead.report?.solutionPlan?.focus || "",
    Object.entries(lead.report?.answers || {}).map(([key, value]) => `${key}:${value}`).join(" | "),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `AI获客体检线索-${compactDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function compactDate(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}`;
}

function pad2(value) {
  return value < 10 ? `0${value}` : String(value);
}

function getQrImage() {
  return localStorage.getItem(STORAGE_KEYS.qr) || "";
}

function saveQrImage(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    localStorage.setItem(STORAGE_KEYS.qr, String(reader.result));
    renderQrPreview();
  };
  reader.readAsDataURL(file);
}

function clearQrImage() {
  localStorage.removeItem(STORAGE_KEYS.qr);
  const input = document.getElementById("qrInput");
  if (input) input.value = "";
  renderQrPreview();
}

function renderQrPreview() {
  const target = document.getElementById("qrPreview");
  if (!target) return;
  const image = getQrImage();
  target.innerHTML = image
    ? `<img src="${image}" alt="微信二维码" />`
    : `<div><strong>未上传</strong><span>上传后会显示在这里</span></div>`;
}

function copyDmScript() {
  if (!state.report) return;
  const text = [
    "评论或私信“体检”，我发你 AI 获客诊断入口。",
    `你的初步诊断是：${state.report.type}，评分 ${state.report.score} 分。`,
    `核心痛点：${state.report.painAnalysis?.primary?.title || "待进一步确认"}。`,
    `建议路径：${state.report.solutionPlan?.focus || "先做完整诊断再确定优先级"}。`,
    "你把行业、客单价、当前获客方式发我，我给你补一版完整获客链路建议。",
  ].join("\n");
  copyText(text);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => alert("已复制话术。"));
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  alert("已复制话术。");
}

async function downloadPoster(report) {
  if (!report) return;

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  const qrImage = getQrImage();

  ctx.fillStyle = "#f5f2eb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fffaf1";
  roundRect(ctx, 54, 54, 792, 1172, 28);
  ctx.fill();

  ctx.fillStyle = "#0f6b57";
  roundRect(ctx, 94, 94, 176, 176, 24);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(report.score), 182, 184);
  ctx.font = "700 22px Microsoft YaHei, sans-serif";
  ctx.fillText("获客评分", 182, 224);

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f6b57";
  ctx.font = "800 24px Microsoft YaHei, sans-serif";
  ctx.fillText("AI LEAD DIAGNOSTIC", 306, 124);
  ctx.fillStyle = "#18211f";
  ctx.font = "800 48px Microsoft YaHei, sans-serif";
  wrapText(ctx, report.title, 306, 184, 500, 58);

  ctx.fillStyle = "#b6462d";
  ctx.font = "800 36px Microsoft YaHei, sans-serif";
  wrapText(ctx, `核心痛点：${report.painAnalysis?.primary?.title || report.type}`, 94, 344, 710, 46);
  ctx.fillStyle = "#3c4642";
  ctx.font = "400 26px Microsoft YaHei, sans-serif";
  wrapText(ctx, report.painAnalysis?.primary?.signal || report.summary, 94, 412, 710, 40);

  drawSection(ctx, "解决方案路径", report.solutionPlan?.steps.slice(0, 3) || report.lists.actions.slice(0, 3), 94, 600);
  drawSection(ctx, "可直接拍的选题", report.lists.topics.slice(0, 3), 94, 820);

  ctx.fillStyle = "#18211f";
  roundRect(ctx, 94, 1050, 710, 128, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 28px Microsoft YaHei, sans-serif";
  ctx.fillText("评论或私信“体检”领取完整报告", 126, 1100);
  ctx.font = "400 22px Microsoft YaHei, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.fillText("先诊断，再决定内容、私域、成交和 AI 工作流怎么做。", 126, 1140);

  if (qrImage) {
    const img = await loadImage(qrImage);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 620, 1058, 96, 96, 10);
    ctx.fill();
    ctx.drawImage(img, 628, 1066, 80, 80);
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `AI获客体检报告-${compactDate(new Date())}.png`;
  link.click();
}

function drawSection(ctx, title, items, x, y) {
  ctx.fillStyle = "#0f6b57";
  ctx.font = "800 30px Microsoft YaHei, sans-serif";
  ctx.fillText(title, x, y);
  ctx.fillStyle = "#18211f";
  ctx.font = "400 25px Microsoft YaHei, sans-serif";
  let currentY = y + 48;
  items.forEach((item, index) => {
    ctx.fillStyle = "#c9892b";
    ctx.font = "800 26px Microsoft YaHei, sans-serif";
    ctx.fillText(`${index + 1}.`, x, currentY);
    ctx.fillStyle = "#27302d";
    ctx.font = "400 25px Microsoft YaHei, sans-serif";
    currentY = wrapText(ctx, item.replace(/^第 \d 天：/, ""), x + 42, currentY, 650, 36) + 18;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = String(text).split("");
  let line = "";
  let currentY = y;
  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

renderAudience();
