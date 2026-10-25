import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SECTIONS, END_T, sectionT } from '../data'
import { rig } from '../scene/rig'

const ease = [0.22, 1, 0.36, 1]
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`

export const STATIONS = [
  { id: 'entrance', label: 'Entrance', t: 0 },
  ...SECTIONS.map((s, i) => ({ id: s.id, label: s.name, t: sectionT(i) })),
  { id: 'checkout', label: 'Checkout', t: END_T },
]

function useActiveStation() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    let raf
    let last = -1
    const tick = () => {
      let a = 0
      STATIONS.forEach((s, i) => {
        if (rig.t >= s.t - 1.5) a = i
      })
      if (a !== last) setActive((last = a))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return active
}

function Leaf({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6c-11 10-15 20-15 28a15 15 0 0 0 30 0c0-8-4-18-15-28z" fill="var(--accent)" />
      <path d="M32 20v32" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

export function Navbar({ cartCount, onCart, onGo }) {
  const active = useActiveStation()
  const chips = useRef()
  useEffect(() => {
    const el = chips.current?.children[active]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])
  return (
    <motion.header
      className="nav"
      data-ui
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: 0.2 }}
    >
      <a className="brand" href="#" onClick={(e) => (e.preventDefault(), onGo(0))}>
        <Leaf />
        <span>Lantern &amp; Leaf</span>
      </a>
      <nav className="chips" aria-label="Aisles" ref={chips}>
        {STATIONS.map((s, i) => (
          <button key={s.id} className={`chip ${i === active ? 'on' : ''}`} onClick={() => onGo(s.t)}>
            {s.label}
          </button>
        ))}
      </nav>
      <button className="cart-btn" onClick={onCart} aria-label={`Open trolley, ${cartCount} books`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
          <circle cx="10" cy="20.5" r="1.2" />
          <circle cx="17" cy="20.5" r="1.2" />
        </svg>
        <span className="cart-label">Trolley</span>
        <motion.span key={cartCount} className="count" initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
          {cartCount}
        </motion.span>
      </button>
    </motion.header>
  )
}

export function WalkBar({ onGo }) {
  const fill = useRef()
  const active = useActiveStation()
  useEffect(() => {
    let raf
    const tick = () => {
      if (fill.current) fill.current.style.transform = `scaleX(${rig.t / END_T})`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <motion.div
      className="walkbar"
      data-ui
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: 0.35 }}
    >
      <div className="where">
        <span className="where-k">You are in</span>
        <span className="where-v">{STATIONS[active].label}</span>
      </div>
      <div className="track">
        <div className="track-fill" ref={fill} />
        {STATIONS.map((s) => (
          <button
            key={s.id}
            className="tick"
            style={{ left: `${(s.t / END_T) * 100}%` }}
            onClick={() => onGo(s.t)}
            aria-label={`Walk to ${s.label}`}
            title={s.label}
          />
        ))}
      </div>
      <p className="hint">
        <span className="hint-desk">Scroll or press W / S to walk · move the mouse to look · click any book</span>
        <span className="hint-touch">Swipe up to walk · tap any book</span>
      </p>
    </motion.div>
  )
}

export function Intro({ onEnter }) {
  return (
    <motion.section
      className="intro"
      data-ui
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.9, ease } }}
    >
      <motion.div
        className="intro-inner"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0, transition: { duration: 0.5 } }}
        transition={{ duration: 0.9, ease, delay: 0.15 }}
      >
        <div className="intro-mark">
          <Leaf size={40} />
        </div>
        <p className="eyebrow">An independent bookshop · open all night</p>
        <h1>
          Walk in.
          <br />
          <em>Pull a book off the shelf.</em>
        </h1>
        <p className="lede">
          Lantern &amp; Leaf is a bookshop you can stroll through. Six aisles, a few thousand spines and a trolley that fills up as you go.
        </p>
        <motion.button className="enter" onClick={onEnter} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          Step inside
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.section>
  )
}

function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16)
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l > 0.6 ? '#1b1b1b' : '#f7f0e2'
}

function Cover({ book, small }) {
  return (
    <div className={`cover ${small ? 'small' : ''}`} style={{ background: book.color, color: inkFor(book.color) }}>
      {book.band && <span className="cover-band" style={{ background: book.band }} />}
      {!small && (
        <>
          <span className="cover-title">{book.title}</span>
          <span className="cover-author">{book.author}</span>
        </>
      )}
    </div>
  )
}

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
            fill={value >= i - 0.25 ? 'var(--accent)' : 'rgba(255,255,255,0.18)'}
          />
        </svg>
      ))}
      <b>{value.toFixed(1)}</b>
    </span>
  )
}

export function BookCard({ book, onClose, onAdd }) {
  return (
    <motion.aside
      className="card"
      data-ui
      role="dialog"
      aria-label={book.title}
      initial={{ opacity: 0, x: 40, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease, delay: 0.15 }}
    >
      <button className="close" onClick={onClose} aria-label="Put the book back">
        ×
      </button>
      <motion.div initial={{ rotateY: -35, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.7, ease, delay: 0.25 }}>
        <Cover book={book} />
      </motion.div>
      <div className="card-body">
        <p className="eyebrow">{book.section}</p>
        <h2>{book.title}</h2>
        <p className="by">by {book.author}</p>
        <Stars value={book.rating} />
        <p className="blurb">{book.blurb}</p>
        <dl className="facts">
          <div>
            <dt>Pages</dt>
            <dd>{book.pages}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>Paperback</dd>
          </div>
          <div>
            <dt>Ships</dt>
            <dd>2–4 days</dd>
          </div>
        </dl>
        <div className="buy">
          <span className="price">{rupees(book.price)}</span>
          <motion.button className="add" onClick={onAdd} whileTap={{ scale: 0.96 }}>
            Add to trolley
          </motion.button>
        </div>
      </div>
    </motion.aside>
  )
}

export function CartDrawer({ cart, onClose, onRemove, onCheckout }) {
  const groups = []
  for (const item of cart) {
    const g = groups.find((x) => x.bookKey === item.bookKey)
    if (g) g.qty++
    else groups.push({ ...item, qty: 1 })
  }
  const total = cart.reduce((s, x) => s + x.price, 0)
  return (
    <>
      <motion.div className="scrim" data-ui onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside
        className="drawer"
        data-ui
        role="dialog"
        aria-label="Your trolley"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.45, ease }}
      >
        <header>
          <h2>Your trolley</h2>
          <button className="close" onClick={onClose} aria-label="Close trolley">
            ×
          </button>
        </header>
        {groups.length === 0 ? (
          <div className="empty">
            <p>Your trolley is empty.</p>
            <p className="muted">Walk the aisles and click any spine that catches your eye.</p>
          </div>
        ) : (
          <ul className="lines">
            {groups.map((g) => (
              <motion.li key={g.bookKey} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Cover book={g} small />
                <div className="line-text">
                  <b>{g.title}</b>
                  <span className="muted">{g.author}</span>
                </div>
                <div className="line-end">
                  <span>{rupees(g.price * g.qty)}</span>
                  <button className="qty" onClick={() => onRemove(g.bookKey)} aria-label={`Remove one ${g.title}`}>
                    {g.qty > 1 ? `×${g.qty} −` : 'Remove'}
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
        <footer>
          <div className="total">
            <span>Total</span>
            <b>{rupees(total)}</b>
          </div>
          <button className="add wide" disabled={!cart.length} onClick={onCheckout}>
            Walk to checkout
          </button>
        </footer>
      </motion.aside>
    </>
  )
}

export function Toast({ text }) {
  return (
    <motion.div
      className="toast"
      role="status"
      initial={{ opacity: 0, y: 16, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 8, x: '-50%' }}
      transition={{ duration: 0.35, ease }}
    >
      {text}
    </motion.div>
  )
}
