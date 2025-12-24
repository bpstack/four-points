// app/dashboard/scheduling/config/page.tsx

import { SchedulingConfigClient } from '@/app/components/scheduling/SchedulingConfigClient'

export const metadata = {
  title: 'Configuracion de Horarios | Four Points',
  description: 'Configuracion del sistema de planificacion de horarios',
}

export default function SchedulingConfigPage() {
  return <SchedulingConfigClient />
}
