'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useEffect, useState, memo } from 'react'

// ─── Design tokens (matching Figma frames) ───────────────────────────────────
const T = {
  bg:         '#F2F5F7',
  xlGreen:    '#2E6147',
  pptRed:     '#8C3826',
  navy:       '#1B2A4A',
  ribbonBg:   '#F5F7FA',
  gridLine:   '#EBEDF0',
  white:      '#FFFFFF',
  textMuted:  '#9AA0A8',
}

const DATA_COLORS = ['#38856B','#5973A6','#808089','#8C8059','#A66159']
const ICON_COLORS  = ['#38856B','#5973A6','#A66159','#4D80A6','#8C8059','#668C73','#80618C','#597AB3','#73698C','#8C7366']
const BAR_HEIGHTS  = [0.25, 0.35, 0.42, 0.52, 0.60, 0.68, 0.78, 0.88]

// Deterministic cell widths per row×col so they never jitter
const CELL_W = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 10 }, (_, c) => 50 + Math.round(Math.sin(c * 1.7 + r * 0.5) * 18))
)

// ─── Spring presets ──────────────────────────────────────────────────────────
const SPRING_SNAPPY  = { type: 'spring', stiffness: 380, damping: 22 }
const SPRING_BOUNCY  = { type: 'spring', stiffness: 280, damping: 16 }  // slight overshoot
const SPRING_SETTLE  = { type: 'spring', stiffness: 200, damping: 20 }

// ─── Phase timing (ms) ───────────────────────────────────────────────────────
// 0=empty  1=data-in  2=data-settled  3=icon-clicked  4=chart-appears
// 5=flash  6=chart-landed  7=final
const PHASE_MS = [400, 350, 700, 200, 550, 100, 450, 1800]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TrafficDots = () => (
  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
    {['#D9736B','#E6C76B','#80B87A'].map((c,i) => (
      <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:0.85 }} />
    ))}
  </div>
)

const TitleBar = memo(({ color, label }) => (
  <div style={{
    background: color, borderRadius:'10px 10px 0 0',
    padding:'0 14px', height:30, display:'flex', alignItems:'center', gap:14,
    flexShrink: 0,
  }}>
    <TrafficDots />
    <span style={{ color:'rgba(255,255,255,0.9)', fontSize:11, fontWeight:500, letterSpacing:'0.01em' }}>
      {label}
    </span>
  </div>
))

// ─── Data row (staggered, bouncy) ────────────────────────────────────────────
const DataRow = memo(({ rowIdx, visible, settled }) => (
  <motion.div
    style={{ display:'flex', gap:0, position:'absolute', top: 30 + rowIdx * 26, left:0 }}
    initial={{ opacity:0, y: 18, scaleY: 1.12 }}
    animate={visible ? {
      opacity: 1,
      y: settled ? 0 : -2,       // slight overshoot on first appear
      scaleY: settled ? 1 : 1.04,
    } : { opacity:0, y:18, scaleY:1.12 }}
    transition={settled ? SPRING_BOUNCY : { ...SPRING_SNAPPY, delay: rowIdx * 0.045 }}
    transformOrigin="bottom"
  >
    {CELL_W[rowIdx].map((w, c) => (
      <div key={c} style={{ width: 90, paddingLeft: 8 }}>
        <div style={{
          width: w, height: 13, borderRadius: 3,
          background: DATA_COLORS[(c + rowIdx) % 5],
          opacity: 0.13,
        }} />
      </div>
    ))}
  </motion.div>
))

// ─── Bar chart (shared via layoutId for the "lift" movement) ─────────────────
const BarChart = memo(({ layoutId, style }) => (
  <motion.div
    layoutId={layoutId}
    transition={SPRING_SETTLE}
    style={{
      background: T.white, borderRadius: 6,
      border: `1px solid ${T.gridLine}`,
      padding: '10px 12px 8px',
      overflow: 'hidden',
      ...style,
    }}
  >
    {/* Chart title placeholder */}
    <div style={{ width:72, height:7, borderRadius:2, background:'#30333A', opacity:0.22, marginBottom:8 }} />
    {/* Bars + axes */}
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:'calc(100% - 28px)', paddingLeft:22, position:'relative' }}>
      {/* Y-axis */}
      <div style={{ position:'absolute', left:18, top:0, bottom:0, width:1, background:T.gridLine }} />
      {BAR_HEIGHTS.map((pct, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ ...SPRING_BOUNCY, delay: i * 0.04 }}
          style={{
            flex:1, background: T.navy, borderRadius:'2px 2px 0 0',
            height:`${pct * 100}%`, opacity:0.87,
            transformOrigin:'bottom',
          }}
        />
      ))}
    </div>
    {/* X-axis */}
    <div style={{ height:1, background:T.gridLine, marginLeft:22, marginTop:2 }} />
  </motion.div>
))

// ─── Slide text blocks ────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const lineVariants = {
  hidden:  { opacity:0, x:-10 },
  visible: { opacity:1, x:0, transition: SPRING_SNAPPY },
}

const SlideText = memo(({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="slide-text"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        style={{ position:'absolute', left:18, top:12, width:'45%' }}
      >
        <motion.div variants={lineVariants}
          style={{ width:'68%', height:12, borderRadius:3, background:'#1E2228', opacity:0.22, marginBottom:10 }} />
        <motion.div variants={lineVariants}
          style={{ width:'48%', height:7, borderRadius:2, background:'#3A3D44', opacity:0.14, marginBottom:16 }} />
        {[82,95,74,88,68,78].map((w,i) => (
          <motion.div key={i} variants={lineVariants}
            style={{ width:`${w}%`, height:6, borderRadius:2, background:'#454850', opacity:0.1, marginBottom:8 }} />
        ))}
        <div style={{ marginTop:10 }}>
          {[55,70,60,52].map((w,i) => (
            <motion.div key={i} variants={lineVariants}
              style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:T.navy, opacity:0.3, flexShrink:0 }} />
              <div style={{ width:`${w}%`, height:5, borderRadius:2, background:'#454850', opacity:0.09 }} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
))

// ─── Excel ribbon ─────────────────────────────────────────────────────────────
const Ribbon = memo(({ highlight, color }) => (
  <div style={{
    background: T.ribbonBg, height:48, display:'flex', alignItems:'center',
    paddingLeft:16, gap:0, borderBottom:`1px solid ${T.gridLine}`, flexShrink:0,
  }}>
    {ICON_COLORS.map((c, i) => (
      <div key={i} style={{ width:48, display:'flex', justifyContent:'center', alignItems:'center', position:'relative' }}>
        {/* Highlight ring */}
        <AnimatePresence>
          {highlight === i && (
            <motion.div
              key="ring"
              initial={{ scale:0.6, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.6, opacity:0 }}
              transition={SPRING_BOUNCY}
              style={{
                position:'absolute', inset:-4, borderRadius:9,
                background: c, opacity: 0.15,
                border: `2px solid ${c}`,
              }}
            />
          )}
        </AnimatePresence>
        <motion.div
          animate={highlight === i ? { scale:1.1 } : { scale:1 }}
          transition={SPRING_BOUNCY}
          style={{ width:24, height:24, borderRadius:5, background:c, opacity:0.82, zIndex:1 }}
        />
      </div>
    ))}
  </div>
))

// ─── Spreadsheet grid ─────────────────────────────────────────────────────────
const SpreadsheetGrid = memo(({ showData, settled, showChart, phase }) => (
  <div style={{ flex:1, position:'relative', overflow:'hidden', background: T.white }}>
    {/* Grid lines */}
    {Array.from({ length:10 }).map((_,i) => (
      <div key={`h${i}`} style={{ position:'absolute', left:0, right:0, top:26*(i+1), height:1, background:T.gridLine }} />
    ))}
    {Array.from({ length:12 }).map((_,i) => (
      <div key={`v${i}`} style={{ position:'absolute', top:0, bottom:0, left:90*(i+1), width:1, background:T.gridLine }} />
    ))}
    {/* Column headers */}
    {'ABCDEFGHIJKL'.split('').map((c,i) => (
      <div key={c} style={{ position:'absolute', top:4, left:90*i+32, fontSize:9, fontWeight:500, color:T.textMuted }}>
        {c}
      </div>
    ))}
    {/* Data rows */}
    {Array.from({ length:8 }).map((_,r) => (
      <DataRow key={r} rowIdx={r} visible={showData} settled={settled} />
    ))}
    {/* Excel bar chart — visible phases 4-5 */}
    <AnimatePresence>
      {showChart && (
        <motion.div
          key="excel-chart-wrapper"
          initial={{ opacity:0, scale:0.88 }}
          animate={{ opacity:1, scale:1 }}
          exit={{ opacity:0, scale:0.92 }}
          transition={SPRING_BOUNCY}
          style={{ position:'absolute', right:8, top:8, bottom:8, width:'42%' }}
        >
          <BarChart layoutId="hackabacus-chart" style={{ height:'100%' }} />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
))

// ─── Slide area ───────────────────────────────────────────────────────────────
const SlideArea = memo(({ showChart, showText, showAccent }) => (
  <div style={{ flex:1, position:'relative', background:'#F7F7FA', overflow:'hidden' }}>
    {/* Navy accent bar */}
    <AnimatePresence>
      {showAccent && (
        <motion.div
          key="accent"
          initial={{ scaleX:0 }}
          animate={{ scaleX:1 }}
          transition={{ ...SPRING_SNAPPY }}
          style={{ position:'absolute', top:0, left:0, right:0, height:3, background:T.navy, opacity:0.65, transformOrigin:'left' }}
        />
      )}
    </AnimatePresence>

    {/* Slide text */}
    <SlideText visible={showText} />

    {/* Divider between text and chart */}
    <AnimatePresence>
      {showChart && (
        <motion.div key="div"
          initial={{ scaleY:0, opacity:0 }} animate={{ scaleY:1, opacity:1 }}
          transition={{ ...SPRING_SNAPPY, delay:0.1 }}
          style={{ position:'absolute', left:'49%', top:14, bottom:14, width:1, background:T.gridLine, transformOrigin:'top' }}
        />
      )}
    </AnimatePresence>

    {/* Chart on slide — same layoutId as Excel chart = Framer auto-animates position */}
    <AnimatePresence>
      {showChart && (
        <motion.div
          key="slide-chart-wrapper"
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          transition={{ duration:0.15 }}
          style={{ position:'absolute', right:12, top:10, bottom:10, left:'51%' }}
        >
          <BarChart layoutId="hackabacus-chart" style={{ height:'100%' }} />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
))

// ─── Main component ───────────────────────────────────────────────────────────
export default function HackabacusDemo() {
  const [phase, setPhase] = useState(0)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (prefersReduced) return
    let t
    const tick = () => {
      setPhase(p => {
        const next = (p + 1) % 8
        t = setTimeout(tick, PHASE_MS[next])
        return next
      })
    }
    t = setTimeout(tick, PHASE_MS[0])
    return () => clearTimeout(t)
  }, [prefersReduced])

  const showData       = phase >= 1
  const dataSettled    = phase >= 2
  const iconHighlight  = phase >= 3 ? 5 : null   // icon index 5 = "Charts"
  const showExcelChart = phase === 4 || phase === 5
  const showSlideChart = phase >= 6
  const showSlideText  = phase >= 6
  const showAccent     = phase === 7

  return (
    <div style={{
      background: T.bg,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: 20,
      fontFamily: '"Geist", "Geist Sans", "Outfit", system-ui, sans-serif',
      boxSizing: 'border-box',
      borderRadius: 12,
      overflow: 'hidden',
    }}>

      {/* ── PowerPoint window ── */}
      <div style={{
        height: 220, flexShrink: 0, display:'flex', flexDirection:'column',
        borderRadius:10, overflow:'hidden',
        background: T.white, border:`1px solid ${T.gridLine}`,
        boxShadow:'0 4px 24px -8px rgba(0,0,0,0.07)',
      }}>
        <TitleBar color={T.pptRed} label="PowerPoint — Hackabacus" />
        {/* PPT ribbon */}
        <div style={{
          background: T.ribbonBg, height:30, display:'flex', alignItems:'center',
          paddingLeft:14, gap:0, borderBottom:`1px solid ${T.gridLine}`, flexShrink:0,
        }}>
          {[T.pptRed,'#5973A6','#738C73','#80668C','#998059','#668099'].map((c,i) => (
            <div key={i} style={{ width:40, display:'flex', justifyContent:'center' }}>
              <div style={{ width:16, height:16, borderRadius:4, background:c, opacity:0.72 }} />
            </div>
          ))}
        </div>
        <SlideArea showChart={showSlideChart} showText={showSlideText} showAccent={showAccent} />
      </div>

      {/* ── Excel window ── */}
      <div style={{
        height: 320, flexShrink: 0, display:'flex', flexDirection:'column',
        borderRadius:10, overflow:'hidden',
        background: T.white, border:`1px solid ${T.gridLine}`,
        boxShadow:'0 4px 24px -8px rgba(0,0,0,0.07)',
      }}>
        <TitleBar color={T.xlGreen} label="Excel — Hackabacus" />
        <Ribbon highlight={iconHighlight} />
        <SpreadsheetGrid
          showData={showData}
          settled={dataSettled}
          showChart={showExcelChart}
          phase={phase}
        />
      </div>

    </div>
  )
}
