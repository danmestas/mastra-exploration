import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const currentTimeTool = createTool({
  id: 'get-current-time',
  description: 'Get current time in specified timezone',
  inputSchema: z.object({
    timezone: z.string().default('UTC').describe('Timezone identifier (e.g., "America/New_York", "Europe/London", "Asia/Tokyo")'),
    format: z.enum(['iso', '12h', '24h', 'unix', 'relative']).default('iso').describe('Time format'),
  }),
  outputSchema: z.object({
    timezone: z.string(),
    current: z.string(),
    utc: z.string(),
    unix: z.number(),
    offset: z.string(),
    isDST: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { timezone, format } = context;
    
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: format === '12h',
    };
    
    let current: string;
    switch (format) {
      case 'unix':
        current = Math.floor(now.getTime() / 1000).toString();
        break;
      case 'relative':
        current = 'just now';
        break;
      case '12h':
      case '24h':
        current = now.toLocaleString('en-US', options);
        break;
      default:
        current = now.toISOString();
    }
    
    // Calculate timezone offset
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    // Simple DST check (not 100% accurate but good enough for most cases)
    const january = new Date(now.getFullYear(), 0, 1);
    const july = new Date(now.getFullYear(), 6, 1);
    const janOffset = january.getTimezoneOffset();
    const julOffset = july.getTimezoneOffset();
    const isDST = Math.min(janOffset, julOffset) === now.getTimezoneOffset();
    
    return {
      timezone,
      current,
      utc: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      offset,
      isDST,
    };
  },
});

export const timezoneConversionTool = createTool({
  id: 'convert-timezone',
  description: 'Convert time between different timezones',
  inputSchema: z.object({
    time: z.string().describe('Time to convert (ISO format or "now")'),
    fromTimezone: z.string().describe('Source timezone'),
    toTimezone: z.string().describe('Target timezone'),
  }),
  outputSchema: z.object({
    original: z.string(),
    originalTimezone: z.string(),
    converted: z.string(),
    convertedTimezone: z.string(),
    difference: z.string(),
  }),
  execute: async ({ context }) => {
    const { time, fromTimezone, toTimezone } = context;
    
    const date = time === 'now' ? new Date() : new Date(time);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid time format');
    }
    
    const originalOptions: Intl.DateTimeFormatOptions = {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    
    const convertedOptions: Intl.DateTimeFormatOptions = {
      timeZone: toTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    
    const original = date.toLocaleString('en-US', originalOptions);
    const converted = date.toLocaleString('en-US', convertedOptions);
    
    // Calculate time difference
    const fromDate = new Date(date.toLocaleString('en-US', { timeZone: fromTimezone }));
    const toDate = new Date(date.toLocaleString('en-US', { timeZone: toTimezone }));
    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
    const diffMins = Math.floor((Math.abs(diffMs) % 3600000) / 60000);
    const difference = `${diffMs < 0 ? '-' : '+'}${diffHours}h ${diffMins}m`;
    
    return {
      original,
      originalTimezone: fromTimezone,
      converted,
      convertedTimezone: toTimezone,
      difference,
    };
  },
});

export const dateDifferenceTool = createTool({
  id: 'calculate-date-difference',
  description: 'Calculate the difference between two dates',
  inputSchema: z.object({
    startDate: z.string().describe('Start date (ISO format or "now")'),
    endDate: z.string().describe('End date (ISO format or "now")'),
    unit: z.enum(['all', 'years', 'months', 'days', 'hours', 'minutes', 'seconds']).default('all'),
  }),
  outputSchema: z.object({
    startDate: z.string(),
    endDate: z.string(),
    difference: z.object({
      totalMilliseconds: z.number(),
      totalSeconds: z.number(),
      totalMinutes: z.number(),
      totalHours: z.number(),
      totalDays: z.number(),
      years: z.number(),
      months: z.number(),
      days: z.number(),
      hours: z.number(),
      minutes: z.number(),
      seconds: z.number(),
      formatted: z.string(),
    }),
    isPast: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { startDate, endDate, unit } = context;
    
    const start = startDate === 'now' ? new Date() : new Date(startDate);
    const end = endDate === 'now' ? new Date() : new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    
    const diffMs = end.getTime() - start.getTime();
    const absDiffMs = Math.abs(diffMs);
    
    const totalSeconds = absDiffMs / 1000;
    const totalMinutes = totalSeconds / 60;
    const totalHours = totalMinutes / 60;
    const totalDays = totalHours / 24;
    
    // Calculate detailed breakdown
    const years = Math.floor(totalDays / 365.25);
    const remainingDaysAfterYears = totalDays % 365.25;
    const months = Math.floor(remainingDaysAfterYears / 30.44);
    const days = Math.floor(remainingDaysAfterYears % 30.44);
    const hours = Math.floor(totalHours % 24);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    let formatted = '';
    if (years > 0) formatted += `${years} year${years !== 1 ? 's' : ''} `;
    if (months > 0) formatted += `${months} month${months !== 1 ? 's' : ''} `;
    if (days > 0) formatted += `${days} day${days !== 1 ? 's' : ''} `;
    if (hours > 0) formatted += `${hours} hour${hours !== 1 ? 's' : ''} `;
    if (minutes > 0) formatted += `${minutes} minute${minutes !== 1 ? 's' : ''} `;
    if (seconds > 0 || formatted === '') formatted += `${seconds} second${seconds !== 1 ? 's' : ''}`;
    
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      difference: {
        totalMilliseconds: absDiffMs,
        totalSeconds,
        totalMinutes,
        totalHours,
        totalDays,
        years,
        months,
        days,
        hours,
        minutes,
        seconds,
        formatted: formatted.trim(),
      },
      isPast: diffMs < 0,
    };
  },
});

export const dateCalculatorTool = createTool({
  id: 'calculate-date',
  description: 'Add or subtract time from a date',
  inputSchema: z.object({
    date: z.string().describe('Base date (ISO format or "now")'),
    operation: z.enum(['add', 'subtract']).describe('Operation to perform'),
    amount: z.number().describe('Amount to add/subtract'),
    unit: z.enum(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']).describe('Unit of time'),
  }),
  outputSchema: z.object({
    originalDate: z.string(),
    operation: z.string(),
    amount: z.number(),
    unit: z.string(),
    resultDate: z.string(),
    dayOfWeek: z.string(),
    weekNumber: z.number(),
    isWeekend: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { date, operation, amount, unit } = context;
    
    const baseDate = date === 'now' ? new Date() : new Date(date);
    
    if (isNaN(baseDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    const resultDate = new Date(baseDate);
    const multiplier = operation === 'add' ? 1 : -1;
    
    switch (unit) {
      case 'years':
        resultDate.setFullYear(resultDate.getFullYear() + (amount * multiplier));
        break;
      case 'months':
        resultDate.setMonth(resultDate.getMonth() + (amount * multiplier));
        break;
      case 'weeks':
        resultDate.setDate(resultDate.getDate() + (amount * 7 * multiplier));
        break;
      case 'days':
        resultDate.setDate(resultDate.getDate() + (amount * multiplier));
        break;
      case 'hours':
        resultDate.setHours(resultDate.getHours() + (amount * multiplier));
        break;
      case 'minutes':
        resultDate.setMinutes(resultDate.getMinutes() + (amount * multiplier));
        break;
      case 'seconds':
        resultDate.setSeconds(resultDate.getSeconds() + (amount * multiplier));
        break;
    }
    
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][resultDate.getDay()];
    const isWeekend = resultDate.getDay() === 0 || resultDate.getDay() === 6;
    
    // Calculate week number
    const firstDayOfYear = new Date(resultDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (resultDate.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    
    return {
      originalDate: baseDate.toISOString(),
      operation,
      amount,
      unit,
      resultDate: resultDate.toISOString(),
      dayOfWeek,
      weekNumber,
      isWeekend,
    };
  },
});

export const worldClockTool = createTool({
  id: 'world-clock',
  description: 'Get current time in multiple major cities around the world',
  inputSchema: z.object({
    cities: z.array(z.string()).optional().describe('List of cities to get time for (defaults to major cities)'),
  }),
  outputSchema: z.object({
    times: z.array(z.object({
      city: z.string(),
      timezone: z.string(),
      time: z.string(),
      date: z.string(),
      offset: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    const { cities } = context;
    
    const defaultCities = [
      { city: 'New York', timezone: 'America/New_York' },
      { city: 'Los Angeles', timezone: 'America/Los_Angeles' },
      { city: 'London', timezone: 'Europe/London' },
      { city: 'Paris', timezone: 'Europe/Paris' },
      { city: 'Tokyo', timezone: 'Asia/Tokyo' },
      { city: 'Sydney', timezone: 'Australia/Sydney' },
      { city: 'Dubai', timezone: 'Asia/Dubai' },
      { city: 'Singapore', timezone: 'Asia/Singapore' },
      { city: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
      { city: 'Mumbai', timezone: 'Asia/Kolkata' },
    ];
    
    const cityTimezoneMap: Record<string, string> = {
      'new york': 'America/New_York',
      'los angeles': 'America/Los_Angeles',
      'chicago': 'America/Chicago',
      'london': 'Europe/London',
      'paris': 'Europe/Paris',
      'berlin': 'Europe/Berlin',
      'moscow': 'Europe/Moscow',
      'tokyo': 'Asia/Tokyo',
      'beijing': 'Asia/Shanghai',
      'shanghai': 'Asia/Shanghai',
      'hong kong': 'Asia/Hong_Kong',
      'singapore': 'Asia/Singapore',
      'dubai': 'Asia/Dubai',
      'sydney': 'Australia/Sydney',
      'melbourne': 'Australia/Melbourne',
      'mumbai': 'Asia/Kolkata',
      'delhi': 'Asia/Kolkata',
      'toronto': 'America/Toronto',
      'vancouver': 'America/Vancouver',
      'mexico city': 'America/Mexico_City',
      'sao paulo': 'America/Sao_Paulo',
    };
    
    const citiesToUse = cities && cities.length > 0
      ? cities.map(city => ({
          city,
          timezone: cityTimezoneMap[city.toLowerCase()] || 'UTC',
        }))
      : defaultCities;
    
    const now = new Date();
    
    return {
      times: citiesToUse.map(({ city, timezone }) => {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        };
        
        const dateOptions: Intl.DateTimeFormatOptions = {
          timeZone: timezone,
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        
        const time = now.toLocaleString('en-US', options);
        const date = now.toLocaleString('en-US', dateOptions);
        
        // Calculate offset
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes >= 0 ? '+' : '-';
        const offset = `UTC${offsetSign}${offsetHours}${offsetMins > 0 ? `:${offsetMins}` : ''}`;
        
        return {
          city,
          timezone,
          time,
          date,
          offset,
        };
      }),
    };
  },
});