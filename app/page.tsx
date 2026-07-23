import Link from "next/link";

type Category = "pulse" | "tech" | "business";

type SourceKind =
  | "baidu"
  | "zhihu"
  | "toutiao"
  | "bilibili"
  | "hackernews"
  | "github"
  | "v2ex"
  | "ai"
  | "devto"
  | "wallstreet-hot"
  | "wallstreet-live";

type SourceDefinition = {
  id: string;
  name: string;
  shortName: string;
  category: Category;
  kind: SourceKind;
  endpoint: string;
  expectedDomains?: string[];
};

type RawStory = {
  id: string | number;
  title: unknown;
  url: unknown;
  pubDate?: number;
  info?: unknown;
  summary?: unknown;
  comments?: number;
  reactions?: number;
  heat?: number;
};

type Story = {
  id: string;
  title: string;
  url: string;
  source: SourceDefinition;
  rank: number;
  info?: string;
  summary?: string;
  publishedAt?: number;
  comments?: number;
  reactions?: number;
  heat?: number;
  xScore: number;
  xReasons: string[];
};

type SourceResult = {
  source: SourceDefinition;
  status: "live" | "cache" | "unavailable";
  updatedAt?: number;
  items: Story[];
};

const SOURCES: SourceDefinition[] = [
  {
    id: "baidu",
    name: "百度热搜",
    shortName: "百度",
    category: "pulse",
    kind: "baidu",
    endpoint: "https://top.baidu.com/api/board?platform=wise&tab=realtime",
    expectedDomains: ["baidu.com"],
  },
  {
    id: "zhihu",
    name: "知乎热榜",
    shortName: "知乎",
    category: "pulse",
    kind: "zhihu",
    endpoint: "https://api.zhihu.com/topstory/hot-list",
    expectedDomains: ["zhihu.com"],
  },
  {
    id: "toutiao",
    name: "今日头条",
    shortName: "头条",
    category: "pulse",
    kind: "toutiao",
    endpoint: "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
    expectedDomains: ["toutiao.com"],
  },
  {
    id: "bilibili-hot-search",
    name: "B 站热搜",
    shortName: "B 站",
    category: "pulse",
    kind: "bilibili",
    endpoint: "https://s.search.bilibili.com/main/hotword?limit=30",
    expectedDomains: ["bilibili.com"],
  },
  {
    id: "hackernews",
    name: "Hacker News",
    shortName: "HN",
    category: "tech",
    kind: "hackernews",
    endpoint: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20",
    expectedDomains: ["ycombinator.com"],
  },
  {
    id: "github",
    name: "GitHub Trending",
    shortName: "GitHub",
    category: "tech",
    kind: "github",
    endpoint: "https://github.com/trending?since=daily",
    expectedDomains: ["github.com"],
  },
  {
    id: "v2ex",
    name: "V2EX 热议",
    shortName: "V2EX",
    category: "tech",
    kind: "v2ex",
    endpoint: "https://www.v2ex.com/api/topics/hot.json",
    expectedDomains: ["v2ex.com"],
  },
  {
    id: "ai-discussed",
    name: "AI 新讨论",
    shortName: "AI",
    category: "tech",
    kind: "ai",
    endpoint: "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&numericFilters=points%3E%3D5&hitsPerPage=20",
    expectedDomains: ["ycombinator.com"],
  },
  {
    id: "devto",
    name: "DEV 热门",
    shortName: "DEV",
    category: "tech",
    kind: "devto",
    endpoint: "https://dev.to/api/articles?top=1&per_page=20",
    expectedDomains: ["dev.to"],
  },
  {
    id: "wallstreetcn-hot",
    name: "华尔街见闻",
    shortName: "见闻",
    category: "business",
    kind: "wallstreet-hot",
    endpoint: "https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all",
    expectedDomains: ["wallstreetcn.com"],
  },
  {
    id: "wallstreetcn-live",
    name: "财经快讯",
    shortName: "快讯",
    category: "business",
    kind: "wallstreet-live",
    endpoint: "https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30",
    expectedDomains: ["wallstreetcn.com"],
  },
];

const CATEGORY_LABELS: Record<Category, { eyebrow: string; title: string; description: string }> = {
  pulse: {
    eyebrow: "CHINA PULSE",
    title: "中文热榜",
    description: "公众正在讨论什么",
  },
  tech: {
    eyebrow: "TECH & AI",
    title: "科技与 AI",
    description: "开发者、产品与新技术信号",
  },
  business: {
    eyebrow: "BUSINESS",
    title: "商业与财经",
    description: "市场叙事与公司动态",
  },
};

const SOURCE_X_FIT: Record<SourceKind, number> = {
  zhihu: 96,
  v2ex: 94,
  ai: 92,
  hackernews: 88,
  baidu: 84,
  bilibili: 82,
  toutiao: 80,
  "wallstreet-hot": 74,
  github: 70,
  devto: 68,
  "wallstreet-live": 62,
};

const DISCUSSION_TERMS = [
  "该不该",
  "是否",
  "为什么",
  "如何看待",
  "回应",
  "争议",
  "影响",
  "裁员",
  "涨价",
  "降价",
  "工作",
  "政策",
  "安全",
  "隐私",
  "教育",
  "房价",
  "消费",
  "开源",
  "ai",
  "should",
  "why",
  "versus",
  "vs",
  "privacy",
  "open source",
];

export const dynamic = "force-dynamic";

function normalizeTitle(title: string) {
  return title.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function safeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

function safeUrl(value: unknown, expectedDomains?: string[]) {
  if (typeof value !== "string") return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    if (
      expectedDomains?.length &&
      !expectedDomains.some(
        (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      )
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

const requestOptions = {
  headers: {
    Accept: "application/json, text/plain, text/html, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "User-Agent": "Mozilla/5.0 (compatible; RickyNews/2.0)",
  },
} satisfies RequestInit;

async function fetchPayload<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, requestOptions);
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchText(endpoint: string) {
  const response = await fetch(endpoint, requestOptions);
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.text();
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function discussionInfo(points?: number, comments?: number) {
  const parts = [];
  if (typeof points === "number") parts.push(`${points} 分`);
  if (typeof comments === "number") parts.push(`${comments} 条讨论`);
  return parts.join(" · ");
}

function compactNumber(value?: string) {
  if (!value) return undefined;
  const matched = value.replace(/,/g, "").match(/([\d.]+)\s*(万|亿)?/);
  if (!matched) return undefined;
  const amount = Number(matched[1]);
  if (!Number.isFinite(amount)) return undefined;
  if (matched[2] === "亿") return amount * 100_000_000;
  if (matched[2] === "万") return amount * 10_000;
  return amount;
}

function logarithmicSignal(value: number | undefined, reference: number) {
  if (typeof value !== "number" || value <= 0) return undefined;
  return Math.min(100, (Math.log1p(value) / Math.log1p(reference)) * 100);
}

function assessForX(story: Pick<
  Story,
  "title" | "source" | "rank" | "publishedAt" | "comments" | "reactions" | "heat"
>) {
  const sourceFit = SOURCE_X_FIT[story.source.kind];
  const rankSignal = Math.max(35, 107 - story.rank * 7);
  const engagementSignals = [
    logarithmicSignal(story.comments, 300),
    logarithmicSignal(story.reactions, 2_000),
    logarithmicSignal(story.heat, 10_000_000),
  ].filter((value): value is number => value !== undefined);
  const engagementSignal = engagementSignals.length > 0
    ? Math.max(...engagementSignals)
    : rankSignal * 0.72;

  const ageHours = story.publishedAt
    ? Math.max(0, (Date.now() - story.publishedAt) / 3_600_000)
    : undefined;
  const freshnessSignal = ageHours === undefined
    ? 70
    : ageHours <= 2
      ? 100
      : ageHours <= 6
        ? 92
        : ageHours <= 12
          ? 82
          : ageHours <= 24
            ? 72
            : ageHours <= 48
              ? 55
              : 38;

  const normalizedTitle = story.title.toLocaleLowerCase();
  const topicBoost = Math.min(
    6,
    DISCUSSION_TERMS.filter((term) => normalizedTitle.includes(term)).length * 3,
  );
  const score = Math.min(
    99,
    Math.round(
      sourceFit * 0.44
      + engagementSignal * 0.24
      + rankSignal * 0.2
      + freshnessSignal * 0.12
      + topicBoost,
    ),
  );

  const reasons: string[] = [];
  if ((story.comments ?? 0) >= 30) reasons.push("评论活跃");
  else if ((story.comments ?? 0) > 0) reasons.push("已有回应");
  if ((story.heat ?? 0) >= 100_000 || (story.reactions ?? 0) >= 100) reasons.push("热度明显");
  if (story.rank <= 3) reasons.push("榜单前列");
  if (topicBoost > 0) reasons.push("有讨论空间");
  if (ageHours !== undefined && ageHours <= 6) reasons.push("新近话题");
  if (reasons.length === 0 && sourceFit >= 88) reasons.push("讨论型社区");
  if (reasons.length === 0) reasons.push("正在升温");

  return { xScore: score, xReasons: reasons.slice(0, 3) };
}

async function loadRawStories(source: SourceDefinition): Promise<RawStory[]> {
  if (source.kind === "baidu") {
    type BaiduItem = {
      isTop?: boolean;
      index?: number;
      labelTagName?: string;
      newHotName?: string;
      url?: string;
      word?: string;
    };
    const data = await fetchPayload<{
      data?: { cards?: Array<{ content?: Array<{ content?: BaiduItem[] }> }> };
    }>(source.endpoint);
    const items = data.data?.cards?.flatMap((card) => card.content ?? [])
      .flatMap((group) => group.content ?? []) ?? [];
    return items.filter((item) => !item.isTop).map((item, index) => ({
      id: `baidu-${item.index ?? index}`,
      title: item.word,
      url: item.url,
      info: item.labelTagName ?? item.newHotName,
    }));
  }

  if (source.kind === "zhihu") {
    const data = await fetchPayload<{
      data?: Array<{
        detail_text?: string;
        target?: {
          created?: number;
          excerpt?: string;
          id?: number;
          title?: string;
        };
      }>;
    }>(source.endpoint);
    return (data.data ?? []).map((item, index) => ({
      id: item.target?.id ?? index,
      title: item.target?.title,
      url: item.target?.id ? `https://www.zhihu.com/question/${item.target.id}` : undefined,
      pubDate: item.target?.created ? item.target.created * 1000 : undefined,
      info: item.detail_text,
      summary: item.target?.excerpt,
      heat: compactNumber(item.detail_text),
    }));
  }

  if (source.kind === "toutiao") {
    const data = await fetchPayload<{
      data?: Array<{ ClusterIdStr?: string; HotValue?: string; Title?: string }>;
    }>(source.endpoint);
    return (data.data ?? []).map((item, index) => ({
      id: item.ClusterIdStr ?? index,
      title: item.Title,
      url: `https://www.toutiao.com/trending/${item.ClusterIdStr}/`,
      info: item.HotValue ? `${Math.round(Number(item.HotValue) / 10_000)} 万热度` : undefined,
      heat: item.HotValue ? Number(item.HotValue) : undefined,
    }));
  }

  if (source.kind === "bilibili") {
    const data = await fetchPayload<{
      list?: Array<{ keyword?: string; pos?: number; show_name?: string }>;
    }>(source.endpoint);
    return (data.list ?? []).map((item, index) => ({
      id: item.keyword ?? index,
      title: item.show_name,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.keyword ?? "")}`,
      info: `热搜 #${item.pos ?? index + 1}`,
    }));
  }

  if (source.kind === "hackernews" || source.kind === "ai") {
    const data = await fetchPayload<{
      hits?: Array<{
        created_at?: string;
        num_comments?: number;
        objectID?: string;
        points?: number;
        title?: string;
      }>;
    }>(source.endpoint);
    return (data.hits ?? []).map((item, index) => ({
      id: item.objectID ?? index,
      title: item.title,
      url: `https://news.ycombinator.com/item?id=${item.objectID}`,
      pubDate: item.created_at ? Date.parse(item.created_at) : undefined,
      info: discussionInfo(item.points, item.num_comments),
      comments: item.num_comments,
      reactions: item.points,
    }));
  }

  if (source.kind === "github") {
    const html = await fetchText(source.endpoint);
    const articles = html.match(/<article[^>]*class="[^"]*\bBox-row\b[^"]*"[^>]*>[\s\S]*?<\/article>/gi) ?? [];
    return articles.map((article, index) => {
      const repo = article.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="(\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const description = article.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const starsToday = article.match(/([\d,]+\s+stars today)/i);
      return {
        id: repo?.[1] ?? index,
        title: repo ? decodeHtml(repo[2]).replace(/\s*\/\s*/g, "/") : undefined,
        url: repo ? `https://github.com${repo[1]}` : undefined,
        info: starsToday ? decodeHtml(starsToday[1]) : undefined,
        summary: description ? decodeHtml(description[1]) : undefined,
        reactions: starsToday ? compactNumber(starsToday[1]) : undefined,
      };
    });
  }

  if (source.kind === "v2ex") {
    const data = await fetchPayload<Array<{
      content?: string;
      id?: number;
      node?: { title?: string };
      replies?: number;
      title?: string;
      url?: string;
    }>>(source.endpoint);
    return data.map((item, index) => ({
      id: item.id ?? index,
      title: item.title,
      url: item.url,
      info: `${item.replies ?? 0} 回复${item.node?.title ? ` · ${item.node.title}` : ""}`,
      summary: item.content,
      comments: item.replies,
    }));
  }

  if (source.kind === "devto") {
    const data = await fetchPayload<Array<{
      comments_count?: number;
      description?: string;
      id?: number;
      positive_reactions_count?: number;
      title?: string;
      url?: string;
    }>>(source.endpoint);
    return data.map((item, index) => ({
      id: item.id ?? index,
      title: item.title,
      url: item.url,
      info: `${item.positive_reactions_count ?? 0} 赞 · ${item.comments_count ?? 0} 评论`,
      summary: item.description,
      comments: item.comments_count,
      reactions: item.positive_reactions_count,
    }));
  }

  if (source.kind === "wallstreet-hot") {
    const data = await fetchPayload<{
      data?: { day_items?: Array<{ id?: number; title?: string; uri?: string }> };
    }>(source.endpoint);
    return (data.data?.day_items ?? []).map((item, index) => ({
      id: item.id ?? index,
      title: item.title,
      url: item.uri,
      info: "今日热门",
    }));
  }

  const data = await fetchPayload<{
    data?: {
      items?: Array<{
        content_short?: string;
        content_text?: string;
        display_time?: number;
        id?: number;
        title?: string;
        uri?: string;
      }>;
    };
  }>(source.endpoint);
  return (data.data?.items ?? []).map((item, index) => ({
    id: item.id ?? index,
    title: item.title ?? item.content_text,
    url: item.uri,
    pubDate: item.display_time ? item.display_time * 1000 : undefined,
    info: "实时快讯",
    summary: item.content_short,
  }));
}

async function fetchSource(source: SourceDefinition): Promise<SourceResult> {
  try {
    const rawItems = await loadRawStories(source);
    const items = rawItems
      .map((item, index): Story | null => {
        const title = safeText(item.title, 220);
        const url = safeUrl(item.url, source.expectedDomains);

        if (!title || !url) return null;

        const story = {
          id: `${source.id}-${String(item.id ?? index)}`,
          title,
          url,
          source,
          rank: index + 1,
          info: safeText(item.info, 64),
          summary: safeText(item.summary, 180),
          publishedAt: item.pubDate,
          comments: item.comments,
          reactions: item.reactions,
          heat: item.heat,
        };

        return { ...story, ...assessForX(story) };
      })
      .filter((item): item is Story => item !== null)
      .slice(0, 12);

    if (items.length === 0) throw new Error("Source returned no usable items");

    return {
      source,
      status: "live",
      updatedAt: Math.max(...rawItems.map((item) => item.pubDate ?? 0), Date.now()),
      items,
    };
  } catch (error) {
    console.error(`Failed to load ${source.id}`, error instanceof Error ? error.message : error);
    return { source, status: "unavailable", items: [] };
  }
}

function makeSignalList(results: SourceResult[]) {
  const seen = new Set<string>();
  const signals: Story[] = [];

  const rankedStories = results
    .flatMap((result) => result.items)
    .sort((a, b) => b.xScore - a.xScore || a.rank - b.rank);

  for (const story of rankedStories) {
    const key = normalizeTitle(story.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    signals.push(story);
  }

  return signals.slice(0, 18);
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function SourceBadge({ source }: { source: SourceDefinition }) {
  return <span className={`source-badge source-${source.category}`}>{source.shortName}</span>;
}

export default async function Home() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  const activeResults = results.filter((result) => result.items.length > 0);
  const signals = makeSignalList(results);
  const latestTimestamp = Math.max(...activeResults.map((result) => result.updatedAt ?? 0), 0);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回页面顶部">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Ricky 热点雷达</span>
        </a>
        <nav aria-label="内容分类">
          <a href="#signals">适合发 X</a>
          <a href="#pulse">中文</a>
          <a href="#tech">科技</a>
          <a href="#business">商业</a>
        </nav>
        <Link className="refresh-link" href="/" aria-label="刷新热点内容">
          刷新页面 <span aria-hidden="true">↻</span>
        </Link>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">DAILY SIGNAL DESK · BEIJING TIME</p>
          <h1>少刷一点，<br />看见正在发生的事。</h1>
          <p className="hero-description">
            聚合中文热榜、开发者社区与财经媒体。默认按 X 传播潜力排序，保留来源，暂不自动发布。
          </p>
        </div>
        <aside className="status-card" aria-label="数据状态">
          <div className="status-live"><span aria-hidden="true" /> LIVE</div>
          <strong>{activeResults.length}<small> / {SOURCES.length}</small></strong>
          <p>个数据源在线</p>
          <dl>
            <div><dt>最近更新</dt><dd>{formatTimestamp(latestTimestamp)}</dd></div>
            <div><dt>更新方式</dt><dd>打开时获取</dd></div>
          </dl>
        </aside>
      </section>

      <section className="signals-section" id="signals">
        <div className="section-heading section-heading-light">
          <div>
            <p className="eyebrow">X-WORTHY NOW</p>
            <h2>适合发 X</h2>
          </div>
          <p>默认按评论信号、热度、时效和讨论空间综合排序；分数用于筛选候选，不代表事实可信度。</p>
        </div>

        {signals.length > 0 ? (
          <ol className="signal-grid">
            {signals.map((story, index) => (
              <li key={story.id}>
                <a href={story.url} target="_blank" rel="noreferrer">
                  <div className="signal-meta">
                    <span className="signal-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="x-score" aria-label={`适合发 X 评分 ${story.xScore} 分`}>
                      X 传播 {story.xScore}
                    </span>
                    <SourceBadge source={story.source} />
                    <span>原榜 #{story.rank}</span>
                  </div>
                  <h3>{story.title}</h3>
                  <div className="x-reasons" aria-label="入选理由">
                    {story.xReasons.map((reason) => <span key={reason}>{reason}</span>)}
                  </div>
                  {story.summary && <p>{story.summary}</p>}
                  <span className="read-more">查看原文 <span aria-hidden="true">↗</span></span>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">数据源暂时不可用，请稍后刷新。</div>
        )}
      </section>

      {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => {
        const categoryResults = results.filter((result) => result.source.category === category);
        const label = CATEGORY_LABELS[category];

        return (
          <section className="category-section" id={category} key={category}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{label.eyebrow}</p>
                <h2>{label.title}</h2>
              </div>
              <p>{label.description}</p>
            </div>

            <div className="source-grid">
              {categoryResults.map((result) => (
                <article className="source-panel" key={result.source.id}>
                  <header>
                    <div>
                      <SourceBadge source={result.source} />
                      <h3>{result.source.name}</h3>
                    </div>
                    <span className={`source-status status-${result.status}`}>
                      {result.status === "unavailable" ? "暂不可用" : formatTimestamp(result.updatedAt)}
                    </span>
                  </header>
                  {result.items.length > 0 ? (
                    <ol>
                      {result.items.slice(0, 8).map((story) => (
                        <li key={story.id}>
                          <span className="rank">{String(story.rank).padStart(2, "0")}</span>
                          <a href={story.url} target="_blank" rel="noreferrer">
                            <span>{story.title}</span>
                            {story.info && <small>{story.info}</small>}
                          </a>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="source-empty">这个来源本轮没有返回内容。</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <footer>
        <div>
          <strong>Ricky 热点雷达</strong>
          <p>只做信息发现，不代替事实核查与独立判断。</p>
        </div>
        <p>
          数据直接来自各平台公开页面与接口；单个来源失败不会影响其他内容。内容版权归原始发布者所有。
        </p>
      </footer>
    </main>
  );
}
