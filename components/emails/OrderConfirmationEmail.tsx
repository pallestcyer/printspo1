import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components';
import { type OrderConfirmationEmailProps, type PrintBoard } from '@/app/types/order';

const OrderConfirmationEmail: React.FC<OrderConfirmationEmailProps> = ({
  orderId,
  customerName,
  shippingAddress,
  shippingMethod,
  orderDetails,
  totalAmount
}) => {
  return (
    <Html>
      <Head />
      <Preview>Your order confirmation from PrintSpo</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Confirmation</Heading>
          <Text style={text}>Dear {customerName},</Text>
          <Text style={text}>
            Thank you for your order! We&apos;re excited to fulfill your print request.
          </Text>

          <Section style={section}>
            <Heading style={h2}>Order Details</Heading>
            <Text style={text}>Order ID: {orderId}</Text>
            <Text style={text}>Shipping Method: {shippingMethod}</Text>
            
            <Heading style={h3}>Shipping Address:</Heading>
            <Text style={text}>
              {shippingAddress.street}<br />
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}<br />
              {shippingAddress.country}
            </Text>

            <Heading style={h3}>Print Boards:</Heading>
            {orderDetails.boards?.map((board: PrintBoard, index: number) => (
              <div key={board.id || index}>
                <Text style={text}>
                  Board {index + 1} - Size: {board.size}
                </Text>
              </div>
            ))}

            <Hr style={hr} />
            
            <Text style={total}>Total Amount: ${totalAmount.toFixed(2)}</Text>
          </Section>

          <Text style={footer}>
            If you have any questions about your order, please don&apos;t hesitate to contact us.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0',
};

const h3 = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '24px 0 12px',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
};

const section = {
  padding: '24px',
  border: '1px solid #dedede',
  borderRadius: '5px',
  margin: '24px 0',
};

const hr = {
  borderColor: '#dedede',
  margin: '20px 0',
};

const total = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '12px 0 0 0',
};

const footer = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '20px',
};

export default OrderConfirmationEmail; 