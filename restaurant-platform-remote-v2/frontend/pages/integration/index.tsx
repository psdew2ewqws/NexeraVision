import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function IntegrationIndex() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/integration/dashboard')
  }, [router])

  return null
}
