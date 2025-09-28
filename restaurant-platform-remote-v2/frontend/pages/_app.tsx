import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { LanguageProvider } from '../src/contexts/LanguageContext'
import { AuthProvider } from '../src/contexts/AuthContext'
import { LicenseProvider } from '../src/contexts/LicenseContext'
import envValidation from '../src/shared/config/env-validation'
import '../styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LicenseProvider>
          <LanguageProvider>
            <Component {...pageProps} />
            <Toaster position="top-right" />
            <ReactQueryDevtools initialIsOpen={false} />
          </LanguageProvider>
        </LicenseProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}