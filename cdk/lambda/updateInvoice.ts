import { getTableName } from "./utils/dynamo";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_PARAM_NAME = process.env.TABLE_PARAM_NAME!;
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
  try {
    const tableName = await getTableName(TABLE_PARAM_NAME);

    const { customerId, invoiceId } = event.pathParameters || {};

    if (!customerId || !invoiceId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Missing required path parameters: customerId or invoiceId" }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Invalid JSON body" }),
      };
    }

    const { status, amount } = body;
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (status !== undefined) {
      const normalizedStatus = String(status).toLowerCase();
      updateExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = normalizedStatus;

      // GSI field
      updateExpressions.push("#PK_STATUS = :pkStatus");
      expressionAttributeNames["#PK_STATUS"] = "PK_STATUS";
      expressionAttributeValues[":pkStatus"] = normalizedStatus;
    }

    if (amount !== undefined) {
      updateExpressions.push("#amount = :amount");
      expressionAttributeNames["#amount"] = "amount";
      expressionAttributeValues[":amount"] = amount;
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "No valid fields provided for update (status, amount)" }),
      };
    }

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        CUSTOMER_ID: customerId,
        INVOICE_ID: invoiceId,
      },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const response = await ddbDocClient.send(command);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Invoice updated",
        updatedItem: response.Attributes,
      }),
    };
  } catch (err: any) {
    console.error("Update failed:", err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Internal server error", error: err.message }),
    };
  }
};
