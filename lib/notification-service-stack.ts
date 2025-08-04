import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS topic for user notifications
    const userNotificationsTopic = new sns.Topic(this, 'UserNotifications', {
      topicName: 'user-notifications',
      displayName: 'User Notifications Topic'
    });

    // Create Lambda function
    const notificationServiceFunction = new lambda.Function(this, 'NotificationServiceFunction', {
      functionName: 'notification-service',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
        
        exports.handler = async (event) => {
          const snsClient = new SNSClient({ region: process.env.AWS_REGION });
          
          try {
            const params = {
              TopicArn: process.env.SNS_TOPIC_ARN,
              Message: JSON.stringify(event),
              Subject: 'User Notification'
            };
            
            const command = new PublishCommand(params);
            const result = await snsClient.send(command);
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Notification sent successfully',
                messageId: result.MessageId
              })
            };
          } catch (error) {
            console.error('Error publishing to SNS:', error);
            throw error;
          }
        };
      `),
      environment: {
        SNS_TOPIC_ARN: userNotificationsTopic.topicArn
      }
    });

    // Grant SNS:Publish permission to Lambda function
    userNotificationsTopic.grantPublish(notificationServiceFunction);

    // Output the topic ARN
    new cdk.CfnOutput(this, 'UserNotificationsTopicArn', {
      value: userNotificationsTopic.topicArn,
      description: 'ARN of the user notifications SNS topic'
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'NotificationServiceFunctionArn', {
      value: notificationServiceFunction.functionArn,
      description: 'ARN of the notification service Lambda function'
    });
  }
}