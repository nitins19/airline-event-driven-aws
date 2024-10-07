import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface ServiceStackProps extends StackProps { }

export default class ServiceStack extends Stack {

    readonly apiGateway: RestApi;

    constructor(scope: Construct, id: string, props: ServiceStackProps) {
        super(scope, id, props);

        const serviceLambda = new NodejsFunction(this, 'ServiceLambda', {
            runtime: Runtime.NODEJS_18_X,
            entry: '../../service/src/lambda.ts',
            handler: 'handler',
            timeout: Duration.seconds(10),
            memorySize: 250,
            bundling: {
                sourceMap: true,
                minify: true
            },
            logRetention: RetentionDays.FIVE_DAYS
        })

        this.apiGateway = new RestApi(this, 'MyApi', {
            restApiName: 'ServiceApi',
            deployOptions: {
                stageName: 'dev'
            }
        });

        const proxy = this.apiGateway.root.addProxy({ anyMethod: false });
        proxy.addMethod('ANY', new LambdaIntegration(serviceLambda, { proxy: true }));
    }
}