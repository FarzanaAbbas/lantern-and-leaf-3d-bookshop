import * as THREE from 'three'
import { rng } from '../data'

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function floorTexture() {
  const r = rng(7)
  const tex = canvasTexture(512, 1024, (g, w, h) => {
    const plankW = w / 4
    for (let col = 0; col < 4; col++) {
      let y = -r() * 300
      while (y < h) {
        const len = 220 + r() * 260
        const l = 38 + r() * 10
        g.fillStyle = `hsl(28, 45%, ${l}%)`
        g.fillRect(col * plankW, y, plankW, len)
        // grain
        g.strokeStyle = 'rgba(60,30,10,0.12)'
        for (let k = 0; k < 6; k++) {
          const gx = col * plankW + 8 + r() * (plankW - 16)
          g.beginPath()
          g.moveTo(gx, y)
          g.bezierCurveTo(gx + 6, y + len * 0.3, gx - 6, y + len * 0.6, gx + 2, y + len)
          g.stroke()
        }
        g.fillStyle = 'rgba(30,15,5,0.55)'
        g.fillRect(col * plankW, y, plankW, 3)
        y += len
      }
      g.fillStyle = 'rgba(30,15,5,0.6)'
      g.fillRect(col * plankW, 0, 3, h)
    }
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(8, 12)
  return tex
}

export function wallTexture() {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2c4636'
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(255,240,210,0.05)'
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h)
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(30, 2)
  return tex
}

export function runnerTexture() {
  const tex = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#7a2e2a'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#e3a33b'
    g.fillRect(14, 0, 8, h)
    g.fillRect(w - 22, 0, 8, h)
    g.strokeStyle = 'rgba(243,226,190,0.35)'
    g.lineWidth = 4
    for (let y = 0; y < h; y += 64) {
      g.beginPath()
      g.moveTo(w / 2, y + 8)
      g.lineTo(w / 2 + 40, y + 32)
      g.lineTo(w / 2, y + 56)
      g.lineTo(w / 2 - 40, y + 32)
      g.closePath()
      g.stroke()
    }
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 14)
  return tex
}

const DISPLAY = '"Fraunces", Georgia, serif'
const BODY = '"DM Sans", system-ui, sans-serif'

export function signTexture(title, sub, { bg = '#1d2a22', fg = '#f3e2be', accent = '#e3a33b' } = {}) {
  return canvasTexture(1024, 320, (g, w, h) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = accent
    g.lineWidth = 6
    g.strokeRect(18, 18, w - 36, h - 36)
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `700 104px ${DISPLAY}`
    g.fillText(title, w / 2, sub ? h / 2 - 26 : h / 2)
    if (sub) {
      g.fillStyle = accent
      g.font = `500 40px ${BODY}`
      g.fillText(sub.toUpperCase().split('').join(String.fromCharCode(8202)), w / 2, h / 2 + 70)
    }
  })
}

export const fontsReady = () =>
  Promise.race([
    Promise.all([document.fonts.load(`700 104px "Fraunces"`), document.fonts.load(`500 40px "DM Sans"`)]),
    new Promise((r) => setTimeout(r, 2500)),
  ])
