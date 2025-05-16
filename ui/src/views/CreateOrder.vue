<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { DollarSign, Mail, User2 } from "lucide-vue-next"
import { useMutation } from '@tanstack/vue-query'

type InvoicePayload = z.infer<typeof CreateInvoiceSchema>;

// Define the Zod schema for validation - customerId entirely removed
const CreateInvoiceSchema = z.object({
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid', 'overdue'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  name: z.string({ message: 'Please enter a name' }),
  date: z.string(),
})

// Define the form data state
const formData = reactive({
  amount: null as number | null,
  email: '',
  status: '',
  name: '',
  date: new Date().toISOString().split('T')[0]
})

// Define state for validation errors and general message
const errors = reactive<{
  amount?: string[]
  status?: string[]
  email?: string[]
  general?: string[]
  name?: string[]
}>({})
const message = ref<string | null>(null)
const isLoading = ref(false)

const router = useRouter()

const createInvoiceMutation = useMutation({
  mutationFn: async (newInvoice: InvoicePayload) => {
    const response = await fetch('https://8bktci9d17.execute-api.us-east-1.amazonaws.com/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newInvoice),
    });

    const responseData = await response.json();

    if (!response.ok) {
        // Assuming the backend returns errors in a specific format on failure
        // Adjust this based on your dummy backend's actual error structure
        const errorDetail = responseData as { errors?: any, message?: string };
        throw new Error(errorDetail.message || 'Failed to create invoice');
    }

    return responseData;
  },
  onSuccess: (data: any) => {
    message.value = data.message || 'Invoice created successfully!';
    Object.assign(errors, {}); // Clear errors on success
    console.log('Mutation successful:', data);
    setTimeout(() => {
       router.push('/');
    }, 1000);
  },
  onError: (error: any) => {
    console.error('Mutation failed:', error);
    message.value = error.message || 'An unexpected error occurred during creation.';

    // Attempt to parse specific validation errors if returned by the backend
    if (error && error.response && error.response.json) {
         error.response.json().then((errorData: any) => {
             if (errorData.errors) {
                 Object.assign(errors, errorData.errors);
             } else {
                // If no specific field errors, clear previous ones
                Object.assign(errors, {});
             }
         }).catch(() => {
             // Failed to parse error JSON, just show general message
             Object.assign(errors, {});
         });
    } else {
       // If error is not from fetch or doesn't have a response, clear errors
       Object.assign(errors, {});
    }
    isLoading.value = false
  },
});

async function apiCreateInvoice(payload: z.infer<typeof CreateInvoiceSchema>) {
  console.log('Simulating API Call with payload:', payload)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const validationResult = CreateInvoiceSchema.safeParse(payload)

  if (!validationResult.success) {
    console.warn(
      'Simulated Server Validation Failed:',
      validationResult.error.flatten().fieldErrors,
    )
    return {
      success: false,
      errors: validationResult.error.flatten().fieldErrors,
      message: 'Validation failed on the server.',
    }
  }

  const { amount, status, email } = validationResult.data
  const amountInCents = Math.round(amount * 100)
  const date = new Date().toISOString().split('T')[0]

  try {
    console.log('Simulating Database Insert:')
    console.log({
      amount: amountInCents,
      status,
      date,
      email,
    })

    return { success: true, message: 'Invoice created successfully!' }
  } catch (dbError) {
    console.error('Simulated Database Error:', dbError)
    return { success: false, message: 'Database Error: Failed to Create Invoice.' }
  }
}

async function handleSubmit() {
  Object.assign(errors, {})
  message.value = null
  isLoading.value = true

  const clientValidationResult = CreateInvoiceSchema.safeParse(formData)

  if (!clientValidationResult.success) {
    console.warn('Client Validation Failed:', clientValidationResult.error.flatten().fieldErrors)
    Object.assign(errors, clientValidationResult.error.flatten().fieldErrors)
    message.value = 'Please fix the errors below.'
    isLoading.value = false
    return
  }

  createInvoiceMutation.mutate(clientValidationResult.data);

  // try {
  //   const apiResponse = await apiCreateInvoice(clientValidationResult.data)

  //   if (apiResponse.success) {
  //     console.log('Invoice created successfully:', apiResponse.message)
  //     message.value = apiResponse.message || 'Success!'
  //     setTimeout(() => {
  //       router.push('/dashboard/invoices')
  //     }, 1000)
  //   } else {
  //     console.error('API Error:', apiResponse.message)
  //     if (apiResponse.errors) {
  //       Object.assign(errors, apiResponse.errors)
  //     }
  //     message.value = apiResponse.message || 'An unexpected error occurred.'
  //   }
  // } catch (apiCallError) {
  //   console.error('API Call Error:', apiCallError)
  //   message.value = 'Failed to connect to the server. Please try again.'
  // } finally {
  //   isLoading.value = false
  // }
}

// Simple Icon Components
const CurrencyDollarIcon = {
  template:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.879m0 0a3 3 0 114.243 0c1.052 1.052 1.052 2.76 0 3.819-.39.39-.86.72-1.35.978-1.334.67-2.806 1-4.307 1s-2.973-.33-4.307-1c-.49-.258-.96-.588-1.35-.978a3 3 0 010-3.819l.879-.879m0 0A2.25 2.25 0 0112 9.75c1.016 0 1.918.403 2.582 1.067M15 12v3.75m-4.5-6H9.75M9.75 9v3.75M3 6h18" /></svg>',
}
const EnvelopeIcon = {
  template:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>',
}
const ClockIcon = {
  template:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
}
const CheckIcon = {
  template:
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="rounded-md bg-gray-50 p-4 md:p-6 flex flex-col gap-5 space-y-4">

    <div class="mb-4">
        <label htmlFor="name" class="mb-2 block text-sm font-medium"> Customer Name </label>
        <div class="relative mt-2 rounded-md">
          <div class="relative">
            <input
              id="name"
              name="name"
              type="name"
              placeholder="Enter customer name"
              class="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              v-model="formData.name"
              aria-describedby="name-error"
              :class="{ 'border-red-500': errors.name }"
            />
            <User2
              class="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"
            />
          </div>
        </div>

        <div id="name-error" aria-live="polite" aria-atomic="true">
          <p v-if="errors.name" class="mt-2 text-sm text-red-500">
            {{ errors.name[0] }}
          </p>
        </div>
      </div>

      <div class="mb-4">
        <label htmlFor="email" class="mb-2 block text-sm font-medium"> Customer Email </label>
        <div class="relative mt-2 rounded-md">
          <div class="relative">
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter customer email"
              class="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              v-model="formData.email"
              aria-describedby="email-error"
              :class="{ 'border-red-500': errors.email }"
            />
            <Mail
              class="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"
            />
          </div>
        </div>

        <div id="email-error" aria-live="polite" aria-atomic="true">
          <p v-if="errors.email" class="mt-2 text-sm text-red-500">
            {{ errors.email[0] }}
          </p>
        </div>
      </div>

      <div class="mb-4">
        <label htmlFor="amount" class="mb-2 block text-sm font-medium"> Choose an amount </label>
        <div class="relative mt-2 rounded-md">
          <div class="relative">
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              placeholder="Enter USD amount"
              class="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              v-model.number="formData.amount"
              aria-describedby="amount-error"
              :class="{ 'border-red-500': errors.amount }"
            />
            <DollarSign
              class="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900"
            />
          </div>
        </div>

        <div id="amount-error" aria-live="polite" aria-atomic="true">
          <p v-if="errors.amount" class="mt-2 text-sm text-red-500">
            {{ errors.amount[0] }}
          </p>
        </div>
      </div>

      <fieldset>
        <legend class="mb-2 block text-sm font-medium">Set the invoice status</legend>
        <div class="rounded-md border border-gray-200 bg-white px-[14px] py-3">
          <div class="flex gap-4">
            <div class="flex items-center gap-1">
              <input
                id="pending"
                name="status"
                type="radio"
                value="pending"
                class="text-white-600 h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 focus:ring-2"
                v-model="formData.status"
                aria-describedby="status-error"
                :class="{ 'border-red-500': errors.status }"
              />
              <label
                htmlFor="pending"
                class="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
              >
                Pending <ClockIcon class="h-4 w-4" />
              </label>
            </div>
            <div class="flex items-center gap-1">
              <input
                id="paid"
                name="status"
                type="radio"
                value="paid"
                class="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                v-model="formData.status"
                aria-describedby="status-error"
                :class="{ 'border-red-500': errors.status }"
              />
              <label
                htmlFor="paid"
                class="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
              >
                Paid <CheckIcon class="h-4 w-4" />
              </label>
            </div>
            <div class="flex items-center gap-1">
              <input
                id="overdue"
                name="status"
                type="radio"
                value="overdue"
                class="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                v-model="formData.status"
                aria-describedby="status-error"
                :class="{ 'border-red-500': errors.status }"
              />
              <label
                htmlFor="overdue"
                class="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white"
              >
                Overdue <CheckIcon class="h-4 w-4" />
              </label>
            </div>
          </div>
        </div>
        <div id="status-error" aria-live="polite" aria-atomic="true">
          <p v-if="errors.status" class="mt-2 text-sm text-red-500">
            {{ errors.status[0] }}
          </p>
        </div>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        <p v-if="message" class="mt-2 text-sm text-red-500">
          {{ message }}
        </p>
      </div>
    </div>
    <div class="mt-6 flex justify-end gap-4">
      <RouterLink
        to="/dashboard/invoices"
        class="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
      >
        Cancel
      </RouterLink>
      <button
        type="submit"
        class="flex h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Creating...' : 'Create Invoice' }}
      </button>
    </div>
  </form>
</template>

<style scoped></style>
