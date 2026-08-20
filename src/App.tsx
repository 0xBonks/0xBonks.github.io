import { useEffect, useMemo, useState } from 'react'

type Quote = {
  symbol: string
  name: string
  price: number
  change: number
  spark: number[]
  kind: 'stock' | 'etf'
}

type NewsItem = {
  source: string
  label: string
  title: string
  time: string
  url: string
  tone: 'green' | 'orange' | 'blue'
}

const initialQuotes: Quote[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 181.62, change: 3.84, spark: [42, 45, 43, 49, 47, 55, 53, 59, 64, 61, 69, 74], kind: 'stock' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 586.11, change: 1.29, spark: [45, 47, 46, 49, 50, 52, 51, 54, 56, 55, 57, 60], kind: 'etf' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 172.44, change: -0.72, spark: [63, 60, 64, 61, 57, 59, 54, 55, 52, 49, 51, 48], kind: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 522.33, change: 0.46, spark: [48, 49, 48, 51, 53, 52, 54, 55, 54, 57, 58, 61], kind: 'stock' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', price: 67.82, change: -2.15, spark: [70, 68, 66, 67, 64, 61, 63, 59, 57, 55, 53, 51], kind: 'etf' },
]

const fallbackNews: NewsItem[] = [
  { source: 'r/stocks', label: 'MARKET CHATTER', title: 'Semiconductor momentum keeps the AI trade at the center of the tape', time: '18 min ago', url: 'https://www.reddit.com/r/stocks/', tone: 'orange' },
  { source: 'Hacker News', label: 'TECH SIGNAL', title: 'The quiet infrastructure shift behind the next wave of AI products', time: '42 min ago', url: 'https://news.ycombinator.com/', tone: 'blue' },
  { source: 'r/investing', label: 'LONG VIEW', title: 'Investors debate whether earnings breadth is finally widening', time: '1 hr ago', url: 'https://www.reddit.com/r/investing/', tone: 'green' },
  { source: 'Market Watch', label: 'MACRO', title: 'Markets look ahead to the next inflation read and central bank signals', time: '2 hrs ago', url: 'https://www.marketwatch.com/', tone: 'orange' },
]

function formatPrice(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MiniChart({ points, large = false }: { points: number[]; large?: boolean }) {
  const width = large ? 620 : 120
  const height = large ? 210 : 44
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const path = points.map((point, index) => `${(index / (points.length - 1)) * width},${height - ((point - min) / range) * (height - 12) - 6}`).join(' L ')
  const area = `${path} L ${width},${height} L 0,${height} Z`
  return <svg className={`mini-chart ${large ? 'large-chart' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price trend chart"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e4ff75" stopOpacity=".28" /><stop offset="100%" stopColor="#e4ff75" stopOpacity="0" /></linearGradient></defs><path d={`M ${area}`} fill="url(#chart-fill)" /><path d={`M ${path}`} fill="none" stroke="#e4ff75" strokeWidth={large ? 2.5 : 1.8} strokeLinecap="round" /></svg>
}

function App() {
  const [quotes, setQuotes] = useState(initialQuotes)
  const [news, setNews] = useState(fallbackNews)
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('market-pulse-watchlist') || '["NVDA", "QQQ", "MSFT"]') } catch { return ['NVDA', 'QQQ', 'MSFT'] }
  })
  const [selectedSymbol, setSelectedSymbol] = useState('NVDA')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('just now')

  const selected = quotes.find((quote) => quote.symbol === selectedSymbol) ?? quotes[0]
  const filteredNews = news.filter((item) => filter === 'ALL' || item.label.includes(filter))
  const searchResults = quotes.filter((quote) => `${quote.symbol} ${quote.name}`.toLowerCase().includes(search.toLowerCase()))
  const comparison = useMemo(() => watchlist.map((symbol) => quotes.find((quote) => quote.symbol === symbol)).filter(Boolean) as Quote[], [watchlist, quotes])

  useEffect(() => { localStorage.setItem('market-pulse-watchlist', JSON.stringify(watchlist)) }, [watchlist])

  async function refresh() {
    setIsRefreshing(true)
    try {
      const [hackerNewsResponse, redditResponse] = await Promise.all([
        fetch('https://hn.algolia.com/api/v1/search_by_date?query=stocks%20OR%20markets&tags=story&hitsPerPage=3'),
        fetch('https://www.reddit.com/r/stocks+investing+technology/.json?limit=3'),
      ])
      const liveNews: NewsItem[] = []
      if (hackerNewsResponse.ok) {
        const data = await hackerNewsResponse.json()
        liveNews.push(...data.hits.filter((hit: { title?: string }) => hit.title).map((hit: { title: string; url?: string }, index: number) => ({ source: 'Hacker News', label: 'LIVE SIGNAL', title: hit.title, time: `${index + 1}h ago`, url: hit.url || 'https://news.ycombinator.com/', tone: 'blue' as const })))
      }
      if (redditResponse.ok) {
        const data = await redditResponse.json()
        liveNews.push(...data.data.children.filter((child: { data?: { title?: string } }) => child.data?.title).map((child: { data: { title: string; permalink: string; subreddit: string } }) => ({ source: `r/${child.data.subreddit}`, label: 'LIVE SIGNAL', title: child.data.title, time: 'recently', url: `https://www.reddit.com${child.data.permalink}`, tone: 'orange' as const })))
      }
      if (liveNews.length) setNews([...liveNews, ...fallbackNews].slice(0, 6))
    } catch { /* fallback content keeps the dashboard useful offline */ }
    setLastUpdated('a few seconds ago')
    setIsRefreshing(false)
  }

  function toggleWatch(symbol: string) {
    setWatchlist((current) => current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="."><span className="brand-mark">+</span><span>market<span className="brand-accent">pulse</span></span></a>
        <div className="topbar-meta"><span className="live-dot" /> <span>DATA STREAM ACTIVE</span><span className="divider" /> <span>US MARKETS</span></div>
        <button className="refresh-button" onClick={refresh} disabled={isRefreshing}><span className={isRefreshing ? 'spin' : ''}>↻</span>{isRefreshing ? 'UPDATING' : 'REFRESH'}</button>
      </header>

      <section className="hero-grid">
        <div className="hero-copy"><p className="eyebrow">THURSDAY / AUG 20, 2026 <span>09:42 AM ET</span></p><h1>Read the market<br /><em>between the lines.</em></h1><p className="hero-description">A focused view of the signals, stories, and price action shaping your watchlist.</p></div>
        <div className="market-status"><div className="status-label">MARKET PULSE <span className="status-live">OPEN</span></div><div className="status-value">S&amp;P 500 <strong>6,395.11</strong> <span className="positive">+0.74%</span></div><div className="status-line"><span>OPEN</span><span>4H 18M UNTIL CLOSE</span></div><div className="progress"><span /></div></div>
      </section>

      <section className="control-row"><div className="search-wrap"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stocks, ETFs, or topics" aria-label="Search stocks and ETFs" />{search && <div className="search-results">{searchResults.map((quote) => <button key={quote.symbol} onClick={() => { setSelectedSymbol(quote.symbol); setSearch('') }}><strong>{quote.symbol}</strong><span>{quote.name}</span></button>)}</div>}</div><div className="updated">LAST SYNC <strong>{lastUpdated}</strong></div></section>

      <section className="watchlist-section"><div className="section-heading"><div><p className="eyebrow">YOUR RADAR</p><h2>Watchlist</h2></div><span className="count">{watchlist.length.toString().padStart(2, '0')} TRACKED</span></div><div className="watchlist-grid">{watchlist.map((symbol) => { const quote = quotes.find((item) => item.symbol === symbol); return quote ? <button className={`watch-card ${selectedSymbol === symbol ? 'selected' : ''}`} key={symbol} onClick={() => setSelectedSymbol(symbol)}><span className="watch-symbol">{symbol}</span><span className="watch-name">{quote.kind.toUpperCase()} / US</span><strong>${formatPrice(quote.price)}</strong><span className={quote.change >= 0 ? 'positive' : 'negative'}>{quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}%</span><MiniChart points={quote.spark} /></button> : null })}<button className="add-card" onClick={() => setSearch('')}><span>+</span><small>ADD SYMBOL</small></button></div></section>

      <div className="content-grid"><section className="panel news-panel"><div className="panel-heading"><div><p className="eyebrow">SIGNAL / 01</p><h2>News flow</h2></div><div className="filter-tabs">{['ALL', 'MARKET', 'TECH'].map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="news-list">{filteredNews.map((item, index) => <article className="news-item" key={`${item.title}-${index}`}><div className={`source-marker ${item.tone}`} /><div className="news-body"><div className="news-meta"><span>{item.source}</span><span>{item.time}</span></div><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a><span className="news-label">{item.label}</span></div><span className="arrow">↗</span></article>)}</div><button className="text-button" onClick={refresh}>LOAD FRESH SIGNALS <span>→</span></button></section>

        <section className="panel detail-panel"><div className="panel-heading"><div><p className="eyebrow">FOCUS / 02</p><h2>Price action</h2></div><button className={`star-button ${watchlist.includes(selected.symbol) ? 'starred' : ''}`} onClick={() => toggleWatch(selected.symbol)} aria-label="Toggle selected symbol in watchlist">★</button></div><div className="quote-head"><div><span className="big-symbol">{selected.symbol}</span><span className="quote-name">{selected.name}</span></div><span className="kind-tag">{selected.kind}</span></div><div className="quote-price"><strong>${formatPrice(selected.price)}</strong><span className={selected.change >= 0 ? 'positive' : 'negative'}>{selected.change >= 0 ? '+' : ''}{selected.change.toFixed(2)}% <small>TODAY</small></span></div><div className="detail-chart"><MiniChart points={selected.spark} large /></div><div className="chart-footer"><span>1D</span><span>1W</span><span className="chart-active">1M</span><span>3M</span><span>1Y</span><span>MAX</span><span className="chart-source">DELAYED DATA</span></div></section>
      </div>

      <section className="comparison panel"><div className="panel-heading"><div><p className="eyebrow">CONTEXT / 03</p><h2>Compare performance</h2></div><span className="count">NORMALIZED / 1 MONTH</span></div><div className="compare-layout"><div className="compare-chart"><div className="axis"><span>+10%</span><span>0%</span><span>-10%</span></div><div className="chart-grid-lines"><i /><i /><i /><i /></div>{comparison.map((quote, index) => <div className="compare-line" key={quote.symbol} style={{ '--line-offset': `${index * 17}px`, '--line-color': index === 0 ? '#e4ff75' : index === 1 ? '#82aaff' : '#ff9b63' } as React.CSSProperties}><span>{quote.symbol}</span><div><span style={{ width: `${Math.max(28, 70 - index * 12)}%` }} /></div></div>)}</div><div className="compare-legend">{comparison.map((quote, index) => <button key={quote.symbol} onClick={() => setSelectedSymbol(quote.symbol)}><i style={{ background: index === 0 ? '#e4ff75' : index === 1 ? '#82aaff' : '#ff9b63' }} />{quote.symbol}<span className={quote.change >= 0 ? 'positive' : 'negative'}>{quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}%</span></button>)}</div></div></section>

      <footer><span>MARKET PULSE <b>BY 0xBONKS</b></span><span>PUBLIC DATA / NOT FINANCIAL ADVICE</span><span>STATUS <i className="live-dot" /> NOMINAL</span></footer>
    </main>
  )
}

export default App
