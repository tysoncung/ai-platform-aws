import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import type { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  service: ecs_patterns.ApplicationLoadBalancedFargateService;
  alarmEmail?: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { service } = props;

    // SNS Topic for alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'AI Gateway Alarms',
    });

    if (props.alarmEmail) {
      new sns.Subscription(this, 'AlarmEmail', {
        topic: alarmTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: props.alarmEmail,
      });
    }

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'GatewayDashboard', {
      dashboardName: 'AIGateway',
    });

    // ALB metrics
    const requestCount = service.loadBalancer.metrics.requestCount();
    const targetResponseTime = service.loadBalancer.metrics.targetResponseTime();
    const httpErrors = service.loadBalancer.metrics.httpCodeTarget(
      cdk.aws_elasticloadbalancingv2.HttpCodeTarget.TARGET_5XX_COUNT,
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Request Count',
        left: [requestCount],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Response Time',
        left: [targetResponseTime],
        width: 12,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '5XX Errors',
        left: [httpErrors],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'CPU / Memory',
        left: [
          service.service.metricCpuUtilization(),
          service.service.metricMemoryUtilization(),
        ],
        width: 12,
      }),
    );

    // Alarms
    new cloudwatch.Alarm(this, 'HighErrorRate', {
      metric: httpErrors,
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'High 5XX error rate on AI Gateway',
    }).addAlarmAction({ bind: () => ({ alarmActionArn: alarmTopic.topicArn }) });

    new cloudwatch.Alarm(this, 'HighLatency', {
      metric: targetResponseTime,
      threshold: 5,
      evaluationPeriods: 3,
      alarmDescription: 'High response latency on AI Gateway',
    }).addAlarmAction({ bind: () => ({ alarmActionArn: alarmTopic.topicArn }) });
  }
}
