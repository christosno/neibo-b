export const parseTimeToMs = (timeString: string): number => {
  const match = timeString.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  return value * multipliers[unit];
};
