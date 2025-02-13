import {
  Html,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Section,
  Head,
} from '@react-email/components';

interface OrderConfirmationEmailProps {
  orderId: string;
  customerName?: string;
  shippingAddress?: any;
  shippingMethod?: string;
  orderDetails: any[];
  totalAmount: number;
}

export const OrderConfirmationEmail = ({
  orderId,
  customerName,
  shippingAddress,
  shippingMethod,
  orderDetails,
  totalAmount,
}: OrderConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Printspo order confirmation {orderId}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Order Confirmation</Text>
          <Text style={paragraph}>
            Hi {customerName},
          </Text>
          <Text style={paragraph}>
            Thank you for your order! We'll start processing it right away.
          </Text>
          
          <Section style={section}>
            <Text style={subheading}>Order Details</Text>
            <Text style={orderText}>Order ID: {orderId}</Text>
            {orderDetails.map((board, index) => (
              <Text key={index} style={orderText}>
                Print {index + 1}: {board.printSize.width}" × {board.printSize.height}"
              </Text>
            ))}
            <Text style={totalText}>Total: ${totalAmount.toFixed(2)}</Text>
          </Section>

          <Section style={section}>
            <Text style={subheading}>Shipping Information</Text>
            <Text style={shippingText}>{shippingMethod}</Text>
            <Text style={addressText}>{shippingAddress?.name}</Text>
            <Text style={addressText}>{shippingAddress?.address?.line1}</Text>
            {shippingAddress?.address?.line2 && (
              <Text style={addressText}>{shippingAddress?.address?.line2}</Text>
            )}
            <Text style={addressText}>
              {shippingAddress?.address?.city}, {shippingAddress?.address?.state} {shippingAddress?.address?.postal_code}
            </Text>
            <Text style={addressText}>{shippingAddress?.address?.country}</Text>
          </Section>

          <Text style={paragraph}>
            We'll send you another email when your order ships.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  color: '#1a1a1a',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a4a4a',
  margin: '0 0 16px',
};

const section = {
  padding: '24px',
  border: 'solid 1px #e6e6e6',
  borderRadius: '12px',
  marginTop: '24px',
  backgroundColor: '#fafafa',
};

const subheading = {
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '1.4',
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const orderText = {
  fontSize: '15px',
  color: '#4a4a4a',
  margin: '0 0 8px',
};

const totalText = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginTop: '16px',
  borderTop: '1px solid #e6e6e6',
  paddingTop: '16px',
};

const shippingText = {
  fontSize: '15px',
  color: '#1a1a1a',
  fontWeight: '500',
  margin: '0 0 16px',
};

const addressText = {
  fontSize: '15px',
  color: '#4a4a4a',
  margin: '0 0 4px',
};

const footer = {
  fontSize: '14px',
  color: '#6b7280',
  textAlign: 'center' as const,
  marginTop: '32px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'none',
}; 