import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import { router } from './router';
import './styles.css';

/**
 * 创建 Vue 应用根实例。
 *
 * 输入是 index.html 中的 #app 容器，输出是挂载后的 Vue 组件树。
 */
createApp(App).use(ElementPlus).use(router).mount('#app');
