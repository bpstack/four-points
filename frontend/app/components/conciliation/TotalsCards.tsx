// app/components/conciliation/TotalsCards.tsx

interface TotalsCardsProps {
  totalReception: number
  totalHousekeeping: number
  difference: number
}

export default function TotalsCards({
  totalReception,
  totalHousekeeping,
  difference,
}: TotalsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Recepcion</div>
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
          {totalReception}
        </div>
      </div>
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Housekeeping</div>
        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
          {totalHousekeeping}
        </div>
      </div>
      <div
        className={`border rounded-lg p-4 ${
          difference === 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div
          className={`text-sm font-medium ${
            difference === 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          Descuadre
        </div>
        <div
          className={`text-2xl font-bold mt-1 ${
            difference === 0
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
          }`}
        >
          {difference}
        </div>
      </div>
    </div>
  )
}
