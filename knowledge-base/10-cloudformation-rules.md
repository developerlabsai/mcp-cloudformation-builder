# CloudFormation Specific Rules

## Template Structure

### Required Sections
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: >-
  Clear description of what this template creates.
  Include purpose, dependencies, and any prerequisites.

Parameters:
  # All configurable values

Resources:
  # Resource definitions

Outputs:
  # Values for other stacks or users
```

### Optional Sections (Use When Needed)
- Metadata: Template metadata, interface hints
- Mappings: Region-specific or environment values
- Conditions: Conditional resource creation
- Transform: Macros, SAM transforms

## Parameter Standards

### Naming
- Use PascalCase: InstanceType, VpcCidr
- Be descriptive: DatabaseInstanceClass (not DBClass)
- Group related parameters with prefixes

### Required Properties
```yaml
Parameters:
  EnvironmentType:
    Type: String
    Description: Deployment environment
    AllowedValues:
      - development
      - staging
      - production
    Default: development
    ConstraintDescription: Must be development, staging, or production
```

### Common Parameters to Include
- EnvironmentType (dev/staging/prod)
- VPC/Subnet configuration
- Instance sizes
- Storage configuration
- Tag values

## Resource Standards

### Naming Resources
```yaml
Resources:
  # Good: Descriptive logical IDs
  ApplicationLoadBalancer:
  WebServerSecurityGroup:
  DatabaseSubnetGroup:

  # Bad: Vague names
  MyALB:
  SG1:
  DBStuff:
```

### Required Resource Properties
```yaml
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    # Always include:
    # 1. Description (in Metadata or comment)
    # 2. Explicit property values (don't rely on defaults for important settings)
    # 3. Tags
    Properties:
      BucketName: !Sub '${AWS::StackName}-${EnvironmentType}-data'
      Tags:
        - Key: Environment
          Value: !Ref EnvironmentType
        - Key: ManagedBy
          Value: CloudFormation
```

### Deletion Policies
```yaml
# Stateful resources MUST have DeletionPolicy
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot  # or Retain
    UpdateReplacePolicy: Snapshot
    Properties:
      # ...

  S3Bucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain  # Don't delete data on stack delete
    Properties:
      # ...
```

## Security Best Practices

### IAM Roles
- Use least privilege
- No inline policies when possible
- Reference managed policies
- Use conditions for additional security

```yaml
Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      # Avoid inline policies
```

### Security Groups
- Default deny (implicit)
- Explicit allow rules only
- Use security group references over CIDR where possible
- Comment each rule

```yaml
Resources:
  WebSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Allow web traffic
      SecurityGroupIngress:
        - Description: HTTPS from internet
          IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
```

### Encryption
- Always enable encryption for:
  - S3 buckets
  - EBS volumes
  - RDS instances
  - DynamoDB tables
  - SQS queues
  - SNS topics

## Dependencies

### Explicit Dependencies
```yaml
Resources:
  WebServer:
    Type: AWS::EC2::Instance
    DependsOn:
      - DatabaseInstance
      - CacheCluster
    Properties:
      # ...
```

### Implicit Dependencies (Preferred)
```yaml
Resources:
  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    # ...

  Instance:
    Type: AWS::EC2::Instance
    Properties:
      SecurityGroupIds:
        - !Ref SecurityGroup  # Implicit dependency
```

## Outputs

### Required Outputs
```yaml
Outputs:
  # Always export key identifiers
  VpcId:
    Description: VPC Identifier
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'

  # Include connection information
  DatabaseEndpoint:
    Description: Database connection endpoint
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub '${AWS::StackName}-DBEndpoint'
```

## Validation

### Before Deployment
1. Run cfn-lint
2. Run aws cloudformation validate-template
3. Review in CloudFormation Designer (optional)
4. Test in development environment

### cfn-lint Rules
```bash
cfn-lint template.yaml
```

Must pass with no errors. Warnings should be reviewed.

## Cost Awareness

### Include Cost Estimates
Document estimated monthly costs for resources:
- EC2 instances: Type and hourly rate
- RDS: Instance class and storage
- NAT Gateways: ~$32/month + data transfer
- Load Balancers: ~$16/month + LCU charges

### Cost Optimization
- Use !Condition for optional expensive resources
- Provide instance type parameters with cost-effective defaults
- Consider Spot instances for non-production
- Use auto-scaling where appropriate

## Template Organization

### For Large Templates
- Split into nested stacks
- Use cross-stack references
- Group by function (network, compute, data)
- Keep under 500 resources per stack

### Nested Stack Pattern
```yaml
Resources:
  NetworkStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/bucket/network.yaml
      Parameters:
        EnvironmentType: !Ref EnvironmentType

  ComputeStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: NetworkStack
    Properties:
      TemplateURL: https://s3.amazonaws.com/bucket/compute.yaml
      Parameters:
        VpcId: !GetAtt NetworkStack.Outputs.VpcId
```
