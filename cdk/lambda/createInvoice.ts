import { getTableName } from "./utils/dynamo";
import { randomBytes, createHash } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_PARAM_NAME = process.env.TABLE_PARAM_NAME!;
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
  try {
    const tableName = await getTableName(TABLE_PARAM_NAME);

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

    const { email, name, amount, date } = body;
    let { status } = body;

    if (!email || !name || !amount || !date || !status) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Missing required fields: email, name, amount, date, status" }),
      };
    }

    const generateCustomerId = () => {
      const hash = createHash('sha256');
      hash.update(email);
      return hash.digest('hex').substring(0, 24);
    };

    status = status.toLowerCase();
    const invoiceId = randomBytes(12).toString("hex");
    const customerId = generateCustomerId();

    const item = {
      CUSTOMER_ID: `CUSTOMER-${customerId}`,
      INVOICE_ID: `INVOICE-${invoiceId}`,

      email,
      name,
      amount,
      date,
      status,
      invoiceId,

      // GSI 1
      CustomerID: `CUSTOMER-${customerId}`,
      StatusDate: `status#${status}#date#${date}`,

      // GSI 2
      PK_STATUS: status,
      SK_DATE: date,

      // GSI 3
      PK2_INVOICE: "INVOICE",
      SK2_Date: date,
    };

    await ddbDocClient.send(new PutCommand({ TableName: tableName, Item: item }));

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Location': `/invoices/${email}/${invoiceId}`,
      },
      body: JSON.stringify(item),
    };

  } catch (e: any) {
    console.error("Error inserting invoice:", e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Internal server error", error: e.message }),
    };
  }
};
