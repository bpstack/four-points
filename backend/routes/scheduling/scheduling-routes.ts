// routes/scheduling/scheduling-routes.ts

import express, { Router } from 'express'

// Controllers
import {
  // Config
  getAllConfig,
  getConfigMap,
  updateConfig,
  // Shifts
  getAllShifts,
  // Months
  getAllMonths,
  getMonthById,
  createMonth,
  updateMonth,
  deleteMonth,
  // Days
  updateDay,
  // Assignments
  updateAssignment,
  bulkUpdateAssignments,
  // Constraints
  getConstraintsByMonth,
  createConstraint,
  updateConstraint,
  approveConstraint,
  deleteConstraint,
  // Employee Rules
  getAllEmployeeRules,
  getEmployeeRulesByEmployee,
  createEmployeeRule,
  updateEmployeeRule,
  deleteEmployeeRule,
  // History
  getHistory,
  // Generation
  generateSchedule,
  validateSchedule,
  unpublishMonth,
  // Schedulable Employees
  getSchedulableEmployees,
  getAllEmployeesWithStatus,
  addSchedulableEmployee,
  removeSchedulableEmployee,
  setSchedulableEmployees,
} from '../../controllers/scheduling/scheduling-controller.js'

// Middlewares
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin, excludeMantenimiento } from '../../middlewares/roleCheck.js'

const router: Router = express.Router()

// ========================================
// APPLY MIDDLEWARE TO ALL ROUTES
// - authenticateToken: verify JWT
// - excludeMantenimiento: block maintenance role
// ========================================
router.use(authenticateToken)
router.use(excludeMantenimiento)

// ========================================
// CONFIG ROUTES
// ========================================

// GET - Get all config
router.get('/config', getAllConfig)

// GET - Get config as map
router.get('/config/map', getConfigMap)

// PUT - Update config (admin only)
router.put('/config/:key', isAdmin, updateConfig)

// ========================================
// SHIFTS ROUTES
// ========================================

// GET - Get all shifts
router.get('/shifts', getAllShifts)

// ========================================
// MONTHS ROUTES
// ========================================

// GET - Get all months
router.get('/months', getAllMonths)

// POST - Create month (admin only)
router.post('/months', isAdmin, createMonth)

// GET - Get month by ID (full data)
router.get('/months/:id', getMonthById)

// PUT - Update month (admin only)
router.put('/months/:id', isAdmin, updateMonth)

// DELETE - Delete month (admin only)
router.delete('/months/:id', isAdmin, deleteMonth)

// ========================================
// GENERATION ROUTES
// ========================================

// POST - Generate schedule (admin only)
router.post('/months/:id/generate', isAdmin, generateSchedule)

// POST - Validate schedule
router.post('/months/:id/validate', validateSchedule)

// POST - Unpublish month (revert to generated) (admin only)
router.post('/months/:id/unpublish', isAdmin, unpublishMonth)

// ========================================
// DAYS ROUTES
// ========================================

// PUT - Update day (admin only)
router.put('/months/:id/days/:dayId', isAdmin, updateDay)

// ========================================
// ASSIGNMENTS ROUTES
// ========================================

// PUT - Update single assignment (admin only)
router.put('/assignments/:assignmentId', isAdmin, updateAssignment)

// PUT - Bulk update assignments (admin only)
router.put('/months/:id/assignments', isAdmin, bulkUpdateAssignments)

// ========================================
// CONSTRAINTS ROUTES
// ========================================

// GET - Get constraints by month
router.get('/months/:id/constraints', getConstraintsByMonth)

// POST - Create constraint
router.post('/constraints', createConstraint)

// PUT - Update constraint
router.put('/constraints/:constraintId', updateConstraint)

// PUT - Approve/reject constraint (admin only)
router.put('/constraints/:constraintId/approve', isAdmin, approveConstraint)

// DELETE - Delete constraint
router.delete('/constraints/:constraintId', deleteConstraint)

// ========================================
// EMPLOYEE RULES ROUTES
// ========================================

// GET - Get all employee rules
router.get('/rules', getAllEmployeeRules)

// GET - Get rules by employee
router.get('/rules/employee/:employeeId', getEmployeeRulesByEmployee)

// POST - Create employee rule (admin only)
router.post('/rules', isAdmin, createEmployeeRule)

// PUT - Update employee rule (admin only)
router.put('/rules/:ruleId', isAdmin, updateEmployeeRule)

// DELETE - Delete employee rule (admin only)
router.delete('/rules/:ruleId', isAdmin, deleteEmployeeRule)

// ========================================
// HISTORY ROUTES
// ========================================

// GET - Get history by month
router.get('/months/:id/history', getHistory)

// ========================================
// SCHEDULABLE EMPLOYEES ROUTES
// ========================================

// GET - Get employees selected for scheduling
router.get('/employees', getSchedulableEmployees)

// GET - Get all employees with their schedulable status
router.get('/employees/all', getAllEmployeesWithStatus)

// POST - Add employee to scheduling (admin only)
router.post('/employees/:employeeId', isAdmin, addSchedulableEmployee)

// DELETE - Remove employee from scheduling (admin only)
router.delete('/employees/:employeeId', isAdmin, removeSchedulableEmployee)

// PUT - Set all schedulable employees (replaces list) (admin only)
router.put('/employees', isAdmin, setSchedulableEmployees)

export default router
