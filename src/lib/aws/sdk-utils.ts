import { STSClient, AssumeRoleCommand, GetFederationTokenCommand } from '@aws-sdk/client-sts';

// Console page mapping from CloudTrail events
export const consolePageMap: Record<string, string> = {
  'DescribeStacks': 'CloudFormation > Stacks',
  'CreateStack': 'CloudFormation > Create Stack',
  'DeleteStack': 'CloudFormation > Delete Stack',
  'ListStackResources': 'CloudFormation > Stack Resources',
  'DescribeInstances': 'EC2 > Instances',
  'RunInstances': 'EC2 > Launch Instance',
  'TerminateInstances': 'EC2 > Terminate Instance',
  'DescribeSecurityGroups': 'EC2 > Security Groups',
  'ListBuckets': 'S3 > Buckets',
  'CreateBucket': 'S3 > Create Bucket',
  'PutObject': 'S3 > Upload Object',
  'GetObject': 'S3 > Download Object',
  'ListRoles': 'IAM > Roles',
  'ListUsers': 'IAM > Users',
  'DescribeVpcs': 'VPC > Your VPCs',
  'DescribeSubnets': 'VPC > Subnets',
};

export async function generateSandboxCredentials(
  roleArn: string,
  externalId: string,
  sessionName: string,
  durationSeconds: number = 3600,
  region: string = 'us-east-1'
) {
  const sts = new STSClient({ region });

  // Assume the client's role
  const assumeRoleResponse = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    ExternalId: externalId,
    RoleSessionName: sessionName,
    DurationSeconds: durationSeconds,
  }));

  if (!assumeRoleResponse.Credentials) {
    throw new Error('Failed to assume role');
  }

  const { AccessKeyId, SecretAccessKey, SessionToken, Expiration } = assumeRoleResponse.Credentials;

  // Generate console sign-in URL
  const sessionJson = JSON.stringify({
    sessionId: AccessKeyId,
    sessionKey: SecretAccessKey,
    sessionToken: SessionToken,
  });

  const getSigninTokenUrl = `https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=${encodeURIComponent(sessionJson)}`;

  const response = await fetch(getSigninTokenUrl);
  const { SigninToken } = await response.json();

  const consoleUrl = `https://signin.aws.amazon.com/federation?Action=login&Issuer=SandboxPortal&Destination=${encodeURIComponent('https://console.aws.amazon.com/cloudformation')}&SigninToken=${SigninToken}`;

  // CLI setup commands
  const cliSetup = `export AWS_ACCESS_KEY_ID=${AccessKeyId}
export AWS_SECRET_ACCESS_KEY=${SecretAccessKey}
export AWS_SESSION_TOKEN=${SessionToken}
export AWS_DEFAULT_REGION=${region}`;

  return {
    accessKeyId: AccessKeyId!,
    secretAccessKey: SecretAccessKey!,
    sessionToken: SessionToken!,
    expiration: Expiration!.toISOString(),
    consoleUrl,
    cliSetup,
  };
}

// Simulated CloudTrail events for demo
export function generateSimulatedActivity(sessionId: string): Array<{
  session_id: string;
  service: string;
  action: string;
  console_page: string;
  success: boolean;
  region: string;
  delay: number; // ms to wait before this event
}> {
  const activities = [
    { service: 'cloudformation', action: 'DescribeStacks', delay: 2000 },
    { service: 'cloudformation', action: 'CreateStack', delay: 5000 },
    { service: 'cloudformation', action: 'ListStackResources', delay: 8000 },
    { service: 'ec2', action: 'DescribeInstances', delay: 15000 },
    { service: 'ec2', action: 'DescribeSecurityGroups', delay: 20000 },
    { service: 's3', action: 'ListBuckets', delay: 30000 },
    { service: 's3', action: 'CreateBucket', delay: 35000 },
    { service: 'iam', action: 'ListRoles', delay: 45000 },
    { service: 'ec2', action: 'RunInstances', delay: 60000 },
    { service: 'cloudformation', action: 'DescribeStacks', delay: 90000 },
  ];

  return activities.map(a => ({
    session_id: sessionId,
    service: a.service,
    action: a.action,
    console_page: consolePageMap[a.action] || `${a.service.toUpperCase()} Console`,
    success: Math.random() > 0.1, // 90% success rate
    region: 'us-east-1',
    delay: a.delay,
  }));
}
