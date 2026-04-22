import { apiSlice } from './apiSlice'

export const paymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/payments/click/create/
    // Returns { redirect_url: "https://my.click.uz/..." }
    createClickTransaction: builder.mutation({
      query: (courseId) => ({
        url: '/payments/click/create/',
        method: 'POST',
        body: { course_id: courseId },
      }),
    }),
    // POST /api/payments/payme/create/
    // Returns { redirect_url: "https://checkout.paycom.uz/..." }
    createPaymeTransaction: builder.mutation({
      query: (courseId) => ({
        url: '/payments/payme/create/',
        method: 'POST',
        body: { course_id: courseId },
      }),
    }),
  }),
})

export const { useCreateClickTransactionMutation, useCreatePaymeTransactionMutation } = paymentsApi
