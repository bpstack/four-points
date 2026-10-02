// app/lib/helpers/pagination.ts

interface Page<T> {
  items: T[]
  totalPages: number
}

// Requests page 1, 2, ... until the last one and joins the items
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<Page<T>>
): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const result = await fetchPage(page)
    items.push(...result.items)
    if (page >= result.totalPages || result.items.length === 0) return items
  }
}
