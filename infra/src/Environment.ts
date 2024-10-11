import { Construct } from 'constructs';
import { Stage, StageProps } from 'aws-cdk-lib';
import FlightOrdersTable from './AirlineTable/FlightOrdersTableStack';
import ServiceStack from './ServiceStack';

export interface EnvironmentProps extends StageProps { }

export default class Environment extends Stage {
  constructor(scope: Construct, id: string, props: EnvironmentProps) {
    super(scope, id, props);

    if (props.env?.account && props.env?.region) {
      const stacks = [];
      const flightOrdersTableStack = new FlightOrdersTable(this, 'FlightOrdersTable', {});

      const serviceStack = new ServiceStack(this, 'ServiceStack', {
        flightOrderTableName: flightOrdersTableStack.flightEventsTable.tableName,
        tableStreamARN: flightOrdersTableStack.flightEventsTable.tableStreamArn
      });

      stacks.push(flightOrdersTableStack);
      stacks.push(serviceStack);
    } else {
      throw new Error('Expected account and region to be defined in props.env');
    }
  }
}
