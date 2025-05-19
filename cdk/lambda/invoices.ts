import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getParameter } from "./utils/ssm";

const TABLE_PARAM_NAME = process.env.TABLE_PARAM_NAME!;
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

let cachedTableName: string | null = null;

async function setTableName(): Promise<{ error?: string }> {
  if (!cachedTableName) {
    const { value, error } = await getParameter(TABLE_PARAM_NAME);
    if (error) return { error };
    cachedTableName = value!;
  }
  return {};
}

function getLastEvaluatedKey(event: any) {
  if (event.queryStringParameters?.lastEvaluatedKey) {
    try {
      const lastEvaluatedKey = JSON.parse(event.queryStringParameters.lastEvaluatedKey);
      return { lastEvaluatedKey, error: null };
    } catch (e: any) {
      return {
        error: {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Invalid lastEvaluatedKey format. Must be valid JSON string.' })
        },
        lastEvaluatedKey: null
      };
    }
  }
  return { lastEvaluatedKey: null, error: null };
}

function buildQueryParams({
  tableName,
  pageSize,
  status,
  startKey
}: {
  tableName: string;
  pageSize: string | undefined;
  status?: string;
  startKey: any;
}) {
  const limit = Number(pageSize || '10');

  console.log("PARAMS", {
      tableName,
      pageSize,
      status,
      startKey
  })

  if (status) {
    return {
      TableName: tableName,
      IndexName: "GSI_PK_STATUS__SK_DATE",
      KeyConditionExpression: "#pkStatus = :pkStatusVal",
      ExpressionAttributeNames: {
        "#pkStatus": "PK_STATUS",
      },
      ExpressionAttributeValues: {
        ":pkStatusVal": status,
      },
      Limit: limit,
      ScanIndexForward: false,
      ...(startKey && { ExclusiveStartKey: startKey }),
    };
  }

  return {
    TableName: tableName,
    IndexName: "INVOICE_DATE_INDEX",
    KeyConditionExpression: "#pk = :pkVal",
    ExpressionAttributeNames: {
      "#pk": "PK2_INVOICE",
    },
    ExpressionAttributeValues: {
      ":pkVal": "INVOICE",
    },
    Limit: limit,
    ScanIndexForward: false,
    ...(startKey && { ExclusiveStartKey: startKey }),
  };
}

export const handler = async (event: any) => {
  console.log("EVENT", JSON.stringify(event, null, 2));
  const setResult = await setTableName();
  if (setResult.error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: setResult.error }),
    };
  }

  const pageSize = event.queryStringParameters.pageSize || "10";
  const status = event.queryStringParameters.status || "";

  const { lastEvaluatedKey: startKey, error } = getLastEvaluatedKey(event);
  if (error) return error;

  try {
    const queryParams = buildQueryParams({
      tableName: cachedTableName!,
      pageSize,
      status,
      startKey,
    });

    const command = new QueryCommand(queryParams);
    const response = await ddbDocClient.send(command);

    const responseBody: any = {
      data: response.Items || [],
      count: response.Count || 0,
      pageSize: Number(pageSize),
    };

    if (response.LastEvaluatedKey) {
      responseBody.lastEvaluatedKey = JSON.stringify(response.LastEvaluatedKey);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseBody),
    };
  } catch (e: any) {
    console.error(`Query failed: ${e}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Error querying data: ${e.message}` }),
    };
  }
};
