import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import type { Construct } from 'constructs';

export interface GatewayStackProps extends cdk.StackProps {
  vpcId?: string;
}

export class GatewayStack extends cdk.Stack {
  public readonly service: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props?: GatewayStackProps) {
    super(scope, id, props);

    // VPC
    const vpc = props?.vpcId
      ? ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: props.vpcId })
      : new ec2.Vpc(this, 'GatewayVpc', {
          maxAzs: 2,
          natGateways: 1,
        });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'GatewayCluster', {
      vpc,
      containerInsights: true,
    });

    // Redis (ElastiCache)
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis',
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: vpc.privateSubnets.map((s) => s.subnetId),
    });

    const redis = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      engine: 'redis',
      cacheNodeType: 'cache.t3.micro',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
    });

    // Fargate Service
    this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'GatewayService', {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('..', {
          file: 'packages/gateway/Dockerfile',
        }),
        containerPort: 3100,
        environment: {
          PORT: '3100',
          NODE_ENV: 'production',
          REDIS_URL: `redis://${redis.attrRedisEndpointAddress}:${redis.attrRedisEndpointPort}`,
        },
      },
      publicLoadBalancer: true,
    });

    // Health check
    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      port: '3100',
    });

    // Allow Fargate -> Redis
    redisSecurityGroup.addIngressRule(
      this.service.service.connections.securityGroups[0],
      ec2.Port.tcp(6379),
      'Allow Fargate to Redis',
    );

    // Auto-scaling
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.service.loadBalancer.loadBalancerDnsName,
    });
  }
}
