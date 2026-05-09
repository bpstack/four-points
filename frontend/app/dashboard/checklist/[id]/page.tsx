import { notFound } from 'next/navigation'
import { getChecklistById } from '@/app/lib/checklist/loader'
import { ChecklistGuideContent } from '@/app/components/checklist/ChecklistGuideContent'
import { ChecklistReferenceContent } from '@/app/components/checklist/ChecklistReferenceContent'
import { ChecklistTasksContent } from '@/app/components/checklist/ChecklistTasksContent'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChecklistDetailPage({ params }: Props) {
  const { id } = await params
  const item = getChecklistById(id)
  if (!item) notFound()

  if (item.type === 'guide') return <ChecklistGuideContent item={item} />
  if (item.type === 'reference') return <ChecklistReferenceContent item={item} />
  return <ChecklistTasksContent item={item} />
}
