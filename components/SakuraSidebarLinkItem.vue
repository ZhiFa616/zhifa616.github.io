<script lang="ts" setup>
import { ref } from 'vue'

interface SidebarItem {
  text?: string
  icon?: string
  link?: string
  target?: string
  locale?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

defineProps<{
  items?: SidebarItem[]
  item?: SidebarItem
}>()

const openMap = ref<Record<number, boolean>>({})

function isOpen(index: number, collapsed?: boolean) {
  if (openMap.value[index] === undefined)
    return collapsed !== true
  return openMap.value[index]
}

function toggle(index: number, collapsed?: boolean) {
  openMap.value = { ...openMap.value, [index]: !isOpen(index, collapsed) }
}
</script>

<template>
  <SakuraNavLink v-if="item" v-bind="item">
    <SakuraSidebarCount :locale="item.locale" />
  </SakuraNavLink>

  <ul v-else-if="items?.length" class="sakura-sidebar-link-items">
    <li v-for="(navItem, index) in items" :key="index">
      <template v-if="navItem.items?.length">
        <div
          class="sakura-sidebar-link-item sakura-sidebar-group"
          @click="toggle(index, navItem.collapsed)"
        >
          <span v-if="navItem.icon" :class="[navItem.icon]" class="sakura-icon" />
          <span class="sakura-sidebar-group-text">{{ navItem.text }}</span>
          <span
            class="i-ri-arrow-down-s-line sakura-sidebar-group-arrow"
            :class="{ 'is-open': isOpen(index, navItem.collapsed) }"
          />
        </div>
        <SakuraSidebarLinkItem
          v-show="isOpen(index, navItem.collapsed)"
          :items="navItem.items"
          class="sakura-sidebar-link-sub-items"
        />
      </template>

      <SakuraSidebarLinkItem v-else :item="navItem" class="sakura-sidebar-link-item" />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.sakura-sidebar-link-items {
  .sakura-sidebar-link-item {
    padding: 6px 15px;
    color: var(--sakura-color-text);
    font-size: 14px;
    letter-spacing: 0.02em;

    &:hover {
      color: var(--sakura-color-primary);
    }
  }

  .sakura-icon {
    width: 1rem;
    height: 1rem;
    margin-right: 6px;
  }

  .sakura-sidebar-link-sub-items {
    padding-left: 20px;

    .sakura-sidebar-link-item {
      font-size: 13px;
    }

    .sakura-icon {
      width: 0.9rem;
      height: 0.9rem;
    }
  }

  .sakura-sidebar-group {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .sakura-sidebar-group-text {
    flex: 1;
  }

  .sakura-sidebar-group-arrow {
    transition: transform 0.25s;

    &.is-open {
      transform: rotate(180deg);
    }
  }
}
</style>
