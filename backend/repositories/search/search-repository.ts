// repositories/search/search-repository.ts
/**
 * Global Search Repository
 * Searches across multiple modules: parking, maintenance, groups, blacklist
 */

import db from '../../config/db.js'
import type { RowDataPacket } from 'mysql2'
import { type SearchModule } from '../../services/search/search-access.js'
import { likeContains } from '../shared/like.js'

// ========================================
// TYPES
// ========================================

export interface SearchResult {
  parking: ParkingSearchResult[]
  maintenance: MaintenanceSearchResult[]
  groups: GroupSearchResult[]
  blacklist: BlacklistSearchResult[]
}

export interface ParkingSearchResult {
  id: number
  booking_code: string
  plate_number: string | null
  owner_name: string | null
  status: string
  expected_checkin: string
  expected_checkout: string
}

export interface MaintenanceSearchResult {
  id: string
  title: string
  room_number: string | null
  location_description: string
  status: string
  priority: string
}

export interface GroupSearchResult {
  id: number
  name: string
  agency: string | null
  arrival_date: string
  departure_date: string
  status: string
}

export interface BlacklistSearchResult {
  id: number
  guest_name: string
  document_number: string
  severity: string
  status: string
}

// ========================================
// ROW TYPES
// ========================================

interface ParkingRow extends RowDataPacket {
  id: number
  booking_code: string
  plate_number: string | null
  owner_name: string | null
  status: string
  expected_checkin: string
  expected_checkout: string
}

interface MaintenanceRow extends RowDataPacket {
  id: string
  title: string
  room_number: string | null
  location_description: string
  status: string
  priority: string
}

interface GroupRow extends RowDataPacket {
  id: number
  name: string
  agency: string | null
  arrival_date: string
  departure_date: string
  status: string
}

interface BlacklistRow extends RowDataPacket {
  id: number
  guest_name: string
  document_number: string
  severity: string
  status: string
}

// ========================================
// SEARCH FUNCTIONS
// ========================================

const LIMIT = 10

/**
 * Search parking bookings by code or plate
 */
async function searchParking(query: string): Promise<ParkingSearchResult[]> {
  const searchPattern = likeContains(query)

  const [rows] = await db.query<ParkingRow[]>(
    `SELECT 
      pb.id,
      pb.booking_code,
      pv.plate_number,
      pv.owner_name,
      pb.status,
      pb.expected_checkin,
      pb.expected_checkout
    FROM parking_bookings pb
    LEFT JOIN parking_vehicles pv ON pb.vehicle_id = pv.id
    WHERE pb.booking_code LIKE ?
      OR pv.plate_number LIKE ?
      OR pv.owner_name LIKE ?
    ORDER BY pb.created_at DESC
    LIMIT ?`,
    [searchPattern, searchPattern, searchPattern, LIMIT]
  )

  return rows.map((row) => ({
    id: row.id,
    booking_code: row.booking_code,
    plate_number: row.plate_number,
    owner_name: row.owner_name,
    status: row.status,
    expected_checkin: row.expected_checkin,
    expected_checkout: row.expected_checkout,
  }))
}

/**
 * Search maintenance reports by ID, title, or room number
 */
async function searchMaintenance(query: string): Promise<MaintenanceSearchResult[]> {
  const searchPattern = likeContains(query)

  const [rows] = await db.query<MaintenanceRow[]>(
    `SELECT 
      id,
      title,
      room_number,
      location_description,
      status,
      priority
    FROM maintenance_reports
    WHERE is_deleted = FALSE
      AND (
        id LIKE ?
        OR title LIKE ?
        OR room_number LIKE ?
        OR location_description LIKE ?
      )
    ORDER BY created_at DESC
    LIMIT ?`,
    [searchPattern, searchPattern, searchPattern, searchPattern, LIMIT]
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    room_number: row.room_number,
    location_description: row.location_description,
    status: row.status,
    priority: row.priority,
  }))
}

/**
 * Search groups by name or agency
 */
async function searchGroups(query: string): Promise<GroupSearchResult[]> {
  const searchPattern = likeContains(query)

  const [rows] = await db.query<GroupRow[]>(
    `SELECT 
      id,
      name,
      agency,
      arrival_date,
      departure_date,
      status
    FROM hotel_groups
    WHERE name LIKE ?
       OR agency LIKE ?
    ORDER BY created_at DESC
    LIMIT ?`,
    [searchPattern, searchPattern, LIMIT]
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    agency: row.agency,
    arrival_date: row.arrival_date,
    departure_date: row.departure_date,
    status: row.status,
  }))
}

/**
 * Search blacklist by name or document
 */
async function searchBlacklist(query: string): Promise<BlacklistSearchResult[]> {
  const searchPattern = likeContains(query)

  const [rows] = await db.query<BlacklistRow[]>(
    `SELECT 
      id,
      guest_name,
      document_number,
      severity,
      status
    FROM blacklist_entries
    WHERE status = 'ACTIVE'
      AND (
        guest_name LIKE ?
        OR document_number LIKE ?
      )
    ORDER BY created_at DESC
    LIMIT ?`,
    [searchPattern, searchPattern, LIMIT]
  )

  return rows.map((row) => ({
    id: row.id,
    guest_name: row.guest_name,
    document_number: row.document_number,
    severity: row.severity,
    status: row.status,
  }))
}

/**
 * Global search across the modules the caller may read
 * Executes the allowed searches in parallel; the others return no rows
 */
export async function globalSearch(
  query: string,
  modules: ReadonlySet<SearchModule>
): Promise<SearchResult> {
  const none = Promise.resolve([])
  const [parking, maintenance, groups, blacklist] = await Promise.all([
    modules.has('parking') ? searchParking(query) : none,
    modules.has('maintenance') ? searchMaintenance(query) : none,
    modules.has('groups') ? searchGroups(query) : none,
    modules.has('blacklist') ? searchBlacklist(query) : none,
  ])

  return {
    parking,
    maintenance,
    groups,
    blacklist,
  }
}

export default {
  globalSearch,
}
