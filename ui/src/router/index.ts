import { createRouter, createWebHistory } from 'vue-router'
import HomeView from "../views/ListView.vue"
import CreateOrder from '@/views/CreateInvoice.vue'
import EditInvoice from '@/views/EditInvoice.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/new-order',
      name: 'new-order',
      component: CreateOrder,
    },
        {
      path: '/invoice/:customerId/:invoiceId',
      name: 'edit-invoice',
      component: EditInvoice,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
