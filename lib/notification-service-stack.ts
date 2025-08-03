import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS Topic
    const userNotificationsTopic = new sns.Topic(this, 'UserNotificationsTopic', {
      topicName: 'user-notifications',
      displayName: 'User Notifications Topic'
    });

    // Create Lambda function
    const notificationHandler = new lambda.Function(this, 'NotificationHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambda'),
      environment: {
        SNS_TOPIC_ARN: userNotificationsTopic.topicArn
      }
    });

    // Add SNS publish permission to Lambda role
    notificationHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [userNotificationsTopic.topicArn]
    }));
  }
}