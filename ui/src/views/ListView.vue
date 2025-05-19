<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'
import Spinner from '@/components/Spinner.vue'
import type { UseMutationOptions } from '@tanstack/vue-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Edit, RefreshCcw, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUrlSearchParams, useConfirmDialog } from '@vueuse/core'
import { API_URL } from '@/utils'

const itemsPerPage = 20

// assumes currency in lowers possible denomication - hence division by 100
const formatCurrency = (amount: number) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

const lastKeys: any[] = []

const route = useRoute()
const router = useRouter()
const urlParams = useUrlSearchParams('history')
const lastEvaluatedKey = computed({
  get: () => route.query.lastEvaluatedKey || undefined,
  set: (newKey: string) => {
    urlParams.lastEvaluatedKey = newKey
  },
})
const status = computed({
  get: () => route.query.status || undefined,
  set: (newKey: string) => {
    urlParams.status = newKey
  },
})
const pathname = computed(() => route.path)

const makeQueryString = (extraParams: Record<string, any>) => {
  const currentParams: Record<string, any> = {
    pageSize: itemsPerPage,
    ...urlParams,
    ...extraParams,
  }

  const params = new URLSearchParams(currentParams)
  return params.toString()
}

const createPageURL = (extraParams: Record<string, any>) => {
  return `${pathname.value}?${makeQueryString(extraParams)}`
}
const awsApiUrl = computed(() => {
  return `${API_URL}?${makeQueryString(route.query)}`
})

const queryKey: any[] = ['invoices', { lastEvaluatedKey, status }]

const { isLoading, isError, data, error, refetch } = useQuery({
  staleTime: 5 * 60 * 1000,
  queryKey,
  queryFn: () => fetch(awsApiUrl.value).then((response) => response.json()),
})

if (data && data.value && data.value.lastEvaluatedKey) {
  lastKeys.push(data.value.lastEvaluatedKey)
}

console.log('data.value', queryKey)

const formatDateToLocal = (dateStr: string, locale: string = 'en-US') => {
  const date = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  const formatter = new Intl.DateTimeFormat(locale, options)
  return formatter.format(date)
}

const loadMore = () => {
  const { lastEvaluatedKey } = data.value || {}
  if (lastEvaluatedKey) {
    router.push(createPageURL({ lastEvaluatedKey: data.value.lastEvaluatedKey }))
  } else {
    alert('No more data to load')
  }
}

async function deleteItemApi(invoiceIdentifier: string): Promise<DeleteSuccessResponse> {
  const deleteEndpoint = `${API_URL}/${invoiceIdentifier}`
  const response = await fetch(deleteEndpoint, { method: 'DELETE' })
  const jsonResponse = await response.json()
  return { success: true, deletedId: invoiceIdentifier, ...jsonResponse }
}

const queryClient = useQueryClient()
interface DeleteSuccessResponse {
  success: boolean
  deletedId: string
}

interface DeleteErrorResponse {
  message: string
}

const mutationOptions: UseMutationOptions<DeleteSuccessResponse, DeleteErrorResponse, string> = {
  onSuccess: (data) => {
    console.log('Mutation successful!', data)
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
  },

  onError: (error) => {
    console.error('Mutation failed!', error)
  },

  onSettled: (data, error) => {
    console.log('Mutation settled (success or failure)', data, error)
  },
}

const {
  isPending: isDeleting,
  mutate: deleteItem,
  isError: deletionError,
  isSuccess: deletionSuccess,
  error: deleteError, // This is now typed as Ref<DeleteErrorResponse | null>
  data: deleteResponse, // This is now typed as Ref<DeleteSuccessResponse | undefined>
} = useMutation<DeleteSuccessResponse, DeleteErrorResponse, string>({
  mutationFn: deleteItemApi,
  ...mutationOptions,
})

const { isRevealed, reveal, confirm, cancel } = useConfirmDialog()

async function handleDelete(row: any) {
  const { isCanceled } = await reveal()
  if (!isCanceled) {
    console.log('Row Identifier', `${row.CustomerID}/${row.INVOICE_ID}`)
    const safeCustomerId = encodeURIComponent(row.CustomerID)
    const safeInvoiceId = encodeURIComponent(row.INVOICE_ID)
    // const safeUrl = encodeURIComponent(`${row.CustomerID}/${row.INVOICE_ID}`)
    deleteItem(`${safeCustomerId}/${safeInvoiceId}`)
  }
}

console.log({
  deletionError,
  deletionSuccess,
  deleteError,
  deleteResponse,
})

const loadLess = () => {
  // FIX ME - last keys are not persisted accross page reloads. Do better
  if (lastKeys.length > 1) {
    lastKeys.pop()
    const prev = lastKeys.pop()
    router.push(createPageURL({ lastEvaluatedKey: prev }))
  }
}

const statusChangedHandler = (ev: Event) => {
  const selectElement = ev.target as HTMLSelectElement;
  const selectedValue = selectElement.value;
  status.value = selectedValue
  router.push(createPageURL({ status: selectedValue }))
}

console.log('lastKeys', lastKeys)

const invoices = computed(() => (data ? data.value.data : []))
</script>

<template>
  <main class="mt-12 h-full">
    <section class="flex justify-between items-center align-middle mb-6 py-6">
      <div class="mb-4">
        <label htmlFor="status-filter" class="mb-2 block text-sm font-medium">
          Status
        </label>
        <div>
          <select
            id="status-filter"
            name="status-filter"
            :value="status"
            @change="statusChangedHandler"
            class="block w-fit rounded-md border border-gray-200 py-2 px-3 text-sm outline-2 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
      <button
        @click="$router.push('/new-order')"
        class="flex h-10 items-center rounded-lg bg-blue-600 transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <h1 class="text-white font-medium px-6">Create Order</h1>
      </button>
    </section>
    <h1 class="text-align-right float-right" v-if="isDeleting">Deleting invoice ...</h1>
    <Spinner v-show="isLoading">Loading</Spinner>
    <table v-if="!isLoading && !isError" class="hidden min-w-full text-gray-900 md:table mt-6">
      <thead class="rounded-lg text-left text-sm font-normal bg-gray-300">
        <tr>
          <th scope="col" class="px-4 py-5 font-bold sm:pl-6">#InvoiceID</th>
          <th scope="col" class="px-4 py-5 font-bold sm:pl-6">Customer</th>
          <th scope="col" class="px-3 py-5 font-bold">Email</th>
          <th scope="col" class="px-3 py-5 font-bold">Amount</th>
          <th scope="col" class="px-3 py-5 font-bold">Date</th>
          <th scope="col" class="px-3 py-5 font-bold">Status</th>
          <th scope="col" class="relative py-3 pl-6 pr-3">Actions</th>
        </tr>
      </thead>

      <tbody class="bg-white border-b">
        <tr
          v-for="invoice of invoices"
          :key="invoice.customer_id"
          class="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
        >
          <td class="whitespace-nowrap py-3 pl-6 pr-3">
            <div class="flex items-center gap-3">
              <p>{{ invoice.invoiceId }}</p>
            </div>
          </td>
          <td class="whitespace-nowrap py-3 pl-6 pr-3">
            <div class="flex items-center gap-3">
              <p>{{ invoice.name || invoice.customerName }}</p>
            </div>
          </td>
          <td class="whitespace-nowrap px-3 py-3">{{ invoice.email || invoice.customerEmail }}</td>
          <td class="whitespace-nowrap px-3 py-3">
            {{ formatCurrency(invoice.amount) }}
          </td>
          <td class="whitespace-nowrap px-3 py-3">{{ formatDateToLocal(invoice.date) }}</td>
          <td class="whitespace-nowrap px-3 py-3">
            {{ invoice.status }}
          </td>
          <td>
            <span class="flex flex-grow h-full items-center justify-center align-middle gap-2">
              <router-link
                :to="{
                  name: 'edit-invoice',
                  params: { customerId: invoice.CustomerID, invoiceId: invoice.INVOICE_ID },
                }"
              >
                <Edit :size="20" class="text-blue-500" />
                <!-- Edit -->
              </router-link>
              <span @click="() => handleDelete(invoice)">
                <Trash2 :size="20" class="text-red-500" />
                <!-- Delete -->
              </span>
            </span>
          </td>
        </tr>
      </tbody>

      <tfoot class="pt-5 block w-full">
        <Pagination
          :has-prev="lastKeys.length > 0"
          @prev="loadLess"
          @next="loadMore"
          :has-more-data="!!data.lastEvaluatedKey"
        />
      </tfoot>
    </table>
    <div class="flex flex-col justify-center align-middle items-center" v-else-if="isError">
      <p v-if="error && error.message">{{ error.message }}</p>
      <h3 class="text-lg">There was an error loading data</h3>
      <br />
      <button
        class="flex p-2 px-3 rounded-lg text-white bg-blue-600 hover:bg-blue-500 items-center"
        @click="() => refetch()"
      >
        <RefreshCcw :size="15" />
        Try again
      </button>
    </div>
    <teleport to="body">
      <div
        v-if="isRevealed"
        class="fixed inset-0 bg-transparent bg-opacity-0 flex items-center justify-center z-50 shadow-lg"
      >
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
          <h2 class="text-xl font-semibold mb-4">Confirm Action</h2>

          <p class="mb-6">Are you sure you want to delete this row?</p>

          <div class="flex justify-end space-x-4 gap-4">
            <button
              @click="cancel()"
              class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirm(true)"
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </main>
</template>
