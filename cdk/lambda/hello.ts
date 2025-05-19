import { SSM } from 'aws-sdk';

const ssm = new SSM();

export const handler = async () => {
  try {
    const param = await ssm.getParameter({
      Name: process.env.PARAM_NAME!,
      WithDecryption: true,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Hello!', paramValue: param.Parameter?.Value }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not retrieve SSM parameter', detail: err }),
    };
  }
};
