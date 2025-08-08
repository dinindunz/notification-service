import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS topic for notifications
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'user-notifications',
    });

    // Create Lambda function for notification service
    const notificationLambda = new lambda.Function(this, 'NotificationService', {
      functionName: 'notification-service',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromInline(`
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNSClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    const message = {
      Message: JSON.stringify({
        timestamp: new Date().toISOString(),
        event: event,
        source: 'notification-service'
      }),
      TopicArn: '${notificationTopic.topicArn}'
    };
    
    const command = new PublishCommand(message);
    const result = await sns.send(command);
    
    console.log('Message published successfully:', result.MessageId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notification sent successfully',
        messageId: result.MessageId
      })
    };
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
};
      `),
    });

    // Grant SNS publish permission to the Lambda function
    notificationTopic.grantPublish(notificationLambda);

    // Add explicit IAM policy statement to ensure permission is granted
    notificationLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [notificationTopic.topicArn]
    }));

    // Add tags
    cdk.Tags.of(this).add('GitHubRepo', 'dinindunz/notification-service');
    cdk.Tags.of(this).add('Service', 'NotificationService');
    cdk.Tags.of(this).add('DoNotNuke', 'True');

    // Import the cloud agent lambda function
    const cloudAgentLambda = lambda.Function.fromFunctionArn(
      this,
      'ImportedLambda',
      'arn:aws:lambda:ap-southeast-2:354334841216:function:CloudEngineerStack-CustomVpcRestrictDefaultSGCusto-H2LgJUIjnuek'
    );

    new lambda.CfnPermission(this, 'AllowCWLogsInvokeLambda', {
      action: 'lambda:InvokeFunction',
      functionName: cloudAgentLambda.functionArn,
      principal: 'logs.amazonaws.com',
      sourceArn: `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/notification-service:*`,
    });

    // Create subscription filter to send errors to cloud agent
    new logs.SubscriptionFilter(this, 'ErrorSubscriptionFilter', {
      logGroup: logs.LogGroup.fromLogGroupName(this, 'NotificationServiceLogGroup', '/aws/lambda/notification-service'),
      destination: new logs.LambdaDestination(cloudAgentLambda),
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error'),
      filterName: 'ErrorsToCloudAgent',
    });

    // Outputs
    new cdk.CfnOutput(this, 'NotificationServiceArn', {
      value: notificationLambda.functionArn,
      description: 'ARN of the notification service lambda',
    });

    new cdk.CfnOutput(this, 'CloudAgentArn', {
      value: cloudAgentLambda.functionArn,
      description: 'ARN of the cloud agent lambda',
    });
  }
}