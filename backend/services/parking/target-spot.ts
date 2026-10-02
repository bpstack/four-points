// services/parking/target-spot.ts

export interface SpotRef {
  spot_number: number
  level_code: string
}

// The spot a booking update points to: what the update names, and the
// booking's current spot for whatever it leaves out
export function targetSpot(
  update: { spot_number?: number; level_code?: string },
  current: SpotRef
): SpotRef {
  return {
    spot_number: update.spot_number ?? current.spot_number,
    level_code: update.level_code ?? current.level_code,
  }
}
