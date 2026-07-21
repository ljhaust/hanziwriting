import { createRouter, createWebHistory } from 'vue-router';
import AdminDashboard from '../modules/admin/AdminDashboard.vue';

/**
 * 前端页面路由。
 *
 * 业务意图：Vue 工程只承载管理后台；学生端由独立的原生微信小程序承载，
 * 因而根路径和未知地址均统一进入管理后台。
 *
 * @type {Array<object>} Vue Router 使用的管理端路由定义。
 */
export const routeDefinitions = [
  {
    path: '/',
    redirect: '/admin',
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard,
    meta: { title: '管理后台' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/admin',
  },
];

/**
 * Vue Router 实例。
 *
 * 输入是浏览器地址栏路径，输出是管理端页面组件。
 *
 * @type {import('vue-router').Router} 管理端路由实例。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: routeDefinitions,
});

/**
 * 根据当前路由给 body 标记管理端页面类型。
 *
 * @param {import('vue-router').RouteLocationNormalized} to 已完成导航的目标路由。
 * @returns {void} 此钩子只更新 body class，不返回业务数据。
 */
router.afterEach((to) => {
  document.body.classList.remove('admin-page');
  if (to.name) {
    document.body.classList.add(`${String(to.name)}-page`);
  }
});
