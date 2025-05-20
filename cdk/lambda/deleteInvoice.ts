import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getTableName } from "./utils/dynamo";

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
        body: JSON.stringify({ message: "Missing customerId or invoiceId in path." }),
      };
    }

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          CUSTOMER_ID: customerId,
          INVOICE_ID: invoiceId,
        },
      })
    );

    return {
      statusCode: 204,
      body: JSON.stringify({ message: "Invoice deleted" }), // No content
    };
  } catch (e: any) {
    console.error("Delete failed:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Delete failed: ${e.message}` }),
    };
  }
};
