import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Existing Lambda function definition
    const notificationHandler = new lambda.Function(this, 'NotificationHandler', {
      // ... existing configuration ...
    });

    // Add SNS publish permission
    notificationHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: ['arn:aws:sns:ap-southeast-2:722141136946:user-notifications']
    }));
  }
}