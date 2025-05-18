<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { ArrowLeft } from "lucide-vue-next"
import InvoiceForm from '@/components/InvoiceForm.vue'

const router = useRouter()

const createInvoiceMutation = useMutation({
  mutationFn: async (newInvoice: any) => {
    const response = await fetch(
      'https://8bktci9d17.execute-api.us-east-1.amazonaws.com/invoices',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newInvoice),
      },
    )

    const responseData = await response.json()

    if (!response.ok) {
      const errorDetail = responseData as {
        errors?: Record<string, string | string[]>
        message?: string
      }
      const apiError = new Error(errorDetail.message || 'API request failed')
      ;(apiError as any).errors = errorDetail.errors
      throw apiError
    }

    return responseData
  },
  onSuccess: (data: any) => {
    console.log('Mutation successful:', data)
    setTimeout(() => {
      router.push('/')
    }, 1000)
  },
  onError: (error: any) => {
    console.error('Mutation failed:', error)
  },
})

const handleFormSubmit = async (formData: any) => {
  console.log('Form submitted with data:', formData)

  try {
    await createInvoiceMutation.mutateAsync(formData)
  } catch (error: any) {
    console.error('Mutation Error caught in handler:', error)
    throw error
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-5 my-2 py-5 bg-white">
      <router-link to="#" @click.prevent="router.back()" class="flex gap-3 my-2 text-black">
        <ArrowLeft color="black" />
        <span class="text-black"> List Invoices </span>
      </router-link>
      <span>/</span>
      <h2>Create New Invoice</h2>
    </div>
    <InvoiceForm :submitHandler="handleFormSubmit" />
  </div>
</template>

<style scoped></style>
