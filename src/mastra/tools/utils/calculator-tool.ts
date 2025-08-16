import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const calculatorTool = createTool({
  id: 'calculate',
  description: 'Perform mathematical calculations and expressions',
  inputSchema: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(45)")'),
  }),
  outputSchema: z.object({
    expression: z.string(),
    result: z.number(),
    formatted: z.string(),
  }),
  execute: async ({ context }) => {
    const { expression } = context;
    
    try {
      // Safe math evaluation using Function constructor with Math context
      const mathContext = {
        // Basic operations are handled by JavaScript
        // Math functions
        abs: Math.abs,
        acos: Math.acos,
        asin: Math.asin,
        atan: Math.atan,
        atan2: Math.atan2,
        ceil: Math.ceil,
        cos: Math.cos,
        exp: Math.exp,
        floor: Math.floor,
        log: Math.log,
        log10: Math.log10,
        log2: Math.log2,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        random: Math.random,
        round: Math.round,
        sin: Math.sin,
        sqrt: Math.sqrt,
        tan: Math.tan,
        // Constants
        PI: Math.PI,
        E: Math.E,
        // Custom functions
        factorial: (n: number): number => {
          if (n < 0) return NaN;
          if (n === 0) return 1;
          let result = 1;
          for (let i = 2; i <= n; i++) result *= i;
          return result;
        },
        deg2rad: (deg: number) => deg * (Math.PI / 180),
        rad2deg: (rad: number) => rad * (180 / Math.PI),
      };
      
      // Create safe evaluation function
      const func = new Function(...Object.keys(mathContext), `return ${expression}`);
      const result = func(...Object.values(mathContext));
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Invalid calculation result');
      }
      
      return {
        expression,
        result,
        formatted: formatNumber(result),
      };
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error}`);
    }
  },
});

export const unitConversionTool = createTool({
  id: 'convert-units',
  description: 'Convert between different units of measurement',
  inputSchema: z.object({
    value: z.number().describe('Value to convert'),
    fromUnit: z.string().describe('Source unit (e.g., km, miles, kg, pounds, celsius, fahrenheit)'),
    toUnit: z.string().describe('Target unit'),
  }),
  outputSchema: z.object({
    value: z.number(),
    fromUnit: z.string(),
    toUnit: z.string(),
    result: z.number(),
    formula: z.string(),
  }),
  execute: async ({ context }) => {
    const { value, fromUnit, toUnit } = context;
    
    const conversions: Record<string, Record<string, (v: number) => number>> = {
      // Length
      km: {
        miles: (v) => v * 0.621371,
        m: (v) => v * 1000,
        feet: (v) => v * 3280.84,
        yards: (v) => v * 1093.61,
      },
      miles: {
        km: (v) => v * 1.60934,
        m: (v) => v * 1609.34,
        feet: (v) => v * 5280,
        yards: (v) => v * 1760,
      },
      m: {
        km: (v) => v / 1000,
        miles: (v) => v / 1609.34,
        feet: (v) => v * 3.28084,
        yards: (v) => v * 1.09361,
        cm: (v) => v * 100,
        mm: (v) => v * 1000,
      },
      feet: {
        m: (v) => v / 3.28084,
        km: (v) => v / 3280.84,
        miles: (v) => v / 5280,
        inches: (v) => v * 12,
      },
      // Weight
      kg: {
        pounds: (v) => v * 2.20462,
        grams: (v) => v * 1000,
        ounces: (v) => v * 35.274,
        tons: (v) => v / 1000,
      },
      pounds: {
        kg: (v) => v / 2.20462,
        grams: (v) => v * 453.592,
        ounces: (v) => v * 16,
      },
      // Temperature
      celsius: {
        fahrenheit: (v) => (v * 9/5) + 32,
        kelvin: (v) => v + 273.15,
      },
      fahrenheit: {
        celsius: (v) => (v - 32) * 5/9,
        kelvin: (v) => (v - 32) * 5/9 + 273.15,
      },
      kelvin: {
        celsius: (v) => v - 273.15,
        fahrenheit: (v) => (v - 273.15) * 9/5 + 32,
      },
      // Time
      hours: {
        minutes: (v) => v * 60,
        seconds: (v) => v * 3600,
        days: (v) => v / 24,
        weeks: (v) => v / 168,
      },
      days: {
        hours: (v) => v * 24,
        minutes: (v) => v * 1440,
        seconds: (v) => v * 86400,
        weeks: (v) => v / 7,
        months: (v) => v / 30.44,
        years: (v) => v / 365.25,
      },
    };
    
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();
    
    if (!conversions[from] || !conversions[from][to]) {
      // Try reverse conversion
      if (conversions[to] && conversions[to][from]) {
        const reverseResult = conversions[to][from](1);
        const result = value / reverseResult;
        return {
          value,
          fromUnit,
          toUnit,
          result,
          formula: `${value} ${fromUnit} = ${value} / ${reverseResult} ${toUnit}`,
        };
      }
      throw new Error(`Conversion from ${fromUnit} to ${toUnit} is not supported`);
    }
    
    const result = conversions[from][to](value);
    const formula = `${value} ${fromUnit} = ${result} ${toUnit}`;
    
    return {
      value,
      fromUnit,
      toUnit,
      result,
      formula,
    };
  },
});

export const statisticsTool = createTool({
  id: 'calculate-statistics',
  description: 'Calculate statistical measures for a dataset',
  inputSchema: z.object({
    data: z.array(z.number()).describe('Array of numbers to analyze'),
    measures: z.array(z.enum(['mean', 'median', 'mode', 'stddev', 'variance', 'min', 'max', 'sum', 'count'])).optional(),
  }),
  outputSchema: z.object({
    count: z.number(),
    sum: z.number(),
    mean: z.number(),
    median: z.number(),
    mode: z.array(z.number()),
    min: z.number(),
    max: z.number(),
    range: z.number(),
    variance: z.number(),
    stdDev: z.number(),
    percentiles: z.object({
      p25: z.number(),
      p50: z.number(),
      p75: z.number(),
      p90: z.number(),
      p95: z.number(),
      p99: z.number(),
    }),
  }),
  execute: async ({ context }) => {
    const { data } = context;
    
    if (!data || data.length === 0) {
      throw new Error('Data array cannot be empty');
    }
    
    const sorted = [...data].sort((a, b) => a - b);
    const count = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    
    // Median
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    // Mode
    const frequency: Record<number, number> = {};
    data.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(frequency));
    const mode = Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number);
    
    // Variance and Standard Deviation
    const variance = data.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    
    // Percentiles
    const getPercentile = (p: number) => {
      const index = (p / 100) * (count - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      return lower === upper ? sorted[lower] : sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };
    
    return {
      count,
      sum,
      mean,
      median,
      mode,
      min: sorted[0],
      max: sorted[count - 1],
      range: sorted[count - 1] - sorted[0],
      variance,
      stdDev,
      percentiles: {
        p25: getPercentile(25),
        p50: getPercentile(50),
        p75: getPercentile(75),
        p90: getPercentile(90),
        p95: getPercentile(95),
        p99: getPercentile(99),
      },
    };
  },
});

function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  // Format with appropriate decimal places
  const abs = Math.abs(num);
  if (abs > 1000000) {
    return num.toExponential(4);
  } else if (abs < 0.0001 && abs > 0) {
    return num.toExponential(4);
  } else {
    return num.toFixed(6).replace(/\.?0+$/, '');
  }
}