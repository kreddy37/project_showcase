/**
 * Shot prediction calculations utility
 * Handles all mathematical computations for shot prediction model
 */

export interface ShotData {
  // Shot position
  xCord: number;
  yCord: number;

  // Last event position
  lastEventxCord: number;
  lastEventyCord: number;

  // Time metrics
  timeSinceLastEvent: number;

  // Shot characteristics
  shotType: string;
  shotRebound: number; // 1 or 0
  shotRush: number; // 1 or 0
  offWing: number; // 1 or 0

  // Event type
  lastEventCategory: string;

  // Team advantage
  shootingTeamPlayerDiff: number;
}

/**
 * Calculate angle from a position to the goal at (100, 0)
 * Uses atan2 to properly handle all quadrants
 * 0° is straight up the ice (toward goal), angles increase left/right
 * Positive angles are above center line, negative below
 */
export function calculateAngle(x: number, y: number): number {
  const dx = 100 - x; // horizontal distance to goal
  const dy = y; // vertical distance from center line
  const angleRad = Math.atan2(dy, dx);
  return Number((angleRad * (180 / Math.PI)).toFixed(2));
}

/**
 * Calculate distance from a position to the goal (100, 0)
 */
export function calculateDistanceToGoal(x: number, y: number): number {
  const distance = Math.sqrt(Math.pow(x - 100, 2) + Math.pow(y, 2));
  return Number(distance.toFixed(2));
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return Number(distance.toFixed(2));
}

/**
 * Calculate speed from distance and time
 */
export function calculateSpeed(distance: number, timeSince: number): number {
  if (timeSince === 0) return 0;
  const speed = distance / timeSince;
  return Number(speed.toFixed(2));
}

/**
 * Build the complete payload for the shot prediction API
 */
export function buildShotPayload(data: ShotData): Record<string, unknown> {
  // Calculate derived metrics
  const shotDistance = calculateDistanceToGoal(data.xCord, data.yCord);
  const shotAngle = calculateAngle(data.xCord, data.yCord);
  const lastEventAngle = calculateAngle(data.lastEventxCord, data.lastEventyCord);
  const distanceFromLastEvent = calculateDistance(
    data.lastEventxCord,
    data.lastEventyCord,
    data.xCord,
    data.yCord
  );
  const speedFromLastEvent = calculateSpeed(distanceFromLastEvent, data.timeSinceLastEvent);

  // Calculate shot angle plus rebound: difference in angles if rebound, 0 otherwise
  const shotAnglePlusRebound = data.shotRebound === 1 ? Math.abs(shotAngle - lastEventAngle) : 0;

  const shotAnglePlusReboundSpeed = data.shotRebound === 1 ? shotAnglePlusRebound / data.timeSinceLastEvent : 0;

  const shotAngleReboundRoyalRoad =
    data.shotRebound === 1 && data.yCord * data.lastEventyCord < 0 ? 1 : 0;

  // Build payload matching the expected API format
  return {
    timeSinceLastEvent: data.timeSinceLastEvent,
    xCord: data.xCord,
    yCord: data.yCord,
    shotAngle: shotAngle,
    shotAnglePlusRebound: shotAnglePlusRebound,
    shotAngleReboundRoyalRoad: shotAngleReboundRoyalRoad,
    shotDistance: shotDistance,
    shotType: data.shotType,
    shotRebound: data.shotRebound,
    shotAnglePlusReboundSpeed: shotAnglePlusReboundSpeed, // Speed consideration
    shotRush: data.shotRush,
    speedFromLastEvent: speedFromLastEvent,
    lastEventxCord: data.lastEventxCord,
    lastEventyCord: data.lastEventyCord,
    distanceFromLastEvent: distanceFromLastEvent,
    lastEventShotAngle: lastEventAngle,
    lastEventShotDistance: calculateDistanceToGoal(data.lastEventxCord, data.lastEventyCord),
    lastEventCategory: data.lastEventCategory,
    offWing: data.offWing,
    shootingTeamPlayerDiff: data.shootingTeamPlayerDiff,
  };
}

/**
 * Validate shot data has all required fields
 */
export function validateShotData(data: Partial<ShotData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.xCord === undefined) errors.push('Shot X coordinate is required');
  if (data.yCord === undefined) errors.push('Shot Y coordinate is required');
  if (data.lastEventxCord === undefined) errors.push('Last event X coordinate is required');
  if (data.lastEventyCord === undefined) errors.push('Last event Y coordinate is required');
  if (data.timeSinceLastEvent === undefined || data.timeSinceLastEvent <= 0)
    errors.push('Time since last event must be a positive nonzero number');
  if (!data.shotType) errors.push('Shot type is required');
  if (data.shotRebound === undefined) errors.push('Rebound status is required');
  if (data.shotRush === undefined) errors.push('Rush status is required');
  if (!data.lastEventCategory) errors.push('Last event type is required');
  if (data.offWing === undefined) errors.push('Off-wing status is required');
  if (data.shootingTeamPlayerDiff === undefined)
    errors.push('Team player differential is required');

  return {
    valid: errors.length === 0,
    errors,
  };
}
