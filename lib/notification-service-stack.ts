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
    const notificationFunction = new lambda.Function(this, 'NotificationServiceService', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
        
        const snsClient = new SNSClient({ region: process.env.AWS_REGION });
        
        exports.handler = async (event) => {
          console.log('Event received:', JSON.stringify(event, null, 2));
          
          try {
            const message = {
              default: 'Default notification message',
              email: 'Email notification message',
              sms: 'SMS notification message'
            };
            
            const params = {
              TopicArn: process.env.SNS_TOPIC_ARN,
              Message: JSON.stringify(message),
              MessageStructure: 'json',
              Subject: 'User Notification'
            };
            
            const command = new PublishCommand(params);
            const result = await snsClient.send(command);
            
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
      environment: {
        SNS_TOPIC_ARN: userNotificationsTopic.topicArn
      },
      functionName: 'notification-service'
    });

    // Grant SNS publish permission to Lambda function
    userNotificationsTopic.grantPublish(notificationFunction);

    // Output the topic ARN
    new cdk.CfnOutput(this, 'UserNotificationsTopicArn', {
      value: userNotificationsTopic.topicArn,
      description: 'ARN of the User Notifications SNS Topic'
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'NotificationFunctionArn', {
      value: notificationFunction.functionArn,
      description: 'ARN of the Notification Lambda Function'
    });
  }
}