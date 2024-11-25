import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table, BillingMode, StreamViewType, CfnGlobalTable } from 'aws-cdk-lib/aws-dynamodb';

export interface FlightOrdersTableProps extends StackProps {
  readonly replicationRegions: string[];
}

export default class FlightOrdersTable extends Stack {
  readonly flightEventsTable: CfnGlobalTable;

  constructor(scope: Construct, id: string, props: FlightOrdersTableProps) {
    super(scope, id, props);

    const flighteventReplicas: Array<CfnGlobalTable.ReplicaSpecificationProperty> = props.replicationRegions.map((region) => {
      return {
        region,
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
      }
    });

    this.flightEventsTable = new CfnGlobalTable(this, 'FlightOrderEvents', {
      keySchema: [
        { attributeName: 'passengerId', keyType: 'HASH' }
      ],
      attributeDefinitions: [
        { attributeName: 'passengerId', attributeType: AttributeType.STRING }
      ],
      replicas: flighteventReplicas,
      streamSpecification: { streamViewType: StreamViewType.NEW_AND_OLD_IMAGES },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    this.flightEventsTable.applyRemovalPolicy(RemovalPolicy.DESTROY);


    // this.flightEventsTable = new Table(this, 'FlightOrderEvents', {
    //   partitionKey: { name: 'passengerId', type: AttributeType.STRING },
    //   stream: StreamViewType.NEW_IMAGE,
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   billingMode: BillingMode.PAY_PER_REQUEST,
    // });
  }
  
}
