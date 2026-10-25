import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence } from 'motion/react'
import Store from './scene/Store'
import { rig, walkTo } from './scene/rig'
import { END_T, sectionT } from './data'
import { Navbar, Intro, BookCard, CartDrawer, WalkBar, Toast } from './ui/Overlay'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [selected, setSelected] = useState(null)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const closeBook = useCallback(() => {
    if (rig.focus) rig.target = rig.focus.t
    setSelected(null)
  }, [])

  useEffect(() => {
    rig.onUserMove = () => setSelected(null)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeBook()
        setCartOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeBook])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(id)
  }, [toast])

  const enter = () => {
    rig.enabled = true
    setEntered(true)
    walkTo(sectionT(0))
  }

  const addToCart = (book) => {
    setCart((c) => [
      ...c,
      {
        key: `${book.key}-${Date.now()}`,
        bookKey: book.key,
        title: book.title,
        author: book.author,
        price: book.price,
        color: book.color,
      },
    ])
    setToast(`“${book.title}” is in your trolley`)
    closeBook()
  }

  const removeOne = (bookKey) => {
    setCart((c) => {
      const i = c.findLastIndex((x) => x.bookKey === bookKey)
      return i < 0 ? c : [...c.slice(0, i), ...c.slice(i + 1)]
    })
  }

  const goTo = (t) => {
    closeBook()
    setCartOpen(false)
    walkTo(t)
  }

  const checkout = () => {
    goTo(END_T)
    setToast('This is a demo shop — no payment is taken')
  }

  return (
    <>
      <div className="stage">
        <Canvas
          camera={{ fov: 62, near: 0.05, far: 60, position: [0, 1.62, 3] }}
          dpr={[1, 1.75]}
          gl={{ antialias: true }}
          onPointerMissed={() => selected && closeBook()}
        >
          <Suspense fallback={null}>
            <Store selected={selected} onSelect={setSelected} cart={cart} />
          </Suspense>
        </Canvas>
      </div>

      <AnimatePresence>{!entered && <Intro key="intro" onEnter={enter} />}</AnimatePresence>

      {entered && (
        <>
          <Navbar cartCount={cart.length} onCart={() => setCartOpen(true)} onGo={goTo} />
          <WalkBar onGo={goTo} />
        </>
      )}

      <AnimatePresence>
        {selected && <BookCard key={selected.key} book={selected} onClose={closeBook} onAdd={() => addToCart(selected)} />}
      </AnimatePresence>
      <AnimatePresence>
        {cartOpen && (
          <CartDrawer key="cart" cart={cart} onClose={() => setCartOpen(false)} onRemove={removeOne} onCheckout={checkout} />
        )}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast key={toast} text={toast} />}</AnimatePresence>
    </>
  )
}
