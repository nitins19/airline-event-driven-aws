import { EventBridgeClient,PutEventsCommand} from "@aws-sdk/client-eventbridge";

const client = new EventBridgeClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
    console.log("Order processed successfully", event);

    const params = {
        Entries: [
            {
                EventBusName: process.env.EVENT_BUS_NAME,
                Source: "flight/orders",
                DetailType: "flight-order-complete",
                Detail: JSON.stringify(event),
            },
        ],
    };

    try {
        const result = await client.send(new PutEventsCommand(params));
        console.log("Event published successfully", result);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Order processed and event published successfully",
            }),
        };
    } catch (error) {
        console.error("Failed to publish event", error);
    }
};