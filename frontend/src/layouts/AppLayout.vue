<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LoginForm from '../components/LoginForm.vue'
import RegisterForm from '../components/RegisterForm.vue'

const auth = useAuthStore()
const router = useRouter()
const loginVisible = ref(false)
const registerVisible = ref(false)
const route = useRoute()

function onLogout() {
  auth.logout()
  router.push('/')
}

onMounted(() => {
  if (route.query.login === '1') {
    loginVisible.value = true
  }
})
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="position: sticky; top: 0; z-index: 1000;">
      <div class="container header">
        <div class="brand" @click="$router.push('/')">快问快答</div>
        <div class="spacer" />
        <div class="actions">
          <a-space>
            <a-button type="link" @click="$router.push('/leaderboard')">排行榜</a-button>
            <template v-if="!auth.isLoggedIn">
              <a-button @click="loginVisible=true">登录</a-button>
              <a-button type="dashed" @click="registerVisible=true">注册</a-button>
            </template>
            <template v-else>
              <a-dropdown>
                <a-button>
                  {{ auth.user?.username }}
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="onLogout">退出登录</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </template>
          </a-space>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content style="padding: 24px 0">
      <div class="container">
        <router-view />
      </div>
    </a-layout-content>

    <a-layout-footer style="text-align:center; color:#999">© 2025 快问快答</a-layout-footer>
  </a-layout>

  <!-- 登录弹窗 -->
  <a-modal v-model:open="loginVisible" title="登录" :footer="null">
    <LoginForm @success="loginVisible=false" />
  </a-modal>

  <!-- 注册弹窗 -->
  <a-modal v-model:open="registerVisible" title="注册" :footer="null">
    <RegisterForm @success="() => { registerVisible=false; loginVisible=true }" />
  </a-modal>
</template>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 16px;
}
.header {
  height: 64px;
  display: flex;
  align-items: center;
}
.brand {
  font-weight: 700;
  color: #fff;
  letter-spacing: .5px;
  cursor: pointer;
}
.spacer { flex: 1; }
</style>

