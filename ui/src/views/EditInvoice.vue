<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { RefreshCcw } from 'lucide-vue-next'
import { computed } from 'vue'
import InvoiceForm from '@/components/InvoiceForm.vue'
import Spinner from '@/components/Spinner.vue';

interface InvoiceItem {
  id: number
  description: string
  quantity: number
  price: number
}

interface InvoiceData {
  invoiceId: string
  customerId: string
  amount: number
  date: string
  items: InvoiceItem[]
}

const route = useRoute()
const router = useRouter();
const queryClient = useQueryClient();

const customerId = route.params.customerId as string
const invoiceId = route.params.invoiceId as string

// Construct the hypothetical URL
const rootUrl = "https://8bktci9d17.execute-api.us-east-1.amazonaws.com/invoices"
const invoiceUrl = computed(() => `${rootUrl}/${customerId}/${invoiceId}`)

const updateInvoiceMutation = useMutation({
  mutationFn: async (updateFields: any) => {
    const response = await fetch(invoiceUrl.value, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateFields),
    });

    const responseData = await response.json();

    if (!response.ok) {
        const errorDetail = responseData as { errors?: Record<string, string | string[]>, message?: string };
        const apiError = new Error(errorDetail.message || 'API request failed');
        (apiError as any).errors = errorDetail.errors;
        throw apiError;
    }

    return responseData;
  },
  onSuccess: (data: any) => {
    console.log('Mutation successful:', data);
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    setTimeout(() => { router.push('/') }, 1000);
  },
  onError: (error: any) => {
    console.error('Mutation failed:', error);
  },
});

const { data, isLoading, isError, error, refetch } = useQuery<InvoiceData, Error>({
  queryKey: ['invoice', customerId, invoiceId],
  queryFn: async () => {
    const response = await fetch(invoiceUrl.value);
    if (!response.ok) {
      const errorBody = await response.json(); // Optionally parse error body
      throw new Error(`Server error!: ${errorBody.message || response.statusText}`);
    }
    return response.json();
  },
  enabled: !!customerId && !!invoiceId, // Only run the query if both IDs are present
})

console.log("data", data)

const handleFormSubmit = async (formData: any) => {
  console.log('Form submitted with data:', formData);

   try {
        await updateInvoiceMutation.mutateAsync(formData);
   } catch (error: any) {
       console.error('Mutation Error caught in handler:', error);
       throw error;
   }
};
</script>

<template>
  <div class="mt-5">
    <Spinner v-if="isLoading">Loading...</Spinner>
    <div v-else-if="isError" class="flex flex-col justify-center align-middle items-center">
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

    <div v-else-if="data" class="m-5">
      <h2>Edit Invoice #{{ data.invoiceId }}</h2>
      <!-- <pre>{{ JSON.stringify(data, null, 2) }}</pre> -->
     <InvoiceForm
        :submitHandler="handleFormSubmit"
        :initial-values="data"
        />
    </div>

    <div v-else>No data loaded. Please check route parameters.</div>
  </div>
</template>

<style scoped>
/* Add or ensure Tailwind CSS classes are available in your project */
/* The styles for flex, padding, colors, etc., are assumed from Tailwind */

pre {
  background-color: #f4f4f4;
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
}
</style>
