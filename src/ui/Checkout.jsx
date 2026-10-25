import { useState } from 'react'
import { motion } from 'motion/react'
import { Cover, STATIONS, ease, rupees, useActiveStation } from './Overlay'

const DELIVERY_FEE = 49
const FREE_DELIVERY_OVER = 999

export const orderTotals = (cart, method) => {
  const subtotal = cart.reduce((s, x) => s + x.price, 0)
  const delivery = method === 'delivery' && subtotal < FREE_DELIVERY_OVER ? DELIVERY_FEE : 0
  return { subtotal, delivery, total: subtotal + delivery }
}

export function groupLines(cart) {
  const groups = []
  for (const item of cart) {
    const g = groups.find((x) => x.bookKey === item.bookKey)
    if (g) g.qty++
    else groups.push({ ...item, qty: 1 })
  }
  return groups
}

// Shown while standing at the counter, so the checkout room is never a dead end.
export function CounterPrompt({ cartCount, total, lastOrder, onPay, onBrowse }) {
  const active = useActiveStation()
  if (STATIONS[active].id !== 'checkout') return null
  const empty = cartCount === 0
  return (
    <motion.div
      className="counter-prompt"
      data-ui
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      <p className="eyebrow">At the counter</p>
      {empty ? (
        <>
          <h3>{lastOrder ? `Order ${lastOrder.id} is bagged` : 'Your trolley is empty'}</h3>
          <p className="muted">
            {lastOrder ? 'Thanks for shopping with us. Fancy another browse?' : 'Pick a book or two from the aisles, then come back here to pay.'}
          </p>
          <button className="add wide" onClick={onBrowse}>
            Back to the aisles
          </button>
        </>
      ) : (
        <>
          <h3>
            {cartCount} {cartCount === 1 ? 'book' : 'books'} · {rupees(total)}
          </h3>
          <p className="muted">Ready when you are. Click the counter or the button below.</p>
          <button className="add wide" onClick={onPay}>
            Pay at the counter
          </button>
        </>
      )}
    </motion.div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className={`field ${error ? 'bad' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  )
}

function Totals({ subtotal, delivery, total, method }) {
  return (
    <dl className="totals">
      <div>
        <dt>Books</dt>
        <dd>{rupees(subtotal)}</dd>
      </div>
      {method === 'delivery' && (
        <div>
          <dt>Delivery</dt>
          <dd>{delivery ? rupees(delivery) : 'Free'}</dd>
        </div>
      )}
      <div className="grand">
        <dt>Total</dt>
        <dd>{rupees(total)}</dd>
      </div>
    </dl>
  )
}

const STEPS = ['review', 'details', 'done']
const STEP_LABELS = ['Your books', 'Details', 'Done']

export function CheckoutPanel({ cart, onClose, onPlace, onKeepBrowsing }) {
  const [step, setStep] = useState(cart.length ? 'review' : 'empty')
  const [method, setMethod] = useState('pickup')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', pincode: '' })
  const [errors, setErrors] = useState({})
  const [order, setOrder] = useState(null)
  const lines = groupLines(cart)
  const { subtotal, delivery, total } = orderTotals(cart, method)
  const at = STEPS.indexOf(step)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    const digits = form.phone.replace(/\D/g, '')
    if (form.name.trim().length < 2) e.name = 'Please enter your name'
    if (!/^[6-9]\d{9}$/.test(digits.slice(-10)) || digits.length < 10) e.phone = 'Enter a 10-digit mobile number'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'That email looks off'
    if (method === 'delivery') {
      if (form.address.trim().length < 8) e.address = 'Add your full address'
      if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a 6-digit PIN code'
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  const place = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setOrder(onPlace({ method, name: form.name.trim(), total, lines }))
    setStep('done')
  }

  return (
    <>
      <motion.div className="scrim" data-ui onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside
        className="drawer checkout"
        data-ui
        role="dialog"
        aria-label="Checkout"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.45, ease }}
      >
        <header>
          <h2>{step === 'done' ? 'Thank you!' : 'Checkout'}</h2>
          {at >= 0 && (
            <ol className="steps" aria-label="Checkout steps">
              {STEP_LABELS.map((label, i) => (
                <li key={label} className={i <= at ? 'on' : ''} aria-current={i === at ? 'step' : undefined}>
                  {label}
                </li>
              ))}
            </ol>
          )}
          <button className="close" onClick={onClose} aria-label="Close checkout">
            ×
          </button>
        </header>

        {step === 'empty' && (
          <div className="empty">
            <p>Your trolley is empty.</p>
            <p className="muted">Walk the aisles and add a book or two first.</p>
            <button className="add wide" style={{ marginTop: 16 }} onClick={onKeepBrowsing}>
              Back to the aisles
            </button>
          </div>
        )}

        {step === 'review' && (
          <>
            <div className="scroll">
              <ul className="lines">
                {lines.map((g) => (
                  <li key={g.bookKey}>
                    <Cover book={g} small />
                    <div className="line-text">
                      <b>{g.title}</b>
                      <span className="muted">
                        {g.author}
                        {g.qty > 1 ? ` · ×${g.qty}` : ''}
                      </span>
                    </div>
                    <span>{rupees(g.price * g.qty)}</span>
                  </li>
                ))}
              </ul>
              <fieldset className="choice">
                <legend>How would you like your books?</legend>
                <label className={method === 'pickup' ? 'on' : ''}>
                  <input type="radio" name="method" checked={method === 'pickup'} onChange={() => setMethod('pickup')} />
                  <span>
                    <b>Pick up in store</b>
                    <small>Ready in 2 hours · Free</small>
                  </span>
                </label>
                <label className={method === 'delivery' ? 'on' : ''}>
                  <input type="radio" name="method" checked={method === 'delivery'} onChange={() => setMethod('delivery')} />
                  <span>
                    <b>Home delivery</b>
                    <small>
                      2–4 days ·{' '}
                      {subtotal >= FREE_DELIVERY_OVER ? 'Free' : `${rupees(DELIVERY_FEE)}, free over ${rupees(FREE_DELIVERY_OVER)}`}
                    </small>
                  </span>
                </label>
              </fieldset>
            </div>
            <footer>
              <Totals subtotal={subtotal} delivery={delivery} total={total} method={method} />
              <button className="add wide" onClick={() => setStep('details')}>
                Continue
              </button>
            </footer>
          </>
        )}

        {step === 'details' && (
          <form className="details" onSubmit={place} noValidate>
            <div className="scroll pad">
              <Field label="Full name" error={errors.name}>
                <input value={form.name} onChange={set('name')} autoComplete="name" autoFocus />
              </Field>
              <Field label="Mobile number" error={errors.phone}>
                <input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="98765 43210" />
              </Field>
              <Field label="Email for your receipt (optional)" error={errors.email}>
                <input value={form.email} onChange={set('email')} type="email" autoComplete="email" />
              </Field>
              {method === 'delivery' && (
                <>
                  <Field label="Delivery address" error={errors.address}>
                    <textarea rows={3} value={form.address} onChange={set('address')} autoComplete="street-address" />
                  </Field>
                  <Field label="PIN code" error={errors.pincode}>
                    <input value={form.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
                  </Field>
                </>
              )}
              <p className="demo-note">
                Demo shop: no payment is taken and nothing you type leaves this page. A real store would take cash or UPI{' '}
                {method === 'pickup' ? 'at pickup' : 'on delivery'}.
              </p>
            </div>
            <footer>
              <Totals subtotal={subtotal} delivery={delivery} total={total} method={method} />
              <div className="row">
                <button type="button" className="ghost" onClick={() => setStep('review')}>
                  Back
                </button>
                <button type="submit" className="add wide">
                  Place order · {rupees(total)}
                </button>
              </div>
            </footer>
          </form>
        )}

        {step === 'done' && order && (
          <>
            <div className="scroll pad done">
              <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
                <motion.circle
                  cx="36"
                  cy="36"
                  r="33"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease }}
                />
                <motion.path
                  d="M22 37l10 10 19-21"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.5, ease }}
                />
              </svg>
              <h3>Order {order.id}</h3>
              <p className="muted">
                Thanks, {order.name.split(' ')[0]}.{' '}
                {order.method === 'pickup'
                  ? 'Your books are bagged on the counter and will be ready in 2 hours.'
                  : 'Your books will arrive in 2–4 days.'}
              </p>
              <ul className="receipt">
                {order.lines.map((g) => (
                  <li key={g.bookKey}>
                    <span>
                      {g.title}
                      {g.qty > 1 ? ` ×${g.qty}` : ''}
                    </span>
                    <span>{rupees(g.price * g.qty)}</span>
                  </li>
                ))}
                <li className="sum">
                  <span>To pay {order.method === 'pickup' ? 'at pickup' : 'on delivery'}</span>
                  <b>{rupees(order.total)}</b>
                </li>
              </ul>
            </div>
            <footer>
              <button className="add wide" onClick={onKeepBrowsing}>
                Keep browsing
              </button>
            </footer>
          </>
        )}
      </motion.aside>
    </>
  )
}
