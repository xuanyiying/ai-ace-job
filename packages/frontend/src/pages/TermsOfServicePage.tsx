import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

const TermsOfServicePage: React.FC = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto' }}>
      <Card>
        <Title level={1}>Terms of Service</Title>
        <Text type="secondary">Last updated: November 28, 2024</Text>

        <Title level={2} style={{ marginTop: 32 }}>
          1. Acceptance of Terms
        </Title>
        <Paragraph>
          By accessing and using Interview AI ("Service"), you accept and
          agree to be bound by the terms and provision of this agreement.
        </Paragraph>

        <Title level={2}>2. Use License</Title>
        <Paragraph>
          Permission is granted to temporarily use the Service for personal,
          non-commercial purposes. This is the grant of a license, not a
          transfer of title.
        </Paragraph>

        <Title level={2}>3. User Accounts</Title>
        <Paragraph>
          You are responsible for safeguarding the password that you use to
          access the Service and for any activities or actions under your
          password. You agree not to disclose your password to any third party.
        </Paragraph>

        <Title level={2}>4. Prohibited Uses</Title>
        <Paragraph>
          You may not use the Service:
          <ul>
            <li>
              For any unlawful purpose or to solicit others to perform unlawful
              acts
            </li>
            <li>
              To violate any international, federal, provincial or state
              regulations, rules, laws, or local ordinances
            </li>
            <li>
              To infringe upon or violate our intellectual property rights or
              the intellectual property rights of others
            </li>
            <li>To submit false or misleading information</li>
          </ul>
        </Paragraph>

        <Title level={2}>5. Subscription and Billing</Title>
        <Paragraph>
          Some parts of the Service are billed on a subscription basis. You will
          be billed in advance on a recurring and periodic basis. Billing cycles
          are set on a monthly basis.
        </Paragraph>

        <Title level={2}>6. Refunds</Title>
        <Paragraph>
          Except when required by law, paid subscription fees are
          non-refundable.
        </Paragraph>

        <Title level={2}>7. Content Ownership</Title>
        <Paragraph>
          You retain all rights to the content you upload to the Service. By
          uploading content, you grant us a license to use, modify, and display
          your content solely for the purpose of providing the Service.
        </Paragraph>

        <Title level={2}>8. Termination</Title>
        <Paragraph>
          We may terminate or suspend your account immediately, without prior
          notice or liability, for any reason whatsoever, including without
          limitation if you breach the Terms.
        </Paragraph>

        <Title level={2}>9. Limitation of Liability</Title>
        <Paragraph>
          In no event shall Interview AI, nor its directors, employees,
          partners, agents, suppliers, or affiliates, be liable for any
          indirect, incidental, special, consequential or punitive damages.
        </Paragraph>

        <Title level={2}>10. Changes to Terms</Title>
        <Paragraph>
          We reserve the right to modify or replace these Terms at any time. We
          will provide notice of any changes by posting the new Terms on this
          page.
        </Paragraph>

        <Title level={2}>11. Contact Us</Title>
        <Paragraph>
          If you have any questions about these Terms, please contact us at
          support@airesume.example.com
        </Paragraph>
      </Card>
    </div>
  );
};

export default TermsOfServicePage;
