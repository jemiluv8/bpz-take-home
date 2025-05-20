import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";

import { Construct } from "constructs";
import { ApiRoute } from "./constructs/api-route";
import { InvoiceLambda } from "./constructs/invoice-lambda";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================
    // DynamoDB: Invoices Table
    // ==========================
    const invoicesTable = new dynamodb.Table(this, "InvoicesTable", {
      partitionKey: {
        name: "CUSTOMER_ID",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "INVOICE_ID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const secondaryIndexes = [
      {
        indexName: "GSI_CustomerIDStatusDate",
        partitionKey: {
          name: "CustomerID",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "StatusDate", type: dynamodb.AttributeType.STRING },
      },
      {
        indexName: "GSI_PK_STATUS__SK_DATE",
        partitionKey: {
          name: "PK_STATUS",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "SK_DATE", type: dynamodb.AttributeType.STRING },
      },
      {
        indexName: "INVOICE_DATE_INDEX",
        partitionKey: {
          name: "PK2_INVOICE",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "SK2_Date", type: dynamodb.AttributeType.STRING },
      },
    ];

    for (const idx of secondaryIndexes) {
      invoicesTable.addGlobalSecondaryIndex({
        indexName: idx.indexName,
        partitionKey: idx.partitionKey,
        sortKey: idx.sortKey,
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }

    // ==========================
    // SSM Parameters
    // ==========================
    const tableParam = new ssm.StringParameter(this, "TableNameParam", {
      parameterName: "/cdk-invoices/tableName",
      stringValue: invoicesTable.tableName,
    });

    const helloParam = new ssm.StringParameter(this, "HelloParam", {
      parameterName: "/cdk-invoices/hello",
      stringValue: "👋 Hello from Parameter Store!",
    });

    const environment = {
      TABLE_PARAM_NAME: tableParam.parameterName
    }

    const makeEntry = (file: string) =>
      path.join(__dirname, `../lambda/${file}`);

    const helloLambda = new InvoiceLambda(this, "HelloLambda", {
      ssmParams: [tableParam],
      entry: makeEntry("hello.ts"),
      dynamoAccess: {
        actions: ["dynamodb:DescribeTable"],
        table: invoicesTable,
      },
      environment
    }).lambda;

    const listInvoices = new InvoiceLambda(this, "InvoicesLambda", {
      ssmParams: [tableParam],
      entry: makeEntry("invoices.ts"),
      dynamoAccess: {
        actions: ["dynamodb:Query"],
        table: invoicesTable,
        includeIndexes: true,
      },
      environment
    }).lambda;

    const createInvoice = new InvoiceLambda(this, "CreateInvoiceLambda", {
      ssmParams: [tableParam],
      entry: makeEntry("createInvoice.ts"),
      dynamoAccess: {
        actions: ["dynamodb:PutItem"],
        table: invoicesTable,
      },
      environment
    }).lambda;

    const getInvoice = new InvoiceLambda(this, "GetInvoiceLambda", {
      ssmParams: [tableParam],
      entry: makeEntry("getInvoice.ts"),
      dynamoAccess: {
        actions: ["dynamodb:GetItem"],
        table: invoicesTable,
      },
      environment
    }).lambda;

    const updateInvoice = new InvoiceLambda(this, "UpdateInvoiceLambda", {
      ssmParams: [tableParam],
      entry: makeEntry("updateInvoice.ts"),
      dynamoAccess: {
        actions: ["dynamodb:UpdateItem"],
        table: invoicesTable,
      },
      environment
    }).lambda;

    const deleteInvoice = new InvoiceLambda(this, "DeleteInvoiceLambda", {
      ssmParams: [tableParam],
      entry: makeEntry("deleteInvoice.ts"),
      dynamoAccess: {
        actions: ["dynamodb:DeleteItem"],
        table: invoicesTable,
      },
      environment
    }).lambda;

    const routes = [
      { path: "/", method: apigatewayv2.HttpMethod.GET, lambda: helloLambda },
      {
        path: "/invoices",
        method: apigatewayv2.HttpMethod.GET,
        lambda: listInvoices,
      },
      {
        path: "/invoices",
        method: apigatewayv2.HttpMethod.POST,
        lambda: createInvoice,
      },
      {
        path: "/invoices/{customerId}/{invoiceId}",
        method: apigatewayv2.HttpMethod.GET,
        lambda: getInvoice,
      },
      {
        path: "/invoices/{customerId}/{invoiceId}",
        method: apigatewayv2.HttpMethod.PATCH,
        lambda: updateInvoice,
      },
      {
        path: "/invoices/{customerId}/{invoiceId}",
        method: apigatewayv2.HttpMethod.DELETE,
        lambda: deleteInvoice,
      },
    ];

    const api = new ApiRoute(this, "HttpInvoiceApi");
    api.registerRoutes(routes);
  }
}
