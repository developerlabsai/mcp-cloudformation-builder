export interface CloudFormationTemplate {
  id: string;
  name: string;
  description: string;
  filename: string;
  category: 'iam' | 'infrastructure' | 'monitoring';
  resources: string[];
  permissions: string[];
  services: string[];
  parameters: {
    name: string;
    description: string;
    default?: string;
    required: boolean;
  }[];
  outputs: {
    name: string;
    description: string;
  }[];
  template: string;
  public: boolean; // Whether template is visible in public library
}

export const templates: CloudFormationTemplate[] = [
  {
    id: 'sandbox-portal-iam',
    name: 'Sandbox Portal IAM Permissions',
    description: 'Creates the IAM policy with all permissions required for Sandbox Portal to manage AWS Organizations accounts, check quotas, and configure sandbox environments.',
    filename: 'sandbox-portal-iam.yaml',
    category: 'iam',
    resources: [
      'AWS::IAM::ManagedPolicy - Custom policy with required permissions',
      'AWS::IAM::User - Optional new IAM user',
      'AWS::IAM::AccessKey - Access credentials for new user',
      'AWS::IAM::Group - Group for existing user attachment'
    ],
    services: ['iam', 'cloudformation', 'organizations'],
    permissions: [
      'organizations:CreateAccount - Create new AWS accounts',
      'organizations:DescribeAccount - Get account details',
      'organizations:DescribeCreateAccountStatus - Check account creation status',
      'organizations:ListAccounts - List all organization accounts',
      'iam:CreateRole - Create IAM roles in member accounts',
      'iam:AttachRolePolicy - Attach policies to roles',
      'sts:AssumeRole - Assume roles in member accounts',
      'cloudformation:* - Deploy stacks to member accounts'
    ],
    parameters: [
      { name: 'IAMUserName', description: 'Name of existing IAM user to attach policy to', default: '', required: false },
      { name: 'CreateNewUser', description: 'Whether to create a new IAM user', default: 'false', required: false },
      { name: 'NewUserName', description: 'Name for the new IAM user', default: 'SandboxPortalUser', required: false }
    ],
    outputs: [
      { name: 'PolicyArn', description: 'ARN of the created IAM policy' },
      { name: 'AccessKeyId', description: 'Access Key ID (if new user created)' },
      { name: 'SecretAccessKey', description: 'Secret Access Key (if new user created)' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: IAM permissions for Sandbox Portal

Parameters:
  CreateNewUser:
    Type: String
    Default: 'false'
    AllowedValues: ['true', 'false']

Resources:
  SandboxPortalPolicy:
    Type: AWS::IAM::ManagedPolicy
    Properties:
      ManagedPolicyName: SandboxPortalPolicy
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Action:
              - organizations:*
              - servicequotas:*
            Resource: '*'

Outputs:
  PolicyArn:
    Value: !Ref SandboxPortalPolicy`,
    public: false // Internal use only
  },
  {
    id: 'serverless-api',
    name: 'Serverless REST API',
    description: 'Deploy a complete serverless REST API with API Gateway, Lambda functions, and DynamoDB for data persistence.',
    filename: 'serverless-api.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::ApiGateway::RestApi - REST API endpoint',
      'AWS::Lambda::Function - API handler functions',
      'AWS::DynamoDB::Table - NoSQL database',
      'AWS::IAM::Role - Lambda execution role'
    ],
    services: ['apigateway', 'lambda', 'dynamodb', 'iam', 'cloudwatch'],
    permissions: [
      'lambda:InvokeFunction - Invoke Lambda functions',
      'dynamodb:GetItem - Read items from table',
      'dynamodb:PutItem - Write items to table',
      'dynamodb:Query - Query table',
      'logs:CreateLogGroup - Create CloudWatch log groups'
    ],
    parameters: [
      { name: 'Environment', description: 'Deployment environment', default: 'dev', required: true },
      { name: 'TableName', description: 'DynamoDB table name', default: 'ApiData', required: false }
    ],
    outputs: [
      { name: 'ApiEndpoint', description: 'API Gateway endpoint URL' },
      { name: 'TableArn', description: 'DynamoDB table ARN' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: Serverless REST API

Parameters:
  Environment:
    Type: String
    Default: dev

Resources:
  ApiGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: !Sub '\${Environment}-api'

  DataTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub '\${Environment}-data'
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH

  ApiFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs18.x
      Handler: index.handler
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            return { statusCode: 200, body: 'Hello' };
          };

Outputs:
  ApiEndpoint:
    Value: !Sub 'https://\${ApiGateway}.execute-api.\${AWS::Region}.amazonaws.com'`,
    public: true
  },
  {
    id: 'static-website-s3-cloudfront',
    name: 'Static Website with CloudFront',
    description: 'Host a static website on S3 with CloudFront CDN distribution for global low-latency access and HTTPS.',
    filename: 'static-website.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::S3::Bucket - Website content storage',
      'AWS::CloudFront::Distribution - CDN distribution',
      'AWS::CloudFront::OriginAccessIdentity - Secure S3 access',
      'AWS::S3::BucketPolicy - Allow CloudFront access'
    ],
    services: ['s3', 'cloudfront', 'iam'],
    permissions: [
      's3:GetObject - Read website files',
      's3:PutObject - Upload website files',
      'cloudfront:CreateInvalidation - Invalidate CDN cache'
    ],
    parameters: [
      { name: 'DomainName', description: 'Custom domain name (optional)', default: '', required: false },
      { name: 'PriceClass', description: 'CloudFront price class', default: 'PriceClass_100', required: false }
    ],
    outputs: [
      { name: 'BucketName', description: 'S3 bucket name' },
      { name: 'DistributionDomain', description: 'CloudFront distribution domain' },
      { name: 'DistributionId', description: 'CloudFront distribution ID' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: Static website with CloudFront

Resources:
  WebsiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: error.html

  CloudFrontOAI:
    Type: AWS::CloudFront::OriginAccessIdentity

  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - DomainName: !GetAtt WebsiteBucket.DomainName
            Id: S3Origin
            S3OriginConfig:
              OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/\${CloudFrontOAI}'
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          ForwardedValues:
            QueryString: false
        Enabled: true
        DefaultRootObject: index.html

Outputs:
  BucketName:
    Value: !Ref WebsiteBucket
  DistributionDomain:
    Value: !GetAtt Distribution.DomainName`,
    public: true
  },
  {
    id: 'vpc-networking',
    name: 'VPC with Public/Private Subnets',
    description: 'Create a production-ready VPC with public and private subnets across multiple availability zones, NAT gateways, and route tables.',
    filename: 'vpc-networking.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::EC2::VPC - Virtual private cloud',
      'AWS::EC2::Subnet - Public and private subnets',
      'AWS::EC2::InternetGateway - Internet access',
      'AWS::EC2::NATGateway - Outbound access for private subnets',
      'AWS::EC2::RouteTable - Traffic routing'
    ],
    services: ['ec2', 'iam'],
    permissions: [
      'ec2:CreateVpc - Create VPC',
      'ec2:CreateSubnet - Create subnets',
      'ec2:CreateInternetGateway - Create internet gateway',
      'ec2:CreateNatGateway - Create NAT gateway'
    ],
    parameters: [
      { name: 'VpcCidr', description: 'VPC CIDR block', default: '10.0.0.0/16', required: true },
      { name: 'AvailabilityZones', description: 'Number of AZs', default: '2', required: false }
    ],
    outputs: [
      { name: 'VpcId', description: 'VPC ID' },
      { name: 'PublicSubnets', description: 'Public subnet IDs' },
      { name: 'PrivateSubnets', description: 'Private subnet IDs' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: VPC with public/private subnets

Parameters:
  VpcCidr:
    Type: String
    Default: '10.0.0.0/16'

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true

  InternetGateway:
    Type: AWS::EC2::InternetGateway

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: '10.0.1.0/24'
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: '10.0.10.0/24'
      AvailabilityZone: !Select [0, !GetAZs '']

Outputs:
  VpcId:
    Value: !Ref VPC`,
    public: true
  },
  {
    id: 'ecs-fargate-service',
    name: 'ECS Fargate Service',
    description: 'Deploy a containerized application on ECS Fargate with Application Load Balancer, auto-scaling, and CloudWatch monitoring.',
    filename: 'ecs-fargate.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::ECS::Cluster - Container cluster',
      'AWS::ECS::Service - Fargate service',
      'AWS::ECS::TaskDefinition - Container definition',
      'AWS::ElasticLoadBalancingV2::LoadBalancer - Application Load Balancer',
      'AWS::ApplicationAutoScaling::ScalableTarget - Auto-scaling'
    ],
    services: ['ecs', 'ec2', 'iam', 'cloudwatch'],
    permissions: [
      'ecs:CreateCluster - Create ECS cluster',
      'ecs:CreateService - Create ECS service',
      'ecs:RegisterTaskDefinition - Register task definitions',
      'elasticloadbalancing:* - Manage load balancers'
    ],
    parameters: [
      { name: 'ContainerImage', description: 'Docker image URI', required: true },
      { name: 'DesiredCount', description: 'Number of tasks', default: '2', required: false },
      { name: 'Cpu', description: 'Task CPU units', default: '256', required: false },
      { name: 'Memory', description: 'Task memory (MB)', default: '512', required: false }
    ],
    outputs: [
      { name: 'ClusterArn', description: 'ECS cluster ARN' },
      { name: 'ServiceName', description: 'ECS service name' },
      { name: 'LoadBalancerDNS', description: 'ALB DNS name' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: ECS Fargate service

Parameters:
  ContainerImage:
    Type: String
  DesiredCount:
    Type: Number
    Default: 2

Resources:
  Cluster:
    Type: AWS::ECS::Cluster

  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: app
      Cpu: '256'
      Memory: '512'
      NetworkMode: awsvpc
      RequiresCompatibilities: [FARGATE]
      ContainerDefinitions:
        - Name: app
          Image: !Ref ContainerImage
          PortMappings:
            - ContainerPort: 80

  Service:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref Cluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: !Ref DesiredCount
      LaunchType: FARGATE

Outputs:
  ClusterArn:
    Value: !GetAtt Cluster.Arn`,
    public: true
  },
  {
    id: 'rds-postgres',
    name: 'RDS PostgreSQL Database',
    description: 'Deploy a managed PostgreSQL database on RDS with Multi-AZ deployment, automated backups, and encryption at rest.',
    filename: 'rds-postgres.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::RDS::DBInstance - PostgreSQL database',
      'AWS::RDS::DBSubnetGroup - Database subnet group',
      'AWS::EC2::SecurityGroup - Database security group',
      'AWS::SecretsManager::Secret - Database credentials'
    ],
    services: ['rds', 'ec2', 'iam'],
    permissions: [
      'rds:CreateDBInstance - Create RDS instance',
      'rds:ModifyDBInstance - Modify RDS instance',
      'secretsmanager:GetSecretValue - Retrieve credentials'
    ],
    parameters: [
      { name: 'DBInstanceClass', description: 'Database instance class', default: 'db.t3.micro', required: false },
      { name: 'DBName', description: 'Database name', default: 'appdb', required: true },
      { name: 'MasterUsername', description: 'Master username', default: 'admin', required: true },
      { name: 'MultiAZ', description: 'Enable Multi-AZ', default: 'false', required: false }
    ],
    outputs: [
      { name: 'DBEndpoint', description: 'Database endpoint' },
      { name: 'DBPort', description: 'Database port' },
      { name: 'SecretArn', description: 'Secrets Manager secret ARN' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: RDS PostgreSQL database

Parameters:
  DBInstanceClass:
    Type: String
    Default: db.t3.micro
  DBName:
    Type: String
    Default: appdb

Resources:
  DBSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      GenerateSecretString:
        SecretStringTemplate: '{"username": "admin"}'
        GenerateStringKey: password
        PasswordLength: 16

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !Ref DBInstanceClass
      Engine: postgres
      EngineVersion: '15'
      DBName: !Ref DBName
      MasterUsername: !Sub '{{resolve:secretsmanager:\${DBSecret}:SecretString:username}}'
      MasterUserPassword: !Sub '{{resolve:secretsmanager:\${DBSecret}:SecretString:password}}'
      AllocatedStorage: '20'
      StorageEncrypted: true

Outputs:
  DBEndpoint:
    Value: !GetAtt Database.Endpoint.Address`,
    public: true
  },
  {
    id: 'lambda-scheduled-task',
    name: 'Lambda Scheduled Task',
    description: 'Create a Lambda function triggered on a schedule using EventBridge rules for cron jobs and scheduled tasks.',
    filename: 'lambda-scheduled.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::Lambda::Function - Scheduled function',
      'AWS::Events::Rule - EventBridge schedule rule',
      'AWS::Lambda::Permission - Allow EventBridge invocation',
      'AWS::IAM::Role - Lambda execution role'
    ],
    services: ['lambda', 'iam', 'cloudwatch'],
    permissions: [
      'lambda:InvokeFunction - Invoke Lambda function',
      'events:PutRule - Create EventBridge rules',
      'logs:CreateLogGroup - Create log groups'
    ],
    parameters: [
      { name: 'ScheduleExpression', description: 'Cron or rate expression', default: 'rate(1 hour)', required: true },
      { name: 'FunctionTimeout', description: 'Function timeout in seconds', default: '300', required: false }
    ],
    outputs: [
      { name: 'FunctionArn', description: 'Lambda function ARN' },
      { name: 'RuleArn', description: 'EventBridge rule ARN' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: Lambda scheduled task

Parameters:
  ScheduleExpression:
    Type: String
    Default: 'rate(1 hour)'

Resources:
  ScheduledFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.11
      Handler: index.handler
      Timeout: 300
      Code:
        ZipFile: |
          def handler(event, context):
              print('Scheduled task executed')
              return {'status': 'success'}

  ScheduleRule:
    Type: AWS::Events::Rule
    Properties:
      ScheduleExpression: !Ref ScheduleExpression
      Targets:
        - Id: ScheduledFunction
          Arn: !GetAtt ScheduledFunction.Arn

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ScheduledFunction
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt ScheduleRule.Arn

Outputs:
  FunctionArn:
    Value: !GetAtt ScheduledFunction.Arn`,
    public: true
  },
  {
    id: 'sns-sqs-fanout',
    name: 'SNS/SQS Fan-out Pattern',
    description: 'Implement a pub/sub messaging pattern with SNS topic fanning out to multiple SQS queues for decoupled architecture.',
    filename: 'sns-sqs-fanout.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::SNS::Topic - Message topic',
      'AWS::SQS::Queue - Message queues',
      'AWS::SNS::Subscription - Topic subscriptions',
      'AWS::SQS::QueuePolicy - Allow SNS to send messages'
    ],
    services: ['sns', 'sqs', 'iam'],
    permissions: [
      'sns:Publish - Publish messages to topic',
      'sqs:SendMessage - Send messages to queue',
      'sqs:ReceiveMessage - Receive messages from queue'
    ],
    parameters: [
      { name: 'QueueCount', description: 'Number of subscriber queues', default: '2', required: false },
      { name: 'MessageRetention', description: 'Message retention in seconds', default: '345600', required: false }
    ],
    outputs: [
      { name: 'TopicArn', description: 'SNS topic ARN' },
      { name: 'QueueUrls', description: 'SQS queue URLs' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: SNS/SQS fan-out pattern

Resources:
  MessageTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: fanout-topic

  Queue1:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: subscriber-queue-1
      MessageRetentionPeriod: 345600

  Queue2:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: subscriber-queue-2
      MessageRetentionPeriod: 345600

  Subscription1:
    Type: AWS::SNS::Subscription
    Properties:
      TopicArn: !Ref MessageTopic
      Protocol: sqs
      Endpoint: !GetAtt Queue1.Arn

  Subscription2:
    Type: AWS::SNS::Subscription
    Properties:
      TopicArn: !Ref MessageTopic
      Protocol: sqs
      Endpoint: !GetAtt Queue2.Arn

Outputs:
  TopicArn:
    Value: !Ref MessageTopic`,
    public: true
  },
  {
    id: 'cloudwatch-alarms',
    name: 'CloudWatch Monitoring & Alarms',
    description: 'Set up comprehensive CloudWatch monitoring with alarms, dashboards, and SNS notifications for proactive alerting.',
    filename: 'cloudwatch-alarms.yaml',
    category: 'monitoring',
    resources: [
      'AWS::CloudWatch::Alarm - Metric alarms',
      'AWS::CloudWatch::Dashboard - Monitoring dashboard',
      'AWS::SNS::Topic - Alarm notifications',
      'AWS::Logs::LogGroup - Log aggregation'
    ],
    services: ['cloudwatch', 'sns', 'iam'],
    permissions: [
      'cloudwatch:PutMetricAlarm - Create alarms',
      'cloudwatch:PutDashboard - Create dashboards',
      'sns:Publish - Send notifications',
      'logs:CreateLogGroup - Create log groups'
    ],
    parameters: [
      { name: 'AlarmEmail', description: 'Email for alarm notifications', required: true },
      { name: 'CPUThreshold', description: 'CPU alarm threshold (%)', default: '80', required: false }
    ],
    outputs: [
      { name: 'AlarmTopicArn', description: 'Alarm SNS topic ARN' },
      { name: 'DashboardName', description: 'CloudWatch dashboard name' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: CloudWatch monitoring and alarms

Parameters:
  AlarmEmail:
    Type: String
  CPUThreshold:
    Type: Number
    Default: 80

Resources:
  AlarmTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: alarm-notifications

  EmailSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      TopicArn: !Ref AlarmTopic
      Protocol: email
      Endpoint: !Ref AlarmEmail

  CPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: HighCPUAlarm
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: !Ref CPUThreshold
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref AlarmTopic

Outputs:
  AlarmTopicArn:
    Value: !Ref AlarmTopic`,
    public: true
  },
  {
    id: 'elasticache-redis',
    name: 'ElastiCache Redis Cluster',
    description: 'Deploy a Redis cluster on ElastiCache for session storage, caching, and real-time data with automatic failover.',
    filename: 'elasticache-redis.yaml',
    category: 'infrastructure',
    resources: [
      'AWS::ElastiCache::CacheCluster - Redis cluster',
      'AWS::ElastiCache::SubnetGroup - Cache subnet group',
      'AWS::EC2::SecurityGroup - Cache security group'
    ],
    services: ['elasticache', 'ec2', 'iam'],
    permissions: [
      'elasticache:CreateCacheCluster - Create cache cluster',
      'elasticache:ModifyCacheCluster - Modify cache cluster',
      'ec2:CreateSecurityGroup - Create security groups'
    ],
    parameters: [
      { name: 'CacheNodeType', description: 'Cache node instance type', default: 'cache.t3.micro', required: false },
      { name: 'NumCacheNodes', description: 'Number of cache nodes', default: '1', required: false }
    ],
    outputs: [
      { name: 'RedisEndpoint', description: 'Redis endpoint address' },
      { name: 'RedisPort', description: 'Redis port' }
    ],
    template: `AWSTemplateFormatVersion: '2010-09-09'
Description: ElastiCache Redis cluster

Parameters:
  CacheNodeType:
    Type: String
    Default: cache.t3.micro
  NumCacheNodes:
    Type: Number
    Default: 1

Resources:
  CacheSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Redis cache security group
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 6379
          ToPort: 6379
          CidrIp: 10.0.0.0/16

  RedisCluster:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: !Ref CacheNodeType
      Engine: redis
      NumCacheNodes: !Ref NumCacheNodes
      VpcSecurityGroupIds:
        - !Ref CacheSecurityGroup

Outputs:
  RedisEndpoint:
    Value: !GetAtt RedisCluster.RedisEndpoint.Address
  RedisPort:
    Value: !GetAtt RedisCluster.RedisEndpoint.Port`,
    public: true
  }
];

// Helper to get template by ID
export function getTemplateById(id: string): CloudFormationTemplate | undefined {
  return templates.find(t => t.id === id);
}

// Get all templates (admin view)
export function getAllTemplates() {
  return templates;
}

// Get public templates only (public view)
export function getPublicTemplates() {
  return templates.filter(t => t.public);
}

// Get simplified list for list views
export function getTemplateList(publicOnly = false) {
  const list = publicOnly ? templates.filter(t => t.public) : templates;
  return list.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    services: t.services,
    public: t.public
  }));
}
