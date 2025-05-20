import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cdk from "aws-cdk-lib";

export class InvoiceTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, "Resource", {
      partitionKey: { name: "CUSTOMER_ID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "INVOICE_ID", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI_CustomerIDStatusDate",
      partitionKey: { name: "CustomerID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "StatusDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI_PK_STATUS__SK_DATE",
      partitionKey: { name: "PK_STATUS", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK_DATE", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "INVOICE_DATE_INDEX",
      partitionKey: { name: "PK2_INVOICE", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK2_Date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}