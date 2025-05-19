import { SSM } from 'aws-sdk';

const ssm = new SSM();

export async function getParameter(name: string): Promise<{ value: string; error?: string }> {
  try {
    const result = await ssm.getParameter({ Name: name }).promise();
    return { value: result.Parameter?.Value || ""  };
  } catch (err: any) {
    return { error: `Failed to fetch parameter "${name}": ${err.message}`, value: "" };
  }
}
