// Shared mutable camera-rail state. Lives outside React so the render loop
// and the UI can both read it every frame without re-rendering.
import { CAMERA_START_Z, END_T } from '../data'

export const rig = {
  enabled: false,
  target: 0, // where the visitor wants to be along the aisle
  t: 0, // where the camera actually is (damped)
  look: { x: 0, y: 0 },
  focus: null, // { t, yaw } while a book is pulled out
  onUserMove: null,
}

export const clampT = (t) => Math.min(Math.max(t, 0), END_T)
export const cameraZ = (t) => CAMERA_START_Z - t

export function walkTo(t) {
  rig.focus = null
  rig.target = clampT(t)
}

export function nudge(delta) {
  if (!rig.enabled) return
  if (rig.focus) {
    rig.target = rig.focus.t
    rig.focus = null
    rig.onUserMove?.()
  }
  rig.target = clampT(rig.target + delta)
}
