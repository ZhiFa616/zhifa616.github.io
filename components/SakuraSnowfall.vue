<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

interface Snowflake {
  x: number
  y: number
  r: number
  vy: number
  vx: number
  alpha: number
  phase: number
  swing: number
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let flakes: Snowflake[] = []
let width = 0
let height = 0
let dpr = 1
let lastTime = 0
let running = true

function makeFlake(randomY = true): Snowflake {
  const r = Math.random() * 2.2 + 1.1
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -10,
    r,
    vy: r * 0.9 + Math.random() * 0.7,
    vx: (Math.random() - 0.5) * 0.5,
    alpha: Math.random() * 0.5 + 0.35,
    phase: Math.random() * Math.PI * 2,
    swing: Math.random() * 0.6 + 0.25,
  }
}

function createFlakes() {
  const count = Math.min(110, Math.max(28, Math.round((width * height) / 16000)))
  flakes = Array.from({ length: count }, () => makeFlake(true))
}

function resize() {
  if (!canvas)
    return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }
  createFlakes()
}

function drawFlake(flake: Snowflake) {
  if (!ctx)
    return
  ctx.beginPath()
  ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`
  ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2)
  ctx.fill()
}

function tick(time: number) {
  if (!ctx) {
    return
  }
  const delta = lastTime ? Math.min((time - lastTime) / 16.67, 3) : 1
  lastTime = time

  ctx.clearRect(0, 0, width, height)

  for (const flake of flakes) {
    flake.phase += 0.01 * delta
    flake.y += flake.vy * delta
    flake.x += (flake.vx + Math.sin(flake.phase) * flake.swing) * delta

    if (flake.y > height + 8) {
      Object.assign(flake, makeFlake(false))
      flake.y = -8
    }
    if (flake.x < -12)
      flake.x = width + 10
    else if (flake.x > width + 12)
      flake.x = -10

    drawFlake(flake)
  }

  rafId = window.requestAnimationFrame(tick)
}

function handleVisibility() {
  if (document.hidden) {
    running = false
    window.cancelAnimationFrame(rafId)
  }
  else if (!running) {
    running = true
    lastTime = 0
    rafId = window.requestAnimationFrame(tick)
  }
}

onMounted(() => {
  canvas = document.createElement('canvas')
  canvas.className = 'sakura-snowfall'
  ctx = canvas.getContext('2d')
  if (!ctx)
    return
  document.body.appendChild(canvas)
  resize()
  rafId = window.requestAnimationFrame(tick)
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', handleVisibility)
  canvas?.remove()
  canvas = null
  ctx = null
})
</script>

<template>
  <div class="sakura-snowfall-host" aria-hidden="true" />
</template>

<style lang="scss">
.sakura-snowfall {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
}

.sakura-snowfall-host {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
}
</style>
