import { getParameter } from "./ssm";

const tableNameCache: Record<string, string> = {};

export async function getTableName(parameterName: string): Promise<string> {
  if (!tableNameCache[parameterName]) {
    const { value, error } = await getParameter(parameterName);
    if (error) throw new Error(error);
    tableNameCache[parameterName] = value!;
  }
  return tableNameCache[parameterName];
}
