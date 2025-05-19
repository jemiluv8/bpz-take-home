import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getTableName } from "./utils/dynamo";

const TABLE_PARAM_NAME = process.env.TABLE_PARAM_NAME!;
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
  const tableName = await getTableName(TABLE_PARAM_NAME);

  const { customerId, invoiceId } = event.pathParameters || {};

  if (!customerId || !invoiceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing customerId or invoiceId in path." }),
    };
  }

  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        CUSTOMER_ID: customerId,
        INVOICE_ID: invoiceId,
      },
    });

    const response = await ddbDocClient.send(command);

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Invoice not found." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response.Item),
    };
  } catch (error: any) {
    console.error("Error fetching item:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message }),
    };
  }
};
