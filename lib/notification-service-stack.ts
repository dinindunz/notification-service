import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS topic for notifications
    const notificationTopic = new sns.Topic(this, 'UserNotifications', {
      topicName: 'user-notifications',
      displayName: 'User Notifications Topic',
    });

    // Create Lambda function for notification service
    const notificationLambda = new lambda.Function(this, 'NotificationServiceService', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the CloudWatch Logs event
    const logData = JSON.parse(event.awslogs.data);
    const logEvents = logData.logEvents;
    
    for (const logEvent of logEvents) {
      if (logEvent.message.includes('ERROR')) {
        // Send notification to SNS
        const params = {
          TopicArn: process.env.SNS_TOPIC_ARN,
          Message: \`Error detected in \${logData.logGroup}: \${logEvent.message}\`,
          Subject: 'AWS Lambda Error Alert'
        };
        
        const command = new PublishCommand(params);
        const result = await snsClient.send(command);
        console.log('Notification sent:', result.MessageId);
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify('Notifications processed successfully')
    };
  } catch (error) {
    console.error('Error processing notifications:', error);
    throw error;
  }
};
      `),
      environment: {
        SNS_TOPIC_ARN: notificationTopic.topicArn,
      },
    });

    // CRITICAL: Grant SNS publish permission to the Lambda function
    // This ensures the Lambda can publish messages to the SNS topic
    notificationTopic.grantPublish(notificationLambda);

    // Add tags
    cdk.Tags.of(this).add('GitHubRepo', 'dinindunz/notification-service');
    cdk.Tags.of(this).add('Service', 'NotificationService');

    // Import existing Lambda function (Cloud Engineer)
    // This Lambda will be triggered by CloudWatch Logs
    const cloudAgentLambda = lambda.Function.fromFunctionArn(
      this,
      'ImportedLambda',
      'arn:aws:lambda:ap-southeast-2:354334841216:function:CloudEngineerStack-CustomVpcRestrictDefaultSGCusto-H2LgJUIjnuek'
    );

    new lambda.CfnPermission(this, 'AllowCWLogsInvokeLambda', {
      functionName: cloudAgentLambda.functionArn,
      action: 'lambda:InvokeFunction',
      principal: 'logs.ap-southeast-2.amazonaws.com',
      sourceArn: `arn:aws:logs:ap-southeast-2:354334841216:log-group:/aws/lambda/notification-service:*`,
    });

    // Create CloudWatch Log Group for the notification service
    const logGroup = new logs.LogGroup(this, 'NotificationServiceLogGroup', {
      logGroupName: '/aws/lambda/notification-service',
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Create subscription filter to trigger Cloud Engineer Lambda on errors
    new logs.SubscriptionFilter(this, 'ErrorSubscriptionFilter', {
      logGroup: logGroup,
      destination: new logs.LambdaDestination(cloudAgentLambda),
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error'),
    });

    // Output the SNS topic ARN
    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'ARN of the notification SNS topic',
    });
  }
}