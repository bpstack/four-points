// app/dashboard/profile/notifications/page.tsx

import NotificationsHeader from '@/app/components/notifications/header/NotificationsHeader'
import NotificationsList from '@/app/components/notifications/lists/NotificationsList'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-[#010409] dark:text-gray-300">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <NotificationsHeader />
        <NotificationsList />
      </div>
    </div>
  )
}
