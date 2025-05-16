<script setup lang="ts">
import Pagination from '@/components/Pagination.vue';
import Spinner from '@/components/Spinner.vue';
import { useQuery } from '@tanstack/vue-query';
import { useUrlSearchParams } from '@vueuse/core';
import { RefreshCcw } from 'lucide-vue-next'
import { computed } from "vue";
import { useRoute, useRouter } from 'vue-router';

const itemsPerPage = 20

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
const pathname = computed(() => route.path)

const makeQueryString = (extraParams: Record<string, any>) => {
  const currentParams: Record<string, any> = { pageSize: itemsPerPage, ...urlParams, ...extraParams }

  const params = new URLSearchParams(currentParams)
  return params.toString()
}

const createPageURL = (extraParams: Record<string, any>) => {
  return `${pathname.value}?${makeQueryString(extraParams)}`
}
const rootUrl = "https://8bktci9d17.execute-api.us-east-1.amazonaws.com/invoices"
// const mockApiUrl = `http://0.0.0.0:9909/invoices?page=${currentPage.value}&pageSize=${itemsPerPage}`
const awsApiUrl = computed(() => {
  console.log("route", route.query)
  return `${rootUrl}?${makeQueryString(route.query)}`
})

console.log({
  awsApiUrl,
  lastEvaluatedKey: route.query.lastEvaluatedKey
})

const { isLoading, isFetching, isError, data, error, refetch } = useQuery({
  staleTime: 5 * 60 * 1000,
  queryKey: ['invoices', { lastEvaluatedKey }],
  queryFn: () => fetch(awsApiUrl.value).then(response => response.json()),
})

if (data && data.value && data.value.lastEvaluatedKey) {
  lastKeys.push(data.value.lastEvaluatedKey)
}

const formatDateToLocal = (
  dateStr: string,
  locale: string = 'en-US',
) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

const loadMore = () => {
  const { lastEvaluatedKey } = data.value || {}
  if (lastEvaluatedKey) {
    router.push(createPageURL({ lastEvaluatedKey: data.value.lastEvaluatedKey }))
  } else {
    alert("No more data to load")
  }
}

const loadLess = () => {
  // FIX ME - last keys are not persisted accross page reloads. Do better
  if (lastKeys.length > 1) {
    lastKeys.pop()
    const prev = lastKeys.pop()
    router.push(createPageURL({ lastEvaluatedKey: prev }))
  }
}

console.log("lastKeys", lastKeys)

const invoices = computed(() => data ? data.value.data : [])
</script>

<template>
  <main class="mt-12 h-full">
    <section class="flex justify-between mb-6 py-6">
      <h3 class="text-lg">Orders</h3>
      <button @click="$router.push('/new-order')" class="flex h-10 items-center rounded-lg bg-blue-600 transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <h1 class="text-white font-medium px-6">Create Order</h1>
      </button>
    </section>
    <Spinner v-if="isLoading || isFetching">Loading</Spinner>
    <table v-else-if="!isError" className="hidden min-w-full text-gray-900 md:table mt-6">
      <thead className="rounded-lg text-left text-sm font-normal bg-gray-300">
        <tr>
          <th scope="col" className="px-4 py-5 font-bold sm:pl-6">#InvoiceID</th>
          <th scope="col" className="px-4 py-5 font-bold sm:pl-6">Customer</th>
          <th scope="col" className="px-3 py-5 font-bold">Email</th>
          <th scope="col" className="px-3 py-5 font-bold">Amount</th>
          <th scope="col" className="px-3 py-5 font-bold">Date</th>
          <th scope="col" className="px-3 py-5 font-bold">Status</th>
          <th scope="col" className="relative py-3 pl-6 pr-3">
            <span className="sr-only">Edit</span>
          </th>
        </tr>
      </thead>

      <tbody className="bg-white border-b">
        <tr
          v-for="invoice of invoices"
          :key="invoice.customer_id"
          className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
        >
          <td className="whitespace-nowrap py-3 pl-6 pr-3">
            <div className="flex items-center gap-3">
              <p>{{invoice.invoiceId}}</p>
            </div>
          </td>
          <td className="whitespace-nowrap py-3 pl-6 pr-3">
            <div className="flex items-center gap-3">
              <p>{{invoice.name || invoice.customerName}}</p>
            </div>
          </td>
          <td className="whitespace-nowrap px-3 py-3">{{invoice.email || invoice.customerEmail}}</td>
          <td className="whitespace-nowrap px-3 py-3">
            {{ formatCurrency(invoice.amount) }}
          </td>
          <td className="whitespace-nowrap px-3 py-3">{{formatDateToLocal(invoice.date)}}</td>
          <td className="whitespace-nowrap px-3 py-3">
            {{invoice.status}}
          </td>
          <td className="whitespace-nowrap py-3 pl-6 pr-3">

          </td>
        </tr>
      </tbody>

      <tfoot class="pt-5 block w-full">
        <Pagination :has-prev="lastKeys.length > 0" @prev="loadLess" @next="loadMore" :has-more-data="!!data.lastEvaluatedKey" />
      </tfoot>
    </table>
    <div class="flex flex-col justify-center align-middle items-center" v-else>
      <p v-if="error && error.message">{{ error.message }}</p>
      <h3 class="text-lg">There was an error loading data</h3> <br />
      <button class="flex p-2 px-3 rounded-lg text-white bg-blue-600 hover:bg-blue-500 items-center" @click="() => refetch()">
        <RefreshCcw :size="15" />
        Try again
      </button>
    </div>
  </main>
</template>
