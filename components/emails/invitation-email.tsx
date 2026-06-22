import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  inviteUrl: string;
}

export function InvitationEmail({ inviteUrl }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join the blog studio team!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You have been invited!</Heading>
          <Text style={text}>
            You have been invited to join the blog studio team. Click the button below to accept or reject the invitation.
          </Text>
          <Button href={inviteUrl} style={button}>
            View Invitation
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#F9F6F3',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 0',
};

const container = {
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: '8px',
  padding: '40px',
  textAlign: 'center' as const,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
  color: '#09090b',
};

const text = {
  fontSize: '16px',
  color: '#52525b',
  margin: '0 0 32px',
  lineHeight: '1.5',
};

const button = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: '#09090b',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: '500',
  fontSize: '16px',
};
