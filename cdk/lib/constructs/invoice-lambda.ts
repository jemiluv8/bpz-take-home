import { Construct } from "constructs";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";

import * as path from "path";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface InvoiceLambdaProps extends NodejsFunctionProps {
  ssmParams?: ssm.IStringParameter[];
  dynamoAccess?: {
    actions: string[];
    table: dynamodb.ITable;
    includeIndexes?: boolean;
  };
}

export class InvoiceLambda extends Construct {
  public readonly lambda: NodejsFunction;

  constructor(scope: Construct, id: string, props: InvoiceLambdaProps) {
    super(scope, id);

    this.lambda = new NodejsFunction(this, id, {
      ...props,
      entry: props.entry ?? path.join(__dirname, `../../../lambda/${id}.ts`),
    });

    if (props.ssmParams?.length) {
      this.lambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ssm:GetParameter"],
          resources: props.ssmParams.map((p) => p.parameterArn),
        })
      );
    }

    if (props.dynamoAccess) {
      const { actions, table, includeIndexes } = props.dynamoAccess;
      const resources = [table.tableArn];
      if (includeIndexes) resources.push(`${table.tableArn}/index/*`);

      this.lambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions,
          resources,
        })
      );
    }
  }
}