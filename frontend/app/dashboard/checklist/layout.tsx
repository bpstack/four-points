import { getCatalog } from '@/app/lib/checklist/loader'
import ChecklistClientWrapper from './ChecklistClientWrapper'

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  const catalog = getCatalog()

  return <ChecklistClientWrapper catalog={catalog}>{children}</ChecklistClientWrapper>
}
