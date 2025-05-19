import { SSM, DynamoDB } from 'aws-sdk';

const ssm = new SSM();
const dynamodb = new DynamoDB();

// Helper to fetch a parameter from SSM
async function getParameter(name: string): Promise<{ value: string; error?: string }> {
  try {
    const result = await ssm.getParameter({ Name: name }).promise();
    if (!result.Parameter || !result.Parameter.Value) {
      throw new Error("not found")
    }
    return { value: result.Parameter.Value || "" };
  } catch (err: any) {
    return { error: `Failed to fetch parameter "${name}": ${err.message}`, value: "" };
  }
}

// Helper to check if we can describe the table
async function canDescribeTable(tableName: string): Promise<{ accessible: boolean; error?: string }> {
  try {
    await dynamodb.describeTable({ TableName: tableName }).promise();
    return { accessible: true };
  } catch (err: any) {
    return { accessible: false, error: `DynamoDB error: ${err.message}` };
  }
}

export const handler = async () => {
  const helloParamName = process.env.PARAM_NAME!;
  const tableParamName = process.env.TABLE_PARAM_NAME!;

  const { value: helloMessage, error: helloError } = await getParameter(helloParamName);
  if (helloError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: helloError }),
    };
  }

  const { value: tableName, error: tableError } = await getParameter(tableParamName);
  if (tableError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: tableError }),
    };
  }

  const { accessible, error: dynamoError } = await canDescribeTable(tableName);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: helloMessage,
      tableName,
      connection: accessible,
      dynamoError: accessible ? undefined : dynamoError,
    }),
  };
};
