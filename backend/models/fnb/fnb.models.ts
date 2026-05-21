export type FnbGroupType = 'breakfast' | 'lunch' | 'dinner'

export interface FnbCategory {
  code: string
  name: string
  group_type: FnbGroupType
  display_order: number
}

export interface FnbDailyRevenue {
  id: number
  date: string // YYYY-MM-DD
  category_code: string
  amount: number
  created_at: string
  updated_at: string
}

export interface FnbDayEntry {
  date: string
  categories: {
    code: string
    name: string
    group_type: FnbGroupType
    amount: number
  }[]
  totals: FnbTotals
}

export interface FnbTotals {
  breakfast: number
  lunch: number
  dinner: number
  la_caseta: number
  fnb_total: number
}

export interface FnbUploadResult {
  date: string
  updated: { code: string; name: string; amount: number }[]
  totals: FnbTotals
}

export interface FnbMonthlyRow {
  date: string
  breakfast_included: number
  breakfast_excluded: number
  breakfast_directo: number
  lunch_food: number
  lunch_bev: number
  dinner_food: number
  dinner_bev: number
  breakfast_total: number
  lunch_total: number
  dinner_total: number
  la_caseta_total: number
  fnb_total: number
}
