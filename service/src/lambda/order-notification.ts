import { SES } from 'aws-sdk';

const ses = new SES({ region: 'us-east-1' });

export const handler = async (event: any) => {
    const orderDetails = event;

    // Email parameters
    const params = {
        Source: 'nitinsaxena913@gmail.com', // Verified SES email address
        Destination: {
            ToAddresses: [orderDetails.email]
        },
        Message: {
            Subject: {
                Data: 'Ticket Booked'
            },
            Body: {
                Text: {
                    Data: `Your ticket from ${orderDetails.flightDetails.FROM} to ${orderDetails.flightDetails.TO} has been booked.
                           Thank you for flying with our Airline.`
                }
            }
        }
    };

    try {
        const data = await ses.sendEmail(params).promise();
        console.log("Email sent:", data);
        return data;
    } catch (error) {
        console.error("Failed to send email:", error);
        throw error;
    }
};
