// Service-specific pricing models based on AWS Pricing Calculator
// Now enhanced with real-time AWS Pricing API integration

import { getEC2Pricing, getRDSPricing, getLambdaPricing, getS3Pricing } from '@/lib/aws/pricing';

export interface ServicePricingParams {
  // Compute
  ec2Hours?: number;
  ec2InstanceType?: string;
  lambdaInvocations?: number;
  lambdaDurationMs?: number;
  lambdaMemoryMb?: number;
  ecsHours?: number;
  ecsInstances?: number;
  eksHours?: number;
  eksInstances?: number;

  // Storage
  s3StorageGb?: number;
  s3GetRequests?: number;
  s3PutRequests?: number;
  s3DataTransferGb?: number;
  dynamodbReadUnits?: number;
  dynamodbWriteUnits?: number;
  dynamodbStorageGb?: number;
  rdsHours?: number;
  rdsStorageGb?: number;
  rdsInstanceType?: string;
  elasticacheHours?: number;
  elasticacheNodes?: number;

  // Networking/CDN
  cloudfrontDataTransferGb?: number;
  cloudfrontRequests?: number;
  apigatewayRequests?: number;
  vpcNatHours?: number;
  vpcDataProcessedGb?: number;

  // Messaging
  snsNotifications?: number;
  sqsRequests?: number;

  // Monitoring
  cloudwatchMetrics?: number;
  cloudwatchLogsGb?: number;
  cloudwatchAlarms?: number;
}

export interface ServiceConfig {
  name: string;
  displayName: string;
  inputs: InputConfig[];
  calculate: (params: ServicePricingParams) => number;
}

export interface InputConfig {
  key: keyof ServicePricingParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

// Pricing rates (simplified, US East region)
const RATES = {
  // EC2 (t3.medium on-demand)
  ec2PerHour: 0.0416,

  // Lambda
  lambdaPerRequest: 0.0000002,
  lambdaPerGbSecond: 0.0000166667,

  // S3
  s3StoragePerGb: 0.023,
  s3GetPer1000: 0.0004,
  s3PutPer1000: 0.005,
  s3DataTransferPerGb: 0.09,

  // DynamoDB
  dynamodbReadPerUnit: 0.00013,
  dynamodbWritePerUnit: 0.00065,
  dynamodbStoragePerGb: 0.25,

  // RDS (db.t3.medium)
  rdsPerHour: 0.068,
  rdsStoragePerGb: 0.115,

  // ElastiCache (cache.t3.medium)
  elasticachePerHour: 0.068,

  // CloudFront
  cloudfrontPerGb: 0.085,
  cloudfrontPer10000Requests: 0.01,

  // API Gateway
  apigatewayPerMillion: 3.50,

  // VPC
  vpcNatPerHour: 0.045,
  vpcNatPerGb: 0.045,

  // SNS
  snsPerMillion: 0.50,

  // SQS
  sqsPerMillion: 0.40,

  // CloudWatch
  cloudwatchPerMetric: 0.30,
  cloudwatchLogsPerGb: 0.50,
  cloudwatchPerAlarm: 0.10,

  // ECS (Fargate - 0.25 vCPU, 0.5 GB)
  ecsPerHour: 0.01262525,

  // EKS
  eksClusterPerHour: 0.10,
  eksNodePerHour: 0.0416,
};

export const serviceConfigs: Record<string, ServiceConfig> = {
  ec2: {
    name: 'ec2',
    displayName: 'EC2',
    inputs: [
      { key: 'ec2Hours', label: 'Hours per month', unit: 'hrs', min: 0, max: 730, step: 10, default: 730 },
    ],
    calculate: (params) => {
      const hours = params.ec2Hours ?? 730;
      return hours * RATES.ec2PerHour;
    },
  },

  lambda: {
    name: 'lambda',
    displayName: 'Lambda',
    inputs: [
      { key: 'lambdaInvocations', label: 'Invocations', unit: '/month', min: 0, max: 10000000, step: 100000, default: 1000000 },
      { key: 'lambdaDurationMs', label: 'Avg duration', unit: 'ms', min: 100, max: 15000, step: 100, default: 200 },
      { key: 'lambdaMemoryMb', label: 'Memory', unit: 'MB', min: 128, max: 10240, step: 128, default: 256 },
    ],
    calculate: (params) => {
      const invocations = params.lambdaInvocations ?? 1000000;
      const durationMs = params.lambdaDurationMs ?? 200;
      const memoryMb = params.lambdaMemoryMb ?? 256;

      const requestCost = invocations * RATES.lambdaPerRequest;
      const gbSeconds = (invocations * (durationMs / 1000) * (memoryMb / 1024));
      const computeCost = gbSeconds * RATES.lambdaPerGbSecond;

      return requestCost + computeCost;
    },
  },

  s3: {
    name: 's3',
    displayName: 'S3',
    inputs: [
      { key: 's3StorageGb', label: 'Storage', unit: 'GB', min: 0, max: 10000, step: 10, default: 100 },
      { key: 's3GetRequests', label: 'GET requests', unit: '/month', min: 0, max: 10000000, step: 10000, default: 100000 },
      { key: 's3PutRequests', label: 'PUT requests', unit: '/month', min: 0, max: 1000000, step: 1000, default: 10000 },
      { key: 's3DataTransferGb', label: 'Data transfer out', unit: 'GB', min: 0, max: 10000, step: 10, default: 50 },
    ],
    calculate: (params) => {
      const storage = params.s3StorageGb ?? 100;
      const gets = params.s3GetRequests ?? 100000;
      const puts = params.s3PutRequests ?? 10000;
      const transfer = params.s3DataTransferGb ?? 50;

      return (storage * RATES.s3StoragePerGb) +
             ((gets / 1000) * RATES.s3GetPer1000) +
             ((puts / 1000) * RATES.s3PutPer1000) +
             (transfer * RATES.s3DataTransferPerGb);
    },
  },

  dynamodb: {
    name: 'dynamodb',
    displayName: 'DynamoDB',
    inputs: [
      { key: 'dynamodbReadUnits', label: 'Read capacity units', unit: 'RCU', min: 1, max: 10000, step: 10, default: 25 },
      { key: 'dynamodbWriteUnits', label: 'Write capacity units', unit: 'WCU', min: 1, max: 10000, step: 10, default: 25 },
      { key: 'dynamodbStorageGb', label: 'Storage', unit: 'GB', min: 0, max: 1000, step: 10, default: 25 },
    ],
    calculate: (params) => {
      const reads = params.dynamodbReadUnits ?? 25;
      const writes = params.dynamodbWriteUnits ?? 25;
      const storage = params.dynamodbStorageGb ?? 25;

      // Provisioned capacity pricing (per hour * 730)
      return (reads * RATES.dynamodbReadPerUnit * 730) +
             (writes * RATES.dynamodbWritePerUnit * 730) +
             (storage * RATES.dynamodbStoragePerGb);
    },
  },

  rds: {
    name: 'rds',
    displayName: 'RDS',
    inputs: [
      { key: 'rdsHours', label: 'Hours per month', unit: 'hrs', min: 0, max: 730, step: 10, default: 730 },
      { key: 'rdsStorageGb', label: 'Storage', unit: 'GB', min: 20, max: 1000, step: 10, default: 100 },
    ],
    calculate: (params) => {
      const hours = params.rdsHours ?? 730;
      const storage = params.rdsStorageGb ?? 100;

      return (hours * RATES.rdsPerHour) + (storage * RATES.rdsStoragePerGb);
    },
  },

  elasticache: {
    name: 'elasticache',
    displayName: 'ElastiCache',
    inputs: [
      { key: 'elasticacheHours', label: 'Hours per month', unit: 'hrs', min: 0, max: 730, step: 10, default: 730 },
      { key: 'elasticacheNodes', label: 'Number of nodes', unit: 'nodes', min: 1, max: 10, step: 1, default: 2 },
    ],
    calculate: (params) => {
      const hours = params.elasticacheHours ?? 730;
      const nodes = params.elasticacheNodes ?? 2;

      return hours * nodes * RATES.elasticachePerHour;
    },
  },

  cloudfront: {
    name: 'cloudfront',
    displayName: 'CloudFront',
    inputs: [
      { key: 'cloudfrontDataTransferGb', label: 'Data transfer out', unit: 'GB', min: 0, max: 10000, step: 100, default: 1000 },
      { key: 'cloudfrontRequests', label: 'Requests', unit: '/month', min: 0, max: 100000000, step: 1000000, default: 10000000 },
    ],
    calculate: (params) => {
      const transfer = params.cloudfrontDataTransferGb ?? 1000;
      const requests = params.cloudfrontRequests ?? 10000000;

      return (transfer * RATES.cloudfrontPerGb) +
             ((requests / 10000) * RATES.cloudfrontPer10000Requests);
    },
  },

  apigateway: {
    name: 'apigateway',
    displayName: 'API Gateway',
    inputs: [
      { key: 'apigatewayRequests', label: 'Requests', unit: '/month', min: 0, max: 100000000, step: 1000000, default: 1000000 },
    ],
    calculate: (params) => {
      const requests = params.apigatewayRequests ?? 1000000;
      return (requests / 1000000) * RATES.apigatewayPerMillion;
    },
  },

  vpc: {
    name: 'vpc',
    displayName: 'VPC',
    inputs: [
      { key: 'vpcNatHours', label: 'NAT Gateway hours', unit: 'hrs', min: 0, max: 730, step: 10, default: 730 },
      { key: 'vpcDataProcessedGb', label: 'Data processed', unit: 'GB', min: 0, max: 10000, step: 100, default: 100 },
    ],
    calculate: (params) => {
      const hours = params.vpcNatHours ?? 730;
      const data = params.vpcDataProcessedGb ?? 100;

      return (hours * RATES.vpcNatPerHour) + (data * RATES.vpcNatPerGb);
    },
  },

  sns: {
    name: 'sns',
    displayName: 'SNS',
    inputs: [
      { key: 'snsNotifications', label: 'Notifications', unit: '/month', min: 0, max: 10000000, step: 100000, default: 1000000 },
    ],
    calculate: (params) => {
      const notifications = params.snsNotifications ?? 1000000;
      return (notifications / 1000000) * RATES.snsPerMillion;
    },
  },

  sqs: {
    name: 'sqs',
    displayName: 'SQS',
    inputs: [
      { key: 'sqsRequests', label: 'Requests', unit: '/month', min: 0, max: 10000000, step: 100000, default: 1000000 },
    ],
    calculate: (params) => {
      const requests = params.sqsRequests ?? 1000000;
      return (requests / 1000000) * RATES.sqsPerMillion;
    },
  },

  cloudwatch: {
    name: 'cloudwatch',
    displayName: 'CloudWatch',
    inputs: [
      { key: 'cloudwatchMetrics', label: 'Custom metrics', unit: 'metrics', min: 0, max: 1000, step: 10, default: 10 },
      { key: 'cloudwatchLogsGb', label: 'Log ingestion', unit: 'GB', min: 0, max: 1000, step: 10, default: 10 },
      { key: 'cloudwatchAlarms', label: 'Alarms', unit: 'alarms', min: 0, max: 100, step: 5, default: 10 },
    ],
    calculate: (params) => {
      const metrics = params.cloudwatchMetrics ?? 10;
      const logs = params.cloudwatchLogsGb ?? 10;
      const alarms = params.cloudwatchAlarms ?? 10;

      return (metrics * RATES.cloudwatchPerMetric) +
             (logs * RATES.cloudwatchLogsPerGb) +
             (alarms * RATES.cloudwatchPerAlarm);
    },
  },

  ecs: {
    name: 'ecs',
    displayName: 'ECS',
    inputs: [
      { key: 'ecsHours', label: 'Hours per month', unit: 'hrs', min: 0, max: 730, step: 10, default: 730 },
      { key: 'ecsInstances', label: 'Tasks', unit: 'tasks', min: 1, max: 20, step: 1, default: 2 },
    ],
    calculate: (params) => {
      const hours = params.ecsHours ?? 730;
      const instances = params.ecsInstances ?? 2;

      return hours * instances * RATES.ecsPerHour;
    },
  },

  eks: {
    name: 'eks',
    displayName: 'EKS',
    inputs: [
      { key: 'eksHours', label: 'Cluster hours', unit: 'hrs', min: 0, max: 730, step: 10, default: 730 },
      { key: 'eksInstances', label: 'Worker nodes', unit: 'nodes', min: 1, max: 20, step: 1, default: 3 },
    ],
    calculate: (params) => {
      const hours = params.eksHours ?? 730;
      const nodes = params.eksInstances ?? 3;

      const clusterCost = hours * RATES.eksClusterPerHour;
      const nodeCost = hours * nodes * RATES.eksNodePerHour;

      return clusterCost + nodeCost;
    },
  },
};

// Free services (no pricing needed)
export const FREE_SERVICES = ['iam', 'cloudformation', 'organizations'];

// Get default parameters for a service
export function getDefaultParams(serviceName: string): Partial<ServicePricingParams> {
  const config = serviceConfigs[serviceName.toLowerCase()];
  if (!config) return {};

  const params: Partial<ServicePricingParams> = {};
  for (const input of config.inputs) {
    (params as Record<string, number>)[input.key] = input.default;
  }
  return params;
}

// Calculate total for all services (synchronous - uses hardcoded rates)
export function calculateTotalPricing(
  services: string[],
  params: ServicePricingParams
): { services: { name: string; displayName: string; cost: number }[]; total: number } {
  const results: { name: string; displayName: string; cost: number }[] = [];
  let total = 0;

  for (const service of services) {
    const serviceLower = service.toLowerCase();
    if (FREE_SERVICES.includes(serviceLower)) continue;

    const config = serviceConfigs[serviceLower];
    if (config) {
      const cost = config.calculate(params);
      results.push({
        name: serviceLower,
        displayName: config.displayName,
        cost: Math.round(cost * 100) / 100,
      });
      total += cost;
    }
  }

  return {
    services: results,
    total: Math.round(total * 100) / 100,
  };
}

// Calculate total for all services (async - uses AWS Pricing API)
export async function calculateTotalPricingWithAPI(
  services: string[],
  params: ServicePricingParams,
  region: string = 'us-east-1'
): Promise<{
  services: { name: string; displayName: string; cost: number; source: 'api' | 'fallback' }[];
  total: number;
  usedAPI: boolean;
}> {
  const results: { name: string; displayName: string; cost: number; source: 'api' | 'fallback' }[] = [];
  let total = 0;
  let usedAPI = false;

  for (const service of services) {
    const serviceLower = service.toLowerCase();
    if (FREE_SERVICES.includes(serviceLower)) continue;

    const config = serviceConfigs[serviceLower];
    if (!config) continue;

    let cost = 0;
    let source: 'api' | 'fallback' = 'fallback';

    try {
      // Try to use AWS Pricing API for supported services
      if (serviceLower === 'ec2') {
        const pricePerHour = await getEC2Pricing(params.ec2InstanceType || 't3.medium', region);
        cost = (params.ec2Hours ?? 730) * pricePerHour;
        source = 'api';
        usedAPI = true;
      } else if (serviceLower === 'rds') {
        const pricePerHour = await getRDSPricing(params.rdsInstanceType || 'db.t3.medium', region);
        cost = (params.rdsHours ?? 730) * pricePerHour + ((params.rdsStorageGb ?? 100) * 0.115);
        source = 'api';
        usedAPI = true;
      } else if (serviceLower === 'lambda') {
        const lambdaPricing = await getLambdaPricing(region);
        const invocations = params.lambdaInvocations ?? 1000000;
        const durationMs = params.lambdaDurationMs ?? 200;
        const memoryMb = params.lambdaMemoryMb ?? 256;
        const requestCost = invocations * lambdaPricing.perRequest;
        const gbSeconds = (invocations * (durationMs / 1000) * (memoryMb / 1024));
        const computeCost = gbSeconds * lambdaPricing.perGbSecond;
        cost = requestCost + computeCost;
        source = 'api';
        usedAPI = true;
      } else if (serviceLower === 's3') {
        const s3Pricing = await getS3Pricing(region);
        const storage = params.s3StorageGb ?? 100;
        const gets = params.s3GetRequests ?? 100000;
        const puts = params.s3PutRequests ?? 10000;
        const transfer = params.s3DataTransferGb ?? 50;
        cost = (storage * s3Pricing.storagePerGb) +
               ((gets / 1000) * s3Pricing.getPer1000) +
               ((puts / 1000) * s3Pricing.putPer1000) +
               (transfer * 0.09);
        source = 'api';
        usedAPI = true;
      } else {
        // Fallback to hardcoded calculation
        cost = config.calculate(params);
      }
    } catch (error) {
      console.error(`Failed to get API pricing for ${serviceLower}:`, error);
      // Fallback to hardcoded calculation
      cost = config.calculate(params);
    }

    results.push({
      name: serviceLower,
      displayName: config.displayName,
      cost: Math.round(cost * 100) / 100,
      source,
    });
    total += cost;
  }

  return {
    services: results,
    total: Math.round(total * 100) / 100,
    usedAPI,
  };
}
