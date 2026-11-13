<script setup lang="ts">
import { onMounted, ref } from 'vue'

const clicked = ref(false)
let resetTimer: number | undefined

/** 点击娃娃：切换背景音乐播放状态，并让娃娃大幅摆动一下 */
function handleClick() {
  window.dispatchEvent(new CustomEvent('sakura-music-toggle'))

  clicked.value = false
  window.requestAnimationFrame(() => {
    clicked.value = true
    window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => {
      clicked.value = false
    }, 1600)
  })
}

/** 挂件出现时轻微晃动提示可点击 */
const visible = ref(false)
onMounted(() => {
  window.setTimeout(() => {
    visible.value = true
  }, 600)
})
</script>

<template>
  <div
    class="sakura-doll"
    :class="{ 'is-visible': visible, 'is-clicked': clicked }"
    role="button"
    tabindex="0"
    aria-label="吊绳娃娃（点击可播放/暂停音乐）"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <span class="sakura-doll__line" aria-hidden="true" />
    <div class="sakura-doll__pivot">
      <img class="sakura-doll__img" src="/doll.png" alt="" draggable="false">
    </div>
  </div>
</template>

<style lang="scss">
.sakura-doll {
  position: fixed;
  top: 0;
  right: 9%;
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 84px;
  transform: translateY(-110%);
  opacity: 0;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease;

  &.is-visible {
    transform: translateY(0);
    opacity: 1;
  }

  /* 从屏幕顶部垂下来的细绳 */
  .sakura-doll__line {
    width: 2px;
    height: 78px;
    background: linear-gradient(180deg, rgba(223, 145, 147, 0) 0%, rgba(223, 145, 147, 0.9) 20%, rgba(223, 145, 147, 0.75) 100%);
    flex: none;
  }

  .sakura-doll__pivot {
    transform-origin: top center;
    animation: sakura-doll-swing 4.2s ease-in-out infinite;
    will-change: transform;
    margin-top: -6px;
  }

  .sakura-doll__img {
    display: block;
    width: 84px;
    height: auto;
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.12));
    pointer-events: none;
  }

  &.is-clicked .sakura-doll__pivot {
    animation: sakura-doll-swing-big 0.9s ease-in-out 2;
  }

  @media (max-width: 768px) {
    right: 4%;
    width: 58px;

    .sakura-doll__line {
      height: 56px;
    }

    .sakura-doll__img {
      width: 58px;
    }
  }
}

@keyframes sakura-doll-swing {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

@keyframes sakura-doll-swing-big {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-18deg); }
  45% { transform: rotate(16deg); }
  70% { transform: rotate(-10deg); }
  85% { transform: rotate(6deg); }
}
</style>
