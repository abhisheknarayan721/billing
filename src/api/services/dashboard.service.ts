import { findDashboardSummary } from '@/api/repository/dashboard.repository'

export async function getDashboardSummary() {
  return findDashboardSummary()
}
