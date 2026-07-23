import Link from "next/link";

type Category = "pulse" | "tech" | "business";

type SourceDefinition = {
  id: string;
  name: string;
  shortName: string;
  category: Category;
  expectedDomains?: string[];
};

type FeedItem = {
  id?: string | number;
  title?: string;
  url?: string;
  mobileUrl?: string;
  pubDate?: string;
  extra?: {
    info?: string;
    hover?: string;
  };
};

type FeedResponse = {
  status?: "success" | "cache" | string;
  updatedTime?: number;
  items?: FeedItem[];
};

type Story = {
  id: string;
  title: string;
  url: string;
  source: SourceDefinition;
  rank: number;
  info?: string;
  summary?: string;
};

type SourceResult = {
  source: SourceDefinition;
  status: "live" | "cache" | "unavailable";
  updatedAt?: number;
  items: Story[];
};

const SOURCES: SourceDefinition[] = [
  {
    id: "weibo",
    name: "微博热搜",
    shortName: "微博",
    category: "pulse",
    expectedDomains: ["weibo.com"],
  },
  {
    id: "zhihu",
    name: "知乎热榜",
    shortName: "知乎",
    category: "pulse",
    expectedDomains: ["zhihu.com"],
  },
  {
    id: "toutiao",
    name: "今日头条",
    shortName: "头条",
    category: "pulse",
    expectedDomains: ["toutiao.com"],
  },
  {
    id: "bilibili-hot-search",
    name: "B 站热搜",
    shortName: "B 站",
    category: "pulse",
    expectedDomains: ["bilibili.com"],
  },
  {
    id: "hackernews",
    name: "Hacker News",
    shortName: "HN",
    category: "tech",
    expectedDomains: ["ycombinator.com"],
  },
  {
    id: "github",
    name: "GitHub Trending",
    shortName: "GitHub",
    category: "tech",
    expectedDomains: ["github.com"],
  },
  {
    id: "v2ex",
    name: "V2EX 热议",
    shortName: "V2EX",
    category: "tech",
    expectedDomains: ["v2ex.com"],
  },
  {
    id: "aihot",
    name: "AI 热讯",
    shortName: "AI",
    category: "tech",
  },
  {
    id: "wallstreetcn-hot",
    name: "华尔街见闻",
    shortName: "见闻",
    category: "business",
    expectedDomains: ["wallstreetcn.com"],
  },
  {
    id: "cls-hot",
    name: "财联社热门",
    shortName: "财联社",
    category: "business",
    expectedDomains: ["cls.cn"],
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

async function fetchSource(source: SourceDefinition): Promise<SourceResult> {
  const endpoint = new URL("https://newsnow.busiyi.world/api/s");
  endpoint.searchParams.set("id", source.id);
  endpoint.searchParams.set("latest", "");

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; RickyNews/1.0)",
      },
      cf: {
        cacheEverything: true,
        cacheTtl: 600,
      },
    } as RequestInit & { cf: { cacheEverything: boolean; cacheTtl: number } });

    if (!response.ok) throw new Error(`Source returned ${response.status}`);

    const data = (await response.json()) as FeedResponse;
    if (!data.items || !["success", "cache"].includes(data.status ?? "")) {
      throw new Error("Invalid source response");
    }

    const items = data.items
      .map((item, index): Story | null => {
        const title = safeText(item.title, 220);
        const url =
          safeUrl(item.url, source.expectedDomains) ??
          safeUrl(item.mobileUrl, source.expectedDomains);

        if (!title || !url) return null;

        return {
          id: `${source.id}-${String(item.id ?? index)}`,
          title,
          url,
          source,
          rank: index + 1,
          info: safeText(item.extra?.info, 64),
          summary: safeText(item.extra?.hover, 180),
        };
      })
      .filter((item): item is Story => item !== null)
      .slice(0, 12);

    return {
      source,
      status: data.status === "cache" ? "cache" : "live",
      updatedAt: data.updatedTime,
      items,
    };
  } catch {
    return { source, status: "unavailable", items: [] };
  }
}

function makeSignalList(results: SourceResult[]) {
  const available = results.filter((result) => result.items.length > 0);
  const seen = new Set<string>();
  const signals: Story[] = [];

  for (let rank = 0; rank < 7; rank += 1) {
    for (const result of available) {
      const story = result.items[rank];
      if (!story) continue;
      const key = normalizeTitle(story.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      signals.push(story);
    }
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
          <a href="#signals">当前信号</a>
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
            聚合中文热榜、开发者社区与财经媒体。保留来源，过滤重复，暂不自动发布到 X。
          </p>
        </div>
        <aside className="status-card" aria-label="数据状态">
          <div className="status-live"><span aria-hidden="true" /> LIVE</div>
          <strong>{activeResults.length}<small> / {SOURCES.length}</small></strong>
          <p>个数据源在线</p>
          <dl>
            <div><dt>最近更新</dt><dd>{formatTimestamp(latestTimestamp)}</dd></div>
            <div><dt>缓存周期</dt><dd>约 10 分钟</dd></div>
          </dl>
        </aside>
      </section>

      <section className="signals-section" id="signals">
        <div className="section-heading section-heading-light">
          <div>
            <p className="eyebrow">NOW TRENDING</p>
            <h2>此刻信号</h2>
          </div>
          <p>按榜单位置交叉抽取，兼顾不同平台，不让单一算法决定你看到什么。</p>
        </div>

        {signals.length > 0 ? (
          <ol className="signal-grid">
            {signals.map((story, index) => (
              <li key={story.id}>
                <a href={story.url} target="_blank" rel="noreferrer">
                  <div className="signal-meta">
                    <span className="signal-number">{String(index + 1).padStart(2, "0")}</span>
                    <SourceBadge source={story.source} />
                    <span>榜单 #{story.rank}</span>
                  </div>
                  <h3>{story.title}</h3>
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
          数据接口由 <a href="https://github.com/ourongxing/newsnow" target="_blank" rel="noreferrer">NewsNow</a> 开源项目提供。
          内容版权归原始发布者所有。
        </p>
      </footer>
    </main>
  );
}
