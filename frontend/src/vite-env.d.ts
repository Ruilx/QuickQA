/// <reference types="vite/client" />
declare module 'ant-design-vue/es/locale/zh_CN' {
  const zhCN: any
  export default zhCN
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
