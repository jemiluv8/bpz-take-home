import { Construct } from "constructs";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";

interface ApiRouteProps {
  path: string;
  method: apigatewayv2.HttpMethod;
  lambda: lambda.IFunction;
}

export class ApiRoute extends Construct {
  public readonly api: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.api = new apigatewayv2.HttpApi(this, "HttpInvoiceApi", {
      apiName: "cdk-invoices-http-api",
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: Object.values(apigatewayv2.CorsHttpMethod),
        allowOrigins: ["http://localhost:5173"],
        exposeHeaders: ["content-type", "accept"],
      },
    });
  }

  registerRoutes(routes: ApiRouteProps[]) {
    routes.forEach((route) => {
      this.api.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: new integrations.HttpLambdaIntegration(
          `${route.lambda.node.id}Integration`,
          route.lambda
        ),
      });
    });
  }
}
