import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join } from "path";

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloParam = new ssm.StringParameter(this, 'HelloParam', {
      parameterName: '/cdk/hello',
      stringValue: 'Very Secret Parameter Store Value',
    });

  const helloLambda = new NodejsFunction(this, 'HelloLambda', {
    runtime: lambda.Runtime.NODEJS_20_X,
    entry: join(__dirname, '../lambda/hello.ts'), // path to .ts file
    handler: 'handler', // export name in the file
    environment: {
      PARAM_NAME: helloParam.parameterName,
    },
  });

    // Add permission for Lambda to read the SSM param
    helloLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [helloParam.parameterArn],
    }));

    // Create API Gateway endpoint
    const api = new apigateway.RestApi(this, 'HelloApi', {
      restApiName: 'Hello World API',
    });

    api.root.addMethod('GET', new apigateway.LambdaIntegration(helloLambda));
  }
}
