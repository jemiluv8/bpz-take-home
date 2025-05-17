<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { z } from 'zod';
import { DollarSign, Mail, User2 } from "lucide-vue-next";

const props = defineProps<{
  initialValues?: Record<string, any>;
  submitHandler: (data: z.infer<typeof CreateInvoiceSchema>) => Promise<void> | void;
}>();

const CreateInvoiceSchema = z.object({
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid', 'overdue'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  name: z.string({ message: 'Please enter a name' }),
  date: z.string(),
})

const formData = reactive({
  amount: null as number | null,
  email: '',
  status: '',
  name: '',
  date: new Date().toISOString().split('T')[0]
})

const editing = computed(() => Object.keys(props.initialValues || {}).length > 0)

watch(() => props.initialValues, (newValues) => {
    if (newValues) {
        Object.assign(formData, newValues);
    }
}, { immediate: true });

const errors = reactive<{
  amount?: string[]
  status?: string[]
  email?: string[]
  general?: string[]
  name?: string[]
}>({})
const message = ref<string | null>(null)
const isLoading = ref(false)

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

  try {
    await Promise.resolve(props.submitHandler(clientValidationResult.data));

  } catch (error: any) {
    console.error('Submission handler failed:', error);

    message.value = error.message || 'An unexpected error occurred during submission.';

    if (error && typeof error === 'object' && error.errors) {
        Object.assign(errors, error.errors);
    }
  } finally {
    isLoading.value = false
  }
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
              type="text"
              placeholder="Enter customer name"
              class="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              v-model="formData.name"
              aria-describedby="name-error"
              :class="{ 'border-red-500': errors.name }"
              :readonly="editing"
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
              :readonly="editing"
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
        {{ isLoading ? 'Submitting...' : 'Submit Invoice' }}
      </button>
    </div>
  </form>
</template>

<style scoped></style>