import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS topic
    const userNotificationsTopic = new sns.Topic(this, 'UserNotifications', {
      topicName: 'user-notifications',
      displayName: 'User Notifications Topic'
    });

    // Create Lambda function
    const notificationServiceFunction = new lambda.Function(this, 'NotificationServiceFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
        
        exports.handler = async (event) => {
          const snsClient = new SNSClient({ region: process.env.AWS_REGION });
          
          try {
            const command = new PublishCommand({
              TopicArn: process.env.SNS_TOPIC_ARN,
              Message: JSON.stringify(event),
              Subject: 'Notification Service Message'
            });
            
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
    userNotificationsTopic.grantPublish(notificationServiceFunction);

    // Output the topic ARN
    new cdk.CfnOutput(this, 'UserNotificationsTopicArn', {
      value: userNotificationsTopic.topicArn,
      description: 'ARN of the User Notifications SNS Topic'
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'NotificationServiceFunctionArn', {
      value: notificationServiceFunction.functionArn,
      description: 'ARN of the Notification Service Lambda Function'
    });
  }
}