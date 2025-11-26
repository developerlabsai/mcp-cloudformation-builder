/**
 * AWS Pricing API Integration
 * Fetches real-time pricing data from AWS Pricing API with caching
 */

import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';

// Cache duration: 14 days (pricing doesn't change frequently)
const CACHE_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// In-memory cache
const priceCache = new Map<string, { price: number; timestamp: number }>();

export interface AWSPricingParams {
  serviceCode: string;
  region?: string;
  instanceType?: string;
  operatingSystem?: string;
  tenancy?: string;
  // Add more as needed
}

/**
 * Get AWS Pricing API client
 */
function getPricingClient(): PricingClient | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('AWS credentials not configured, using fallback pricing');
    return null;
  }

  return new PricingClient({
    region: 'us-east-1', // Pricing API is only available in us-east-1
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate cache key for pricing lookup
 */
function getCacheKey(params: AWSPricingParams): string {
  return JSON.stringify({
    service: params.serviceCode,
    region: params.region || 'us-east-1',
    instance: params.instanceType,
    os: params.operatingSystem,
  });
}

/**
 * Check if cached price is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION_MS;
}

/**
 * Fetch EC2 instance pricing
 */
export async function getEC2Pricing(
  instanceType: string = 't3.medium',
  region: string = 'us-east-1'
): Promise<number> {
  const cacheKey = getCacheKey({
    serviceCode: 'AmazonEC2',
    region,
    instanceType,
    operatingSystem: 'Linux',
  });

  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.price;
  }

  const client = getPricingClient();
  if (!client) {
    // Fallback to hardcoded pricing
    return 0.0416; // t3.medium default
  }

  try {
    const command = new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        {
          Type: 'TERM_MATCH',
          Field: 'instanceType',
          Value: instanceType,
        },
        {
          Type: 'TERM_MATCH',
          Field: 'location',
          Value: getLocationName(region),
        },
        {
          Type: 'TERM_MATCH',
          Field: 'operatingSystem',
          Value: 'Linux',
        },
        {
          Type: 'TERM_MATCH',
          Field: 'tenancy',
          Value: 'Shared',
        },
        {
          Type: 'TERM_MATCH',
          Field: 'capacitystatus',
          Value: 'Used',
        },
        {
          Type: 'TERM_MATCH',
          Field: 'preInstalledSw',
          Value: 'NA',
        },
      ],
      MaxResults: 1,
    });

    const response = await client.send(command);

    if (response.PriceList && response.PriceList.length > 0) {
      const priceData = JSON.parse(response.PriceList[0]);
      const terms = priceData.terms?.OnDemand || {};
      const termKey = Object.keys(terms)[0];
      const priceDimensions = terms[termKey]?.priceDimensions || {};
      const dimensionKey = Object.keys(priceDimensions)[0];
      const pricePerHour = parseFloat(priceDimensions[dimensionKey]?.pricePerUnit?.USD || '0');

      // Cache the result
      priceCache.set(cacheKey, { price: pricePerHour, timestamp: Date.now() });

      return pricePerHour;
    }

    throw new Error('No pricing data found');
  } catch (error) {
    console.error('Failed to fetch EC2 pricing:', error);
    // Return fallback pricing
    return 0.0416; // t3.medium default
  }
}

/**
 * Fetch RDS instance pricing
 */
export async function getRDSPricing(
  instanceType: string = 'db.t3.medium',
  region: string = 'us-east-1',
  engine: string = 'PostgreSQL'
): Promise<number> {
  const cacheKey = getCacheKey({
    serviceCode: 'AmazonRDS',
    region,
    instanceType,
  });

  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.price;
  }

  const client = getPricingClient();
  if (!client) {
    // Fallback to hardcoded pricing
    return 0.068; // db.t3.medium default
  }

  try {
    const command = new GetProductsCommand({
      ServiceCode: 'AmazonRDS',
      Filters: [
        {
          Type: 'TERM_MATCH',
          Field: 'instanceType',
          Value: instanceType,
        },
        {
          Type: 'TERM_MATCH',
          Field: 'location',
          Value: getLocationName(region),
        },
        {
          Type: 'TERM_MATCH',
          Field: 'databaseEngine',
          Value: engine,
        },
        {
          Type: 'TERM_MATCH',
          Field: 'deploymentOption',
          Value: 'Single-AZ',
        },
      ],
      MaxResults: 1,
    });

    const response = await client.send(command);

    if (response.PriceList && response.PriceList.length > 0) {
      const priceData = JSON.parse(response.PriceList[0]);
      const terms = priceData.terms?.OnDemand || {};
      const termKey = Object.keys(terms)[0];
      const priceDimensions = terms[termKey]?.priceDimensions || {};
      const dimensionKey = Object.keys(priceDimensions)[0];
      const pricePerHour = parseFloat(priceDimensions[dimensionKey]?.pricePerUnit?.USD || '0');

      // Cache the result
      priceCache.set(cacheKey, { price: pricePerHour, timestamp: Date.now() });

      return pricePerHour;
    }

    throw new Error('No pricing data found');
  } catch (error) {
    console.error('Failed to fetch RDS pricing:', error);
    return 0.068; // db.t3.medium default
  }
}

/**
 * Fetch Lambda pricing
 */
export async function getLambdaPricing(region: string = 'us-east-1'): Promise<{
  perRequest: number;
  perGbSecond: number;
}> {
  const cacheKey = getCacheKey({
    serviceCode: 'AWSLambda',
    region,
  });

  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return {
      perRequest: cached.price,
      perGbSecond: cached.price * 83.335, // Approximate ratio
    };
  }

  const client = getPricingClient();
  if (!client) {
    return {
      perRequest: 0.0000002,
      perGbSecond: 0.0000166667,
    };
  }

  // For Lambda, we'll use hardcoded pricing as the API response is more complex
  // In production, implement full parsing
  return {
    perRequest: 0.0000002,
    perGbSecond: 0.0000166667,
  };
}

/**
 * Get S3 pricing
 */
export async function getS3Pricing(region: string = 'us-east-1'): Promise<{
  storagePerGb: number;
  getPer1000: number;
  putPer1000: number;
}> {
  // S3 pricing is relatively stable, use hardcoded values
  return {
    storagePerGb: 0.023,
    getPer1000: 0.0004,
    putPer1000: 0.005,
  };
}

/**
 * Convert AWS region code to location name for Pricing API
 */
function getLocationName(region: string): string {
  const locationMap: Record<string, string> = {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'eu-west-1': 'EU (Ireland)',
    'eu-central-1': 'EU (Frankfurt)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    // Add more as needed
  };

  return locationMap[region] || 'US East (N. Virginia)';
}

/**
 * Clear pricing cache (useful for testing or manual refresh)
 */
export function clearPricingCache(): void {
  priceCache.clear();
}
