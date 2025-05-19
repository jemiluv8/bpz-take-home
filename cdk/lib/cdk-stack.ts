import * as path from "path";
import * as cdk from "aws-cdk-lib";

import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2"; // BREAKING
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations"; // BREAKING

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB table with CUSTOMER_ID and INVOICE_ID
    const table = new dynamodb.Table(this, "InvoicesTable", {
      partitionKey: {
        name: "CUSTOMER_ID",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "INVOICE_ID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add Global Secondary Indexes
    table.addGlobalSecondaryIndex({
      indexName: "GSI_CustomerIDStatusDate",
      partitionKey: { name: "CustomerID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "StatusDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI_PK_STATUS__SK_DATE",
      partitionKey: { name: "PK_STATUS", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK_DATE", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: "INVOICE_DATE_INDEX",
      partitionKey: {
        name: "PK2_INVOICE",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "SK2_Date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 2. SSM Parameter for the table name
    const tableParam = new ssm.StringParameter(this, "TableNameParam", {
      parameterName: "/cdk-invoices/tableName",
      stringValue: table.tableName,
    });

    // 3. SSM Parameter for hello message
    const helloParam = new ssm.StringParameter(this, "HelloParam", {
      parameterName: "/cdk-invoices/hello",
      stringValue: "👋 Hello from Parameter Store!",
    });

    // 4. Lambda Function
    const helloLambda = new NodejsFunction(this, "HelloLambda", {
      entry: path.join(__dirname, "../lambda/hello.ts"),
      handler: "handler",
      environment: {
        PARAM_NAME: helloParam.parameterName,
        TABLE_PARAM_NAME: tableParam.parameterName,
      },
    });

    // 5. IAM Permissions for SSM
    helloLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [helloParam.parameterArn, tableParam.parameterArn],
      })
    );

    // 6. IAM Permission: only DescribeTable on the exact table
    helloLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:DescribeTable"],
        resources: [table.tableArn],
      })
    );

    ///*INVOICES
    const invoicesLambda = new NodejsFunction(this, "InvoicesLambda", {
      entry: path.join(__dirname, "../lambda/invoices.ts"), // assuming the file will be named invoices.ts
      handler: "handler",
      environment: {
        TABLE_PARAM_NAME: tableParam.parameterName, // SSM param name
      },
    });

    // Grant access to fetch the SSM table name param
    invoicesLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [tableParam.parameterArn],
      })
    );

    // Grant access to query the table and indexes
    invoicesLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Query"],
        resources: [table.tableArn, `${table.tableArn}/index/*`],
      })
    );

    const api = new apigatewayv2.HttpApi(this, "HttpInvoiceApi", {
      apiName: "cdk-invoices-http-api",
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.HEAD,
        ],
        allowOrigins: ["http://localhost:5173"],
        exposeHeaders: ["content-type", "accept"],
      },
    });

    api.addRoutes({
      path: "/invoices",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "InvoicesIntegration",
        invoicesLambda
      ),
    });

    // DELETE LAMBRA
    const deleteInvoiceLambda = new NodejsFunction(
      this,
      "DeleteInvoiceLambda",
      {
        entry: path.join(__dirname, "../lambda/deleteInvoice.ts"),
        handler: "handler",
        environment: {
          TABLE_PARAM_NAME: tableParam.parameterName,
        },
      }
    );

    // Allow Lambda to read the table name
    deleteInvoiceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [tableParam.parameterArn],
      })
    );

    // Allow delete access to DynamoDB table
    deleteInvoiceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:DeleteItem"],
        resources: [table.tableArn],
      })
    );

    api.addRoutes({
      path: "/invoices/{customerId}/{invoiceId}",
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: new integrations.HttpLambdaIntegration(
        "DeleteInvoiceIntegration",
        deleteInvoiceLambda
     ),
    });

    // Create the Lambda
    const getInvoiceLambda = new NodejsFunction(this, "GetInvoiceLambda", {
      entry: path.join(__dirname, "../lambda/getInvoice.ts"),
      handler: "handler",
      environment: {
        TABLE_PARAM_NAME: tableParam.parameterName,
      },
    });

    // Grant SSM read access for table name
    getInvoiceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [tableParam.parameterArn],
      })
    );

    // Grant DynamoDB read access
    getInvoiceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem"],
        resources: [table.tableArn],
      })
    );

    api.addRoutes({
      path: "/invoices/{customerId}/{invoiceId}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "GetInvoiceIntegration",
        getInvoiceLambda
      ),
    });

    //END INVOICES

    api.addRoutes({
      path: "/",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("Root", helloLambda),
    });
  }
}
