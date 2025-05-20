import { DynamoDB } from 'aws-sdk';
import { getParameter } from './utils/ssm';

const dynamodb = new DynamoDB();

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
  const tableParamName = process.env.TABLE_PARAM_NAME!;

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
      tableName,
      connection: accessible,
      dynamoError: accessible ? undefined : dynamoError,
    }),
  };
};
