<script setup lang="ts">
import Pagination from '@/components/Pagination.vue';
import Spinner from '@/components/Spinner.vue';
import { useQuery } from '@tanstack/vue-query';
import { RefreshCcw } from 'lucide-vue-next'

const invoices = [
  {
    customer_id: 1,
    amount: 15795,
    status: 'pending',
    date: '2022-12-06',
    name: 'Fred Stone',
    email: "fred@stone.com"
  },
  {
    customer_id: 2,
    amount: 20348,
    status: 'pending',
    date: '2022-11-14',
    name: 'Jenny Logan',
    email: "jenny@logam.com"
  },
  {
    customer_id: 3,
    amount: 3040,
    status: 'paid',
    date: '2022-10-29',
    name: 'Disney Walt',
    email: 'walt@disney.com'
  },
  {
    customer_id: 4,
    amount: 44800,
    status: 'paid',
    date: '2023-09-10',
    name: 'Cindy Sharon',
    email: 'cindy@sharon.com'
  },
  {
    customer_id: 5,
    amount: 34577,
    status: 'pending',
    date: '2023-08-05',
    name: 'Fred Stone',
    email: 'cindy@sharon.com'
  },
  {
    customer_id: 6,
    amount: 54246,
    status: 'pending',
    date: '2023-07-16',
    name: 'Fred Stone',
    email: 'cindy@sharon.com'
  },
  {
    customer_id: 7,
    amount: 666,
    status: 'pending',
    date: '2023-06-27',
    name: 'Fred Stone',
    email: 'cindy@sharon.com'
  },
  {
    customer_id: 8,
    amount: 32545,
    status: 'paid',
    date: '2023-06-09',
    name: 'Fred Stone',
    email: 'cindy@sharon.com'
  },
  {
    customer_id: 9,
    amount: 1250,
    status: 'paid',
    date: '2023-06-17',
    name: 'Fred Stone',
    email: 'cindy@sharon.com'
  },
]
const formatCurrency = (amount: number) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

const { isLoading, isFetching, isError, data, error, refetch } = useQuery({
  queryKey: ['todos'],
  queryFn: () => fetch("https://dummyjson.com/product?limit=10").then(response => response.json()),
})

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
              <p>{{invoice.name}}</p>
            </div>
          </td>
          <td className="whitespace-nowrap px-3 py-3">{{invoice.email}}</td>
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
        <Pagination :total-pages="100" />
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
