import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface ForgotPasswordEmailProps {
  username: string;
  resetUrl: string;
  userEmail: string;
}

const ForgotPasswordEmail = (props: ForgotPasswordEmailProps) => {
  const { username, resetUrl, userEmail } = props;

  return (
    <Html lang="fa" dir="rtl">
      <Tailwind>
        <Head />
        <Preview>بازنشانی رمز عبور - اقدام لازم</Preview>
        <Body className="bg-gray-100 font-sans py-10">
          <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto p-10">
            {/* Header */}
            <Section className="text-center mb-8">
              <Heading className="text-[28px] font-bold text-gray-900 m-0 mb-2">
                رمز عبور خود را بازنشانی کنید
              </Heading>
              <Text className="text-[16px] text-gray-600 m-0">
                ما یک درخواست برای بازنشانی رمز عبور شما دریافت کردیم
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-8">
              <Text className="text-[16px] text-gray-700 leading-6 m-0 mb-4">
                سلام، {username}
              </Text>
              <Text className="text-[16px] text-gray-700 leading-6 m-0 mb-4">
                ما یک درخواست بازنشانی رمز عبور برای حساب شما مرتبط با{" "}
                <strong>{userEmail}</strong> دریافت کردیم.
              </Text>
              <Text className="text-[16px] text-gray-700 leading-6 m-0 mb-6">
                برای ایجاد یک رمز عبور جدید، روی دکمه زیر کلیک کنید. این لینک به
                دلایل امنیتی پس از ۲۴ ساعت منقضی می‌شود.
              </Text>
            </Section>

            {/* Reset Button */}
            <Section className="text-center mb-8">
              <Button
                href={resetUrl}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl text-[16px] font-semibold no-underline box-border inline-block"
              >
                بازنشانی رمز عبور
              </Button>
            </Section>

            {/* Alternative Link */}
            <Section className="mb-8">
              <Text className="text-[14px] text-gray-600 leading-5 m-0 mb-2">
                اگر دکمه کار نکرد، این لینک را در مرورگر خود کپی و جایگذاری
                کنید:
              </Text>
              <Link
                href={resetUrl}
                className="text-blue-600 text-[14px] break-all"
              >
                {resetUrl}
              </Link>
            </Section>

            {/* Security Notice */}
            <Section className="bg-gray-50 p-5 rounded-xl mb-8">
              <Text className="text-[14px] text-gray-700 leading-5 m-0 mb-2 font-semibold">
                توجه امنیتی:
              </Text>
              <Text className="text-[14px] text-gray-600 leading-5 m-0 mb-2">
                • اگر شما این درخواست بازنشانی رمز عبور را نداده‌اید، لطفاً این
                ایمیل را نادیده بگیرید
              </Text>
              <Text className="text-[14px] text-gray-600 leading-5 m-0 mb-2">
                • این لینک پس از ۲۴ ساعت منقضی می‌شود
              </Text>
              <Text className="text-[14px] text-gray-600 leading-5 m-0">
                • به دلایل امنیتی، این لینک را با هیچکس شریک نشوید
              </Text>
            </Section>

            {/* Help Section */}
            <Section className="mb-8">
              <Text className="text-[14px] text-gray-600 leading-5 m-0">
                نیاز به کمک دارید؟ با تیم پشتیبانی ما در{" "}
                <Link
                  href="mailto:support@company.com"
                  className="text-blue-600"
                >
                  support@company.com
                </Link>{" "}
                تماس بگیرید
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-gray-200 pt-6">
              <Text className="text-[12px] text-gray-500 leading-4 m-0 mb-2">
                این ایمیل به {userEmail} ارسال شد
              </Text>
              <Text className="text-[12px] text-gray-500 leading-4 m-0 mb-2">
                Diplomasi ltd ، بین پروان ۳ و پروان ۲ ، کابل ، افغانستان
              </Text>
              <Text className="text-[12px] text-gray-500 leading-4 m-0">
                © ۲۰۲۵ Diplomasi ltd . تمام حقوق محفوظ است.{" "}
                <Link href="#" className="text-gray-500">
                  لغو اشتراک
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ForgotPasswordEmail;
