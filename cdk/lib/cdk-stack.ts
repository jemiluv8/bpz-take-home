import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================
    // DynamoDB: Invoices Table
    // ==========================
    const invoicesTable = new dynamodb.Table(this, "InvoicesTable", {
      partitionKey: { name: "CUSTOMER_ID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "INVOICE_ID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const secondaryIndexes = [
      {
        indexName: "GSI_CustomerIDStatusDate",
        partitionKey: { name: "CustomerID", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "StatusDate", type: dynamodb.AttributeType.STRING },
      },
      {
        indexName: "GSI_PK_STATUS__SK_DATE",
        partitionKey: { name: "PK_STATUS", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "SK_DATE", type: dynamodb.AttributeType.STRING },
      },
      {
        indexName: "INVOICE_DATE_INDEX",
        partitionKey: { name: "PK2_INVOICE", type: dynamodb.AttributeType.STRING },
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

    // ==========================
    // Helper: Lambda Factory
    // ==========================
    const createLambda = (
      id: string,
      file: string,
      env: Record<string, string>,
    ): NodejsFunction =>
      new NodejsFunction(this, id, {
        entry: path.join(__dirname, `../lambda/${file}`),
        handler: "handler",
        environment: env,
      });

    const addSSMAccess = (fn: NodejsFunction, params: ssm.IParameter[]) =>
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ssm:GetParameter"],
          resources: params.map((p) => p.parameterArn),
        }),
      );

    const addDynamoAccess = (
      fn: NodejsFunction,
      actions: string[],
      resources: string[],
    ) =>
      fn.addToRolePolicy(
        new iam.PolicyStatement({ actions, resources }),
      );

    // ==========================
    // Lambda: Hello
    // ==========================
    const helloLambda = createLambda("HelloLambda", "hello.ts", {
      PARAM_NAME: helloParam.parameterName,
      TABLE_PARAM_NAME: tableParam.parameterName,
    });
    addSSMAccess(helloLambda, [helloParam, tableParam]);
    addDynamoAccess(helloLambda, ["dynamodb:DescribeTable"], [invoicesTable.tableArn]);

    // ==========================
    // Lambda: Invoices CRUD
    // ==========================
    const invoiceLambdas = {
      list: createLambda("InvoicesLambda", "invoices.ts", {
        TABLE_PARAM_NAME: tableParam.parameterName,
      }),
      create: createLambda("CreateInvoiceLambda", "createInvoice.ts", {
        TABLE_PARAM_NAME: tableParam.parameterName,
      }),
      get: createLambda("GetInvoiceLambda", "getInvoice.ts", {
        TABLE_PARAM_NAME: tableParam.parameterName,
      }),
      update: createLambda("UpdateInvoiceLambda", "updateInvoice.ts", {
        TABLE_PARAM_NAME: tableParam.parameterName,
      }),
      delete: createLambda("DeleteInvoiceLambda", "deleteInvoice.ts", {
        TABLE_PARAM_NAME: tableParam.parameterName,
      }),
    };

    addSSMAccess(invoiceLambdas.list, [tableParam]);
    addDynamoAccess(invoiceLambdas.list, ["dynamodb:Query"], [
      invoicesTable.tableArn,
      `${invoicesTable.tableArn}/index/*`,
    ]);

    addSSMAccess(invoiceLambdas.create, [tableParam]);
    addDynamoAccess(invoiceLambdas.create, ["dynamodb:PutItem"], [invoicesTable.tableArn]);

    addSSMAccess(invoiceLambdas.get, [tableParam]);
    addDynamoAccess(invoiceLambdas.get, ["dynamodb:GetItem"], [invoicesTable.tableArn]);

    addSSMAccess(invoiceLambdas.update, [tableParam]);
    addDynamoAccess(invoiceLambdas.update, ["dynamodb:UpdateItem"], [invoicesTable.tableArn]);

    addSSMAccess(invoiceLambdas.delete, [tableParam]);
    addDynamoAccess(invoiceLambdas.delete, ["dynamodb:DeleteItem"], [invoicesTable.tableArn]);

    // ==========================
    // API Gateway v2 HTTP API
    // ==========================
    const api = new apigatewayv2.HttpApi(this, "HttpInvoiceApi", {
      apiName: "cdk-invoices-http-api",
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: Object.values(apigatewayv2.CorsHttpMethod),
        allowOrigins: ["http://localhost:5173"],
        exposeHeaders: ["content-type", "accept"],
      },
    });

    const routes = [
      { path: "/", method: apigatewayv2.HttpMethod.GET, lambda: helloLambda },
      { path: "/invoices", method: apigatewayv2.HttpMethod.GET, lambda: invoiceLambdas.list },
      { path: "/invoices", method: apigatewayv2.HttpMethod.POST, lambda: invoiceLambdas.create },
      {
        path: "/invoices/{customerId}/{invoiceId}",
        method: apigatewayv2.HttpMethod.GET,
        lambda: invoiceLambdas.get,
      },
      {
        path: "/invoices/{customerId}/{invoiceId}",
        method: apigatewayv2.HttpMethod.PATCH,
        lambda: invoiceLambdas.update,
      },
      {
        path: "/invoices/{customerId}/{invoiceId}",
        method: apigatewayv2.HttpMethod.DELETE,
        lambda: invoiceLambdas.delete,
      },
    ];

    for (const route of routes) {
      api.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: new integrations.HttpLambdaIntegration(
          `${route.lambda.node.id}Integration`,
          route.lambda,
        ),
      });
    }
  }
}
