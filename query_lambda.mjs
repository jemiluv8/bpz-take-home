// lambda_function.mjs

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm"; // Import SSM client

// Define the AWS region where your SSM parameter is located.
// ** IMPORTANT: Replace 'your-ssm-parameter-region' with the actual region! **
const SSM_PARAMETER_REGION = 'your-ssm-parameter-region'; // <-- UPDATE THIS

// Define the name of the SSM parameter where the table name is stored
// It's best practice to use environment variables for configuration,
// but for the SSM parameter name itself, you can define it here
// or also use an environment variable for this parameter name.
const TABLE_NAME_SSM_PARAMETER_NAME = process.env.TABLE_NAME_SSM_PARAMETER_NAME || '/bpz/api/config/dynamodb/InvoicesTable'; // <-- **UPDATE THIS WITH YOUR SSM PARAMETER NAME**

// Initialize the AWS clients outside the handler for potential reuse across warm invocations.
// Note: The SSM client is initialized here with the specific region.
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const ssmClient = new SSMClient({ region: SSM_PARAMETER_REGION }); // <-- Region specified here

// Cache the table name after the first fetch to avoid repeated SSM calls
let cachedTableName = null;

export const handler = async (event) => {
    /**
     * Lambda function to fetch paginated data from DynamoDB using Node.js.
     * Fetches the DynamoDB table name from AWS Systems Manager Parameter Store
     * and caches it for subsequent warm invocations.
     *
     * Expects an optional 'startKey' in the event's queryStringParameters
     * for pagination.
     */

    // Fetch the table name from SSM if not cached
    if (!cachedTableName) {
        try {
            const getParameterCommand = new GetParameterCommand({
                Name: TABLE_NAME_SSM_PARAMETER_NAME,
                WithDecryption: true // Set to true if your parameter is SecureString
            });
            const parameterResponse = await ssmClient.send(getParameterCommand);
            cachedTableName = parameterResponse.Parameter.Value;
            console.log(`Successfully fetched and cached table name from SSM: ${cachedTableName} from region ${SSM_PARAMETER_REGION}`);
        } catch (e) {
            console.error(`Error fetching table name from SSM parameter "${TABLE_NAME_SSM_PARAMETER_NAME}" in region ${SSM_PARAMETER_REGION}: ${e}`);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: `Internal server error: Could not retrieve table name from SSM. ${e.message}` })
            };
        }
    }

    // Default page size
    const pageSize = 10;

    // Get the start key from the event if provided
    // API Gateway passes query string parameters in event['queryStringParameters']
    let startKey = null;
    if (event.queryStringParameters && event.queryStringParameters.startKey) {
        try {
            // The startKey needs to be deserialized from the JSON string received from API Gateway
            startKey = JSON.parse(event.queryStringParameters.startKey);
            console.log(`Received startKey: ${JSON.stringify(startKey)}`); // Log the start key for debugging
        } catch (e) {
            console.error(`Error parsing startKey: ${e}`);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: 'Invalid startKey format. Must be valid JSON string.' })
            };
        }
    }

    const scanParams = {
        TableName: cachedTableName, // Use the cached table name
        Limit: pageSize,
        // ProjectionExpression: '#id, YourOtherAttribute', // Optional: Specify attributes to retrieve
        // ExpressionAttributeNames: { '#id': 'id' }, // Optional: Define attribute names if using ProjectionExpression
    };

    if (startKey) {
        scanParams.ExclusiveStartKey = startKey;
    }

    try {
        // Perform the scan operation using the Document Client for easier data handling
        const command = new ScanCommand(scanParams);
        const response = await ddbDocClient.send(command);

        // Extract items and the last evaluated key
        const items = response.Items || [];
        const lastEvaluatedKey = response.LastEvaluatedKey;

        // Prepare the response body
        const responseBody = {
            items: items,
            pageSize: pageSize,
            count: response.Count || 0, // Count of items in this scan
        };

        // Include the last evaluated key if present (means there are more results)
        if (lastEvaluatedKey) {
            // The last evaluated key needs to be serialized back to a JSON string for the client
            responseBody.lastEvaluatedKey = JSON.stringify(lastEvaluatedKey);
            responseBody.hasMoreData = true;
        } else {
            responseBody.hasMoreData = false;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseBody)
        };

    } catch (e) {
        console.error(`Error scanning DynamoDB table: ${e}`);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: `Error fetching data: ${e.message}` })
        };
    }
};
