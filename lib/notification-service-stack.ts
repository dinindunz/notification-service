import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS Topic
    const notificationTopic = new sns.Topic(this, 'UserNotificationsTopic', {
      topicName: 'user-notifications',
    });

    // Create Lambda function
    const notificationFunction = new lambda.Function(this, 'NotificationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TOPIC_ARN: notificationTopic.topicArn,
      },
    });

    // Add SNS publish permissions to Lambda role
    notificationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [notificationTopic.topicArn],
    }));
  }
}