import { SES } from 'aws-sdk';

const ses = new SES({ region: 'us-east-1' });

export const handler = async (event: any) => {
    const orderDetails = event;

    console.log('orderDetailss', orderDetails);

    const messageBody = `Dear ${event.passengerName},

Your flight ticket booking is confirmed.
Flight: ${event.flightDetails.Flight}
PNR: ${event.flightDetails.PNR}
From: ${event.flightDetails.FROM}
To: ${event.flightDetails.TO}
Departure Time: ${event.flightDetails.Departure_Time}

Add-ons included: ${event.addOns.join(', ')}
Total Amount Paid: ₹${event.totalAmount}

Thank you for choosing our airline!

Best regards,
Your Airline Team`;

    const params = {
        Source: 'nitinsaxena913@gmail.com', // Verified SES email address
        Destination: {
            ToAddresses: [orderDetails.email]
        },
        Message: {
            Subject: {
                Data: 'Ticket Booking Confirmation'
            },
            Body: {
                Text: {
                    Data: messageBody
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
