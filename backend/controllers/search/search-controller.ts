// controllers/search/search-controller.ts
/**
 * Global Search Controller
 */

import { Request, Response } from 'express'
import { globalSearch } from '../../repositories/search/search-repository.js'

/**
 * GET /api/search?q=query
 * Global search across parking, maintenance, groups, blacklist
 */
export async function search(req: Request, res: Response) {
  try {
    const query = req.query.q as string

    // Validate query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required',
      })
    }

    // Minimum 2 characters
    if (query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters',
      })
    }

    // Perform search
    const results = await globalSearch(query.trim())

    // Count total results
    const totalResults =
      results.parking.length +
      results.maintenance.length +
      results.groups.length +
      results.blacklist.length

    return res.json({
      success: true,
      query: query.trim(),
      totalResults,
      results,
    })
  } catch (error) {
    console.error('[Search] Error:', error)
    return res.status(500).json({
      success: false,
      message: 'Error performing search',
    })
  }
}

export default {
  search,
}
