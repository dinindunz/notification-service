import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS topic
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'user-notifications',
    });

    // Create Lambda function
    const notificationLambda = new lambda.Function(this, 'NotificationService', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Lambda function code
        };
      `),
    });

    // Grant SNS publish permission to the Lambda function
    notificationLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [notificationTopic.topicArn],
    }));

    // Add tags
    cdk.Tags.of(this).add('GitHubRepo', 'dinindunz/notification-service');
    cdk.Tags.of(this).add('Service', 'NotificationService');

    // Import the Cloud Engineer Lambda function
    const cloudAgentLambda = lambda.Function.fromFunctionArn(
      this,
      'ImportedLambda',
      'arn:aws:lambda:ap-southeast-2:722141136946:function:CloudEngineerStack-CloudEngineerFunction386E0CF3-5bN5YEoCEDsn'
    );

    new lambda.CfnPermission(this, 'AllowCWLogsInvokeLambda', {
      action: 'lambda:InvokeFunction',
      functionName: cloudAgentLambda.functionArn,
      principal: 'logs.amazonaws.com',
      sourceArn: `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${notificationLambda.functionName}:*`,
    });
  }
}