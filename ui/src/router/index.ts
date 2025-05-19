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
  ],
})

export default router
