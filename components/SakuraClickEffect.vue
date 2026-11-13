<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const COLORS = ['#DF9193', '#F3A9B0', '#FFD9C0', '#FFF3F4', '#E9B7C6']

function spawnParticles(x: number, y: number) {
  const count = 9
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span')
    particle.className = 'sakura-click-particle'

    const isPetal = i % 3 !== 0
    const size = isPetal ? 6 + Math.random() * 5 : 4 + Math.random() * 4
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const distance = 24 + Math.random() * 46

    particle.style.left = `${x}px`
    particle.style.top = `${y}px`
    particle.style.width = `${size}px`
    particle.style.height = `${size * (isPetal ? 1.35 : 1)}px`
    particle.style.background = COLORS[i % COLORS.length]
    particle.style.borderRadius = isPetal ? '50% 0 50% 50%' : '50%'
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 12}px`)
    particle.style.setProperty('--rot', `${Math.round(Math.random() * 300 - 150)}deg`)
    particle.style.animationDelay = `${Math.random() * 0.08}s`

    document.body.appendChild(particle)
    window.setTimeout(() => particle.remove(), 1100)
  }
}

let handler: ((event: PointerEvent) => void) | null = null

onMounted(() => {
  handler = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse')
      return
    spawnParticles(event.clientX, event.clientY)
  }
  window.addEventListener('pointerdown', handler, { passive: true })
})

onBeforeUnmount(() => {
  if (handler)
    window.removeEventListener('pointerdown', handler)
  handler = null
})
</script>

<template>
  <div aria-hidden="true" />
</template>

<style lang="scss">
.sakura-click-particle {
  position: fixed;
  z-index: 9000;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: sakura-click-fly 0.92s cubic-bezier(0.16, 0.84, 0.32, 1) forwards;
  will-change: transform, opacity;
  box-shadow: 0 0 6px rgba(223, 145, 147, 0.35);
}

@keyframes sakura-click-fly {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(0.6);
    opacity: 1;
  }
  60% {
    opacity: 0.9;
  }
  100% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)) scale(0.15);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sakura-click-particle {
    display: none;
  }
}
</style>
